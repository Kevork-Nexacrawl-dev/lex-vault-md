#!/usr/bin/env node
/**
 * benchmarks/score.js
 * LexVaultMD Benchmark Scorer
 *
 * Reads raw runner output (benchmarks/results/<date>-raw.json) and
 * ground-truth annotations (benchmarks/gold/<slug>.gt.json), then
 * produces a scored benchmarks/results/<date>.md report.
 *
 * Scoring: 0–5 scale per metric per document.
 * Metrics scored automatically: heading hierarchy, table row coverage, reading order heuristic.
 * Metrics requiring manual evaluation: legal artifacts, clause continuity.
 * Manual metrics are flagged with ¹ in the output table.
 *
 * Usage:
 *   node benchmarks/score.js                              # uses today's raw file
 *   node benchmarks/score.js --raw results/2026-07-01-raw.json
 */

'use strict';

const fs   = require('fs');
const path = require('path');

// --- Scoring rubrics (printed in report for human reviewers) ------------
const RUBRIC = {
  legalArtifacts: [
    '0 — No Bates/stamps detected where expected, or output is garbled',
    '1 — Bates present but garbled text',
    '2 — Bates present, confidentiality stamps dropped',
    '3 — Bates and stamps present, inconsistent formatting',
    '4 — All artifacts handled correctly with ≤1 formatting error',
    '5 — All legal artifacts correctly preserved or suppressed per document spec',
  ],
  clauseContinuity: [
    '0 — Cross-page clauses split at every page boundary',
    '1 — Majority of clauses split (>50% broken)',
    '2 — Many clauses split (25–50% broken)',
    '3 — Some clauses split (10–25% broken)',
    '4 — Rare split (1–2 clauses broken)',
    '5 — All cross-page clauses joined correctly',
  ],
};

// --- Resolve raw file ---------------------------------------------------
const today      = new Date().toISOString().slice(0, 10);
const resultsDir = path.join(__dirname, 'results');
const goldDir    = path.join(__dirname, 'gold');

const rawFlagIdx = process.argv.indexOf('--raw');
const rawPath    = rawFlagIdx !== -1
  ? path.resolve(process.argv[rawFlagIdx + 1])
  : path.join(resultsDir, `${today}-raw.json`);

if (!fs.existsSync(rawPath)) {
  console.error(`Raw results not found: ${rawPath}`);
  console.error('Run: node benchmarks/runner.js   first.');
  process.exit(1);
}

const raw = JSON.parse(fs.readFileSync(rawPath, 'utf8'));

// --- Ground-truth loader ------------------------------------------------
function loadGT(pdfName) {
  const gtPath = path.join(goldDir, pdfName.replace(/\.pdf$/, '.gt.json'));
  if (!fs.existsSync(gtPath)) return null;
  return JSON.parse(fs.readFileSync(gtPath, 'utf8'));
}

// --- Automated scoring helpers ------------------------------------------

