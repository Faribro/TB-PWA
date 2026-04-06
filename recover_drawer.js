const fs = require('fs');
const path = require('path');

const logPath = 'C:\\Users\\farid\\.gemini\\antigravity\\brain\\1ab67bbb-636a-4167-be27-294b308607a4\\.system_generated\\logs\\overview.txt';

if (!fs.existsSync(logPath)) {
  console.log('Log file not found at: ' + logPath);
  process.exit(1);
}

const content = fs.readFileSync(logPath, 'utf8');

// Find the block where the Tab refactor was implemented.
// It most likely contains "TabsList" and "TabsTrigger".
const results = content.match(/import { Tabs, TabsList, TabsTrigger, TabsContent } from '\.\/ui\/tabs';[\s\S]*?<\/Tabs>/g);

if (results && results.length > 0) {
  // Get the most recent one
  const lastVersion = results[results.length - 1];
  console.log('Found Tab Version in logs!');
  fs.writeFileSync('C:\\Users\\farid\\Desktop\\TB-PWA-Clean\\recovered_drawer.tsx', lastVersion);
} else {
  console.log('No Tab Version found in logs.');
}
