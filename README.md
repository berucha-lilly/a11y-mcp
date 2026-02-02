# GitHub Accessibility Reviewer MCP Server

[![WCAG 2.2 AA](https://img.shields.io/badge/WCAG-2.2%20AA-green)](https://www.w3.org/WAI/WCAG22/quickref/)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green)](https://nodejs.org/)
[![MCP Server](https://img.shields.io/badge/MCP-Server-purple)](https://modelcontextprotocol.io/)

**GitHub-Based Accessibility Reviewer with MCP**: Automated accessibility checks for pull requests using a Model Context Protocol (MCP) server. It enforces WCAG 2.2 AA rules via a hybrid analyzer (fast regex + ESLint `jsx-a11y`) and posts results back to PRs.

## Table of Contents

- [What it does](#-what-it-does)
- [For Maintainers](#️-for-maintainers-a11y-mcp-repo-only)
- [MCP Tools Reference](#-mcp-tools-reference)
- [GitHub Actions Integration](#-github-actions-integration)
  - [Developer Integration Steps](#developer-integration-steps-in-your-app-repo)
  - [What Happens on Each PR](#what-happens-on-each-pr)
  - [Making Checks Required](#making-checks-required)
  - [Configuration](#configuration-a11yconfigjson)
  - [Testing](#testing)
- [Reference](#-reference)
- [License](#-license)

## ✅ What it does

- Hybrid analysis (regex + ESLint `jsx-a11y`)
- Supports `.js`, `.jsx`, `.ts`, `.tsx`, `.html`, `.htm`, `.css`, `.scss`
- GitHub Actions integration with PR comments
- MCP tools for single-file, batch, and fix suggestions

### MCP Tools Available

The server provides **3 MCP tools** via JSON-RPC:

1. **`check_accessibility`**: Analyze a single file for violations
2. **`check_accessibility_batch`**: Analyze multiple files in one request
3. **`suggest_fix`**: Get detailed remediation guidance for violations

## 🛠️ For Maintainers (a11y-mcp repo only)

> **📍 Integrating into your app?** Skip to [Developer Integration Steps](#developer-integration-steps-in-your-app-repo) instead.

This section is for maintainers working on the a11y-mcp tool itself.

### Prerequisites
- **Node.js 18+** ([Download here](https://nodejs.org/))
- **npm** (comes with Node.js)

### Setup

1. **Install dependencies**
```bash
npm install
```

2. **Run tests**
```bash
npm test
```

3. **Test the setup script**
```bash
node scripts/setup-integration.js
```

## 🔧 MCP Tools Reference

The server implements the Model Context Protocol and provides 3 tools accessible via JSON-RPC:

### Tool 1: `check_accessibility`
Analyze a single file for accessibility violations.

**Input Schema:**
```json
{
  "filePath": "src/components/Button.jsx",
  "content": "<button></button>"
}
```

**Example Request:**
```bash
cat << 'EOF' | node src/mcp-server.js
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "check_accessibility",
    "arguments": {
      "filePath": "test.jsx",
      "content": "<img src='logo.png' />"
    }
  }
}
EOF
```

**Returns:**
- Violation count
- List of violations with line numbers
- Severity levels (error/warning)
- WCAG criteria references
- Fix suggestions

---

### Tool 2: `check_accessibility_batch`
Analyze multiple files in a single request.

**Input Schema:**
```json
{
  "files": [
    {
      "path": "src/App.jsx",
      "content": "..."
    },
    {
      "path": "src/styles.css",
      "content": "..."
    }
  ]
}
```

**Returns:**
- Per-file results
- Summary statistics
- Overall pass/fail status

---

### Tool 3: `suggest_fix`
Get detailed remediation guidance for specific violation types.

**Input Schema:**
```json
{
  "violationId": "img-missing-alt",
  "code": "<img src='logo.png' />"
}
```

**Returns:**
- Step-by-step fix instructions
- Code examples (before/after)
- WCAG documentation links
- Best practices

## 🔗 GitHub Actions Integration

Automatically check every pull request for accessibility violations.

### Developer Integration Steps (in your app repo)

1. From your app repo, clone the tool into a sibling folder (same parent directory):

```bash
git clone https://github.com/berucha-lilly/a11y-mcp.git ../a11y-mcp
```

2. Run the setup script from your app repo (using that sibling path):

```bash
node ../a11y-mcp/scripts/setup-integration.js
```

3. Commit the generated files in your app repo:

```bash
git add .github/ .a11y/ .gitignore
git commit -m "Add accessibility checks"
git push
```

This creates in your app repo:
- `.github/a11y-mcp/` (MCP server + PR analyzer + minimal dependencies)
- `.github/workflows/accessibility-review.yml` (GitHub Actions workflow)
- `.a11y/config.json` (config)

### What Happens on Each PR

1. **Trigger**: Workflow runs on every PR that changes `.js`, `.jsx`, `.html`, `.css`, or `.scss` files
2. **Analysis**: MCP server checks all changed files via JSON-RPC
3. **Reporting**: Bot comments on PR with:
   - Total violations found
   - Per-file breakdown
   - Line numbers and descriptions
   - Fix suggestions
   - WCAG criteria references
4. **Status Check**: Pass/fail check that can block merging

### Example PR Comment

```markdown
## 🔍 Accessibility Review Results (via MCP)

**Files Checked:** 3
**Total Violations:** 5 (4 errors, 1 warning)

### ❌ src/components/Button.jsx
- **Line 12**: [ERROR] Image missing alt attribute
  - Fix: Add alt="description" to image
  - WCAG: 1.1.1 (Level A)

- **Line 24**: [ERROR] Div used as button
  - Fix: Use <button> element instead
  - WCAG: 4.1.2 (Level A)
```

### Making Checks Required

To **block merging** when violations are found:

1. Go to **Repository Settings** → **Branches**
2. Add/edit branch protection rule for `main`
3. Enable "Require status checks to pass before merging"
4. Select "Check Accessibility via MCP"
5. Save changes

### Configuration (.a11y/config.json)

The setup script creates a default config file at `.a11y/config.json` in your app repo. You can customize it to match your team's needs.

#### Default Configuration

```json
{
  "wcagLevel": "AA",
  "wcagVersion": "2.2",
  "strictMode": true,
  "rules": {
    "aria-required": { "enabled": true, "severity": "error" },
    "keyboard-nav": { "enabled": true, "severity": "error" },
    "semantic-html": { "enabled": true, "severity": "error" },
    "alt-text": { "enabled": true, "severity": "error" },
    "heading-hierarchy": { "enabled": true, "severity": "warning" },
    "form-labels": { "enabled": true, "severity": "error" },
    "focus-visible": { "enabled": true, "severity": "warning" }
  },
  "failureThresholds": {
    "error": 0,
    "warning": 10
  },
  "ignore": [
    "**/*.test.{js,jsx,ts,tsx}",
    "**/*.stories.{js,jsx,ts,tsx}",
    "node_modules/**",
    "dist/**",
    "build/**"
  ]
}
```

#### Configuration Options

**Compliance Levels:**
- `wcagLevel`: `"A"`, `"AA"` (default), or `"AAA"` - Sets WCAG compliance target
- `wcagVersion`: `"2.1"` or `"2.2"` (default) - WCAG specification version
- `strictMode`: `true` (default) or `false` - When true, all errors must be fixed before merging

**Rules:**
Each rule can be configured with:
- `enabled`: `true` or `false` - Whether the rule is active
- `severity`: `"error"` or `"warning"` - How violations are reported

**Failure Thresholds:**
- `error`: Maximum number of errors allowed (default: 0)
- `warning`: Maximum number of warnings allowed (default: 10)

When violations exceed these thresholds, the PR check fails.

**Ignore Patterns:**
Glob patterns to exclude files from checks. Common exclusions:
- Test files: `**/*.test.{js,jsx,ts,tsx}`
- Story files: `**/*.stories.{js,jsx,ts,tsx}`
- Build outputs: `dist/**`, `build/**`
- Dependencies: `node_modules/**`

To customize, edit `.a11y/config.json` in your app repo and commit the changes. The workflow will use the updated config on the next PR.

### Testing Your Integration

After running the setup script, follow these steps to verify everything works:

#### 1. Review Configuration
Check the generated config file and customize if needed:
```bash
cat .a11y/config.json
# Edit if needed, then save
```

#### 2. Commit and Push
```bash
git add .github/ .a11y/ .gitignore
git commit -m "Add accessibility checks"
git push
```

#### 3. Local Pre-PR Scan (Optional)
Before creating a test PR, you can check for violations locally:

```bash
# From your app repo root
node .github/a11y-mcp/analyze-pr-mcp.js
```

Results are written to `.github/a11y-mcp/a11y-results.json`. This checks files changed vs `origin/main`.

**Note:** Dependencies are installed automatically by the setup script. If the local scan fails, run `cd .github/a11y-mcp && npm install`.

#### 4. Create a Test PR
Create a PR with accessibility violations to verify the GitHub Actions workflow runs:
```bash
git checkout -b test-a11y
# Make a change with a violation (e.g., <img> without alt)
git commit -am "Test accessibility check"
git push -u origin test-a11y
# Open PR on GitHub
```

You should see the bot comment with violations found.

## 📚 Reference

- **[WCAG 2.2 Guidelines](https://www.w3.org/WAI/WCAG22/quickref/)** - Official WCAG documentation

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.