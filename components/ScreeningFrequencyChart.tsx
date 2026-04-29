'use client';

import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import 'echarts-gl';

interface ScreeningFrequencyChartProps {
  data: {
    stage: string;
    value: number;
  }[];
}

export function ScreeningFrequencyChart({ data }: ScreeningFrequencyChartProps) {
  const getOption = () => {
    const total = data.reduce((sum, item) => sum + item.value, 0);
    
    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        backgroundColor: '#1e293b',
        borderColor: '#1e293b',
        textStyle: {
          color: '#f8fafc',
          fontSize: 13
        },
        formatter: (params: any) => {
          const percent = total > 0 ? ((params.value / total) * 100).toFixed(1) : 0;
          return `${params.name}<br/><strong style="font-size: 20px">${params.value}</strong> screenings<br/><span style="font-size: 12px">${percent}% of total</span>`;
        }
      },
      legend: {
        orient: 'vertical',
        right: 10,
        top: 'center',
        textStyle: {
          color: '#374151',
          fontSize: 13
        },
        itemWidth: 14,
        itemHeight: 14,
        itemGap: 12,
        data: data.map(item => item.stage)
      },
      series: [
        {
          name: 'Care Cascade',
          type: 'pie3D',
          radius: ['30%', '70%'],
          center: ['40%', '50%'],
          depth: 80,
          itemStyle: {
            opacity: 0.9,
            borderWidth: 1,
            borderColor: '#ffffff'
          },
          label: {
            show: true,
            position: 'outside',
            formatter: '{b}: {c}',
            fontSize: 13,
            color: '#1a1a2e',
            backgroundColor: 'rgba(255, 255, 255, 0.85)',
            borderColor: '#e0e0e0',
            borderWidth: 1,
            borderRadius: 6,
            padding: [4, 8, 4, 8],
            width: 140,
            overflow: 'break'
          },
          labelLine: {
            show: true,
            length: 20,
            length2: 30,
            smooth: true,
            lineStyle: {
              width: 1.5,
              color: '#94a3b8',
              opacity: 0.5
            }
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 14,
              fontWeight: 'bold'
            },
            itemStyle: {
              shadowBlur: 20,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.3)'
            }
          },
          data: data.map((item, index) => ({
            name: item.stage,
            value: item.value,
            itemStyle: {
              color: [
                '#0f766e', // Screened — teal
                '#16a34a', // Not Suspected — green
                '#d97706', // Suspected — amber
                '#2563eb', // Referred — blue
                '#7c3aed', // Diagnosed — violet
                '#db2777'  // ATT Started — pink
              ][index % 6]
            }
          }))
        }
      ]
    };
  };

  return (
    <ReactECharts
      option={getOption()}
      style={{ width: '100%', height: '420px' }}
      opts={{ renderer: 'canvas' }}
    />
  );
}
