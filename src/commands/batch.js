import fs from 'fs';
import path from 'path';
import ora from 'ora';
import { extractPDF } from '../services/extractor.js';
import { formatMarkdown, deriveOutputFilename } from '../utils/formatter.js';
import { log } from '../utils/logger.js';

/**
 * pdf2md batch <folder> [--output <dir>] [--concurrency <n>]
 *
 * Converts every PDF in <folder> to Markdown.
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

  log.info(`Found ${pdfs.length} PDF(s) in ${path.basename(resolvedFolder)}`);
  log.dim(`Output → ${outDir}`);
  console.log();

  const concurrency = Math.max(1, parseInt(options.concurrency, 10) || 3);
  const results = { converted: 0, skipped: 0, failed: 0 };
  const errors = [];

  // Process in chunks of <concurrency>
  for (let i = 0; i < pdfs.length; i += concurrency) {
    const chunk = pdfs.slice(i, i + concurrency);
    await Promise.all(chunk.map(filename => processOne(filename, resolvedFolder, outDir, results, errors)));
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

async function processOne(filename, sourceDir, outDir, results, errors) {
  const inputPath  = path.join(sourceDir, filename);
  const outputName = filename.replace(/\.pdf$/i, '.md');
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
    const { pages, wasRepaired } = await extractPDF(buffer, filename, inputPath);
    const markdown = formatMarkdown(pages, filename);

    fs.writeFileSync(outputPath, markdown, 'utf8');
    const repairSuffix = wasRepaired ? ' [XRef repaired]' : '';
    spinner.succeed(`${filename} → ${outputName}  (${pages.length} page(s), ${markdown.length} chars)${repairSuffix}`);
    results.converted++;
  } catch (err) {
    let reason = err.message;
    if (err.message.includes('password'))      reason = 'encrypted PDF — skipped';
    if (err.message.includes('No text content')) reason = 'image-only PDF — no extractable text';

    spinner.fail(`${filename} — ${reason}`);
    errors.push({ file: filename, reason });
    results.failed++;
  }
}
