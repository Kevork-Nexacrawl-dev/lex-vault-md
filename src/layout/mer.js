// BLUEPRINT: Breuel's Maximal Empty Rectangles — Column Gutter Detection (Block 2b)
// Primary method for multi-column layout detection.
// Treats all text bounding boxes as obstacles and finds the largest unbroken
// whitespace rectangles on the page. Tall, narrow MERs = column gutters.
// O-cost: O(N log N) typical via sweep-line; O(N²) worst case on dense pages.
//
// Falls back to XY-Cut++ histogram projection if no gutters are found
// (handles single-column and sparse pages as a no-op returning []).

/**
 * Derive a bounding box for a text item.
 * Uses item.width if available, otherwise estimates from font size × char count.
 * @returns {{ x1, y1, x2, y2 }}
 */
function itemBBox(item) {
  const x1 = item.transform?.[4] ?? 0;
  const y1 = item.transform?.[5] ?? 0;
  const fontSize = Math.round(Math.abs(item.transform?.[0] ?? 12));
  const w = item.width > 0 ? item.width : (item.str?.length ?? 1) * fontSize * 0.6;
  const h = item.height > 0 ? item.height : fontSize;
  return { x1, y1: y1 - h, x2: x1 + w, y2: y1 };
}

/**
 * BLUEPRINT: XY-Cut++ Histogram Fallback
 * Projects all text X-coords into a histogram, finds whitespace gaps wider than
 * the median gap. Used when MER finds zero gutters (single-column pages).
 * O-cost: O(N log N)
 * @param {object[]} items - snapped text items
 * @param {number} pageWidth
 * @returns {Array<{x1: number, x2: number}>} synthetic gutter boundaries
 */
function xycutFallback(items, pageWidth) {
  if (items.length === 0) return [];

  // Build an occupancy bitmap at 1px resolution
  const occupied = new Uint8Array(Math.ceil(pageWidth) + 1);
  for (const item of items) {
    if (!item.str?.trim()) continue;
    const { x1, x2 } = itemBBox(item);
    const lo = Math.max(0, Math.floor(x1));
    const hi = Math.min(occupied.length - 1, Math.ceil(x2));
    for (let x = lo; x <= hi; x++) occupied[x] = 1;
  }

  // Collect whitespace runs
  const gaps = [];
  let gapStart = -1;
  for (let x = 0; x < occupied.length; x++) {
    if (occupied[x] === 0 && gapStart === -1) gapStart = x;
    else if (occupied[x] === 1 && gapStart !== -1) {
      gaps.push({ x1: gapStart, x2: x - 1, width: x - gapStart });
      gapStart = -1;
    }
  }

  if (gaps.length === 0) return [];

  // Keep only gaps wider than the median gap width
  const widths = gaps.map(g => g.width).sort((a, b) => a - b);
  const medianWidth = widths[Math.floor(widths.length / 2)];
  const minGutterWidth = Math.max(medianWidth, 8); // at least 8px

  return gaps
    .filter(g => g.width >= minGutterWidth)
    .map(({ x1, x2 }) => ({ x1, x2 }));
}

/**
 * BLUEPRINT: Breuel's Maximal Empty Rectangles (Primary)
 * Sweep-line approach: for each unique Y-coordinate boundary, project obstacles
 * onto X-axis, find maximal horizontal whitespace spans. Rank by area and height.
 * Gutters must be taller than 30% of page height and narrower than 15% of page width.
 *
 * @param {object[]} items  - snapped text items (after snapToGrid)
 * @param {number} pageWidth
 * @param {number} pageHeight
 * @returns {Array<{x1: number, x2: number}>} gutter boundaries, sorted left-to-right
 */
export function detectColumnGutters(items, pageWidth, pageHeight) {
  const textItems = items.filter(i => i.str?.trim());
  if (textItems.length < 4) return []; // too sparse to have columns

  const minGutterHeight = pageHeight * 0.30;
  const maxGutterWidth  = pageWidth  * 0.15;
  const minGutterWidth  = 6; // px — ignore hairline gaps

  // Collect all unique Y boundaries from bboxes
  const yBounds = new Set();
  const bboxes = textItems.map(item => {
    const bb = itemBBox(item);
    yBounds.add(bb.y1);
    yBounds.add(bb.y2);
    return bb;
  });
  const yLevels = [...yBounds].sort((a, b) => a - b);

  // Track the best whitespace spans across all Y-slices
  // Key: "x1-x2", value: { x1, x2, minY, maxY }
  const spans = new Map();

  for (let yi = 0; yi < yLevels.length - 1; yi++) {
    const sliceY1 = yLevels[yi];
    const sliceY2 = yLevels[yi + 1];
    const sliceMid = (sliceY1 + sliceY2) / 2;

    // Build occupancy for this Y-slice
    const occupied = new Uint8Array(Math.ceil(pageWidth) + 1);
    for (const bb of bboxes) {
      if (bb.y1 <= sliceMid && bb.y2 >= sliceMid) {
        const lo = Math.max(0, Math.floor(bb.x1));
        const hi = Math.min(occupied.length - 1, Math.ceil(bb.x2));
        for (let x = lo; x <= hi; x++) occupied[x] = 1;
      }
    }

    // Find whitespace runs in this slice
    let runStart = -1;
    for (let x = 0; x <= occupied.length; x++) {
      const val = x < occupied.length ? occupied[x] : 1;
      if (val === 0 && runStart === -1) {
        runStart = x;
      } else if (val === 1 && runStart !== -1) {
        const runWidth = x - runStart;
        if (runWidth >= minGutterWidth && runWidth <= maxGutterWidth) {
          const key = `${runStart}-${x - 1}`;
          if (!spans.has(key)) {
            spans.set(key, { x1: runStart, x2: x - 1, minY: sliceY1, maxY: sliceY2 });
          } else {
            spans.get(key).maxY = sliceY2; // extend downward
          }
        }
        runStart = -1;
      }
    }
  }

  // Filter: only spans tall enough to be real gutters
  const gutters = [];
  for (const span of spans.values()) {
    if ((span.maxY - span.minY) >= minGutterHeight) {
      gutters.push({ x1: span.x1, x2: span.x2 });
    }
  }

  // If MER found nothing, fall back to XY-Cut++ histogram
  if (gutters.length === 0) {
    return xycutFallback(textItems, pageWidth);
  }

  return gutters.sort((a, b) => a.x1 - b.x1);
}
