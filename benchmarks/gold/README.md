# Gold Test Set — Legal PDF Corpus

This directory contains ground-truth annotations for the benchmark gold set.

## File Convention

```
<slug>.pdf       ← the test PDF (NOT committed — obtain per source below)
<slug>.gt.json   ← ground-truth annotation (committed)
```

## Document Set

| Slug | Document Type | Source |
|---|---|---|
| `contract-sample` | Multi-party merger agreement | SEC EDGAR — any Form 8-K Exhibit 2.1 |
| `pleading-sample` | Federal civil complaint | PACER Public Access — any civil complaint |
| `deposition-sample` | Deposition transcript | Court reporter sample or PACER |
| `sec-10k-sample` | SEC Form 10-K | SEC EDGAR — any 10-K PDF |
| `scanned-mixed-sample` | Scanned page 1 + born-digital pages 2+ | Construct using img2pdf or Acrobat |

## Obtaining the PDFs

For legal/copyright reasons the actual PDFs are not committed.
Each `.gt.json` contains a `source` field with retrieval instructions.

### Quick setup (public domain)
```bash
# SEC EDGAR examples (public domain, U.S. government filings)
curl -o benchmarks/gold/sec-10k-sample.pdf \
  "https://www.sec.gov/Archives/edgar/data/[CIK]/[accession]/[filename].pdf"
```

## Integrity Rule

Do NOT use documents that only favor LexVaultMD. Include at least one document
where LexVaultMD loses on a metric. Such documents are marked `"knownWeakness": true`
in their `.gt.json`.

## Adding a Document

1. Drop the PDF into this directory (do not commit binary PDFs — add to `.gitignore` if needed)
2. Create the `.gt.json` following the schema in any existing annotation
3. Update the table above
4. Commit only the `.gt.json`
