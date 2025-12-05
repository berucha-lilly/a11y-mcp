# Test Suite Documentation

## Overview

Comprehensive test suite for verifying all accessibility checks work correctly.

## Running Tests

```bash
# Run all tests
npm test

# Run MCP integration tests
npm run test:mcp

# Run all tests (unit + integration)
npm run test:all
```

## Test Coverage

### ✅ HTML/JSX Checks (15 tests)
- Image alt attributes
- Div used as button
- Empty buttons
- Form inputs without labels
- Placeholder as label
- Generic link text
- Missing lang attribute
- Missing h1 heading
- Skipped heading levels
- Duplicate IDs
- ARIA validation
- Custom interactive elements
- Iframe titles

### ✅ CSS Checks (8 tests)
- outline: none detection
- Font size validation
- Touch target size
- Transparent text color
- Color contrast (when integrated)

### ✅ Real-World Tests (2 tests)
- Example CSS file validation
- Example JSX file validation

## Test Results

**Current Status**: 24/25 tests passing (96% pass rate)

### Passing Tests
- ✅ All image checks
- ✅ All button checks
- ✅ All form input checks
- ✅ All heading checks
- ✅ All ARIA checks
- ✅ All CSS checks
- ✅ Real-world file tests

### Known Issues
- ⚠️ Iframe check needs HTML file type (currently only checks .html files)

## Adding New Tests

To add a new test:

```javascript
suite.test('Test name', () => {
  const content = '<code to test>';
  const violations = analyzeFile(content, 'test.html');
  const hasViolation = violations.some(v => v.id === 'violation-id');
  if (!hasViolation) {
    throw new Error('Should detect violation');
  }
});
```

## Test Philosophy

1. **Positive Tests**: Verify violations are detected
2. **Negative Tests**: Verify valid code is not flagged
3. **Real-World Tests**: Test on actual example files
4. **Edge Cases**: Test boundary conditions

## Continuous Integration

Tests should run:
- ✅ Before every commit
- ✅ In GitHub Actions workflow
- ✅ Before releases

---

**Last Updated**: Current session
**Pass Rate**: 96% (24/25)
