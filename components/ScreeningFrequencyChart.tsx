'use client';

import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';

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
          type: 'pie',
          radius: ['45%', '65%'],
          center: ['30%', '50%'],
          avoidLabelOverlap: true,
          itemStyle: {
            borderRadius: 8,
            borderColor: '#fff',
            borderWidth: 2,
            shadowBlur: 8,
            shadowColor: 'rgba(0, 0, 0, 0.1)'
          },
          label: {
            show: true,
            position: 'inside',
            formatter: '{b}',
            fontSize: 11,
            color: '#ffffff',
            fontWeight: 600,
            textShadowColor: 'rgba(0, 0, 0, 0.5)',
            textShadowBlur: 4
          },
          labelLine: {
            show: false
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 13,
              fontWeight: 'bold',
              formatter: '{b}\n{c}'
            },
            itemStyle: {
              shadowBlur: 20,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.3)',
              scale: true,
              scaleSize: 5
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
