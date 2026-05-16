import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

/**
 * Heading detection thresholds ported from Tampermonkey scripts.
 * Font sizes are extracted from the PDF transform matrix (index 0).
 *   >= 22px  → H1
 *   >= 18px  → H2
 *   >= 15px  → H3
 *   anything else with distinct size → H4
 */
const HEADING_THRESHOLDS = [
  { min: 22, level: 1 },
  { min: 18, level: 2 },
  { min: 15, level: 3 },
  { min: 0,  level: 4 },
];

function detectHeadingLevel(fontSize) {
  for (const { min, level } of HEADING_THRESHOLDS) {
    if (fontSize >= min) return level;
  }
  return null;
}

/**
 * Render a single PDF page's text items into raw Markdown lines.
 * Logic mirrors the Tampermonkey Y-sort + gap + heading detection.
 */
function renderPage(textItems, pageNum) {
  // Sort: top-to-bottom (descending Y), then left-to-right (ascending X)
  const sorted = [...textItems].sort((a, b) => {
    const yA = a.transform?.[5] ?? 0;
    const yB = b.transform?.[5] ?? 0;
    const yDiff = yB - yA;
    if (Math.abs(yDiff) > 5) return yDiff;
    return (a.transform?.[4] ?? 0) - (b.transform?.[4] ?? 0);
  });

  let pageText = '';
  let lastY = -1;
  let lastFontSize = -1;

  for (const item of sorted) {
    const text = item.str;
    if (!text?.trim()) continue;

    const fontSize = item.transform
      ? Math.round(Math.abs(item.transform[0]))
      : 12;
    const y = item.transform ? Math.round(item.transform[5]) : 0;

    // Line / paragraph breaks based on Y-position delta
    if (lastY !== -1) {
      const yDiff = Math.abs(lastY - y);
      if (yDiff > 8)  pageText += '\n';
      if (yDiff > 20) pageText += '\n'; // paragraph gap
    }

    // Heading detection: new font size that is "large" triggers a heading prefix
    if (fontSize > 14 && lastFontSize !== fontSize && text.trim()) {
      const level = detectHeadingLevel(fontSize);
      if (level) {
        if (!pageText.endsWith('\n')) pageText += '\n';
        pageText += '#'.repeat(level) + ' ';
      }
    } else if (lastY === y && pageText.length > 0 && !pageText.endsWith(' ')) {
      // Same line: join with space
      pageText += ' ';
    }

    pageText += text;
    lastY = y;
    lastFontSize = fontSize;
  }

  return pageText.trim();
}

/**
 * Attempt to repair a corrupted PDF using Ghostscript.
 * Returns the path to the repaired file.
 * Throws if Ghostscript is not installed or repair fails.
 */
function repairPDFWithGhostscript(inputPath) {
  const dir = path.dirname(inputPath);
  const ext = path.extname(inputPath);
  const base = path.basename(inputPath, ext);
  const fixedPath = path.join(dir, `${base}-fixed${ext}`);

  // Detect OS and choose Ghostscript command
  const gsCmd = process.platform === 'win32' ? 'gswin64c' : 'gs';

  try {
    execSync(`${gsCmd} -o "${fixedPath}" -sDEVICE=pdfwrite "${inputPath}"`, { stdio: 'pipe' });
    return fixedPath;
  } catch (err) {
    if (err.code === 'ENOENT' || err.message.includes('not found')) {
      throw new Error('bad XRef entry — install Ghostscript for auto-repair: https://www.ghostscript.com');
    }
    throw new Error('bad XRef entry (Ghostscript repair failed)');
  }
}

/**
 * Main extraction function.
 * Accepts a Buffer (from fs.readFileSync or axios response).
 * Returns { pages: string[], wasRepaired: boolean }.
 */
export async function extractPDF(buffer, source = '', filePath = null) {
  let pages = [];
  let wasRepaired = false;

  // pdf-parse's `pagerender` option fires per page, giving us raw text items.
  // We collect per-page results in the array via closure.
  const pageTexts = [];

  function pageRender(pageData) {
    return pageData.getTextContent().then((textContent) => {
      const rendered = renderPage(textContent.items, pageData.pageNumber);
      pageTexts[pageData.pageNumber - 1] = rendered;
      // Return plain string so pdf-parse doesn't choke
      return textContent.items.map((i) => i.str).join(' ');
    });
  }

  try {
    await pdfParse(buffer, { pagerender: pageRender });
  } catch (err) {
    // Check if this is an XRef error
    const isXRefError = err.message && (
      err.message.toLowerCase().includes('xref') ||
      err.message.toLowerCase().includes('cross-reference')
    );

    if (isXRefError && filePath) {
      // Attempt Ghostscript repair
      let fixedPath;
      try {
        fixedPath = repairPDFWithGhostscript(filePath);
        const repairedBuffer = fs.readFileSync(fixedPath);
        
        // Retry with repaired PDF
        const repairedPageTexts = [];
        function repairedPageRender(pageData) {
          return pageData.getTextContent().then((textContent) => {
            const rendered = renderPage(textContent.items, pageData.pageNumber);
            repairedPageTexts[pageData.pageNumber - 1] = rendered;
            return textContent.items.map((i) => i.str).join(' ');
          });
        }
        
        await pdfParse(repairedBuffer, { pagerender: repairedPageRender });
        pageTexts.push(...repairedPageTexts);
        wasRepaired = true;
      } finally {
        // Clean up temp file
        if (fixedPath && fs.existsSync(fixedPath)) {
          fs.unlinkSync(fixedPath);
        }
      }
    } else {
      // Not an XRef error or no file path available - rethrow
      throw err;
    }
  }

  pages = pageTexts;

  if (pages.length === 0) {
    throw new Error('No text content found in PDF. The file may be scanned/image-only.');
  }

  return { pages, wasRepaired };
}
