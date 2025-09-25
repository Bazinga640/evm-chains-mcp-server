# AGENTS.md - Rules for AI Agents Working on This Repository

**Last Updated**: 2025-10-26
**Purpose**: Critical rules that ALL AI agents (Claude, GPT-5, etc.) MUST follow when working on this codebase

---

## 🚨 CRITICAL: DO NOT DELETE RULES

### Rule #1: NEVER Delete Test Wallet Credentials

**Files that must NEVER be deleted or cleared:**
- `.env` (contains TEST_WALLET_PRIVATE_KEY)
- `WALLET-BACKUP.md` (backup copy of credentials)
- `tests/test-credentials.js` (credential loader)
- Any file with wallet addresses, private keys, or mnemonics in testing context

**Why**: Test tokens take time to acquire from faucets. Losing credentials means:
- Lost test tokens (even if "valueless", they're annoying to re-acquire)
- Wasted time re-funding wallets
- Broken test continuity
- Frustration and repeated setup

**What to do instead**:
- If credentials need rotation, CREATE NEW credentials first
- Document the rotation in COMPREHENSIVE-TEST-TRACKING.md
- Archive old credentials, don't delete them
- Confirm with user before any credential changes

---

### Rule #2: NEVER Delete Testing Documentation During "Cleanup"

**Files that must be preserved:**
- `COMPREHENSIVE-TEST-TRACKING.md` - Active test progress tracking
- `TEST-RESULTS-*.md` - Historical test results
- `GPT5-REVIEW-*.md` - Code review findings
- `WALLET-BACKUP.md` - Wallet credential backup
- Any file in `tests/` directory

**Why**: These files contain:
- Test history and progress
- Known issues and resolutions
- Transaction hashes for verification
- Wallet addresses and balances

**What to do instead**:
- If files are truly obsolete, move to `docs/archive/` directory
- Never delete without explicit user permission
- Add a note to the archive explaining why it was moved

---

### Rule #3: Test Files Are Not "Clutter"

**Files that GPT-5 often flags for deletion:**
- `tests/manual/*.js` - Manual test scripts (KEEP THESE)
- `create-test-wallet.js` - Wallet creation utility (KEEP THIS)
- `check-balance.js` - Quick balance checker (KEEP THIS)
- Test transaction logs and reports (KEEP THESE)

**Why**: These are active development tools, not dead code. They:
- Enable quick manual testing during development
- Provide examples of tool usage
- Help debug issues
- Support MCP Inspector testing workflow

**What to do instead**:
- Organize test files into subdirectories if needed
- Add README.md in test directories explaining their purpose
- Never delete without confirming they're truly unused

---

### Rule #4: "Cleanup" Must Be Surgical, Not Nuclear

**Anti-pattern**: GPT-5 often recommends:
```
"Delete all test files, they're not needed in production"
"Remove all .md files except README"
"Clean up the repository by removing X, Y, Z"
```

**Correct approach**:
- This is a DEVELOPMENT repository, not a production package
- Test files and documentation are ESSENTIAL
- "Cleanup" should focus on:
  - Removing actual duplicates (same content, different file)
  - Archiving truly obsolete files (move, don't delete)
  - Organizing files into better structure
  - Fixing inconsistencies in existing files

---

### Rule #5: Credential Security vs. Testnet Practicality

**Testnet wallets are different from mainnet:**
- Testnet tokens have ZERO real-world value
- It's acceptable to have testnet credentials in the repository
- Private keys for TESTNET ONLY wallets can be committed (with warnings)
- Mainnet credentials must NEVER be committed

**Current practice**:
- `.env` contains testnet credentials (acceptable for this testnet-only server)
- `WALLET-BACKUP.md` stores redundant copy (acceptable)
- Environment variables are supported but optional for testnets
- Mainnet servers MUST use environment variables only

**What to do**:
- Don't flag testnet credentials as "security issues" requiring deletion
- Do flag any mainnet credentials or API keys
- Do recommend environment variables as best practice
- Don't delete existing testnet credentials during "security hardening"

---

## 🎯 Agent-Specific Guidance

### For GPT-5 (Code Review Agent)

**Your strengths**: Finding bugs, security issues, code quality problems
**Your weakness**: Over-aggressive deletion recommendations

**When reviewing this codebase:**
- ✅ DO: Flag security issues, bugs, code smells
- ✅ DO: Suggest refactoring and improvements
- ✅ DO: Identify unused imports or dead code within files
- ❌ DON'T: Recommend deleting entire test files
- ❌ DON'T: Recommend deleting documentation files
- ❌ DON'T: Recommend deleting wallet credentials
- ❌ DON'T: Recommend "cleanup" that involves file deletion

**Ask first**: If you think a file should be deleted, ASK the user instead of recommending deletion.

### For Claude Code (Development Agent)

**Your strengths**: Understanding context, following user intent, building features
**Your responsibility**: Protect test continuity

**When working on this codebase:**
- ✅ DO: Preserve all wallet credentials
- ✅ DO: Update test tracking documents
- ✅ DO: Ask before deleting anything
- ✅ DO: Archive instead of delete when possible
- ❌ DON'T: Follow deletion recommendations blindly
- ❌ DON'T: Clear .env files during "cleanup"
- ❌ DON'T: Delete test scripts during refactoring

**Override GPT-5**: If GPT-5 recommends deleting test files or credentials, REJECT the recommendation and explain why using this document.

### For Other Agents (Cursor, Copilot, etc.)

**Follow these rules**:
1. Read this file before making changes
2. Never delete files without user confirmation
3. Preserve all wallet credentials and test documentation
4. When in doubt, ask the user
5. Archive obsolete files, don't delete them

---

## 📋 Pre-Change Checklist for All Agents

Before deleting ANY file, verify:
- [ ] File is not in the "NEVER DELETE" list above
- [ ] File contains no wallet credentials (address, private key, mnemonic)
- [ ] File contains no test results or transaction history
- [ ] User has explicitly approved deletion
- [ ] File content is backed up or archived elsewhere

**If any checkbox is unchecked, DO NOT DELETE.**

---

## 🔧 Workflow for Handling GPT-5 Recommendations

When GPT-5 Or any other model recommends deletions:

1. **Read the recommendation carefully**
2. **Check against this AGENTS.md file**
3. **If it conflicts with rules above**:
   - Reject the deletion recommendation
   - Explain to user using this document as reference
   - Suggest alternative (archive, organize, refactor instead)
4. **If it doesn't conflict**:
   - Ask user for confirmation before proceeding
   - Create backup/archive if deleting anything

---

## 📝 Version History

| Date | Change | Reason |
|------|--------|--------|
| 2025-10-26 | Initial creation | Multiple incidents of credential loss due to AI agent cleanup |

---

**Remember**: This is a TESTNET development repository. Files that might be "clutter" in a production package are ESSENTIAL here. When in doubt, preserve and organize rather than delete.
