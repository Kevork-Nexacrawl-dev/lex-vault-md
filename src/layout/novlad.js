// BLUEPRINT: NovaLAD Midpoint + Angle Sort — Reading Order (Block 2a)
// Ensures correct top-to-bottom, left-to-right reading order for ALL layouts
// including multi-column, before any heading/list regex parsers run.
//
// Algorithm:
//   1. Compute x_center and y_center for every text item
//   2. Assign each item to a column using MER gutter boundaries as hard walls
//   3. Sort: primary = column index (L→R), secondary = -y_center (top→bottom)
//   4. 50° angle check: for adjacent items in the same column, if the angle
//      between them is ≥50°, force a swap to fix horizontally mis-sorted pairs
//
// O-cost: O(N log N) for sort; O(N) for column assignment and angle sweep.
// MUST run after Snap-to-Grid and MER, BEFORE all heading/list regex.

/**
 * Assign a column index to an item based on MER gutter boundaries.
 * Gutters are { x1, x2 } regions of whitespace — text cannot cross them.
 * @param {number} xCenter - snapped x_center of item
 * @param {Array<{x1: number, x2: number}>} gutters - sorted left-to-right
 * @returns {number} column index (0 = leftmost)
 */
function assignColumn(xCenter, gutters) {
  let col = 0;
  for (const gutter of gutters) {
    if (xCenter > gutter.x2) col++;
    else break;
  }
  return col;
}

/**
 * Compute the center X of an item.
 * Uses item.width if valid, falls back to font-size estimate.
 */
function xCenter(item) {
  const x1 = item.transform?.[4] ?? 0;
  const fontSize = Math.round(Math.abs(item.transform?.[0] ?? 12));
  const w = (item.width > 0) ? item.width : (item.str?.length ?? 1) * fontSize * 0.6;
  return x1 + w / 2;
}

/**
 * BLUEPRINT: NovaLAD Sort
 * @param {object[]} items   - snapped text items
 * @param {Array<{x1,x2}>} gutters - from detectColumnGutters(), may be []
 * @returns {object[]} items sorted in correct reading order
 */
export function novaLADSort(items, gutters) {
  if (items.length === 0) return items;

  // -- Step 1: Annotate each item with column index and centers
  const annotated = items.map(item => ({
    item,
    col: assignColumn(xCenter(item), gutters),
    xc:  xCenter(item),
    yc:  item.transform?.[5] ?? 0,
  }));

  // -- Step 2: Sort by column (ASC), then by y_center (DESC = top→bottom)
  annotated.sort((a, b) => {
    if (a.col !== b.col) return a.col - b.col;
    return b.yc - a.yc;
  });

  // -- Step 3: 50° angle check within each column
  // For adjacent elements: if angle between them >= 50°, swap them.
  // This corrects horizontally adjacent elements that got sorted out of row order.
  const ANGLE_THRESHOLD = 50; // degrees
  for (let i = 0; i < annotated.length - 1; i++) {
    const curr = annotated[i];
    const next = annotated[i + 1];

    // Only check within the same column
    if (curr.col !== next.col) continue;

    const dx = next.xc - curr.xc;
    const dy = next.yc - curr.yc; // positive = next is lower on page (larger Y in PDF coords)
    const angleDeg = Math.abs(Math.atan2(Math.abs(dy), Math.abs(dx)) * (180 / Math.PI));

    if (angleDeg >= ANGLE_THRESHOLD) {
      // Force swap: next should come before curr in reading order
      annotated[i]     = next;
      annotated[i + 1] = curr;
    }
  }

  return annotated.map(a => a.item);
}
