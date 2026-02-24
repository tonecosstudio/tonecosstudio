# Admin Groups 404 Bugfix Design

## Overview

Admin users receive 404 errors when clicking on group cards because the navigation code uses an English path (`/admin/groups/:groupId`) while the route is defined with a Portuguese path (`/admin/grupos/:groupId`). The fix is straightforward: update the navigation path in `AdminGroupsPage.tsx` to match the defined route.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the 404 - when navigation uses `/admin/groups/:groupId` instead of `/admin/grupos/:groupId`
- **Property (P)**: The desired behavior - navigation should successfully display the AdminGroupDetailsPage component
- **Preservation**: Existing Portuguese route behavior and all other admin routes that must remain unchanged
- **handleGroupSelect**: The function in `AdminGroupsPage.tsx` that handles group card clicks and performs navigation
- **currentRoute**: The React Router route definition in `App.tsx` that maps paths to components

## Bug Details

### Fault Condition

The bug manifests when an admin user clicks on a group card in the AdminGroupsPage. The `handleGroupSelect` function navigates to `/admin/groups/{groupId}` (English), but no route exists for this path. The only defined route is `/admin/grupos/{groupId}` (Portuguese).

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type { groupId: string, navigationPath: string }
  OUTPUT: boolean
  
  RETURN navigationPath STARTS WITH '/admin/groups/'
         AND navigationPath DOES NOT START WITH '/admin/grupos/'
END FUNCTION
```

### Examples

- **Example 1**: User clicks on group card with ID `abc-123`
  - Current: Navigates to `/admin/groups/abc-123` → 404 Not Found
  - Expected: Navigates to `/admin/grupos/abc-123` → AdminGroupDetailsPage displays

- **Example 2**: User directly visits `/admin/groups/abc-123`
  - Current: 404 Not Found
  - Expected: AdminGroupDetailsPage displays

- **Example 3**: User clicks on group with ID `xyz-789`
  - Current: Navigates to `/admin/groups/xyz-789` → 404 Not Found
  - Expected: Navigates to `/admin/grupos/xyz-789` → AdminGroupDetailsPage displays

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Accessing `/admin/grupos` (list page) must continue to work
- Accessing `/admin/grupos/{groupId}` (detail page) must continue to work for direct navigation
- All other admin routes must remain unaffected
- The AdminGroupDetailsPage component behavior must remain unchanged

**Scope:**
All inputs that do NOT involve the `handleGroupSelect` navigation should be completely unaffected by this fix. This includes:
- Direct navigation to `/admin/grupos/:groupId`
- All other admin routes (`/admin/users`, `/admin/permissions`, etc.)
- Member routes (`/grupos/:groupId`)
- Any non-admin routes

## Hypothesized Root Cause

Based on the bug analysis, the issue is straightforward:

1. **Incorrect Navigation Path**: The `handleGroupSelect` function in `AdminGroupsPage.tsx` uses an English path `/admin/groups/:groupId` instead of the Portuguese path `/admin/grupos/:groupId` that matches the defined route in `App.tsx`.

2. **Route Definition Consistency**: The route in `App.tsx` correctly uses Portuguese (`/admin/grupos/:groupId`) to maintain language consistency with the rest of the admin interface.

3. **Simple Typo/Mismatch**: This appears to be a simple path mismatch during development where the navigation code was written with English path segments while the route was defined with Portuguese.

## Correctness Properties

Property 1: Fault Condition - Admin Group Navigation

_For any_ group selection event where `handleGroupSelect` is invoked with a valid groupId, the fixed function SHALL navigate to `/admin/grupos/{groupId}` and the AdminGroupDetailsPage SHALL be displayed without 404 errors.

**Validates: Requirements 2.1, 2.2**

Property 2: Preservation - Portuguese Route Behavior

_For any_ direct navigation to `/admin/grupos/{groupId}`, the fixed code SHALL produce exactly the same behavior as before, displaying the AdminGroupDetailsPage correctly.

**Validates: Requirements 3.1, 3.2**

## Fix Implementation

### Changes Required

**File**: `src/pages/admin/AdminGroupsPage.tsx`

**Function**: `handleGroupSelect`

**Specific Changes**:
1. **Path Correction**: Change the navigation path from `/admin/groups/${groupId}` to `/admin/grupos/${groupId}`
   - Line 35: `navigate(`/admin/groups/${groupId}`);` → `navigate(`/admin/grupos/${groupId}`);`

## Testing Strategy

### Validation Approach

The testing strategy is simple: verify that clicking a group card now navigates to the correct URL and displays the detail page without 404 errors.

### Exploratory Fault Condition Checking

**Goal**: Confirm the bug exists by attempting to navigate to the incorrect path.

**Test Plan**: Click on a group card and verify the current behavior results in a 404 error.

**Test Cases**:
1. **Group Card Click Test**: Click on any group card and observe the browser URL and page response (will fail on unfixed code - shows 404)

**Expected Counterexample**:
- Navigation to `/admin/groups/{groupId}` results in 404 Not Found page

### Fix Checking

**Goal**: Verify that after the fix, clicking a group card navigates to the correct path.

**Pseudocode:**
```
FOR ALL groupId IN validGroupIds DO
  handleGroupSelect(groupId)
  ASSERT currentUrl() = `/admin/grupos/${groupId}`
  ASSERT pageContains(AdminGroupDetailsPage)
END FOR
```

### Preservation Checking

**Goal**: Verify that direct navigation to Portuguese routes continues to work.

**Pseudocode:**
```
FOR ALL groupId IN validGroupIds DO
  navigate(`/admin/grupos/${groupId}`)
  ASSERT pageContains(AdminGroupDetailsPage)
END FOR
```

**Testing Approach**: Manual testing is sufficient for this simple path fix.

**Test Cases**:
1. **Direct Portuguese Route**: Navigate directly to `/admin/grupos/{groupId}` and verify page loads
2. **List Page Access**: Navigate to `/admin/grupos` and verify AdminGroupsPage displays
3. **Other Admin Routes**: Verify other admin routes remain unaffected

### Unit Tests

- No unit tests required for this simple path change
- The fix is a single-line change that can be verified through integration testing

### Property-Based Tests

- Not applicable for this fix (no complex input domain to test)

### Integration Tests

- Click group card → verify URL changes to `/admin/grupos/{groupId}`
- Click group card → verify AdminGroupDetailsPage content displays
- Direct navigation to `/admin/grupos/{groupId}` → verify page loads correctly