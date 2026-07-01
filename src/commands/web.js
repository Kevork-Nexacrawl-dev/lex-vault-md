import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import axios from 'axios';
import ora from 'ora';
import { extractPDF } from '../services/extractor.js';
import { formatMarkdown, deriveOutputFilename } from '../utils/formatter.js';
// [CORE-BSL] JSON output support
import { formatJSON, deriveJsonFilename } from '../utils/json-formatter.js';
// [PRO-CANDIDATE] OCR fallback
import { applyOCRFallback, initOCRPool, terminateOCRPool } from '../services/ocr-router.js';
// [PRO-CANDIDATE] Template profiles
import { resolveProfile } from '../services/template-profiles.js';
import { applyTemplate }  from '../utils/template-formatter.js';
import { log } from '../utils/logger.js';

let clipboardy;
const require = createRequire(import.meta.url);
const packageJson = require('../../package.json');
try {
  clipboardy = require('clipboardy');
} catch {
  clipboardy = null;
}

/**
 * lex-vault-md web <url> [--output <file>] [--clipboard] [--json] [--ocr] [--template <profile>]
 */
export async function webCommand(url, options) {
  // Basic URL validation
  let parsedUrl;
  try {
    parsedUrl = new URL(url);
  } catch {
    log.error(`Invalid URL: ${url}`);
    process.exit(1);
  }

  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    log.error('Only http:// and https:// URLs are supported.');
    process.exit(1);
  }

  // [PRO-CANDIDATE] Resolve template profile early so invalid names fail fast
  let profile;
  try {
    profile = resolveProfile(options.template);
  } catch (err) {
    log.error(err.message);
    process.exit(1);
  }

  // [PRO-CANDIDATE] Initialise OCR worker pool once before fetch
  if (options.ocr) {
    try {
      await initOCRPool();
    } catch (err) {
      log.error(`Could not start Tesseract.js worker pool: ${err.message}`);
      log.error('Run: npm install tesseract.js');
      process.exit(1);
    }
  }

  const spinner = ora(`Fetching PDF from ${parsedUrl.hostname}...`).start();

  try {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 30_000,
      headers: {
        'User-Agent': `lex-vault-md/${packageJson.version}`,
        'Accept': 'application/pdf,*/*',
      },
    });

    // Check content-type
    const contentType = response.headers['content-type'] || '';
    if (!contentType.includes('pdf') && !contentType.includes('octet-stream')) {
      log.warn(`Unexpected content-type: ${contentType}. Attempting extraction anyway...`);
    }

    spinner.text = 'Extracting text and detecting headings...';
    const buffer = Buffer.from(response.data);

    let pages = await extractPDF(buffer, url);

    // [PRO-CANDIDATE] --ocr branch: apply per-page OCR routing after extraction
    if (options.ocr) {
      spinner.text = 'Applying OCR fallback where needed...';
      pages = await applyOCRFallback(pages, [], options);
    }

    // [PRO-CANDIDATE] --template branch: apply profile post-processing
    if (profile) {
      spinner.text = `Applying ${profile.name} template profile...`;
      pages = applyTemplate(pages, profile);
    }

    // [CORE-BSL] --json branch: write structured JSON, skip Markdown path entirely
    if (options.json) {
      const jsonObj  = formatJSON(pages, url);
      // Surface active profile in JSON metadata when --template is used
      if (profile) jsonObj.metadata.profile = profile.name;
      const outFile  = options.output || deriveJsonFilename(url);
      const outPath  = path.resolve(outFile);
      const jsonStr  = JSON.stringify(jsonObj, null, 2);

      spinner.succeed(`Extracted ${pages.length} page(s) from remote PDF`);
      fs.writeFileSync(outPath, jsonStr, 'utf8');
      log.success(`Saved JSON → ${outPath}`);
      log.dim(`${pages.length} pages | ${jsonObj.metadata.charCount} chars | ${path.basename(outPath)}`);
      return;
    }

    // Default Markdown path — byte-for-byte identical to pre-flag behaviour when no profile
    const markdown = formatMarkdown(pages, url);
    spinner.succeed(`Extracted ${pages.length} page(s) from remote PDF`);

    // Write output file
    const outFile = options.output || deriveOutputFilename(url);
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
    spinner.fail('Failed to fetch or extract PDF');
    if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
      log.error(`Could not reach ${parsedUrl.hostname}. Check the URL and your internet connection.`);
    } else if (err.response?.status === 404) {
      log.error(`PDF not found (404): ${url}`);
    } else if (err.response?.status === 403) {
      log.error(`Access denied (403). The server may require authentication.`);
    } else if (err.code === 'ECONNABORTED') {
      log.error('Request timed out after 30 seconds.');
    } else {
      log.error(err.message);
    }
    process.exit(1);
  } finally {
    // [PRO-CANDIDATE] Always terminate OCR workers on exit
    if (options.ocr) await terminateOCRPool();
  }
}
