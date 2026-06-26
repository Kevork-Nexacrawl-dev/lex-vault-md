import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import { detectColumnGutters } from '../layout/mer.js';
import { novaLADSort } from '../layout/novlad.js';
import { extractTables } from '../tables/orchestrator.js';

// BLUEPRINT: Statistical Mode Font-Size Profiler (Block 4b)
// Builds a frequency histogram of all font sizes for a page's text items.
// Returns S_body = the most frequent font size (the baseline body text size).
// O-cost: O(N) where N = number of text items on page.
function computeSBody(items) {
  const freq = new Map();
  for (const item of items) {
    if (!item.str?.trim()) continue;
    const size = Math.round(Math.abs(item.transform?.[0] ?? 12));
    freq.set(size, (freq.get(size) ?? 0) + 1);
  }
  let modeSize = 12, modeCount = 0;
  for (const [size, count] of freq) {
    if (count > modeCount) { modeCount = count; modeSize = size; }
  }
  return modeSize || 12;
}

// Returns the heading level (1-3) for a font size given S_body, or null if not a heading.
// Ratios: >=1.5x H1; >=1.2x H2; >=1.05x H3; <0.8x caption (return -1)
function detectHeadingLevel(size, S_body) {
  const r = size / S_body;
  if (r >= 1.5)  return 1;
  if (r >= 1.2)  return 2;
  if (r >= 1.05) return 3;
  if (r < 0.8)   return -1; // caption/footnote: suppress heading prefix
  return null;
}

// BLUEPRINT: Dynamic Line Height Thresholding (Block 4a)
// Computes the median Y-gap between consecutive text lines on this page.
// Used as avgLineHeight so paragraph breaks scale to the document, not a hardcoded px.
// O-cost: O(N log N) for sort, O(1) median lookup.
function computeAvgLineHeight(items) {
  const ys = [...new Set(items.map(i => i.transform?.[5] ?? 0))].sort((a, b) => b - a);
  if (ys.length < 2) return 12;
  const gaps = [];
  for (let i = 1; i < ys.length; i++) gaps.push(ys[i - 1] - ys[i]);
  gaps.sort((a, b) => a - b);
  return gaps[Math.floor(gaps.length / 2)] || 12;
}

// BLUEPRINT: Snap-to-Grid (pre-pass)
// Rounds all transform X/Y coordinates to nearest integer immediately after extraction.
// Eliminates float-drift bugs (X=10.001 vs X=10.004) for all downstream spatial algorithms.
// O-cost: O(N) - no-cost pass.
function snapToGrid(items) {
  for (const item of items) {
    if (item.transform) {
      item.transform[4] = Math.round(item.transform[4]); // X
      item.transform[5] = Math.round(item.transform[5]); // Y
    }
  }
  return items;
}

/**
 * Render a single PDF page's text items into raw Markdown lines.
 *
 * Full pipeline per page (in order):
 *   Pass 1) Snap-to-Grid                  -- eliminate float drift
 *   Pass 2) Statistical Mode Font Profiler -- compute S_body
 *   Pass 3) Dynamic Line Height            -- compute avgLineHeight
 *   Pass 4) MER Column Detection           -- detect column gutters
 *   Pass 5) NovaLAD Reading Order          -- sort in correct reading order
 *   Pass 6) Hybrid Table Extraction        -- extract tables, remove consumed items
 *   Pass 7) Render loop                    -- emit Markdown for remaining text
 *
 * @param {object[]} textItems   - raw items from pdf-parse getTextContent()
 * @param {number}   pageWidth   - from pageData.view[2]
 * @param {number}   pageHeight  - from pageData.view[3]
 * @param {object}   operatorList- from pageData.getOperatorList()
 */
function renderPage(textItems, pageWidth, pageHeight, operatorList) {
  // -- Pass 1: Snap-to-Grid
  const items = snapToGrid(textItems);

  // -- Pass 2: Statistical Mode Font Profiler -- derive S_body
  const S_body = computeSBody(items);

  // -- Pass 3: Dynamic Line Height -- derive avgLineHeight
  const avgLineHeight = computeAvgLineHeight(items);

  // -- Pass 4: MER Column Detection -- find column gutters
  const gutters = detectColumnGutters(items, pageWidth, pageHeight);

  // -- Pass 5: NovaLAD Reading Order -- sort by column then top-to-bottom
  const ordered = novaLADSort(items, gutters);

  // -- Pass 6: Hybrid Table Extraction
  const { tableBlocks, remainingItems } = extractTables(ordered, avgLineHeight, operatorList);

  // -- Pass 7: Render loop (non-table items only)
  let pageText = '';
  let lastY = null;
  let lastFontSize = null;

  // Interleave table blocks at their Y-position within the text stream.
  // We track which tables have been injected by their maxY threshold.
  const pendingTables = [...tableBlocks].sort((a, b) => b.maxY - a.maxY); // highest Y first
  let tableIdx = 0;

  for (const item of remainingItems) {
    const text = item.str;
    if (!text?.trim()) continue;

    const fontSize = Math.round(Math.abs(item.transform?.[0] ?? 12));
    const y = item.transform?.[5] ?? 0;

    // Inject any pending table blocks whose maxY is above this item's Y
    while (tableIdx < pendingTables.length && pendingTables[tableIdx].maxY >= y) {
      if (pageText.length > 0 && !pageText.endsWith('\n')) pageText += '\n\n';
      pageText += pendingTables[tableIdx].markdown + '\n\n';
      tableIdx++;
    }

    if (lastY !== null) {
      const yDiff = Math.abs(lastY - y);
      if (yDiff > avgLineHeight * 1.8) {
        pageText += '\n\n';
      } else if (yDiff > avgLineHeight * 1.2) {
        pageText += '\n';
      } else if (y === lastY && pageText.length > 0 && !pageText.endsWith(' ')) {
        pageText += ' ';
      }
    }

    if (fontSize !== lastFontSize) {
      const level = detectHeadingLevel(fontSize, S_body);
      if (level !== null && level > 0) {
        if (!pageText.endsWith('\n')) pageText += '\n';
        pageText += '#'.repeat(level) + ' ';
      }
    }

    pageText += text;
    lastY = y;
    lastFontSize = fontSize;
  }

  // Flush any remaining table blocks (e.g. table at bottom of page)
  while (tableIdx < pendingTables.length) {
    if (pageText.length > 0 && !pageText.endsWith('\n')) pageText += '\n\n';
    pageText += pendingTables[tableIdx].markdown + '\n\n';
    tableIdx++;
  }

  return pageText.trim();
}

/**
 * Main extraction function.
 * Accepts a Buffer (from fs.readFileSync or axios response).
 * Returns an array of per-page Markdown strings.
 */
export async function extractPDF(buffer, source = '') {
  const pageTexts = [];

  function pageRender(pageData) {
    // Fetch text content and operator list in parallel
    return Promise.all([
      pageData.getTextContent(),
      pageData.getOperatorList().catch(() => null), // graceful: some PDFs block operator access
    ]).then(([textContent, operatorList]) => {
      const [, , pageWidth, pageHeight] = pageData.view ?? [0, 0, 612, 792];
      const rendered = renderPage(textContent.items, pageWidth, pageHeight, operatorList);
      pageTexts[pageData.pageNumber - 1] = rendered;
      return textContent.items.map((i) => i.str).join(' ');
    });
  }

  await pdfParse(buffer, { pagerender: pageRender });

  if (pageTexts.length === 0) {
    throw new Error('No text content found in PDF. The file may be scanned/image-only.');
  }

  return pageTexts;
}
