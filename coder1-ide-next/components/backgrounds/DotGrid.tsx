'use client';
import { useRef, useEffect, useCallback, useMemo } from 'react';
import { gsap } from 'gsap';
import { InertiaPlugin } from 'gsap/InertiaPlugin';

gsap.registerPlugin(InertiaPlugin);

// Throttle helper
function throttle<T extends (...args: unknown[]) => void>(
  func: T,
  limit: number
): T {
  let inThrottle: boolean;
  return ((...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  }) as T;
}

// Convert hex to RGB
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

interface DotGridProps {
  dotSize?: number;
  gap?: number;
  baseColor?: string;
  activeColor?: string;
  proximity?: number;
  speedTrigger?: number;
  shockRadius?: number;
  shockStrength?: number;
  maxSpeed?: number;
  resistance?: number;
  returnDuration?: number;
  edgeFade?: number; // Distance from edge where dots start fading (0-1 as percentage)
  vignette?: boolean; // Enable center vignette effect
  vignetteIntensity?: number; // Vignette darkness (0-1)
  staticMode?: boolean; // Render once without animation loop
  className?: string;
  style?: React.CSSProperties;
}

interface Dot {
  baseX: number;
  baseY: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: { r: number; g: number; b: number };
  isReturning: boolean;
}

const DotGrid = ({
  dotSize = 16,
  gap = 32,
  baseColor = '#5227FF',
  activeColor = '#5227FF',
  proximity = 150,
  speedTrigger = 100,
  shockRadius = 250,
  shockStrength = 5,
  maxSpeed = 5000,
  resistance = 750,
  returnDuration = 1.5,
  edgeFade = 0.25, // 25% from edges by default
  vignette = false,
  vignetteIntensity = 0.7,
  staticMode = false, // Render once without animation
  className = '',
  style,
}: DotGridProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dotsRef = useRef<Dot[]>([]);
  const mouseRef = useRef({ x: 0, y: 0, prevX: 0, prevY: 0 });
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  const baseRgb = useMemo(() => hexToRgb(baseColor) || { r: 82, g: 39, b: 255 }, [baseColor]);
  const activeRgb = useMemo(() => hexToRgb(activeColor) || { r: 82, g: 39, b: 255 }, [activeColor]);

  const initDots = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const cols = Math.ceil(canvas.width / gap);
    const rows = Math.ceil(canvas.height / gap);
    const dots: Dot[] = [];

    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        dots.push({
          baseX: i * gap + gap / 2,
          baseY: j * gap + gap / 2,
          x: i * gap + gap / 2,
          y: j * gap + gap / 2,
          vx: 0,
          vy: 0,
          color: { ...baseRgb },
          isReturning: false,
        });
      }
    }

    dotsRef.current = dots;
  }, [gap, baseRgb]);

  const applyShockwave = useCallback(
    (centerX: number, centerY: number, speed: number) => {
      const dots = dotsRef.current;
      const normalizedSpeed = Math.min(speed / maxSpeed, 1);
      const dynamicRadius = shockRadius * (1 + normalizedSpeed);
      const dynamicStrength = shockStrength * (1 + normalizedSpeed * 2);

      dots.forEach((dot) => {
        const dx = dot.x - centerX;
        const dy = dot.y - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < dynamicRadius && distance > 0) {
          const force = (1 - distance / dynamicRadius) * dynamicStrength;
          const angle = Math.atan2(dy, dx);

          gsap.killTweensOf(dot);
          dot.isReturning = false;

          dot.vx = Math.cos(angle) * force * 100;
          dot.vy = Math.sin(angle) * force * 100;

          gsap.to(dot, {
            inertia: {
              vx: { velocity: dot.vx, resistance },
              vy: { velocity: dot.vy, resistance },
            },
            onComplete: () => {
              dot.isReturning = true;
              gsap.to(dot, {
                x: dot.baseX,
                y: dot.baseY,
                duration: returnDuration,
                ease: 'elastic.out(1, 0.3)',
                onComplete: () => {
                  dot.isReturning = false;
                },
              });
            },
          });
        }
      });
    },
    [shockRadius, shockStrength, maxSpeed, resistance, returnDuration]
  );

  const handleMouseMove = useMemo(
    () =>
      throttle((e: MouseEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        mouseRef.current.prevX = mouseRef.current.x;
        mouseRef.current.prevY = mouseRef.current.y;
        mouseRef.current.x = x;
        mouseRef.current.y = y;

        const dx = x - mouseRef.current.prevX;
        const dy = y - mouseRef.current.prevY;
        const speed = Math.sqrt(dx * dx + dy * dy);

        if (speed > speedTrigger) {
          applyShockwave(x, y, speed);
        }
      }, 16),
    [speedTrigger, applyShockwave]
  );

  const handleClick = useCallback(
    (e: MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      applyShockwave(x, y, maxSpeed * 0.5);
    },
    [applyShockwave, maxSpeed]
  );

  const animate = useCallback(
    (time: number) => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;

      const deltaTime = (time - lastTimeRef.current) / 1000;
      lastTimeRef.current = time;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const { x: mouseX, y: mouseY } = mouseRef.current;
      const { width, height } = canvas;
      const centerX = width / 2;
      const centerY = height / 2;
      const maxDistFromCenter = Math.sqrt(centerX * centerX + centerY * centerY);

      dotsRef.current.forEach((dot) => {
        const dx = mouseX - dot.x;
        const dy = mouseY - dot.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Color interpolation based on proximity
        let t = 0;
        if (distance < proximity) {
          t = 1 - distance / proximity;
        }

        dot.color.r = Math.round(baseRgb.r + (activeRgb.r - baseRgb.r) * t);
        dot.color.g = Math.round(baseRgb.g + (activeRgb.g - baseRgb.g) * t);
        dot.color.b = Math.round(baseRgb.b + (activeRgb.b - baseRgb.b) * t);

        // Calculate edge fade opacity
        let edgeOpacity = 1;
        if (edgeFade > 0) {
          const fadeDistance = Math.min(width, height) * edgeFade;

          // Distance from each edge
          const distFromLeft = dot.x;
          const distFromRight = width - dot.x;
          const distFromTop = dot.y;
          const distFromBottom = height - dot.y;

          // Find minimum distance to any edge
          const minDistFromEdge = Math.min(distFromLeft, distFromRight, distFromTop, distFromBottom);

          // Calculate opacity based on edge distance
          if (minDistFromEdge < fadeDistance) {
            edgeOpacity = minDistFromEdge / fadeDistance;
          }
        }

        // Calculate vignette opacity (distance from center)
        let vignetteOpacity = 1;
        if (vignette) {
          const distFromCenterX = dot.x - centerX;
          const distFromCenterY = dot.y - centerY;
          const distFromCenter = Math.sqrt(distFromCenterX * distFromCenterX + distFromCenterY * distFromCenterY);
          const normalizedDist = distFromCenter / maxDistFromCenter;

          // Smoothly reduce opacity from center to edges
          vignetteOpacity = 1 - (normalizedDist * vignetteIntensity);
          vignetteOpacity = Math.max(0, vignetteOpacity);
        }

        // Combine both opacity effects
        const finalOpacity = edgeOpacity * vignetteOpacity;

        // Draw dot with combined opacity
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, dotSize / 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${dot.color.r}, ${dot.color.g}, ${dot.color.b}, ${finalOpacity})`;
        ctx.fill();
      });

      rafRef.current = requestAnimationFrame(animate);
    },
    [baseRgb, activeRgb, proximity, dotSize, edgeFade, vignette, vignetteIntensity]
  );

  // Static render function - draws dots once without animation
  const renderStatic = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const { width, height } = canvas;
    const centerX = width / 2;
    const centerY = height / 2;
    const maxDistFromCenter = Math.sqrt(centerX * centerX + centerY * centerY);

    dotsRef.current.forEach((dot) => {
      let edgeOpacity = 1;
      if (edgeFade > 0) {
        const fadeDistance = Math.min(width, height) * edgeFade;
        const distFromLeft = dot.x;
        const distFromRight = width - dot.x;
        const distFromTop = dot.y;
        const distFromBottom = height - dot.y;
        const minDistFromEdge = Math.min(distFromLeft, distFromRight, distFromTop, distFromBottom);
        if (minDistFromEdge < fadeDistance) {
          edgeOpacity = minDistFromEdge / fadeDistance;
        }
      }

      let vignetteOpacity = 1;
      if (vignette) {
        const distFromCenterX = dot.x - centerX;
        const distFromCenterY = dot.y - centerY;
        const distFromCenter = Math.sqrt(distFromCenterX * distFromCenterX + distFromCenterY * distFromCenterY);
        const normalizedDist = distFromCenter / maxDistFromCenter;
        vignetteOpacity = 1 - (normalizedDist * vignetteIntensity);
        vignetteOpacity = Math.max(0, vignetteOpacity);
      }

      const finalOpacity = edgeOpacity * vignetteOpacity;

      ctx.beginPath();
      ctx.arc(dot.x, dot.y, dotSize / 2, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${baseRgb.r}, ${baseRgb.g}, ${baseRgb.b}, ${finalOpacity})`;
      ctx.fill();
    });
  }, [baseRgb, dotSize, edgeFade, vignette, vignetteIntensity]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resizeCanvas = () => {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      initDots();
      if (staticMode) {
        // For static mode, just render once after dots are initialized
        setTimeout(renderStatic, 0);
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    if (staticMode) {
      // Static mode: no event listeners, no animation loop
      return () => {
        window.removeEventListener('resize', resizeCanvas);
      };
    }

    // Interactive mode: add event listeners and start animation
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('click', handleClick);

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('click', handleClick);
      cancelAnimationFrame(rafRef.current);
    };
  }, [initDots, handleMouseMove, handleClick, animate, staticMode, renderStatic]);

  return (
    <div
      ref={containerRef}
      className={`dot-grid ${className}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        width: '100%',
        position: 'relative',
        ...style,
      }}
    >
      <div
        className="dot-grid__wrap"
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
        }}
      >
        <canvas
          ref={canvasRef}
          className="dot-grid__canvas"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
          }}
        />
      </div>
    </div>
  );
};

export default DotGrid;
