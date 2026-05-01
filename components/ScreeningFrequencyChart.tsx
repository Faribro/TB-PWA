'use client';

import React, { useEffect, useRef } from 'react';
import * as am4core from '@amcharts/amcharts4/core';
import * as am4charts from '@amcharts/amcharts4/charts';
import am4themes_animated from '@amcharts/amcharts4/themes/animated';
import { motion } from 'framer-motion';

// Apply animated theme
am4core.useTheme(am4themes_animated);

const STAGE_COLORS = {
  'Screened':      '#38bdf8',
  'Not Suspected': '#10b981',
  'Suspected':     '#f59e0b',
  'Referred':      '#8b5cf6',
  'Diagnosed':     '#ec4899',
  'ATT Started':   '#f97316',
} as const;

const STAGE_GRADIENTS = {
  'Not Suspected': ['#10b981', '#059669'],
  'Suspected':     ['#f59e0b', '#d97706'],
  'Referred':      ['#8b5cf6', '#7c3aed'],
  'Diagnosed':     ['#ec4899', '#db2777'],
  'ATT Started':   ['#f97316', '#ea580c'],
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
    const chartData = data
      .filter(item => item.stage !== 'Screened')
      .map(item => ({
        category: item.stage,
        value: item.value,
        color: am4core.color(STAGE_COLORS[item.stage as keyof typeof STAGE_COLORS] || '#94a3b8')
      }));
    
    chart.data = chartData;

    // Premium donut configuration
    chart.innerRadius = am4core.percent(50);
    chart.radius = am4core.percent(90);

    // Add and configure Series
    const pieSeries = chart.series.push(new am4charts.PieSeries());
    pieSeries.dataFields.value = 'value';
    pieSeries.dataFields.category = 'category';
    pieSeries.slices.template.propertyFields.fill = 'color';

    // Ultra-premium slice styling
    pieSeries.slices.template.stroke = am4core.color('#ffffff');
    pieSeries.slices.template.strokeWidth = 4;
    pieSeries.slices.template.strokeOpacity = 1;
    pieSeries.slices.template.cornerRadius = 10;
    pieSeries.slices.template.fillOpacity = 0.95;

    // Apply gradients to slices
    pieSeries.slices.template.adapter.add('fill', (fill, target) => {
      const dataItem = target.dataItem as any;
      if (dataItem && dataItem.category) {
        const gradientColors = STAGE_GRADIENTS[dataItem.category as keyof typeof STAGE_GRADIENTS];
        if (gradientColors) {
          const gradient = new am4core.LinearGradient();
          gradient.addColor(am4core.color(gradientColors[0]));
          gradient.addColor(am4core.color(gradientColors[1]));
          gradient.rotation = 45;
          return gradient;
        }
      }
      return fill;
    });

    // Cursor pointer on hover
    pieSeries.slices.template.cursorOverStyle = [
      {
        property: 'cursor',
        value: 'pointer'
      }
    ];

    // Disable labels on slices
    pieSeries.labels.template.disabled = true;
    pieSeries.ticks.template.disabled = true;

    // Premium hover effects with glow
    const shadow = pieSeries.slices.template.filters.push(new am4core.DropShadowFilter());
    shadow.opacity = 0;
    shadow.blur = 0;

    const hoverState = pieSeries.slices.template.states.getKey('hover');
    if (hoverState) {
      hoverState.properties.scale = 1.08;
      hoverState.properties.fillOpacity = 1;
      const hoverShadow = hoverState.filters.push(new am4core.DropShadowFilter());
      hoverShadow.opacity = 0.6;
      hoverShadow.blur = 15;
      hoverShadow.dx = 0;
      hoverShadow.dy = 6;
    }

    // Active state with shift
    const activeState = pieSeries.slices.template.states.create('active');
    activeState.properties.shiftRadius = 0.15;
    activeState.properties.scale = 1.05;

    // Center label - ultra premium styling
    const label = chart.seriesContainer.createChild(am4core.Label);
    label.text = data.find(d => d.stage === 'Screened')?.value.toLocaleString() || '0';
    label.horizontalCenter = 'middle';
    label.verticalCenter = 'middle';
    label.fontSize = 56;
    label.fontWeight = '900';
    label.fill = am4core.color('#0f172a');
    label.dy = -10;
    
    const centerShadow = label.filters.push(new am4core.DropShadowFilter());
    centerShadow.dx = 0;
    centerShadow.dy = 3;
    centerShadow.blur = 10;
    centerShadow.opacity = 0.2;
    centerShadow.color = am4core.color('#000000');

    const sublabel = chart.seriesContainer.createChild(am4core.Label);
    sublabel.text = 'TOTAL SCREENED';
    sublabel.horizontalCenter = 'middle';
    sublabel.verticalCenter = 'middle';
    sublabel.fontSize = 10;
    sublabel.fontWeight = '800';
    sublabel.fill = am4core.color('#64748b');
    sublabel.dy = 32;

    // Premium legend - right side vertical
    chart.legend = new am4charts.Legend();
    chart.legend.position = 'right';
    chart.legend.valign = 'middle';
    chart.legend.contentAlign = 'left';
    chart.legend.paddingLeft = 20;
    chart.legend.paddingRight = 0;
    chart.legend.maxWidth = 200;

    // Legend item styling - card-based design
    chart.legend.itemContainers.template.paddingTop = 10;
    chart.legend.itemContainers.template.paddingBottom = 10;
    chart.legend.itemContainers.template.paddingLeft = 14;
    chart.legend.itemContainers.template.paddingRight = 14;
    chart.legend.itemContainers.template.background.fill = am4core.color('#ffffff');
    chart.legend.itemContainers.template.background.fillOpacity = 0.98;
    chart.legend.itemContainers.template.background.strokeWidth = 1;
    chart.legend.itemContainers.template.background.stroke = am4core.color('#e2e8f0');
    
    const legendShadow = chart.legend.itemContainers.template.background.filters.push(new am4core.DropShadowFilter());
    legendShadow.dx = 0;
    legendShadow.dy = 2;
    legendShadow.blur = 8;
    legendShadow.opacity = 0.1;

    // Legend hover state
    const legendHoverState = chart.legend.itemContainers.template.background.states.create('hover');
    legendHoverState.properties.fillOpacity = 1;
    legendHoverState.properties.strokeWidth = 2;
    legendHoverState.properties.stroke = am4core.color('#94a3b8');
    
    const legendHoverShadow = legendHoverState.filters.push(new am4core.DropShadowFilter());
    legendHoverShadow.dx = 0;
    legendHoverShadow.dy = 4;
    legendHoverShadow.blur = 16;
    legendHoverShadow.opacity = 0.2;

    // Legend labels
    chart.legend.labels.template.fontSize = 11;
    chart.legend.labels.template.fontWeight = '700';
    chart.legend.labels.template.fill = am4core.color('#334155');
    chart.legend.labels.template.paddingLeft = 8;
    chart.legend.labels.template.maxWidth = 100;
    chart.legend.labels.template.truncate = true;

    // Legend value labels
    chart.legend.valueLabels.template.fontSize = 16;
    chart.legend.valueLabels.template.fontWeight = '900';
    chart.legend.valueLabels.template.fill = am4core.color('#0f172a');
    chart.legend.valueLabels.template.paddingLeft = 8;
    chart.legend.valueLabels.template.text = '{value.value.formatNumber("#,###")}';

    // Legend markers - larger circles with gradient
    chart.legend.markers.template.width = 16;
    chart.legend.markers.template.height = 16;
    
    const markerShadow = chart.legend.markers.template.filters.push(new am4core.DropShadowFilter());
    markerShadow.dx = 0;
    markerShadow.dy = 1;
    markerShadow.blur = 4;
    markerShadow.opacity = 0.4;

    // Interactive legend
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

    // Premium animation
    chart.hiddenState.properties.opacity = 0;
    pieSeries.hiddenState.properties.opacity = 1;
    pieSeries.hiddenState.properties.endAngle = -90;
    pieSeries.hiddenState.properties.startAngle = -90;
    chart.defaultState.transitionDuration = 1200;

    // Cleanup
    return () => {
      chart.dispose();
    };
  }, [JSON.stringify(data)]);

  return (
    <div className="relative w-full h-[320px] rounded-3xl overflow-hidden bg-gradient-to-br from-white via-slate-50/50 to-white backdrop-blur-3xl shadow-2xl border border-slate-200/60">
      {/* Premium background with mesh gradient */}
      <div className="absolute inset-0 opacity-40">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_30%_20%,rgba(56,189,248,0.15),transparent_50%)]" />
        <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_70%_80%,rgba(139,92,246,0.15),transparent_50%)]" />
        <div className="absolute bottom-0 left-0 w-full h-full bg-[radial-gradient(circle_at_20%_90%,rgba(236,72,153,0.12),transparent_50%)]" />
      </div>

      {/* Subtle grid pattern */}
      <div className="absolute inset-0 opacity-[0.02]" style={{ 
        backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)',
        backgroundSize: '20px 20px'
      }} />
      
      {/* Chart container */}
      <div 
        ref={chartDivRef} 
        className="relative w-full h-full z-10 p-6"
        style={{ minHeight: '100%' }}
      />
    </div>
  );
}
