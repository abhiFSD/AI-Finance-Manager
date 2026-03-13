#!/bin/bash

echo "🔍 Verifying AI Parser & Smart Account Manager Implementation..."
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

count_success=0
count_failed=0

# Function to check file existence
check_file() {
  if [ -f "$1" ]; then
    echo -e "${GREEN}✓${NC} Found: $1"
    ((count_success++))
  else
    echo -e "${RED}✗${NC} Missing: $1"
    ((count_failed++))
  fi
}

# Function to check directory existence
check_dir() {
  if [ -d "$1" ]; then
    echo -e "${GREEN}✓${NC} Found: $1"
    ((count_success++))
  else
    echo -e "${RED}✗${NC} Missing: $1"
    ((count_failed++))
  fi
}

echo "📁 Checking Files and Directories..."
echo "---"

# Check main implementation files
check_file "src/services/parsers/ai-parser.ts"
check_file "src/services/account-manager.ts"
check_file "src/services/ai-import-service.ts"
check_file "src/services/parsers/index.ts"

# Check documentation
check_file "src/services/INTEGRATION_EXAMPLE.md"
check_file "src/services/IMPLEMENTATION_SUMMARY.md"

# Check tests
check_file "src/__tests__/services/ai-parser-account-manager.test.ts"

# Check directories
check_dir "src/services/parsers"

echo ""
echo "📦 Checking Exports..."
echo "---"

# Check if services are exported
if grep -q "parseTransactions" "src/services/index.ts"; then
  echo -e "${GREEN}✓${NC} AI Parser exports found in services/index.ts"
  ((count_success++))
else
  echo -e "${RED}✗${NC} AI Parser exports missing from services/index.ts"
  ((count_failed++))
fi

if grep -q "findOrCreateAccount" "src/services/index.ts"; then
  echo -e "${GREEN}✓${NC} Account Manager exports found in services/index.ts"
  ((count_success++))
else
  echo -e "${RED}✗${NC} Account Manager exports missing from services/index.ts"
  ((count_failed++))
fi

if grep -q "parseAndImport" "src/services/index.ts"; then
  echo -e "${GREEN}✓${NC} AI Import Service exports found in services/index.ts"
  ((count_success++))
else
  echo -e "${RED}✗${NC} AI Import Service exports missing from services/index.ts"
  ((count_failed++))
fi

echo ""
echo "🔤 Checking TypeScript Compilation..."
echo "---"

# Check TypeScript compilation
if npx tsc --noEmit --skipLibCheck \
  src/services/parsers/ai-parser.ts \
  src/services/account-manager.ts \
  src/services/ai-import-service.ts \
  src/services/parsers/index.ts \
  2>/dev/null; then
  echo -e "${GREEN}✓${NC} All TypeScript files compile successfully"
  ((count_success++))
else
  echo -e "${RED}✗${NC} TypeScript compilation errors found"
  ((count_failed++))
fi

echo ""
echo "📋 Summary"
echo "---"
echo -e "${GREEN}Passed:${NC} $count_success checks"
if [ $count_failed -gt 0 ]; then
  echo -e "${RED}Failed:${NC} $count_failed checks"
fi

echo ""
if [ $count_failed -eq 0 ]; then
  echo -e "${GREEN}✅ IMPLEMENTATION VERIFIED - ALL CHECKS PASSED${NC}"
  exit 0
else
  echo -e "${RED}❌ IMPLEMENTATION INCOMPLETE - SOME CHECKS FAILED${NC}"
  exit 1
fi
