#!/usr/bin/env node
/**
 * Easy Integration Setup Script
 * One-command setup for teams to integrate accessibility checks
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REPO_ROOT = path.resolve(__dirname, '..');

console.log('🚀 Setting up Accessibility Reviewer for your repository...\n');

// Step 1: Create .github directory structure
console.log('📁 Creating directory structure...');
const githubDir = path.join(process.cwd(), '.github');
const workflowsDir = path.join(githubDir, 'workflows');
const a11yDir = path.join(githubDir, 'a11y-mcp');
const a11yCoreDir = path.join(a11yDir, 'core');
const scriptsDir = path.join(process.cwd(), 'scripts');

[githubDir, workflowsDir, a11yDir, a11yCoreDir, scriptsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`   ✅ Created ${dir}`);
  }
});

// Step 2: Copy MCP server and dependencies
console.log('\n📦 Copying MCP server files...');
const filesToCopy = [
  { src: 'src/mcp-server.js', dst: path.join(a11yDir, 'mcp-server.js') },
  { src: 'src/core/hybrid-analyzer.js', dst: path.join(a11yDir, 'core', 'hybrid-analyzer.js') },
  { src: 'src/core/regex-analyzer.js', dst: path.join(a11yDir, 'core', 'regex-analyzer.js') },
  { src: 'scripts/color-contrast.js', dst: path.join(a11yDir, 'color-contrast.js') },
  { src: 'scripts/analyze-pr-mcp.js', dst: path.join(scriptsDir, 'analyze-pr-mcp.js') },
  { src: 'scripts/mcp-client.js', dst: path.join(scriptsDir, 'mcp-client.js') }
];

filesToCopy.forEach(({ src, dst }) => {
  const srcPath = path.join(REPO_ROOT, src);
  if (fs.existsSync(srcPath)) {
    // Ensure destination directory exists
    const dstDir = path.dirname(dst);
    if (!fs.existsSync(dstDir)) {
      fs.mkdirSync(dstDir, { recursive: true });
    }
    
    fs.copyFileSync(srcPath, dst);
    console.log(`   ✅ Copied ${src} → ${path.relative(process.cwd(), dst)}`);
    
    // Fix import paths in copied hybrid-analyzer.js
    if (src === 'src/core/hybrid-analyzer.js') {
      let content = fs.readFileSync(dst, 'utf8');
      // Update color-contrast import path (from ../../scripts to ../)
      content = content.replace(
        /from ['"]\.\.\/\.\.\/scripts\/color-contrast\.js['"]/g,
        "from '../color-contrast.js'"
      );
      fs.writeFileSync(dst, content);
      console.log(`   ✅ Fixed import paths in hybrid-analyzer.js`);
    }
  } else {
    console.log(`   ⚠️  ${src} not found, skipping`);
  }
});

// Step 3: Copy package.json dependencies
console.log('\n📋 Setting up dependencies...');
const packageJsonPath = path.join(REPO_ROOT, 'package.json');
if (fs.existsSync(packageJsonPath)) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const a11yPackageJson = {
    name: 'a11y-mcp-integration',
    version: '1.0.0',
    type: 'module',
    dependencies: {
      '@modelcontextprotocol/sdk': packageJson.dependencies['@modelcontextprotocol/sdk'],
      '@octokit/rest': packageJson.dependencies['@octokit/rest']
    }
  };
  
  fs.writeFileSync(
    path.join(a11yDir, 'package.json'),
    JSON.stringify(a11yPackageJson, null, 2)
  );
  console.log('   ✅ Created package.json');
}

// Step 4: Copy GitHub Actions workflow
console.log('\n⚙️  Setting up GitHub Actions workflow...');
const workflowSrc = path.join(REPO_ROOT, 'github-actions', 'accessibility-review.yml');
const workflowDst = path.join(workflowsDir, 'accessibility-review.yml');

if (fs.existsSync(workflowSrc)) {
  fs.copyFileSync(workflowSrc, workflowDst);
  console.log(`   ✅ Copied workflow → ${path.relative(process.cwd(), workflowDst)}`);
} else {
  console.log('   ⚠️  Workflow file not found');
}

// Step 5: Create default configuration
console.log('\n⚙️  Creating default configuration...');
const configDir = path.join(process.cwd(), '.a11y');
if (!fs.existsSync(configDir)) {
  fs.mkdirSync(configDir, { recursive: true });
}

const defaultConfig = {
  "$schema": "https://a11y-mcp.internal/schema/v1",
  "wcagLevel": "AA",
  "wcagVersion": "2.2",
  "strictMode": true,
  "ldsEnforcement": {
    "enabled": false,
    "storybookUrl": "https://storybook.lilly.internal",
    "requireApprovedComponents": false,
    "allowedExceptions": [],
    "cacheComponents": true,
    "cacheTTL": 3600
  },
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
    "**/*.spec.{js,jsx,ts,tsx}",
    "node_modules/**",
    "dist/**",
    "build/**",
    ".git/**"
  ]
};

