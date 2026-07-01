// [CORE-BSL] JSON output formatter — part of the open core.
// Converts the pages[] string array produced by extractPDF() into the
// canonical LexVaultMD JSON schema. Post-processes the Markdown text that
// formatMarkdown() already produces, so extractor.js is never touched.

/**
 * Build the structured JSON output object from the pages array.
 *
 * Schema:
 * {
 *   metadata : { source, extractedAt, pageCount, charCount },
 *   pages    : [ { page: Number, text: String } ],
 *   headings : [ { page: Number, level: Number, text: String } ],
 *   tables   : [ { page: Number, raw: String } ]
 * }
 *
 * @param {string[]} pages   - Per-page text strings from extractPDF()
 * @param {string}   source  - Source filename or URL
 * @param {Date}     [timestamp]
 * @returns {object}
 */
export function formatJSON(pages, source = '', timestamp = new Date()) {
  const headings = [];
  const tables   = [];

  const pageObjects = pages.map((text, i) => {
    const pageNum = i + 1;

    // ── Heading extraction ────────────────────────────────────────────────
    // Match ATX-style headings: # through ######
    const headingRe = /^(#{1,6})\s+(.+)$/gm;
    let m;
    while ((m = headingRe.exec(text)) !== null) {
      headings.push({
        page : pageNum,
        level: m[1].length,
        text : m[2].trim(),
      });
    }

    // ── Table extraction ─────────────────────────────────────────────────
    // Capture GFM pipe-tables: two or more consecutive lines containing `|`
    // separated only by whitespace/pipe/dash rows.
    const tableRe = /(?:^\|.+\|\s*\n)+(?:\|[-| :]+\|\s*\n)?(?:^\|.+\|\s*\n)*/gm;
    let t;
    while ((t = tableRe.exec(text)) !== null) {
      const raw = t[0].trim();
      if (raw.length > 0) {
        tables.push({ page: pageNum, raw });
      }
    }

    return { page: pageNum, text };
  });

  const fullText  = pages.join('');
  const charCount = fullText.length;

  return {
    metadata: {
      source      : source || 'unknown',
      extractedAt : timestamp.toISOString(),
      pageCount   : pages.length,
      charCount,
    },
    pages   : pageObjects,
    headings,
    tables,
  };
}

/**
 * Derives a .json output filename from the source string.
 * e.g. 'report.pdf'  → 'report.json'
 *      'https://example.com/paper.pdf' → 'paper.json'
 */
export function deriveJsonFilename(source) {
  try {
    const url  = new URL(source);
    const base = url.pathname.split('/').pop();
    return base.replace(/\.pdf$/i, '.json') || 'output.json';
  } catch {
    const base = source.split(/[\\/]/).pop();
    return base.replace(/\.pdf$/i, '.json') || 'output.json';
  }
}
