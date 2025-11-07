# A11y-MCP: Visual Process Overview

## What You're Building (Simple Diagram)

```
Your Code Changes 
    ↓
GitHub Pull Request
    ↓
GitHub Actions Runs A11y-MCP
    ↓
A11y-MCP Scans Your Code
    ↓
Found Violations?
    ↓
        YES                    NO
        ↓                      ↓
    Report Violations      PR Can Merge
    ↓                          ↓
Must Fix Issues         ✅ Success
    ↓
Re-run Check
    ↓
✅ All Fixed → Merge Allowed
```

## Step-by-Step Flow (What Happens When)

### 1. Developer Makes Changes
```
Developer writes code
    ↓
Commits and pushes to new branch
    ↓
Creates pull request on GitHub
```

### 2. GitHub Actions Triggers
```
Pull request created
    ↓
GitHub Actions automatically starts
    ↓
Downloads latest version of A11y-MCP
    ↓
Scans only the files that changed
```

### 3. A11y-MCP Analysis Runs
```
A11y-MCP examines your code files
    ↓
Looks for accessibility violations:
    • Missing alt text on images
    • Non-semantic button elements
    • Missing form labels
    • Invalid ARIA attributes
    • And more...
    ↓
Generates report with line numbers
```

### 4. Results Are Reported
```
✅ No violations found
    ↓
PR can be merged
    ↓
✅ Success!

❌ Violations found
    ↓
GitHub shows check as failed
    ↓
Developer must fix issues
    ↓
Fixes and pushes changes
    ↓
Re-run check automatically
    ↓
If all fixed → ✅ PR can merge
```

## What Violations Look Like

### Example 1: Missing Alt Text
**Problem:**
```html
<img src="photo.jpg">
```

**A11y-MCP Reports:**
```
❌ Line 5: Missing alt text on image (WCAG 1.1.1)
   Add alt attribute with descriptive text
   Example: <img src="photo.jpg" alt="Team photo at conference">
```

### Example 2: Non-Semantic Button
**Problem:**
```html
<div onclick="submit()">Click Here</div>
```

**A11y-MCP Reports:**
```
❌ Line 12: Non-semantic button element (WCAG 4.1.2)
   Use <button> element instead of <div>
   Example: <button onclick="submit()">Click Here</button>
```

### Example 3: Missing Form Label
**Problem:**
```html
<input type="text" id="email">
```

**A11y-MCP Reports:**
```
❌ Line 8: Form input missing label (WCAG 1.3.1)
   Add label element or aria-label attribute
   Example: <label for="email">Email:</label>
```

## Configuration Settings Explained

### Rule Severity Levels
```
"error"   = Must fix before merge (blocks PR)
"warning" = Should fix but doesn't block merge
"info"    = Suggestion only, no merge blocking
```

### Example Configuration
```json
{
  "rules": {
    "alt-text": {
      "enabled": true,
      "severity": "error"    ← This blocks merges
    },
    "heading-order": {
      "enabled": true,
      "severity": "warning"  ← This suggests fixes
    }
  }
}
```

## File Types A11y-MCP Checks

### ✅ Files It Checks
- `.html` - HTML files
- `.jsx` - React JavaScript files
- `.tsx` - TypeScript React files
- `.js` - JavaScript files
- `.css` - CSS stylesheets
- `.scss` - Sass stylesheets

### ❌ Files It Ignores
- Test files (`*.test.js`, `*.spec.js`)
- Build files (`dist/`, `build/`)
- Node modules (`node_modules/`)
- Configuration files (unless specified)

## Typical Workflow Timeline

### Week 1: Setup
```
Monday    → Install dependencies
Tuesday   → Create configuration
Wednesday → Test locally on existing code
Thursday  → Review and adjust config
Friday    → Set up GitHub Actions
```

### Week 2: Testing
```
Monday    → Test automation on small PR
Tuesday   → Monitor first real PRs
Wednesday → Get team feedback
Thursday  → Make adjustments
Friday    → Document lessons learned
```

### Week 3: Evaluation
```
Monday    → Review 2 weeks of data
Tuesday   → Decide on expansion
Wednesday → Plan next steps
Thursday  → Prepare documentation
Friday    → Present results to team
```

## Common Developer Questions & Answers

**Q: "What if A11y-MCP is wrong?"**
A: You can add files to the ignore list or adjust specific rules. Better to flag a few false positives than miss real issues.

**Q: "How long does checking take?"**
A: Usually 30 seconds to 2 minutes, depending on how many files changed.

**Q: "What if I disagree with a rule?"**
A: You can disable specific rules or change their severity. Start strict and relax if needed.

**Q: "Does this replace manual reviews?"**
A: No, it automates the basic checks. Complex accessibility issues still need human review.

**Q: "What about design system components?"**
A: A11y-MCP can validate you're using approved components correctly and suggest alternatives.

## Success Patterns

### ✅ What Success Looks Like
- Most violations found are real accessibility issues
- Developers can understand how to fix violations
- Process doesn't significantly slow down development
- Team finds tool helpful, not annoying

### ❌ What Failure Looks Like
- Too many false positives annoy developers
- Violations are too technical to understand
- Process adds significant delays to development
- Team ignores all results

## When to Adjust Configuration

### Make More Strict (More Violations)
- Real accessibility issues are getting through
- Team is comfortable with current process
- More time available for fixes

### Make Less Strict (Fewer Violations)
- Too many false positives
- Developers are getting frustrated
- Process is slowing down development significantly

### Add New Rules
- Common violation patterns emerge
- Team requests additional checks
- Accessibility requirements become more strict

## Remember: Start Simple

**Week 1:** Basic setup with 2-3 rules
**Week 2:** Monitor results and get feedback  
**Week 3+:** Add more rules and expand to more repos

Don't try to implement everything at once. Start with the most common, impactful violations (alt text, buttons, form labels) and build from there.