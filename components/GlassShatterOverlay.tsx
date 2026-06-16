'use client';

import { useEffect, useRef } from 'react';

const SVG_NS = 'http://www.w3.org/2000/svg';

const CONFIG = {
  color: {
    crack: { l: 0.98, c: 0.01, h: 220, a: 0.95 },
    crackShadow: { l: 0.0, c: 0.0, h: 0, a: 0.2 },
    crackBranch: { l: 0.95, c: 0.01, h: 220, a: 0.4 },
    ring: { l: 0.97, c: 0.01, h: 210, a: 0.5 },
    dust: { l: 1.0, c: 0.0, h: 0, a: 0.9 },
    shardDark: { l: 0.12, c: 0.02, h: 220, aMin: 0.08, aMax: 0.3 },
    shardLight: { l: 0.94, c: 0.01, h: 210, aMin: 0.08, aMax: 0.2 },
    shardEdge: { l: 1.0, c: 0.0, h: 0, aMin: 0.1, aMax: 0.4 },
    pit: { l: 0, c: 0, h: 240, a: 0.96 },
    flash: { l: 1.0, c: 0.0, h: 0, a: 1.0 },
    particle: { l: 1.0, c: 0.0, h: 0, aMin: 0.7, aMax: 1.0 },
    particleShadow: 'oklch(0% 0 0 / 0.35)'
  },
  crack: {
    rayCountMin: 4, rayCountMax: 12,
    maxRadiusMin: 30, maxRadiusMax: 60,
    rayLengthMin: 0.55, segmentMin: 8, segmentMax: 24,
    driftBase: 0.12, driftGrowth: 0.22, strokeMin: 0.3, strokeMax: 0.8,
    shadowOffset: [0.5, 1], shadowStroke: 1.0,
    branchProbability: 0.35, branchAngleMin: 0.3, branchAngleMax: 1.2,
    branchLenMin: 6, branchLenMax: 16, branchStroke: 0.15
  },
  ring: {
    countMin: 2, countMax: 4,
    radiusBase: 8, radiusStepMin: 12, radiusStepMax: 20,
    wobbleRange: 6, skipProbability: 0.3, stroke: 0.4
  },
  shard: {
    midRadiusMin: 16, midRadiusMax: 48, midJitter: 6,
    darkThreshold: 0.35, stagger: 0.015
  },
  dust: {
    count: 8, radius: 10,
    lenMin: 1, lenMax: 6, strokeMin: 0.15, strokeMax: 0.6
  },
  particle: {
    countMin: 8, countMax: 15, widthMin: 1, widthMax: 2, heightMin: 2, heightMax: 4,
    forceMin: 20, forceMax: 80, liftOffset: 20, gravityMin: 80, gravityMax: 150,
    rotateMax: 360, durationMin: 400, durationMax: 800
  },
  impact: { pitRadius: 3, flashRadius: 4, flashDuration: 0.1 },
  shake: { intensity: 2, duration: 100 }
};

const MathUtils = {
  rand: (min: number, max: number) => min + Math.random() * (max - min),
  randInt: (min: number, max: number) => Math.floor(MathUtils.rand(min, max + 1)),
  polylineLength: (points: number[][]) =>
    points.slice(1).reduce((total, p, i) => {
      const [x, y] = points[i];
      return total + Math.hypot(p[0] - x, p[1] - y);
    }, 0),
  pointsToPath: (points: number[][]) =>
    points.map(([x, y], i) => `${i ? 'L' : 'M'}${x},${y}`).join(' '),
  buildAngles: (count: number) =>
    Array.from(
      { length: count },
      (_, i) => ((Math.PI * 2) / count) * i + MathUtils.rand(-0.5, 0.5)
    ).sort((a, b) => a - b)
};

const ColorUtils = {
  oklch: ({ l, c, h, a = 1 }: { l: number; c: number; h: number; a?: number }) =>
    `oklch(${(l * 100).toFixed(1)}% ${c.toFixed(3)} ${h} / ${a})`,
  oklchRandA: ({ l, c, h, aMin, aMax }: { l: number; c: number; h: number; aMin: number; aMax: number }) =>
    ColorUtils.oklch({ l, c, h, a: MathUtils.rand(aMin, aMax) })
};

