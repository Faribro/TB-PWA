'use client';

import React, { useMemo, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Sector } from 'recharts';

const STAGE_COLORS = {
  'Screened':      '#38bdf8',
  'Not Suspected': '#10b981',
  'Suspected':     '#f59e0b',
  'Referred':      '#8b5cf6',
  'Diagnosed':     '#ec4899',
  'ATT Started':   '#f97316',
} as const;

interface ChartItem {
  stage: string;
  value: number;
}

export function ScreeningFrequencyChart({ data }: { data: ChartItem[] }) {
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);

  const chartData = useMemo(() => {
    return data
      .filter(item => item.stage !== 'Screened')
      .map(item => ({
        name: item.stage,
        value: item.value,
        fill: STAGE_COLORS[item.stage as keyof typeof STAGE_COLORS] || '#94a3b8'
      }));
  }, [data]);

  const total = useMemo(() => {
    const screenedItem = data.find(d => d.stage === 'Screened');
    return screenedItem ? screenedItem.value : data.reduce((sum, d) => sum + d.value, 0);
  }, [data]);

  const renderCustomLabel = ({
    cx, cy, midAngle, outerRadius, name, value, fill, percent
  }: any) => {
    // Only label the extremely small slices (Referred, Diagnosed, ATT Started)
    if (percent > 0.015) return null;
    
    const RADIAN = Math.PI / 180;
    const radius = outerRadius + 22;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    
    // Shift y positions to prevent overlap for adjacent small items
    let yShift = 0;
    if (name === 'Referred') {
      yShift = 20;
    } else if (name === 'Diagnosed') {
      yShift = 0;
    } else if (name === 'ATT Started') {
      yShift = -20;
    }
    
    const targetX = x + (x > cx ? 14 : -14);
    const targetY = y + yShift;
    
    return (
      <g>
        <line
          x1={cx + (outerRadius + 6) * Math.cos(-midAngle * RADIAN)}
          y1={cy + (outerRadius + 6) * Math.sin(-midAngle * RADIAN)}
          x2={targetX}
          y2={targetY}
          stroke={fill}
          strokeWidth={1.2}
          strokeDasharray="2 2"
          opacity={0.8}
        />
        {/* Label Pill - Premium Bigger Dimensions */}
        <rect 
          x={targetX - 32} 
          y={targetY - 10} 
          width={64} 
          height={20} 
          rx={5} 
          fill={fill} 
          fillOpacity={0.14} 
        />
        <text 
          x={targetX} 
          y={targetY + 1} 
          textAnchor="middle" 
          dominantBaseline="middle"
          fill={fill} 
          fontSize={10} 
          fontWeight={800}
        >
          {name}: {value}
        </text>
      </g>
    );
  };

  const renderSectorShape = (props: any) => {
    const { innerRadius, outerRadius, index } = props;
    const isHovered = activeIndex === index;
    
    if (isHovered) {
      return (
        <g>
          <Sector
            {...props}
            innerRadius={innerRadius - 2}
            outerRadius={outerRadius + 6}
            opacity={0.15}
            style={{ filter: 'blur(4px)' }}
          />
          <Sector
            {...props}
            innerRadius={innerRadius - 2}
            outerRadius={outerRadius + 6}
          />
        </g>
      );
    }
    
    return <Sector {...props} />;
  };

  const [isMobile, setIsMobile] = useState(false);
  
  React.useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const cx = isMobile ? '50%' : '32%';
  const labelLeft = isMobile ? '50%' : '32%';

  return (
    <div className="relative w-full h-auto min-h-[300px] sm:min-h-0 sm:h-[250px] md:h-[260px] xl:h-[300px] flex flex-col sm:flex-row items-center justify-between gap-6 sm:gap-4 px-0">
      {/* Left: Pie Chart */}
      <div className="w-full sm:w-[56%] lg:w-[58%] h-[200px] sm:h-full relative flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx={cx}
              cy="50%"
              innerRadius="62%"
              outerRadius="82%"
              paddingAngle={2}
              stroke="white"
              strokeWidth={2}
              shape={renderSectorShape}
              label={isMobile ? undefined : renderCustomLabel}
              labelLine={false}
              onMouseEnter={(_, index) => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(undefined)}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        
        {/* Donut Center Label (Locked to responsive center of the Pie) */}
        <div 
          className="absolute flex flex-col items-center justify-center pointer-events-none"
          style={{ left: labelLeft, top: '50%', transform: 'translate(-50%, -50%)' }}
        >
          <span className="text-xl sm:text-2xl xl:text-[34px] font-black text-slate-900 leading-none tracking-tight">
            {total.toLocaleString()}
          </span>
          <span className="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1.5">
            Total Screened
          </span>
        </div>
      </div>

      {/* Right: Legend */}
      <div className="w-full sm:w-[42%] lg:w-[38%] flex flex-col gap-1 sm:gap-1.5 pr-0 sm:pr-1">
        {chartData.map((item, index) => {
          const isMajor = item.value / total > 0.10;
          const percent = total > 0 ? (item.value / total) * 100 : 0;
          const percentStr = percent === 0 ? "0%" : percent < 0.1 ? "<0.1%" : `${percent.toFixed(1)}%`;
          
          return (
            <div
              key={item.name}
              className={`flex items-center justify-between p-1 sm:p-1.5 xl:p-2 rounded-xl transition-all duration-200 cursor-pointer ${
                activeIndex === index 
                  ? 'bg-slate-100/90 shadow-sm translate-x-1' 
                  : 'hover:bg-slate-50/50'
              } ${!isMajor ? 'opacity-85' : ''}`}
              onMouseEnter={() => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(undefined)}
            >
              <div className="flex items-center gap-2 min-w-0">
                {/* Color Swatch Circle */}
                <div className="relative flex items-center justify-center w-4 h-4 sm:w-5 sm:h-5 shrink-0">
                  <div
                    className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full"
                    style={{
                      backgroundColor: item.fill,
                      boxShadow: `0 0 0 1px #fff, 0 0 0 3px ${item.fill}33`
                    }}
                  />
                </div>
                <div className="text-xs sm:text-[13px] font-bold text-slate-700 truncate">{item.name}</div>
              </div>
              
              <div className="flex flex-col items-end shrink-0">
                <div className={isMajor ? "text-[14px] sm:text-[16px] xl:text-[20px] font-black text-slate-900 leading-none" : "text-xs sm:text-[14px] xl:text-[16px] font-black text-slate-700 leading-none"}>
                  {item.value.toLocaleString()}
                </div>
                <div className="text-[9px] sm:text-[10px] text-slate-400 font-semibold mt-1 leading-none">
                  {percentStr}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
