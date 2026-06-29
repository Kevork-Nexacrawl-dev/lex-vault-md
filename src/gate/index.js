// Gate Orchestrator — Phase 5
// Wires pdfmux 4-Signal Gate (signals.js) and Artifact Removal (artifacts.js).
// Entry point used by extractor.js.
//
// Usage:
//   const registry = buildHeaderFooterRegistry(pageDataList); // once, pre-scan
//   const result = runGate(textContent, operatorList, pageWidth, pageHeight, pageNumber, registry);
//   if (result.isGarbage) { store result.placeholder }
//   else { use result.cleanItems in renderPage() }

import { scoreGate } from './signals.js';
import { removeArtifacts } from './artifacts.js';

/**
 * Run the full gate pipeline for a single page.
 *
 * @param {object}   textContent          - from pageData.getTextContent()
 * @param {object}   operatorList         - from pageData.getOperatorList() or null
 * @param {number}   pageWidth            - from pageData.view[2]
 * @param {number}   pageHeight           - from pageData.view[3]
 * @param {number}   pageNumber           - 1-indexed, for placeholder message
 * @param {Set}      headerFooterRegistry - from buildHeaderFooterRegistry()
 * @returns {{
 *   isGarbage:   boolean,
 *   placeholder: string | null,
 *   cleanItems:  object[] | null,
 *   gateResult:  object
 * }}
 */
export function runGate(textContent, operatorList, pageWidth, pageHeight, pageNumber, headerFooterRegistry) {
  const items = textContent?.items ?? [];

  // Run 4-signal gate
  const gateResult = scoreGate(items, textContent, operatorList, pageWidth, pageHeight);

  if (gateResult.isGarbage) {
    return {
      isGarbage: true,
      placeholder: `<!-- Page ${pageNumber}: scanned/image-only — text extraction skipped (gate score: ${gateResult.score}/4) -->`,
      cleanItems: null,
      gateResult,
    };
  }

  // Page passed the gate — run artifact removal
  const cleanItems = removeArtifacts(items, pageWidth, pageHeight, headerFooterRegistry);

  return {
    isGarbage: false,
    placeholder: null,
    cleanItems,
    gateResult,
  };
}

export { buildHeaderFooterRegistry } from './artifacts.js';
