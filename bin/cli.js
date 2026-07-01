#!/usr/bin/env node
import { Command } from 'commander';
import { createRequire } from 'module';
import { localCommand } from '../src/commands/local.js';
import { webCommand } from '../src/commands/web.js';
import { batchCommand } from '../src/commands/batch.js';

const require = createRequire(import.meta.url);
const packageJson = require('../package.json');
const program = new Command();

program
  .name('lex-vault-md')
  .description(
`Convert PDFs to Markdown — supports local files, remote URLs, and batch folders.

Examples:
  lex-vault-md local ./motion.pdf
  lex-vault-md web https://example.com/brief.pdf
  lex-vault-md batch ./case_files/
  lex-vault-md batch ./case_files/ --output ./converted/ --concurrency 5
  lex-vault-md local ./motion.pdf --output notes.md --clipboard
  lex-vault-md local ./motion.pdf --json
  lex-vault-md web https://example.com/brief.pdf --json
  lex-vault-md batch ./case_files/ --json

  # Shorthand (auto-detects local path vs URL):
  lex-vault-md ./motion.pdf
  lex-vault-md https://example.com/brief.pdf`
  )
  .version(packageJson.version);

// ── local <filepath> ────────────────────────────────────────────────────────
program
  .command('local <filepath>')
  .description('Convert a local PDF file to Markdown')
  .option('-o, --output <file>', 'Output .md filename (default: same name as PDF)')
  .option('-c, --clipboard',     'Copy result to clipboard after saving')
  // [CORE-BSL]
  .option('-j, --json',          'Output structured JSON instead of Markdown')
  .action(localCommand);

// ── web <url> ────────────────────────────────────────────────────────────────
program
  .command('web <url>')
  .description('Fetch a remote PDF by URL and convert to Markdown')
  .option('-o, --output <file>', 'Output .md filename (default: derived from URL)')
  .option('-c, --clipboard',     'Copy result to clipboard after saving')
  // [CORE-BSL]
  .option('-j, --json',          'Output structured JSON instead of Markdown')
  .action(webCommand);

// ── batch <folder> ───────────────────────────────────────────────────────────
program
  .command('batch <folder>')
  .description('Convert all PDF files in a folder to Markdown')
  .option('-o, --output <dir>',      'Output directory for .md files (default: same as source folder)')
  .option('-n, --concurrency <n>',   'Number of PDFs to process in parallel (default: 3)', '3')
  // [CORE-BSL]
  .option('-j, --json',              'Output structured JSON instead of Markdown (writes .json files)')
  .action(batchCommand);

// ── Shorthand fallback: lex-vault-md <filepath-or-url> ───────────────────────
program
  .command('convert <input>', { isDefault: true, hidden: true })
  .description('Auto-detect local file vs URL and convert (shorthand)')
  .option('-o, --output <file>', 'Output .md filename')
  .option('-c, --clipboard',     'Copy result to clipboard after saving')
  // [CORE-BSL]
  .option('-j, --json',          'Output structured JSON instead of Markdown')
  .action((input, options) => {
    const isUrl = /^https?:\/\//i.test(input);
    if (isUrl) {
      webCommand(input, options);
    } else {
      localCommand(input, options);
    }
  });

program.parse();
