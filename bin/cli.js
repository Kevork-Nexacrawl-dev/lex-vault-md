#!/usr/bin/env node
import { Command } from 'commander';
import { localCommand } from '../src/commands/local.js';
import { webCommand } from '../src/commands/web.js';
import { batchCommand } from '../src/commands/batch.js';

const program = new Command();

program
  .name('pdf2md')
  .description(
`Convert PDFs to Markdown — supports local files, remote URLs, and batch folders.

Examples:
  pdf2md local ./report.pdf
  pdf2md web https://arxiv.org/pdf/2103.00020.pdf
  pdf2md batch ./case_files/
  pdf2md batch ./case_files/ --output ./converted/ --concurrency 5
  pdf2md local ./report.pdf --output notes.md --clipboard

  # Shorthand (auto-detects local path vs URL):
  pdf2md ./report.pdf
  pdf2md https://arxiv.org/pdf/2103.00020.pdf`
  )
  .version('1.0.0');

// ── local <filepath> ────────────────────────────────────────────────────────
program
  .command('local <filepath>')
  .description('Convert a local PDF file to Markdown')
  .option('-o, --output <file>', 'Output .md filename (default: same name as PDF)')
  .option('-c, --clipboard',     'Copy result to clipboard after saving')
  .action(localCommand);

// ── web <url> ────────────────────────────────────────────────────────────────
program
  .command('web <url>')
  .description('Fetch a remote PDF by URL and convert to Markdown')
  .option('-o, --output <file>', 'Output .md filename (default: derived from URL)')
  .option('-c, --clipboard',     'Copy result to clipboard after saving')
  .action(webCommand);

// ── batch <folder> ───────────────────────────────────────────────────────────
program
  .command('batch <folder>')
  .description('Convert all PDF files in a folder to Markdown')
  .option('-o, --output <dir>',      'Output directory for .md files (default: same as source folder)')
  .option('-n, --concurrency <n>',   'Number of PDFs to process in parallel (default: 3)', '3')
  .action(batchCommand);

// ── Shorthand fallback: pdf2md <filepath-or-url> ─────────────────────────────
program
  .command('convert <input>', { isDefault: true, hidden: true })
  .description('Auto-detect local file vs URL and convert (shorthand)')
  .option('-o, --output <file>', 'Output .md filename')
  .option('-c, --clipboard',     'Copy result to clipboard after saving')
  .action((input, options) => {
    const isUrl = /^https?:\/\//i.test(input);
    if (isUrl) {
      webCommand(input, options);
    } else {
      localCommand(input, options);
    }
  });

program.parse();
