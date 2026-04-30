'use client';

import ReactECharts from 'echarts-for-react';
import { useMemo, useRef } from 'react';

interface ScreeningFrequencyChartProps {
  data: {
    stage: string;
    value: number;
  }[];
}

// Solid legend dot colors matching gradients
const LEGEND_DOT_COLORS = [
  '#38bdf8', // Screened — Sky
  '#34d399', // Not Suspected — Emerald
  '#fbbf24', // Suspected — Amber
  '#a78bfa', // Referred — Violet
  '#f472b6', // Diagnosed — Pink
  '#fb923c', // ATT Started — Orange
];

export function ScreeningFrequencyChart({ data }: ScreeningFrequencyChartProps) {
  const chartRef = useRef<any>(null);

  const getOption = useMemo(() => {
    const total = data.find(d => d.stage === 'Screened')?.value || 0;
    const notSuspected = data.find(d => d.stage === 'Not Suspected')?.value || 0;
    const suspected = data.find(d => d.stage === 'Suspected')?.value || 0;
    const referred = data.find(d => d.stage === 'Referred')?.value || 0;
    const diagnosed = data.find(d => d.stage === 'Diagnosed')?.value || 0;
    const attStarted = data.find(d => d.stage === 'ATT Started')?.value || 0;

    // Outer ring: Screening outcome breakdown (proportional to total screened)
    const outerData = [
      { name: 'Not Suspected', value: notSuspected },
      { name: 'Suspected', value: suspected },
    ].filter(d => d.value > 0);

    // Inner ring: Clinical funnel (suspected → referred → diagnosed → ATT)
    // Use suspected as the base to make smaller numbers visible
    const innerData = [
      { name: 'Suspected', value: suspected },
      { name: 'Referred', value: referred },
      { name: 'Diagnosed', value: diagnosed },
      { name: 'ATT Started', value: attStarted },
    ].filter(d => d.value > 0);

    // Color map for consistent stage colors
    const colorMap: Record<string, any> = {
      'Screened': {
        type: 'linear', x: 0, y: 0, x2: 1, y2: 1,
        colorStops: [
          { offset: 0, color: '#38bdf8' },
          { offset: 1, color: '#0284c7' }
        ]
      },
      'Not Suspected': {
        type: 'linear', x: 0, y: 0, x2: 1, y2: 1,
        colorStops: [
          { offset: 0, color: '#34d399' },
          { offset: 1, color: '#059669' }
        ]
      },
      'Suspected': {
        type: 'linear', x: 0, y: 0, x2: 1, y2: 1,
        colorStops: [
          { offset: 0, color: '#fbbf24' },
          { offset: 1, color: '#d97706' }
        ]
      },
      'Referred': {
        type: 'linear', x: 0, y: 0, x2: 1, y2: 1,
        colorStops: [
          { offset: 0, color: '#a78bfa' },
          { offset: 1, color: '#7c3aed' }
        ]
      },
      'Diagnosed': {
        type: 'linear', x: 0, y: 0, x2: 1, y2: 1,
        colorStops: [
          { offset: 0, color: '#f472b6' },
          { offset: 1, color: '#db2777' }
        ]
      },
      'ATT Started': {
        type: 'linear', x: 0, y: 0, x2: 1, y2: 1,
        colorStops: [
          { offset: 0, color: '#fb923c' },
          { offset: 1, color: '#ea580c' }
        ]
      },
    };

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        confine: true,
        backgroundColor: 'rgba(15, 23, 42, 0.92)',
        borderColor: 'rgba(148, 163, 184, 0.25)',
        borderWidth: 1,
        borderRadius: 16,
        textStyle: {
          color: '#f8fafc',
          fontSize: 13,
          fontWeight: 600,
          fontFamily: 'Outfit, Inter, system-ui, sans-serif'
        },
        padding: [14, 18],
        extraCssText: 'backdrop-filter: blur(24px); box-shadow: 0 20px 40px -8px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.05);',
        formatter: (params: any) => {
          const base = params.seriesName === 'Screening Outcome' ? (notSuspected + suspected) : suspected;
          const pct = base > 0 ? ((params.value / base) * 100).toFixed(1) : '0';
          return `
            <div style="font-weight: 800; font-size: 9px; text-transform: uppercase; letter-spacing: 0.15em; color: #94a3b8; margin-bottom: 6px;">${params.seriesName}</div>
            <div style="font-weight: 900; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #e2e8f0; margin-bottom: 4px;">${params.name}</div>
            <div style="font-size: 28px; font-weight: 900; color: #ffffff; margin-bottom: 4px;">${params.value.toLocaleString()}</div>
            <div style="font-size: 12px; color: #94a3b8; font-weight: 600;">${pct}% of ${params.seriesName === 'Screening Outcome' ? 'screened' : 'suspected'}</div>
          `;
        }
      },
      // No echarts legend — we use a custom legend below the chart
      legend: { show: false },
      series: [
        // ─── OUTER RING: Screening Outcomes ──────────────────
        {
          name: 'Screening Outcome',
          type: 'pie',
          radius: ['52%', '80%'],
          center: ['50%', '50%'],
          startAngle: 90,
          padAngle: 2,
          itemStyle: {
            borderRadius: 8,
            borderColor: 'rgba(255, 255, 255, 0.5)',
            borderWidth: 2,
            shadowBlur: 20,
            shadowColor: 'rgba(0, 0, 0, 0.18)',
            shadowOffsetY: 6,
          },
          label: {
            show: true,
            position: 'inside',
            formatter: (p: any) => {
              const pct = (notSuspected + suspected) > 0
                ? ((p.value / (notSuspected + suspected)) * 100).toFixed(0) : '0';
              return Number(pct) >= 5 ? `{pct|${pct}%}` : '';
            },
            rich: {
              pct: {
                fontSize: 15,
                fontWeight: 900,
                color: '#ffffff',
                textShadowColor: 'rgba(0,0,0,0.6)',
                textShadowBlur: 6,
                fontFamily: 'Outfit, Inter, system-ui',
              }
            }
          },
          labelLine: { show: false },
          emphasis: {
            scaleSize: 8,
            itemStyle: {
              shadowBlur: 40,
              shadowOffsetY: 12,
              shadowColor: 'rgba(0, 0, 0, 0.3)',
              borderWidth: 3,
              borderColor: 'rgba(255, 255, 255, 0.7)',
            }
          },
          data: outerData.map(item => ({
            name: item.name,
            value: item.value,
            itemStyle: { color: colorMap[item.name] }
          })),
        },

        // ─── INNER RING: Clinical Funnel ─────────────────────
        {
          name: 'Clinical Funnel',
          type: 'pie',
          radius: ['24%', '46%'],
          center: ['50%', '50%'],
          startAngle: 90,
          padAngle: 3,
          itemStyle: {
            borderRadius: 6,
            borderColor: 'rgba(255, 255, 255, 0.45)',
            borderWidth: 1.5,
            shadowBlur: 12,
            shadowColor: 'rgba(0, 0, 0, 0.12)',
            shadowOffsetY: 4,
          },
          label: {
            show: true,
            position: 'inside',
            formatter: (p: any) => {
              return p.value > 0 ? `{val|${p.value}}` : '';
            },
            rich: {
              val: {
                fontSize: 12,
                fontWeight: 800,
                color: '#ffffff',
                textShadowColor: 'rgba(0,0,0,0.5)',
                textShadowBlur: 5,
                fontFamily: 'Outfit, Inter, system-ui',
              }
            }
          },
          labelLine: { show: false },
          emphasis: {
            scaleSize: 6,
            itemStyle: {
              shadowBlur: 30,
              shadowOffsetY: 8,
              shadowColor: 'rgba(0, 0, 0, 0.25)',
              borderWidth: 2,
              borderColor: 'rgba(255, 255, 255, 0.6)',
            }
          },
          data: innerData.map(item => ({
            name: item.name,
            value: item.value,
            itemStyle: { color: colorMap[item.name] }
          })),
        },

        // ─── CENTER LABEL ────────────────────────────────────
        {
          name: 'Center',
          type: 'pie',
          radius: ['0%', '20%'],
          center: ['50%', '50%'],
          silent: true,
          label: {
            show: true,
            position: 'center',
            formatter: () => `{total|${total.toLocaleString()}}\n{label|Screened}`,
            rich: {
              total: {
                fontSize: 26,
                fontWeight: 900,
                color: '#0f172a',
                lineHeight: 32,
                fontFamily: 'Outfit, Inter, system-ui',
              },
              label: {
                fontSize: 10,
                fontWeight: 700,
                color: '#94a3b8',
                lineHeight: 18,
                letterSpacing: 2,
                fontFamily: 'Outfit, Inter, system-ui',
              }
            }
          },
          labelLine: { show: false },
          itemStyle: {
            color: 'transparent',
          },
          data: [{ value: 1 }],
        },
      ],
      animationType: 'expansion',
      animationEasing: 'cubicOut',
      animationDuration: 1200,
      animationDelay: (idx: number) => idx * 80,
    };
  }, [data]);

  return (
    <div className="relative overflow-hidden rounded-2xl">
      {/* Ambient glow orbs */}
      <div
        className="absolute -top-16 -left-16 w-56 h-56 rounded-full blur-3xl opacity-40 pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(56,189,248,0.35) 0%, transparent 70%)', animation: 'pulse 4s ease-in-out infinite' }}
      />
      <div
        className="absolute -bottom-20 -right-20 w-64 h-64 rounded-full blur-3xl opacity-30 pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(167,139,250,0.3) 0%, transparent 70%)', animation: 'pulse 5s ease-in-out infinite 1.5s' }}
      />

      {/* Glass overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/60 via-white/30 to-white/50 backdrop-blur-sm rounded-2xl pointer-events-none" />

      {/* Chart */}
      <ReactECharts
        ref={chartRef}
        option={getOption}
        style={{ width: '100%', height: '360px', position: 'relative', zIndex: 10 }}
        opts={{ renderer: 'canvas' }}
      />

      {/* Custom Legend Grid — beneath chart */}
      <div className="relative z-10 px-4 pb-5 -mt-2">
        <div className="grid grid-cols-3 gap-x-3 gap-y-3">
          {data.map((item, i) => (
            <div
              key={item.stage}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white/60 border border-slate-200/50 backdrop-blur-sm shadow-sm hover:shadow-md hover:border-slate-300/60 transition-all duration-200 group cursor-default"
            >
              <div
                className="w-3 h-3 rounded-full shrink-0 shadow-sm ring-2 ring-white/80"
                style={{ backgroundColor: LEGEND_DOT_COLORS[i] }}
              />
              <div className="min-w-0">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider leading-tight truncate group-hover:text-slate-700 transition-colors">
                  {item.stage}
                </div>
                <div className="text-base font-black text-slate-900 tracking-tight leading-tight">
                  {item.value.toLocaleString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
