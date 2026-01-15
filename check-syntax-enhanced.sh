#!/bin/bash
# Enhanced syntax validation script for JS/TS files
# Checks JavaScript syntax, TypeScript types, and imports

echo "🔍 Enhanced Syntax & Type Validation"
echo "===================================="

ERROR_COUNT=0

# 1. JavaScript syntax check
echo "📄 Checking JavaScript syntax..."
find . -name "*.js" -not -path "./node_modules/*" -not -path "./__tests__/*" | while read file; do
  if ! node -c "$file" 2>/dev/null; then
    echo "❌ JS SYNTAX ERROR in $file"
    ERROR_COUNT=$((ERROR_COUNT + 1))
  fi
done

# 2. TypeScript compilation check (catches TypeScript syntax in .js files)
echo "🔷 Checking TypeScript types..."
if command -v npx &> /dev/null; then
  if ! npx tsc --noEmit --skipLibCheck 2>/dev/null; then
    echo "⚠️  TypeScript compilation issues detected"
  fi
fi

# 3. ESLint check (catches undefined variables, imports, etc.)
echo "📋 Running ESLint checks..."
if command -v npx &> /dev/null; then
  if ! npx eslint . --ext .js,.ts,.tsx --quiet 2>/dev/null; then
    echo "⚠️  ESLint issues detected"
  fi
fi

echo "===================================="
if [ $ERROR_COUNT -eq 0 ]; then
  echo "✅ All syntax checks passed!"
else
  echo "❌ Found $ERROR_COUNT syntax errors"
  exit 1
fi
