#!/usr/bin/env node

/**
 * Script to fix hydration issues by replacing inconsistent date formatting
 * with our consistent date-utils functions
 */

const fs = require("fs");
const path = require("path");
const glob = require("glob");

// Find all TypeScript/TSX files
const files = glob.sync("src/**/*.{ts,tsx}", {
  ignore: ["**/*.d.ts", "**/date-utils.ts"],
});

console.log(`Found ${files.length} files to process...`);

let totalReplacements = 0;

files.forEach((filePath) => {
  try {
    let content = fs.readFileSync(filePath, "utf8");
    let originalContent = content;
    let hasDateUtils = false;

    // Check if file already imports date-utils
    if (
      content.includes('from "@/lib/date-utils"') ||
      content.includes("from '@/lib/date-utils'")
    ) {
      hasDateUtils = true;
    }

    let needsFormatDate = false;
    let needsFormatDateTime = false;
    let needsFormatTime = false;

    // Replace toLocaleDateString calls
    content = content.replace(
      /new Date\(([^)]+)\)\.toLocaleDateString\(\)/g,
      (match, dateExpr) => {
        needsFormatDate = true;
        return `formatDate(${dateExpr})`;
      }
    );

    // Replace toLocaleString calls
    content = content.replace(
      /new Date\(([^)]+)\)\.toLocaleString\(\)/g,
      (match, dateExpr) => {
        needsFormatDateTime = true;
        return `formatDateTime(${dateExpr})`;
      }
    );

    // Replace toLocaleTimeString calls
    content = content.replace(
      /new Date\(([^)]+)\)\.toLocaleTimeString\(\)/g,
      (match, dateExpr) => {
        needsFormatTime = true;
        return `formatTime(${dateExpr})`;
      }
    );

    // Add imports if needed
    if (
      (needsFormatDate || needsFormatDateTime || needsFormatTime) &&
      !hasDateUtils
    ) {
      const imports = [];
      if (needsFormatDate) imports.push("formatDate");
      if (needsFormatDateTime) imports.push("formatDateTime");
      if (needsFormatTime) imports.push("formatTime");

      const importStatement = `import { ${imports.join(
        ", "
      )} } from "@/lib/date-utils";\n`;

      // Find the last import statement and add after it
      const importRegex = /import .+ from .+;\s*\n/g;
      let lastImportMatch;
      let match;

      while ((match = importRegex.exec(content)) !== null) {
        lastImportMatch = match;
      }

      if (lastImportMatch) {
        const insertIndex = lastImportMatch.index + lastImportMatch[0].length;
        content =
          content.slice(0, insertIndex) +
          importStatement +
          content.slice(insertIndex);
      } else {
        // No imports found, add at the beginning
        content = importStatement + content;
      }
    }

    // Only write if content changed
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content);
      const changes = (
        originalContent.match(
          /\.toLocaleDateString\(\)|\.toLocaleString\(\)|\.toLocaleTimeString\(\)/g
        ) || []
      ).length;
      console.log(`✓ Fixed ${changes} date format calls in ${filePath}`);
      totalReplacements += changes;
    }
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
  }
});

console.log(
  `\n🎉 Complete! Fixed ${totalReplacements} date formatting calls across ${files.length} files.`
);
console.log(
  "\nThis should resolve hydration mismatches caused by inconsistent date formatting between server and client."
);
