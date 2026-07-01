# lex-vault-md — Build Workflow

**Repo:** https://github.com/Kevork-Nexacrawl-dev/lex-vault-md
**npm:** https://www.npmjs.com/package/@nexacrawl/lex-vault-md

---

## Current Phase

Phase 2 — Builder Agent (active, --json flag shipped and documented)

---

## Completion Criteria (non-negotiable)

The repo is "done enough to sell" when:

- [x] --json output mode ships and is documented
- [ ] --ocr flag ships with tesseract.js fallback documented
- [ ] --template flag ships with contract/deposition/filing profiles
- [x] README has Commercial Use + Data Residency sections
- [ ] BSL 1.1 license confirmed correct
- [x] Zero breaking changes to existing batch/local/web commands

---

## Build Log

| Date       | Agent          | What was done                                                                                                                                                                                                                                                        | Commit SHA                               |
| ---------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| 2026-06-29 | Strategy Agent | Phase 1 complete — monetization research complete, dual licensing model selected (BSL 1.1 → MIT on 2029-01-01, commercial license available), legal ICP confirmed (litigation teams, law firms, e-discovery workflows)                                               | —                                        |
| 2026-06-29 | Build 0        | Renamed repo from pdf2md-cli → lex-vault-md. Updated package name, bin command, all internal references, README, LICENSE (licensor → Nexacrawl), CONTRIBUTING, AGENTS.md. Attempted to publish as `lex-vault-md` on npm — blocked (see Blocked section). Published as `@nexacrawl/lex-vault-md` instead. Deprecated `pdf2md-cli` and `lexvaultmd` on npm with redirect messages pointing to `@nexacrawl/lex-vault-md`. | cd52f477f492eff3cc8406b457d2298e1031c279 |
| 2026-06-30 | Build 1        | Rename polish and SEO/trust pass. CLI help now presents as `lex-vault-md`, CLI version and web User-Agent read from `package.json`, package-lock metadata now matches `@nexacrawl/lex-vault-md@1.1.0`, README now has clearer beginner Quick Start, SEO-focused About copy, Data Residency and Commercial Use sections, and corrected body-size-relative heading docs. Ran `npm audit fix`; audit is clean. Updated GitHub About description and topics for legal-tech/e-discovery positioning. | pending                                  |
| 2026-06-30 | Agent Ops      | Converted the previous GitHub Copilot Competitive Research Architect prompt into a Codex-ready specialist playbook at `agent-playbooks/competitive-research-architect.md`. Added `AGENTS.md` routing guidance for Octocode, CodeGraphContext (CGC), Context7, DeepWiki, GitHub plugin/`gh`, and source-backed competitor research. | pending                                  |
| 2026-06-30 | Research Build 2 | Completed source-backed competitive architecture pattern analysis with Octocode and local graph validation with CodeGraphContext. Added `research/competitive-architecture-pattern-analysis.md` with competitor architecture diagrams, pattern catalogue, clean-room design lessons, monetization alignment, compliance checklist, source appendix, and a 90-day architecture roadmap. DeepWiki was not exposed as a callable Codex MCP in this session, so it was not used as evidence. | pending                                  |
| 2026-06-30 | Research Build 3 | Completed Phase 2 code-pattern due diligence. Shallow-cloned primary competitors to a temp research workspace, scanned manifests/licenses/dependencies/network boundaries, cross-checked with GitMCP where useful, and added `research/competitive-architecture-pattern-analysis-phase2-addendum.md`. Main conclusion: complete code-pattern research before ecosyste.ms market mapping; next build slice should be `DocumentEvidence` + `DocumentStats` + `NetworkGate`, then `--json`. | pending                                  |
| 2026-06-30 | Build Implementer | Shipped --json output flag. New file: `src/utils/json-formatter.js` [CORE-BSL] — converts `pages[]` into `{ metadata, pages, headings, tables }` schema by post-processing Markdown text; zero extractor.js changes. Updated `bin/cli.js` (added `-j, --json` option to local, web, batch, convert commands), `src/commands/local.js`, `src/commands/web.js`, `src/commands/batch.js` — each routes on `options.json`; when flag is absent all output is byte-for-byte identical to pre-flag behaviour. All new code tagged [CORE-BSL]. | acf3da9ee9851bf10ec44824cae5f849eb7902c3 |
| 2026-06-30 | Docs Writer A3 | Wrote --json flag documentation. Created `docs/cli-reference/json-flag.md`: flag reference (name, type, default, supported commands), full JSON output schema with field-level descriptions, complete example output for a 3-page motion, when-to-use guidance, Node.js integration example. Updated `README.md`: added `--json` as first row in Flags table (local/web/batch), added JSON Output section with condensed schema + example, added JSON output mode to Features list, updated Why table to mention `.json` output. | cd4c745c72bdf5c8f3da884db4d12114271854ab (json-flag.md) / 7fb95912c5055c081c349381667ca36b5ff6d5a4 (README.md) |
| 2026-06-30 | Monetization Implementer | Commercial infrastructure skeleton. Confirmed Phase 2 active; --json checked off; --ocr and --template not yet checked off (not packaged). Created four pre-sale docs that describe the deployment model (always true, no feature gating required): `docs/commercial-page.md` (Professional $799/yr + Team $2,500/yr landing page copy with FAQ and compliance messaging), `docs/no-transmission-statement.md` (one-page signed declaration for vendor questionnaire attachment), `docs/vendor-security-packet.md` (pre-answered vendor security questionnaire template covering data handling, network, SBOM, SDLC, incident response, GDPR/HIPAA), `docs/offline-architecture.md` (full text architecture description with ASCII diagram, component descriptions, network behavior table, risk vector comparison, and distribution/integrity section). | 15e00a255a713edc04e394f22f41b25a2316cc44 |

