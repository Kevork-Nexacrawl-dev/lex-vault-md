// BLUEPRINT: Artifact Removal — Block 4c
// O(N) per page artifact stripper. Runs on pages that passed the Garbage Gate.
// Three removal passes in order:
//   1. Cross-page header/footer detection (digit-masked recurrence >= 3 pages)
//   2. Watermark detection (oversized rotated text + known watermark strings)
//   3. Margin noise stripping (far-edge items outside 3%-97% horizontal bounds)
//
// The headerFooterRegistry is built in a pre-scan pass across ALL pages
// before rendering begins, enabling cross-page recurrence detection.

// Margin thresholds
const H_MARGIN = 0.03;   // 3% from left/right edges
const V_EDGE   = 0.08;   // 8% from top/bottom = header/footer zone
const V_NOISE  = 0.03;   // 3% from top/bottom = hard noise strip zone

// Header/footer recurrence threshold: text appearing on >= N pages = repeated element
const RECURRENCE_MIN = 3;

// Watermark: font size > this fraction of pageHeight = oversized
const WATERMARK_SIZE_RATIO = 0.15;

// Known watermark strings (whole-word, case-insensitive)
const WATERMARK_STRINGS = /^(draft|confidential|sample|copy|watermark|do not copy|internal use only|proprietary)$/i;

/**
 * Mask digits in a string for cross-page comparison.
 * "Page 3 of 12" -> "Page # of ##"
 * Allows matching headers/footers that differ only in page numbers.
 */
export function digitMask(str) {
  return str.replace(/\d+/g, '#').trim();
}

/**
 * BLUEPRINT: Build Header/Footer Registry (Pre-scan Pass A)
 * Call once before rendering, passing all pages' raw items.
 * Returns a Set of digit-masked strings that appear on >= RECURRENCE_MIN pages.
 *
 * @param {Array<{ items: object[], pageWidth: number, pageHeight: number }>} pageDataList
 * @returns {Set<string>}
 */
export function buildHeaderFooterRegistry(pageDataList) {
  // Map: maskedText -> Set of page indices that contain it
  const textPageMap = new Map();

  for (let p = 0; p < pageDataList.length; p++) {
    const { items, pageHeight } = pageDataList[p];
    const edgeZoneMin = pageHeight * (1 - V_EDGE); // bottom zone in PDF coords (Y=0 is bottom)
    const edgeZoneMax = pageHeight * V_EDGE;        // top zone

    for (const item of items) {
      if (!item.str?.trim()) continue;
      const y = item.transform?.[5] ?? 0;
      // In PDF coordinates: y=0 is bottom, y=pageHeight is top
      // Header zone: y > pageHeight*(1-V_EDGE)
      // Footer zone: y < pageHeight*V_EDGE
      const inEdgeZone = y >= edgeZoneMin || y <= edgeZoneMax;
      if (!inEdgeZone) continue;

      const masked = digitMask(item.str);
      if (!masked) continue;

      if (!textPageMap.has(masked)) textPageMap.set(masked, new Set());
      textPageMap.get(masked).add(p);
    }
  }

  // Build registry: only strings appearing on >= RECURRENCE_MIN pages
  const registry = new Set();
  for (const [masked, pages] of textPageMap) {
    if (pages.size >= RECURRENCE_MIN) registry.add(masked);
  }

  return registry;
}

/**
 * BLUEPRINT: Artifact Removal
 * Removes headers, footers, watermarks, and margin noise from a page's items.
 *
 * @param {object[]} items              - snapped text items
 * @param {number}   pageWidth
 * @param {number}   pageHeight
 * @param {Set}      headerFooterRegistry - from buildHeaderFooterRegistry()
 * @returns {object[]} filtered items
 */
export function removeArtifacts(items, pageWidth, pageHeight, headerFooterRegistry) {
  const xMin = pageWidth * H_MARGIN;
  const xMax = pageWidth * (1 - H_MARGIN);
  const hardNoiseBottom = pageHeight * V_NOISE;       // y < this = hard strip
  const hardNoiseTop    = pageHeight * (1 - V_NOISE); // y > this = hard strip
  const edgeBottom      = pageHeight * V_EDGE;
  const edgeTop         = pageHeight * (1 - V_EDGE);

  return items.filter(item => {
    if (!item.str?.trim()) return false;

    const x  = item.transform?.[4] ?? 0;
    const y  = item.transform?.[5] ?? 0;
    const fs = Math.abs(item.transform?.[0] ?? 12);
    const b  = item.transform?.[1] ?? 0; // rotation component
    const c  = item.transform?.[2] ?? 0; // rotation component

    // --- Pass 1: Header/Footer removal ---
    const inEdgeZone = y >= edgeTop || y <= edgeBottom;
    if (inEdgeZone && headerFooterRegistry.size > 0) {
      const masked = digitMask(item.str);
      if (headerFooterRegistry.has(masked)) return false;
    }

    // --- Pass 2: Watermark removal ---
    // Oversized rotated text
    const isOversized = fs > pageHeight * WATERMARK_SIZE_RATIO;
    const isRotated   = Math.abs(b) > 0.1 || Math.abs(c) > 0.1;
    if (isOversized && isRotated) return false;

    // Known watermark strings (whole-word match)
    if (WATERMARK_STRINGS.test(item.str.trim())) return false;

    // --- Pass 3: Margin noise stripping ---
    // Hard strip: outside 3%-97% horizontal bounds
    if (x < xMin || x > xMax) return false;

    // Hard strip: within 3% of top/bottom AND not a known header/footer
    // (known headers/footers were handled in Pass 1; this catches single-occurrence edge noise)
    const inHardNoiseZone = y < hardNoiseBottom || y > hardNoiseTop;
    if (inHardNoiseZone) return false;

    return true;
  });
}