const SvgUtils = {
  create: (tag: string, attrs: Record<string, any> = {}) => {
    const el = document.createElementNS(SVG_NS, tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
    return el;
  },
  group: (attrs: Record<string, any> = {}) => SvgUtils.create('g', attrs)
};

class GlassShatterEngine {
  private svg: SVGSVGElement;
  private layers: Record<string, SVGGElement>;
  private currentStressId: string | null = null;
  private activeTileSvgs: Set<SVGSVGElement> = new Set();
  private isHealing: boolean = false;

  constructor(svg: SVGSVGElement) {
    this.svg = svg;

    this.layers = {
      shadow: this.svg.querySelector('#shadow-layer') as SVGGElement,
      shard: this.svg.querySelector('#shard-layer') as SVGGElement,
      ring: this.svg.querySelector('#ring-layer') as SVGGElement,
      crack: this.svg.querySelector('#crack-layer') as SVGGElement,
      dust: this.svg.querySelector('#dust-layer') as SVGGElement,
      stress: this.svg.querySelector('#stress-layer') as SVGGElement,
      bloom: this.svg.querySelector('#bloom-layer') as SVGGElement,
      impact: this.svg.querySelector('#impact-layer') as SVGGElement
    };

    const layerOrder = ['shadow', 'shard', 'ring', 'crack', 'dust', 'stress', 'bloom', 'impact'];

    layerOrder.forEach(name => {
      if (!this.layers[name]) {
        this.layers[name] = SvgUtils.group({ id: `${name}-layer` }) as SVGGElement;
      }
      this.svg.appendChild(this.layers[name]);
    });
  }

  async handleImpact(clientX: number, clientY: number, tileElement: HTMLElement) {
    // Heal all existing shatters before creating new one
    if (this.activeTileSvgs.size > 0) {
      await this.healAllShatters();
    }
    
    const rect = tileElement.getBoundingClientRect();
    const localX = clientX - rect.left;
    const localY = clientY - rect.top;

    // Create a tile-specific SVG overlay
    const tileSvg = this.createTileSvg(tileElement);
    this.activeTileSvgs.add(tileSvg);
    
    // Use local coordinates within the tile
    this.addCrack(localX, localY, tileSvg);
    this.spawnParticles(clientX, clientY, rect);
    this.shakeElement(tileElement);
    this.playSound();
    
    // Auto-remove tile SVG after animation completes
    setTimeout(() => {
      this.activeTileSvgs.delete(tileSvg);
      tileSvg.remove();
    }, 5000);
  }

  private async healAllShatters(): Promise<void> {
    if (this.isHealing || this.activeTileSvgs.size === 0) return;
    
    this.isHealing = true;
    const healPromises: Promise<void>[] = [];
    
    this.activeTileSvgs.forEach(tileSvg => {
      const promise = this.healShatter(tileSvg);
      healPromises.push(promise);
    });
    
    await Promise.all(healPromises);
    this.activeTileSvgs.clear();
    this.isHealing = false;
  }

  private healShatter(tileSvg: SVGSVGElement): Promise<void> {
    return new Promise((resolve) => {
      // Play healing sound
      this.playHealSound();
      
      // Get all layers
      const layers = [
        tileSvg.querySelector('#crack-layer'),
        tileSvg.querySelector('#shard-layer'),
        tileSvg.querySelector('#ring-layer'),
        tileSvg.querySelector('#dust-layer'),
        tileSvg.querySelector('#shadow-layer'),
        tileSvg.querySelector('#bloom-layer'),
        tileSvg.querySelector('#impact-layer')
      ].filter(Boolean) as SVGGElement[];
      
      // Reverse animation: fade out and scale down
      layers.forEach((layer, index) => {
        const elements = Array.from(layer.children) as SVGElement[];
        
        elements.forEach((el, elIndex) => {
          const delay = index * 20 + elIndex * 5;
          
          // Animate opacity and transform
          el.style.transition = `opacity 200ms ease-out ${delay}ms, transform 200ms ease-out ${delay}ms`;
          el.style.opacity = '0';
          el.style.transform = 'scale(0.8)';
        });
      });
      
      // Add healing glow effect
      const healGlow = document.createElementNS(SVG_NS, 'circle');
      const rect = tileSvg.getBoundingClientRect();
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      
      healGlow.setAttribute('cx', String(cx));
      healGlow.setAttribute('cy', String(cy));
      healGlow.setAttribute('r', '5');
      healGlow.setAttribute('fill', 'oklch(85% 0.15 140 / 0.8)');
      healGlow.setAttribute('filter', 'url(#glassBloom)');
      
      const bloomLayer = tileSvg.querySelector('#bloom-layer');
      if (bloomLayer) {
        bloomLayer.appendChild(healGlow);
        
        // Animate healing glow expansion
        healGlow.animate(
          [
            { r: '5', opacity: '0.8' },
            { r: String(Math.max(rect.width, rect.height)), opacity: '0' }
          ],
          {
            duration: 300,
            easing: 'ease-out',
            fill: 'forwards'
          }
        );
      }
      
      // Remove SVG after healing animation
      setTimeout(() => {
        tileSvg.remove();
        resolve();
      }, 400);
    });
  }

  private playHealSound() {
    // Reverse glass sound - healing chime
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const masterGain = audioContext.createGain();
      masterGain.connect(audioContext.destination);
      masterGain.gain.setValueAtTime(0.2, audioContext.currentTime);

      const now = audioContext.currentTime;

      // Ascending chime (opposite of breaking)
      const heal = audioContext.createOscillator();
      const healGain = audioContext.createGain();
      const healFilter = audioContext.createBiquadFilter();
      
      healFilter.type = 'bandpass';
      healFilter.frequency.setValueAtTime(800, now);
      healFilter.Q.setValueAtTime(10, now);
      
      heal.type = 'sine';
      heal.frequency.setValueAtTime(800, now);
      heal.frequency.exponentialRampToValueAtTime(1600, now + 0.15);
      
      healGain.gain.setValueAtTime(0, now);
      healGain.gain.linearRampToValueAtTime(0.3, now + 0.02);
      healGain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      
      heal.connect(healFilter);
      healFilter.connect(healGain);
      healGain.connect(masterGain);
      
      heal.start(now);
      heal.stop(now + 0.15);

      // Soft shimmer
      const shimmer = audioContext.createOscillator();
      const shimmerGain = audioContext.createGain();
      
      shimmer.type = 'sine';
      shimmer.frequency.setValueAtTime(2400, now + 0.05);
      
      shimmerGain.gain.setValueAtTime(0, now + 0.05);
      shimmerGain.gain.linearRampToValueAtTime(0.15, now + 0.08);
      shimmerGain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
      
      shimmer.connect(shimmerGain);
      shimmerGain.connect(masterGain);
      
      shimmer.start(now + 0.05);
      shimmer.stop(now + 0.2);

    } catch (e) {
      // Silently fail
    }
  }

  private createTileSvg(tileElement: HTMLElement): SVGSVGElement {
    const rect = tileElement.getBoundingClientRect();
    
    // Create SVG that exactly matches tile dimensions
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('class', 'absolute inset-0 w-full h-full pointer-events-none overflow-hidden');
    svg.setAttribute('style', 'z-index: 10;');
    
    // Clone defs from main SVG
    const mainDefs = this.svg.querySelector('defs');
    if (mainDefs) {
      svg.appendChild(mainDefs.cloneNode(true));
    }
    
    // Create layers
    const layerOrder = ['shadow', 'shard', 'ring', 'crack', 'dust', 'stress', 'bloom', 'impact'];
    layerOrder.forEach(name => {
      const layer = SvgUtils.group({ id: `${name}-layer` }) as SVGGElement;
      svg.appendChild(layer);
    });
    
    // Add to tile (make tile position relative if not already)
    const position = window.getComputedStyle(tileElement).position;
    if (position === 'static') {
      tileElement.style.position = 'relative';
    }
    tileElement.appendChild(svg);
    
    return svg;
  }

  private playSound() {
    // Ultra-realistic glass shatter sound with multiple layers
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const masterGain = audioContext.createGain();
      masterGain.connect(audioContext.destination);
      masterGain.gain.setValueAtTime(0.4, audioContext.currentTime);

      const now = audioContext.currentTime;

      // Layer 1: Initial impact crack (high-pitched metallic)
      const impact = audioContext.createOscillator();
      const impactGain = audioContext.createGain();
      const impactFilter = audioContext.createBiquadFilter();
      
      impactFilter.type = 'bandpass';
      impactFilter.frequency.setValueAtTime(3200, now);
      impactFilter.Q.setValueAtTime(8, now);
      
      impact.type = 'square';
      impact.frequency.setValueAtTime(3200, now);
      impact.frequency.exponentialRampToValueAtTime(1800, now + 0.02);
      
      impactGain.gain.setValueAtTime(0.6, now);
      impactGain.gain.exponentialRampToValueAtTime(0.01, now + 0.02);
      
      impact.connect(impactFilter);
      impactFilter.connect(impactGain);
      impactGain.connect(masterGain);
      
      impact.start(now);
      impact.stop(now + 0.02);

      // Layer 2: Main shatter (cascading high frequencies)
      const shatter = audioContext.createOscillator();
      const shatterGain = audioContext.createGain();
      const shatterFilter = audioContext.createBiquadFilter();
      
      shatterFilter.type = 'highpass';
      shatterFilter.frequency.setValueAtTime(2000, now);
      
      shatter.type = 'sawtooth';
      shatter.frequency.setValueAtTime(2400, now + 0.01);
      shatter.frequency.exponentialRampToValueAtTime(800, now + 0.15);
      
      shatterGain.gain.setValueAtTime(0, now + 0.01);
      shatterGain.gain.linearRampToValueAtTime(0.5, now + 0.02);
      shatterGain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      
      shatter.connect(shatterFilter);
      shatterFilter.connect(shatterGain);
      shatterGain.connect(masterGain);
      
      shatter.start(now + 0.01);
      shatter.stop(now + 0.15);

      // Layer 3: Glass fragments falling (mid-range tinkles)
      for (let i = 0; i < 5; i++) {
        const tinkle = audioContext.createOscillator();
        const tinkleGain = audioContext.createGain();
        const tinkleFilter = audioContext.createBiquadFilter();
        
        tinkleFilter.type = 'bandpass';
        tinkleFilter.frequency.setValueAtTime(1200 + i * 200, now);
        tinkleFilter.Q.setValueAtTime(12, now);
        
        tinkle.type = 'sine';
        const startTime = now + 0.03 + i * 0.015;
        const freq = 1200 + Math.random() * 800;
        tinkle.frequency.setValueAtTime(freq, startTime);
        tinkle.frequency.exponentialRampToValueAtTime(freq * 0.7, startTime + 0.08);
        
        tinkleGain.gain.setValueAtTime(0, startTime);
        tinkleGain.gain.linearRampToValueAtTime(0.15, startTime + 0.005);
        tinkleGain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.08);
        
        tinkle.connect(tinkleFilter);
        tinkleFilter.connect(tinkleGain);
        tinkleGain.connect(masterGain);
        
        tinkle.start(startTime);
        tinkle.stop(startTime + 0.08);
      }

      // Layer 4: Low-end rumble (structural stress)
      const rumble = audioContext.createOscillator();
      const rumbleGain = audioContext.createGain();
      const rumbleFilter = audioContext.createBiquadFilter();
      
      rumbleFilter.type = 'lowpass';
      rumbleFilter.frequency.setValueAtTime(200, now);
      
      rumble.type = 'triangle';
      rumble.frequency.setValueAtTime(80, now);
      rumble.frequency.exponentialRampToValueAtTime(40, now + 0.2);
      
      rumbleGain.gain.setValueAtTime(0.3, now);
      rumbleGain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
      
      rumble.connect(rumbleFilter);
      rumbleFilter.connect(rumbleGain);
      rumbleGain.connect(masterGain);
      
      rumble.start(now);
      rumble.stop(now + 0.2);

      // Layer 5: White noise burst (realistic texture)
      const bufferSize = audioContext.sampleRate * 0.15;
      const noiseBuffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
      const noiseData = noiseBuffer.getChannelData(0);
      
      for (let i = 0; i < bufferSize; i++) {
        noiseData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
      }
      
      const noise = audioContext.createBufferSource();
      const noiseGain = audioContext.createGain();
      const noiseFilter = audioContext.createBiquadFilter();
      
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.setValueAtTime(2500, now);
      noiseFilter.Q.setValueAtTime(2, now);
      
      noise.buffer = noiseBuffer;
      noiseGain.gain.setValueAtTime(0.25, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      
      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(masterGain);
      
      noise.start(now);

      // Layer 6: Resonant ring (glass harmonic)
      const ring = audioContext.createOscillator();
      const ringGain = audioContext.createGain();
      const ringFilter = audioContext.createBiquadFilter();
      
      ringFilter.type = 'bandpass';
      ringFilter.frequency.setValueAtTime(1800, now);
      ringFilter.Q.setValueAtTime(20, now);
      
      ring.type = 'sine';
      ring.frequency.setValueAtTime(1800, now + 0.02);
      
      ringGain.gain.setValueAtTime(0, now + 0.02);
      ringGain.gain.linearRampToValueAtTime(0.2, now + 0.04);
      ringGain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      
      ring.connect(ringFilter);
      ringFilter.connect(ringGain);
      ringGain.connect(masterGain);
      
      ring.start(now + 0.02);
      ring.stop(now + 0.3);

    } catch (e) {
      // Silently fail if Web Audio API is not available
    }
  }

  private buildRay(cx: number, cy: number, baseAngle: number, totalLength: number): number[][] {
    const { segmentMin, segmentMax, driftBase, driftGrowth } = CONFIG.crack;
    const points: number[][] = [[cx, cy]];
    let x = cx, y = cy, angle = baseAngle, remaining = totalLength;

    while (remaining > 4) {
      const seg = Math.min(remaining, MathUtils.rand(segmentMin, segmentMax));
      const drift = driftBase + (1 - remaining / totalLength) * driftGrowth;
      angle += MathUtils.rand(-drift, drift);

      x += Math.cos(angle) * seg;
      y += Math.sin(angle) * seg;
      points.push([x, y]);
      remaining -= seg;
    }
    return points;
  }

  private addCrack(cx: number, cy: number, tileSvg: SVGSVGElement) {
    const { crack, impact, color } = CONFIG;
    this.currentStressId = `stress-${Date.now()}`;
    const defs = tileSvg.querySelector('defs') || tileSvg.appendChild(SvgUtils.create('defs'));

    const filter = SvgUtils.create('filter', {
      id: this.currentStressId,
      x: '-200%', y: '-200%',
      width: '500%', height: '500%'
    });

    filter.append(
      SvgUtils.create('feTurbulence', {
        type: 'fractalNoise', baseFrequency: '0.02',
        numOctaves: '2', result: 'noise'
      }),
      SvgUtils.create('feDisplacementMap', {
        in: 'SourceGraphic', in2: 'noise', scale: '5',
        xChannelSelector: 'R', yChannelSelector: 'G'
      })
    );
    defs.appendChild(filter);

    const count = MathUtils.randInt(crack.rayCountMin, crack.rayCountMax);
    const maxR = MathUtils.rand(crack.maxRadiusMin, crack.maxRadiusMax);
    const angles = MathUtils.buildAngles(count);
    const rays = angles.map((a) =>
      this.buildRay(cx, cy, a, maxR * MathUtils.rand(crack.rayLengthMin, 1))
    );

    const crackElements = this.buildCrackLayer(rays, angles);

    // Get layers from tile SVG
    const layers = {
      shadow: tileSvg.querySelector('#shadow-layer') as SVGGElement,
      shard: tileSvg.querySelector('#shard-layer') as SVGGElement,
      ring: tileSvg.querySelector('#ring-layer') as SVGGElement,
      crack: tileSvg.querySelector('#crack-layer') as SVGGElement,
      dust: tileSvg.querySelector('#dust-layer') as SVGGElement,
      impact: tileSvg.querySelector('#impact-layer') as SVGGElement,
      bloom: tileSvg.querySelector('#bloom-layer') as SVGGElement
    };

    layers.shard?.appendChild(this.buildShardLayer(cx, cy, rays, angles));
    layers.shadow?.appendChild(crackElements.shadowGroup);

    layers.crack?.append(
      crackElements.glowGroup,
      crackElements.crackGroup,
      crackElements.branchGroup
    );

    layers.ring?.appendChild(this.buildRingLayer(cx, cy, angles, count));
    layers.dust?.appendChild(this.buildDustLayer(cx, cy));

    const pit = SvgUtils.create('circle', {
      cx, cy, r: impact.pitRadius,
      fill: ColorUtils.oklch(color.pit)
    });

    layers.impact?.appendChild(pit);

    const flash = SvgUtils.create('circle', {
      cx, cy, r: impact.flashRadius,
      fill: ColorUtils.oklch(color.flash),
      filter: 'url(#glassBloom)'
    });
    (flash as SVGElement).style.animation = `flashOut ${impact.flashDuration}s ease-out forwards`;
    layers.bloom?.appendChild(flash);
  }

  private buildShardLayer(cx: number, cy: number, rays: number[][][], angles: number[]): SVGGElement {
    const { shard, color } = CONFIG;
    const g = SvgUtils.group() as SVGGElement;

    rays.forEach((ray, i) => {
      const next = rays[(i + 1) % rays.length];
      const nextAngle = angles[(i + 1) % angles.length];
      const midAngle = angles[i] + (nextAngle - angles[i]) / 2;
      const midRadius = MathUtils.rand(shard.midRadiusMin, shard.midRadiusMax);

      const pts = [
        [cx, cy],
        ...ray.slice(1, 1 + MathUtils.randInt(2, 4)),
        [
          cx + Math.cos(midAngle) * midRadius + MathUtils.rand(-shard.midJitter, shard.midJitter),
          cy + Math.sin(midAngle) * midRadius + MathUtils.rand(-shard.midJitter, shard.midJitter)
        ],
        ...next.slice(1, 1 + MathUtils.randInt(2, 4)).toReversed()
      ];

      const fill = Math.random() > shard.darkThreshold
        ? ColorUtils.oklchRandA(color.shardDark)
        : ColorUtils.oklchRandA(color.shardLight);

      const shardEl = SvgUtils.create('path', {
        d: `${MathUtils.pointsToPath(pts)} Z`,
        fill,
        stroke: ColorUtils.oklchRandA(color.shardEdge),
        'stroke-width': '0.3',
        filter: this.currentStressId ? `url(#${this.currentStressId})` : 'url(#glassRefraction)'
      }) as SVGPathElement;

      shardEl.style.cssText = `opacity: 0; animation: fadeInShard 0.1s ${0.01 + i * shard.stagger}s ease forwards;`;
      g.appendChild(shardEl);
    });

    return g;
  }

  private buildCrackLayer(rays: number[][][], angles: number[]): {
    shadowGroup: SVGGElement;
    crackGroup: SVGGElement;
    glowGroup: SVGGElement;
    branchGroup: SVGGElement;
  } {
    const { crack, color } = CONFIG;
    const groups = {
      shadowGroup: SvgUtils.group() as SVGGElement,
      crackGroup: SvgUtils.group() as SVGGElement,
      glowGroup: SvgUtils.group({ filter: 'url(#glassBloom)', opacity: 0.7 }) as SVGGElement,
      branchGroup: SvgUtils.group() as SVGGElement
    };

    rays.forEach((ray, i) => {
      const len = MathUtils.polylineLength(ray);
      const delay = (i * 0.01).toFixed(3);
      const anim = `drawLine ${0.1 + i * 0.01}s ${delay}s ease-out forwards`;
      const dash = { 'stroke-dasharray': len, 'stroke-dashoffset': len };

      const createPath = (opts: Record<string, any>, animStr: string) => {
        const p = SvgUtils.create('path', {
          d: MathUtils.pointsToPath(ray),
          fill: 'none',
          ...opts,
          ...dash
        }) as SVGPathElement;
        p.style.animation = animStr;
        return p;
      };

      groups.shadowGroup.appendChild(
        createPath(
          {
            stroke: ColorUtils.oklch(color.crackShadow),
            'stroke-width': crack.shadowStroke,
            transform: `translate(${crack.shadowOffset.join(',')})`
          },
          anim
        )
      );

      groups.crackGroup.appendChild(
        createPath(
          {
            stroke: ColorUtils.oklch(color.crack),
            'stroke-width': MathUtils.rand(crack.strokeMin, crack.strokeMax)
          },
          anim
        )
      );

      groups.glowGroup.appendChild(
        createPath(
          {
            stroke: ColorUtils.oklch(color.crack),
            'stroke-width': MathUtils.rand(crack.strokeMin, crack.strokeMax) * 2,
            opacity: 0.25
          },
          anim
        )
      );

      ray.slice(1, -1).forEach((pt) => {
        if (Math.random() > crack.branchProbability) return;

        const angle = angles[i] + (Math.random() > 0.5 ? 1 : -1) *
          MathUtils.rand(crack.branchAngleMin, crack.branchAngleMax);
        const branchRay = this.buildRay(
          pt[0], pt[1], angle,
          MathUtils.rand(crack.branchLenMin, crack.branchLenMax)
        );
        const l = MathUtils.polylineLength(branchRay);

        const b = SvgUtils.create('path', {
          d: MathUtils.pointsToPath(branchRay),
          fill: 'none',
          stroke: ColorUtils.oklch(color.crackBranch),
          'stroke-width': crack.branchStroke,
          'stroke-dasharray': l,
          'stroke-dashoffset': l
        }) as SVGPathElement;

        b.style.animation = `drawLine 0.15s ${MathUtils.rand(0.05, 0.1)}s ease-out forwards`;
        groups.branchGroup.appendChild(b);
      });
    });

    return groups;
  }

  private buildRingLayer(cx: number, cy: number, angles: number[], rayCount: number): SVGGElement {
    const { ring, color } = CONFIG;
    const g = SvgUtils.group() as SVGGElement;
    const rings = MathUtils.randInt(ring.countMin, ring.countMax);

    for (let r = 0; r < rings; r++) {
      const radius = ring.radiusBase + r * MathUtils.rand(ring.radiusStepMin, ring.radiusStepMax);
      const delay = (0.1 + r * 0.03).toFixed(3);

      angles.forEach((a, i) => {
        if (Math.random() > ring.skipProbability) return;

        const na = angles[(i + 1) % rayCount];
        const span = (na - a + Math.PI * 2) % (Math.PI * 2);
        const wr = radius + MathUtils.rand(-ring.wobbleRange, ring.wobbleRange);

        const x1 = cx + Math.cos(a) * radius;
        const y1 = cy + Math.sin(a) * radius;
        const x2 = cx + Math.cos(na) * radius;
        const y2 = cy + Math.sin(na) * radius;

        const arc = SvgUtils.create('path', {
          d: `M${x1},${y1} A${wr},${wr} 0 ${span > Math.PI ? 1 : 0},1 ${x2},${y2}`,
          stroke: ColorUtils.oklch(color.ring),
          'stroke-width': ring.stroke,
          fill: 'none'
        }) as SVGPathElement;

        arc.style.animation = `drawLine 0.12s ${delay}s ease-out forwards`;
        g.appendChild(arc);
      });
    }
    return g;
  }

  private buildDustLayer(cx: number, cy: number): SVGGElement {
    const { dust, color } = CONFIG;
    const g = SvgUtils.group() as SVGGElement;

    for (let i = 0; i < dust.count; i++) {
      const a = MathUtils.rand(0, Math.PI * 2);
      const d = Math.random() * dust.radius;
      const x = cx + Math.cos(a) * d;
      const y = cy + Math.sin(a) * d;
      const len = MathUtils.rand(dust.lenMin, dust.lenMax);

      const dustEl = SvgUtils.create('path', {
        d: `M${x},${y} L${x + Math.cos(a) * len},${y + Math.sin(a) * len}`,
        stroke: ColorUtils.oklch(color.dust),
        'stroke-width': MathUtils.rand(dust.strokeMin, dust.strokeMax),
        fill: 'none'
      }) as SVGPathElement;

      dustEl.style.animation = 'drawLine 0.08s ease-out forwards';
      g.appendChild(dustEl);
    }
    return g;
  }

  private spawnParticles(cx: number, cy: number, tileRect: DOMRect) {
    const { particle, color } = CONFIG;
    const count = MathUtils.randInt(particle.countMin, particle.countMax);

    for (let i = 0; i < count; i++) {
      const el = document.createElement('div');

      Object.assign(el.style, {
        position: 'fixed',
        width: `${MathUtils.rand(particle.widthMin, particle.widthMax)}px`,
        height: `${MathUtils.rand(particle.heightMin, particle.heightMax)}px`,
        background: ColorUtils.oklchRandA(color.particle),
        boxShadow: `0 1px 2px ${color.particleShadow}`,
        left: `${cx}px`,
        top: `${cy}px`,
        pointerEvents: 'none',
        zIndex: '9999',
        borderRadius: Math.random() > 0.5 ? '1px' : '50%'
      });

      document.body.appendChild(el);

      const a = MathUtils.rand(0, Math.PI * 2);
      const f = MathUtils.rand(particle.forceMin, particle.forceMax);
      let vx = Math.cos(a) * f;
      let vy = Math.sin(a) * f - particle.liftOffset;
      
      // Constrain particles to stay within tile bounds
      const finalX = cx + vx;
      const finalY = cy + vy + MathUtils.rand(particle.gravityMin, particle.gravityMax);
      
      // Clamp to tile boundaries
      if (finalX < tileRect.left) vx = tileRect.left - cx;
      if (finalX > tileRect.right) vx = tileRect.right - cx;
      if (finalY < tileRect.top) vy = tileRect.top - cy;
      if (finalY > tileRect.bottom) vy = (tileRect.bottom - cy) - MathUtils.rand(particle.gravityMin, particle.gravityMax);
      
      const rot = MathUtils.rand(-particle.rotateMax, particle.rotateMax);

      el.animate(
        [
          { transform: 'translate(-50%,-50%)', opacity: '1' },
          {
            transform: `translate(${vx * 0.6}px,${vy}px) rotate(${rot * 0.4}deg)`,
            opacity: '1', offset: 0.4
          },
          {
            transform: `translate(${vx}px,${vy + MathUtils.rand(particle.gravityMin, particle.gravityMax)}px) rotate(${rot}deg)`,
            opacity: '0'
          }
        ],
        {
          duration: MathUtils.rand(particle.durationMin, particle.durationMax),
          easing: 'cubic-bezier(0.25,0.8,0.5,1)',
          fill: 'forwards'
        }
      ).onfinish = () => el.remove();
    }
  }

  private shakeElement(element: HTMLElement) {
    const { intensity, duration } = CONFIG.shake;
    if (intensity <= 0) return;

    const coinFlip = Math.random() < 0.5 ? -1 : 1;
    const shake = coinFlip * intensity;

    element.animate(
      [
        { transform: 'translate(0,0)' },
        { transform: `translate(${shake}px,${shake * 0.5}px)` },
        { transform: `translate(${shake}px,${shake}px)` },
        { transform: 'translate(0,0)' }
      ],
      { duration, easing: 'ease-in-out' }
    );
  }

  private clearOldEffects() {
    Object.values(this.layers).forEach((layer) => {
      if (layer && layer.children.length > 50) {
        // Remove oldest effects if too many
        while (layer.children.length > 30) {
          layer.removeChild(layer.children[0]);
        }
      }
    });
  }

  reset() {
    Object.values(this.layers).forEach((layer) => {
      if (layer) layer.replaceChildren();
    });
    this.svg
      .querySelectorAll('filter[id^="stress-"]')
      .forEach((el) => el.remove());
  }
}

