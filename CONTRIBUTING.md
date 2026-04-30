# Contributing to pdf2md-cli

Thanks for your interest in improving this project.

## Before You Start

- Check existing issues before opening a new one.
- For significant changes, open an issue first to discuss scope.
- Keep pull requests focused and small when possible.

## Development Setup

```bash
git clone https://github.com/Kevork-Nexacrawl-dev/pdf2md-cli.git
cd pdf2md-cli
npm install
```

Run the CLI locally:

```bash
npm start -- local ./file.pdf
npm start -- web https://example.com/file.pdf
```

## Branch Naming

Use one of these prefixes:

- `feat/<short-description>` for new features
- `fix/<short-description>` for bug fixes
- `docs/<short-description>` for documentation updates

Examples:

- `feat/add-page-range-flag`
- `fix/handle-empty-pdf-pages`
- `docs/improve-readme-usage`

## Pull Request Process

- Fork the repository and create your branch from `main`.
- Make your changes with clear commit messages.
- Ensure checks pass in GitHub Actions.
- Open a pull request and fill out the PR template.
- Link related issues (for example: `Closes #12`).

## Code Style and Scope

- Follow the existing ESM Node.js style.
- Avoid unrelated refactors in the same PR.
- Keep behavior changes documented in the PR description.

## Reporting Issues

When filing bugs, include:

- Node.js version
- CLI command used
- A minimal reproducible PDF or URL
- Expected behavior vs actual behavior

## Questions

If you are unsure about a change, open an issue with the `question` label.
