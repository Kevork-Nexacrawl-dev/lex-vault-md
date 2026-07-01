# LexVaultMD — Agent Execution Workflow Plan

> **How to use this document:** Follow each sprint top to bottom. Each sprint has a trigger (what must be true before you start it), an agent sequence, the exact user prompts to paste, a gate (what must be true before moving on), and a workflow.md update checklist.

---

## Master Agent Roster

| # | Agent | Role | Files to attach |
|---|---|---|---|
| A1 | Build Implementer | Writes code, ships flags | MANDATORY-SESSION-PROTOCOL.md · ChatGPT Deep Research.md |
| A2 | Monetization Implementer | GTM, packaging, sales copy | MANDATORY-SESSION-PROTOCOL.md · ChatGPT Monetization Deep Research.md |
| A3 | QA / Regression Guard | Regression tests after every A1 commit | MANDATORY-SESSION-PROTOCOL.md |
| A4 | Docs Writer | README + CLI reference sections | MANDATORY-SESSION-PROTOCOL.md · ChatGPT Monetization Deep Research.md |
| A5 | Benchmark Agent | Benchmark harness + results table | MANDATORY-SESSION-PROTOCOL.md · ChatGPT Deep Research.md |

---

## Sprint 0 — Orientation (One-Time Setup)
**Trigger:** Before any build work starts.  
**Who:** You (human) only — no agents needed.  
**Purpose:** Confirm all agents have the right files attached in Perplexity Spaces before any session begins.

### Checklist
- [ ] All 5 agent spaces have MANDATORY-SESSION-PROTOCOL.md attached
- [ ] A1 space has ChatGPT Deep Research.md attached
- [ ] A2 space has ChatGPT Monetization Deep Research.md attached
- [ ] A4 space has ChatGPT Monetization Deep Research.md attached
- [ ] A5 space has ChatGPT Deep Research.md attached
- [ ] workflow.md in repo is the current template (Phase 2 active, Build 0 logged)
- [ ] You have a fixed test PDF ready (a real legal doc — contract or pleading — for regression baseline)

**Gate to Sprint 1:** All boxes checked.

---

## Sprint 1 — Ship --json Flag
**Trigger:** Sprint 0 complete.  
**Critical chain:** A1 → A3 → A4  
**Parallel track:** A2 starts independently (no dependency on A1)

---

### Step 1.1 — Launch A1 (Build Implementer)

**Files to attach:** MANDATORY-SESSION-PROTOCOL.md, ChatGPT Deep Research.md

**Kick-start prompt:**
```
You are the LexVaultMD Build Implementer. Your Space files contain your research doc and protocol.

Task for this session: Ship the --json output flag.

Requirements:
- When --json is passed, output a structured JSON object instead of Markdown
- JSON schema must include: { pages: [], headings: [], tables: [], metadata: {} }
- Tag all new code with [CORE-BSL] or [PRO-CANDIDATE] comments
- The flag must be purely additive — when --json is absent, all existing output is byte-for-byte identical to pre-flag behavior
- Works across all three commands: batch, local, web
- Do NOT touch src/services/extractor.js

After committing, update workflow.md Build Log with your commit SHA.
```

**Expected output:** Commit SHA in workflow.md Build Log, --json implemented across batch/local/web.

---

### Step 1.2 — Launch A3 (QA / Regression Guard)
**Trigger:** A1 posts a commit SHA in workflow.md.

**Files to attach:** MANDATORY-SESSION-PROTOCOL.md

**Kick-start prompt:**
```
You are the LexVaultMD QA / Regression Guard.

Task for this session: Regression test the latest Build Implementer commit.

1. Read workflow.md — find the latest Build Log commit SHA.
2. Pull that commit and run the full regression suite:
   - batch command against your fixed test PDF — diff output vs your pre-flag baseline
   - local command against your fixed test PDF — diff output vs your pre-flag baseline
   - web command against your fixed test PDF — diff output vs your pre-flag baseline
   - Run the same commands WITH --json and confirm JSON output is valid and parseable
   - Confirm --json absent = output identical to baseline
3. Report: PASS or FAIL per command with exact diffs for any failure.
4. If all PASS: mark --json criterion as ✅ in workflow.md.
5. If any FAIL: log in workflow.md Blocked/Parked with exact repro. Do NOT check off the criterion.
```

