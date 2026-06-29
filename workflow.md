# lex-vault-md — Build Workflow

**Repo:** https://github.com/Kevork-Nexacrawl-dev/lex-vault-md
**npm:** https://www.npmjs.com/package/@nexacrawl/lex-vault-md

---

## Current Phase

Phase 2 — Builder Agent (active, Build 0 complete)

---

## Completion Criteria (non-negotiable)

The repo is "done enough to sell" when:

- [ ] --json output mode ships and is documented
- [ ] --ocr flag ships with tesseract.js fallback documented
- [ ] --template flag ships with contract/deposition/filing profiles
- [ ] README has Commercial Use + Data Residency sections
- [ ] BSL 1.1 license confirmed correct
- [ ] Zero breaking changes to existing batch/local/web commands

---

## Build Log

| Date       | Agent          | What was done                                                                                                                                                                                                                                                        | Commit SHA                               |
| ---------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| 2026-06-29 | Strategy Agent | Phase 1 complete — monetization research complete, dual licensing model selected (BSL 1.1 → MIT on 2029-01-01, commercial license available), legal ICP confirmed (litigation teams, law firms, e-discovery workflows)                                               | —                                        |
| 2026-06-29 | Build 0        | Renamed repo from pdf2md-cli → lex-vault-md. Updated package name, bin command, all internal references, README, LICENSE (licensor → Nexacrawl), CONTRIBUTING, AGENTS.md. Attempted to publish as `lex-vault-md` on npm — blocked (see Blocked section). Published as `@nexacrawl/lex-vault-md` instead. Deprecated `pdf2md-cli` and `lexvaultmd` on npm with redirect messages pointing to `@nexacrawl/lex-vault-md`. | cd52f477f492eff3cc8406b457d2298e1031c279 |

---

## Blocked / Parked

- **npm unscoped name `lex-vault-md` was blocked** — npm rejected the name as too similar to a mistakenly published `lexvaultmd` package (published and immediately deprecated same day). Published as `@nexacrawl/lex-vault-md` instead. CLI bin command remains `lex-vault-md` — users still type `lex-vault-md` in their terminal; the scope only affects the install command. **All future agents must use `@nexacrawl/lex-vault-md` as the install reference** in docs, README, and any generated output.
- **`lexvaultmd` unpublish blocked for 24 hours** — npm refuses to delete the last version of a package without `--force`, which triggers a 24-hour republish lockout on that name. Can be force-unpublished after 2026-06-30. Low priority — it is already deprecated with a redirect message.

---

## DO NOT TOUCH

- src/services/extractor.js core pipeline logic (the 7-pass system)
- BSL 1.1 license terms
- Existing batch/local/web command interfaces
