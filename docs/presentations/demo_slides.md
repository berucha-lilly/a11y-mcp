# Slide 1 — Title

# GitHub Accessibility Reviewer (MCP)

- Enforces WCAG 2.2 AA on PRs
- MCP-based toolset: JSON-RPC tools over stdio
- MVP: pattern-based checks + GitHub Actions

---

# Slide 2 — Architecture

- GitHub Actions → MCP Server (src/mcp-server.js) → GitHub API
- Tools exposed: `check_accessibility`, `check_accessibility_batch`, `suggest_fix`
- Local CLI: `cli-scanner.js` for pre-commit / local checks

Diagram (talk through):
```
GitHub Actions
    |
    v
src/mcp-server.js (stdio JSON-RPC)
    |
    v
GitHub API (PR comments, artifacts)
```

---

# Slide 3 — Live demo steps

1. Show MCP server smoke test (tools/list)
2. Run `node cli-scanner.js examples/accessibility-violations.html`
3. Run `./run.sh <dir>` to generate `a11y-results-*.txt`
4. Push a demo branch and open PR to show Actions + PR comment

---

# Slide 4 — How to interpret results

- Each violation includes: severity, WCAG ref, line, description, fix suggestions
- Summary shows: files scanned, files with violations, total violation counts
- Exit codes: 0 = pass, 3 = violations found (CI fail if you depend on exit code)
- Artifacts: `a11y-results-*.txt` (human readable) and `artifacts/combined.json` (machine readable)

---

# Slide 5 — Roadmap

- Phase 2 (Next): Lilly Design System (LDS) integration
  - Validate Storybook components, recommend LDS alternatives
- Phase 3 (Future): AST-based parsing, expanded WCAG checks, AI-assisted fixes

Contact & next steps:
- Run local scans, pilot on one repo, then roll out checks and enable branch protection
