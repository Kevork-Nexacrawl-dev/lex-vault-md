/**
 * [PRO-CANDIDATE] Legal document template profiles for lex-vault-md.
 *
 * Each profile is a frozen configuration object passed into applyTemplate().
 * Profiles add post-processing hints on top of the existing extraction pipeline
 * — they do NOT modify src/services/extractor.js.
 *
 * Valid profile names: 'contract' | 'deposition' | 'filing'
 * When --template is absent, resolveProfile() returns null and the pipeline
 * is byte-for-byte identical to the previous behaviour.
 */

// ── CONTRACT ────────────────────────────────────────────────────────────────
/**
 * [PRO-CANDIDATE]
 * Optimises output for transactional legal documents: agreements, leases,
 * NDAs, purchase agreements, engagement letters.
 *
 * Key transformations:
 *   - Defined-term detection: wraps "Term" in backtick spans so downstream
 *     tooling can index the contract glossary.
 *   - Signature-block detection: isolates the execution block into its own
 *     fenced section so it is never merged with the preceding paragraph.
 *   - Cross-page clause continuity: strips orphaned page-break artefacts
 *     (page numbers, running headers/footers) that interrupt mid-sentence
 *     clause text when the underlying PDF splits a paragraph across pages.
 */
const CONTRACT = Object.freeze({
  name: 'contract',

  // Regex: defined term — quoted word/phrase in title-case inside quotes
  // Matches: "Effective Date", "Confidential Information", "Affiliate"
  definedTermPattern: /"([A-Z][A-Za-z0-9 \-]{1,60})"/g,

  // Regex: signature block — lines beginning with a signature cue
  // Covers: "IN WITNESS WHEREOF", "AGREED AND ACCEPTED", "EXECUTED AS OF",
  //         "SIGNATURE:", "By: ___", "Name: ___", "Title: ___", "Date: ___"
  signatureBlockPattern:
    /^(IN\s+WITNESS\s+WHEREOF|AGREED\s+AND\s+ACCEPTED|EXECUTED\s+AS\s+OF|SIGNATURE[:\s]|By[:\s]+_{2,}|Name[:\s]+_{2,}|Title[:\s]+|Date[:\s]+_{2,})/im,

  // Regex: running-header/footer artefacts to strip before joining pages
  // Covers: standalone page numbers, "CONFIDENTIAL" watermarks, firm names
  // printed in the margin that appear as isolated lines between paragraphs.
  orphanLinePattern: /^(\d{1,4}|CONFIDENTIAL|DRAFT|\[SIGNATURE\s+PAGE\s+FOLLOWS\]|\[REMAINDER\s+OF\s+PAGE\s+INTENTIONALLY\s+LEFT\s+BLANK\])\s*$/im,

  // When true, cross-page paragraph joins are attempted: if a page ends
  // without a sentence-terminating character (. ! ?) the first line of the
  // next page is joined with a space rather than a blank line.
  joinCrossPageParagraphs: true,

  // Markdown fence used around the detected signature block
  signatureBlockFence: '```signature-block',
});

// ── DEPOSITION ───────────────────────────────────────────────────────────────
/**
 * [PRO-CANDIDATE]
 * Optimises output for deposition transcripts and court-reporter files.
 *
 * Key transformations:
 *   - Q&A structure: lines beginning with Q. or A. are reformatted as
 *     blockquotes with a speaker label so the dialogue reads cleanly.
 *   - Exhibit markers: "Exhibit [A-Z0-9]" and "Deposition Exhibit" references
 *     are wrapped in a span annotation for downstream citation linking.
 *   - Page/line number preservation: the page:line header (e.g. "5   1") that
 *     court reporters emit is retained and formatted as a code-span annotation
 *     rather than being merged into the prose body.
 */
