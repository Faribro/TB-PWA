// Web Worker for heavy analytics calculations
self.onmessage = function(e) {
  const { patients, totalCount } = e.data;
  
  const safeGet = (obj, field) => {
    return (obj?.[field] || '').toString().toLowerCase().trim();
  };
  
  let suspected = 0, referred = 0, diagnosed = 0, initiated = 0, completed = 0, hiv = 0, ltfu = 0;
  
  for (const p of patients) {
    const xray = safeGet(p, 'chest_x_ray_result') || safeGet(p, 'xray_result');
    const tbDiag = safeGet(p, 'tb_diagnosed');
    const phase = safeGet(p, 'current_phase');
    const refDate = safeGet(p, 'referral_date');
    const attDate = safeGet(p, 'att_start_date');
    const hivStatus = safeGet(p, 'hiv_status');
    
    if (xray.includes('abnormal') || xray.includes('suspected') || xray === 's') suspected++;
    if (refDate !== '' && refDate !== 'null') referred++;
    if (['y','yes'].includes(tbDiag)) diagnosed++;
    if (attDate !== '' && attDate !== 'null') initiated++;
    if (phase.includes('completed')) completed++;
    if (['positive','reactive','y','yes'].includes(hivStatus)) hiv++;
    if (phase.includes('ltfu') || phase.includes('lost')) ltfu++;
  }

  self.postMessage({
    kpis: [
      { label: 'SCREENED', value: totalCount, color: 'cyan' },
      { label: 'SUSPECTED', value: suspected, color: 'amber' },
      { label: 'REFERRED', value: referred, color: 'indigo' },
      { label: 'CONFIRMED', value: diagnosed, color: 'emerald' },
      { label: 'INITIATED', value: initiated, color: 'green' },
      { label: 'COMPLETED', value: completed, color: 'teal' },
      { label: 'HIV+', value: hiv, color: 'rose' },
      { label: 'LTFU', value: ltfu, color: 'orange' }
    ]
  });
};
