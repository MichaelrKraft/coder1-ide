"use client"

import * as React from "react"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { PricingCard } from "./pricing-card"
import type { PlanType } from "@/lib/stripe"

export interface PricingTableProps {
  currentPlan?: PlanType | null
  isLoading?: boolean
  loadingPlan?: PlanType | null
  onSelectPlan?: (plan: PlanType, isAnnual: boolean) => void
  className?: string
}

export function PricingTable({
  currentPlan,
  isLoading = false,
  loadingPlan,
  onSelectPlan,
  className,
}: PricingTableProps) {
  const [isAnnual, setIsAnnual] = useState(false)

  const plans: PlanType[] = ["starter", "growth", "scale"]

  const handleSelectPlan = (plan: PlanType) => {
    onSelectPlan?.(plan, isAnnual)
  }

  return (
    <div className={cn("space-y-8", className)}>
      {/* Billing toggle */}
      <div className="flex items-center justify-center gap-4">
        <Label
          htmlFor="billing-toggle"
          className={cn(
            "text-sm cursor-pointer transition-colors",
            !isAnnual ? "text-foreground font-medium" : "text-muted-foreground"
          )}
        >
          Monthly
        </Label>
        <Switch
          id="billing-toggle"
          checked={isAnnual}
          onCheckedChange={setIsAnnual}
        />
        <Label
          htmlFor="billing-toggle"
          className={cn(
            "text-sm cursor-pointer transition-colors flex items-center gap-2",
            isAnnual ? "text-foreground font-medium" : "text-muted-foreground"
          )}
        >
          Annual
          <span className="text-xs text-green-500 font-normal">Save 20%</span>
        </Label>
      </div>

      {/* Pricing cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {plans.map((plan) => (
          <PricingCard
            key={plan}
            plan={plan}
            isAnnual={isAnnual}
            currentPlan={currentPlan}
            isLoading={isLoading && loadingPlan === plan}
            onSelect={handleSelectPlan}
          />
        ))}
      </div>

      {/* Enterprise contact */}
      <div className="text-center pt-4">
        <p className="text-sm text-muted-foreground">
          Need a custom plan?{" "}
          <a
            href="mailto:sales@leadpoint.ai"
            className="text-violet-500 hover:text-violet-400 underline-offset-4 hover:underline"
          >
            Contact our sales team
          </a>
        </p>
      </div>
    </div>
  )
}
