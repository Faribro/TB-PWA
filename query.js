const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://wwcgybgvfulotflitogu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3Y2d5Ymd2ZnVsb3RmbGl0b2d1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjY4OTk0MSwiZXhwIjoyMDg4MjY1OTQxfQ.aJIg860fGCJf7bVVV93Pdcev2A81h9FRxcBCU49DE_M';
const supabase = createClient(supabaseUrl, supabaseKey);

(async () => {
  let allData = [];
  for(let page=0; page<20; page++) {
    const { data } = await supabase.from('patients')
      .select('screening_date')
      .range(page*1000, page*1000 + 999);
    if (!data || data.length === 0) break;
    allData.push(...data);
  }
  
  const counts = {};
  allData.forEach(p => {
    let d = p.screening_date;
    if (d) d = d.substring(0, 10);
    counts[d] = (counts[d] || 0) + 1;
  });
  
  const sortedDates = Object.keys(counts).sort();
  for (let d of sortedDates) {
    if (d && d.startsWith('2026-01')) {
      console.log(d, counts[d]);
    }
  }
})();
