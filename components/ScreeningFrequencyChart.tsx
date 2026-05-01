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

    // Premium donut configuration with perfect proportions
    chart.innerRadius = am4core.percent(55);
    chart.radius = am4core.percent(85);
    chart.startAngle = -90;
    chart.endAngle = 270;

    // Add and configure Series
    const pieSeries = chart.series.push(new am4charts.PieSeries());
    pieSeries.dataFields.value = 'value';
    pieSeries.dataFields.category = 'category';
    pieSeries.slices.template.propertyFields.fill = 'color';

    // Ultra-premium slice styling with depth
    pieSeries.slices.template.stroke = am4core.color('#ffffff');
    pieSeries.slices.template.strokeWidth = 5;
    pieSeries.slices.template.strokeOpacity = 1;
    pieSeries.slices.template.cornerRadius = 12;
    pieSeries.slices.template.fillOpacity = 1;
    pieSeries.slices.template.tooltipText = '{category}: [bold]{value.formatNumber("#,###")}[/]';
    
    // Add inner glow effect
    const innerGlow = pieSeries.slices.template.filters.push(new am4core.DropShadowFilter());
    innerGlow.dx = 0;
    innerGlow.dy = 0;
    innerGlow.blur = 8;
    innerGlow.opacity = 0.3;
    innerGlow.color = am4core.color('#ffffff');

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

    // Premium hover effects with dramatic glow
    const shadow = pieSeries.slices.template.filters.push(new am4core.DropShadowFilter());
    shadow.opacity = 0.2;
    shadow.blur = 6;
    shadow.dx = 0;
    shadow.dy = 2;

    const hoverState = pieSeries.slices.template.states.getKey('hover');
    if (hoverState) {
      hoverState.properties.scale = 1.12;
      hoverState.properties.fillOpacity = 1;
      const hoverShadow = hoverState.filters.push(new am4core.DropShadowFilter());
      hoverShadow.opacity = 0.8;
      hoverShadow.blur = 25;
      hoverShadow.dx = 0;
      hoverShadow.dy = 8;
      
      // Add outer glow on hover
      const hoverGlow = hoverState.filters.push(new am4core.DropShadowFilter());
      hoverGlow.opacity = 0.6;
      hoverGlow.blur = 35;
      hoverGlow.dx = 0;
      hoverGlow.dy = 0;
    }

    // Active state with dramatic shift and glow
    const activeState = pieSeries.slices.template.states.create('active');
    activeState.properties.shiftRadius = 0.2;
    activeState.properties.scale = 1.08;
    
    const activeGlow = activeState.filters.push(new am4core.DropShadowFilter());
    activeGlow.opacity = 0.9;
    activeGlow.blur = 30;
    activeGlow.dx = 0;
    activeGlow.dy = 0;

    // Center label - ultra premium with glow
    const label = chart.seriesContainer.createChild(am4core.Label);
    label.text = data.find(d => d.stage === 'Screened')?.value.toLocaleString() || '0';
    label.horizontalCenter = 'middle';
    label.verticalCenter = 'middle';
    label.fontSize = 64;
    label.fontWeight = '900';
    label.fill = am4core.color('#0f172a');
    label.dy = -12;
    
    const centerShadow = label.filters.push(new am4core.DropShadowFilter());
    centerShadow.dx = 0;
    centerShadow.dy = 4;
    centerShadow.blur = 12;
    centerShadow.opacity = 0.25;
    centerShadow.color = am4core.color('#000000');
    
    // Add subtle glow
    const centerGlow = label.filters.push(new am4core.DropShadowFilter());
    centerGlow.dx = 0;
    centerGlow.dy = 0;
    centerGlow.blur = 20;
    centerGlow.opacity = 0.1;
    centerGlow.color = am4core.color('#6366f1');

    const sublabel = chart.seriesContainer.createChild(am4core.Label);
    sublabel.text = 'TOTAL SCREENED';
    sublabel.horizontalCenter = 'middle';
    sublabel.verticalCenter = 'middle';
    sublabel.fontSize = 11;
    sublabel.fontWeight = '800';
    sublabel.fill = am4core.color('#64748b');
    sublabel.dy = 38;

    // Luxury legend - right side vertical with premium cards
    chart.legend = new am4charts.Legend();
    chart.legend.position = 'right';
    chart.legend.valign = 'middle';
    chart.legend.contentAlign = 'left';
    chart.legend.paddingLeft = 24;
    chart.legend.paddingRight = 0;
    chart.legend.maxWidth = 220;
    chart.legend.marginTop = 20;
    chart.legend.marginBottom = 20;

    // Legend item styling - luxury card design
    chart.legend.itemContainers.template.paddingTop = 12;
    chart.legend.itemContainers.template.paddingBottom = 12;
    chart.legend.itemContainers.template.paddingLeft = 16;
    chart.legend.itemContainers.template.paddingRight = 16;
    chart.legend.itemContainers.template.marginBottom = 8;
    chart.legend.itemContainers.template.background.fill = am4core.color('#ffffff');
    chart.legend.itemContainers.template.background.fillOpacity = 1;
    chart.legend.itemContainers.template.background.strokeWidth = 1;
    chart.legend.itemContainers.template.background.stroke = am4core.color('#e2e8f0');
    
    const legendShadow = chart.legend.itemContainers.template.background.filters.push(new am4core.DropShadowFilter());
    legendShadow.dx = 0;
    legendShadow.dy = 2;
    legendShadow.blur = 10;
    legendShadow.opacity = 0.12;

    // Legend hover state - dramatic lift
    const legendHoverState = chart.legend.itemContainers.template.background.states.create('hover');
    legendHoverState.properties.fillOpacity = 1;
    legendHoverState.properties.strokeWidth = 2;
    legendHoverState.properties.stroke = am4core.color('#6366f1');
    
    const legendHoverShadow = legendHoverState.filters.push(new am4core.DropShadowFilter());
    legendHoverShadow.dx = 0;
    legendHoverShadow.dy = 6;
    legendHoverShadow.blur = 20;
    legendHoverShadow.opacity = 0.25;

    // Legend labels - enhanced hierarchy
    chart.legend.labels.template.fontSize = 12;
    chart.legend.labels.template.fontWeight = '700';
    chart.legend.labels.template.fill = am4core.color('#475569');
    chart.legend.labels.template.paddingLeft = 10;
    chart.legend.labels.template.maxWidth = 110;
    chart.legend.labels.template.truncate = true;

    // Legend value labels - bold and prominent
    chart.legend.valueLabels.template.fontSize = 18;
    chart.legend.valueLabels.template.fontWeight = '900';
    chart.legend.valueLabels.template.fill = am4core.color('#0f172a');
    chart.legend.valueLabels.template.paddingLeft = 10;
    chart.legend.valueLabels.template.text = '{value.value.formatNumber("#,###")}';

    // Legend markers - larger circles with premium shadow
    chart.legend.markers.template.width = 18;
    chart.legend.markers.template.height = 18;
    
    const markerShadow = chart.legend.markers.template.filters.push(new am4core.DropShadowFilter());
    markerShadow.dx = 0;
    markerShadow.dy = 2;
    markerShadow.blur = 6;
    markerShadow.opacity = 0.5;

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

    // Luxury animation with smooth easing
    chart.hiddenState.properties.opacity = 0;
    pieSeries.hiddenState.properties.opacity = 1;
    pieSeries.hiddenState.properties.endAngle = -90;
    pieSeries.hiddenState.properties.startAngle = -90;
    chart.defaultState.transitionDuration = 1500;
    chart.defaultState.transitionEasing = am4core.ease.cubicOut;

    // Cleanup
    return () => {
      chart.dispose();
    };
  }, [JSON.stringify(data)]);

  return (
    <div className="relative w-full h-[340px] rounded-3xl overflow-hidden bg-gradient-to-br from-white via-slate-50/30 to-white backdrop-blur-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)] border border-slate-200/80">
      {/* Premium background with enhanced mesh gradient */}
      <div className="absolute inset-0 opacity-50">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_25%_15%,rgba(99,102,241,0.18),transparent_50%)]" />
        <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_75%_85%,rgba(139,92,246,0.18),transparent_50%)]" />
        <div className="absolute bottom-0 left-0 w-full h-full bg-[radial-gradient(circle_at_15%_85%,rgba(236,72,153,0.15),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(56,189,248,0.08),transparent_70%)]" />
      </div>

      {/* Luxury grid pattern with shimmer */}
      <div className="absolute inset-0 opacity-[0.025]" style={{ 
        backgroundImage: 'linear-gradient(#000 1.5px, transparent 1.5px), linear-gradient(90deg, #000 1.5px, transparent 1.5px)',
        backgroundSize: '24px 24px'
      }} />
      
      {/* Subtle noise texture for depth */}
      <div className="absolute inset-0 opacity-[0.015] mix-blend-overlay" style={{
        backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"%3E%3Cfilter id="noiseFilter"%3E%3CfeTurbulence type="fractalNoise" baseFrequency="3" numOctaves="4" /%3E%3C/filter%3E%3Crect width="100%25" height="100%25" filter="url(%23noiseFilter)" /%3E%3C/svg%3E")'
      }} />
      
      {/* Chart container */}
      <div 
        ref={chartDivRef} 
        className="relative w-full h-full z-10 p-8"
        style={{ minHeight: '100%' }}
      />
    </div>
  );
}
