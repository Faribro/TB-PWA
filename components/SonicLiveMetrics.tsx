'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { TrendingUp, TrendingDown, Activity, Zap, Users, MapPin, AlertTriangle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetricData {
  label: string;
  value: number;
  target: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  icon: React.ReactNode;
  color: string;
}

interface LiveMetricsProps {
  metrics: MetricData[];
  isLive?: boolean;
  animationDuration?: number;
}

export function SonicLiveMetrics({ metrics, isLive = true, animationDuration = 2 }: LiveMetricsProps) {
  const [displayValues, setDisplayValues] = useState<Record<string, number>>({});
  const animationRef = useRef<NodeJS.Timeout | null>(null);

  // Animate metric values in real-time
  useEffect(() => {
    if (!isLive) {
      const newValues: Record<string, number> = {};
      metrics.forEach(m => {
        newValues[m.label] = m.value;
      });
      setDisplayValues(newValues);
      return;
    }

    const startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / (animationDuration * 1000), 1);

      const newValues: Record<string, number> = {};
      metrics.forEach(m => {
        const startValue = displayValues[m.label] || 0;
        const endValue = m.value;
        newValues[m.label] = startValue + (endValue - startValue) * progress;
      });
      setDisplayValues(newValues);

      if (progress < 1) {
        animationRef.current = setTimeout(animate, 16);
      }
    };

    animate();

    return () => {
      if (animationRef.current) clearTimeout(animationRef.current);
    };
  }, [metrics, isLive, animationDuration]);

  return (
    <div className="grid grid-cols-2 gap-3">
      {metrics.map((metric, i) => (
        <motion.div
          key={metric.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className="bg-gradient-to-br from-slate-900/60 to-slate-800/40 backdrop-blur-xl border border-slate-700/50 rounded-xl p-4 hover:border-blue-500/30 transition-all group"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className={cn('p-2 rounded-lg', metric.color)}>
                {metric.icon}
              </div>
              <span className="font-share-tech text-[9px] font-black text-white/70 uppercase tracking-wider">
                {metric.label}
              </span>
            </div>
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              {metric.trend === 'up' && <TrendingUp className="w-4 h-4 text-emerald-400" />}
              {metric.trend === 'down' && <TrendingDown className="w-4 h-4 text-rose-400" />}
              {metric.trend === 'stable' && <Activity className="w-4 h-4 text-blue-400" />}
            </motion.div>
          </div>

          <div className="space-y-2">
            <div className="flex items-baseline gap-2">
              <motion.span className="font-syncopate text-2xl font-black text-white drop-shadow-[0_0_10px_rgba(0,210,255,0.3)]">
                {Math.round(displayValues[metric.label] || 0).toLocaleString()}
              </motion.span>
              <span className="font-share-tech text-[10px] text-white/50 uppercase tracking-wider">
                {metric.unit}
              </span>
            </div>

            {/* Progress bar */}
            <div className="w-full h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${((displayValues[metric.label] || 0) / metric.target) * 100}%` }}
                transition={{ duration: 0.5 }}
                className={cn(
                  'h-full rounded-full',
                  metric.trend === 'up' ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' : 'bg-gradient-to-r from-blue-500 to-cyan-400'
                )}
              />
            </div>

            <div className="flex justify-between items-center">
              <span className="font-share-tech text-[8px] text-white/40 uppercase tracking-wider">
                Target: {metric.target.toLocaleString()}
              </span>
              <span className="font-share-tech text-[8px] text-white/40 uppercase tracking-wider">
                {Math.round(((displayValues[metric.label] || 0) / metric.target) * 100)}%
              </span>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// Real-time animated line chart
export function SonicLiveChart({ data, title }: { data: Array<{ x: string; y: number }>; title: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const padding = 40;

    const animate = () => {
      // Clear canvas
      ctx.fillStyle = 'rgba(10, 14, 39, 0.8)';
      ctx.fillRect(0, 0, width, height);

      // Draw grid
      ctx.strokeStyle = 'rgba(0, 210, 255, 0.1)';
      ctx.lineWidth = 1;
      for (let i = 0; i <= 5; i++) {
        const y = padding + (i * (height - 2 * padding)) / 5;
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(width - padding, y);
        ctx.stroke();
      }

      // Draw axes
      ctx.strokeStyle = 'rgba(0, 210, 255, 0.3)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(padding, padding);
      ctx.lineTo(padding, height - padding);
      ctx.lineTo(width - padding, height - padding);
      ctx.stroke();

      // Draw data line
      if (data.length > 0) {
        const maxY = Math.max(...data.map(d => d.y), 1);
        const xStep = (width - 2 * padding) / (data.length - 1 || 1);

        ctx.strokeStyle = 'rgba(0, 210, 255, 0.8)';
        ctx.lineWidth = 2;
        ctx.beginPath();

        data.forEach((point, i) => {
          const x = padding + i * xStep;
          const y = height - padding - (point.y / maxY) * (height - 2 * padding);

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        });
        ctx.stroke();

        // Draw points
        ctx.fillStyle = 'rgba(0, 255, 200, 0.8)';
        data.forEach((point, i) => {
          const x = padding + i * xStep;
          const y = height - padding - (point.y / maxY) * (height - 2 * padding);
          ctx.beginPath();
          ctx.arc(x, y, 3, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [data]);

  return (
    <div className="bg-gradient-to-br from-slate-900/60 to-slate-800/40 backdrop-blur-xl border border-slate-700/50 rounded-xl p-4">
      <h3 className="font-syncopate text-[11px] font-black text-white uppercase tracking-[0.2em] mb-4 drop-shadow-[0_0_10px_rgba(0,210,255,0.3)]">
        {title}
      </h3>
      <canvas
        ref={canvasRef}
        width={300}
        height={150}
        className="w-full border border-slate-700/30 rounded-lg"
      />
    </div>
  );
}

// Real-time status indicator
export function SonicStatusIndicator({ status, message }: { status: 'active' | 'warning' | 'critical'; message: string }) {
  const statusConfig = {
    active: {
      color: 'from-emerald-500 to-emerald-400',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/30',
      textColor: 'text-emerald-300',
      icon: CheckCircle,
    },
    warning: {
      color: 'from-amber-500 to-amber-400',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/30',
      textColor: 'text-amber-300',
      icon: AlertTriangle,
    },
    critical: {
      color: 'from-rose-500 to-rose-400',
      bgColor: 'bg-rose-500/10',
      borderColor: 'border-rose-500/30',
      textColor: 'text-rose-300',
      icon: AlertTriangle,
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        'flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-xl',
        config.bgColor,
        config.borderColor
      )}
    >
      <motion.div
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        <Icon className={cn('w-5 h-5', config.textColor)} />
      </motion.div>
      <div>
        <p className={cn('font-syncopate text-[10px] font-black uppercase tracking-[0.1em]', config.textColor)}>
          {status.toUpperCase()}
        </p>
        <p className="font-share-tech text-[9px] text-white/70 uppercase tracking-wider">
          {message}
        </p>
      </div>
    </motion.div>
  );
}

// Real-time heatmap
export function SonicHeatmap({ data, title }: { data: number[][]; title: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cellSize = 20;
    const width = data[0]?.length || 0;
    const height = data.length;

    canvas.width = width * cellSize;
    canvas.height = height * cellSize;

    const maxValue = Math.max(...data.flat());

    data.forEach((row, y) => {
      row.forEach((value, x) => {
        const hue = (1 - value / maxValue) * 240;
        const saturation = 100;
        const lightness = 50;

        ctx.fillStyle = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
        ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);

        ctx.strokeStyle = 'rgba(0, 210, 255, 0.1)';
        ctx.strokeRect(x * cellSize, y * cellSize, cellSize, cellSize);
      });
    });
  }, [data]);

  return (
    <div className="bg-gradient-to-br from-slate-900/60 to-slate-800/40 backdrop-blur-xl border border-slate-700/50 rounded-xl p-4">
      <h3 className="font-syncopate text-[11px] font-black text-white uppercase tracking-[0.2em] mb-4 drop-shadow-[0_0_10px_rgba(0,210,255,0.3)]">
        {title}
      </h3>
      <canvas ref={canvasRef} className="w-full border border-slate-700/30 rounded-lg" />
    </div>
  );
}
