# LexVaultMD — Commercial Tiers

> Convert legal documents to structured Markdown — locally, on CPU, with zero data transmission.

---

## Why LexVaultMD?

Legal matter data is confidential by default. Every time a document touches an external API, you expand your attack surface and your clients' exposure. LexVaultMD was designed from the ground up to eliminate that exposure: it runs entirely on your hardware, processes documents in memory, and never opens a network connection during extraction.

The result is a PDF-to-Markdown pipeline that legal IT already understands — signed binaries, offline operation, no cloud processing, and documentation your vendor review team can actually use.

---

## Community (Free)

**Best for:** Individuals, open-source projects, internal experimentation.

- Full BSL 1.1 source code via npm (`@nexacrawl/lex-vault-md`)
- Local, web, and batch conversion commands
- JSON output mode (`--json`) — structured JSON with metadata, per-page content, heading index, and table index
- Standard Markdown output
- Community support (GitHub Issues)

```bash
npm install -g @nexacrawl/lex-vault-md
lex-vault-md local brief.pdf
```

---

## Professional — $799 / year per organization

**Best for:** Litigation boutiques, eDiscovery consultants, solo legal ops practitioners who need verifiable deployment artifacts for vendor review.

Everything in Community, plus:

- **OCR fallback for scanned PDFs** — `--ocr` flag enables per-page Tesseract.js routing; only activates on pages that genuinely need it; runs entirely in-process with no data leaving the machine
- **Verified artifact checksums** — SHA-256 and SHA-512 for all distributed artifacts
- **Signed Windows binary** *(coming before GA — Authenticode-signed .exe for zero-warning deployment via Windows Defender and endpoint security)*
- **MSI installer + silent install support** — deploy via Group Policy, SCCM, or Intune; `msiexec /quiet /i LexVaultMD.msi`
- **WinGet manifest** — enterprise winget catalog entry for managed software inventories
- **Software Bill of Materials (SBOM)** — CycloneDX JSON listing every dependency, version, and license
- **Offline architecture diagram** — one-page visual showing data flow (local disk → CPU → output file; no network hops)
- **"No Data Transmission" statement** — declaration suitable for attaching to vendor questionnaire responses; covers both native text extraction and the OCR path
- **Pre-answered vendor questionnaire template** — covers data storage, encryption, network access, sub-processors, incident response; ready for your security team to review and submit
- **72-hour email support SLA** — direct support channel for deployment and integration questions

**Annual invoice billing. No per-seat fees. Covers your entire organization.**

[→ Purchase Professional ($799/yr)](mailto:sales@nexacrawl.dev?subject=LexVaultMD%20Professional%20License)

---

## Team — $2,500 / year per organization

**Best for:** Legal ops teams, mid-size firms, eDiscovery vendors, and organizations running structured matter-intake pipelines.

Everything in Professional, plus:

- **Priority support** — responses within one business day; escalation path to the maintainer
- **Procurement packet** — complete documentation set formatted for enterprise procurement: architecture overview, security summary, data handling statement, SBOM, checksums, and signed declaration in one ZIP
- **Matter-batch manifests** — per-batch JSON manifests linking each source document to its output, processing timestamp, page count, and extraction stats; suitable for chain-of-custody recordkeeping
- **Chain-of-custody audit logs** — structured log schema (`{ matter_id, document_hash, processed_at, operator, output_path }`) for each batch run; importable into matter management systems
- **Structured JSON schemas** — full TypeScript type definitions and JSON Schema files for the `--json` output; validated against the extractor's live output on each release
- **Admin policy presets** — configuration files for common deployment policies (output directory enforcement, log retention, binary path pinning)

**Annual invoice billing. No per-seat fees. Covers your entire organization.**

[→ Purchase Team ($2,500/yr)](mailto:sales@nexacrawl.dev?subject=LexVaultMD%20Team%20License)

---

## Enterprise — Starting at $7,500 / year

**Best for:** Large firms, legal technology vendors, and organizations that require custom SLAs, security review support, or roadmap input.

