'use client';

import { useEffect, useRef } from 'react';

interface NeoPacManMazeProps {
  accentColor?: string;
  gridSize?: number;
  agentCount?: number;
  isHovered?: boolean;
}

export function NeoPacManMaze({
  accentColor = '#06b6d4',
  gridSize = 25,
  agentCount = 2,
  isHovered = false,
}: NeoPacManMazeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const mazeRef = useRef<number[][]>([]);
  const agentsRef = useRef<Agent[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (!rect) return;
      canvas.width = rect.width;
      canvas.height = rect.height;
      initMaze();
    };

    const initMaze = () => {
      const cols = Math.floor(canvas.width / (canvas.width / gridSize));
      const rows = Math.floor(canvas.height / (canvas.height / gridSize));
      mazeRef.current = generateMaze(cols, rows);
      agentsRef.current = Array.from({ length: agentCount }, (_, i) => 
        new Agent(1, 1, accentColor, cols, rows, isHovered)
      );
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const cellW = canvas.width / mazeRef.current[0]?.length || 1;
      const cellH = canvas.height / mazeRef.current.length || 1;

      // Draw maze grid (only walls as thin neon lines)
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 0.5;
      ctx.globalAlpha = 0.3;

      for (let y = 0; y < mazeRef.current.length; y++) {
        for (let x = 0; x < mazeRef.current[y].length; x++) {
          if (mazeRef.current[y][x] === 1) {
            const px = x * cellW;
            const py = y * cellH;
            ctx.strokeRect(px, py, cellW, cellH);
          }
        }
      }

      // Draw agents
      ctx.globalAlpha = 1;
      agentsRef.current.forEach(agent => {
        agent.speed = isHovered ? 3 : 1.5;
        agent.update(mazeRef.current, cellW, cellH);
        agent.draw(ctx, cellW, cellH);
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    resizeCanvas();
    animate();

    window.addEventListener('resize', resizeCanvas);
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [accentColor, gridSize, agentCount, isHovered]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ opacity: 0.6 }}
    />
  );
}

// Maze generation (recursive backtracker)
function generateMaze(w: number, h: number): number[][] {
  const maze = Array(h).fill(0).map(() => Array(w).fill(1));
  
  function carve(x: number, y: number) {
    maze[y][x] = 0;
    const dirs = [[0, 2], [2, 0], [0, -2], [-2, 0]].sort(() => Math.random() - 0.5);
    
    for (const [dx, dy] of dirs) {
      const nx = x + dx, ny = y + dy;
      if (nx > 0 && nx < w && ny > 0 && ny < h && maze[ny][nx] === 1) {
        maze[y + dy / 2][x + dx / 2] = 0;
        carve(nx, ny);
      }
    }
  }
  
  carve(1, 1);
  return maze;
}

// Agent with A* pathfinding
class Agent {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  path: [number, number][] = [];
  color: string;
  speed: number;
  cols: number;
  rows: number;

  constructor(x: number, y: number, color: string, cols: number, rows: number, fast: boolean) {
    this.x = x;
    this.y = y;
    this.targetX = x;
    this.targetY = y;
    this.color = color;
    this.speed = fast ? 3 : 1.5;
    this.cols = cols;
    this.rows = rows;
  }

  update(maze: number[][], cellW: number, cellH: number) {
    if (this.path.length === 0) {
      this.findNewTarget(maze);
    }

    if (this.path.length > 0) {
      const [nextX, nextY] = this.path[0];
      const dx = nextX - this.x;
      const dy = nextY - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 0.1) {
        this.x = nextX;
        this.y = nextY;
        this.path.shift();
      } else {
        this.x += (dx / dist) * this.speed * 0.016;
        this.y += (dy / dist) * this.speed * 0.016;
      }
    }
  }

  findNewTarget(maze: number[][]) {
    const validCells: [number, number][] = [];
    for (let y = 0; y < maze.length; y++) {
      for (let x = 0; x < maze[y].length; x++) {
        if (maze[y][x] === 0) validCells.push([x, y]);
      }
    }
    if (validCells.length === 0) return;
    
    const [tx, ty] = validCells[Math.floor(Math.random() * validCells.length)];
    this.path = this.aStar(maze, Math.floor(this.x), Math.floor(this.y), tx, ty);
  }

  aStar(maze: number[][], sx: number, sy: number, ex: number, ey: number): [number, number][] {
    const open: any[] = [{ x: sx, y: sy, g: 0, h: Math.abs(ex - sx) + Math.abs(ey - sy), parent: null }];
    const closed = new Set<string>();

    while (open.length > 0) {
      open.sort((a, b) => (a.g + a.h) - (b.g + b.h));
      const curr = open.shift()!;
      
      if (curr.x === ex && curr.y === ey) {
        const path: [number, number][] = [];
        let node = curr;
        while (node) {
          path.unshift([node.x, node.y]);
          node = node.parent;
        }
        return path;
      }

      closed.add(`${curr.x},${curr.y}`);

      for (const [dx, dy] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) {
        const nx = curr.x + dx, ny = curr.y + dy;
        if (nx < 0 || nx >= maze[0].length || ny < 0 || ny >= maze.length) continue;
        if (maze[ny][nx] === 1 || closed.has(`${nx},${ny}`)) continue;

        const g = curr.g + 1;
        const h = Math.abs(ex - nx) + Math.abs(ey - ny);
        const existing = open.find(n => n.x === nx && n.y === ny);

        if (!existing) {
          open.push({ x: nx, y: ny, g, h, parent: curr });
        } else if (g < existing.g) {
          existing.g = g;
          existing.parent = curr;
        }
      }
    }
    return [];
  }

  draw(ctx: CanvasRenderingContext2D, cellW: number, cellH: number) {
    ctx.fillStyle = this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(this.x * cellW + cellW / 2, this.y * cellH + cellH / 2, Math.min(cellW, cellH) * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}