---

## Release Status

- **GitHub Releases currently shows only `v1.0.0` as Latest.**
- After Build 1 is committed and pushed to `main`, create a new GitHub Release/tag: `v1.1.0`.
- Suggested release title: `v1.1.0 — LexVaultMD rename polish and legal-tech positioning`
- Suggested release notes:
  - CLI help and version now consistently use `lex-vault-md`
  - README improved for beginner usage, SEO, data residency, and commercial licensing
  - package-lock metadata corrected to `@nexacrawl/lex-vault-md@1.1.0`
  - dependency audit is clean after `npm audit fix`

---

## Blocked / Parked

- **npm unscoped name `lex-vault-md` was blocked** — npm rejected the name as too similar to a mistakenly published `lexvaultmd` package (published and immediately deprecated same day). Published as `@nexacrawl/lex-vault-md` instead. CLI bin command remains `lex-vault-md` — users still type `lex-vault-md` in their terminal; the scope only affects the install command. **All future agents must use `@nexacrawl/lex-vault-md` as the install reference** in docs, README, and any generated output.
- **`lexvaultmd` unpublish blocked for 24 hours** — npm refuses to delete the last version of a package without `--force`, which triggers a 24-hour republish lockout on that name. Can be force-unpublished after 2026-06-30. Low priority — it is already deprecated with a redirect message.
- **External research tools** — Octocode and CodeGraphContext worked for Research Build 2. After a Codex restart, GitMCP became available and was used for Research Build 3 cross-checks. Context7 is configured but was not needed for source-pattern research. DeepWiki and Repomix still were not exposed as callable Codex MCP tools in the active tool catalog; use them only after they appear.
- **README --json docs** — COMPLETE as of 2026-06-30 Docs Writer A3 session. `docs/cli-reference/json-flag.md` created; README flags table and JSON Output section updated.
- **Signed binary + MSI + WinGet manifest** — Required for Professional tier delivery. Parked until --ocr flag ships and v1.0 signed binary is ready. Do not deliver Professional tier to paying customers until these artifacts exist.
- **SBOM generation** — CycloneDX SBOM referenced in commercial docs; needs to be generated and included in artifact bundle before first Professional/Team sale.
- **Actual signing certificate** — Authenticode signing referenced in commercial docs; Nexacrawl must obtain a code-signing certificate before delivering signed binaries.

---

## DO NOT TOUCH

- src/services/extractor.js core pipeline logic (the 7-pass system)
- BSL 1.1 license terms
- Existing batch/local/web command interfaces
