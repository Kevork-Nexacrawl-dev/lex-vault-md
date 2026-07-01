# `--template` Flag — Legal Document Profiles

## Flag Reference

| Property | Value |
|---|---|
| **Flag** | `-t, --template <profile>` |
| **Short** | `-t` |
| **Type** | `string` |
| **Default** | *(none — profile mode off; plain extraction only)* |
| **Valid values** | `contract` \| `deposition` \| `filing` |
| **Supported commands** | `local`, `web`, `batch`, `convert` (shorthand) |
| **Combinable with** | `--json`, `--ocr`, `--output`, `--clipboard` |

When `--template` is absent, every command behaves exactly as before — output is byte-for-byte identical to running without the flag.

---

## What “Default” Means

Without `--template`, LexVaultMD produces plain Markdown (or plain JSON with `--json`): the text the extractor found, in reading order, with heading levels detected from font sizes and artifact noise stripped. No document-type assumptions are applied.

Use `--template` when the document type has predictable structural patterns — defined terms in a contract, Q&A turns in a deposition, numbered paragraphs in a motion — that you want preserved or highlighted in the output.

---

## How Profiles Work

A profile is a **post-processor** that runs after PDF text extraction (and after OCR if `--ocr` is also set) but before final Markdown or JSON output. It does not change how the extraction engine works — it transforms the per-page text strings the extractor returns.

Execution order:

```
extractPDF()  →  applyOCRFallback() [if --ocr]  →  applyTemplate() [if --template]  →  formatMarkdown() or formatJSON()
```

Think of a profile as a lens: the same extraction engine, shaped for a specific document type.

---

## Profile: `contract`

Optimised for transactional legal documents: agreements, leases, NDAs, purchase agreements, and engagement letters.

### What It Changes

| Transformation | What happens |
|---|---|
| **Defined-term detection** | Quoted title-case phrases — `"Effective Date"`, `"Confidential Information"` — are wrapped in backtick spans: `` `"Effective Date"` ``. Makes defined terms grep-able and parseable for downstream contract analysis. |
| **Signature block fencing** | Lines beginning with execution cues (`IN WITNESS WHEREOF`, `By: ___`, `Name:`, `Title:`, `Date: ___`) are isolated into a fenced `signature-block` code block, separating execution mechanics from clause text. |
| **Orphan line stripping** | Standalone page numbers, `CONFIDENTIAL` watermarks, and `[SIGNATURE PAGE FOLLOWS]` markers that interrupt clause text across page boundaries are removed before the paragraph-join pass. |
| **Cross-page clause continuity** | When a page ends mid-sentence (last character is not `.`, `!`, `?`, `:`, or `;`), the first line of the following page is joined with a space rather than a blank line, restoring flowing prose across the page break. |

### Example Output Snippet

Input (two pages of an NDA, raw extraction):
```
...the "Effective Date" shall mean the date first written above.

[page 2]
CONFIDENTIAL
3
The "Receiving Party" agrees not to disclose...
```

Output with `--template contract`:
```markdown
...the `"Effective Date"` shall mean the date first written above. The `"Receiving Party"` agrees not to disclose...
```
*(Orphan `CONFIDENTIAL` watermark and page number `3` removed; cross-page clause joined.)*

Signature block output:
````markdown
```signature-block
IN WITNESS WHEREOF, the parties have executed this Agreement as of the Effective Date.

By: _______________________
Name:
Title:
Date:
```
````

### Usage

```bash
lex-vault-md local ./nda.pdf --template contract
lex-vault-md batch ./agreements/ --template contract --output ./converted/
lex-vault-md local ./nda.pdf --template contract --json
```

---

## Profile: `deposition`

Optimised for deposition transcripts and court-reporter files.

### What It Changes

| Transformation | What happens |
|---|---|
| **Q&A blockquote formatting** | Lines beginning with `Q.` or `A.` are reformatted as Markdown blockquotes with bold speaker labels. Makes Q&A turns visually distinct and easy to parse programmatically. |
| **Exhibit marker annotation** | References to `Exhibit A`, `Exhibit 12`, `Deposition Exhibit 3` are wrapped in a code-span annotation: `` `[EXHIBIT: Exhibit A]` ``. Makes exhibit citations grep-able and linkable. |
| **Page/line number preservation** | Court-reporter page-and-line headers (e.g., `4   15` meaning page 4, line 15) are preserved as invisible HTML comment annotations (`<!-- p4:l15 -->`) rather than merged into prose. Transcript accuracy for citation purposes is preserved. |
| **No cross-page joins** | Line-break positions are semantically meaningful in transcripts. Pages are never joined. |

