'use client';

import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export function VertexChart({ patients }: { patients: any[] }) {
  const chartData = useMemo(() => {
    // Generate data for the last 6 months
    const data = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStr = d.toLocaleDateString('en-US', { month: 'short' });
      
      const screened = patients.filter(p => {
        const dateStr = p.screening_date || p.submitted_on;
        if (!dateStr) return false;
        const pd = new Date(dateStr);
        return pd.getMonth() === d.getMonth() && pd.getFullYear() === d.getFullYear();
      }).length;
      
      const att = patients.filter(p => {
        if (!p.att_start_date) return false;
        const pd = new Date(p.att_start_date);
        return pd.getMonth() === d.getMonth() && pd.getFullYear() === d.getFullYear();
      }).length;
      
      data.push({ name: monthStr, Screened: screened, ATT: att });
    }
    return data;
  }, [patients]);

  return (
    <div className="bg-white/40 backdrop-blur-md border border-white/60 shadow-sm rounded-xl p-6 h-72 relative overflow-hidden group hover:shadow-md hover:border-blue-200 transition-all duration-300">
      <div className="absolute inset-0 bg-gradient-to-b from-blue-50/40 to-transparent pointer-events-none" />
      <div className="flex items-center justify-between mb-6 relative">
        <div>
          <h3 className="text-[12px] font-black text-slate-900 uppercase tracking-widest leading-none">ATT Initiation Trend</h3>
          <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider">Screened vs Treated</p>
        </div>
      </div>
      <div className="relative h-[200px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 10, bottom: 0, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis 
              dataKey="name" 
              stroke="#94a3b8" 
              fontSize={10} 
              fontWeight="bold"
              tickLine={false} 
              axisLine={false} 
              dy={10}
            />
            <YAxis 
              stroke="#94a3b8" 
              fontSize={10} 
              fontWeight="bold"
              tickLine={false} 
              axisLine={false} 
              tickFormatter={(value) => `${value}`}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                backdropFilter: 'blur(8px)',
                border: '1px solid #e2e8f0', 
                borderRadius: '12px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.05)'
              }}
              itemStyle={{ fontSize: '13px', fontWeight: 'bold' }}
              labelStyle={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}
            />
            <Line 
              type="monotone" 
              dataKey="Screened" 
              stroke="#cbd5e1" 
              strokeWidth={3}
              strokeDasharray="6 6"
              dot={{ r: 3, fill: '#cbd5e1', strokeWidth: 0 }}
              activeDot={{ r: 5, fill: '#94a3b8', strokeWidth: 0 }}
            />
            <Line 
              type="monotone" 
              dataKey="ATT" 
              stroke="#2563eb" 
              strokeWidth={4}
              dot={{ r: 5, fill: '#2563eb', strokeWidth: 2, stroke: '#fff' }}
              activeDot={{ r: 7, fill: '#2563eb', strokeWidth: 0 }}
              style={{ filter: "drop-shadow(0 0 15px rgba(37, 99, 235, 0.5))" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
