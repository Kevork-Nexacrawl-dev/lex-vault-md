// BLUEPRINT: pdfmux 4-Signal Gate — Block 3a
// O(1) per page garbage/scanned-PDF detector.
// Four independent signals scored per page. Any page firing >= GATE_THRESHOLD
// signals is classified as garbage and bypasses the full pipeline.
//
// Signals:
//   1. Text Density      — near-zero embedded text -> scanned
//   2. Image Coverage    — large image area relative to page -> scanned
//   3. Missing Embedded Font — no subset-embedded fonts -> CID/Type3 garbage
//   4. CID Alpha Ratio   — low alphanumeric character ratio -> CID garbage
//
// Returns: { isGarbage: boolean, score: number, signals: object }

const GATE_THRESHOLD = 2; // fires on >= 2 signals

// Signal 1: Text Density
// itemCount / (pageArea / 1000). Scanned pages have near-zero embedded text.
const TEXT_DENSITY_MIN = 0.05;

// Signal 2: Image Coverage
// totalImageArea / pageArea. > 35% = image-heavy page.
const IMAGE_COVERAGE_MAX = 0.35;

// Signal 4: CID Alpha Ratio
// alphanumericChars / totalChars. < 60% = CID garbage.
const ALPHA_RATIO_MIN = 0.6;

/**
 * Signal 1: Text Density
 * @param {object[]} items
 * @param {number} pageWidth
 * @param {number} pageHeight
 * @returns {boolean} true = signal fires (garbage indicator)
 */
function signalTextDensity(items, pageWidth, pageHeight) {
  const itemCount = items.filter(i => i.str?.trim()).length;
  const pageArea = (pageWidth * pageHeight) / 1000;
  if (pageArea <= 0) return false;
  const density = itemCount / pageArea;
  return density < TEXT_DENSITY_MIN;
}

/**
 * Signal 2: Image Coverage
 * Parses operator list for paintImageXObject (fn=85) and paintJpegImageXObject (fn=82).
 * Uses the current transform matrix scale components to estimate rendered area.
 * @param {object} operatorList
 * @param {number} pageWidth
 * @param {number} pageHeight
 * @returns {boolean}
 */
function signalImageCoverage(operatorList, pageWidth, pageHeight) {
  if (!operatorList?.fnArray) return false;
  const pageArea = pageWidth * pageHeight;
  if (pageArea <= 0) return false;

  const { fnArray, argsArray } = operatorList;
  let totalImageArea = 0;

  // Track current transform matrix [a,b,c,d,e,f] for image size estimation
  // We look for 'cm' (setTransformMatrix = fn 12) before paint image ops
  let matrix = [1, 0, 0, 1, 0, 0];

  for (let i = 0; i < fnArray.length; i++) {
    const fn = fnArray[i];
    if (fn === 12) { // cm — concat transform matrix
      matrix = argsArray[i];
    } else if (fn === 85 || fn === 82) { // paintImageXObject / paintJpegImageXObject
      // Matrix [a,b,c,d,e,f]: image rendered width = |a|, height = |d|
      const w = Math.abs(matrix[0]);
      const h = Math.abs(matrix[3]);
      if (w > 0 && h > 0) totalImageArea += w * h;
    }
  }

  const coverage = totalImageArea / pageArea;
  return coverage > IMAGE_COVERAGE_MAX;
}

/**
 * Signal 3: Missing Embedded Font
 * Checks textContent.styles for proper subset-embedded font names.
 * Subset fonts have a 6-letter prefix: "ABCDEF+FontName".
 * CID/Type3 fonts or missing fonts are garbage indicators.
 * @param {object} textContent - from getTextContent()
 * @returns {boolean}
 */
function signalMissingEmbeddedFont(textContent) {
  const styles = textContent?.styles;
  if (!styles) return true; // no style info = suspicious

  const fontNames = Object.keys(styles);
  if (fontNames.length === 0) return true;

  // Check if ANY font has a proper embedded subset prefix (XXXXXX+FontName)
  const hasEmbedded = fontNames.some(name => /^[A-Z]{6}\+/.test(name));
  if (hasEmbedded) return false;

  // Check for known garbage font types
  const hasGarbageFont = fontNames.every(name =>
    /cid/i.test(name) ||
    /type3/i.test(name) ||
    /f\d+/i.test(name) || // generic "F1", "F2" placeholders
    name.trim() === ''
  );

  return hasGarbageFont;
}

/**
 * Signal 4: CID Alphanumeric Ratio
 * Low ratio of alphanumeric chars to total chars = CID-mapped garbage.
 * @param {object[]} items
 * @returns {boolean}
 */
function signalCIDAlphaRatio(items) {
  let total = 0;
  let alpha = 0;

  for (const item of items) {
    const str = item.str ?? '';
    total += str.length;
    for (const ch of str) {
      if (/[A-Za-z0-9 ]/.test(ch)) alpha++;
    }
  }

  if (total < 10) return false; // not enough data to judge
  return (alpha / total) < ALPHA_RATIO_MIN;
}

/**
 * BLUEPRINT: pdfmux Gate Scorer
 * Runs all 4 signals and returns gate result.
 *
 * @param {object[]} items        - raw text items
 * @param {object}   textContent  - full getTextContent() result
 * @param {object}   operatorList - getOperatorList() result or null
 * @param {number}   pageWidth
 * @param {number}   pageHeight
 * @returns {{ isGarbage: boolean, score: number, signals: object }}
 */
export function scoreGate(items, textContent, operatorList, pageWidth, pageHeight) {
  const s1 = signalTextDensity(items, pageWidth, pageHeight);
  const s2 = signalImageCoverage(operatorList, pageWidth, pageHeight);
  const s3 = signalMissingEmbeddedFont(textContent);
  const s4 = signalCIDAlphaRatio(items);

  const score = [s1, s2, s3, s4].filter(Boolean).length;

  return {
    isGarbage: score >= GATE_THRESHOLD,
    score,
    signals: {
      textDensity: s1,
      imageCoverage: s2,
      missingEmbeddedFont: s3,
      cidAlphaRatio: s4,
    },
  };
}
