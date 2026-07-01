// [PRO-CANDIDATE]
// OCR Router — Tesseract.js Worker Pool + Per-Page Routing
//
// Sits entirely OUTSIDE extractor.js. Called after extractPDF() returns pageTexts[].
// Never modifies extractor.js core pipeline.
//
// Routing decision key (printable_native_ratio = printable Unicode chars / total chars):
//   >= 0.97                          → NATIVE PATH ONLY  (skip OCR even with --ocr)
//   0.85–0.97, image_coverage < 0.60 → NATIVE + REPAIR   (return native text as-is)
//   < 0.85, image_coverage >= 0.60   → WHOLE-PAGE OCR    (replace with Tesseract result)
//   native text exists but < 0.97,
//     image_coverage >= 0.60         → REGION-LEVEL OCR  (append OCR block to native)
//
// Worker pool:
//   - Workers are created ONCE per CLI invocation via initOCRPool().
//   - applyOCRFallback() is safe to call with options.ocr === false: returns pages unchanged.
//   - terminateOCRPool() must be called after the last document to release memory.

import { log } from '../utils/logger.js';
import { preprocessPageImage } from './ocr-preprocess.js';

// Routing thresholds
const RATIO_NATIVE_ONLY   = 0.97;   // >= this → skip OCR entirely
const RATIO_REPAIR_FLOOR  = 0.85;   // 0.85–0.97 → native + repair (text returned as-is)
const IMAGE_COVERAGE_HIGH = 0.60;   // image_coverage >= this triggers OCR paths

// Singleton worker pool — null until initOCRPool() is called
let _pool = null;
let _poolSize = 0;

/**
 * Lazily import tesseract.js so the rest of the CLI has zero overhead
 * when --ocr is not passed.
 * @returns {Promise<import('tesseract.js')>}
 */
async function getTesseract() {
  const { createWorker } = await import('tesseract.js');
  return { createWorker };
}

/**
 * [PRO-CANDIDATE]
 * Initialise the Tesseract.js worker pool.
 * Call this ONCE before the first document if --ocr is active.
 *
 * @param {object} opts
 * @param {number} [opts.workers=2]       - Number of workers to pre-spawn
 * @param {string} [opts.lang='eng']      - Tesseract language code(s)
 * @param {string} [opts.oem]             - OEM mode (default: LSTM_ONLY = '1')
 */
export async function initOCRPool({ workers = 2, lang = 'eng', oem = '1' } = {}) {
  if (_pool) return; // already initialised

  const { createWorker } = await getTesseract();

  const instances = await Promise.all(
    Array.from({ length: workers }, () =>
      createWorker(lang, parseInt(oem, 10), {
        // Suppress Tesseract console noise
        logger: () => {},
        errorHandler: () => {},
      })
    )
  );

  _poolSize = instances.length;
  let _nextWorker = 0;

  _pool = {
    instances,
    // Round-robin worker selector
    acquire() {
      const w = instances[_nextWorker % _poolSize];
      _nextWorker++;
      return w;
    },
  };
}

/**
 * [PRO-CANDIDATE]
 * Terminate all Tesseract.js workers. Call after the last document.
 */
export async function terminateOCRPool() {
  if (!_pool) return;
  await Promise.all(_pool.instances.map(w => w.terminate()));
  _pool = null;
  _poolSize = 0;
}

/**
 * Compute printable_native_ratio for a page's text string.
 * Printable = characters in the Unicode printable range (excludes control chars).
 *
 * @param {string} text
 * @returns {number} 0.0–1.0
 */
export function computePrintableNativeRatio(text) {
  if (!text || text.length === 0) return 0;
  let printable = 0;
  for (const ch of text) {
    const cp = ch.codePointAt(0);
    // Accept: basic latin printable (0x20-0x7E), Latin-1 supplement (0xA0-0xFF),
    // and all Unicode >= 0x100 (covers CJK, Arabic, Hebrew, Cyrillic, etc.)
    if ((cp >= 0x20 && cp <= 0x7e) || cp >= 0xa0) printable++;
  }
  return printable / text.length;
}

/**
 * [PRO-CANDIDATE]
 * Compute image_coverage for a page from its operator list.
 * Reuses the same operator list logic from gate/signals.js without importing it
 * (to avoid coupling — gate is DO NOT TOUCH territory).
 *
 * @param {object|null} operatorList  - from getOperatorList()
 * @param {number} pageWidth
 * @param {number} pageHeight
 * @returns {number} 0.0–1.0
 */
