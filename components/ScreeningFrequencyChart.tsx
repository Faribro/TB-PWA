'use client';

import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import { useMemo } from 'react';

interface ScreeningFrequencyChartProps {
  data: {
    stage: string;
    value: number;
  }[];
}

export function ScreeningFrequencyChart({ data }: ScreeningFrequencyChartProps) {
  const getOption = useMemo(() => {
    const total = data.reduce((sum, item) => sum + item.value, 0);
    
    // Synthwave neon gradient colors with glassmorphism
    const synthwaveColors = [
      { // Screened — Cyan neon
        type: 'linear',
        x: 0, y: 0, x2: 0, y2: 1,
        colorStops: [
          { offset: 0, color: 'rgba(6, 182, 212, 0.9)' },
          { offset: 0.5, color: 'rgba(14, 165, 233, 0.8)' },
          { offset: 1, color: 'rgba(59, 130, 246, 0.7)' }
        ]
      },
      { // Not Suspected — Green neon
        type: 'linear',
        x: 0, y: 0, x2: 0, y2: 1,
        colorStops: [
          { offset: 0, color: 'rgba(16, 185, 129, 0.9)' },
          { offset: 0.5, color: 'rgba(5, 150, 105, 0.8)' },
          { offset: 1, color: 'rgba(4, 120, 87, 0.7)' }
        ]
      },
      { // Suspected — Amber neon
        type: 'linear',
        x: 0, y: 0, x2: 0, y2: 1,
        colorStops: [
          { offset: 0, color: 'rgba(251, 191, 36, 0.9)' },
          { offset: 0.5, color: 'rgba(245, 158, 11, 0.8)' },
          { offset: 1, color: 'rgba(217, 119, 6, 0.7)' }
        ]
      },
      { // Referred — Purple neon
        type: 'linear',
        x: 0, y: 0, x2: 0, y2: 1,
        colorStops: [
          { offset: 0, color: 'rgba(168, 85, 247, 0.9)' },
          { offset: 0.5, color: 'rgba(147, 51, 234, 0.8)' },
          { offset: 1, color: 'rgba(126, 34, 206, 0.7)' }
        ]
      },
      { // Diagnosed — Pink neon
        type: 'linear',
        x: 0, y: 0, x2: 0, y2: 1,
        colorStops: [
          { offset: 0, color: 'rgba(236, 72, 153, 0.9)' },
          { offset: 0.5, color: 'rgba(219, 39, 119, 0.8)' },
          { offset: 1, color: 'rgba(190, 24, 93, 0.7)' }
        ]
      },
      { // ATT Started — Orange neon
        type: 'linear',
        x: 0, y: 0, x2: 0, y2: 1,
        colorStops: [
          { offset: 0, color: 'rgba(251, 146, 60, 0.9)' },
          { offset: 0.5, color: 'rgba(249, 115, 22, 0.8)' },
          { offset: 1, color: 'rgba(234, 88, 12, 0.7)' }
        ]
      }
    ];
    
    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(20px)',
        borderColor: 'rgba(148, 163, 184, 0.3)',
        borderWidth: 1,
        textStyle: {
          color: '#f8fafc',
          fontSize: 14,
          fontWeight: 600
        },
        padding: [16, 20],
        extraCssText: 'backdrop-filter: blur(20px); box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 30px rgba(59, 130, 246, 0.3);',
        formatter: (params: any) => {
          const percent = total > 0 ? ((params.value / total) * 100).toFixed(1) : 0;
          return `
            <div style="font-weight: 800; font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; margin-bottom: 8px;">${params.name}</div>
            <div style="font-size: 32px; font-weight: 900; background: linear-gradient(135deg, #ffffff 0%, #e0e7ff 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 6px;">${params.value.toLocaleString()}</div>
            <div style="font-size: 14px; color: #cbd5e1; font-weight: 600;">${percent}% of total</div>
          `;
        }
      },
      legend: {
        orient: 'vertical',
        right: '3%',
        top: 'center',
        itemWidth: 20,
        itemHeight: 20,
        itemGap: 20,
        icon: 'circle',
        data: data.map(item => item.stage),
        formatter: (name: string) => {
          const item = data.find(d => d.stage === name);
          return `{name|${name}}\n{value|${item?.value.toLocaleString() || 0}}`;
        },
        textStyle: {
          rich: {
            name: {
              fontSize: 11,
              fontWeight: 700,
              color: '#64748b',
              lineHeight: 20,
              textShadowColor: 'rgba(0, 0, 0, 0.3)',
              textShadowBlur: 4
            },
            value: {
              fontSize: 20,
              fontWeight: 900,
              color: '#0f172a',
              lineHeight: 28,
              textShadowColor: 'rgba(255, 255, 255, 0.8)',
              textShadowBlur: 2
            }
          }
        }
      },
      series: [
        // Main 3D pie with glassmorphism
        {
          name: 'Care Cascade',
          type: 'pie',
          radius: ['35%', '75%'],
          center: ['35%', '50%'],
          avoidLabelOverlap: true,
          startAngle: 45,
          roseType: 'area', // Creates 3D depth effect
          itemStyle: {
            borderRadius: 12,
            borderColor: 'rgba(255, 255, 255, 0.4)',
            borderWidth: 2,
            shadowBlur: 30,
            shadowColor: 'rgba(0, 0, 0, 0.3)',
            shadowOffsetX: 0,
            shadowOffsetY: 10,
            opacity: 0.95
          },
          label: {
            show: true,
            position: 'inside',
            formatter: (params: any) => {
              const percent = total > 0 ? ((params.value / total) * 100).toFixed(0) : 0;
              return `{percent|${percent}%}`;
            },
            rich: {
              percent: {
                fontSize: 18,
                fontWeight: 900,
                color: '#ffffff',
                textShadowColor: 'rgba(0, 0, 0, 0.8)',
                textShadowBlur: 8,
                textShadowOffsetX: 0,
                textShadowOffsetY: 3,
                textBorderColor: 'rgba(0, 0, 0, 0.3)',
                textBorderWidth: 1
              }
            }
          },
          labelLine: {
            show: false
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 22,
              fontWeight: 'bold'
            },
            itemStyle: {
              shadowBlur: 50,
              shadowOffsetX: 0,
              shadowOffsetY: 15,
              shadowColor: 'rgba(0, 0, 0, 0.4)',
              borderWidth: 3,
              borderColor: 'rgba(255, 255, 255, 0.6)',
              opacity: 1
            },
            scale: true,
            scaleSize: 12
          },
          data: data.map((item, index) => ({
            name: item.stage,
            value: item.value,
            itemStyle: {
              color: synthwaveColors[index % 6]
            }
          }))
        },
        // Inner neon glow ring
        {
          name: 'Inner Glow',
          type: 'pie',
          radius: ['32%', '35%'],
          center: ['35%', '50%'],
          silent: true,
          label: { show: false },
          labelLine: { show: false },
          itemStyle: {
            color: {
              type: 'radial',
              x: 0.5,
              y: 0.5,
              r: 0.5,
              colorStops: [
                { offset: 0, color: 'rgba(59, 130, 246, 0.6)' },
                { offset: 1, color: 'rgba(147, 51, 234, 0.3)' }
              ]
            },
            shadowBlur: 20,
            shadowColor: 'rgba(59, 130, 246, 0.8)'
          },
          data: [{ value: 1 }]
        },
        // Outer neon glow ring
        {
          name: 'Outer Glow',
          type: 'pie',
          radius: ['75%', '78%'],
          center: ['35%', '50%'],
          silent: true,
          label: { show: false },
          labelLine: { show: false },
          itemStyle: {
            color: {
              type: 'radial',
              x: 0.5,
              y: 0.5,
              r: 0.5,
              colorStops: [
                { offset: 0, color: 'rgba(236, 72, 153, 0.4)' },
                { offset: 1, color: 'rgba(59, 130, 246, 0.2)' }
              ]
            },
            shadowBlur: 25,
            shadowColor: 'rgba(236, 72, 153, 0.6)'
          },
          data: [{ value: 1 }]
        },
        // Ambient glow layer
        {
          name: 'Ambient Glow',
          type: 'pie',
          radius: ['78%', '82%'],
          center: ['35%', '50%'],
          silent: true,
          label: { show: false },
          labelLine: { show: false },
          itemStyle: {
            color: {
              type: 'radial',
              x: 0.5,
              y: 0.5,
              r: 0.5,
              colorStops: [
                { offset: 0, color: 'rgba(168, 85, 247, 0.3)' },
                { offset: 1, color: 'rgba(6, 182, 212, 0.1)' }
              ]
            },
            shadowBlur: 35,
            shadowColor: 'rgba(168, 85, 247, 0.5)'
          },
          data: [{ value: 1 }]
        }
      ],
      // Synthwave animation
      animationType: 'expansion',
      animationEasing: 'elasticOut',
      animationDuration: 1500,
      animationDelay: (idx: number) => idx * 120
    };
  }, [data]);

  return (
    <div className="relative overflow-hidden rounded-2xl">
      {/* Synthwave background with glassmorphism */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900/5 via-purple-900/5 to-pink-900/5 backdrop-blur-3xl" />
      
      {/* Animated neon glow orbs */}
      <div className="absolute top-0 left-0 w-64 h-64 bg-cyan-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '3s' }} />
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '4s', animationDelay: '1s' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-pink-500/15 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '5s', animationDelay: '2s' }} />
      
      {/* Glassmorphic overlay */}
      <div className="absolute inset-0 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl" />
      
      <ReactECharts
        option={getOption}
        style={{ width: '100%', height: '480px', position: 'relative', zIndex: 10 }}
        opts={{ renderer: 'canvas' }}
        className="drop-shadow-2xl"
      />
      
      {/* Bottom glow reflection */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-blue-500/10 via-purple-500/5 to-transparent blur-xl" />
    </div>
  );
}
