async function testTranslation() {
  const languages = ['hi', 'mr', 'ta'];
  const text = "Hello Sir, how can I help you today?";
  
  for (const lang of languages) {
    console.log(`Testing ${lang}...`);
    try {
      const res = await fetch('http://localhost:3000/api/ai/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lang, text })
      });
      const data = await res.json();
      console.log(`Result for ${lang}:`, data);
    } catch (e) {
      console.error(`Error for ${lang}:`, e);
    }
  }
}

testTranslation();