**Gate:** A3 reports all PASS and checks off --json in workflow.md before proceeding.

---

### Step 1.3 — Launch A4 (Docs Writer)
**Trigger:** A3 has checked off --json in workflow.md.

**Files to attach:** MANDATORY-SESSION-PROTOCOL.md, ChatGPT Monetization Deep Research.md

**Kick-start prompt:**
```
You are the LexVaultMD Docs Writer.

Task for this session: Write the --json flag documentation.

1. Read workflow.md — confirm --json is checked off before writing anything.
2. Write the following and commit to the repo:
   - CLI reference section for --json: flag name, type, default, description, full JSON schema with field descriptions, one complete example output
   - Add --json to the README usage table
   - Note which commands support it (batch / local / web)
3. Package name rule: install = npm install @nexacrawl/lex-vault-md | terminal = lex-vault-md
4. Update workflow.md Build Log with your commit SHA.
```

---

### Step 1.4 — Launch A2 (Monetization Implementer) — Parallel
**Trigger:** Sprint 0 complete (runs in parallel with Steps 1.1–1.3, no dependency).

**Files to attach:** MANDATORY-SESSION-PROTOCOL.md, ChatGPT Monetization Deep Research.md

**Kick-start prompt:**
```
You are the LexVaultMD Monetization Implementer.

Task for this session: Build the commercial infrastructure skeleton.

1. Read workflow.md — note current phase and what is/isn't checked off yet.
2. Do NOT package or sell features that are not yet checked off in workflow.md.
3. This session's tasks (all pre-feature, so safe to start now):
   a. Draft the commercial landing page copy for Professional ($799/yr) and Team ($2,500/yr) tiers — save as docs/commercial-page.md in the repo
   b. Draft the "No Data Transmission" one-page statement — save as docs/no-transmission-statement.md
   c. Draft the vendor security questionnaire answers template — save as docs/vendor-security-packet.md
   d. Draft the offline architecture description (text version) — save as docs/offline-architecture.md
4. None of these reference specific flags — they describe the deployment model, which is already true.
5. Update workflow.md Build Log with your commit SHA.
```

**Note:** A2 runs concurrently with A1/A3/A4 since it's working on packaging docs, not code.

---

### Sprint 1 Gate
Before moving to Sprint 2, confirm in workflow.md:
- [ ] --json criterion checked off by A3
- [ ] --json docs committed by A4
- [ ] Commercial skeleton docs committed by A2

---

## Sprint 2 — Ship --ocr Flag
**Trigger:** Sprint 1 gate passed.  
**Critical chain:** A1 → A3 → A4 → A2  
**Note:** This is the flag that unlocks the Professional tier first sale.

---

### Step 2.1 — Launch A1 (Build Implementer)

**Kick-start prompt:**
```
You are the LexVaultMD Build Implementer.

Task for this session: Ship the --ocr flag with Tesseract.js fallback.

Requirements:
- When --ocr is passed, enable Tesseract.js fallback for pages that fail the native-text quality test
- Routing logic: use printable_native_ratio as the primary signal
  >= 0.97 → NATIVE PATH ONLY (no OCR even with --ocr flag)
  0.85–0.97 → NATIVE + REPAIR
  < 0.85, image_coverage >= 0.60 → WHOLE-PAGE OCR
  native text exists but specific regions fail → REGION-LEVEL OCR ONLY
- OCR preprocessing: deskew + adaptive binarization + light denoise + 300dpi baseline
- Reuse Tesseract.js workers — do not spawn a new worker per page
- Flag is purely additive — when --ocr is absent, behavior is identical to current
- Tag OCR worker pool and preprocessing utilities as [PRO-CANDIDATE]
- Do NOT touch src/services/extractor.js core pipeline
- Works across batch, local, web commands

After committing, update workflow.md Build Log with your commit SHA.
```

