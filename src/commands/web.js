import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import axios from 'axios';
import ora from 'ora';
import { extractPDF } from '../services/extractor.js';
import { formatMarkdown, deriveOutputFilename } from '../utils/formatter.js';
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
 * lex-vault-md web <url> [--output <file>] [--clipboard]
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
    const sourceName = deriveOutputFilename(url).replace('.md', '.pdf');

    const pages = await extractPDF(buffer, url);
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
  }
}
