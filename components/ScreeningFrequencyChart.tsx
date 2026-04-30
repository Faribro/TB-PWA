'use client';

import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import 'echarts-gl'; // Import 3D extension

interface ScreeningFrequencyChartProps {
  data: {
    stage: string;
    value: number;
  }[];
}

export function ScreeningFrequencyChart({ data }: ScreeningFrequencyChartProps) {
  const getOption = () => {
    const total = data.reduce((sum, item) => sum + item.value, 0);
    
    // Premium gradient colors with depth
    const colors = [
      { // Screened — Teal gradient
        type: 'linear',
        x: 0, y: 0, x2: 0, y2: 1,
        colorStops: [
          { offset: 0, color: '#14b8a6' },
          { offset: 1, color: '#0f766e' }
        ]
      },
      { // Not Suspected — Green gradient
        type: 'linear',
        x: 0, y: 0, x2: 0, y2: 1,
        colorStops: [
          { offset: 0, color: '#22c55e' },
          { offset: 1, color: '#16a34a' }
        ]
      },
      { // Suspected — Amber gradient
        type: 'linear',
        x: 0, y: 0, x2: 0, y2: 1,
        colorStops: [
          { offset: 0, color: '#fbbf24' },
          { offset: 1, color: '#d97706' }
        ]
      },
      { // Referred — Blue gradient
        type: 'linear',
        x: 0, y: 0, x2: 0, y2: 1,
        colorStops: [
          { offset: 0, color: '#3b82f6' },
          { offset: 1, color: '#2563eb' }
        ]
      },
      { // Diagnosed — Violet gradient
        type: 'linear',
        x: 0, y: 0, x2: 0, y2: 1,
        colorStops: [
          { offset: 0, color: '#a855f7' },
          { offset: 1, color: '#7c3aed' }
        ]
      },
      { // ATT Started — Pink gradient
        type: 'linear',
        x: 0, y: 0, x2: 0, y2: 1,
        colorStops: [
          { offset: 0, color: '#ec4899' },
          { offset: 1, color: '#db2777' }
        ]
      }
    ];
    
    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        borderColor: 'rgba(148, 163, 184, 0.2)',
        borderWidth: 1,
        textStyle: {
          color: '#f8fafc',
          fontSize: 14,
          fontWeight: 500
        },
        padding: [12, 16],
        formatter: (params: any) => {
          const percent = total > 0 ? ((params.value / total) * 100).toFixed(1) : 0;
          return `
            <div style="font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; margin-bottom: 6px;">${params.name}</div>
            <div style="font-size: 28px; font-weight: 900; color: #ffffff; margin-bottom: 4px;">${params.value.toLocaleString()}</div>
            <div style="font-size: 13px; color: #cbd5e1;">${percent}% of total</div>
          `;
        }
      },
      legend: {
        orient: 'vertical',
        right: '5%',
        top: 'center',
        textStyle: {
          color: '#475569',
          fontSize: 13,
          fontWeight: 600
        },
        itemWidth: 16,
        itemHeight: 16,
        itemGap: 16,
        icon: 'circle',
        data: data.map(item => item.stage),
        formatter: (name: string) => {
          const item = data.find(d => d.stage === name);
          return `{name|${name}}\n{value|${item?.value.toLocaleString() || 0}}`;
        },
        textStyle: {
          rich: {
            name: {
              fontSize: 12,
              fontWeight: 600,
              color: '#334155',
              lineHeight: 18
            },
            value: {
              fontSize: 18,
              fontWeight: 900,
              color: '#0f172a',
              lineHeight: 24
            }
          }
        }
      },
      series: [
        {
          name: 'Care Cascade',
          type: 'pie',
          radius: ['40%', '70%'],
          center: ['35%', '50%'],
          avoidLabelOverlap: true,
          startAngle: 30,
          itemStyle: {
            borderRadius: 10,
            borderColor: '#ffffff',
            borderWidth: 3,
            shadowBlur: 20,
            shadowColor: 'rgba(0, 0, 0, 0.15)',
            shadowOffsetX: 0,
            shadowOffsetY: 8
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
                fontSize: 16,
                fontWeight: 900,
                color: '#ffffff',
                textShadowColor: 'rgba(0, 0, 0, 0.5)',
                textShadowBlur: 6,
                textShadowOffsetX: 0,
                textShadowOffsetY: 2
              }
            }
          },
          labelLine: {
            show: false
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 18,
              fontWeight: 'bold'
            },
            itemStyle: {
              shadowBlur: 30,
              shadowOffsetX: 0,
              shadowOffsetY: 12,
              shadowColor: 'rgba(0, 0, 0, 0.25)',
              borderWidth: 4
            },
            scale: true,
            scaleSize: 8
          },
          data: data.map((item, index) => ({
            name: item.stage,
            value: item.value,
            itemStyle: {
              color: colors[index % 6]
            }
          }))
        },
        // Inner glow ring for premium effect
        {
          name: 'Inner Glow',
          type: 'pie',
          radius: ['38%', '40%'],
          center: ['35%', '50%'],
          silent: true,
          label: { show: false },
          labelLine: { show: false },
          itemStyle: {
            color: 'rgba(255, 255, 255, 0.3)',
            shadowBlur: 10,
            shadowColor: 'rgba(255, 255, 255, 0.5)'
          },
          data: [{ value: 1 }]
        },
        // Outer glow ring for depth
        {
          name: 'Outer Glow',
          type: 'pie',
          radius: ['70%', '72%'],
          center: ['35%', '50%'],
          silent: true,
          label: { show: false },
          labelLine: { show: false },
          itemStyle: {
            color: 'rgba(148, 163, 184, 0.15)',
            shadowBlur: 15,
            shadowColor: 'rgba(148, 163, 184, 0.3)'
          },
          data: [{ value: 1 }]
        }
      ],
      // Premium animation
      animationType: 'expansion',
      animationEasing: 'elasticOut',
      animationDuration: 1200,
      animationDelay: (idx: number) => idx * 100
    };
  };

  return (
    <div className="relative">
      {/* Premium background glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-purple-50/30 to-pink-50/50 rounded-2xl blur-2xl opacity-60" />
      
      <ReactECharts
        option={getOption()}
        style={{ width: '100%', height: '450px', position: 'relative', zIndex: 10 }}
        opts={{ renderer: 'canvas' }}
        className="drop-shadow-xl"
      />
    </div>
  );
}
