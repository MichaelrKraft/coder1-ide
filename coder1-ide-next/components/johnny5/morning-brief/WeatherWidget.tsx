'use client';

import React from 'react';
import {
  Sun,
  Cloud,
  CloudRain,
  CloudSnow,
  CloudLightning,
  CloudFog,
  CloudSun,
  Wind,
  Thermometer,
  EyeOff,
} from 'lucide-react';

interface WeatherWidgetProps {
  temperature: number;
  condition: string;
  location: string;
  onHide?: () => void;
  className?: string;
}

/**
 * WeatherWidget - Optional weather display for Morning Brief
 *
 * Features:
 * - Temperature and condition display
 * - Dynamic weather icon
 * - Location name
 * - Toggle to hide
 * - Subtle morning-themed styling
 */
export default function WeatherWidget({
  temperature,
  condition,
  location,
  onHide,
  className = '',
}: WeatherWidgetProps) {
  const weatherConfig = getWeatherConfig(condition);

  return (
    <div
      className={`
        relative group flex items-center justify-between p-3 rounded-xl
        bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-transparent
        border border-orange-500/20
        ${className}
      `}
    >
      {/* Weather Info */}
      <div className="flex items-center gap-3">
        {/* Weather Icon */}
        <div
          className={`
            w-10 h-10 rounded-xl flex items-center justify-center
            ${weatherConfig.bgColor}
          `}
        >
          <weatherConfig.icon className={`w-5 h-5 ${weatherConfig.textColor}`} />
        </div>

        {/* Temperature and Condition */}
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-text-primary">
              {temperature}°
            </span>
            <span className="text-sm text-text-secondary capitalize">
              {condition}
            </span>
          </div>
          <div className="flex items-center gap-1 text-xs text-text-muted">
            <span>{location}</span>
          </div>
        </div>
      </div>

      {/* Hide Button */}
      {onHide && (
        <button
          onClick={onHide}
          className="
            p-1.5 rounded-md text-text-muted
            opacity-0 group-hover:opacity-100
            hover:text-text-secondary hover:bg-bg-tertiary
            transition-all
          "
          title="Hide weather"
        >
          <EyeOff className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Subtle sun rays decoration */}
      <div
        className="
          absolute top-0 right-8 w-12 h-12 pointer-events-none
          opacity-20
        "
        style={{
          background: 'radial-gradient(circle at center, rgba(251, 146, 60, 0.4), transparent 70%)',
        }}
      />
    </div>
  );
}

// ============================================================================
// Helper Functions
// ============================================================================

function getWeatherConfig(condition: string | null): {
  icon: typeof Sun;
  bgColor: string;
  textColor: string;
} {
  const lowerCondition = (condition ?? '').toLowerCase();

  if (lowerCondition.includes('sun') || lowerCondition.includes('clear')) {
    return {
      icon: Sun,
      bgColor: 'bg-amber-500/20',
      textColor: 'text-amber-400',
    };
  }

  if (lowerCondition.includes('partly') || lowerCondition.includes('mostly')) {
    return {
      icon: CloudSun,
      bgColor: 'bg-sky-500/20',
      textColor: 'text-sky-400',
    };
  }

  if (lowerCondition.includes('cloud') || lowerCondition.includes('overcast')) {
    return {
      icon: Cloud,
      bgColor: 'bg-gray-500/20',
      textColor: 'text-gray-400',
    };
  }

  if (lowerCondition.includes('rain') || lowerCondition.includes('drizzle') || lowerCondition.includes('shower')) {
    return {
      icon: CloudRain,
      bgColor: 'bg-blue-500/20',
      textColor: 'text-blue-400',
    };
  }

  if (lowerCondition.includes('snow') || lowerCondition.includes('sleet') || lowerCondition.includes('ice')) {
    return {
      icon: CloudSnow,
      bgColor: 'bg-slate-500/20',
      textColor: 'text-slate-400',
    };
  }

  if (lowerCondition.includes('thunder') || lowerCondition.includes('storm') || lowerCondition.includes('lightning')) {
    return {
      icon: CloudLightning,
      bgColor: 'bg-purple-500/20',
      textColor: 'text-purple-400',
    };
  }

  if (lowerCondition.includes('fog') || lowerCondition.includes('mist') || lowerCondition.includes('haze')) {
    return {
      icon: CloudFog,
      bgColor: 'bg-neutral-500/20',
      textColor: 'text-neutral-400',
    };
  }

  if (lowerCondition.includes('wind') || lowerCondition.includes('breezy')) {
    return {
      icon: Wind,
      bgColor: 'bg-teal-500/20',
      textColor: 'text-teal-400',
    };
  }

  // Default to sunny
  return {
    icon: Sun,
    bgColor: 'bg-amber-500/20',
    textColor: 'text-amber-400',
  };
}
