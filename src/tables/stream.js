// BLUEPRINT: pdf2table Stream Algorithm — Block 1a
// O(N) stream-based table extractor for borderless tables.
// Steps:
//   1. Merge all items sharing the same Y into Line objects
//   2. Flag lines with >1 item as MultiLine
//   3. Cluster contiguous MultiLine blocks into candidate table regions
//   4. Apply 4-Rule Column Assigner to build a clean grid
//
// Returns: Array of { rows: string[][], items: Set<object> }
// `items` is the Set of original pdf-parse item objects consumed by this table.

/**
 * Derive the bounding box x1/x2 for a text item.
 */
function itemX(item) {
  const x1 = item.transform?.[4] ?? 0;
  const fontSize = Math.round(Math.abs(item.transform?.[0] ?? 12));
  const w = (item.width > 0) ? item.width : (item.str?.length ?? 1) * fontSize * 0.6;
  return { x1, x2: x1 + w };
}

/**
 * BLUEPRINT: 4-Rule Column Assigner
 * Assigns a text item to an existing column or creates a new one.
 * Rules applied in strict order (per pdf2table spec):
 *   1. Text completely within column bounds  [x1 >= col.x1 && x2 <= col.x2]
 *   2. Left border within column             [x1 >= col.x1 && x1 <= col.x2]
 *   3. Right border within column            [x2 >= col.x1 && x2 <= col.x2]
 *   4. Text spans completely over column     [x1 <= col.x1 && x2 >= col.x2]
 * If no rule matches -> new column instantiated.
 *
 * @param {{ x1: number, x2: number }} bbox
 * @param {Array<{ x1: number, x2: number }>} columns - existing columns (mutated)
 * @returns {number} column index assigned
 */
function assignColumn(bbox, columns) {
  for (let i = 0; i < columns.length; i++) {
    const col = columns[i];
    const r1 = bbox.x1 >= col.x1 && bbox.x2 <= col.x2; // rule 1
    const r2 = bbox.x1 >= col.x1 && bbox.x1 <= col.x2; // rule 2
    const r3 = bbox.x2 >= col.x1 && bbox.x2 <= col.x2; // rule 3
    const r4 = bbox.x1 <= col.x1 && bbox.x2 >= col.x2; // rule 4
    if (r1 || r2 || r3 || r4) {
      // Expand column bounds to accommodate this item
      col.x1 = Math.min(col.x1, bbox.x1);
      col.x2 = Math.max(col.x2, bbox.x2);
      return i;
    }
  }
  // No rule matched: new column
  columns.push({ x1: bbox.x1, x2: bbox.x2 });
  return columns.length - 1;
}

/**
 * BLUEPRINT: pdf2table Stream Extraction
 * @param {object[]} items - NovaLAD-ordered, snapped text items
 * @returns {Array<{ rows: string[][], items: Set }>}
 */
export function streamExtract(items) {
  if (items.length === 0) return [];

  // Step 1: Group items by Y coordinate into Lines
  const lineMap = new Map(); // y -> item[]
  for (const item of items) {
    if (!item.str?.trim()) continue;
    const y = item.transform?.[5] ?? 0;
    if (!lineMap.has(y)) lineMap.set(y, []);
    lineMap.get(y).push(item);
  }

  // Step 2: Sort lines top-to-bottom, flag MultiLines (>1 item)
  const lines = [...lineMap.entries()]
    .sort(([ya], [yb]) => yb - ya) // descending Y = top to bottom
    .map(([y, lineItems]) => ({
      y,
      items: lineItems.sort((a, b) => (a.transform?.[4] ?? 0) - (b.transform?.[4] ?? 0)),
      isMulti: lineItems.length > 1,
    }));

  // Step 3: Cluster contiguous MultiLine blocks
  const tables = [];
  let inTable = false;
  let currentBlock = [];

  for (const line of lines) {
    if (line.isMulti) {
      inTable = true;
      currentBlock.push(line);
    } else {
      if (inTable && currentBlock.length >= 2) {
        tables.push([...currentBlock]);
      }
      inTable = false;
      currentBlock = [];
    }
  }
  if (inTable && currentBlock.length >= 2) tables.push(currentBlock);

  if (tables.length === 0) return [];

  // Step 4: Apply 4-Rule Column Assigner to each candidate table
  const results = [];

  for (const block of tables) {
    const columns = []; // { x1, x2 }[]
    const consumedItems = new Set();

    // First pass: establish columns from all items in block
    for (const line of block) {
      for (const item of line.items) {
        assignColumn(itemX(item), columns);
      }
    }

    // Sort columns left-to-right
    columns.sort((a, b) => a.x1 - b.x1);

    // Second pass: build row grid
    const rows = [];
    for (const line of block) {
      const row = new Array(columns.length).fill('');
      for (const item of line.items) {
        const colIdx = assignColumn(itemX(item), columns);
        const safeIdx = Math.min(colIdx, columns.length - 1);
        row[safeIdx] = row[safeIdx] ? row[safeIdx] + ' ' + item.str : item.str;
        consumedItems.add(item);
      }
      rows.push(row);
    }

    if (rows.length >= 2 && columns.length >= 2) {
      results.push({ rows, items: consumedItems });
    }
  }

  return results;
}
