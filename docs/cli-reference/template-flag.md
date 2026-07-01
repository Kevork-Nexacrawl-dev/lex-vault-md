# `--template` Flag — Legal Document Profiles

## Flag Reference

| Property | Value |
|---|---|
| **Flag** | `-t, --template <profile>` |
| **Type** | `string` |
| **Default** | *(none — profile mode off)* |
| **Valid values** | `contract` \| `deposition` \| `filing` |
| **Supported commands** | `local`, `web`, `batch`, `convert` (shorthand) |
| **Combinable with** | `--json`, `--ocr`, `--output`, `--clipboard` |

When `--template` is absent, every command behaves exactly as before — no change to output.

---

## What Profiles Do

A profile is a **post-processor** that runs after PDF text extraction (and after OCR if `--ocr` is active) but before final Markdown or JSON output. It does not change how the extractor works — it transforms the per-page text strings the extractor returns.

Think of it as a lens: the same extraction engine, shaped for a specific document type.

---

## Profiles

### `contract`

Optimised for transactional legal documents: agreements, leases, NDAs, purchase agreements, engagement letters.

**Transformations applied:**

1. **Defined-term detection** — quoted title-case phrases like `"Effective Date"` and `"Confidential Information"` are wrapped in backtick spans: `` `"Effective Date"` ``. Downstream tooling can grep or parse these spans to build a contract glossary.

2. **Signature block fencing** — lines beginning with execution cues (`IN WITNESS WHEREOF`, `AGREED AND ACCEPTED`, `By: ___`, `Name: ___`, `Title:`, `Date: ___`) are isolated into a fenced code block:
   ````
   ```signature-block
   IN WITNESS WHEREOF, the parties have executed...
   By: _______________________
   Name:
   Title:
   Date:
   ```
   ````

3. **Orphan line stripping** — standalone page numbers, `CONFIDENTIAL` watermarks, `[SIGNATURE PAGE FOLLOWS]`, and similar artefacts that interrupt clause text across pages are removed before the paragraph-join pass.

4. **Cross-page clause continuity** — when a page ends mid-sentence (no `.`, `!`, `?`, `:`, `;` as the last character), the first line of the following page is joined with a space rather than a blank line, restoring the original flowing prose.

**Usage:**
```bash
lex-vault-md local ./nda.pdf --template contract
lex-vault-md batch ./agreements/ --template contract
lex-vault-md local ./nda.pdf --template contract --json
```

---

### `deposition`

Optimised for deposition transcripts and court-reporter files.

**Transformations applied:**

1. **Q&A structure** — lines beginning with `Q.` or `A.` are reformatted as Markdown blockquotes with bold speaker labels:
   ```
   > **Q:** When did you first become aware of the agreement?
   > **A:** Sometime in March of last year.
   ```

2. **Exhibit marker annotation** — references like `Exhibit A`, `Exhibit 12`, and `Deposition Exhibit 3` are wrapped in a code-span annotation:
   `` `[EXHIBIT: Exhibit A]` ``
   This makes exhibit citations grep-able and linkable by downstream tools.

3. **Page/line number preservation** — court-reporter page-and-line headers (`4   15` meaning page 4, line 15) are preserved as invisible HTML comment annotations (`<!-- p4:l15 -->`) rather than being merged into the prose, keeping the transcript accurate for citation purposes.

4. **No cross-page joins** — line-break positions are semantically meaningful in transcripts; pages are never joined.

**Usage:**
```bash
lex-vault-md local ./deposition_smith.pdf --template deposition
lex-vault-md batch ./depositions/ --template deposition --json
```

---

### `filing`

Optimised for court filings, pleadings, motions, and briefs.

**Transformations applied:**

1. **Caption/pleading-frame detection** — the case caption on the first page (starting with `IN THE SUPERIOR COURT`, `UNITED STATES DISTRICT COURT`, etc.) is isolated into a fenced block:
   ````
   ```pleading-caption
   IN THE SUPERIOR COURT OF THE STATE OF CALIFORNIA
   ...
   Plaintiff,
   vs.
   ...
   Defendant.
   ```
   ````

2. **Numbered paragraph handling** — lines beginning with `1.`, `12.`, `123.` are preserved as Markdown ordered-list items with clean spacing, rather than being reflowed as run-on prose.

3. **Exhibit index fencing** — an `EXHIBIT INDEX` or `INDEX OF EXHIBITS` section is detected wherever it appears and wrapped in a fenced block:
   ````
   ```exhibit-index
   EXHIBIT INDEX
   Exhibit A — Lease Agreement dated January 1, 2024
   Exhibit B — Email Correspondence
   ```
   ````

4. **Cross-page paragraph joins** — applied to body argument text (not within caption or exhibit-index fences).

**Usage:**
```bash
lex-vault-md local ./motion_to_dismiss.pdf --template filing
lex-vault-md batch ./case_files/ --template filing
lex-vault-md web https://pacer.gov/docs/brief.pdf --template filing --json
```

---

## Combining Flags

`--template` composes with `--ocr` and `--json`:

```bash
# Scanned deposition transcript → OCR first, then format as Q&A transcript
lex-vault-md local ./depo.pdf --ocr --template deposition

# Structured JSON output of a contract with defined-term annotations
lex-vault-md local ./agreement.pdf --template contract --json

# Batch-process an entire filing folder with filing profile
lex-vault-md batch ./filings/ --template filing --output ./converted/
```

**Execution order:** `extractPDF()` → `applyOCRFallback()` (if `--ocr`) → `applyTemplate()` (if `--template`) → `formatMarkdown()` or `formatJSON()`.

---

## Data Residency

All three profiles run **entirely in-process**. No text, metadata, or document content is transmitted to any external service. This guarantee is identical to the core extraction pipeline — see the [Data Residency section of the README](../../README.md#data-residency--offline-operation) for the full statement.

---

## Error Handling

| Situation | Behaviour |
|---|---|
| Unknown profile name | Hard error: `Unknown template profile "xyz". Valid values: contract, deposition, filing` |
| Profile name with wrong case | Normalised to lowercase; `Contract` and `CONTRACT` both work |
| `--template` with no `--json` | Default Markdown output with profile transformations applied |
| `--template` with `--json` | JSON output; `profile` field added to `metadata` object |
