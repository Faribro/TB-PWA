const fs = require('fs');
const path = require('path');

try {
  const filePath = path.resolve(process.cwd(), 'dev_log_nexus.txt');
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf16le');
    console.log('--- Last 4000 characters of dev_log_nexus.txt ---');
    console.log(content.substring(Math.max(0, content.length - 4000)));
  } else {
    console.log('dev_log_nexus.txt does not exist.');
  }
} catch (e) {
  console.error('Error reading log file:', e);
}
