# Implementation Plan

- [ ] 1. Write bug condition exploration test
  - **Property 1: Fault Condition** - Admin Group Navigation Path Mismatch
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: For this deterministic bug, scope to the concrete failing case: clicking a group card navigates to wrong path
  - Test that handleGroupSelect(groupId) navigates to `/admin/grupos/{groupId}` (from Expected Behavior in design)
  - Current buggy behavior: handleGroupSelect navigates to `/admin/groups/{groupId}` which returns 404
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists)
  - Document counterexamples found (e.g., "handleGroupSelect('abc-123') navigates to /admin/groups/abc-123 → 404 instead of /admin/grupos/abc-123")
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 2.1, 2.2_

- [ ] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Portuguese Route Behavior
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for non-buggy inputs (direct navigation to Portuguese routes)
  - Observe: navigate('/admin/grupos/abc-123') displays AdminGroupDetailsPage on unfixed code
  - Observe: navigate('/admin/grupos/xyz-789') displays AdminGroupDetailsPage on unfixed code
  - Write property-based test: for all valid groupIds, direct navigation to `/admin/grupos/{groupId}` displays AdminGroupDetailsPage (from Preservation Requirements in design)
  - Property-based testing generates many test cases for stronger guarantees
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2_

- [ ] 3. Fix for admin groups 404 error

  - [ ] 3.1 Implement the fix
    - Update navigate() call in handleGroupSelect function from `/admin/groups/${groupId}` to `/admin/grupos/${groupId}`
    - File: src/pages/admin/AdminGroupsPage.tsx
    - Line 35: Change `navigate(\`/admin/groups/${groupId}\`);` to `navigate(\`/admin/grupos/${groupId}\`);`
    - _Bug_Condition: isBugCondition(input) where input.navigationPath STARTS WITH '/admin/groups/' AND DOES NOT START WITH '/admin/grupos/'_
    - _Expected_Behavior: expectedBehavior(result) where navigationPath = `/admin/grupos/${groupId}` and AdminGroupDetailsPage displays_
    - _Preservation: Direct navigation to `/admin/grupos/{groupId}` continues to work, all other admin routes unaffected_
    - _Requirements: 2.1, 2.2, 3.1, 3.2_

  - [ ] 3.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Admin Group Navigation Path Mismatch
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.1, 2.2_

  - [ ] 3.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Portuguese Route Behavior
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all tests still pass after fix (no regressions)
    - _Requirements: 3.1, 3.2_

- [ ] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.