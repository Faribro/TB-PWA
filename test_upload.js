const fs = require("fs");
const path = require("path");

async function testUpload() {
  const filePath = path.join(__dirname, "package.json");
  const buffer = fs.readFileSync(filePath);
  
  const blob = new Blob([buffer], { type: 'application/pdf' });
  const formData = new FormData();
  formData.append('file', blob, 'test.pdf');
  formData.append('filename', 'test.pdf');
  formData.append('mimeType', 'application/pdf');

  try {
    const res = await fetch("http://localhost:3000/api/register-extract", {
      method: "POST",
      body: formData,
    });
    
    console.log("Status:", res.status);
    const json = await res.json();
    console.log("Result:", JSON.stringify(json, null, 2));
  } catch (e) {
    console.error("Fetch failed:", e);
  }
}

testUpload();