---

### Step 2.2 — Launch A3 (QA / Regression Guard)

**Kick-start prompt:**
```
You are the LexVaultMD QA / Regression Guard.

Task for this session: Regression test the --ocr commit.

Extended test matrix for this sprint:
1. All 3 existing commands (batch/local/web) WITHOUT --ocr — must be byte-for-byte identical to Sprint 1 baseline
2. All 3 commands WITH --ocr on a native-text PDF — OCR must NOT be triggered (verify via log output)
3. All 3 commands WITH --ocr on a scanned/image-heavy PDF — OCR must be triggered for qualifying pages
4. --json + --ocr combined — must work together without errors
5. Confirm Tesseract.js worker is reused across pages (no per-page worker spawn)

Report PASS/FAIL per test. If all PASS, check off --ocr criterion in workflow.md.
```

---

### Step 2.3 — Launch A4 (Docs Writer)
**Trigger:** A3 checks off --ocr.

**Kick-start prompt:**
```
You are the LexVaultMD Docs Writer.

Task for this session: Write the --ocr flag documentation and the README Data Residency section.

1. Confirm --ocr is checked off in workflow.md before writing.
2. Write and commit:
   a. CLI reference for --ocr: flag, default, when OCR is triggered (explain the routing logic in plain English), tesseract.js dependency note, known limitations, example usage
   b. README Data Residency section — use this exact framing:
      "LexVaultMD processes all document content locally on the user's machine. No data is transmitted to external services, APIs, or cloud infrastructure at any point during extraction. This applies to both native text extraction and the optional OCR path — Tesseract.js runs entirely in-process. There is no SaaS dependency and no vendor-side storage."
      Make it suitable for pasting into a vendor questionnaire.
3. Update workflow.md Build Log with commit SHA.
```

---

### Step 2.4 — Launch A2 (Monetization Implementer)
**Trigger:** A4 commits Data Residency section.

**Kick-start prompt:**
```
You are the LexVaultMD Monetization Implementer.

Task for this session: Activate the Professional tier launch sequence.

1. Read workflow.md — confirm --ocr is checked off and Data Residency section is committed.
2. Execute:
   a. Finalize docs/commercial-page.md — update it to reference --ocr and the Data Residency section as key features
   b. Update docs/vendor-security-packet.md with the exact Data Residency language committed by the Docs agent
   c. Write the GitHub README Commercial Use section — explain BSL 1.1 in plain language:
      "LexVaultMD is source-available under BSL 1.1. Free for non-commercial and internal evaluation use. A commercial license is required for use in commercial products or services."
   d. Draft the winget manifest template — save as docs/winget-manifest-template.yaml
3. Update workflow.md Build Log with commit SHA.
```

---

### Sprint 2 Gate
- [ ] --ocr criterion checked off by A3
- [ ] --ocr docs + Data Residency section committed by A4
- [ ] Commercial Use README section committed by A2
- [ ] Professional tier packaging docs complete

**At this point: Professional tier ($799/yr) is sellable.**

---

## Sprint 3 — Ship --template Flag
**Trigger:** Sprint 2 gate passed.  
**Critical chain:** A1 → A3 → A4  
**Parallel:** A5 starts benchmark harness (no dependency on --template)

---

### Step 3.1 — Launch A1 (Build Implementer)

**Kick-start prompt:**
```
You are the LexVaultMD Build Implementer.

Task for this session: Ship the --template flag with three legal document profiles.

Requirements:
- --template contract: optimizes for defined-term detection, signature blocks, cross-page clause continuity
- --template deposition: optimizes for Q&A structure, exhibit markers, page/line number preservation
- --template filing: optimizes for caption/pleading-frame detection, numbered paragraphs, exhibit index handling
- Default (no --template): current behavior unchanged — purely additive
- Each profile is a configuration object passed into the existing pipeline — do not rewrite the pipeline
- Tag profile configurations as [PRO-CANDIDATE]
- Do NOT touch src/services/extractor.js

After committing, update workflow.md Build Log with commit SHA.
```

