# A11y-MCP: Single Repository Implementation Guide

## Overview
This guide walks you through implementing A11y-MCP (Accessibility Model Context Protocol Reviewer) for a single repository pilot program. We'll focus on a practical, step-by-step approach with clear explanations.

## Phase 1: Setup and Prerequisites

### Step 1: Choose Your Test Repository
**Why:** Start small with one repository to validate the system works with your specific codebase.
**What to do:**
- Select a repository with some JavaScript/JSX/CSS files
- Ensure the team is interested in accessibility improvements
- Make sure you have admin access to the repository

### Step 2: Install Required Dependencies
**Why:** A11y-MCP needs Node.js and several libraries to parse and analyze code.
**What to do:**
```bash
# Check if Node.js is installed
node --version  # Should be 18 or higher

# If not installed, install Node.js 18+ from nodejs.org

# Navigate to your repository
cd /path/to/your/repository

# Install A11y-MCP dependencies
npm install @modelcontextprotocol/sdk @octokit/rest babel @babel/parser @babel/traverse postcss postcss-scss
```

### Step 3: Create Initial Configuration
**Why:** Configure what rules to check and what files to analyze.
**What to do:**
Create a `.a11y/config.json` file in your repository root:

```json
{
  "wcag": {
    "level": "AA",
    "version": "2.2",
    "rules": {
      "aria-required": {
        "enabled": true,
        "severity": "error"
      },
      "keyboard-navigation": {
        "enabled": true,
        "severity": "error"
      },
      "semantic-html": {
        "enabled": true,
        "severity": "error"
      },
      "alt-text": {
        "enabled": true,
        "severity": "error"
      }
    },
    "excluded": ["color-contrast"]
  },
  "ignore": {
    "patterns": [
      "**/*.test.js",
      "**/*.test.tsx",
      "**/node_modules/**",
      "**/dist/**"
    ]
  },
  "failureThresholds": {
    "error": 0,
    "warning": 10
  }
}
```

**Why these settings:**
- Start with "error" severity to catch real issues
- Exclude tests to avoid false positives on test utilities
- Set error threshold to 0 to prevent merging violations

## Phase 2: Testing A11y-MCP Locally

### Step 4: Download and Test A11y-MCP
**Why:** Test the system on your codebase to see what violations it finds.
**What to do:**
```bash
# Download A11y-MCP (you'll need to get this from the project)
# For now, let's test with sample code

# Create a test file with accessibility violations
cat > test-violation.html << 'EOF'
<!DOCTYPE html>
<html>
<head><title>Test</title></head>
<body>
  <img src="test.jpg"> <!-- Missing alt text -->
  <button onclick="alert('hi')"> <!-- Missing accessible name -->
  <div onclick="alert('hi')">Click me</div> <!-- Non-semantic button -->
</body>
</html>
EOF

# Run A11y-MCP analysis (replace with actual command)
node /path/to/a11y-mcp --analyze test-violation.html
```

**Expected output:** A list of violations with line numbers and descriptions.

### Step 5: Review Results and Fix Issues
**Why:** Understand what violations exist in your codebase and how to fix them.
**What to do:**
- Run A11y-MCP on your actual files
- Review each violation type found
- Fix some violations to test the process
- Document what types of violations are common in your codebase

## Phase 3: GitHub Integration Setup

### Step 6: Create GitHub App (If Desiring Automated Checks)
**Why:** A GitHub App allows automated checks on pull requests without manual intervention.
**What to do:**
1. Go to GitHub → Settings → Developer settings → GitHub Apps
2. Click "New GitHub App"
3. Fill in:
   - App name: "A11y-MCP-[YourRepoName]"
   - Webhook URL: Your server URL (or use ngrok for testing)
   - Permissions: Checks (write), Pull requests (write)
4. Generate and download the private key

**Alternative:** Skip this step initially and run A11y-MCP manually or via GitHub Actions.

### Step 7: Set Up GitHub Actions (Simpler Option)
**Why:** GitHub Actions provides built-in CI/CD that doesn't require setting up a separate server.
**What to do:**
Create `.github/workflows/a11y-check.yml`:

