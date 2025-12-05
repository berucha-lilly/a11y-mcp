# Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Prerequisites
- Node.js 18+
- GitHub repository with admin access

## Option 1: Automated Setup (Recommended)

### Step 1: Run Setup Script

```bash
# In your repository
node /path/to/a11y-mcp/scripts/setup-integration.js
```

This will:
- ✅ Create `.github/workflows/` directory
- ✅ Copy MCP server and scripts
- ✅ Set up GitHub Actions workflow
- ✅ Create default configuration
- ✅ Automatically install dependencies

### Step 2: Commit Changes

```bash
git add .github/ .a11y/ scripts/
git commit -m "Add WCAG 2.2 AA accessibility checks"
git push
```

### Step 3: Test

Create a test PR and watch the accessibility checks run automatically!

## Option 2: Manual Setup

### Step 1: Install Dependencies

```bash
npm install
```

### Step 2: Test MCP Server Locally

```bash
# Test MCP server connection
node scripts/mcp-client.js test

# Test full integration
npm run test:mcp

# Test on a file
node cli-scanner.js examples/accessibility-violations.jsx
```

### Step 3: Deploy to Your Repository

#### Copy Files

```bash
# Create directory structure
mkdir -p .github/a11y-mcp
mkdir -p .github/workflows
mkdir -p scripts
mkdir -p .a11y

# Copy MCP server
cp src/mcp-server.js .github/a11y-mcp/
cp src/core/hybrid-analyzer.js .github/a11y-mcp/core/
cp src/core/regex-analyzer.js .github/a11y-mcp/core/
cp scripts/color-contrast.js .github/a11y-mcp/
cp scripts/analyze-pr-mcp.js scripts/
cp scripts/mcp-client.js scripts/

# Copy workflow
cp github-actions/accessibility-review.yml .github/workflows/
```

## 📋 What Gets Installed

```
your-repo/
├── .github/
│   ├── workflows/
│   │   └── accessibility-review.yml    # GitHub Actions workflow
│   └── a11y-mcp/
│       ├── mcp-server.js                # Production MCP server
│       ├── core/
│       │   ├── hybrid-analyzer.js       # Hybrid analysis engine
│       │   └── regex-analyzer.js        # Regex analyzer
│       ├── color-contrast.js            # Color contrast calculator
│       └── package.json                  # Dependencies
├── scripts/
│   ├── analyze-pr-mcp.js                 # PR analysis script
│   └── mcp-client.js                    # MCP client
└── .a11y/
    └── config.json                       # Configuration
```

## ⚙️ Configuration

Edit `.a11y/config.json` (Note: Configuration support is planned for Phase 3, currently uses defaults):

```json
{
  "wcagLevel": "AA",
  "wcagVersion": "2.2",
  "strictMode": true,
  "failureThresholds": {
    "error": 0,
    "warning": 10
  },
  "ignore": [
    "**/*.test.{js,jsx,ts,tsx}",
    "node_modules/**"
  ]
}
```

## 📊 What Gets Checked

- **15+ WCAG 2.2 AA violation checks**
- **HTML/JSX/TSX**: Images, buttons, forms, ARIA, headings, etc.
- **CSS/SCSS**: Focus styles, contrast, sizing, etc.

## 🧪 Testing Locally

### Test MCP Server

```bash
# List available tools
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | node src/mcp-server.js

# Check a file
cat << 'EOF' | node src/mcp-server.js
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "check_accessibility",
    "arguments": {
      "filePath": "examples/accessibility-violations.jsx",
      "content": "<img src=\"test.jpg\" />"
    }
  }
}
EOF
```

### Test CLI Scanner

```bash
# Scan a single file
node cli-scanner.js examples/accessibility-violations.jsx

# Scan multiple files
node cli-scanner.js examples/*.jsx examples/*.tsx
```

## 📚 Next Steps

- **[Beginner's Guide](BEGINNERS_GUIDE.md)** - Comprehensive tutorial
- **[Integration Guide](INTEGRATION_GUIDE.md)** - Detailed integration steps
- **[Architecture](../architecture/ARCHITECTURE.md)** - System design
- **[Comprehensive Checks](../guides/COMPREHENSIVE_CHECKS.md)** - All checks performed

## ✅ That's It!

Your repository is now protected by automated WCAG 2.2 AA accessibility checks on every PR.

---

**Status**: ✅ Production Ready v2.0.0