const configPath = path.join(configDir, 'config.json');
if (!fs.existsSync(configPath)) {
  fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
  console.log(`   ✅ Created default config → ${path.relative(process.cwd(), configPath)}`);
} else {
  console.log(`   ℹ️  Config already exists at ${path.relative(process.cwd(), configPath)}`);
}

// Step 6: Install dependencies
console.log('\n📦 Installing dependencies...');
const originalCwd = process.cwd();
try {
  process.chdir(a11yDir);
  
  // Check if npm is available
  try {
    execSync('npm --version', { stdio: 'pipe' });
  } catch (e) {
    throw new Error('npm is not available. Please install Node.js and npm first.');
  }
  
  // Install dependencies (use npm ci if package-lock.json exists, otherwise npm install)
  const packageLockPath = path.join(a11yDir, 'package-lock.json');
  if (fs.existsSync(packageLockPath)) {
    console.log('   📦 Running npm ci (using package-lock.json)...');
    execSync('npm ci --production', { stdio: 'inherit' });
  } else {
    console.log('   📦 Running npm install...');
    execSync('npm install --production', { stdio: 'inherit' });
  }
  
  console.log('   ✅ Dependencies installed successfully');
} catch (error) {
  console.log('   ⚠️  Failed to install dependencies automatically.');
  console.log('   💡 To install manually, run:');
  console.log(`      cd ${path.relative(originalCwd, a11yDir)} && npm install`);
  if (error.message) {
    console.log(`   ❌ Error: ${error.message}`);
  }
} finally {
  // Always restore the original working directory
  process.chdir(originalCwd);
}

// Step 7: Create .gitignore entries
console.log('\n📝 Updating .gitignore...');
const gitignorePath = path.join(process.cwd(), '.gitignore');
let gitignoreContent = '';

if (fs.existsSync(gitignorePath)) {
  gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
}

const entries = [
  '.github/a11y-mcp/node_modules',
  '.a11y/cache',
  'a11y-results.json'
];

let updated = false;
entries.forEach(entry => {
  if (!gitignoreContent.includes(entry)) {
    gitignoreContent += `\n${entry}`;
    updated = true;
  }
});

if (updated) {
  fs.writeFileSync(gitignorePath, gitignoreContent);
  console.log('   ✅ Updated .gitignore');
} else {
  console.log('   ℹ️  .gitignore already up to date');
}

// Summary
console.log('\n' + '='.repeat(60));
console.log('✅ Setup Complete!\n');
console.log('📋 Next Steps:');
console.log('   1. Review configuration: .a11y/config.json');
console.log('   2. Commit changes: git add .github/ .a11y/ scripts/');
console.log('   3. Push to trigger first check: git push');
console.log('   4. Create a test PR to verify it works');
if (fs.existsSync(path.join(a11yDir, 'node_modules'))) {
  console.log('   ✅ Dependencies are installed and ready!\n');
} else {
  console.log('   ⚠️  Note: Dependencies may need to be installed manually\n');
}
console.log('📚 Documentation:');
console.log('   - Quick Start: docs/getting-started/QUICK_START.md');
console.log('   - Architecture: docs/architecture/ARCHITECTURE.md');
console.log('   - Setup Guide: docs/getting-started/BEGINNERS_GUIDE.md');
console.log('   - Integration: docs/getting-started/INTEGRATION_GUIDE.md');
console.log('   - All docs: docs/ directory\n');
console.log('🎉 Your repository is now protected by WCAG 2.2 AA accessibility checks!');
console.log('='.repeat(60));
