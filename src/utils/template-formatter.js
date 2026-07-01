/**
 * [PRO-CANDIDATE] Template-profile post-processor for lex-vault-md.
 *
 * applyTemplate(pages, profile) receives the pages[] string array that
 * extractPDF() returns and applies profile-specific text transformations.
 * It returns a new pages[] array — the original is never mutated.
 *
 * This function is the ONLY place template logic lives. It is called:
 *   - AFTER extractPDF()
 *   - AFTER applyOCRFallback() (if --ocr is active)
 *   - BEFORE formatMarkdown() / formatJSON()
 *
 * When profile is null (--template absent) the function is never called;
 * all output remains byte-for-byte identical to previous behaviour.
 */

/**
 * [PRO-CANDIDATE]
 * Apply a template profile's post-processing to the extracted pages array.
 *
 * @param {string[]} pages   Array of per-page text strings from extractPDF()
 * @param {object}   profile A frozen profile object from template-profiles.js
 * @returns {string[]}       New pages array with profile transformations applied
 */
export function applyTemplate(pages, profile) {
  if (!profile || !pages || pages.length === 0) return pages;

  switch (profile.name) {
    case 'contract':   return applyContractProfile(pages, profile);
    case 'deposition': return applyDepositionProfile(pages, profile);
    case 'filing':     return applyFilingProfile(pages, profile);
    default:           return pages;
  }
}

// ── CONTRACT ─────────────────────────────────────────────────────────────────

function applyContractProfile(pages, profile) {
  // Step 1: cross-page paragraph join pass
  let joined = profile.joinCrossPageParagraphs
    ? joinCrossPageParagraphs(pages, profile)
    : pages.slice();

  // Step 2: per-page transformations
  return joined.map(pageText => {
    let text = pageText;

    // Strip orphan lines (page numbers, watermarks, running headers)
    text = text.replace(profile.orphanLinePattern, '');

    // Annotate defined terms: "Effective Date" → `"Effective Date"`
    text = text.replace(profile.definedTermPattern, (match, term) => `\`"${term}"\``);

    // Detect and fence signature block
    text = fenceSignatureBlock(text, profile);

    return text.trim();
  });
}

/**
 * Fence the signature/execution block in a contract page.
 * Looks for the first line matching the signature-block pattern; everything
 * from that line to end-of-page is wrapped in the configured fence.
 */
function fenceSignatureBlock(pageText, profile) {
  const lines = pageText.split('\n');
  const sigIdx = lines.findIndex(line => profile.signatureBlockPattern.test(line));
  if (sigIdx === -1) return pageText;

  const body = lines.slice(0, sigIdx).join('\n');
  const block = lines.slice(sigIdx).join('\n');
  return `${body}\n\n${profile.signatureBlockFence}\n${block}\n\`\`\``;
}

// ── DEPOSITION ───────────────────────────────────────────────────────────────

function applyDepositionProfile(pages, profile) {
  // Depositions: do NOT join cross-page paragraphs (line positions matter)
  return pages.map(pageText => {
    let text = pageText;

    // Format page/line annotations before Q&A so line numbers don't interfere
    text = text.replace(profile.pageLinePattern, (_, pg, ln) =>
      profile.pageLineTemplate.replace('%p', pg).replace('%l', ln)
    );

    // Format Q&A turns
    text = text.replace(profile.qaTurnPattern, (_, speaker, content) => {
      const prefix = speaker === 'Q' ? profile.qPrefix : profile.aPrefix;
      return `${prefix}${content}`;
    });

    // Annotate exhibit references
    text = text.replace(profile.exhibitPattern, (_, ref) =>
      profile.exhibitTemplate.replace('%s', ref)
    );

    return text.trim();
  });
}

// ── FILING ────────────────────────────────────────────────────────────────────

