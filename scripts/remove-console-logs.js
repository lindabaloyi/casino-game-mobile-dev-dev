#!/usr/bin/env node

/**
 * Script to remove all console.log statements from main branch for performance optimization
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Files to exclude from console.log removal
const EXCLUDE_PATTERNS = [
  /node_modules/,
  /\.git/,
  /scripts\/remove-console-logs\.js$/, // Don't modify this script itself
  /test.*\.js$/, // Keep test files as they may need logging for debugging
  /.*\.test\./, // Keep test files
  /__tests__/, // Keep test directories
];

// Function to recursively find all JS/TS files
function findFiles(dir, files = []) {
  const items = fs.readdirSync(dir);

  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      // Skip excluded directories
      if (!EXCLUDE_PATTERNS.some(pattern => pattern.test(fullPath))) {
        findFiles(fullPath, files);
      }
    } else if (stat.isFile()) {
      // Only process JS/TS files, exclude patterns
      if (/\.(js|ts|tsx)$/.test(item) && !EXCLUDE_PATTERNS.some(pattern => pattern.test(fullPath))) {
        files.push(fullPath);
      }
    }
  }

  return files;
}

// Function to remove console.log statements from a file
function removeConsoleLogs(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Remove console.log statements (including variations like console.log, console.warn, console.error, console.info, console.debug)
    // But keep console.error for critical error logging
    const patterns = [
      // Remove all console.log, console.warn, console.info, console.debug
      /^\s*console\.(log|warn|info|debug)\([^)]*\);\s*$/gm,
      // Remove console statements that span multiple lines (basic pattern)
      /^\s*console\.(log|warn|info|debug)\([^}]*\);\s*$/gm,
      // Remove console statements with objects/data
      /^\s*console\.(log|warn|info|debug)\([^)]*\)\s*$/gm,
    ];

    let newContent = content;
    patterns.forEach(pattern => {
      if (pattern.test(newContent)) {
        newContent = newContent.replace(pattern, '');
        modified = true;
      }
    });

    // Remove multiple consecutive empty lines
    newContent = newContent.replace(/\n\s*\n\s*\n/g, '\n\n');

    if (modified) {
      fs.writeFileSync(filePath, newContent, 'utf8');
      return true;
    }

    return false;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return false;
  }
}

// Main execution
const files = findFiles('.');
let processed = 0;
let modified = 0;

files.forEach(file => {
  processed++;
  if (removeConsoleLogs(file)) {
    modified++;
  }
});