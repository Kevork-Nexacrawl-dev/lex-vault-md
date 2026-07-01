#!/usr/bin/env node
/**
 * benchmarks/runner.js
 * LexVaultMD Benchmark Harness — CPU-only legal document benchmark
 *
 * Usage:
 *   node benchmarks/runner.js [--pdf path/to/pdf] [--tools all|lexvaultmd|marker|docling|mineru]
 *
 * Outputs wall-clock s/page and peak memory MB for each tool on each document.
 * Results written to benchmarks/results/<YYYY-MM-DD>-raw.json
 *
 * Hardware disclosure: results files embed CPU model, RAM, OS, Node version.
 *
 * INTEGRITY RULES (non-negotiable):
 * - LexVaultMD: `node bin/cli.js local <pdf>` — native path, no --ocr for CPU-only parity
 * - Marker:     `marker_single <pdf> --output_dir <tmp>` — NO --use_llm flag (CPU-only mode)
 * - Docling:    `docling convert <pdf> --output <tmp>` — default pipeline, NO EasyOCR
 * - MinerU:     `magic-pdf -p <pdf> -o <tmp> -m pipeline` — pipeline backend, NOT VLM mode
 * - LlamaParse: NOT run locally; accuracy from published benchmarks only (labeled cloud)
 */

'use strict';

const { execSync, spawnSync } = require('child_process');
const fs   = require('fs');
const path = require('path');
const os   = require('os');

// --- Tool version manifest — update before each run ---------------------
function detectVersion(cmd) {
  try {
    return execSync(cmd, { stdio: 'pipe' }).toString().trim().split('\n')[0];
  } catch {
    return 'NOT_INSTALLED';
  }
}

const TOOL_VERSIONS = {
  lexvaultmd : process.env.LEXVAULTMD_VERSION || (() => { try { return require('../package.json').version; } catch { return 'unknown'; } })(),
  marker     : process.env.MARKER_VERSION     || detectVersion('marker_single --version'),
  docling    : process.env.DOCLING_VERSION    || detectVersion('docling --version'),
  mineru     : process.env.MINERU_VERSION     || detectVersion('magic-pdf --version'),
};

// --- Hardware fingerprint ------------------------------------------------
const HARDWARE = {
  cpu        : os.cpus()[0]?.model ?? 'unknown',
  cpuCores   : os.cpus().length,
  ramGB      : (os.totalmem() / 1024 ** 3).toFixed(1),
  os         : `${os.type()} ${os.release()}`,
  arch       : os.arch(),
  nodeVersion: process.version,
};

// --- Gold set — paths relative to repo root ------------------------------
const GOLD_DIR   = path.join(__dirname, 'gold');
const GOLD_FILES = fs.readdirSync(GOLD_DIR)
  .filter(f => f.endsWith('.pdf'))
  .map(f => path.join(GOLD_DIR, f));

if (GOLD_FILES.length === 0) {
  console.error('No PDFs found in benchmarks/gold/. See benchmarks/gold/README.md for setup instructions.');
  process.exit(1);
}

// --- Peak memory helper --------------------------------------------------
function measurePeakMemoryMB(pid) {
  try {
    if (process.platform === 'linux') {
      const status = fs.readFileSync(`/proc/${pid}/status`, 'utf8');
      const match  = status.match(/VmPeak:\s+(\d+)\s+kB/);
      return match ? parseInt(match[1], 10) / 1024 : 0;
    } else if (process.platform === 'darwin') {
      const out = execSync(`ps -o rss= -p ${pid}`, { stdio: 'pipe' }).toString().trim();
      return parseInt(out, 10) / 1024;
    }
  } catch { /* ignore — platform may not support */ }
  return 0;
}

