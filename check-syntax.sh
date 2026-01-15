#!/bin/bash
# Quick syntax validation script for JS/TS files
# Usage: ./check-syntax.sh [file] or find all files

if [ -n "$1" ]; then
  # Check specific file
  echo "🔍 Checking syntax: $1"
  node -c "$1" 2>&1 || echo "❌ SYNTAX ERROR in $1"
else
  # Check all JS/TS files
  echo "🔍 Checking syntax of all JS/TS files..."
  find . -name "*.js" -o -name "*.ts" -o -name "*.tsx" | grep -v node_modules | while read file; do
    node -c "$file" 2>&1 || echo "❌ SYNTAX ERROR in $file"
  done
  echo "✅ Syntax check complete"
fi
