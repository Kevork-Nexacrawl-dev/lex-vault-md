#!/usr/bin/env node
import { Command } from 'commander';
import { localCommand } from '../src/commands/local.js';
import { webCommand } from '../src/commands/web.js';

const program = new Command();

program
  .name('pdf2md')
  .description('Convert PDFs to Markdown — supports local files and web URLs')
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

program.parse();
