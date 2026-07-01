import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import ora from 'ora';
import { extractPDF } from '../services/extractor.js';
import { formatMarkdown, deriveOutputFilename } from '../utils/formatter.js';
// [CORE-BSL] JSON output support
import { formatJSON, deriveJsonFilename } from '../utils/json-formatter.js';
// [PRO-CANDIDATE] OCR fallback
import { applyOCRFallback, initOCRPool, terminateOCRPool } from '../services/ocr-router.js';
import { log } from '../utils/logger.js';

// clipboard support (optional — graceful fallback if not installed)
let clipboardy;
try {
  const require = createRequire(import.meta.url);
  clipboardy = require('clipboardy');
} catch {
  clipboardy = null;
}

/**
 * lex-vault-md local <filepath> [--output <file>] [--clipboard] [--json] [--ocr]
 */
export async function localCommand(filepath, options) {
  const resolved = path.resolve(filepath);

  // Validate file exists
  if (!fs.existsSync(resolved)) {
    log.error(`File not found: ${resolved}`);
    process.exit(1);
  }

  // Validate .pdf extension
  if (path.extname(resolved).toLowerCase() !== '.pdf') {
    log.error(`Not a PDF file: ${resolved}`);
    process.exit(1);
  }

  const spinner = ora(`Reading ${path.basename(resolved)}...`).start();

  // [PRO-CANDIDATE] Initialise OCR worker pool once before extraction
  if (options.ocr) {
    try {
      await initOCRPool();
    } catch (err) {
      spinner.fail('OCR initialisation failed');
      log.error(`Could not start Tesseract.js worker pool: ${err.message}`);
      log.error('Run: npm install tesseract.js');
      process.exit(1);
    }
  }

  try {
    const buffer = fs.readFileSync(resolved);
    spinner.text = 'Extracting text and detecting headings...';

    let pages = await extractPDF(buffer, path.basename(resolved));

    // [PRO-CANDIDATE] --ocr branch: apply per-page OCR routing after extraction
    if (options.ocr) {
      spinner.text = 'Applying OCR fallback where needed...';
      // rawPageMeta is empty here — no page images available in CLI local mode.
      // applyOCRFallback gracefully handles missing imageBuffer per page.
      pages = await applyOCRFallback(pages, [], options);
    }

    // [CORE-BSL] --json branch: write structured JSON, skip Markdown path entirely
    if (options.json) {
      const jsonObj  = formatJSON(pages, path.basename(resolved));
      const outFile  = options.output || deriveJsonFilename(resolved);
      const outPath  = path.resolve(outFile);
      const jsonStr  = JSON.stringify(jsonObj, null, 2);

      spinner.succeed(`Extracted ${pages.length} page(s)`);
      fs.writeFileSync(outPath, jsonStr, 'utf8');
      log.success(`Saved JSON → ${outPath}`);
      log.dim(`${pages.length} pages | ${jsonObj.metadata.charCount} chars | ${path.basename(outPath)}`);
      return;
    }

    // Default Markdown path — byte-for-byte identical to pre-flag behaviour
    const markdown = formatMarkdown(pages, path.basename(resolved));
    spinner.succeed(`Extracted ${pages.length} page(s)`);

    // Write output file
    const outFile = options.output || deriveOutputFilename(resolved);
    const outPath = path.resolve(outFile);
    fs.writeFileSync(outPath, markdown, 'utf8');
    log.success(`Saved → ${outPath}`);

    // Clipboard
    if (options.clipboard) {
      if (clipboardy) {
        await clipboardy.write(markdown);
        log.success('Copied to clipboard!');
      } else {
        log.warn('--clipboard flag used but clipboardy is not installed. Run: npm install clipboardy');
      }
    }

    log.dim(`${pages.length} pages | ${markdown.length} chars | ${path.basename(outPath)}`);
  } catch (err) {
    spinner.fail('Extraction failed');
    if (err.message.includes('password')) {
      log.error('This PDF is encrypted. Please remove the password and try again.');
    } else if (err.message.includes('No text content')) {
      log.error('No extractable text found. This may be a scanned/image-only PDF.');
    } else {
      log.error(err.message);
    }
    process.exit(1);
  } finally {
    // [PRO-CANDIDATE] Always terminate OCR workers on exit
    if (options.ocr) await terminateOCRPool();
  }
}
