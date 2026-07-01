# LexVaultMD — Offline Architecture Description

**Product:** LexVaultMD (`@nexacrawl/lex-vault-md`)  
**Developer:** Nexacrawl  
**Document version:** 1.0  

---

## Overview

LexVaultMD is a local-first, CPU-only document processing tool. Its architecture was designed with one constraint above all others: **matter data must never leave the machine on which it is processed**.

This constraint shapes every technical decision in the stack — runtime environment, dependency selection, output model, and distribution format. There is no cloud component, no processing API, and no telemetry layer.

---

## Architecture Diagram (Text)

```
+---------------------------------------------------------------------+
|                        END USER MACHINE                             |
|                                                                     |
|  +---------------+     +------------------------------------------+  |
|  |  Input        |     |  LexVaultMD Process (Node.js, CPU only)  |  |
|  |  PDF file     |---->|                                          |  |
|  |  (local disk) |     |  +------------------------------------+  |  |
|  +---------------+     |  |  1. Load PDF into memory           |  |  |
|                         |  |     (pdf-parse / pdfjs-dist)       |  |  |
|                         |  +------------------------------------+  |  |
|                         |  |  2. 7-pass extraction pipeline     |  |  |
|                         |  |     * Text extraction              |  |  |
|                         |  |     * Heading detection            |  |  |
|                         |  |     * Table recognition            |  |  |
|                         |  |     * List identification          |  |  |
|                         |  |     * Metadata capture             |  |  |
|                         |  |     * Section structure            |  |  |
|                         |  |     * Output formatting            |  |  |
|                         |  +------------------------------------+  |  |
|                         |  |  3. Render Markdown or JSON        |  |  |
|                         |  |     in memory                      |  |  |
|                         |  +------------------------------------+  |  |
|                         |                                          |  |
|                         +--------------------+---------------------+  |
|                                              |                        |
|  +---------------+                           |                        |
|  |  Output       |<--------------------------+                        |
|  |  .md / .json  |                                                    |
|  |  (local disk) |                                                    |
|  +---------------+                                                    |
|                                                                     |
|  X  No outbound connections to Nexacrawl servers                    |
|  X  No cloud processing                                             |
|  X  No AI/ML API calls                                              |
|  X  No telemetry                                                    |
|  X  No data stored outside this machine                             |
|                                                                     |
+---------------------------------------------------------------------+
```

---

## Component Descriptions

### Runtime: Node.js (CPU)

LexVaultMD runs as a Node.js process on the end user's local machine. It uses the host CPU exclusively; no GPU or specialized hardware is required. The process starts, processes the document, writes output, and exits. It does not run as a persistent daemon or background service.

### PDF Parsing Layer

PDFs are parsed using open-source Node.js libraries (`pdf-parse`, `pdfjs-dist`) that operate entirely in-process. These libraries decompose the PDF's binary structure into a page-by-page text and layout representation in memory. No external parsing service is involved.

### 7-Pass Extraction Pipeline

The core extraction engine applies a multi-pass algorithm to the in-memory page representation:

1. **Raw text extraction** — character and word sequence recovery
2. **Layout analysis** — column detection, reading-order reconstruction
3. **Heading detection** — font-size and weight heuristics to identify document structure
4. **Table recognition** — alignment and whitespace patterns to identify tabular data
5. **List identification** — bullet and numbering pattern detection
6. **Metadata capture** — document properties (title, author, page count) from PDF metadata fields
7. **Output formatting** — assembly into clean Markdown or structured JSON

All seven passes run in memory on the local CPU. The pipeline was specifically designed to avoid calling any external model, API, or service — a deliberate architectural choice for legal document workflows.

### Output Layer

Output is written to a file path specified by the user at the command line:

- **Markdown output** (default): a `.md` file preserving document structure as headings, paragraphs, tables, and lists
- **JSON output** (`--json` flag): a structured JSON document containing `{ metadata, pages, headings, tables }` — suitable for downstream processing in legal matter management systems

Output is written only to local disk. Nexacrawl has no visibility into output files.

---

## Network Behavior

| Command | Network activity |
|---------|------------------|
| `lex-vault-md local <file>` | **None** |
| `lex-vault-md batch <dir>` | **None** |
| `lex-vault-md convert <file>` | **None** |
| `lex-vault-md web <url>` | Outbound HTTP GET to `<url>` to retrieve PDF; no document content transmitted outbound |

The `web` subcommand is the only case where a network connection is initiated, and that connection is always to the URL the user specifies — never to a Nexacrawl service. Document content is not transmitted in any direction.

---

## Distribution and Integrity

### Community Tier (npm)

- Distributed via the npm registry as `@nexacrawl/lex-vault-md`
- Package integrity enforced by npm's content-addressed registry and `package-lock.json` lockfile
- Source code available at [https://github.com/Kevork-Nexacrawl-dev/lex-vault-md](https://github.com/Kevork-Nexacrawl-dev/lex-vault-md) under BSL 1.1

### Professional and Team Tiers (Windows)

- **Signed `.exe` binary** — Authenticode-signed with Nexacrawl's code-signing certificate; Windows Defender and endpoint security tools will not generate unsigned-executable warnings
- **MSI installer** — supports silent installation (`msiexec /quiet`), Group Policy deployment, SCCM, and Intune
- **WinGet manifest** — enables deployment via Windows Package Manager in enterprise environments
- **SHA-256 and SHA-512 checksums** — provided for all distributed artifacts; security teams can independently verify download integrity before deployment
- **CycloneDX SBOM** — full software bill of materials listing every dependency, version, and license

---

## Why Local-First for Legal Workflows

Cloud-based document processing introduces several risk vectors that are architecturally absent in LexVaultMD:

| Risk vector | Cloud processing | LexVaultMD |
|-------------|-----------------|------------|
| Data in transit to vendor API | Present | **Eliminated** |
| Vendor data retention / logging | Present | **Eliminated** |
| Sub-processor data sharing | Present | **Eliminated** |
| Cloud breach / account compromise | Present | **Eliminated** |
| Compliance scope expansion | Present | **Not applicable** |

By keeping processing entirely local, LexVaultMD allows firms to apply their existing document security controls (disk encryption, access control, network segmentation) to the full document lifecycle — including the extraction step.

---

## Relevant Professional Obligations

- **ABA Model Rule 1.6** (Confidentiality of Information) — requires reasonable measures to prevent unauthorized disclosure of client information
- **ABA Model Rule 1.1, Comment 8** (Technology Competence) — lawyers must understand the benefits and risks of relevant technology

LexVaultMD's offline architecture directly addresses the data-transmission risk category described in these obligations. It does not claim rule-specific compliance; this section is provided to help practitioners understand the deployment model in the context of their professional responsibilities.

---

_Questions about this document: [sales@nexacrawl.dev](mailto:sales@nexacrawl.dev)_
