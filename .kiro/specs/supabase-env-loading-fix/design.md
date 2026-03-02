# Supabase Environment Variable Loading Bugfix Design

## Overview

The Supabase client initialization fails because environment variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` are undefined at runtime, causing the application to crash with "Invalid supabaseUrl: Must be a valid HTTP or HTTPS URL" error. The root cause is that Vite's environment variable loading prioritizes `.env.local` over `.env`, and the required Supabase variables are missing from `.env.local`. The fix involves adding proper environment variable validation with clear error messages and ensuring the variables are available from the correct source.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug - when Supabase environment variables are undefined during client initialization
- **Property (P)**: The desired behavior - Supabase client successfully initializes with valid URL and key values
- **Preservation**: Existing Supabase functionality (queries, auth, other env vars) that must remain unchanged by the fix
- **import.meta.env**: Vite's mechanism for accessing environment variables at build time and runtime
- **VITE_SUPABASE_URL**: Environment variable containing the Supabase project URL (https://pabxpvqwtvbjaunjejud.supabase.co)
- **VITE_SUPABASE_PUBLISHABLE_KEY**: Environment variable containing the Supabase anonymous/public API key
- **.env.local**: Local environment file that takes precedence over .env in Vite's loading order

## Bug Details

### Fault Condition

The bug manifests when the Supabase client is initialized in `src/integrations/supabase/client.ts` and the environment variables `VITE_SUPABASE_URL` or `VITE_SUPABASE_PUBLISHABLE_KEY` are undefined. This occurs because Vite loads environment variables in a specific order (.env.local > .env), and the `.env.local` file exists but doesn't contain the required Supabase variables, causing them to be undefined even though they exist in `.env`.

**Formal Specification:**

```
FUNCTION isBugCondition(input)
  INPUT: input of type EnvironmentVariableAccess
  OUTPUT: boolean

  RETURN (input.variableName == 'VITE_SUPABASE_URL' OR
          input.variableName == 'VITE_SUPABASE_PUBLISHABLE_KEY')
         AND import.meta.env[input.variableName] === undefined
         AND fileExists('.env.local')
         AND NOT variableDefinedIn('.env.local', input.variableName)
