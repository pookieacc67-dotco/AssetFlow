import React, { useMemo, useState, useEffect, useRef } from "react";
import { motion } from "motion/react";

interface ChartDataPoint {
  label: string;
  value: number;
}

interface ChartProps {
  data: ChartDataPoint[];
  height?: number;
}

// Custom hook to detect container width using ResizeObserver
function useContainerWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(500);

  useEffect(() => {
    if (!ref.current) return;
    const observer = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const { width } = entries[0].contentRect;
      setWidth(width);
    });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return [ref, width] as const;
}

export const LineChart: React.FC<ChartProps> = ({ data, height = 220 }) => {
  const [containerRef, width] = useContainerWidth();
  const maxVal = useMemo(() => Math.max(...data.map(d => d.value), 1), [data]);
  const minVal = useMemo(() => Math.min(...data.map(d => d.value), 0), [data]);
  const paddingX = 44;
  const paddingY = 40;
  
  // Calculate coordinates
  const points = useMemo(() => {
    if (data.length === 0) return [];
    const chartW = width;
    const chartH = height;
    const xStep = (chartW - paddingX * 2) / (data.length - 1 || 1);
    const range = maxVal - minVal || 1;
    
    return data.map((d, i) => {
      const x = paddingX + i * xStep;
      // Invert Y coordinate so higher values go UP
      const y = chartH - paddingY - ((d.value - minVal) / range) * (chartH - paddingY * 2);
      return { x, y, label: d.label, val: d.value };
    });
  }, [data, maxVal, minVal, height, width]);

  // Compute smooth Bezier curve path
  const pathD = useMemo(() => {
    if (points.length === 0) return "";
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const curr = points[i];
      const next = points[i + 1];
      // Horizontal control points to make a smooth curve
      const cp1x = curr.x + (next.x - curr.x) * 0.35;
      const cp1y = curr.y;
      const cp2x = curr.x + (next.x - curr.x) * 0.65;
      const cp2y = next.y;
      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${next.x} ${next.y}`;
    }
    return d;
  }, [points]);

  // Compute smooth fill path to the baseline
  const fillD = useMemo(() => {
    if (points.length === 0) return "";
    const first = points[0];
    const last = points[points.length - 1];
    const bottomY = height - paddingY;
    return `${pathD} L ${last.x} ${bottomY} L ${first.x} ${bottomY} Z`;
  }, [points, pathD, height]);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-[#5B5E66] min-h-[200px]">
        No data available
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full h-full relative" style={{ height }}>
      <svg width={width} height={height} className="overflow-visible">
        <defs>
          {/* Glowing gradient fill */}
          <linearGradient id="chart-glow-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FF5A79" stopOpacity="0.25" />
            <stop offset="60%" stopColor="#FF9950" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#FF9950" stopOpacity="0.0" />
          </linearGradient>
          {/* Main stroke gradient */}
          <linearGradient id="line-gradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#FF5A79" />
            <stop offset="100%" stopColor="#FF9950" />
          </linearGradient>
        </defs>
        
        {/* Horizontal Grid lines */}
        <line x1={paddingX} y1={height - paddingY} x2={width - paddingX} y2={height - paddingY} stroke="#E7E7E9" strokeWidth={1} />
        <line x1={paddingX} y1={height / 2} x2={width - paddingX} y2={height / 2} stroke="#ECECEF" strokeWidth={1} strokeDasharray="4 4" />
        <line x1={paddingX} y1={paddingY} x2={width - paddingX} y2={paddingY} stroke="#ECECEF" strokeWidth={1} strokeDasharray="4 4" />

        {/* Chart Gradient Underlay */}
        <motion.path 
          d={fillD} 
          fill="url(#chart-glow-grad)"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        />

        {/* Smooth Curved Line Path with draw animation */}
        <motion.path 
          d={pathD} 
          fill="none" 
          stroke="url(#line-gradient)" 
          strokeWidth={3} 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />

        {/* Interactive Dots with delay animation */}
        {points.map((p, i) => (
          <motion.g 
            key={i} 
            className="group/dot cursor-pointer"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6 + i * 0.08, type: "spring", stiffness: 150 }}
          >
            {/* Outer hover ring */}
            <circle 
              cx={p.x} 
              cy={p.y} 
              r={9} 
              fill="#FF5A79" 
              fillOpacity={0.15}
              className="opacity-0 group-hover/dot:opacity-100 transition-opacity duration-200"
            />
            {/* Main Dot */}
            <circle 
              cx={p.x} 
              cy={p.y} 
              r={5.5} 
              fill="#FF5A79" 
              stroke="#FFFFFF" 
              strokeWidth={2} 
              className="transition-all duration-150 shadow-sm group-hover/dot:scale-125"
              style={{ transformOrigin: `${p.x}px ${p.y}px` }}
            />
            
            {/* Custom Tooltip on hover */}
            <g className="opacity-0 group-hover/dot:opacity-100 transition-opacity duration-200 pointer-events-none">
              <rect 
                x={p.x - 28} 
                y={p.y - 36} 
                width={56} 
                height={22} 
                rx={8} 
                fill="#15161A" 
                className="shadow-lg"
              />
              <text 
                x={p.x} 
                y={p.y - 21} 
                fill="#FFFFFF" 
                fontSize={10} 
                textAnchor="middle" 
                fontWeight="extrabold"
              >
                {p.val}%
              </text>
            </g>
          </motion.g>
        ))}

        {/* Responsive Labels */}
        {points.map((p, i) => (
          <text 
            key={i} 
            x={p.x} 
            y={height - 14} 
            fill="#8B8B92" 
            fontSize={11} 
            fontWeight="600"
            textAnchor="middle"
          >
            {p.label}
          </text>
        ))}
      </svg>
    </div>
  );
};

export const BarChart: React.FC<ChartProps> = ({ data, height = 220 }) => {
  const [containerRef, width] = useContainerWidth();
  const maxVal = useMemo(() => Math.max(...data.map(d => d.value), 1), [data]);
  const paddingX = 44;
  const paddingY = 40;
  
  const bars = useMemo(() => {
    const chartW = width - paddingX * 2;
    const barWidth = Math.min(28, (chartW / data.length) * 0.5);
    const spacing = (chartW - barWidth * data.length) / (data.length - 1 || 1);
    
    return data.map((d, i) => {
      const barH = ((d.value) / maxVal) * (height - paddingY * 2);
      const x = paddingX + i * (barWidth + spacing);
      const y = height - paddingY - barH;
      return { x, y, w: barWidth, h: barH, label: d.label, val: d.value };
    });
  }, [data, maxVal, height, width]);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-[#5B5E66] min-h-[200px]">
        No data available
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full h-full relative" style={{ height }}>
      <svg width={width} height={height} className="overflow-visible">
        <defs>
          <linearGradient id="bar-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FF5A79" />
            <stop offset="100%" stopColor="#FF9950" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        <line x1={paddingX} y1={height - paddingY} x2={width - paddingX} y2={height - paddingY} stroke="#E7E7E9" strokeWidth={1} />
        <line x1={paddingX} y1={height / 2} x2={width - paddingX} y2={height / 2} stroke="#ECECEF" strokeWidth={1} strokeDasharray="4 4" />
        <line x1={paddingX} y1={paddingY} x2={width - paddingX} y2={paddingY} stroke="#ECECEF" strokeWidth={1} strokeDasharray="4 4" />

        {/* Bars */}
        {bars.map((b, i) => (
          <g key={i} className="group/bar cursor-pointer">
            {/* Background pill path with scaling animation */}
            <motion.rect
              x={b.x}
              y={b.y}
              width={b.w}
              height={Math.max(6, b.h)}
              rx={b.w / 2}
              fill="url(#bar-gradient)"
              className="origin-bottom hover:opacity-90"
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ delay: i * 0.1, duration: 0.6, ease: "easeOut" }}
            />
            
            {/* Tooltip */}
            <g className="opacity-0 group-hover/bar:opacity-100 transition-opacity duration-200 pointer-events-none">
              <rect 
                x={b.x + b.w / 2 - 28} 
                y={b.y - 32} 
                width={56} 
                height={20} 
                rx={6} 
                fill="#15161A" 
                className="shadow-md"
              />
              <text 
                x={b.x + b.w / 2} 
                y={b.y - 19} 
                fill="#FFFFFF" 
                fontSize={10} 
                textAnchor="middle" 
                fontWeight="extrabold"
              >
                {b.val}
              </text>
            </g>

            {/* Label */}
            <text 
              x={b.x + b.w / 2} 
              y={height - 14} 
              fill="#8B8B92" 
              fontSize={11} 
              fontWeight="600"
              textAnchor="middle"
            >
              {b.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
};

export const DonutChart: React.FC<ChartProps> = ({ data, height = 220 }) => {
  const total = useMemo(() => data.reduce((acc, curr) => acc + curr.value, 0), [data]);
  
  const arcs = useMemo(() => {
    let accumulatedAngle = 0;
    const colors = ["#FF5A79", "#FF9950", "#4D96FF", "#2FBE6C", "#9B51E0"];
    
    return data.map((d, i) => {
      const percentage = total > 0 ? d.value / total : 0;
      const angle = percentage * 360;
      const startAngle = accumulatedAngle;
      accumulatedAngle += angle;
      return {
        ...d,
        startAngle,
        endAngle: accumulatedAngle,
        percentage,
        color: colors[i % colors.length]
      };
    });
  }, [data, total]);

  // Convert polar coordinates to Cartesian
  const getCoordinatesForPercent = (percent: number) => {
    const x = Math.cos(2 * Math.PI * percent);
    const y = Math.sin(2 * Math.PI * percent);
    return [x, y];
  };

  const donutSlices = useMemo(() => {
    let cumulativePercent = 0;
    return arcs.map((slice) => {
      const startPercent = cumulativePercent;
      cumulativePercent += slice.percentage;
      
      const [startX, startY] = getCoordinatesForPercent(startPercent);
      const [endX, endY] = getCoordinatesForPercent(cumulativePercent);
      
      const largeArcFlag = slice.percentage > 0.5 ? 1 : 0;
      
      const radius = 60;
      const pathData = [
        `M ${startX * radius + 110} ${startY * radius + 110}`, // Move to starting radius point
        `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX * radius + 110} ${endY * radius + 110}` // Arc to ending radius point
      ].join(" ");
      
      return {
        ...slice,
        pathData,
        radius
      };
    });
  }, [arcs]);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-[#5B5E66] min-h-[200px]">
        No data available
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-6 py-2">
      <div className="relative w-[220px] h-[220px]">
        <svg viewBox="0 0 220 220" className="w-full h-full transform -rotate-90 overflow-visible">
          {donutSlices.map((slice, i) => (
            <motion.path
              key={i}
              d={slice.pathData}
              fill="none"
              stroke={slice.color}
              strokeWidth={16}
              strokeLinecap="round"
              className="transition-all duration-300 cursor-pointer hover:stroke-[20]"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ delay: i * 0.15, duration: 0.8, ease: "easeOut" }}
            />
          ))}
          {/* Inner Text summary */}
          <g className="transform rotate-90 origin-[110px_110px]">
            <text x="110" y="104" textAnchor="middle" fill="#9A9DA4" fontSize="11" fontWeight="bold" className="uppercase tracking-widest">Total</text>
            <text x="110" y="128" textAnchor="middle" fill="#15161A" fontSize="28" className="font-extrabold tracking-tight">{total}</text>
          </g>
        </svg>
      </div>
      
      <div className="flex-1 flex flex-col gap-2.5 w-full">
        {arcs.map((slice, i) => (
          <div key={i} className="flex items-center justify-between text-xs font-semibold py-1 border-b border-black/[0.03] last:border-0">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: slice.color }} />
              <span className="text-[#5B5E66]">{slice.label}</span>
            </div>
            <div className="text-[#15161A] font-extrabold">
              {slice.value} <span className="text-[#9A9DA4] font-medium ml-1">({Math.round(slice.percentage * 100)}%)</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
