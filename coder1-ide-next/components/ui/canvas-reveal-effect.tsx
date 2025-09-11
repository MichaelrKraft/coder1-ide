"use client";

import React from "react";
import { cn } from "@/lib/utils";

type Uniforms = {
  [key: string]: {
    value: number[] | number[][] | number;
    type: string;
  };
};

interface ShaderProps {
  source: string;
  uniforms: {
    [key: string]: {
      value: number[] | number[][] | number;
      type: string;
    };
  };
  maxFps?: number;
}

interface CanvasRevealEffectProps {
  animationSpeed?: number;
  opacities?: number[];
  colors?: number[][];
  containerClassName?: string;
  onComplete?: () => void;
  dotSize?: number;
}

// Stubbed component - Three.js temporarily disabled for build fixes
export const CanvasRevealEffect = ({
  animationSpeed = 0.4,
  opacities = [0.3, 0.3, 0.3, 0.5, 0.5, 0.5, 0.8, 0.8, 0.8, 1],
  colors = [[0, 255, 255]],
  containerClassName,
  onComplete,
  dotSize,
}: CanvasRevealEffectProps) => {
  return (
    <div className={cn("absolute inset-0 h-full w-full bg-gradient-to-br from-bg-secondary to-bg-tertiary", containerClassName)}>
      <div className="flex items-center justify-center h-full text-text-muted text-sm">
        Canvas Reveal Effect (Temporarily Disabled)
      </div>
    </div>
  );
};

const Shader: React.FC<ShaderProps> = ({ source, uniforms, maxFps = 60 }) => {
  return (
    <div className="absolute inset-0 h-full w-full bg-gradient-to-br from-bg-secondary to-bg-tertiary">
      <div className="flex items-center justify-center h-full text-text-muted text-sm">
        Canvas Effect (Temporarily Disabled)
      </div>
    </div>
  );
};

export { Shader };