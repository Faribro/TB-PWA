/**
 * Test improved state normalization logic
 */

const testCases = [
  'Uttarakhand',
  'uttarakhand',
  'Madhya Pradesh',
  'madhya_pradesh',
  'Madhyapradesh',
  'madhyapradesh',
  'MADHYA_PRADESH',
  'Maharashtra',
  'mumbai',
  'Mumbai'
];

function normalizeState(state: string): string {
  return state
    .toLowerCase()
    .replace(/madhyapradesh/g, 'madhya_pradesh')
    .split(/[_\s]+/)
    .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

console.log('Testing improved state normalization:\n');
const normalized = new Set<string>();

testCases.forEach(state => {
  const result = normalizeState(state);
  normalized.add(result);
  console.log(`${state.padEnd(20)} → ${result}`);
});

console.log(`\n✅ Unique normalized states: ${normalized.size}`);
console.log('Results:', Array.from(normalized).sort());
