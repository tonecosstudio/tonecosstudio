# UAT Issue Tracking Template
## Production Management System

Use this template to document and track issues discovered during User Acceptance Testing.

---

## Issue Information

**Issue ID**: UAT-[###]  
**Date Reported**: _______________  
**Reported By**: ☐ Admin User  ☐ Customer User  ☐ UAT Coordinator  ☐ Observer  
**Participant ID**: _______________  

---

## Issue Classification

### Severity
☐ **Critical** - Prevents task completion, data loss, system crash  
☐ **High** - Significantly impairs usability, confusing workflow  
☐ **Medium** - Minor usability issue, unclear messaging  
☐ **Low** - Cosmetic issue, nice-to-have enhancement  

### Category
☐ Navigation  
☐ Workflow  
☐ Clarity  
☐ Performance  
☐ Visual  
☐ Mobile  
☐ Integration  
☐ Accessibility  
☐ Other: _______________

### Component
☐ Production Dashboard  
☐ Character Choice Management  
☐ Production Stage Tracking  
☐ Customer Progress View  
☐ Team Assignment  
☐ Blocking/Issue Management  
☐ Notifications  
☐ OrdersPage Integration  
☐ Other: _______________

---

## Issue Description

### Title
_________________________________________________________________

### Detailed Description
What is the issue? Be specific and detailed.

_________________________________________________________________

_________________________________________________________________

_________________________________________________________________

_________________________________________________________________

### Steps to Reproduce
1. _________________________________________________________________
2. _________________________________________________________________
3. _________________________________________________________________
4. _________________________________________________________________
5. _________________________________________________________________

### Expected Behavior
What should happen?

_________________________________________________________________

_________________________________________________________________

### Actual Behavior
What actually happened?

_________________________________________________________________

_________________________________________________________________

### Impact
How does this affect the user's ability to complete their task?

_________________________________________________________________

_________________________________________________________________

---

## Environment Information

**Browser**: ☐ Chrome  ☐ Firefox  ☐ Safari  ☐ Edge  ☐ Other: _______________  
**Browser Version**: _______________  
**Device**: ☐ Desktop  ☐ Laptop  ☐ Tablet  ☐ Mobile  
**Operating System**: ☐ Windows  ☐ macOS  ☐ iOS  ☐ Android  ☐ Other: _______________  
**Screen Size**: _______________  
**Test Environment URL**: _______________

---

## Supporting Information

### Screenshots
☐ Screenshot attached  
☐ Screen recording attached  
☐ No visual documentation  

**File Names**: _________________________________________________________________

### Console Errors
Were there any console errors?  
☐ Yes  ☐ No  ☐ Unknown

If Yes, paste error messages:
```
[Paste console errors here]
```

### Network Errors
Were there any network/API errors?  
☐ Yes  ☐ No  ☐ Unknown

If Yes, describe:
_________________________________________________________________

### Related Issues
Are there other related issues?  
☐ Yes  ☐ No

If Yes, list issue IDs: _________________________________________________________________

---

## User Impact Assessment

### Frequency
How often does this issue occur?  
☐ Always (100%)  
☐ Frequently (>50%)  
☐ Sometimes (25-50%)  
☐ Rarely (<25%)  
☐ Once

### User Type Affected
☐ Admin users only  
☐ Customer users only  
☐ Both admin and customer users  
☐ Specific role: _______________

### Workaround Available
Is there a workaround?  
☐ Yes  ☐ No

If Yes, describe:
_________________________________________________________________

_________________________________________________________________

### Business Impact
☐ Blocks critical business process  
☐ Reduces efficiency significantly  
☐ Minor inconvenience  
☐ Cosmetic only

---

## Triage Information

**Triaged By**: _______________  
**Triage Date**: _______________  

### Priority
☐ P0 - Must fix before production (Critical blocker)  
☐ P1 - Should fix before production (High priority)  
☐ P2 - Can fix after production (Medium priority)  
☐ P3 - Future enhancement (Low priority)  
☐ Won't Fix - Not a bug / Working as intended

### Assigned To
**Developer**: _______________  
**Assignment Date**: _______________

### Estimated Effort
☐ Quick fix (< 1 hour)  
☐ Small (1-4 hours)  
☐ Medium (1-2 days)  
☐ Large (3-5 days)  
☐ Extra Large (> 1 week)

### Target Resolution Date
_______________

---

## Resolution Information

### Status
☐ Open - Not yet addressed  
☐ In Progress - Being worked on  
☐ Fixed - Resolution implemented  
☐ Verified - Fix confirmed by reporter  
☐ Closed - Issue resolved and verified  
☐ Won't Fix - Not addressing  
☐ Duplicate - Same as issue #_______________  
☐ Cannot Reproduce - Unable to replicate

### Resolution Date
_______________

### Resolution Description
How was the issue resolved?

_________________________________________________________________

_________________________________________________________________

_________________________________________________________________

### Code Changes
**Files Modified**: _________________________________________________________________

**Commit/PR**: _________________________________________________________________

### Testing Notes
How was the fix verified?

_________________________________________________________________

_________________________________________________________________

---

## Verification

**Verified By**: _______________  
**Verification Date**: _______________  
**Verification Status**: ☐ Pass  ☐ Fail  ☐ Partial

**Verification Notes**:
_________________________________________________________________

_________________________________________________________________

---

## Additional Notes

### Root Cause Analysis
What caused this issue?

_________________________________________________________________

_________________________________________________________________

### Prevention
How can we prevent similar issues in the future?

_________________________________________________________________

_________________________________________________________________

### Lessons Learned
_________________________________________________________________

_________________________________________________________________

---

## Issue History

| Date | Action | By | Notes |
|------|--------|-----|-------|
| | Reported | | |
| | Triaged | | |
| | Assigned | | |
| | Fixed | | |
| | Verified | | |
| | Closed | | |

---

## Attachments

List all attachments (screenshots, videos, logs, etc.):

1. _________________________________________________________________
2. _________________________________________________________________
3. _________________________________________________________________
4. _________________________________________________________________
5. _________________________________________________________________

---

**Template Version**: 1.0  
**Last Updated**: January 2025

---

## Quick Reference: Severity Guidelines

### Critical
- System crash or freeze
- Data loss or corruption
- Security vulnerability
- Complete feature failure
- Prevents task completion
- Affects all users

### High
- Significant usability problem
- Confusing workflow causing errors
- Missing critical information
- Inconsistent behavior
- Affects many users
- No reasonable workaround

### Medium
- Minor usability issue
- Unclear labeling
- Non-optimal workflow
- Cosmetic issue affecting usability
- Affects some users
- Workaround available

### Low
- Cosmetic issue only
- Minor text/formatting
- Nice-to-have enhancement
- Affects few users
- Easy workaround available

---

## Quick Reference: Priority Guidelines

### P0 (Must Fix)
- Critical severity issues
- Blocks UAT completion
- Prevents production deployment
- Affects core functionality
- No workaround available

### P1 (Should Fix)
- High severity issues
- Significantly impacts usability
- Affects important workflows
- Should be fixed before production
- Workaround is difficult

### P2 (Can Fix Later)
- Medium severity issues
- Minor impact on usability
- Can be addressed post-production
- Workaround is reasonable

### P3 (Future Enhancement)
- Low severity issues
- Cosmetic improvements
- Nice-to-have features
- Can be deferred to future release
