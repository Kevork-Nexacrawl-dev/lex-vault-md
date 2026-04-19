/**
 * Takes the per-page text array from extractor and assembles final Markdown.
 * Adds:
 *   - A metadata comment header (source + timestamp)
 *   - ## Page N separators between pages
 */
export function formatMarkdown(pages, source = '', timestamp = new Date()) {
  const dateStr = timestamp.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const header = `<!-- Source: ${source || 'unknown'} | Extracted: ${dateStr} -->`;

  const body = pages
    .map((pageText, i) => {
      const pageNum = i + 1;
      const separator = `## Page ${pageNum}`;
      return `${separator}\n\n${pageText}`;
    })
    .join('\n\n---\n\n');

  return `${header}\n\n${body}\n`;
}

/**
 * Derives an output filename from the source string.
 * e.g. 'report.pdf'  → 'report.md'
 *      'https://example.com/paper.pdf' → 'paper.md'
 */
export function deriveOutputFilename(source) {
  try {
    // Try URL parsing first
    const url = new URL(source);
    const base = url.pathname.split('/').pop();
    return base.replace(/\.pdf$/i, '.md') || 'output.md';
  } catch {
    // Local path
    const base = source.split(/[\\/]/).pop();
    return base.replace(/\.pdf$/i, '.md') || 'output.md';
  }
}
