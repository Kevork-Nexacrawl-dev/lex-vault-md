// BLUEPRINT: PyTabby Vector Instruction Extraction — Block 1b
// Extracts bordered table grids directly from PDF drawing instructions.
// Bypasses all text-alignment guessing for tables with visible ruling lines.
//
// Steps:
//   1. Parse operator list for line/rect drawing commands (m, l, re)
//   2. Collect horizontal (deltaY≈0) and vertical (deltaX≈0) segments
//   3. Run connected-components on H+V intersections to build a cell grid
//   4. Map text item centers into grid cells
//
// Returns: { rows: string[][], items: Set } or null if no vector lines found.
// O-cost: O(L + N) where L = number of drawing operators, N = text items.

const H_TOLERANCE = 2; // px — max deltaY to consider a segment horizontal
const V_TOLERANCE = 2; // px — max deltaX to consider a segment vertical
const SNAP       = 4;  // px — snap line endpoints to grid for intersection detection

function snap(v) { return Math.round(v / SNAP) * SNAP; }

/**
 * Parse raw PDF operator list into H and V line segments.
 * Handles: m (moveto), l (lineto), re (rectangle append).
 * @param {object} operatorList - from pageData.getOperatorList()
 * @returns {{ hLines: Array, vLines: Array }}
 */
export function parseVectorLines(operatorList) {
  if (!operatorList?.fnArray) return { hLines: [], vLines: [] };

  const { fnArray, argsArray } = operatorList;
  const hLines = [];
  const vLines = [];

  let curX = 0, curY = 0;
  let pathStartX = 0, pathStartY = 0;

  for (let i = 0; i < fnArray.length; i++) {
    const fn = fnArray[i];
    const args = argsArray[i];

    // OPS reference: moveto=13, lineto=14, rectangle=91
    // (pdf.js internal op codes used by pdf-parse)
    if (fn === 13) { // moveto
      curX = args[0]; curY = args[1];
      pathStartX = curX; pathStartY = curY;
    } else if (fn === 14) { // lineto
      const x1 = curX, y1 = curY;
      const x2 = args[0], y2 = args[1];
      const dx = Math.abs(x2 - x1);
      const dy = Math.abs(y2 - y1);
      if (dy <= H_TOLERANCE && dx > 4) {
        hLines.push({ x1: snap(Math.min(x1,x2)), x2: snap(Math.max(x1,x2)), y: snap((y1+y2)/2) });
      } else if (dx <= V_TOLERANCE && dy > 4) {
        vLines.push({ y1: snap(Math.min(y1,y2)), y2: snap(Math.max(y1,y2)), x: snap((x1+x2)/2) });
      }
      curX = x2; curY = y2;
    } else if (fn === 91) { // rectangle: args = [x, y, w, h]
      const [rx, ry, rw, rh] = args;
      if (rw > 4) {
        hLines.push({ x1: snap(rx), x2: snap(rx+rw), y: snap(ry) });
        hLines.push({ x1: snap(rx), x2: snap(rx+rw), y: snap(ry+rh) });
      }
      if (rh > 4) {
        vLines.push({ y1: snap(ry), y2: snap(ry+rh), x: snap(rx) });
        vLines.push({ y1: snap(ry), y2: snap(ry+rh), x: snap(rx+rw) });
      }
    }
  }

  return { hLines, vLines };
}

/**
 * BLUEPRINT: Connected-Components Grid Builder
 * Finds all intersection points of H and V lines, deduplicates,
 * and builds sorted unique X and Y boundary arrays for the cell grid.
 * @returns {{ xs: number[], ys: number[] }} sorted grid boundaries or null
 */
function buildGrid(hLines, vLines) {
  if (hLines.length < 2 || vLines.length < 2) return null;

  const xSet = new Set();
  const ySet = new Set();

  for (const h of hLines) { xSet.add(h.x1); xSet.add(h.x2); ySet.add(h.y); }
  for (const v of vLines) { xSet.add(v.x); ySet.add(v.y1); ySet.add(v.y2); }

  const xs = [...xSet].sort((a, b) => a - b);
  const ys = [...ySet].sort((a, b) => b - a); // descending = top to bottom

  if (xs.length < 2 || ys.length < 2) return null;
  return { xs, ys };
}

/**
 * BLUEPRINT: Lattice Table Extraction
 * @param {object[]} items        - snapped, NovaLAD-ordered text items
 * @param {object}   operatorList - from pageData.getOperatorList()
 * @returns {{ rows: string[][], items: Set } | null}
 */
export function latticeExtract(items, operatorList) {
  const { hLines, vLines } = parseVectorLines(operatorList);
  const grid = buildGrid(hLines, vLines);
  if (!grid) return null;

  const { xs, ys } = grid;
  const numCols = xs.length - 1;
  const numRows = ys.length - 1;
  if (numCols < 1 || numRows < 1) return null;

  // Initialise empty grid
  const rows = Array.from({ length: numRows }, () => new Array(numCols).fill(''));
  const consumedItems = new Set();

  for (const item of items) {
    if (!item.str?.trim()) continue;
    const cx = item.transform?.[4] ?? 0;
    const cy = item.transform?.[5] ?? 0;

    // Find column: cx between xs[c] and xs[c+1]
    let col = -1;
    for (let c = 0; c < numCols; c++) {
      if (cx >= xs[c] && cx <= xs[c + 1]) { col = c; break; }
    }
    // Find row: cy between ys[r+1] and ys[r] (ys is descending)
    let row = -1;
    for (let r = 0; r < numRows; r++) {
      if (cy <= ys[r] && cy >= ys[r + 1]) { row = r; break; }
    }

    if (col >= 0 && row >= 0) {
      rows[row][col] = rows[row][col] ? rows[row][col] + ' ' + item.str : item.str;
      consumedItems.add(item);
    }
  }

  // Only return if we actually placed content
  const hasContent = rows.some(r => r.some(c => c.trim()));
  if (!hasContent) return null;

  return { rows, items: consumedItems };
}
