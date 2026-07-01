import fs from 'fs';
import path from 'path';
import ora from 'ora';
import { extractPDF } from '../services/extractor.js';
import { formatMarkdown, deriveOutputFilename } from '../utils/formatter.js';
// [CORE-BSL] JSON output support
import { formatJSON } from '../utils/json-formatter.js';
// [PRO-CANDIDATE] OCR fallback
import { applyOCRFallback, initOCRPool, terminateOCRPool } from '../services/ocr-router.js';
import { log } from '../utils/logger.js';

/**
 * lex-vault-md batch <folder> [--output <dir>] [--concurrency <n>] [--json] [--ocr]
 *
 * Converts every PDF in <folder> to Markdown (default) or JSON (--json).
 * Output defaults to the same folder as the source PDFs.
 */
export async function batchCommand(folder, options) {
  const resolvedFolder = path.resolve(folder);

  // Validate folder exists
  if (!fs.existsSync(resolvedFolder)) {
    log.error(`Folder not found: ${resolvedFolder}`);
    process.exit(1);
  }

  if (!fs.statSync(resolvedFolder).isDirectory()) {
    log.error(`Not a directory: ${resolvedFolder}`);
    process.exit(1);
  }

  // Resolve output directory
  const outDir = options.output
    ? path.resolve(options.output)
    : resolvedFolder;

  if (options.output && !fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
    log.info(`Created output directory: ${outDir}`);
  }

  // Collect PDFs
  const allFiles = fs.readdirSync(resolvedFolder);
  const pdfs = allFiles.filter(f => path.extname(f).toLowerCase() === '.pdf');

  if (pdfs.length === 0) {
    log.warn(`No PDF files found in: ${resolvedFolder}`);
    process.exit(0);
  }

  // [CORE-BSL] surface output mode in progress log
  const outputMode = options.json ? 'JSON' : 'Markdown';
  const ocrNote   = options.ocr  ? ' + OCR fallback' : '';
  log.info(`Found ${pdfs.length} PDF(s) in ${path.basename(resolvedFolder)} → outputting ${outputMode}${ocrNote}`);
  log.dim(`Output → ${outDir}`);
  console.log();

  // [PRO-CANDIDATE] Initialise OCR worker pool ONCE for the whole batch
  if (options.ocr) {
    try {
      await initOCRPool();
    } catch (err) {
      log.error(`Could not start Tesseract.js worker pool: ${err.message}`);
      log.error('Run: npm install tesseract.js');
      process.exit(1);
    }
  }

  const concurrency = Math.max(1, parseInt(options.concurrency, 10) || 3);
  const results = { converted: 0, skipped: 0, failed: 0 };
  const errors = [];

  // Process in chunks of <concurrency>
  try {
    for (let i = 0; i < pdfs.length; i += concurrency) {
      const chunk = pdfs.slice(i, i + concurrency);
      await Promise.all(chunk.map(filename => processOne(filename, resolvedFolder, outDir, results, errors, options)));
    }
  } finally {
    // [PRO-CANDIDATE] Always terminate OCR workers after batch
    if (options.ocr) await terminateOCRPool();
  }

  // Summary
  console.log();
  log.dim('─'.repeat(48));
  log.success(`Batch complete — ${pdfs.length} file(s) processed`);
  log.dim(`  ✔ Converted : ${results.converted}`);
  log.dim(`  ⏭ Skipped   : ${results.skipped}  (already exists)`);
  log.dim(`  ✖ Failed    : ${results.failed}`);

  if (errors.length > 0) {
    console.log();
    log.warn('Failed files:');
    errors.forEach(({ file, reason }) => log.dim(`  ${file} — ${reason}`));
  }
}

// [CORE-BSL] options passed through to support --json and --ocr per-file routing
async function processOne(filename, sourceDir, outDir, results, errors, options) {
  const inputPath = path.join(sourceDir, filename);

  // [CORE-BSL] derive output filename based on mode
  const outputName = options.json
    ? filename.replace(/\.pdf$/i, '.json')
    : filename.replace(/\.pdf$/i, '.md');
  const outputPath = path.join(outDir, outputName);

  // Skip if already converted
  if (fs.existsSync(outputPath)) {
    log.dim(`  ⏭ Skipped (exists): ${filename}`);
    results.skipped++;
    return;
  }

  const spinner = ora({ text: `Converting ${filename}...`, prefixText: ' ' }).start();

  try {
    const buffer = fs.readFileSync(inputPath);
    let pages    = await extractPDF(buffer, filename);

    // [PRO-CANDIDATE] --ocr branch: apply per-page OCR routing after extraction
    if (options.ocr) {
      pages = await applyOCRFallback(pages, [], options);
    }

    // [CORE-BSL] --json branch
    if (options.json) {
      const jsonObj = formatJSON(pages, filename);
      const jsonStr = JSON.stringify(jsonObj, null, 2);
      fs.writeFileSync(outputPath, jsonStr, 'utf8');
      spinner.succeed(`${filename} → ${outputName}  (${pages.length} page(s), ${jsonObj.metadata.charCount} chars)`);
    } else {
      // Default Markdown path — byte-for-byte identical to pre-flag behaviour
      const markdown = formatMarkdown(pages, filename);
      fs.writeFileSync(outputPath, markdown, 'utf8');
      spinner.succeed(`${filename} → ${outputName}  (${pages.length} page(s), ${markdown.length} chars)`);
    }

    results.converted++;
  } catch (err) {
    let reason = err.message;
    if (err.message.includes('password'))        reason = 'encrypted PDF — skipped';
    if (err.message.includes('No text content')) reason = 'image-only PDF — no extractable text';

    spinner.fail(`${filename} — ${reason}`);
    errors.push({ file: filename, reason });
    results.failed++;
  }
}