### Example Output Snippet

Input (raw extraction of a deposition page):
```
4   15
Q. When did you first become aware of the agreement?
A. Sometime in March of last year.
Q. Did you review it before signing?
```

Output with `--template deposition`:
```markdown
<!-- p4:l15 -->
> **Q:** When did you first become aware of the agreement?
> **A:** Sometime in March of last year.
> **Q:** Did you review it before signing?
```

### Usage

```bash
lex-vault-md local ./deposition-smith.pdf --template deposition
lex-vault-md batch ./depositions/ --template deposition
lex-vault-md local ./deposition-smith.pdf --template deposition --json
```

---

## Profile: `filing`

Optimised for court filings, pleadings, motions, and briefs.

### What It Changes

| Transformation | What happens |
|---|---|
| **Caption/pleading-frame detection** | The case caption on the first page (`IN THE SUPERIOR COURT OF…`, `UNITED STATES DISTRICT COURT…`, etc.) is isolated into a fenced `pleading-caption` block, separating caption boilerplate from argument text. |
| **Numbered paragraph handling** | Lines beginning with `1.`, `12.`, `123.` are preserved as Markdown ordered-list items with clean spacing, rather than being reflowed as run-on prose. |
| **Exhibit index fencing** | An `EXHIBIT INDEX` or `INDEX OF EXHIBITS` section is detected wherever it appears and wrapped in a fenced `exhibit-index` block. |
| **Cross-page paragraph joins** | Applied to body argument text (not within caption or exhibit-index fences), restoring flowing prose across page breaks. |

### Example Output Snippet

Caption block output:
````markdown
```pleading-caption
IN THE SUPERIOR COURT OF THE STATE OF CALIFORNIA
FOR THE COUNTY OF LOS ANGELES

ACME CORP., Plaintiff,
vs.
WIDGET INC., Defendant.

Case No. 26-CV-001234
```
````

Numbered paragraph output:
```markdown
1. Plaintiff ACME Corp. is a Delaware corporation with its principal place of business in Los Angeles, California.
2. Defendant Widget Inc. is incorporated in Nevada and does business in this judicial district.
```

Exhibit index output:
````markdown
```exhibit-index
EXHIBIT INDEX
Exhibit A — Lease Agreement dated January 1, 2024
Exhibit B — Email Correspondence, March 2024
Exhibit C — Financial Statements Q1 2024
```
````

### Usage

```bash
lex-vault-md local ./motion-to-dismiss.pdf --template filing
lex-vault-md batch ./case-files/ --template filing --output ./converted/
lex-vault-md web https://example.com/brief.pdf --template filing --json
```

---

## Combining Flags

`--template` composes with `--ocr` and `--json`:

```bash
# Scanned deposition transcript — OCR first, then Q&A formatting
lex-vault-md local ./depo-scanned.pdf --ocr --template deposition

# Contract with defined-term annotations, output as structured JSON
lex-vault-md local ./agreement.pdf --template contract --json

# Batch entire filing folder, parallel processing
lex-vault-md batch ./filings/ --template filing --output ./converted/

# Scanned motion — OCR + filing profile + JSON for downstream pipeline
lex-vault-md local ./motion.pdf --ocr --template filing --json
```

When `--template` and `--json` are combined, the `metadata` object in the JSON output includes a `profile` field:

```json
{
  "metadata": {
    "source": "agreement.pdf",
    "extracted": "2026-07-01T21:00:00.000Z",
    "pages": 8,
    "chars": 14302,
    "profile": "contract"
  },
  "pages": [ ... ],
  "headings": [ ... ],
  "tables": []
}
```

---

## Error Handling

| Situation | Behaviour |
|---|---|
| Unknown profile name | Hard error before extraction begins: `Unknown template profile "xyz". Valid values: contract, deposition, filing` |
| Profile name with wrong case | Normalised automatically; `Contract`, `DEPOSITION`, `Filing` all resolve correctly |
| `--template` without `--json` | Default Markdown output with profile transformations applied |
| `--template` with `--json` | JSON output; `profile` field added to `metadata` object |
| `--template` with `--ocr` | OCR runs first, then profile post-processing is applied to the corrected text |

---

## Data Residency

All three profiles run entirely in-process. No text, metadata, or document content is transmitted to any external service at any point during template processing. This guarantee is identical to the core extraction pipeline — see the [Data Residency section of the README](../../README.md#data-residency) for the full statement.
