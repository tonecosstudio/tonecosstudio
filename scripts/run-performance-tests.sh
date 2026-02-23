#!/bin/bash

# Performance Test Runner for Manual Payment System
# Task 29.2 - Testes de performance

set -e

echo "=========================================="
echo "Manual Payment System - Performance Tests"
echo "=========================================="
echo ""

# Check if VITEST_PERFORMANCE is set
if [ -z "$VITEST_PERFORMANCE" ]; then
  echo "⚠️  VITEST_PERFORMANCE environment variable not set"
  echo "Setting VITEST_PERFORMANCE=true for this run..."
  export VITEST_PERFORMANCE=true
fi

# Check if Supabase credentials are configured
if [ -z "$VITE_SUPABASE_URL" ] || [ -z "$VITE_SUPABASE_ANON_KEY" ]; then
  echo "❌ Error: Supabase credentials not configured"
  echo "Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your .env file"
  exit 1
fi

echo "✅ Environment configured"
echo ""

# Parse command line arguments
TEST_FILTER=""
if [ ! -z "$1" ]; then
  TEST_FILTER="-t $1"
  echo "Running filtered tests: $1"
else
  echo "Running all performance tests..."
fi
echo ""

# Run the tests
echo "Starting performance tests..."
echo "=========================================="
npm run test -- src/test/performance.test.ts $TEST_FILTER

echo ""
echo "=========================================="
echo "Performance tests completed!"
echo "=========================================="
