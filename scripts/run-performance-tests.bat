@echo off
REM Performance Test Runner for Manual Payment System
REM Task 29.2 - Testes de performance

echo ==========================================
echo Manual Payment System - Performance Tests
echo ==========================================
echo.

REM Check if VITEST_PERFORMANCE is set
if "%VITEST_PERFORMANCE%"=="" (
  echo WARNING: VITEST_PERFORMANCE environment variable not set
  echo Setting VITEST_PERFORMANCE=true for this run...
  set VITEST_PERFORMANCE=true
)

REM Check if Supabase credentials are configured
if "%VITE_SUPABASE_URL%"=="" (
  echo ERROR: Supabase credentials not configured
  echo Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your .env file
  exit /b 1
)

if "%VITE_SUPABASE_ANON_KEY%"=="" (
  echo ERROR: Supabase credentials not configured
  echo Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your .env file
  exit /b 1
)

echo Environment configured
echo.

REM Parse command line arguments
set TEST_FILTER=
if not "%1"=="" (
  set TEST_FILTER=-t %1
  echo Running filtered tests: %1
) else (
  echo Running all performance tests...
)
echo.

REM Run the tests
echo Starting performance tests...
echo ==========================================
call npm run test -- src/test/performance.test.ts %TEST_FILTER%

echo.
echo ==========================================
echo Performance tests completed!
echo ==========================================
