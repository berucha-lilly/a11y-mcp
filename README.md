# GitHub Accessibility Reviewer MCP Server

[![WCAG 2.2 AA](https://img.shields.io/badge/WCAG-2.2%20AA-green)](https://www.w3.org/WAI/WCAG22/quickref/)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green)](https://nodejs.org/)
[![MCP Server](https://img.shields.io/badge/MCP-Server-purple)](https://modelcontextprotocol.io/)

**GitHub-Based Accessibility Reviewer with MCP**: An automated accessibility code review workflow integrated into the GitHub pipeline, using a customizable Model Context Protocol (MCP). The system enforces WCAG 2.2 AA standards on all pull requests, with planned integration of the Lilly Design System (LDS) for component validation. This reduces manual review effort, prevents accessibility regressions, and establishes a scalable foundation for future AI-assisted enforcement.

## 🎯 Project Vision

**Current Phase**: MVP - Core WCAG 2.2 AA enforcement via GitHub Actions  
**Next Phase**: LDS component validation and advanced rule customization  
**End Goal**: AI-assisted accessibility enforcement with comprehensive design system integration

## 🌟 Features

### Core Functionality (Current MVP)
- **Multi-File Type Support**: Analyze `.js`, `.jsx`, `.ts`, `.tsx`, `.html`, `.htm`, `.css`, and `.scss` files
- **WCAG 2.2 AA Compliance**: Pattern-based detection of 10 common accessibility violations
- **GitHub Actions Integration**: Automated PR checks with detailed violation reports
- **MCP Protocol**: Standardized JSON-RPC interface for tool integration
- **Batch Processing**: Analyze multiple files in a single request
- **Fix Suggestions**: Actionable remediation guidance for each violation type

### Planned Features (Roadmap)
- **LDS Integration**: Validate Lilly Design System component usage and enforce approved patterns
- **Customizable Rules**: Configure rule severity, exclusions, and thresholds per repository
- **AST-Based Analysis**: Advanced parsing for complex violation detection
- **AI-Assisted Fixes**: Automated code suggestions and PR auto-fixes

### Accessibility Checks Implemented

#### Images & Media
1. **Missing Alt Text**: Detects `<img>` tags without `alt` attributes
2. **Icon Accessibility**: Identifies icon elements (Font Awesome, etc.) without labels

#### Interactive Elements
3. **Div as Button**: Flags `<div>` elements with `onClick` handlers (should use `<button>`)
4. **Empty Buttons**: Detects buttons without text content or `aria-label`
5. **Generic Link Text**: Finds links with non-descriptive text ("click here", "read more")

#### Forms
6. **Inputs Without Labels**: Identifies form inputs missing associated `<label>` elements

#### Document Structure
7. **Missing Language**: Detects HTML documents without `lang` attribute
8. **Missing Page Title**: Identifies HTML without `<title>` element
9. **Iframes Without Title**: Flags `<iframe>` elements without `title` attribute

#### Focus & Keyboard
10. **Missing Focus Styles**: Detects CSS with `:focus { outline: none }` without alternative focus indicators

### MCP Tools Available

The server provides **3 MCP tools** via JSON-RPC:

1. **`check_accessibility`**: Analyze a single file for violations
2. **`check_accessibility_batch`**: Analyze multiple files in one request
3. **`suggest_fix`**: Get detailed remediation guidance for violations

## 🚀 Quick Start

### Prerequisites
- **Node.js 18+** ([Download here](https://nodejs.org/))
- **npm** (comes with Node.js)
- **GitHub repository** with admin access (for GitHub Actions integration)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/berucha-lilly/a11y-mcp.git
cd a11y-mcp
```

2. **Install dependencies**
```bash
npm install
```

3. **Test the MCP server**
```bash
# List available MCP tools
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | node mcp-server-simple.js
```

**Expected output**: JSON response listing 3 available tools

### Local Testing with CLI Scanner

```bash
# Test a single file
node cli-scanner.js path/to/your-file.jsx

# Test all files in a directory
./run.sh path/to/directory

# View results in JSON format
node cli-scanner.js path/to/your-file.jsx --json
```

### GitHub Actions Integration

See the **[Complete Beginner's Guide](docs/BEGINNERS_GUIDE.md)** for detailed step-by-step setup instructions.

## � MCP Tools Reference

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
cat << 'EOF' | node mcp-server-simple.js
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
  "violationType": "img-missing-alt",
  "context": {
    "line": 42,
    "code": "<img src='logo.png' />"
  }
}
```

**Returns:**
- Step-by-step fix instructions
- Code examples (before/after)
- WCAG documentation links
- Best practices

## 🔗 GitHub Actions Integration

Automatically check every pull request for accessibility violations.

### Setup (Quick Version)

1. **Copy MCP server to your repository:**
```bash
mkdir -p .github/a11y-mcp
cp mcp-server-simple.js .github/a11y-mcp/
cp package.json package-lock.json .github/a11y-mcp/
cd .github/a11y-mcp && npm ci && cd ../..
```

2. **Add workflow file:**
```bash
mkdir -p .github/workflows
cp github-actions/accessibility-mcp-workflow.yml .github/workflows/
```

3. **Commit and push:**
```bash
git add .github/
git commit -m "Add MCP accessibility checks"
git push
```

### What Happens on Each PR

1. **Trigger**: Workflow runs on every PR that changes `.js`, `.jsx`, `.ts`, `.tsx`, `.html`, `.css`, or `.scss` files
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

**See the [Beginner's Guide](docs/BEGINNERS_GUIDE.md) for detailed step-by-step instructions with screenshots.**

## 📖 Usage Examples

### Example 1: Testing a Single File Locally

```bash
# Create a test file with violations
cat > test.jsx << 'EOF'
export const MyComponent = () => {
  return (
    <div>
      <img src="logo.png" />
      <div onClick={() => alert('hi')}>Click me</div>
    </div>
  );
};
EOF

# Run the CLI scanner
node cli-scanner.js test.jsx
```

**Output:**
```
📄 File: test.jsx
❌ Result: Found 2 accessibility violation(s):

1. [ERROR] Image missing alt attribute
   📍 Line: 4
   💡 Fix: Add alt="description" to the image tag
   📚 WCAG: 1.1.1 (Level A)

2. [ERROR] Div used as button
   📍 Line: 5
   💡 Fix: Use <button> element instead of div with onClick
   📚 WCAG: 4.1.2 (Level A)
```

---

### Example 2: Using MCP Protocol Directly

```bash
# Check a file via JSON-RPC
cat << 'EOF' | node mcp-server-simple.js 2>/dev/null | jq
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "check_accessibility",
    "arguments": {
      "filePath": "Button.jsx",
      "content": "<button></button>"
    }
  }
}
EOF
```

**Returns:** JSON with violation details

---

### Example 3: Batch Checking Multiple Files

```bash
# Use the batch tool
cat << 'EOF' | node mcp-server-simple.js 2>/dev/null | jq
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "check_accessibility_batch",
    "arguments": {
      "files": [
        {
          "path": "App.jsx",
          "content": "<div onClick={...}>Click</div>"
        },
        {
          "path": "styles.css",
          "content": ":focus { outline: none; }"
        }
      ]
    }
  }
}
EOF
```

---

### Example 4: Getting Fix Suggestions

```bash
# Request fix suggestions for a violation type
cat << 'EOF' | node mcp-server-simple.js 2>/dev/null | jq
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "suggest_fix",
    "arguments": {
      "violationType": "img-missing-alt",
      "context": {
        "code": "<img src='logo.png' />",
        "line": 10
      }
    }
  }
}
EOF
```

**Returns:** Detailed remediation steps and code examples

## 🏗️ Architecture

### System Overview

```
┌─────────────────────┐
│  GitHub Actions     │  Triggers on PR
└──────────┬──────────┘
           │ (JSON-RPC)
           ▼
┌─────────────────────┐
│  MCP Server         │  mcp-server-simple.js
│  - check_a11y       │  Analyzes files via pattern matching
│  - batch_check      │  Returns violations + suggestions
│  - suggest_fix      │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  GitHub API         │  Posts results to PR
└─────────────────────┘

Future: LDS Storybook integration →
```

### Core Components

**1. MCP Server** (`mcp-server-simple.js`)
- Implements Model Context Protocol (JSON-RPC 2.0)
- Provides 3 tools for accessibility checking
- Pattern-based violation detection using regex
- Returns structured JSON results

**2. CLI Scanner** (`cli-scanner.js`)
- Standalone command-line interface
- Same analysis logic as MCP server
- Human-readable output for local testing
- JSON output mode for CI/CD

**3. GitHub Actions Workflow** (`github-actions/accessibility-mcp-workflow.yml`)
- Detects changed files in PR
- Calls MCP server via stdio/JSON-RPC
- Posts formatted results as PR comment
- Uploads artifacts (request/response logs)

**4. Batch Runner** (`run.sh`)
- Shell script for testing multiple files
- Error-resilient (continues on failures)
- Generates timestamped summary reports

### Analysis Method

**Pattern Matching** (Current Implementation):
- Regex-based detection of common patterns
- Fast and lightweight
- No AST parsing required
- Covers 10 most common WCAG violations

**Future Enhancement - LDS Integration**:
- Query LDS Storybook API for component specs
- Validate component usage against approved patterns
- Suggest LDS alternatives for non-standard elements
- Track design system adoption metrics

**Future Enhancement - AST Parsing** (TypeScript build in `old-experimental/`):
- AST-based parsing with Babel/PostCSS
- More sophisticated rule engine
- Additional WCAG criteria coverage

## 🛠️ Development

### Project Structure

```
a11y-mcp/
├── mcp-server-simple.js        # Main MCP server (production)
├── cli-scanner.js              # CLI testing tool
├── run.sh                      # Batch file scanner
├── package.json                # Dependencies
├── mcp-server.json             # MCP configuration
├── github-actions/
│   └── accessibility-mcp-workflow.yml  # GitHub Actions workflow
├── docs/
│   ├── BEGINNERS_GUIDE.md              # Step-by-step setup guide
│   └── MCP_GITHUB_ACTIONS_SETUP.md     # Technical reference
├── examples/                   # Test files with violations
├── old-experimental/           # Archive of experimental features
│   └── typescript-build/       # TypeScript implementation (future)
└── README.md                   # This file
```

### Adding New Accessibility Checks

Edit `mcp-server-simple.js` and add to the `analyzeFile()` function:

```javascript
// Example: Check for missing form labels
const formLabelPattern = /<input[^>]+type=["'](?:text|email|password)[^>]*>/gi;
let match;
while ((match = formLabelPattern.exec(content)) !== null) {
  const lineNum = content.substring(0, match.index).split('\n').length;
  const inputTag = match[0];
  
  // Check if input has associated label
  const hasId = /id=["'][^"']+["']/.test(inputTag);
  const hasAriaLabel = /aria-label=["'][^"']+["']/.test(inputTag);
  
  if (!hasId && !hasAriaLabel) {
    violations.push({
      type: 'error',
      rule: 'input-missing-label',
      message: 'Form input missing associated label',
      line: lineNum,
      wcagCriteria: '3.3.2',
      wcagLevel: 'A',
      suggestions: [
        'Add a <label> element with for="inputId"',
        'Add aria-label="description" to the input'
      ]
    });
  }
}
```

### Customizing Severity Levels

Change `type: 'error'` to `type: 'warning'` for non-blocking checks.

### Testing Changes Locally

```bash
# Test your changes on example files
node cli-scanner.js examples/accessibility-violations.jsx

# Test via MCP protocol
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | node mcp-server-simple.js

# Test batch processing
./run.sh examples/
```

## 🆘 Troubleshooting

### Common Issues

**Q: MCP server doesn't start**
```bash
# Check Node.js version (must be 18+)
node --version

# Verify dependencies are installed
npm list @modelcontextprotocol/sdk
```

**Q: No violations found but I see issues in my code**
- Check if file extension is supported (`.js`, `.jsx`, `.ts`, `.tsx`, `.html`, `.css`, `.scss`)
- Violation type may not be in the current 10 checks
- Pattern matching may not catch complex cases

**Q: GitHub Actions workflow doesn't run**
```bash
# Verify workflow file exists
ls .github/workflows/accessibility-check.yml

# Check YAML syntax is valid
cat .github/workflows/accessibility-check.yml
```

**Q: "Module not found" error in GitHub Actions**
- Ensure `package.json` and `package-lock.json` are in `.github/a11y-mcp/`
- Check that `npm ci` step runs before the MCP server is invoked

**Q: False positives in results**
- Review the specific pattern being matched
- Consider if the violation is actually valid
- Add to ignored files/patterns if needed

### Testing Locally First

Always test changes locally before pushing to GitHub:

```bash
# 1. Test MCP server starts
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | node mcp-server-simple.js

# 2. Test on a known file with violations
node cli-scanner.js examples/accessibility-violations.jsx

# 3. Test batch processing
./run.sh examples/

# 4. If all pass, commit and push
git add .
git commit -m "Update accessibility checks"
git push
```

## 📚 Documentation

- **[Beginner's Guide](docs/BEGINNERS_GUIDE.md)** - Complete step-by-step setup (recommended for first-time users)
- **[Technical Reference](docs/MCP_GITHUB_ACTIONS_SETUP.md)** - Architecture and advanced configuration
- **[Examples](examples/)** - Sample files with accessibility violations for testing
- **[WCAG 2.2 Guidelines](https://www.w3.org/WAI/WCAG22/quickref/)** - Official WCAG documentation

## 🔄 Roadmap

### ✅ Phase 1 - MVP (Current)
- ✅ 10 common accessibility checks (WCAG 2.2 AA)
- ✅ Pattern-based detection (regex)
- ✅ MCP protocol implementation
- ✅ GitHub Actions integration
- ✅ CLI scanner for local testing
- ✅ Batch file processing
- ✅ PR commenting with violation details

### 🚧 Phase 2 - LDS Integration (Next)
- 🔲 **Lilly Design System (LDS) validation**: Enforce use of approved LDS components
- 🔲 **Component specifications**: Query LDS Storybook for accessibility requirements
- 🔲 **Alternative suggestions**: Recommend LDS components for non-standard elements
- 🔲 **Design system compliance scoring**: Track LDS adoption across repositories

### 🔮 Phase 3 - Advanced Features (Future)
- 🔲 AST-based parsing (TypeScript implementation in `old-experimental/`)
- 🔲 Additional WCAG criteria (color contrast, heading hierarchy, ARIA validation)
- 🔲 Configurable rules engine (per-repo `.a11y/config.json`)
- 🔲 HTML rendering for runtime checks (detect dynamic violations)
- 🔲 AI-assisted code fixes (automated PR suggestions)
- 🔲 VS Code extension for inline checks
- 🔲 Compliance dashboards and analytics

### 🎯 End Goal
**AI-Assisted Accessibility Enforcement**: A comprehensive system that combines:
- Real-time WCAG 2.2 AA validation
- LDS component enforcement
- Automated fix generation via AI
- Historical compliance tracking
- Team education and best practices

## 📄 License

MIT License - see [LICENSE.txt](LICENSE.txt) file for details.

## 🙏 Acknowledgments

- **W3C Web Accessibility Initiative** for WCAG 2.2 guidelines
- **Model Context Protocol** community for standardized tool interface
- **GitHub Actions** for CI/CD automation capabilities

---

**Ready to get started?** Check out the **[Beginner's Guide](docs/BEGINNERS_GUIDE.md)** for step-by-step setup instructions! 🚀