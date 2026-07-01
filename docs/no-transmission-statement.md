# LexVaultMD — No Data Transmission Statement

**Product:** LexVaultMD (`@nexacrawl/lex-vault-md`)  
**Developer:** Nexacrawl  
**Document version:** 1.0  
**Effective date:** 2026-07-01  

---

## Statement

LexVaultMD does not transmit document content, extracted text, metadata, file paths, user data, or any other matter-related information to any external server, cloud service, API, or third-party system during document processing.

All processing is performed locally on the end user's hardware using the CPU. No network connection is required or initiated by the processing pipeline.

---

## Architecture Summary

```
Input document (PDF)
        |
        v
+-------------------------------------------------------+
|  LexVaultMD — local process (Node.js, CPU only)       |
|                                                       |
|  1. PDF parsed in memory (pdf-parse / pdfjs-dist)     |
|  2. Text extracted and structured (7-pass pipeline)   |
|  3. Markdown / JSON written to local output path      |
|                                                       |
|  X No HTTP requests during extraction                 |
|  X No telemetry calls                                 |
|  X No cloud storage writes                            |
|  X No sub-processor data sharing                      |
+-------------------------------------------------------+
        |
        v
Output file (Markdown or JSON) — written to local disk only
```

---

## Scope

This statement applies to the following LexVaultMD commands:

| Command | Network activity |
|---------|------------------|
| `lex-vault-md local <file>` | None |
| `lex-vault-md batch <dir>` | None |
| `lex-vault-md convert <file>` | None |
| `lex-vault-md web <url>` | Outbound HTTP GET to the specified URL only, to retrieve the PDF; no document content is transmitted outbound |

The `web` command fetches a document from a URL you specify. Only the HTTP GET request to that URL is initiated; the downloaded document is then processed entirely locally. No content is transmitted to Nexacrawl or any third party.

---

## What LexVaultMD Does Not Do

- Does not send document content to any API (including OpenAI, Azure, Google, AWS, or any AI/ML service)
- Does not store documents or extracted text on any remote server
- Does not include analytics, crash-reporting, or telemetry instrumentation
- Does not phone home on installation, update check, or startup
- Does not require an internet connection for core document processing
- Does not maintain any account, session, or authentication token that could be used to associate documents with an identity

---

## Dependencies

LexVaultMD depends on open-source npm packages for PDF parsing and CLI functionality. A full Software Bill of Materials (SBOM) listing every dependency, version, and license is provided with Professional and Team tier licenses.

None of the runtime dependencies included in LexVaultMD make outbound network requests during document processing.

---

## Verification

Organizations wishing to independently verify this statement may:

1. **Review the source code** — LexVaultMD is published under BSL 1.1; source code is available at [https://github.com/Kevork-Nexacrawl-dev/lex-vault-md](https://github.com/Kevork-Nexacrawl-dev/lex-vault-md)
2. **Inspect network traffic** — Run LexVaultMD under a network monitor (e.g., Wireshark, Little Snitch, Windows Firewall logs) while processing a document. No outbound connections other than those described above will be observed.
3. **Review the SBOM** — Available with Professional and Team tier licenses; lists all dependencies and their transitive dependencies.

---

## Professional Obligation Context

This statement is provided to assist legal professionals and their IT teams in evaluating LexVaultMD's data-handling posture in the context of professional responsibility obligations, including:

- **ABA Model Rule 1.6** — Confidentiality of Information
- **ABA Model Rule 1.1, Comment 8** — Technology Competence

LexVaultMD does not claim compliance with any specific rule, regulation, or certification standard. This document describes the product's technical architecture and is provided for informational purposes to assist in a professional, independent evaluation.

---

_Questions regarding this statement may be directed to [sales@nexacrawl.dev](mailto:sales@nexacrawl.dev)._

_Nexacrawl reserves the right to update this statement as the product evolves. Material changes will be noted in the product changelog and release notes._