export function GlassShatterOverlay() {
  const svgRef = useRef<SVGSVGElement>(null);
  const engineRef = useRef<GlassShatterEngine | null>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    engineRef.current = new GlassShatterEngine(svgRef.current);

    // Add click listener to calendar tiles
    const handleTileClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const tile = target.closest('[data-tour-id="neural-timeline-day"]') as HTMLElement;
      
      if (tile && engineRef.current) {
        engineRef.current.handleImpact(e.clientX, e.clientY, tile);
      }
    };

    document.addEventListener('click', handleTileClick);

    return () => {
      document.removeEventListener('click', handleTileClick);
    };
  }, []);

  return (
    <>
      <svg
        ref={svgRef}
        id="glass-svg"
        className="fixed inset-0 w-full h-full pointer-events-none z-[9998] overflow-visible"
        aria-hidden="true"
      >
        <defs id="defs">
          <linearGradient id="bgGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="oklch(58% 0.28 255)" />
            <stop offset="100%" stopColor="oklch(42% 0.34 295)" />
          </linearGradient>

          <filter id="glassBody" x="-30%" y="-30%" width="160%" height="160%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.055 0.04"
              numOctaves={3}
              seed={2}
              result="noise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale={6}
              xChannelSelector="R"
              yChannelSelector="G"
              result="displaced"
            />
            <feGaussianBlur in="displaced" stdDeviation={8} result="bodyBlur" />
            <feColorMatrix
              in="bodyBlur"
              type="matrix"
              result="tinted"
              values="0.85 0.92 1 0 0.04  0.85 0.92 1 0 0.04  0.9 0.95 1 0 0.08  0 0 0 0.72 0"
            />
            <feComposite in="tinted" in2="SourceGraphic" operator="in" />
          </filter>

          <filter id="glassRefraction" x="-30%" y="-30%" width="160%" height="160%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.02 0.04"
              numOctaves={3}
              seed={5}
              result="noise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale={20}
              xChannelSelector="R"
              yChannelSelector="G"
              result="warped"
            />
            <feColorMatrix
              in="warped"
              type="matrix"
              values="0.85 0 0 0 0.05  0 0.9 0 0 0.1  0 0 1.0 0 0.15  0 0 0 0.9 0"
              result="tinted"
            />
            <feGaussianBlur in="SourceAlpha" stdDeviation={1} result="blur" />
            <feComposite in="SourceAlpha" in2="blur" operator="out" result="edge" />
            <feColorMatrix
              in="edge"
              type="matrix"
              values="1 0 0 0 1  0 1 0 0 1  0 0 1 0 1  0 0 0 0.6 0"
              result="brightEdge"
            />
            <feMerge>
              <feMergeNode in="tinted" />
              <feMergeNode in="brightEdge" />
            </feMerge>
          </filter>

          <filter id="glassBloom" x="-300%" y="-300%" width="700%" height="700%">
            <feGaussianBlur in="SourceGraphic" stdDeviation={14} result="bloom" />
            <feColorMatrix
              in="bloom"
              type="matrix"
              values="0.5 0.75 1 0 0  0.5 0.75 1 0 0  0.6 0.85 1 0 0  0 0 0 0.35 0"
            />
          </filter>
        </defs>
      </svg>

      <style jsx global>{`
        @keyframes drawLine {
          to {
            stroke-dashoffset: 0;
          }
        }

        @keyframes fadeInShard {
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes flashOut {
          to {
            opacity: 0;
            transform: scale(2.5);
          }
        }

        @keyframes healGlow {
          from {
            opacity: 0.8;
            transform: scale(0);
          }
          to {
            opacity: 0;
            transform: scale(3);
          }
        }
      `}</style>
    </>
  );
}