Everything in Team, plus:

- Unlimited internal deployment across all offices and subsidiaries
- Dedicated onboarding session with the maintainer
- Custom SLA agreement
- Security review support — we will join your vendor security call
- Roadmap input — vote on and request features
- Source code escrow options available

**Pricing is $7,500–$15,000/year depending on organization size and SLA requirements. Contact us for a quote.**

[→ Contact Enterprise Sales](mailto:sales@nexacrawl.dev?subject=LexVaultMD%20Enterprise%20Inquiry)

---

## Security & Compliance Positioning

**Built for confidentiality-sensitive legal workflows:** LexVaultMD runs locally, on CPU, without transmitting matter data to any external service.

**Shorten your security review** with a deployment model legal IT already understands: signed binaries, offline operation, no cloud processing, and a ready-to-send vendor security packet.

**Data residency in practice:** LexVaultMD processes all document content locally. This applies to both native text extraction and the optional OCR path — Tesseract.js runs entirely in-process. There is no SaaS dependency and no vendor-side storage. The `local` and `batch` commands process PDFs on the machine where the CLI is running. The `web` command downloads the PDF from the URL you supply, then runs the same local extraction pipeline — the document content is never forwarded to a third party.

Relevant professional obligations:

- **ABA Model Rule 1.6** (Confidentiality of Information) — requires reasonable measures to prevent unauthorized disclosure of client information; local processing eliminates the network-transmission vector.
- **Comment 8 to ABA Model Rule 1.1** (Technology Competence) — lawyers must understand the risks associated with technology used in client matters; LexVaultMD's offline architecture directly addresses cloud-processing risk.

> _LexVaultMD does not claim compliance with any specific rule or regulation. The deployment architecture description above is provided for informational purposes to assist legal and IT professionals in conducting their own evaluation._

---

## Licensing

LexVaultMD is source-available under BSL 1.1. Free for non-commercial and internal evaluation use. A commercial license is required for use in commercial products or services.

The Change Date is **2029-01-01** — after that date the code automatically converts to the MIT license.

For commercial licensing and vendor documentation: [sales@nexacrawl.dev](mailto:sales@nexacrawl.dev)

---

## Frequently Asked Questions

**Does LexVaultMD send any data to the internet during processing?**
No. Document processing is entirely local. This applies to both native extraction and the `--ocr` flag — Tesseract.js runs in-process on the local machine. The only network activity is optional: fetching a PDF from a URL when you use the `lex-vault-md web <url>` command. The fetched document is processed locally. No text, metadata, or extracted content is transmitted to any external service.

**Does OCR use a cloud service?**
No. `--ocr` uses Tesseract.js, which runs entirely in-process on the local machine. No page images, extracted text, or document metadata are sent to any external server. This is documented in the No Data Transmission Statement and Vendor Security Packet.

**Can I use the Community (free) version in a commercial law firm context?**
Yes. BSL 1.1 permits internal use at any organization. The paid tiers add deployment artifacts (signed binaries, MSI, SBOM, security documentation) that matter for enterprise rollout and vendor compliance — not license restrictions on internal use.

**What is the BSL 1.1 license?**
Business Source License 1.1 allows free use for any purpose except production use as a competing commercial service. For law firms, eDiscovery vendors, and legal ops teams using LexVaultMD to process their own documents, this is straightforwardly permissive. The license converts to MIT on 2029-01-01.

**Do you offer monthly billing?**
Not at this time. Licenses are billed annually by invoice. Contact us if your procurement process requires a different billing arrangement.

**What operating systems are supported?**
All tiers support macOS, Linux, and Windows (via Node.js / npm). The Professional and Team tiers add Windows-specific deployment artifacts (signed binary, MSI, WinGet manifest) for organizations managing Windows endpoints.

---

_LexVaultMD is developed by Nexacrawl. For licensing questions: [sales@nexacrawl.dev](mailto:sales@nexacrawl.dev)_
