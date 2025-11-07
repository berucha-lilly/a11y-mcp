# A11y-MCP: Complete Beginner's Guide

## What We're Building (In Simple Terms)

**The Goal:** Create an automated system that checks every code change for accessibility issues (like missing alt text on images, buttons that can't be used with keyboard, etc.)

**Think of it like:** A spell-checker, but for accessibility instead of spelling. Every time someone submits code, it automatically checks if there are accessibility problems.

## What You Need Before Starting

### 1. Check Your Computer Setup
**What this means:** Make sure you have the right software installed on your computer.

**Step 1.1: Check if Node.js is installed**
```bash
# Open Terminal/Command Prompt and type:
node --version
```

**If you see a version number (like v18.17.0):** You're good! Skip to Step 2.

**If you see "command not found":** You need to install Node.js
```bash
# Go to https://nodejs.org and download Node.js 18 or higher
# Then run the installer
# After installation, check again:
node --version
```

### 2. Get Access to a GitHub Repository
**What this means:** You need a place to test this system.

**Step 2.1: Choose Your Test Repository**
- Go to your GitHub organization
- Pick a repository that has some HTML, CSS, or JavaScript files
- Make sure you have "Admin" access to this repository
- If you don't have access, ask someone who does to grant you Admin rights

**Step 2.2: Clone the Repository to Your Computer**
```bash
# Go to your repository on GitHub
# Click the green "Code" button
# Copy the HTTPS URL

# Open Terminal and navigate to where you want the code:
cd /path/to/your/projects

# Clone the repository:
git clone https://github.com/your-username/your-test-repo.git

# Go into the repository:
cd your-test-repo
```

## Step 1: Download A11y-MCP

**What we're doing:** Getting the actual software that will do the checking.

### Step 1.1: Download A11y-MCP Files
```bash
# You'll need to download the A11y-MCP project files

# Create a directory for A11y-MCP
mkdir ~/a11y-mcp
cd ~/a11y-mcp

```

### Step 1.2: Install Required Software Dependencies
**What this means:** A11y-MCP needs other software to work (like a parser to read code files).

```bash
# Navigate to the A11y-MCP directory
cd ~/a11y-mcp

# Install the required packages
npm install @modelcontextprotocol/sdk @octokit/rest babel @babel/parser @babel/traverse postcss postcss-scss

# This might take 2-3 minutes - it's downloading lots of small programs
```

## Step 2: Set Up Configuration

**What we're doing:** Tell A11y-MCP what rules to check and what files to ignore.

### Step 2.1: Create Configuration Directory
```bash
# Go back to your test repository
cd /path/to/your/test-repo

# Create the configuration directory
mkdir .a11y
```

### Step 2.2: Create Configuration File
**What this means:** A text file that tells A11y-MCP how to behave.

```bash
# Create the configuration file
touch .a11y/config.json
```

**Step 2.3: Edit the Configuration File**
```bash
# Open the file in a text editor
# You can use any text editor (VS Code, Sublime Text, Notepad, etc.)
open .a11y/config.json

# Copy and paste this content into the file:
```

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

**What each setting means:**
- `"enabled": true` = Turn on this rule
- `"severity": "error"` = Make this violation stop the code from being merged
- `"ignore" patterns` = Don't check these types of files (like test files)
- `"error": 0` = Allow zero errors before blocking the merge

## Step 3: Test A11y-MCP Locally

**What we're doing:** Run A11y-MCP on your existing code to see what violations it finds.

### Step 3.1: Create Test Files with Known Violations
**Why we're doing this:** Start with simple examples to understand how it works.

```bash
# Create a simple HTML file with accessibility problems
cat > test-violation.html << 'EOF'
<!DOCTYPE html>
<html>
<head><title>Test Page</title></head>
<body>
  <!-- This image is missing alt text -->
  <img src="test.jpg">
  
  <!-- This button has no accessible name -->
  <button onclick="alert('Hi')">
    <!-- Empty button with no text -->
  </button>
  
  <!-- This div is being used like a button -->
  <div onclick="doSomething()">Click Me</div>
</body>
</html>
EOF
```

### Step 3.2: Run A11y-MCP on Test File
```bash
# Go to your A11y-MCP directory
cd ~/a11y-mcp

# Run A11y-MCP on the test file
# (The exact command depends on how you set up A11y-MCP)
./run.sh /path/to/your/test-repo/test-violation.html

# Or if you have a custom script:
./run-a11y-check.sh /path/to/your/test-repo/test-violation.html
```

### Step 3.3: Understand the Results
**What you should see:**
```
Found accessibility violations:

File: test-violation.html
Line 8: Missing alt text on image (WCAG 1.1.1)
Line 12: Button missing accessible name (WCAG 4.1.2)
Line 16: Non-semantic button element (WCAG 4.1.2)
```

### Step 3.4: Fix the Violations
```bash
# Edit the test file to fix the violations
open test-violation.html

# Change this:
<img src="test.jpg">

# To this:
<img src="test.jpg" alt="Test image showing accessibility violation">

# Change this:
<button onclick="alert('Hi')"></button>

# To this:
<button onclick="alert('Hi')">Click me</button>

# Change this:
<div onclick="doSomething()">Click Me</div>

# To this:
<button onclick="doSomething()">Click Me</button>
```

### Step 3.5: Run A11y-MCP Again
```bash
# Run A11y-MCP on the fixed file
node src/index.js --analyze test-violation.html

# You should see no violations now
```

## Step 4: Test on Your Real Repository

**What we're doing:** Run A11y-MCP on your actual codebase to see what real violations exist.

### Step 4.1: Scan Your Entire Repository
```bash
# Go to your test repository
cd /path/to/your/test-repo

# Run A11y-MCP on all files
cd ~/a11y-mcp
node src/index.js --analyze /path/to/your/test-repo --config /path/to/your/test-repo/.a11y/config.json

# This might take a few minutes depending on how many files you have
```

### Step 4.2: Review Results
**What to look for:**
- How many violations were found?
- What types of violations are most common?
- Are there any false positives (things flagged as problems that aren't really problems)?

**Example output:**
```
Found 47 accessibility violations:

Most common violations:
- Missing alt text: 23 instances
- Non-semantic buttons: 12 instances
- Missing form labels: 8 instances
- Invalid ARIA attributes: 4 instances

Files with most violations:
- src/components/Header.tsx: 8 violations
- src/pages/Home.tsx: 6 violations
- src/components/Button.tsx: 5 violations
```

### Step 4.3: Adjust Configuration if Needed
If you're getting too many false positives:

```bash
# Edit your configuration file
open /path/to/your/test-repo/.a11y/config.json

# Add more files to ignore
"patterns": [
  "**/*.test.js",
  "**/*.test.tsx",
  "**/node_modules/**",
  "**/dist/**",
  "**/*.config.js",      # Add this line
  "**/scripts/**",       # Add this line
  "**/__tests__/**"      # Add this line
]
```

## Step 5: Set Up GitHub Integration

**What we're doing:** Make A11y-MCP automatically run when people submit pull requests.

### Step 5.1: Create GitHub Actions Workflow
**What this means:** Set up a file that tells GitHub to run A11y-MCP automatically.

```bash
# Go to your test repository
cd /path/to/your/test-repo

# Create the directory for GitHub Actions
mkdir -p .github/workflows

# Create the workflow file
touch .github/workflows/accessibility-check.yml
```

**Step 5.2: Edit the Workflow File**
```bash
# Open the workflow file
open .github/workflows/accessibility-check.yml

# Copy and paste this content:
```

```yaml
name: Accessibility Check
on:
  pull_request:
    types: [opened, synchronize, reopened]
  workflow_dispatch:

jobs:
  accessibility-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Get full history for accurate analysis
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
      
      - name: Install A11y-MCP
        run: |
          # Download A11y-MCP (replace with actual download URL)
          wget -O a11y-mcp.tar.gz https://github.com/your-org/a11y-mcp/releases/latest/download/a11y-mcp.tar.gz
          tar -xzf a11y-mcp.tar.gz
          chmod +x a11y-mcp
      
      - name: Run Accessibility Check
        run: |
          # Run A11y-MCP on changed files
          ./a11y-mcp --analyze-changed-files --config .a11y/config.json
          
      - name: Upload Results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: accessibility-results
          path: a11y-results.json
```

### Step 5.3: Commit and Push
```bash
# Add the files to git
git add .github/workflows/accessibility-check.yml

# Commit the changes
git commit -m "Add accessibility checking workflow"

# Push to GitHub
git push origin main
```

## Step 6: Test the Automation

**What we're doing:** Create a pull request to see if A11y-MCP runs automatically.

### Step 6.1: Make a Small Change
```bash
# Create a new branch
git checkout -b test-accessibility-check

# Make a small change (like add a space or comment)
echo "<!-- Test change -->" >> README.md

# Commit and push
git add README.md
git commit -m "Test change for accessibility check"
git push origin test-accessibility-check
```

### Step 6.2: Create a Pull Request
1. Go to your repository on GitHub
2. Click "Compare & pull request" for your new branch
3. Add a title like "Test accessibility check"
4. Click "Create pull request"

### Step 6.3: Check Results
**What you should see:**
1. A new check appears called "Accessibility Check" (yellow circle)
2. It will run for 1-2 minutes
3. When complete, it will show either ✅ (passed) or ❌ (failed)
4. Click on the check to see the results

**If it passes:** No accessibility violations found in your changes

**If it fails:** Click on the check to see which violations were found

### Step 6.4: Add a Violation to Test
```bash
# Edit a file to add a known violation
open src/components/TestComponent.tsx

# Add this somewhere:
<img src="test.jpg">

# Commit and push
git add src/components/TestComponent.tsx
git commit -m "Add test violation"
git push origin test-accessibility-check

# Check the pull request on GitHub
# You should see the accessibility check fail with violations
```

## Step 7: Monitor and Adjust

**What we're doing:** Track what happens and make improvements.

### Step 7.1: Track Results for One Week
**Create a simple tracking sheet:**

| Date | PRs Checked | Violations Found | Most Common | Developer Feedback |
|------|-------------|------------------|-------------|-------------------|
| 10/30 | 3 | 12 | Missing alt text (5) | "Helpful but some noise" |
| 10/31 | 5 | 8 | Non-semantic buttons (3) | "Good learning tool" |

### Step 7.2: Weekly Review Questions
Ask yourself:
- Are violations found helpful or just noise?
- Can developers easily understand how to fix them?
- Is the process too slow?
- Are there too many false positives?

### Step 7.3: Make Adjustments
If too many false positives:
```bash
# Edit configuration to be less strict
open /path/to/your/test-repo/.a11y/config.json

# Change "error" to "warning" for some rules
"aria-required": {
  "enabled": true,
  "severity": "warning"  # Changed from "error"
}
```

If developers are confused:
- Create a wiki page explaining common violations and fixes
- Add better error messages to A11y-MCP configuration
- Provide examples in your team's documentation

## Step 8: Get Team Feedback

**What we're doing:** Ask your team if this is helping or hurting.

### Step 8.1: Survey Questions
Ask your team:
1. On a scale of 1-5, how helpful is the accessibility checking?
2. Are you able to fix the reported violations?
3. Does it slow down your development process?
4. What would make it more useful?

### Step 8.2: One-on-One Conversations
Talk to developers who used the system:
- What violations are most confusing?
- What examples would help them understand fixes?
- Are there any violation types they don't agree with?

## What Success Looks Like

**After 2 weeks of testing:**
- ✅ A11y-MCP runs automatically on every pull request
- ✅ Violations found are mostly real accessibility issues
- ✅ Developers can understand and fix violations
- ✅ Process doesn't significantly slow down development
- ✅ Team finds the tool helpful, not annoying

**Realistic metrics to track:**
- Number of PRs checked per week
- Average violations per PR
- Time spent fixing violations
- Developer satisfaction score (1-5)
- Types of violations most common in your codebase

## What to Do Next

**If the pilot is successful:**
1. Document what works for your specific codebase
2. Expand to 2-3 more repositories
3. Train additional developers on using the system
4. Create organization-wide configuration

**If there are issues:**
1. Adjust configuration based on feedback
2. Focus on specific violation types first
3. Get more developer input on what's helpful
4. Consider starting with warnings instead of errors

## Common Beginner Mistakes

**Mistake 1: Setting up too many rules at once**
- Start with just 2-3 basic rules (alt text, buttons, form labels)
- Add more rules gradually as team gets comfortable

**Mistake 2: Ignoring false positives**
- If something is consistently flagged but isn't a real problem, add it to the ignore list
- Better to miss some issues than to annoy developers with noise

**Mistake 3: Not involving the team early**
- Get buy-in from at least one developer before setting up automation
- Show examples of what violations look like and how to fix them

**Mistake 4: Expecting perfection immediately**
- No tool is perfect - focus on catching the majority of real issues
- Iterate and improve based on real feedback

## Getting Help

**If you get stuck:**
1. Check the implementation guide for detailed troubleshooting
2. Review GitHub Actions logs for error messages
3. Test with simple examples first
4. Ask for help from developers who have experience with similar tools

Remember: Start simple, test everything, and adjust based on real feedback from your team. The goal is improving accessibility, not building the perfect system from day one.