```yaml
name: Accessibility Check
on:
  pull_request:
    types: [opened, synchronize]
  workflow_dispatch:

jobs:
  a11y-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
      
      - name: Install A11y-MCP
        run: |
          # Download and install A11y-MCP
          curl -L https://github.com/your-org/a11y-mcp/releases/latest/download/a11y-mcp-linux-amd64 \
               -o a11y-mcp
          chmod +x a11y-mcp
      
      - name: Run Accessibility Check
        run: |
          # Create a11y config
          mkdir -p .a11y
          cp .a11y/config.json.example .a11y/config.json
          
          # Run analysis on changed files
          ./a11y-mcp --analyze-changed-files
      
      - name: Upload results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: accessibility-results
          path: a11y-results.json
```

### Step 8: Test GitHub Actions
**Why:** Verify the automated workflow works before relying on it.
**What to do:**
- Commit and push the workflow file
- Create a pull request
- Check that the workflow runs and reports violations
- Fix any configuration issues

## Phase 4: Validation and Tuning

### Step 9: Monitor Results for One Week
**Why:** Real-world usage reveals practical issues and tune configurations.
**What to track:**
- How many violations are found per PR
- Which types of violations are most common
- Developer feedback on the process
- False positives or configuration issues

### Step 10: Adjust Configuration Based on Results
**Why:** Fine-tune the system to your codebase's specific needs.
**What to do:**
- Add files/directories to ignore list
- Adjust severity levels for specific rules
- Create custom rules for your specific components
- Document common violation patterns

## Phase 5: Team Adoption

### Step 11: Share Results with Your Team
**Why:** Get buy-in from developers who will be using the system.
**What to present:**
- Sample violations found
- How violations are fixed
- Time spent on reviews before vs after
- Any customizations made for your codebase

### Step 12: Establish Team Guidelines
**Why:** Clear expectations prevent frustration and ensure consistent implementation.
**What to establish:**
- Who reviews and responds to violations
- When violations should be fixed (before merge, before release)
- Exception process for legitimate cases
- Training resources for common violation types

## What to Measure and Report

### Real Metrics You Can Track
Instead of unverified percentages, track actual numbers:

**Before Implementation:**
- Number of accessibility-related issues found in production
- Time spent on accessibility reviews during PRs
- Number of accessibility bugs discovered in user testing

**After Implementation (Track weekly):**
- Number of PRs with accessibility violations
- Average time to fix violations
- Number of violations by type
- Developer satisfaction (1-5 scale)

**Sample Weekly Report:**
```
Week of [Date]:
- PRs checked: 15
- PRs with violations: 8 (53%)
- Most common violations: Missing alt text (12), Non-semantic buttons (8)
- Average fixes per PR: 2.3
- Developer feedback: 4.2/5 (helpful, sometimes noisy)
```

## Common Issues and Solutions

### Issue 1: Too Many False Positives
**Solution:** Add files to ignore list, adjust rule sensitivity

### Issue 2: Slow Analysis on Large PRs
**Solution:** Analyze only changed files, set file size limits

### Issue 3: Developers Ignoring Violations
**Solution:** Make violations block merges, provide better fix suggestions

### Issue 4: Configuration Too Strict
**Solution:** Start with warnings instead of errors, gradually increase strictness

## Next Steps After Successful Pilot

Once the pilot is successful:
1. **Expand to 2-3 more repositories** with similar patterns
2. **Create organization-wide configuration** with common rules
3. **Develop custom rules** for your specific design system
4. **Integrate with code review process** and team workflows
5. **Consider dedicated server deployment** for multiple repositories

## Success Criteria for Pilot

**Technical Success:**
- ✅ A11y-MCP runs successfully on PRs
- ✅ Violations are reported clearly with line numbers
- ✅ False positive rate is < 10%
- ✅ Analysis completes within 2 minutes

**Team Success:**
- ✅ Developers understand and can fix violations
- ✅ Team finds the tool helpful, not burdensome
- ✅ Violation count trends downward over time
- ✅ No significant delays in PR merge process

## Support and Resources

If you encounter issues:
1. Check the troubleshooting guide
2. Review GitHub Actions logs for error details
3. Test with known-good and known-bad code samples
4. Document any custom configuration changes needed

Remember: Start simple, measure results, and iterate based on real feedback from your team.