# Security Advisory: xlsx Dependency Vulnerabilities

## Status: KNOWN ISSUE - DOCUMENTED

**Date**: 2025-12-07  
**Affected Package**: xlsx  
**Current Version**: 0.18.5  
**Required Version for Fix**: 0.20.2 (not yet available on npm)

## Vulnerabilities Identified

### 1. Regular Expression Denial of Service (ReDoS)
- **CVE**: Not yet assigned
- **Severity**: Moderate
- **Affected Versions**: < 0.20.2
- **Description**: SheetJS may be vulnerable to Regular Expression Denial of Service when processing specially crafted Excel files.

### 2. Prototype Pollution
- **CVE**: Not yet assigned  
- **Severity**: High
- **Affected Versions**: < 0.19.3
- **Description**: Prototype pollution vulnerability in SheetJS that could allow attackers to modify object prototypes.

## Current Situation

- **Latest Available Version**: 0.18.5 (published 2022-03-24)
- **Required Fixed Version**: 0.20.2 (not yet published to npm)
- **Patched Version**: Not available

The advisory references versions (0.19.3, 0.20.2) that **do not exist** on npm registry as of this assessment.

## Usage in FinanceAI Pro

The xlsx library is used in:
- **File**: `src/services/import/fileParser.js`
- **Function**: `parseExcel(file)`
- **Purpose**: Parse user-uploaded Excel files (.xls, .xlsx) for transaction import

## Risk Assessment

### Risk Level: MEDIUM

**Factors reducing risk:**
1. **File Size Limit**: Maximum 10MB file upload limit
2. **User Trust**: Users upload their own financial data
3. **Browser Execution**: Runs in user's browser, not on server
4. **Limited Scope**: Only processes financial transaction data

**Factors increasing risk:**
1. **User Input**: Processes user-uploaded files
2. **No Sanitization**: Files are parsed directly without pre-processing
3. **No Timeout**: No timeout mechanism for file parsing

## Mitigation Strategies Implemented

### 1. File Size Validation
```javascript
const maxSize = 10 * 1024 * 1024; // 10MB limit
```
Location: `src/services/import/fileParser.js:214`

This limits the attack surface by preventing extremely large files that could amplify ReDoS attacks.

### 2. Error Handling
All xlsx parsing is wrapped in try-catch blocks:
```javascript
try {
  const workbook = XLSX.read(data, { type: 'array' });
  // ... processing
} catch (error) {
  reject(new Error(`Erro ao processar arquivo Excel: ${error.message}`));
}
```

This prevents crashes from malformed files.

## Recommended Actions

### Immediate Actions (Done)
- ✅ Document the vulnerability
- ✅ Assess risk in application context
- ✅ Review existing mitigations

### Short-term Actions (Recommended)

1. **Add Timeout Mechanism**
   ```javascript
   // Wrap parseExcel in a timeout
   const parseWithTimeout = (file, timeout = 30000) => {
     return Promise.race([
       parseExcel(file),
       new Promise((_, reject) => 
         setTimeout(() => reject(new Error('File processing timeout')), timeout)
       )
     ]);
   };
   ```

2. **Add File Validation**
   - Validate Excel file structure before parsing
   - Check for suspicious patterns
   - Limit number of sheets processed

3. **User Warning**
   - Add warning in UI: "Only upload files from trusted sources"
   - Display file name and size before processing

### Long-term Actions

1. **Monitor for Updates**
   - Watch for xlsx versions 0.19.3+ or 0.20.2+
   - Subscribe to security advisories
   - Update immediately when available

2. **Consider Alternatives**
   - Evaluate alternative libraries (e.g., exceljs, xlsx-populate)
   - Consider server-side parsing for better isolation
   - Implement sandboxed processing if critical

3. **Regular Security Audits**
   - Run `npm audit` regularly
   - Monitor dependency-check tools
   - Keep all dependencies updated

## Monitoring

### Check for Updates
```bash
# Check for new xlsx versions
npm view xlsx versions --json

# Check current version
npm list xlsx

# Update when available
npm update xlsx
```

### Security Scanning
```bash
# Run npm audit
npm audit

# Check specific package
npm audit fix
```

## Workaround Options

### Option 1: Accept Risk (Current)
- Document the issue
- Implement mitigations
- Monitor for updates
- **Status**: IMPLEMENTED

### Option 2: Alternative Library
Replace xlsx with exceljs:
```bash
npm uninstall xlsx
npm install exceljs
```
**Status**: Not implemented (breaking change)

### Option 3: Server-Side Processing
Move Excel parsing to backend:
- Better isolation
- Easier to add timeouts and resource limits
- Can use different parsing libraries
**Status**: Not implemented (architectural change)

### Option 4: Disable Excel Import
Remove Excel import functionality temporarily:
- Only allow CSV import
- Safer but less user-friendly
**Status**: Not recommended

## Decision

**Current Decision**: Accept risk with mitigations

**Rationale**:
1. No patched version available
2. Risk is medium due to context (browser-based, user-uploaded files)
3. Existing mitigations reduce attack surface
4. Alternative libraries may have similar issues
5. Users primarily upload their own financial data

**Review Date**: Check monthly for xlsx updates until patched version is available

## References

- npm package: https://www.npmjs.com/package/xlsx
- GitHub Advisory Database: https://github.com/advisories
- GHSA Database: https://github.com/advisories?query=xlsx

## Changelog

- **2025-12-07**: Initial security assessment
  - Documented vulnerabilities
  - Assessed risk as MEDIUM
  - Implemented documentation and monitoring plan
  - Decision: Accept risk with mitigations until patch available

## Contact

For questions about this security advisory, please review the project's security policy.

---

**Note**: This is a known third-party dependency issue. The application itself does not introduce these vulnerabilities. We are monitoring for updates and will upgrade immediately when a patched version becomes available.
