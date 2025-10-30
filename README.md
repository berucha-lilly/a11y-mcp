# GitHub Accessibility Reviewer MCP Server

[![WCAG 2.2 AA](https://img.shields.io/badge/WCAG-2.2%20AA-green)](https://www.w3.org/WAI/WCAG22/quickref/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue)](https://www.typescriptlang.org/)
[![MCP Server](https://img.shields.io/badge/MCP-Server-purple)](https://modelcontextprotocol.io/)

A comprehensive Model Context Protocol (MCP) server for automated accessibility code review that enforces WCAG 2.2 AA standards. This server analyzes source code files (.jsx, .tsx, .js, .css, .scss) for accessibility violations, provides actionable fix suggestions, validates Lilly Design System (LDS) component usage, and generates detailed compliance reports for GitHub pull request integration.

## 🌟 Features

### Core Functionality
- **Multi-File Type Support**: Analyze .jsx, .tsx, .js, .css, and .scss files
- **WCAG 2.2 AA Compliance**: Comprehensive rule engine covering all Level A and AA criteria
- **Static Code Analysis**: AST-based parsing using Babel for JavaScript/TypeScript and PostCSS for stylesheets
- **Hot-Reload Configuration**: Real-time configuration updates without server restart
- **LDS Integration**: Validate Lilly Design System component usage and provide component specifications

### Accessibility Rules Implemented

#### Priority 1 - Blocking Violations (Error Level)
1. **ARIA Attributes**
   - Required ARIA attributes for specific roles
   - Valid `aria-labelledby` and `aria-describedby` references
   - No redundant or conflicting ARIA usage
   - Proper role attribute validation

2. **Keyboard Navigation**
   - All interactive elements keyboard accessible
   - Logical tab order (tabIndex usage validation)
   - Focus visible indicators in CSS
   - No keyboard traps
   - Skip links for navigation

3. **Semantic HTML**
   - Proper heading hierarchy (h1→h2→h3 sequence)
   - Form inputs have associated labels
   - Buttons vs links (semantic correctness)
   - Landmark regions (header, nav, main, footer)
   - Lists use proper markup

4. **Alternative Text**
   - Images have alt attributes
   - Decorative images: alt=""
   - Complex images have detailed descriptions
   - Icon buttons have accessible names

5. **Focus Management**
   - Modal focus trapping validation
   - Focus restoration after interactions
   - Visible focus indicators in CSS

#### Priority 2 - Warnings
- Missing language attribute
- Empty heading tags
- Suspicious link text ("click here")
- Duplicate IDs
- Missing page title

### LDS (Lilly Design System) Integration
- **Component Validation**: Verify usage of approved LDS components
- **Component Specifications**: Fetch component documentation and accessibility requirements
- **Alternative Suggestions**: Recommend LDS components for non-standard elements
- **Cache Management**: Efficient caching with configurable TTL

## 🚀 Installation

### Prerequisites
- Node.js 18.0.0 or higher
- npm or yarn package manager

### Installation Steps

1. **Clone or download the project**
```bash
# The project is ready to use as-is
cd a11y-mcp
```

2. **Install dependencies**
```bash
npm install
```

3. **Build TypeScript**
```bash
npm run build
```

4. **Run tests to verify functionality**
```bash
npm test
```

## 🔧 Configuration

The server uses a configuration file at `.a11y/config.json` with the following structure:

```json
{
  "$schema": "https://a11y-mcp.internal/schema/v1",
  "wcagLevel": "AA",
  "wcagVersion": "2.2",
  "strictMode": true,
  "ldsEnforcement": {
    "enabled": true,
    "storybookUrl": "https://storybook.lilly.internal",
    "requireApprovedComponents": true,
    "allowedExceptions": ["src/legacy/**"],
    "cacheComponents": true,
    "cacheTTL": 3600
  },
  "rules": {
    "aria-required": {
      "enabled": true,
      "severity": "error"
    },
    "keyboard-nav": {
      "enabled": true,
      "severity": "error",
      "checkTabIndex": true,
      "requireFocusStyles": true
    },
    "semantic-html": {
      "enabled": true,
      "severity": "error"
    },
    "alt-text": {
      "enabled": true,
      "severity": "error"
    },
    "lds-components": {
      "enabled": true,
      "severity": "warning",
      "suggestAlternatives": true
    }
  },
  "excludedRules": ["color-contrast"],
  "failureThresholds": {
    "error": 0,
    "warning": 10
  },
  "ignore": [
    "src/**/*.test.tsx",
    "src/**/*.stories.tsx"
  ]
}
```

### Configuration Options

- **wcagLevel**: WCAG compliance level (A, AA, AAA)
- **wcagVersion**: WCAG version (e.g., "2.2")
- **strictMode**: Enable strict validation mode
- **ldsEnforcement**: Lilly Design System integration settings
- **rules**: Individual rule configuration and severity levels
- **excludedRules**: Rules to exclude from analysis
- **failureThresholds**: Maximum allowed violations before failing
- **ignore**: File patterns to exclude from scanning

## 📋 Available MCP Tools

### `check_accessibility`
Analyze code for WCAG violations across multiple file types.

**Parameters:**
- `code` (string, required): Source code content to analyze
- `fileType` (string, required): File type (jsx, tsx, js, css, scss)
- `filePath` (string, optional): File path for context
- `config` (object, optional): Override configuration

**Example:**
```typescript
await client.call_tool("check_accessibility", {
  "code": "<img src='test.jpg' />",
  "fileType": "jsx",
  "filePath": "components/Image.tsx"
});
```

### `suggest_fix`
Generate remediation suggestions for specific violations.

**Parameters:**
- `violation` (object, required): Violation object with details
- `code` (string, required): Current code with the violation
- `context` (object, optional): Additional context

**Example:**
```typescript
await client.call_tool("suggest_fix", {
  "violation": {
    "id": "img-missing-alt",
    "title": "Image missing alt attribute"
  },
  "code": "<img src='test.jpg' />"
});
```

### `query_lds_component`
Fetch component specifications from Lilly Design System Storybook.

**Parameters:**
- `componentName` (string, required): Name of the LDS component

**Example:**
```typescript
await client.call_tool("query_lds_component", {
  "componentName": "Button"
});
```

### `get_config` / `update_config`
Manage accessibility scanning configuration.

**Example:**
```typescript
await client.call_tool("get_config", {});
await client.call_tool("update_config", {
  "config": {
    "rules": {
      "aria-required": {
        "enabled": true
      }
    }
  }
});
```

### `generate_report`
Generate comprehensive accessibility report from scan results.

**Parameters:**
- `scanResult` (object, required): Scan result from check_accessibility
- `format` (string, optional): Report format (json, html, markdown)
- `includeFixes` (boolean, optional): Include fix suggestions

## 📊 MCP Resources

### `wcag://2.2/AA/rules`
Complete set of WCAG 2.2 Level A and AA success criteria and conformance requirements.

### `lds://storybook/components`
Lilly Design System component specifications and accessibility requirements.

## 🎯 MCP Prompts

### `accessibility-review`
Generate comprehensive accessibility review prompts for code review.

### `wcag-guidance`
Get WCAG 2.2 AA compliance guidance for specific scenarios.

## 🧪 Testing

Run the comprehensive test suite:

```bash
npm test
```

Run tests in watch mode:

```bash
npm run test:watch
```

### Test Coverage
The test suite covers:
- All WCAG rule implementations
- File type-specific parsing
- Configuration management
- LDS integration
- Edge cases and error handling
- Performance and statistics calculation

## 📖 Usage Examples

### Example 1: Basic JSX Analysis

```typescript
import { AccessibilityScanner } from 'a11y-mcp';

const scanner = new AccessibilityScanner();
await scanner.initialize();

const code = `
  <div onClick={handleClick}>Click me</div>
  <img src="test.jpg" />
  <input type="text" />
`;

const result = await scanner.scanFile('example.tsx', code);

console.log('Violations found:', result.violations.length);
console.log('Errors:', result.statistics.errors);
console.log('Estimated fix time:', result.statistics.estimatedFixTime);
```

### Example 2: CSS Analysis

```typescript
const css = `
  .button {
    background: blue;
    color: white;
    /* Missing focus styles */
  }
`;

const result = await scanner.scanFile('styles.css', css);
const focusViolation = result.violations.find(v => v.id === 'focus-visible');

if (focusViolation) {
  console.log('Fix suggestion:', focusViolation.fixSuggestions[0]);
}
```

### Example 3: Multiple File Analysis

```typescript
const files = [
  { path: 'components/Button.tsx', content: buttonCode },
  { path: 'styles/main.css', content: cssCode },
  { path: 'pages/Home.tsx', content: homeCode }
];

const result = await scanner.scanFiles(files);

console.log('Overall compliance score:', result.summary.complianceScore);
console.log('Top violation categories:', result.summary.topCategories);
```

## 🔗 Integration with GitHub

### GitHub Actions Integration

Create a workflow file `.github/workflows/accessibility.yml`:

```yaml
name: Accessibility Review

on:
  pull_request:
    paths:
      - 'src/**/*.{tsx,jsx,js,css,scss}'

jobs:
  accessibility:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm install
        
      - name: Run accessibility scan
        run: npm run scan --src src
        
      - name: Comment PR with results
        uses: actions/github-script@v7
        with:
          script: |
            // Comment PR with accessibility results
            const results = fs.readFileSync('accessibility-report.json');
            const summary = JSON.parse(results).summary;
            
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `🔍 Accessibility Analysis Results:\n\n` +
                    `- Compliance Score: ${summary.complianceScore}%\n` +
                    `- Total Violations: ${summary.totalViolations}\n` +
                    `- Files Analyzed: ${summary.totalFiles}`
            });
```

### MCP Client Integration

For integrating with MCP-compatible tools:

```json
{
  "mcpServers": {
    "accessibility-reviewer": {
      "command": "sh",
      "args": ["/path/to/a11y-mcp/run.sh"]
    }
  }
}
```

## 🏗️ Architecture

### Core Components

1. **Scanner** (`src/scanner.ts`)
   - Main orchestration logic
   - File parsing coordination
   - Results aggregation

2. **Rule Engine** (`src/rules/wcag-engine.ts`)
   - WCAG 2.2 AA rule implementations
   - Rule registration and execution
   - Violation detection

3. **Parsers**
   - JavaScriptParser (`src/parsers/javascript.ts`)
   - CSSParser (`src/parsers/css.ts`)
   - ParserFactory (`src/parsers/index.ts`)

4. **LDS Integration** (`src/lds/index.ts`)
   - Component validation
   - Storybook API integration
   - Caching mechanism

5. **Configuration** (`src/config/index.ts`)
   - Hot-reload configuration management
   - Validation and defaults

### Data Flow

```
Source Code → Parser → AST → Rule Engine → Violations → Report
     ↓                                           ↓
Configuration ←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←
```

## 🛠️ Development

### Project Structure

```
a11y-mcp/
├── src/
│   ├── parsers/           # File type parsers
│   ├── rules/             # WCAG rule implementations  
│   ├── lds/               # LDS integration
│   ├── config/            # Configuration management
│   ├── types/             # TypeScript definitions
│   ├── scanner.ts         # Main scanner
│   └── index.ts           # MCP server
├── tests/                 # Test suite
├── examples/              # Sample code with violations
├── docs/                  # Additional documentation
├── run.sh                 # Startup script
├── mcp-server.json        # MCP configuration
└── package.json
```

### Adding New Rules

1. **Create rule implementation** in `src/rules/wcag-engine.ts`:

```typescript
private createCustomRule(): AccessibilityRule {
  return {
    id: 'custom-rule-id',
    name: 'Custom Rule Name',
    description: 'Rule description',
    wcagCriteria: ['X.Y.Z'],
    severity: 'error',
    appliesTo: ['jsx', 'tsx'],

    check(context: RuleContext): RuleResult {
      const violations: any[] = [];
      
      // Rule logic here
      context.node.findNodesMatching(/* logic */);
      
      return { violations };
    }
  };
}
```

2. **Register the rule** in the `initializeRules()` method:

```typescript
this.registerRule(this.createCustomRule());
```

3. **Add to configuration** in `DEFAULT_CONFIG`:

```typescript
rules: {
  'custom-rule-id': {
    enabled: true,
    severity: 'error'
  }
}
```

### Adding New File Types

1. **Create parser** implementing `BaseParser`
2. **Register in ParserFactory**
3. **Update file type handling**
4. **Add to test suite**

## 📈 Performance

### Optimization Features
- **Incremental Parsing**: Only re-parse changed files
- **Caching**: LDS component data cached with configurable TTL
- **Hot-Reload**: Configuration changes applied without restart
- **Efficient AST Traversal**: Optimized node matching patterns

### Performance Considerations
- Large files (>10MB) may impact parsing speed
- Complex CSS/SCSS files with extensive nesting
- Multiple simultaneous file processing
- Real-time configuration updates

## 🤝 Contributing

### Guidelines
1. **Accessibility-First**: All contributions must maintain or improve accessibility
2. **Test Coverage**: New features require corresponding tests
3. **Documentation**: Update documentation for new features
4. **WCAG Compliance**: Ensure rule implementations align with WCAG 2.2 AA

### Development Workflow
1. Fork the repository
2. Create feature branch: `git checkout -b feature/new-rule`
3. Implement changes with tests
4. Run test suite: `npm test`
5. Update documentation
6. Submit pull request

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🆘 Support

### Common Issues

**Q: How do I handle false positives?**
A: Use the configuration file to exclude specific rules or adjust severity levels.

**Q: Can I integrate with existing linting tools?**
A: Yes, the scanner can complement ESLint, Stylelint, and other tools.

**Q: How do I customize LDS component validation?**
A: Update the `ldsEnforcement` section in the configuration file.

**Q: What's the difference from axe-core?**
A: This tool analyzes source code statically, while axe-core analyzes rendered DOM.

### Getting Help

- **Issues**: Report bugs and feature requests
- **Documentation**: Check the `docs/` directory for detailed guides
- **Examples**: Review `examples/` directory for usage patterns
- **Tests**: Examine test cases for expected behavior

## 🔄 Changelog

### v1.0.0
- Initial release
- WCAG 2.2 AA rule implementation
- Multi-file type support
- LDS integration
- Configuration management
- Comprehensive test suite

## 🙏 Acknowledgments

- **W3C Web Accessibility Initiative** for WCAG guidelines
- **Deque Labs** for axe-core inspiration
- **Lilly Design System** team for component specifications
- **Model Context Protocol** community for server framework