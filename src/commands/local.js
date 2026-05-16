import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import ora from 'ora';
import { extractPDF } from '../services/extractor.js';
import { formatMarkdown, deriveOutputFilename } from '../utils/formatter.js';
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
 * pdf2md local <filepath> [--output <file>] [--clipboard]
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

  try {
    const buffer = fs.readFileSync(resolved);
    spinner.text = 'Extracting text and detecting headings...';

    const { pages, wasRepaired } = await extractPDF(buffer, path.basename(resolved), resolved);
    const markdown = formatMarkdown(pages, path.basename(resolved));

    const repairSuffix = wasRepaired ? ' [XRef repaired]' : '';
    spinner.succeed(`Extracted ${pages.length} page(s)${repairSuffix}`);

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
  }
}