export function computeImageCoverage(operatorList, pageWidth, pageHeight) {
  if (!operatorList?.fnArray || !pageWidth || !pageHeight) return 0;
  const pageArea = pageWidth * pageHeight;
  if (pageArea <= 0) return 0;

  const { fnArray, argsArray } = operatorList;
  let totalImageArea = 0;
  let matrix = [1, 0, 0, 1, 0, 0];

  for (let i = 0; i < fnArray.length; i++) {
    const fn = fnArray[i];
    if (fn === 12) {
      matrix = argsArray[i];
    } else if (fn === 85 || fn === 82) {
      const w = Math.abs(matrix[0]);
      const h = Math.abs(matrix[3]);
      if (w > 0 && h > 0) totalImageArea += w * h;
    }
  }

  return Math.min(totalImageArea / pageArea, 1);
}

/**
 * Determine the OCR route for a single page.
 *
 * @param {number} ratio           - printable_native_ratio
 * @param {number} imageCoverage   - 0.0–1.0
 * @returns {'NATIVE' | 'REPAIR' | 'WHOLE_PAGE_OCR' | 'REGION_OCR'}
 */
export function resolveOCRRoute(ratio, imageCoverage) {
  if (ratio >= RATIO_NATIVE_ONLY) return 'NATIVE';
  if (ratio >= RATIO_REPAIR_FLOOR && imageCoverage < IMAGE_COVERAGE_HIGH) return 'REPAIR';
  if (ratio < RATIO_REPAIR_FLOOR && imageCoverage >= IMAGE_COVERAGE_HIGH) return 'WHOLE_PAGE_OCR';
  // Catch-all: native text exists (ratio >= some chars) but regions failed
  return 'REGION_OCR';
}

/**
 * [PRO-CANDIDATE]
 * Run Tesseract OCR on a raw page image buffer.
 * Applies preprocessing (deskew + binarize + denoise) before recognition.
 *
 * @param {Buffer} imageBuffer  - PNG/JPEG image of the page at 300 dpi
 * @param {object} worker       - Tesseract.js worker from pool
 * @returns {Promise<string>}
 */
async function runOCROnImage(imageBuffer, worker) {
  const preprocessed = await preprocessPageImage(imageBuffer);
  const { data } = await worker.recognize(preprocessed);
  return (data.text || '').trim();
}

/**
 * [PRO-CANDIDATE]
 * Apply OCR fallback to extracted pages.
 *
 * Called AFTER extractPDF() — does not touch extractor.js.
 * When options.ocr is false/absent, returns the pages array unchanged.
 *
 * @param {string[]}      pageTexts     - output of extractPDF()
 * @param {object[]}      rawPageMeta   - array of { operatorList, pageWidth, pageHeight, imageBuffer? }
 *                                        imageBuffer is optional; if absent, WHOLE_PAGE_OCR is skipped
 * @param {{ ocr?: boolean, ocrLang?: string }} options
 * @returns {Promise<string[]>}
 */
export async function applyOCRFallback(pageTexts, rawPageMeta, options) {
  if (!options?.ocr) return pageTexts;

  if (!_pool) {
    log.warn('[ocr] Worker pool not initialised — call initOCRPool() before applyOCRFallback(). Skipping OCR.');
    return pageTexts;
  }

  const results = [];

  for (let i = 0; i < pageTexts.length; i++) {
    const text      = pageTexts[i] ?? '';
    const meta      = rawPageMeta[i] ?? {};
    const ratio     = computePrintableNativeRatio(text);
    const coverage  = computeImageCoverage(meta.operatorList, meta.pageWidth, meta.pageHeight);
    const route     = resolveOCRRoute(ratio, coverage);

    if (route === 'NATIVE' || route === 'REPAIR') {
      // Good native text — return as-is
      results.push(text);
      continue;
    }

    const imageBuffer = meta.imageBuffer;

    if (!imageBuffer) {
      // No rendered image available at runtime — cannot OCR
      // Append an inline warning comment so the output is still usable
      results.push(text + (text ? '\n\n' : '') +
        `<!-- Page ${i + 1}: OCR requested (route=${route}, ratio=${ratio.toFixed(3)}) but no page image was available -->`
      );
      continue;
    }

    try {
      const worker  = _pool.acquire();
      const ocrText = await runOCROnImage(imageBuffer, worker);

      if (route === 'WHOLE_PAGE_OCR') {
        results.push(ocrText || text);
      } else {
        // REGION_OCR — append OCR result block below native text
        const combined = [text, '\n\n<!-- OCR supplemental text -->', ocrText]
          .filter(Boolean)
          .join('\n');
        results.push(combined);
      }
    } catch (err) {
      log.warn(`[ocr] Page ${i + 1} OCR failed: ${err.message} — falling back to native text`);
      results.push(text);
    }
  }

  return results;
}