// --- Tool runner ---------------------------------------------------------
function runTool(toolId, pdfPath) {
  const tmpDir   = fs.mkdtempSync(path.join(os.tmpdir(), `lvm-bench-${toolId}-`));
  const start    = process.hrtime.bigint();

  const cmds = {
    lexvaultmd : ['node', [path.join(__dirname, '..', 'bin', 'cli.js'), 'local', pdfPath, '--output', path.join(tmpDir, 'out.md')]],
    marker     : ['marker_single', [pdfPath, '--output_dir', tmpDir]],
    docling    : ['docling', ['convert', pdfPath, '--output', tmpDir]],
    mineru     : ['magic-pdf', ['-p', pdfPath, '-o', tmpDir, '-m', 'pipeline']],
  };

  const [cmd, args] = cmds[toolId];

  // Force CPU-only: disable CUDA, limit to 1 OMP thread
  const env = {
    ...process.env,
    CUDA_VISIBLE_DEVICES: '',
    OMP_NUM_THREADS     : '1',
    MKL_NUM_THREADS     : '1',
  };

  const result = spawnSync(cmd, args, {
    stdio  : 'pipe',
    encoding: 'utf8',
    timeout : 5 * 60 * 1000,  // 5-minute wall-clock cap per document per tool
    env,
  });

  const exitCode = result.status ?? -1;
  const stderr   = (result.stderr ?? '').slice(0, 500);
  const peakMB   = measurePeakMemoryMB(result.pid);
  const elapsed  = Number(process.hrtime.bigint() - start) / 1e9;  // seconds

  // Page count from ground-truth annotation
  const annoPath = pdfPath.replace(/\.pdf$/, '.gt.json');
  const pages    = fs.existsSync(annoPath)
    ? JSON.parse(fs.readFileSync(annoPath, 'utf8')).metadata.pageCount
    : 1;

  // Capture first output file produced
  let outputFile = null;
  try {
    const files = fs.readdirSync(tmpDir);
    if (files.length > 0) outputFile = path.join(tmpDir, files[0]);
  } catch { /* ignore */ }

  return {
    toolId,
    pdfPath,
    pdfName      : path.basename(pdfPath),
    exitCode,
    stderr,
    elapsedSec   : parseFloat(elapsed.toFixed(3)),
    secPerPage   : parseFloat((elapsed / pages).toFixed(3)),
    peakMemoryMB : parseFloat(peakMB.toFixed(1)),
    pages,
    outputFile,
    tmpDir,
  };
}

// --- CLI args -----------------------------------------------------------
const cliArgs   = process.argv.slice(2);
const toolsFlag = cliArgs.includes('--tools') ? cliArgs[cliArgs.indexOf('--tools') + 1] : 'all';
const pdfFlag   = cliArgs.includes('--pdf')   ? cliArgs[cliArgs.indexOf('--pdf')   + 1] : null;

const TOOLS       = ['lexvaultmd', 'marker', 'docling', 'mineru'];
const activeTools = toolsFlag === 'all' ? TOOLS : toolsFlag.split(',');
const activePDFs  = pdfFlag ? [pdfFlag] : GOLD_FILES;

console.log('=== LexVaultMD Benchmark Harness ===');
console.log('Hardware:', HARDWARE);
console.log('Tools:   ', activeTools.join(', '));
console.log('PDFs:    ', activePDFs.map(p => path.basename(p)).join(', '));
console.log();

const allResults = [];

for (const pdf of activePDFs) {
  for (const tool of activeTools) {
    if (TOOL_VERSIONS[tool] === 'NOT_INSTALLED') {
      console.warn(`  SKIP  ${tool} — not installed`);
      allResults.push({ toolId: tool, pdfName: path.basename(pdf), skipped: true });
      continue;
    }
    process.stdout.write(`  RUN   ${tool.padEnd(12)} ${path.basename(pdf)} ... `);
    const r = runTool(tool, pdf);
    const status = r.exitCode === 0 ? 'OK' : `FAIL(${r.exitCode})`;
    console.log(`${status}  ${r.secPerPage.toFixed(3)} s/page  ${r.peakMemoryMB.toFixed(0)} MB`);
    allResults.push(r);
  }
}

// --- Write raw results --------------------------------------------------
const today      = new Date().toISOString().slice(0, 10);
const resultsDir = path.join(__dirname, 'results');
fs.mkdirSync(resultsDir, { recursive: true });

const rawPath = path.join(resultsDir, `${today}-raw.json`);
fs.writeFileSync(rawPath, JSON.stringify({
  runDate  : new Date().toISOString(),
  hardware : HARDWARE,
  versions : TOOL_VERSIONS,
  results  : allResults,
}, null, 2));

console.log(`\nRaw results written to ${rawPath}`);
console.log('Run: node benchmarks/score.js   to produce scored Markdown report.');