---

### Step 3.2 — Launch A3 (QA / Regression Guard)

**Kick-start prompt:**
```
You are the LexVaultMD QA / Regression Guard.

Task for this session: Regression test the --template commit.

Test matrix:
1. All 3 existing commands WITHOUT --template — byte-for-byte identical to Sprint 2 baseline
2. --template contract on a contract PDF — output is valid Markdown/JSON, no crashes
3. --template deposition on a deposition PDF — output is valid, Q&A structure preserved
4. --template filing on a pleading PDF — output is valid, caption block intact
5. --template + --json combined — valid JSON output for each profile
6. --template + --ocr combined — no conflicts
7. Unknown --template value (e.g. --template invoice) — clean error message, no crash

Report PASS/FAIL. If all PASS, check off --template criterion in workflow.md.
```

---

### Step 3.3 — Launch A4 (Docs Writer)
**Trigger:** A3 checks off --template.

**Kick-start prompt:**
```
You are the LexVaultMD Docs Writer.

Task for this session: Write the --template flag documentation. This is the last docs task before "done enough to sell."

1. Confirm --template is checked off in workflow.md.
2. Write and commit:
   a. CLI reference for --template: available values (contract/deposition/filing), what each profile changes in plain English, example output snippet per profile, what "default" means
   b. Update the README usage table with --template
   c. Write a short "Document Profiles" section in README explaining why legal document types need different extraction strategies (2–3 sentences, non-technical enough for a legal IT manager)
3. Update workflow.md Build Log with commit SHA.
```

---

