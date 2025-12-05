# PowerShell Setup Guide

## PowerShell Execution Policy Issue

If you encounter this error:
```
npm : File C:\Program Files\nodejs\npm.ps1 cannot be loaded because running scripts is disabled on this system.
```

## Solutions

### Option 1: Use Node Directly (Recommended)

Instead of using `npm run test:mcp`, run the script directly:

```powershell
node scripts/test-mcp-integration.js
```

### Option 2: Bypass Execution Policy (Current Session Only)

```powershell
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process
npm run test:mcp
```

### Option 3: Change Execution Policy (Requires Admin)

Open PowerShell as Administrator and run:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Then you can use `npm run test:mcp` normally.

### Option 4: Use Command Prompt (CMD)

Instead of PowerShell, use Command Prompt:

```cmd
npm run test:mcp
```

## Testing Commands

Once dependencies are installed, you can test:

```powershell
# Test MCP server connection
node scripts/mcp-client.js test

# Test full integration
node scripts/test-mcp-integration.js

# Test on a specific file
node cli-scanner.js examples/accessibility-violations.jsx
```

## Installation

If dependencies aren't installed:

```powershell
npm install
```

## Verification

After installation, verify everything works:

```powershell
# Check if node_modules exists
Test-Path node_modules

# Check if MCP SDK is installed
Test-Path node_modules/@modelcontextprotocol/sdk
```

## Common Issues

### Issue: "Cannot find package '@modelcontextprotocol/sdk'"

**Solution**: Run `npm install` to install dependencies.

### Issue: "npm command not found"

**Solution**: 
1. Verify Node.js is installed: `node --version`
2. Verify npm is in PATH: `where.exe npm`
3. Restart your terminal

### Issue: TypeScript build errors

**Solution**: The project uses JavaScript directly, so TypeScript build is not required. The package.json has been updated to skip the build step.

## Next Steps

Once everything is working:

1. ✅ Test MCP integration: `node scripts/test-mcp-integration.js`
2. ✅ Test on example files: `node cli-scanner.js examples/accessibility-violations.jsx`
3. ✅ Deploy to GitHub repository (see `QUICK_START.md`)

---

**Note**: The PowerShell execution policy is a security feature. Option 1 (using `node` directly) is the safest and doesn't require changing system settings.
