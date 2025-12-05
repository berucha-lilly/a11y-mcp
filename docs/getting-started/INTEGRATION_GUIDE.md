# Integration Guide for Teams

## Quick Start (5 Minutes)

### Option 1: Automated Setup (Recommended)

```bash
# 1. Clone the template repo (once)
git clone https://github.com/berucha-lilly/a11y-mcp.git

# 2. Run setup script in your target repo
cd /path/to/team-repo
node /path/to/a11y-mcp/scripts/setup-integration.js
```

That's it! The script will:
- ✅ Create `.github/workflows/` directory
- ✅ Copy MCP server and scripts
- ✅ Set up GitHub Actions workflow
- ✅ Create default configuration
- ✅ Automatically install dependencies (no manual npm install needed!)

### Option 2: Manual Setup

See [BEGINNERS_GUIDE.md](BEGINNERS_GUIDE.md) for detailed manual setup instructions.

## What Gets Installed

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
│   ├── analyze-pr-mcp.js               # PR analysis script
│   ├── mcp-client.js                   # MCP client
│   └── color-contrast.js               # Color contrast calculator
└── .a11y/
    └── config.json                      # Configuration
```

## Configuration

> **Note:** Configuration file (`.a11y/config.json`) is created by the setup script but is not yet fully functional. Full configuration support is planned for Phase 3. Currently, all checks run with default settings.

### Basic Configuration (Planned - Phase 3)

Edit `.a11y/config.json` (when fully implemented):

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

### Customize Rules

Enable/disable specific rules:

```json
{
  "rules": {
    "aria-required": { "enabled": true, "severity": "error" },
    "keyboard-nav": { "enabled": true, "severity": "error" },
    "heading-hierarchy": { "enabled": false }
  }
}
```

### LDS Integration (Planned - Phase 2)

```json
{
  "ldsEnforcement": {
    "enabled": true,
    "storybookUrl": "https://storybook.lilly.internal",
    "requireApprovedComponents": true
  }
}
```

> **Note:** LDS integration is planned for Phase 2 and not yet implemented.

## How It Works

1. **PR Created/Updated** → GitHub Actions triggers
2. **Files Analyzed** → Hybrid analyzer (fast regex + AST)
3. **Violations Detected** → WCAG 2.2 AA rules applied
4. **Results Posted** → PR comment + GitHub Check Run
5. **Merge Blocked** → If critical errors found (configurable)

## Customization

### Ignore Specific Files (Planned - Phase 3)

Add to `.a11y/config.json` (when fully implemented):

```json
{
  "ignore": [
    "src/legacy/**",
    "**/*.generated.*",
    "vendor/**"
  ]
}
```

### Adjust Failure Thresholds

```json
{
  "failureThresholds": {
    "error": 0,      // Block merge on any errors
    "warning": 20    // Allow up to 20 warnings
  }
}
```

### Per-Rule Configuration

```json
{
  "rules": {
    "aria-required": {
      "enabled": true,
      "severity": "error"
    },
    "color-contrast": {
      "enabled": false  // Disable if handled by design system
    }
  }
}
```

## Testing Locally

```bash
# Test on a file
node scripts/mcp-client.js test

# Test on example files
node cli-scanner.js examples/accessibility-violations.jsx

# Run full test suite
npm test
```

## Troubleshooting

### Workflow Not Running

1. Check workflow file exists: `.github/workflows/accessibility-review.yml`
2. Verify YAML syntax is valid
3. Check GitHub Actions tab for errors

### No Violations Detected

1. Verify file extensions are supported (`.jsx`, `.tsx`, `.js`, `.css`, `.scss`)
2. Check if files are in ignore patterns
3. Review configuration settings

### False Positives

1. Add specific patterns to ignore list
2. Adjust rule severity levels
3. Use inline comments to suppress (future feature)

## Support

- **Documentation**: See [Documentation Index](../README.md)
- **Architecture**: See [Architecture Overview](../architecture/ARCHITECTURE.md)
- **Examples**: See `examples/` directory
- **Issues**: Report in repository

---

**Ready to integrate?** Run `node scripts/setup-integration.js` in your repository!