### Step 3.4 — Launch A5 (Benchmark Agent) — Parallel
**Trigger:** Sprint 2 gate passed (A5 doesn't need --template to start).

**Kick-start prompt:**
```
You are the LexVaultMD Benchmark Agent.

Task for this session: Build the benchmark harness and run the first benchmark pass.

1. Read workflow.md — note which flags are checked off.
2. Build the benchmark harness:
   a. Create /benchmarks/runner.js — runs LexVaultMD and competitor tools against the same PDF set, records wall-clock s/page and peak memory MB
   b. Create /benchmarks/gold/ — 3–5 legal PDFs with ground-truth annotations (contract, pleading, deposition, SEC filing, scanned mixed)
   c. Create /benchmarks/score.js — compares tool output against ground truth, produces 0–5 scores per metric
3. Run against LexVaultMD (current build) and at least Marker (CPU mode) and Docling (CPU mode).
4. Save results to /benchmarks/results/YYYY-MM-DD.md — do NOT publish to README yet.
5. Update workflow.md Build Log with commit SHA.
```

---

### Sprint 3 Gate
- [ ] --template criterion checked off by A3
- [ ] --template docs committed by A4
- [ ] BSL 1.1 license confirmed correct (human: read LICENSE file and confirm)
- [ ] Benchmark harness committed by A5

---

## Sprint 4 — Final Polish + Launch
**Trigger:** Sprint 3 gate passed. All 6 completion criteria should now be checkable.  
**All steps in this sprint are parallel — no blocking dependencies between agents.**

---

### Step 4.1 — Launch A3 (Final Regression)

**Kick-start prompt:**
```
You are the LexVaultMD QA / Regression Guard.

Task for this session: Full final regression — all flags, all combinations, all commands.

Run the complete matrix:
- batch / local / web × no flags
- batch / local / web × --json
- batch / local / web × --ocr
- batch / local / web × --template contract
- batch / local / web × --template deposition
- batch / local / web × --template filing
- batch / local / web × --json --ocr
- batch / local / web × --json --template contract
- batch / local / web × --ocr --template deposition
- batch / local / web × --json --ocr --template filing (full stack)

If all PASS: confirm "Zero breaking changes" criterion is ✅ in workflow.md.
If any FAIL: log in Blocked/Parked with exact repro, notify user before proceeding.
```

---

### Step 4.2 — Launch A5 (Final Benchmark Run)

**Kick-start prompt:**
```
You are the LexVaultMD Benchmark Agent.

Task for this session: Run the final complete benchmark and publish results.

1. Run the full benchmark harness against all competitors: Marker (CPU), Docling (CPU), MinerU (pipeline backend), LlamaParse (as cloud accuracy reference only).
2. Score all metrics across all document types in your gold set.
3. Publish results to README under a "Benchmarks" section using the standard table format.
4. Commit /benchmarks/results/final-[date].md with full methodology disclosure (hardware spec, tool versions, document set description).
5. Label all LlamaParse columns with ☁️ and footnote: "Cloud service — not a valid CPU comparison."
6. Update workflow.md Build Log with commit SHA.
```

---

### Step 4.3 — Launch A2 (Launch Sequence)
**Trigger:** A3 final regression passes + benchmark table committed.

**Kick-start prompt:**
```
You are the LexVaultMD Monetization Implementer.

Task for this session: Execute Month 1 launch sequence. All build criteria are complete.

1. Read workflow.md — confirm all 6 criteria are checked off before doing anything.
2. Execute in order:
   a. Confirm README Commercial Use and Data Residency sections are present and accurate
   b. Add "No Cloud Processing" badge to README (shields.io static badge)
   c. Write docs/vs-python-ocr-stacks.md — "Why not Python OCR stacks?" — position LexVaultMD's Node-only, CPU-only, no-GPU advantage vs Marker/Docling/MinerU
   d. Finalize docs/commercial-page.md with all three flags documented and pricing tiers clearly stated
   e. Write the npm publish announcement draft — a short post for Legal Hackers community and GitHub Discussions
   f. Write the winget submission checklist based on the manifest template from Sprint 2
3. Update workflow.md Build Log. Set Current Phase to: "Phase 2 Complete — Ready to Sell."
```

---

## Sprint 4 Gate = PROJECT COMPLETE
- [ ] All 6 workflow.md completion criteria checked off
- [ ] Final regression PASS logged by A3
- [ ] Benchmark table published by A5
- [ ] Launch docs complete by A2
- [ ] workflow.md Current Phase = "Phase 2 Complete — Ready to Sell"

---

## Quick Reference: Agent Sequence Per Sprint

```
Sprint 1:  A2 (parallel) ──────────────────────────────────────────────────►
           A1 → A3 → A4

Sprint 2:  A1 → A3 → A4 → A2

Sprint 3:  A5 (parallel) ──────────────────────────────────────────────────►
           A1 → A3 → A4

Sprint 4:  A3 (final regression)
           A5 (final benchmark)
           A2 (launch) — runs after A3 + A5 both complete
```

---

## Human Touchpoints (things only you can do)

| When | What |
|---|---|
| Sprint 0 | Attach correct files to each agent space |
| Sprint 0 | Prepare a fixed test PDF for regression baseline |
| Sprint 3 gate | Manually read LICENSE file and confirm BSL 1.1 is correct |
| Sprint 4 | Review commercial-page.md before publishing externally |
| Sprint 4 | Submit winget manifest (requires your Microsoft account) |
| Sprint 4 | Post launch announcement (requires your community accounts) |
| Anytime | If A3 reports a regression — you decide whether to unblock or park |

---

## workflow.md State at Each Gate

| After Sprint | Phase label in workflow.md | Criteria checked off |
|---|---|---|
| Sprint 0 | Phase 2 — Builder Agent (active) | 0 of 6 |
| Sprint 1 | Phase 2 — Sprint 1 complete | 1 of 6 (--json) |
| Sprint 2 | Phase 2 — Sprint 2 complete | 3 of 6 (--json, --ocr, Commercial Use + Data Residency) |
| Sprint 3 | Phase 2 — Sprint 3 complete | 5 of 6 (all flags + BSL confirmed) |
| Sprint 4 | Phase 2 Complete — Ready to Sell | 6 of 6 |
