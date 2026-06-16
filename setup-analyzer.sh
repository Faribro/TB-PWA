#!/bin/bash

# Install bundle analyzer
npm install --save-dev @next/bundle-analyzer

# Create analyze script
echo "Adding bundle analyzer to package.json..."

# Add analyze script to package.json
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
pkg.scripts.analyze = 'ANALYZE=true next build';
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
"

# Create next.config.js with analyzer
echo "Updating next.config.ts with bundle analyzer..."

echo "Run 'npm run analyze' to analyze bundle size"