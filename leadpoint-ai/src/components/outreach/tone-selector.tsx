"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Smile, Briefcase, Coffee, Zap } from "lucide-react";

export type MessageTone = "friendly" | "professional" | "casual" | "enthusiastic";

interface ToneOption {
  value: MessageTone;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

const TONE_OPTIONS: ToneOption[] = [
  {
    value: "friendly",
    label: "Friendly",
    description: "Warm and approachable tone that builds rapport",
    icon: <Smile className="h-4 w-4" />,
    color: "text-green-500 border-green-500 bg-green-500/10",
  },
  {
    value: "professional",
    label: "Professional",
    description: "Formal and business-oriented communication",
    icon: <Briefcase className="h-4 w-4" />,
    color: "text-blue-500 border-blue-500 bg-blue-500/10",
  },
  {
    value: "casual",
    label: "Casual",
    description: "Relaxed and conversational style",
    icon: <Coffee className="h-4 w-4" />,
    color: "text-amber-500 border-amber-500 bg-amber-500/10",
  },
  {
    value: "enthusiastic",
    label: "Enthusiastic",
    description: "Energetic and excited tone that shows passion",
    icon: <Zap className="h-4 w-4" />,
    color: "text-purple-500 border-purple-500 bg-purple-500/10",
  },
];

interface ToneSelectorProps {
  value: MessageTone;
  onChange: (tone: MessageTone) => void;
  disabled?: boolean;
}

export function ToneSelector({ value, onChange, disabled }: ToneSelectorProps) {
  return (
    <TooltipProvider>
      <div className="flex flex-wrap gap-2">
        {TONE_OPTIONS.map((option) => {
          const isSelected = value === option.value;
          return (
            <Tooltip key={option.value}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => onChange(option.value)}
                  disabled={disabled}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all duration-200",
                    "hover:scale-105 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                    "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100",
                    isSelected
                      ? option.color
                      : "border-border bg-background text-muted-foreground hover:border-muted-foreground/50"
                  )}
                >
                  {option.icon}
                  <span className="text-sm font-medium">{option.label}</span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[200px]">
                <p className="text-sm">{option.description}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}

export { TONE_OPTIONS };