const DEPOSITION = Object.freeze({
  name: 'deposition',

  // Regex: Q&A speaker turns — matches leading Q. or A. at line start
  qaTurnPattern: /^([QA])\s*[.:]\s+(.+)$/gm,

  // Regex: exhibit marker references
  // Matches: "Exhibit A", "Exhibit 12", "Deposition Exhibit 3",
  //          "(Exhibit A was marked)"
  exhibitPattern:
    /\b((?:Deposition\s+)?Exhibit\s+(?:[A-Z]|\d{1,3}))\b/g,

  // Regex: court-reporter page/line annotation
  // Matches lines of the form: "  4   15" (page 4, line 15)
  // These appear as isolated numeric pairs at the left margin.
  pageLinePattern: /^\s*(\d{1,4})\s{2,}(\d{1,2})\s*$/gm,

  // Markdown prefix for Q turns
  qPrefix: '> **Q:** ',
  // Markdown prefix for A turns
  aPrefix: '> **A:** ',

  // Template literal for exhibit annotation
  // %s is replaced by the matched exhibit reference string
  exhibitTemplate: '`[EXHIBIT: %s]`',

  // Template literal for page/line annotation
  // %p = page number, %l = line number
  pageLineTemplate: '<!-- p%p:l%l -->',

  // When true, cross-page paragraph joins are NOT attempted for depositions
  // because line-break positions are semantically meaningful in transcripts.
  joinCrossPageParagraphs: false,
});

// ── FILING ───────────────────────────────────────────────────────────────────
/**
 * [PRO-CANDIDATE]
 * Optimises output for court filings, pleadings, motions, and briefs.
 *
 * Key transformations:
 *   - Caption/pleading-frame detection: the case caption block at the top of
 *     the first page is isolated into a fenced section so it is never merged
 *     with the body argument text.
 *   - Numbered paragraph handling: paragraphs beginning with a number and
 *     period ("1. The defendant...") are preserved as ordered-list items in
 *     Markdown rather than being reflowed as prose.
 *   - Exhibit index: "EXHIBIT INDEX" or "INDEX OF EXHIBITS" sections are
 *     detected and wrapped in a fenced block for downstream parsing.
 */
const FILING = Object.freeze({
  name: 'filing',

  // Regex: caption block cue — the first page typically begins with
  // "IN THE [COURT] OF [STATE]", "UNITED STATES DISTRICT COURT", etc.
  captionStartPattern:
    /^(IN\s+THE\s+(?:SUPERIOR|DISTRICT|CIRCUIT|SUPREME|FAMILY|PROBATE|BANKRUPTCY|UNITED\s+STATES[^\n]*)\s+COURT|BEFORE\s+THE\s+HONORABLE)/im,

  // Regex: caption block end — the block ends at the first double-ruled line
  // or at the word "Plaintiff" or "Defendant" appearing after a line of dashes.
  captionEndPattern: /^(?:[-=]{10,}|(?:Plaintiff|Defendant|Petitioner|Respondent)[,.]?)\s*$/im,

  // Regex: numbered paragraph — a line starting with an integer followed by a period
  // Matches: "1. ", "12. ", "123. "
  numberedParaPattern: /^(\d{1,3})\. (.+)$/gm,

  // Regex: exhibit index section header
  exhibitIndexPattern:
    /^(?:EXHIBIT\s+INDEX|INDEX\s+OF\s+EXHIBITS|LIST\s+OF\s+EXHIBITS)\s*$/im,

  // Markdown fence used around the detected caption block
  captionFence: '```pleading-caption',

  // Markdown fence used around the detected exhibit index block
  exhibitIndexFence: '```exhibit-index',

  // When true, cross-page paragraph joins are attempted for the body
  // argument text, but NOT within caption or exhibit-index blocks.
  joinCrossPageParagraphs: true,
});

// ── Resolver ─────────────────────────────────────────────────────────────────

const PROFILES = Object.freeze({
  contract:   CONTRACT,
  deposition: DEPOSITION,
  filing:     FILING,
});

/**
 * [PRO-CANDIDATE]
 * Returns the profile config object for the given name, or null if no
 * --template flag was passed (preserving backward-compatible behaviour).
 *
 * @param {string|undefined} name  Value of options.template, e.g. 'contract'
 * @returns {object|null}
 * @throws {Error} if name is provided but not recognised
 */
export function resolveProfile(name) {
  if (!name) return null;
  const profile = PROFILES[name.toLowerCase()];
  if (!profile) {
    throw new Error(
      `Unknown template profile "${name}". Valid values: contract, deposition, filing`
    );
  }
  return profile;
}

export { CONTRACT, DEPOSITION, FILING };
