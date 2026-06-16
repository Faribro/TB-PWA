// Add this to your browser console when on the vertex page to diagnose the issue

console.log('=== VERTEX DATA DIAGNOSTIC ===');

// Check current filters
const dateFromInput = document.querySelector('input[type="date"]');
const dateToInput = document.querySelectorAll('input[type="date"]')[1];

console.log('Date From:', dateFromInput?.value || 'EMPTY');
console.log('Date To:', dateToInput?.value || 'EMPTY');

// Check if any quick date button is active
const buttons = document.querySelectorAll('button');
const activeButton = Array.from(buttons).find(b => 
  b.textContent?.match(/7D|30D|90D/) && 
  b.className.includes('bg-[#01696f]')
);

console.log('Active Quick Date:', activeButton?.textContent || 'NONE');

// Check record count
const recordCount = document.querySelector('span.font-semibold.text-\\[\\#28251d\\]');
console.log('Filtered Records:', recordCount?.textContent || 'N/A');

// Calculate what 7D would be
const today = new Date();
const sevenDaysAgo = new Date(today.getTime() - 7 * 86400000);
console.log('Today:', today.toISOString().split('T')[0]);
console.log('7 Days Ago:', sevenDaysAgo.toISOString().split('T')[0]);

console.log('\n=== SOLUTION ===');
console.log('1. Click the "Clear" button if visible');
console.log('2. Manually clear both date inputs');
console.log('3. Refresh the page');
console.log('4. Check if you see all 19,218 records');
