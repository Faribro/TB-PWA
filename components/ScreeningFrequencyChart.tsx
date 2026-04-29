'use client';

import { useEffect, useRef } from 'react';

interface ScreeningFrequencyChartProps {
  data: {
    stage: string;
    value: number;
  }[];
}

export function ScreeningFrequencyChart({ data }: ScreeningFrequencyChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<any>(null);

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined' || !chartRef.current) return;

    // Load amCharts scripts dynamically
    const loadScript = (src: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        // Check if script already exists
        if (document.querySelector(`script[src="${src}"]`)) {
          resolve();
          return;
        }
        const script = document.createElement('script');
        script.src = src;
        script.onload = () => resolve();
        script.onerror = reject;
        document.head.appendChild(script);
      });
    };

    const initChart = async () => {
      try {
        // Load amCharts scripts in order
        await loadScript('https://www.amcharts.com/lib/4/core.js');
        await loadScript('https://www.amcharts.com/lib/4/charts.js');
        await loadScript('https://www.amcharts.com/lib/4/themes/animated.js');

        // Access amCharts from window
        const am4core = (window as any).am4core;
        const am4charts = (window as any).am4charts;
        const am4themes_animated = (window as any).am4themes_animated;

        if (!am4core || !am4charts || !am4themes_animated) {
          console.error('amCharts libraries not loaded');
          return;
        }

        // Use animated theme
        am4core.useTheme(am4themes_animated);

        // Create chart
        const chart = am4core.create(chartRef.current, am4charts.PieChart3D);
        chart.hiddenState.properties.opacity = 0;

        // Set data
        chart.data = data;

        chart.innerRadius = am4core.percent(30);
        chart.depth = 100;

        // Create series
        const series = chart.series.push(new am4charts.PieSeries3D());
        series.dataFields.value = 'value';
        series.dataFields.depthValue = 'value'; // Variable-height 3D effect
        series.dataFields.category = 'stage';
        series.slices.template.cornerRadius = 6;
        series.colors.step = 2;

        // Premium color palette matching Care Cascade
        chart.colors.list = [
          am4core.color('#0f766e'), // Screened — teal
          am4core.color('#16a34a'), // Not Suspected — green
          am4core.color('#d97706'), // Suspected — amber
          am4core.color('#2563eb'), // Referred — blue
          am4core.color('#7c3aed'), // Diagnosed — violet
          am4core.color('#db2777'), // ATT Started — pink
        ];

        // Slice labels (outside labels)
        series.labels.template.text = '{category}: [bold]{value}[/]';
        series.labels.template.fontSize = 13;
        series.labels.template.fill = am4core.color('#1a1a2e');
        series.labels.template.padding(4, 8, 4, 8);
        series.labels.template.background.fill = am4core.color('#ffffff');
        series.labels.template.background.fillOpacity = 0.85;
        series.labels.template.background.cornerRadius = 6;
        series.labels.template.background.stroke = am4core.color('#e0e0e0');
        series.labels.template.background.strokeWidth = 1;
        series.labels.template.maxWidth = 140;
        series.labels.template.wrap = true;

        // Tick lines connecting labels to slices
        series.ticks.template.strokeWidth = 1.5;
        series.ticks.template.strokeOpacity = 0.5;
        series.ticks.template.stroke = am4core.color('#94a3b8');

        // Tooltip for hover details
        series.slices.template.tooltipText = '{category}\n[bold font-size: 20px]{value}[/] screenings\n[font-size: 12px]{value.percent.formatNumber(\'#.0\')}% of total[/]';
        series.tooltip.background.fill = am4core.color('#1e293b');
        series.tooltip.background.cornerRadius = 10;
        series.tooltip.label.fill = am4core.color('#f8fafc');
        series.tooltip.label.fontSize = 13;

        // Legend configuration
        chart.legend = new am4charts.Legend();
        chart.legend.position = 'right';
        chart.legend.scrollable = true;
        chart.legend.maxHeight = 300;
        chart.legend.labels.template.fontSize = 13;
        chart.legend.labels.template.fill = am4core.color('#374151');
        chart.legend.labels.template.text = '{name}';
        chart.legend.valueLabels.template.text = '{value.value}';
        chart.legend.valueLabels.template.fill = am4core.color('#111827');
        chart.legend.valueLabels.template.fontSize = 13;
        chart.legend.valueLabels.template.fontWeight = '700';
        chart.legend.itemContainers.template.paddingTop = 6;
        chart.legend.itemContainers.template.paddingBottom = 6;

        // Store chart instance for cleanup
        chartInstanceRef.current = chart;

      } catch (error) {
        console.error('Error initializing amCharts:', error);
      }
    };

    initChart();

    // Cleanup on unmount
    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.dispose();
        chartInstanceRef.current = null;
      }
    };
  }, [data]);

  return (
    <div 
      ref={chartRef} 
      style={{ width: '100%', height: '420px' }}
      className="rounded-2xl overflow-hidden"
    />
  );
}
