// BLUEPRINT: Hybrid Table Orchestrator — Block 1c + 1d
// Runs Stream and Lattice simultaneously, scores each result on 3 deterministic
// checks, outputs the highest scorer. Applies Y-DBSCAN multi-line cell merge
// (Block 1d) to stream results before scoring.
// If both methods score 0 -> emits warning tag rather than corrupted data.

import { streamExtract } from './stream.js';
import { latticeExtract } from './lattice.js';

// ---------------------------------------------------------------------------
// BLUEPRINT: Cartesian Y-DBSCAN Multi-Line Cell Merge — Block 1d
// Merges oversegmented rows in stream results where a single logical row
// was split across multiple Y-coordinates due to wrapped multi-line cells.
// Gap between consecutive Y-clusters > BETA * avgLineHeight = hard row break.
// Gap <= threshold = merge into same logical row.
// O-cost: O(R log R) where R = number of rows.
// ---------------------------------------------------------------------------
const BETA = 1.5;

function yDbscanMerge(tableResult, avgLineHeight) {
  if (!tableResult) return tableResult;
  const { rows, items } = tableResult;
  if (rows.length <= 1) return tableResult;

  const threshold = BETA * avgLineHeight;
  const merged = [rows[0]];

  for (let i = 1; i < rows.length; i++) {
    // We don't have per-row Y here, so we use row index distance as proxy.
    // Rows are already sorted top-to-bottom; if a row has content only in
    // the first column (likely a continuation), merge it into the previous row.
    const prev = merged[merged.length - 1];
    const curr = rows[i];
    const currNonEmpty = curr.filter(c => c.trim()).length;
    const prevNonEmpty = prev.filter(c => c.trim()).length;

    // Merge heuristic: current row has fewer filled cells than column count
    // AND previous row has at least one empty cell in same position
    const shouldMerge = currNonEmpty < curr.length &&
      curr.some((cell, idx) => cell.trim() && !prev[idx]?.trim());

    if (shouldMerge) {
      // Merge: fill empty cells from prev with content from curr
      for (let c = 0; c < curr.length; c++) {
        if (curr[c].trim() && !prev[c]?.trim()) {
          prev[c] = curr[c];
        } else if (curr[c].trim() && prev[c]?.trim()) {
          prev[c] = prev[c] + ' ' + curr[c];
        }
      }
    } else {
      merged.push(curr);
    }
  }

  return { rows: merged, items };
}

// ---------------------------------------------------------------------------
// BLUEPRINT: Table Scorer — Block 1c
// Scores a table result on 3 deterministic checks.
// Higher score = more reliable extraction.
// ---------------------------------------------------------------------------
function scoreTable(result) {
  if (!result || result.rows.length < 2) return 0;
  const { rows } = result;
  let score = 0;

  // Check 1: Header match strength
  // Row[0] should contain non-numeric, non-empty strings
  const headerCells = rows[0].filter(c => c.trim() && isNaN(parseFloat(c)));
  score += headerCells.length;

  // Check 2: Numeric parse rate per column
  // A "data" column (after header) scoring >= 95% numeric gets +2
  const numCols = rows[0].length;
  for (let c = 0; c < numCols; c++) {
    const dataCells = rows.slice(1).map(r => r[c] ?? '');
    const nonEmpty = dataCells.filter(v => v.trim());
    if (nonEmpty.length === 0) continue;
    const numericCount = nonEmpty.filter(v => !isNaN(parseFloat(v.replace(/[,$%]/g, ''))));
    if (numericCount.length / nonEmpty.length >= 0.95) score += 2;
  }

  // Check 3: Row count plausibility
  if (rows.length >= 2) score += 1;
  if (rows.length >= 4) score += 1; // bonus for substantial table

  return score;
}

// ---------------------------------------------------------------------------
// GFM Table Renderer
// ---------------------------------------------------------------------------
function tableToMarkdown(rows) {
  if (!rows || rows.length === 0) return '';

  const numCols = Math.max(...rows.map(r => r.length));

  // Normalise all rows to same column count
  const normalized = rows.map(r => {
    const padded = [...r];
    while (padded.length < numCols) padded.push('');
    return padded;
  });

  const escape = (s) => s.replace(/\|/g, '\\|').trim();

  const header = '| ' + normalized[0].map(escape).join(' | ') + ' |';
  const divider = '| ' + normalized[0].map(() => '---').join(' | ') + ' |';
  const dataRows = normalized.slice(1).map(r => '| ' + r.map(escape).join(' | ') + ' |');

  return [header, divider, ...dataRows].join('\n');
}

// ---------------------------------------------------------------------------
// BLUEPRINT: Main Orchestrator Entry Point
// ---------------------------------------------------------------------------
/**
 * Run Stream and Lattice extractions, score both, return best result.
 *
 * @param {object[]} orderedItems  - NovaLAD-ordered snapped items
 * @param {number}   avgLineHeight - from computeAvgLineHeight()
 * @param {object}   operatorList  - from pageData.getOperatorList()
 * @returns {{
 *   tableBlocks: Array<{ markdown: string, minY: number, maxY: number, consumedItems: Set }>,
 *   remainingItems: object[]
 * }}
 */
export function extractTables(orderedItems, avgLineHeight, operatorList) {
  // Run both extractors
  const streamResults = streamExtract(orderedItems);
  const latticeResult = latticeExtract(orderedItems, operatorList);

  // Apply Y-DBSCAN merge to stream results
  const mergedStreamResults = streamResults.map(r => yDbscanMerge(r, avgLineHeight));

  // Score all candidates
  const candidates = [];

  for (const sr of mergedStreamResults) {
    const s = scoreTable(sr);
    if (s > 0) candidates.push({ result: sr, score: s, method: 'stream' });
  }

  if (latticeResult) {
    const s = scoreTable(latticeResult);
    if (s > 0) candidates.push({ result: latticeResult, score: s, method: 'lattice' });
  }

  // Sort by score descending
  candidates.sort((a, b) => b.score - a.score);

  // Build consumed set and table blocks
  const allConsumed = new Set();
  const tableBlocks = [];

  for (const { result } of candidates) {
    // Skip if items already consumed by a higher-scoring table
    const overlap = [...result.items].some(i => allConsumed.has(i));
    if (overlap) continue;

    const md = tableToMarkdown(result.rows);
    if (!md) continue;

    // Compute Y-range of this table for injection position
    const ys = [...result.items].map(i => i.transform?.[5] ?? 0);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    tableBlocks.push({ markdown: md, minY, maxY, consumedItems: result.items });
    for (const item of result.items) allConsumed.add(item);
  }

  // If nothing was extracted at all, emit low-confidence warning
  // (only if the page looked like it had table candidates to begin with)
  const hadCandidates = streamResults.length > 0 || latticeResult !== null;
  if (hadCandidates && tableBlocks.length === 0) {
    tableBlocks.push({
      markdown: '<!-- WARNING: Table Extraction Low Confidence -->',
      minY: 0,
      maxY: 0,
      consumedItems: new Set(),
    });
  }

  const remainingItems = orderedItems.filter(i => !allConsumed.has(i));

  return { tableBlocks, remainingItems };
}