function applyFilingProfile(pages, profile) {
  // Step 1: cross-page paragraph join for body text
  let joined = profile.joinCrossPageParagraphs
    ? joinCrossPageParagraphs(pages, profile)
    : pages.slice();

  // Step 2: per-page transformations
  return joined.map((pageText, pageIndex) => {
    let text = pageText;

    // Detect and fence case caption (first page only — captions are page 1)
    if (pageIndex === 0) {
      text = fenceCaptionBlock(text, profile);
    }

    // Detect and fence exhibit index wherever it appears
    text = fenceExhibitIndex(text, profile);

    // Convert numbered paragraphs to Markdown ordered list items
    // "1. The defendant..." → "1. The defendant..."
    // (Already valid Markdown ordered list syntax — we just ensure clean spacing)
    text = text.replace(profile.numberedParaPattern, (_, num, content) =>
      `${num}. ${content.trim()}`
    );

    return text.trim();
  });
}

/**
 * Fence the caption/pleading-frame block on page 1 of a filing.
 */
function fenceCaptionBlock(pageText, profile) {
  const captionStartMatch = profile.captionStartPattern.exec(pageText);
  if (!captionStartMatch) return pageText;

  const startIdx = captionStartMatch.index;

  // Find where the caption ends
  const afterCaption = pageText.slice(startIdx);
  const captionEndMatch = profile.captionEndPattern.exec(afterCaption);
  const endIdx = captionEndMatch
    ? startIdx + captionEndMatch.index + captionEndMatch[0].length
    : startIdx + 600; // Fallback: cap at 600 chars if no clear end found

  const before  = pageText.slice(0, startIdx).trim();
  const caption = pageText.slice(startIdx, endIdx).trim();
  const after   = pageText.slice(endIdx).trim();

  const parts = [];
  if (before)  parts.push(before);
  parts.push(`${profile.captionFence}\n${caption}\n\`\`\``);
  if (after)   parts.push(after);

  return parts.join('\n\n');
}

/**
 * Fence an exhibit index section wherever it appears in a filing page.
 */
function fenceExhibitIndex(pageText, profile) {
  const match = profile.exhibitIndexPattern.exec(pageText);
  if (!match) return pageText;

  const startIdx = match.index;
  const before   = pageText.slice(0, startIdx).trim();
  const block    = pageText.slice(startIdx).trim();

  const parts = [];
  if (before) parts.push(before);
  parts.push(`${profile.exhibitIndexFence}\n${block}\n\`\`\``);

  return parts.join('\n\n');
}

// ── Shared utility ────────────────────────────────────────────────────────────

/**
 * Attempt to join cross-page paragraph continuations.
 *
 * Heuristic: if a page ends without a sentence-terminating punctuation
 * character (. ! ? : ; or a closing quote/paren), treat the break as a
 * mid-paragraph split and join the first line of the next page with a
 * space rather than preserving the blank-line separator.
 *
 * This is a conservative heuristic — it only fires when the last
 * non-whitespace character is clearly mid-sentence.
 */
function joinCrossPageParagraphs(pages, _profile) {
  const result = [pages[0]];

  for (let i = 1; i < pages.length; i++) {
    const prev = result[result.length - 1];
    const curr = pages[i];

    // Find last non-whitespace character of previous page
    const trimmedPrev = prev.trimEnd();
    const lastChar = trimmedPrev[trimmedPrev.length - 1];

    const sentenceEnders = new Set(['.', '!', '?', ':', ';', ')', '"', "'", '\u201d', '\u2019']);

    if (lastChar && !sentenceEnders.has(lastChar)) {
      // Mid-sentence page break: join with a space
      // Split current page into first line and rest
      const newlineIdx = curr.indexOf('\n');
      if (newlineIdx === -1) {
        // Single-line page — just join entirely
        result[result.length - 1] = `${trimmedPrev} ${curr.trim()}`;
      } else {
        const firstLine = curr.slice(0, newlineIdx).trim();
        const rest      = curr.slice(newlineIdx).trimStart();
        result[result.length - 1] = `${trimmedPrev} ${firstLine}`;
        result.push(rest);
      }
    } else {
      result.push(curr);
    }
  }

  return result;
}