function scoreHeadings(outputText, gt) {
  if (!outputText || !gt || !gt.headings) return { score: null, method: 'manual', reason: 'no output or no GT' };
  const h1 = (outputText.match(/^# /gm)  || []).length;
  const h2 = (outputText.match(/^## /gm) || []).length;
  const h3 = (outputText.match(/^### /gm)|| []).length;
  const gtH1 = gt.headings.filter(h => h.level === 1).length;
  const gtH2 = gt.headings.filter(h => h.level === 2).length;
  const gtH3 = gt.headings.filter(h => h.level === 3).length;
  const errors = Math.abs(h1 - gtH1) + Math.abs(h2 - gtH2) + Math.abs(h3 - gtH3);
  if (errors === 0)              return { score: 5, method: 'auto' };
  if (errors <= 1)               return { score: 4, method: 'auto' };
  if (errors <= 3)               return { score: 3, method: 'auto' };
  if (errors <= 6)               return { score: 2, method: 'auto' };
  if (h1 + h2 + h3 > 0)         return { score: 1, method: 'auto' };
  return { score: 0, method: 'auto' };
}

function scoreTables(outputText, gt) {
  if (!outputText || !gt)                 return { score: null, method: 'manual', reason: 'no output or no GT' };
  if (!gt.tables || gt.tables.length === 0) return { score: 5,    method: 'auto',   reason: 'no tables expected' };
  const tableMatches = outputText.match(/^\|.+\|$/gm) || [];
  const detectedRows = tableMatches.length;
  const gtRows       = gt.tables.reduce((s, t) => s + t.rows + 2, 0);  // +2 for header + separator
  if (detectedRows === 0) return { score: 0, method: 'auto' };
  const ratio = Math.min(detectedRows, gtRows) / Math.max(detectedRows, gtRows);
  if (ratio >= 0.95) return { score: 5, method: 'auto' };
  if (ratio >= 0.80) return { score: 4, method: 'auto' };
  if (ratio >= 0.60) return { score: 3, method: 'auto' };
  if (ratio >= 0.40) return { score: 2, method: 'auto' };
  return { score: 1, method: 'auto' };
}

function scoreReadingOrder(outputText, gt) {
  if (!outputText || !gt) return { score: null, method: 'manual', reason: 'no output or no GT' };
  if (!gt.readingOrderChecks || gt.readingOrderChecks.length === 0) {
    return { score: null, method: 'manual', reason: 'no automated checks defined — manual review required' };
  }
  let errors = 0;
  for (const check of gt.readingOrderChecks) {
    const re         = new RegExp(check.regex, 'gm');
    const matchCount = (outputText.match(re) || []).length;
    if (Math.abs(matchCount - check.expectedCount) > check.tolerance) errors++;
  }
  if (errors === 0) return { score: 5, method: 'auto' };
  if (errors === 1) return { score: 4, method: 'auto' };
  if (errors === 2) return { score: 3, method: 'auto' };
  // Too many deviations — escalate to manual
  return { score: null, method: 'manual', reason: `${errors} automated checks failed — manual review required` };
}

function manualScore(rubricKey) {
  return { score: null, method: 'manual', rubric: RUBRIC[rubricKey] };
}

// --- Score all results --------------------------------------------------
const scored = raw.results.map(r => {
  if (r.skipped) return { ...r, scores: null };

  const gt         = loadGT(r.pdfName);
  let   outputText = null;
  if (r.outputFile && fs.existsSync(r.outputFile)) {
    outputText = fs.readFileSync(r.outputFile, 'utf8');
  }

  const scores = {
    headingHierarchy : scoreHeadings(outputText, gt),
    tableAccuracy    : scoreTables(outputText, gt),
    readingOrder     : scoreReadingOrder(outputText, gt),
    legalArtifacts   : manualScore('legalArtifacts'),
    clauseContinuity : manualScore('clauseContinuity'),
  };

  const autoVals = Object.values(scores).filter(s => s.score !== null).map(s => s.score);
  const autoAvg  = autoVals.length
    ? (autoVals.reduce((a, b) => a + b, 0) / autoVals.length).toFixed(2)
    : 'TBD';

  return {
    toolId       : r.toolId,
    pdfName      : r.pdfName,
    pages        : r.pages,
    secPerPage   : r.secPerPage,
    peakMemoryMB : r.peakMemoryMB,
    exitCode     : r.exitCode,
    scores,
    autoAvg,
  };
});

// --- Aggregate helper ---------------------------------------------------
function aggMetric(toolId, metric) {
  const vals = scored
    .filter(r => r.toolId === toolId && !r.skipped && r.scores && r.scores[metric].score !== null)
    .map(r => r.scores[metric].score);
  return vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : 'manual¹';
}

// --- Render Markdown report ---------------------------------------------
function renderReport() {
  const lines = [];
  const date  = raw.runDate.slice(0, 10);

  lines.push(`# Benchmark Results — ${date}`);
  lines.push('');
  lines.push('> **Status:** First pass — automated metrics populated; manual metrics (`¹`) require human review before publishing.');
  lines.push('');
  lines.push('## Test Environment');
  lines.push('');
  lines.push('| Field | Value |');
  lines.push('|---|---|');
  lines.push(`| CPU | ${raw.hardware.cpu} (${raw.hardware.cpuCores} cores) |`);
  lines.push(`| RAM | ${raw.hardware.ramGB} GB |`);
  lines.push(`| OS | ${raw.hardware.os} |`);
  lines.push(`| Node | ${raw.hardware.nodeVersion} |`);
  lines.push('');
  lines.push('## Tool Versions');
  lines.push('');
  lines.push('| Tool | Version | Mode |');
  lines.push('|---|---|---|');
  lines.push(`| LexVaultMD | ${raw.versions.lexvaultmd} | CPU — native path |`);
  lines.push(`| Marker | ${raw.versions.marker} | CPU-only (no \`--use_llm\`) |`);
  lines.push(`| Docling | ${raw.versions.docling} | CPU — default pipeline (no EasyOCR) |`);
  lines.push(`| MinerU | ${raw.versions.mineru} | CPU — pipeline backend (no VLM) |`);
  lines.push(`| LlamaParse | N/A (cloud) | ☁️ Not run locally — accuracy from published benchmarks |`);
  lines.push('');

  lines.push('## Per-Document Scores');
  lines.push('');

  for (const r of scored) {
    if (r.skipped) {
      lines.push(`- **${r.toolId}** on \`${r.pdfName}\`: SKIPPED — not installed`);
      continue;
    }
    const s = r.scores;
    lines.push(`### ${r.toolId} / ${r.pdfName}`);
    lines.push('');
    lines.push('| Metric | Score | Method |');
    lines.push('|---|---|---|');
    lines.push(`| Heading Hierarchy | ${s.headingHierarchy.score ?? 'manual¹'}/5 | ${s.headingHierarchy.method} |`);
    lines.push(`| Table Accuracy    | ${s.tableAccuracy.score    ?? 'manual¹'}/5 | ${s.tableAccuracy.method} |`);
    lines.push(`| Reading Order     | ${s.readingOrder.score     ?? 'manual¹'}/5 | ${s.readingOrder.method} |`);
    lines.push(`| Legal Artifacts   | manual¹ | manual |`);
    lines.push(`| Clause Continuity | manual¹ | manual |`);
    lines.push(`| CPU Time (s/page) | ${r.secPerPage} | measured |`);
    lines.push(`| Peak Memory (MB)  | ${r.peakMemoryMB} | measured |`);
    lines.push(`| Auto Avg (partial)| ${r.autoAvg}/5 | auto |`);
    lines.push('');
  }

  lines.push('## Aggregate Benchmark Table');
  lines.push('');
  lines.push('| Tool | Heading Accuracy | Table Accuracy | Reading Order | Legal Artifacts | CPU Time (s/page) | Memory (MB) | Overall |');
  lines.push('|---|---|---|---|---|---|---|---|');

  const tools = ['lexvaultmd', 'marker', 'docling', 'mineru'];
  for (const tool of tools) {
    const rows = scored.filter(r => r.toolId === tool && !r.skipped);
    if (rows.length === 0) {
      lines.push(`| ${tool} | — | — | — | — | — | — | NOT INSTALLED |`);
      continue;
    }
    const avgSec = (rows.reduce((s, r) => s + r.secPerPage, 0) / rows.length).toFixed(3);
    const avgMem = (rows.reduce((s, r) => s + r.peakMemoryMB, 0) / rows.length).toFixed(0);
    lines.push(`| ${tool} | ${aggMetric(tool,'headingHierarchy')} | ${aggMetric(tool,'tableAccuracy')} | ${aggMetric(tool,'readingOrder')} | manual¹ | ${avgSec} | ${avgMem} | partial² |`);
  }

  lines.push('| LlamaParse | ☁️ cloud | ☁️ cloud | ☁️ cloud | ☁️ cloud | N/A | N/A | cloud ref |');
  lines.push('');
  lines.push('> ¹ Legal Artifacts and Clause Continuity require manual evaluation. Rubric is in `benchmarks/score.js` → `RUBRIC` constant and in each `.gt.json` `manualEvalNote`.');
  lines.push('> ² Overall score is partial until manual metrics are filled in. Do not publish this table to README until manual review is complete.');
  lines.push('> LlamaParse is a cloud service. Accuracy shown is from published benchmarks, not a local run. Not a valid CPU comparison.');
  lines.push('');
  lines.push('## Integrity Disclosure');
  lines.push('');
  lines.push('- Marker benchmarked in CPU-only mode (`marker_single`, no `--use_llm`). Note: `--use_llm` is highest-accuracy but requires cloud/GPU; excluded for fair CPU comparison.');
  lines.push('- Docling benchmarked with default pipeline. EasyOCR path excluded (>30s/page on CPU; not the recommended mode for born-digital legal docs).');
  lines.push('- MinerU benchmarked with `pipeline` backend. VLM mode excluded (trails pipeline for CPU-only; not fair comparison).');
  lines.push('- LlamaParse: cloud service, not run locally. Any accuracy figures come from their published benchmarks. Clearly labeled ☁️ throughout.');
  lines.push('- Documents where LexVaultMD is expected to lose are included (see `knownWeakness: true` in `.gt.json` files).');
  lines.push(`- Raw timing JSON: \`benchmarks/results/${date}-raw.json\``);
  lines.push(`- Test script: \`benchmarks/runner.js\``);
  lines.push(`- Scorer: \`benchmarks/score.js\``);

  return lines.join('\n');
}

const report  = renderReport();
const outPath = path.join(resultsDir, `${today}.md`);
fs.mkdirSync(resultsDir, { recursive: true });
fs.writeFileSync(outPath, report);
console.log(`Scored report written to ${outPath}`);