END FUNCTION
```

### Examples

- **Example 1**: Application starts → reads .env.local (no VITE_SUPABASE_URL) → import.meta.env.VITE_SUPABASE_URL is undefined → createClient(undefined, key) → crashes with "Invalid supabaseUrl" error
  - Expected: Should read from .env or provide clear error message
- **Example 2**: Developer adds .env.local for Vercel token → forgets to add Supabase vars → application crashes on next load
  - Expected: Should validate required variables and show which ones are missing

- **Example 3**: VITE_SUPABASE_URL exists in .env but not .env.local → Vite prioritizes .env.local → variable becomes undefined
  - Expected: Should either read from .env or require explicit definition in .env.local

- **Edge Case**: Both variables are undefined → should show clear error listing both missing variables
  - Expected: "Missing required environment variables: VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY"

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**

- Database queries through the Supabase client must continue to work exactly as before
- Authentication operations with localStorage persistence must remain unchanged
- Other environment variables accessed via import.meta.env must continue to load correctly
- Production build process must continue to bundle environment variables correctly
- Auth configuration (storage, persistSession, autoRefreshToken) must remain unchanged

**Scope:**
All Supabase client usage after successful initialization should be completely unaffected by this fix. This includes:

- Database queries and mutations
- Real-time subscriptions
- Authentication flows (login, logout, session management)
- File storage operations
- Any other Supabase SDK features

## Hypothesized Root Cause

Based on the bug description and code analysis, the root causes are:

1. **Vite Environment Variable Priority**: Vite loads environment files in this order: .env.local > .env.development.local > .env.development > .env
   - The `.env.local` file exists (contains VERCEL_OIDC_TOKEN)
   - Vite reads .env.local first and doesn't find VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY
   - Since .env.local exists, variables not defined in it may not be loaded from .env

2. **Missing Variable Validation**: The code directly passes undefined values to createClient() without validation
   - No runtime check to ensure variables are defined
   - No helpful error message indicating which variables are missing
   - Application crashes with cryptic Supabase SDK error instead of clear configuration error

3. **Environment File Management**: The .env.local file was created for Vercel CLI but doesn't include all required variables
   - Developer added .env.local for local development needs
   - Didn't realize it would override .env for all VITE\_ variables
   - No documentation or validation to catch this configuration issue

## Correctness Properties

Property 1: Fault Condition - Environment Variables Must Be Defined

_For any_ Supabase client initialization where VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY are undefined, the fixed code SHALL throw a clear error message listing the missing variables before attempting to call createClient(), preventing cryptic SDK errors.

**Validates: Requirements 2.1, 2.2, 2.3, 2.5**

Property 2: Preservation - Existing Supabase Functionality

_For any_ Supabase client operation (queries, auth, subscriptions) after successful initialization with valid environment variables, the fixed code SHALL produce exactly the same behavior as the original code, preserving all existing database, authentication, and SDK functionality.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File**: `src/integrations/supabase/client.ts`

**Function**: Module-level initialization code

**Specific Changes**:

1. **Add Environment Variable Validation**: Add runtime validation before createClient() call
   - Check if SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY are defined
   - Throw descriptive error if either is undefined
   - List all missing variables in the error message

2. **Add Type Safety**: Ensure TypeScript knows the variables are strings
   - Use type assertion or validation function
   - Prevent undefined from being passed to createClient()

3. **Update .env.local**: Add missing Supabase variables to .env.local
   - Copy VITE_SUPABASE_URL from .env to .env.local
   - Copy VITE_SUPABASE_PUBLISHABLE_KEY from .env to .env.local
   - Ensure .env.local has all required VITE\_ variables

4. **Add Helpful Error Messages**: Provide actionable guidance in error messages
   - Indicate which file should contain the variables (.env.local or .env)
   - Suggest checking .env.example for required variables
   - Include the variable names that are missing

**Implementation Approach**:

```typescript
// Validate environment variables before client creation
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  const missing = [];
  if (!SUPABASE_URL) missing.push("VITE_SUPABASE_URL");
  if (!SUPABASE_PUBLISHABLE_KEY) missing.push("VITE_SUPABASE_PUBLISHABLE_KEY");

  throw new Error(
    `Missing required environment variables: ${missing.join(", ")}. ` +
      `Please ensure these are defined in your .env.local or .env file.`
  );
}

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
```

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code (undefined variables causing crashes), then verify the fix provides clear error messages and preserves existing functionality when variables are properly defined.

### Exploratory Fault Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm that undefined environment variables cause the application to crash with cryptic errors.

**Test Plan**: Temporarily remove VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY from .env.local (or rename .env.local to simulate the bug), then attempt to start the application. Observe the error messages and crash behavior on the UNFIXED code.

**Test Cases**:

1. **Missing URL Test**: Remove VITE_SUPABASE_URL from .env.local, start app (will fail with "Invalid supabaseUrl" on unfixed code)
2. **Missing Key Test**: Remove VITE_SUPABASE_PUBLISHABLE_KEY from .env.local, start app (will fail with Supabase SDK error on unfixed code)
3. **Both Missing Test**: Remove both variables from .env.local, start app (will fail with cryptic error on unfixed code)
4. **Empty String Test**: Set variables to empty strings in .env.local (may fail with different error on unfixed code)

**Expected Counterexamples**:

- Application crashes with "Invalid supabaseUrl: Must be a valid HTTP or HTTPS URL"
- No indication of which environment variable is missing
- No guidance on how to fix the configuration issue
- Possible causes: undefined passed to createClient(), no validation before SDK call

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds (undefined environment variables), the fixed function provides clear error messages before attempting to initialize the Supabase client.

**Pseudocode:**

```
FOR ALL input WHERE isBugCondition(input) DO
  result := initializeSupabaseClient_fixed(input)
  ASSERT result.error.message CONTAINS missing variable names
  ASSERT result.error.message CONTAINS actionable guidance
  ASSERT NOT result.error.message CONTAINS "Invalid supabaseUrl"
END FOR
```

**Test Plan**: After implementing the fix, test with missing variables to ensure clear error messages are shown.

**Test Cases**:

1. **Clear Error for Missing URL**: Remove VITE_SUPABASE_URL, verify error lists "VITE_SUPABASE_URL"
2. **Clear Error for Missing Key**: Remove VITE_SUPABASE_PUBLISHABLE_KEY, verify error lists the key variable
3. **Clear Error for Both Missing**: Remove both, verify error lists both variables
4. **Actionable Guidance**: Verify error message mentions .env.local or .env file

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold (valid environment variables are defined), the fixed function produces the same result as the original function.

**Pseudocode:**

```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT initializeSupabaseClient_original(input) = initializeSupabaseClient_fixed(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:

- It verifies behavior across different valid environment variable values
- It catches edge cases in Supabase client initialization
- It provides strong guarantees that existing functionality is unchanged

**Test Plan**: Observe behavior on UNFIXED code first with valid environment variables (database queries, auth operations work correctly), then write tests capturing that behavior to run on FIXED code.

**Test Cases**:

1. **Database Query Preservation**: Verify SELECT queries work identically before and after fix
2. **Auth Operation Preservation**: Verify login/logout operations work identically
3. **Client Configuration Preservation**: Verify auth settings (localStorage, persistSession, autoRefreshToken) are unchanged
4. **Other Environment Variables Preservation**: Verify non-Supabase environment variables still load correctly

### Unit Tests

- Test environment variable validation logic with undefined values
- Test error message generation with different combinations of missing variables
- Test successful client initialization with valid variables
- Test edge cases (empty strings, whitespace-only strings)

### Property-Based Tests

- Generate random valid environment variable values and verify client initializes successfully
- Generate random combinations of undefined/defined variables and verify appropriate error handling
- Test that all valid URL formats are accepted by the validation logic
- Test that client configuration remains consistent across different valid inputs

### Integration Tests

- Test full application startup with valid environment variables in .env.local
- Test application startup with variables only in .env (no .env.local)
- Test application startup with missing variables and verify error display
- Test that database operations work correctly after successful initialization
- Test that authentication flows work correctly after successful initialization
