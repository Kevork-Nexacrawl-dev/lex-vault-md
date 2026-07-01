# LexVaultMD — Vendor Security Questionnaire — Pre-Answered Template

**Product:** LexVaultMD (`@nexacrawl/lex-vault-md`)  
**Developer:** Nexacrawl  
**Document version:** 1.1  
**For use with:** Professional and Team tier licenses  

> **Instructions for the licensee:** This document provides pre-drafted answers to common vendor security questionnaire questions. Review each answer, fill in any bracketed placeholders (e.g., `[YOUR ORGANIZATION NAME]`), and submit to your security or procurement team. Contact [sales@nexacrawl.dev](mailto:sales@nexacrawl.dev) if your questionnaire requires a response not covered here.

---

## Section 1 — Product and Vendor Identification

**1.1 Vendor name and contact information**
> Nexacrawl. Security and procurement inquiries: [sales@nexacrawl.dev](mailto:sales@nexacrawl.dev). Source repository: [https://github.com/Kevork-Nexacrawl-dev/lex-vault-md](https://github.com/Kevork-Nexacrawl-dev/lex-vault-md)

**1.2 Product name and version**
> LexVaultMD, version `[INSERT CURRENT VERSION — see npm: @nexacrawl/lex-vault-md]`. CLI binary: `lex-vault-md`.

**1.3 Product description**
> LexVaultMD is a command-line tool that converts PDF documents to structured Markdown or JSON, running entirely on the end user's local hardware. It is designed for use in confidentiality-sensitive legal workflows.

**1.4 Is this a SaaS product, on-premises software, or both?**
> On-premises software only. LexVaultMD is distributed as an npm package and (for Professional/Team tier) as a precompiled Windows binary and MSI installer (Authenticode signing in progress). There is no SaaS component, hosted API, or cloud-processing option.

---

## Section 2 — Data Handling and Storage

**2.1 What data does the product collect or process?**
> LexVaultMD processes PDF files provided by the end user. The tool reads the file, extracts text and structure, and writes output to a local file path specified by the user. No data is collected by Nexacrawl.

**2.2 Where is data stored?**
> Data never leaves the end user's machine. Input files are read from local disk; output files are written to local disk. No data is stored on any Nexacrawl or third-party system.

**2.3 Is data transmitted to any external service during processing?**
> No. Document content, extracted text, metadata, and file paths are not transmitted to any external server, API, or service during processing. See the separate "No Data Transmission Statement" for full detail and verification guidance.

**2.4 Does the product use any sub-processors or third-party services that receive customer data?**
> No. LexVaultMD does not send customer data to any sub-processor or third-party service.

**2.5 Does the product store or transmit data in the cloud?**
> No. There is no cloud component in LexVaultMD.

**2.6 Is data encrypted at rest and in transit?**
> In transit: Not applicable — no data is transmitted. At rest: LexVaultMD does not itself encrypt output files; file-system-level encryption (e.g., BitLocker, FileVault) applied by the host operating system is fully compatible with LexVaultMD.

**2.7 What is the data retention policy?**
> Nexacrawl does not retain any customer data because no customer data is received. Output files are retained on the end user's system according to the organization's own document retention policies.

---

## Section 3 — Access Control and Authentication

**3.1 What authentication mechanisms does the product use?**
> LexVaultMD is a local CLI tool. Authentication is managed by the host operating system's user account controls. The tool does not implement its own authentication layer.

**3.2 Does the product require network access or firewall rules?**
> No inbound or outbound firewall rules are required for core document processing. The `lex-vault-md web <url>` command makes an outbound HTTP GET to the URL specified by the user; all other commands require no network access.

**3.3 Does the product support role-based access control (RBAC)?**
> LexVaultMD relies on OS-level file permissions for access control. There is no application-level RBAC. Team tier licenses include admin policy presets that allow organizations to enforce output directory and log path policies.

**3.4 Is multi-factor authentication (MFA) supported or required?**
> Not applicable. LexVaultMD does not manage user accounts or authentication.

---

## Section 4 — Network and Infrastructure

**4.1 What are the network connectivity requirements?**
> None required for local, batch, or convert commands. The `web` subcommand requires outbound HTTP/HTTPS to the URL from which the PDF is being fetched.

**4.2 Does the product call home, send telemetry, or check for updates automatically?**
> No. LexVaultMD does not include telemetry, crash reporting, or automatic update mechanisms. It does not initiate any network connections at startup, shutdown, or during idle operation.

**4.3 Does the product use CDNs, third-party APIs, or managed services?**
> No. All processing uses open-source libraries bundled with the npm package. No CDN or third-party API is called during document processing.

**4.4 What ports does the product use?**
> LexVaultMD does not open or listen on any ports. It is a command-line process that reads from disk and writes to disk.

---

## Section 5 — Software Supply Chain and Integrity

**5.1 Is a Software Bill of Materials (SBOM) available?**
> Yes. A CycloneDX JSON SBOM listing all runtime dependencies, versions, and licenses is included with Professional and Team tier licenses.

**5.2 Are distributed binaries signed?**
> Checksums (SHA-256 and SHA-512) are provided for all distributed artifacts. Authenticode-signed Windows binaries are on the roadmap and will be available before Professional tier general availability. Community tier (npm) is distributed via the npm registry with package integrity enforced by npm's lockfile mechanism.

**5.3 What is the software development lifecycle (SDLC) and security review process?**
> LexVaultMD is developed by Nexacrawl with continuous dependency auditing (`npm audit`) applied at each release. Source code is available for review under BSL 1.1. Security findings may be reported to [sales@nexacrawl.dev](mailto:sales@nexacrawl.dev).

**5.4 What open-source licenses are used by the product's dependencies?**
> The full dependency license list is provided in the SBOM. Primary PDF-parsing dependencies use MIT and Apache 2.0 licenses. A human-readable license summary is available on request.

---

## Section 6 — Incident Response and Support

**6.1 What is the vendor's incident response process?**
> Security vulnerabilities may be reported to [sales@nexacrawl.dev](mailto:sales@nexacrawl.dev). Nexacrawl will acknowledge receipt within 5 business days and provide a remediation timeline. Given LexVaultMD's offline architecture, the incident surface is limited to the integrity of distributed binaries and npm package contents.

**6.2 What is the support SLA?**

| Tier | SLA |
|------|-----|
| Community | Best-effort via GitHub Issues |
| Professional | 72-hour email response |
| Team | Next business day; escalation path to maintainer |
| Enterprise | Custom SLA per agreement |

**6.3 How are security patches distributed?**
> Security patches are published as new npm package versions and (for Professional/Team) as updated signed binary artifacts. Licensees are notified by email on request. Customers are responsible for applying updates on their own systems.

---

## Section 7 — Compliance and Certifications

**7.1 Does the product hold any security certifications (SOC 2, ISO 27001, FedRAMP, etc.)?**
> Not at this time. LexVaultMD is a locally-deployed CLI tool; its architecture eliminates the cloud-processing attack surface that these certifications primarily address. Organizations requiring formal certification are encouraged to review the source code, SBOM, and No Data Transmission Statement as verification inputs.

**7.2 Is the product GDPR-compliant?**
> Nexacrawl does not process or receive personal data from end users. As LexVaultMD processes documents locally on the licensee's own hardware, the licensee's own data governance policies apply. LexVaultMD does not introduce a new data processor relationship.

**7.3 Is the product HIPAA-compliant?**
> LexVaultMD's offline architecture means it does not transmit or store PHI on behalf of the licensee. The licensee is responsible for ensuring that their own infrastructure and workflows meet applicable HIPAA requirements. LexVaultMD does not itself create a Business Associate relationship.

**7.4 Does the product have a vulnerability disclosure policy?**
> Security issues may be reported to [sales@nexacrawl.dev](mailto:sales@nexacrawl.dev). The source repository is available at [https://github.com/Kevork-Nexacrawl-dev/lex-vault-md](https://github.com/Kevork-Nexacrawl-dev/lex-vault-md) for independent security review.

---

_This document is provided as a template. The licensee is responsible for reviewing answers, filling in bracketed placeholders, and confirming accuracy before submission. Nexacrawl is available to answer additional questions at [sales@nexacrawl.dev](mailto:sales@nexacrawl.dev)._
