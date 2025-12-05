# 🚀 Complete Beginner's Guide to Setting Up MCP Accessibility Checker

> **Goal:** Add automatic accessibility checks to your GitHub repository so every Pull Request gets reviewed for WCAG 2.2 violations.

---

## 📚 Table of Contents

1. [What You'll Build](#what-youll-build)
2. [Prerequisites](#prerequisites)
3. [Part 1: Understanding What We're Building](#part-1-understanding-what-were-building)
4. [Part 2: Setting Up Locally (Test First!)](#part-2-setting-up-locally-test-first)
5. [Part 3: Adding to Your Repository](#part-3-adding-to-your-repository)
6. [Part 4: Creating Your First Test PR](#part-4-creating-your-first-test-pr)
7. [Part 5: Making Checks Required](#part-5-making-checks-required)
8. [Troubleshooting](#troubleshooting)
9. [Next Steps](#next-steps)

---

## What You'll Build

By the end of this guide, you'll have:

✅ An MCP server running accessibility checks  
✅ GitHub Actions that automatically check every PR  
✅ Detailed comments on PRs showing accessibility violations  
✅ Pass/fail checks that can block merging  

**Time Required:** 30-45 minutes  
**Difficulty:** Beginner (we'll explain everything!)

---

## Prerequisites

### Required:

- [ ] A GitHub repository you have admin access to
- [ ] Git installed on your computer
- [ ] Node.js 18+ installed ([Download here](https://nodejs.org/))
- [ ] Basic familiarity with terminal/command line
- [ ] A code editor (VS Code recommended)

### Check if you're ready:

```bash
# Check Node.js version (should be 18 or higher)
node --version

# Check Git is installed
git --version

# Check you can access GitHub
ssh -T git@github.com
```

If any of these fail, install the required software first!

---

## Part 1: Understanding What We're Building

### What is MCP?

**MCP (Model Context Protocol)** is a standard way for tools to communicate. Think of it like a universal adapter that lets different programs talk to each other.

```
┌─────────────────┐
│  GitHub Actions │ ← Calls the MCP server
└────────┬────────┘
         │ (JSON-RPC Protocol)
         ▼
┌─────────────────┐
│   MCP Server    │ ← Checks accessibility
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  GitHub API     │ ← Posts results to PR
└─────────────────┘
```

### What Does It Check?

The MCP server checks for **10 common accessibility violations**:

1. ❌ Images without `alt` text
2. ❌ Divs being used as buttons
3. ❌ Buttons with no text/label
4. ❌ Form inputs without labels
5. ❌ Links with generic text ("click here")
6. ❌ HTML missing `lang` attribute
7. ❌ Missing page title
8. ❌ Iframes without titles
9. ❌ CSS with no focus styles
10. ❌ `outline: none` without alternative

### What Files Does It Check?

- JavaScript/JSX: `.js`, `.jsx`
- TypeScript: `.ts`, `.tsx`
- HTML: `.html`, `.htm`
- CSS: `.css`, `.scss`

---

## Part 2: Setting Up Locally (Test First!)

> 💡 **Why test locally first?** You'll understand how it works and catch any issues before deploying to GitHub!

### Step 2.1: Get the MCP Server Files

1. **Open your terminal**

2. **Navigate to a test directory:**

```bash
# Create a test folder
mkdir ~/accessibility-test
cd ~/accessibility-test
```

3. **Clone or copy the MCP server files:**

```bash
# If you have the a11y-mcp repo:
git clone https://github.com/berucha-lilly/a11y-mcp.git
cd a11y-mcp

# OR copy from your local path:
cp -r /Users/C284934/Github/Accessibility/a11y-mcp ~/accessibility-test/
cd a11y-mcp
```

### Step 2.2: Install Dependencies

```bash
# Make sure you're in the a11y-mcp folder
pwd
# Should show: /Users/.../a11y-mcp

# Install required packages
npm install

# Verify MCP SDK is installed
npm list @modelcontextprotocol/sdk
```

**Expected output:**
```
a11y-mcp@1.0.0
└── @modelcontextprotocol/sdk@1.21.0
```

### Step 2.3: Test the MCP Server

Let's make sure the MCP server works!

**Test 1: Check if server starts**

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | node src/mcp-server.js
```

**Expected output:** JSON with 3 tools listed

**Test 2: Create a test file with violations**

```bash
cat > test-violations.html << 'EOF'
<!DOCTYPE html>
<html>
<body>
  <img src="logo.png">
  <div onclick="alert('hi')">Click me</div>
  <button></button>
</body>
</html>
EOF
```

**Test 3: Check the file using MCP**

```bash
cat << 'EOF' | node src/mcp-server.js 2>/dev/null | jq
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "check_accessibility",
    "arguments": {
      "filePath": "test-violations.html",
      "content": "<!DOCTYPE html>\n<html>\n<body>\n  <img src=\"logo.png\">\n  <div onclick=\"alert('hi')\">Click me</div>\n  <button></button>\n</body>\n</html>"
    }
  }
}
EOF
```

**Expected output:** JSON showing 3 violations found! ✅

### Step 2.4: Test with CLI Scanner (Easier!)

```bash
# Use the simpler CLI scanner for testing
node cli-scanner.js test-violations.html
```

**Expected output:**
```
📄 File: test-violations.html
🗂️  File Type: HTML
📊 Lines: 8
❌ Result: Found 3 accessibility violation(s):

   1. [ERROR] Image missing alt attribute
      📍 Line: 4
      ...
```

**✅ If you see violations listed, the system works!**

---

## Part 3: Adding to Your Repository

Now let's add this to your actual GitHub repository.

### Step 3.1: Choose Your Repository

Pick a repository where you want accessibility checks. For your first time, choose a **test repository** or one with low activity.

```bash
# Clone your repository (if you don't have it locally)
cd ~/projects
git clone git@github.com:YOUR-USERNAME/YOUR-REPO.git
cd YOUR-REPO
```

### Step 3.2: Create the Directory Structure

```bash
# From your repository root
mkdir -p .github/a11y-mcp
mkdir -p .github/workflows
```

**Your repository should now look like:**
```
your-repo/
├── .github/
│   ├── a11y-mcp/        ← MCP server goes here
│   └── workflows/       ← GitHub Actions workflow goes here
├── src/
└── ...
```

### Step 3.3: Copy MCP Server Files

```bash
# Copy the MCP server
cp ~/accessibility-test/a11y-mcp/src/mcp-server.js .github/a11y-mcp/

# Copy dependencies files
cp ~/accessibility-test/a11y-mcp/package.json .github/a11y-mcp/
cp ~/accessibility-test/a11y-mcp/package-lock.json .github/a11y-mcp/

# Install dependencies in the target location
cd .github/a11y-mcp
npm ci
cd ../..
```

**Verify files are there:**
```bash
ls -la .github/a11y-mcp/
```

**You should see:**
- `mcp-server.js`
- `package.json`
- `package-lock.json`
- `node_modules/` (folder)

### Step 3.4: Copy GitHub Actions Workflow

```bash
# Copy the workflow file
cp ~/accessibility-test/a11y-mcp/github-actions/accessibility-review.yml .github/workflows/accessibility-review.yml
```

**Verify:**
```bash
cat .github/workflows/accessibility-check.yml
```

You should see a YAML file starting with `name: Accessibility Check (MCP)`

### Step 3.5: Commit and Push

```bash
# Check what you're about to commit
git status

# Add files
git add .github/

# Commit
git commit -m "Add MCP-based accessibility checks to CI/CD"

# Push to GitHub
git push origin main
```

**✅ Checkpoint:** Go to your repository on GitHub.com and check that:
- `.github/a11y-mcp/` folder exists
- `.github/workflows/accessibility-check.yml` exists

---

## Part 4: Creating Your First Test PR

Let's test it by creating a PR with accessibility violations!

### Step 4.1: Create a Test Branch

```bash
# Make sure you're on main and up to date
git checkout main
git pull

# Create a test branch
git checkout -b test-accessibility-check
```

### Step 4.2: Create a File with Violations

```bash
# Create a test component with violations
cat > src/TestComponent.jsx << 'EOF'
// Test component with accessibility violations
import React from 'react';

export const TestComponent = () => {
  return (
    <div>
      <h1>Test Component</h1>
      
      {/* Violation 1: Image without alt */}
      <img src="logo.png" />
      
      {/* Violation 2: Div used as button */}
      <div onClick={() => alert('Clicked!')}>
        Click me
      </div>
      
      {/* Violation 3: Button with no text */}
      <button onClick={() => console.log('test')}></button>
      
      {/* Violation 4: Input without label */}
      <input type="text" placeholder="Enter name" />
    </div>
  );
};
EOF
```

### Step 4.3: Commit and Push

```bash
# Add the file
git add src/TestComponent.jsx

# Commit
git commit -m "Add test component with accessibility issues"

# Push to create the branch on GitHub
git push origin test-accessibility-check
```

### Step 4.4: Create the Pull Request

**Option A: Using GitHub CLI (if installed):**
```bash
gh pr create --title "Test: Accessibility Checker" --body "Testing the new accessibility checks"
```

**Option B: Using GitHub website:**
1. Go to your repository on GitHub.com
2. You'll see a banner "Compare & pull request" - click it
3. Add title: "Test: Accessibility Checker"
4. Add description: "Testing the new accessibility checks"
5. Click "Create pull request"

### Step 4.5: Watch the Check Run!

1. **On your PR page, scroll down to "Checks"**
2. **You'll see:** `Accessibility Check (MCP)` running
3. **Wait 30-60 seconds** for it to complete
4. **You should see:**
   - ❌ Check failed (because violations were found)
   - 📝 A comment appears with detailed results

### Step 4.6: Read the Results

The bot comment will look like:

```markdown
## 🔍 Accessibility Review Results (via MCP)

**Powered by:** Model Context Protocol (MCP) Server
**Files Checked:** 1
**Files with Violations:** 1
**Total Violations:** 4 (4 errors, 0 warnings)

### ❌ Violations Found

#### 📄 `src/TestComponent.jsx`

Found 4 violation(s):

1. **[ERROR]** Image missing alt attribute
   - **Line:** 10
   - **Issue:** All images must have an alt attribute for screen readers
   - **Fix:** Add alt attribute with meaningful description
   - **WCAG:** 1.1.1
   - **Suggestions:**
     - Add alt="description" to the image tag

...
```

**✅ If you see this comment, everything is working!**

---

## Part 5: Making Checks Required

Want to **prevent merging** PRs with accessibility violations? Make the check required!

### Step 5.1: Go to Repository Settings

1. Go to your repository on GitHub.com
2. Click **Settings** (top right)
3. Click **Branches** (left sidebar)

### Step 5.2: Add Branch Protection

1. Click **Add rule** or edit existing rule for `main`
2. Under "Protect matching branches":
   - ✅ Check "Require status checks to pass before merging"
   - In the search box that appears, type: `accessibility-check`
   - Select **"Check Accessibility via MCP"** when it appears
   - ✅ Check "Require branches to be up to date before merging"
3. Scroll down and click **Create** or **Save changes**

### Step 5.3: Test Required Check

1. Go back to your test PR
2. Try to click "Merge pull request"
3. **You should see:** "Merging is blocked" because the check failed! ✅

**Now developers MUST fix accessibility issues before merging!**

---

## Troubleshooting

### Problem: Workflow doesn't run

**Check:**
```bash
# Verify workflow file exists
ls .github/workflows/

# Check syntax
cat .github/workflows/accessibility-check.yml
```

**Solution:** Make sure the YAML file is valid (no tabs, proper indentation)

### Problem: "npm ci failed"

**Error message:** `npm ERR! cipm can only install packages when...`

**Solution:**
```bash
cd .github/a11y-mcp
rm -rf node_modules package-lock.json
npm install
git add package-lock.json
git commit -m "Update package-lock.json"
git push
```

### Problem: "MCP server not found"

**Check:**
```bash
ls .github/a11y-mcp/mcp-server.js
```

**Solution:** Copy the file again:
```bash
cp ~/accessibility-test/a11y-mcp/src/mcp-server.js .github/a11y-mcp/
git add .github/a11y-mcp/mcp-server.js
git commit -m "Add missing MCP server file"
git push
```

### Problem: No violations found but I see issues

**Possible reasons:**
1. File type not supported (check file extension)
2. Violation not in the 10 types we check
3. File wasn't in the changed files list

**Test locally:**
```bash
cd .github/a11y-mcp
node cli-scanner.js ../../src/YourFile.jsx
```

### Problem: Check runs but no comment on PR

**Check:**
1. Does the workflow have `pull-requests: write` permission?
2. Are GitHub Actions enabled in repository settings?
3. Check workflow logs for errors

**View logs:**
1. Go to PR → "Checks" tab
2. Click "Accessibility Check (MCP)"
3. Look for errors in the output

---

## Next Steps

### For Your Team

**Week 1: Pilot**
- [ ] Test on 1 repository
- [ ] Get feedback from 2-3 developers
- [ ] Fix any issues

**Week 2: Roll Out**
- [ ] Document process for your team
- [ ] Add to 3-5 more repositories
- [ ] Train team on fixing common violations

**Week 3: Enforce**
- [ ] Make checks required on main branches
- [ ] Monitor violation trends
- [ ] Celebrate improvements! 🎉

### Enhance the System

**Add more checks:**
Edit `.github/a11y-mcp/core/regex-analyzer.js` and add detection for:
- Color contrast issues
- Missing ARIA labels
- Heading hierarchy problems

**Customize severity:**
Edit the `analyzeFile()` function to change `severity: 'error'` to `severity: 'warning'` for non-blocking checks.

**Add exceptions:**
Create a `.a11yignore` file to skip certain files.

---

## Cheat Sheet

### Common Commands

```bash
# Test locally
cd .github/a11y-mcp
node cli-scanner.js ../../src/MyFile.jsx

# Check MCP server works
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | node src/mcp-server.js

# Update dependencies
cd .github/a11y-mcp
npm install
git add package-lock.json
git commit -m "Update dependencies"

# Re-run check on PR
git commit --allow-empty -m "Re-trigger checks"
git push
```

### Quick Links

- [WCAG 2.2 Guidelines](https://www.w3.org/WAI/WCAG22/quickref/)
- [WebAIM Checklist](https://webaim.org/standards/wcag/checklist)
- [MCP Documentation](https://modelcontextprotocol.io/)

---

## Summary

**What You Accomplished:**

✅ Set up a Model Context Protocol (MCP) server  
✅ Integrated it with GitHub Actions  
✅ Created automated accessibility checks for every PR  
✅ Got detailed reports with fix suggestions  
✅ (Optional) Made checks required to block bad code  

**Impact:**

- **Before:** Manual accessibility reviews, issues slip through
- **After:** Automated checks, violations caught early, better code quality

**You're now enforcing accessibility at scale!** 🎉

---

## Need Help?

**Common resources:**
1. Check the `MCP_GITHUB_ACTIONS_SETUP.md` for technical details
2. Review GitHub Actions logs for specific errors
3. Test locally first before debugging GitHub Actions
4. Ask your team for help with repository permissions

**Remember:** This is a learning process. Start small, test thoroughly, and expand gradually!

---

**Ready to fix your test PR?** See the violations found and update the code to make them pass! 💪
