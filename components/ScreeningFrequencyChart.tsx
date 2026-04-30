'use client';

import React, { useEffect, useRef } from 'react';
import * as am4core from '@amcharts/amcharts4/core';
import * as am4charts from '@amcharts/amcharts4/charts';
import am4themes_animated from '@amcharts/amcharts4/themes/animated';

// Apply animated theme
am4core.useTheme(am4themes_animated);

const STAGE_COLORS = {
  'Screened':      '#38bdf8',
  'Not Suspected': '#34d399',
  'Suspected':     '#fbbf24',
  'Referred':      '#a78bfa',
  'Diagnosed':     '#f472b6',
  'ATT Started':   '#fb923c',
} as const;

export function ScreeningFrequencyChart({ data }: { data: any[] }) {
  const chartRef = useRef<am4charts.PieChart | null>(null);
  const chartDivRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartDivRef.current) return;

    // Create chart instance
    const chart = am4core.create(chartDivRef.current, am4charts.PieChart);
    chartRef.current = chart;

    // Add data
    chart.data = data
      .filter(item => item.stage !== 'Screened')
      .map(item => ({
        category: item.stage,
        value: item.value,
        color: am4core.color(STAGE_COLORS[item.stage as keyof typeof STAGE_COLORS] || '#94a3b8')
      }));

    // Create donut hole (30% inner radius)
    chart.innerRadius = am4core.percent(40);

    // Add and configure Series
    const pieSeries = chart.series.push(new am4charts.PieSeries());
    pieSeries.dataFields.value = 'value';
    pieSeries.dataFields.category = 'category';
    pieSeries.slices.template.propertyFields.fill = 'color';

    // Premium slice styling
    pieSeries.slices.template.stroke = am4core.color('#ffffff');
    pieSeries.slices.template.strokeWidth = 3;
    pieSeries.slices.template.strokeOpacity = 1;
    pieSeries.slices.template.cornerRadius = 8;

    // Cursor pointer on hover
    pieSeries.slices.template.cursorOverStyle = [
      {
        property: 'cursor',
        value: 'pointer'
      }
    ];

    // Label configuration - elegant and minimal
    pieSeries.labels.template.disabled = false;
    pieSeries.labels.template.text = '{category}';
    pieSeries.labels.template.fontSize = 11;
    pieSeries.labels.template.fontWeight = '700';
    pieSeries.labels.template.fill = am4core.color('#1e293b');
    pieSeries.labels.template.radius = am4core.percent(-25);
    pieSeries.ticks.template.disabled = true;

    // Hover effects - premium shadow
    const shadow = pieSeries.slices.template.filters.push(new am4core.DropShadowFilter());
    shadow.opacity = 0;
    shadow.blur = 0;

    const hoverState = pieSeries.slices.template.states.getKey('hover');
    if (hoverState) {
      hoverState.properties.scale = 1.05;
      const hoverShadow = hoverState.filters.push(new am4core.DropShadowFilter());
      hoverShadow.opacity = 0.4;
      hoverShadow.blur = 10;
      hoverShadow.dx = 0;
      hoverShadow.dy = 4;
    }

    // Active state (on click)
    const activeState = pieSeries.slices.template.states.create('active');
    activeState.properties.shiftRadius = 0.1;

    // Center label showing total screened
    const label = chart.seriesContainer.createChild(am4core.Label);
    label.text = data.find(d => d.stage === 'Screened')?.value.toLocaleString() || '0';
    label.horizontalCenter = 'middle';
    label.verticalCenter = 'middle';
    label.fontSize = 42;
    label.fontWeight = '900';
    label.fill = am4core.color('#0f172a');

    const sublabel = chart.seriesContainer.createChild(am4core.Label);
    sublabel.text = 'SCREENED';
    sublabel.horizontalCenter = 'middle';
    sublabel.verticalCenter = 'middle';
    sublabel.fontSize = 10;
    sublabel.fontWeight = '700';
    sublabel.fill = am4core.color('#64748b');
    sublabel.dy = 25;
    sublabel.letterSpacing = 2;

    // Premium legend configuration
    chart.legend = new am4charts.Legend();
    chart.legend.position = 'bottom';
    chart.legend.contentAlign = 'center';
    chart.legend.paddingTop = 20;
    chart.legend.paddingBottom = 0;

    // Legend item styling
    chart.legend.itemContainers.template.paddingTop = 6;
    chart.legend.itemContainers.template.paddingBottom = 6;
    chart.legend.itemContainers.template.paddingLeft = 12;
    chart.legend.itemContainers.template.paddingRight = 12;
    chart.legend.itemContainers.template.background.fill = am4core.color('#ffffff');
    chart.legend.itemContainers.template.background.fillOpacity = 0.8;
    chart.legend.itemContainers.template.background.strokeWidth = 1;
    chart.legend.itemContainers.template.background.stroke = am4core.color('#e2e8f0');
    chart.legend.itemContainers.template.background.cornerRadius(8, 8, 8, 8);

    // Legend hover state
    const legendHoverState = chart.legend.itemContainers.template.background.states.create('hover');
    legendHoverState.properties.fillOpacity = 1;
    legendHoverState.properties.strokeWidth = 2;

    // Legend labels
    chart.legend.labels.template.fontSize = 11;
    chart.legend.labels.template.fontWeight = '700';
    chart.legend.labels.template.fill = am4core.color('#334155');
    chart.legend.labels.template.paddingLeft = 8;

    // Legend value labels
    chart.legend.valueLabels.template.fontSize = 12;
    chart.legend.valueLabels.template.fontWeight = '900';
    chart.legend.valueLabels.template.fill = am4core.color('#0f172a');
    chart.legend.valueLabels.template.paddingLeft = 8;
    chart.legend.valueLabels.template.text = '{value.value.formatNumber("#,###")}';

    // Legend markers (colored squares)
    chart.legend.markers.template.width = 12;
    chart.legend.markers.template.height = 12;
    chart.legend.markers.template.cornerRadius(3, 3, 3, 3);

    // Interactive legend - toggle slices
    chart.legend.itemContainers.template.events.on('hit', (ev) => {
      const dataItem = ev.target.dataItem as any;
      const slice = dataItem.dataContext.slice;
      if (slice.isActive) {
        slice.isActive = false;
      } else {
        pieSeries.slices.each((item) => {
          item.isActive = false;
        });
        slice.isActive = true;
      }
    });

    // Slice click event
    pieSeries.slices.template.events.on('hit', (ev) => {
      const slice = ev.target;
      if (slice.isActive) {
        slice.isActive = false;
      } else {
        pieSeries.slices.each((item) => {
          item.isActive = false;
        });
        slice.isActive = true;
      }
    });

    // Animation
    chart.hiddenState.properties.opacity = 0;
    pieSeries.hiddenState.properties.opacity = 1;
    pieSeries.hiddenState.properties.endAngle = -90;
    pieSeries.hiddenState.properties.startAngle = -90;

    // Cleanup
    return () => {
      chart.dispose();
    };
  }, [data]);

  return (
    <div className="relative w-full h-[400px] rounded-2xl overflow-hidden bg-gradient-to-br from-slate-50/80 via-white/40 to-slate-100/80 backdrop-blur-3xl p-6">
      {/* Decorative background orbs */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-sky-300/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-fuchsia-300/20 rounded-full blur-[100px] pointer-events-none" />
      
      {/* Chart container */}
      <div 
        ref={chartDivRef} 
        className="relative w-full h-full z-10"
        style={{ minHeight: '400px' }}
      />
    </div>
  );
}
