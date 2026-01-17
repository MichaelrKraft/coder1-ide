"use client"

import * as React from "react"
import { Check, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { PlanType, PlanFeatures } from "@/lib/stripe"
import { PLAN_FEATURES } from "@/lib/stripe"

export interface PricingCardProps {
  plan: PlanType
  isAnnual?: boolean
  currentPlan?: PlanType | null
  isLoading?: boolean
  onSelect?: (plan: PlanType) => void
}

export function PricingCard({
  plan,
  isAnnual = false,
  currentPlan,
  isLoading = false,
  onSelect,
}: PricingCardProps) {
  const features = PLAN_FEATURES[plan]
  const isCurrentPlan = currentPlan === plan
  const isPopular = "popular" in features && features.popular
  const price = isAnnual ? features.priceAnnual : features.price

  // Determine button text and state
  const getButtonText = () => {
    if (isCurrentPlan) return "Current Plan"
    if (!currentPlan) return "Get Started"
    
    const planOrder: PlanType[] = ["starter", "growth", "scale"]
    const currentIndex = currentPlan ? planOrder.indexOf(currentPlan) : -1
    const planIndex = planOrder.indexOf(plan)
    
    if (planIndex > currentIndex) return "Upgrade"
    return "Downgrade"
  }

  const isUpgrade = () => {
    if (!currentPlan) return true
    const planOrder: PlanType[] = ["starter", "growth", "scale"]
    return planOrder.indexOf(plan) > planOrder.indexOf(currentPlan)
  }

  return (
    <Card
      className={cn(
        "relative flex flex-col transition-all duration-200",
        isPopular && "border-violet-500 shadow-lg shadow-violet-500/10",
        isCurrentPlan && "border-green-500 bg-green-500/5"
      )}
    >
      {isPopular && (
        <Badge
          className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-violet-500 to-purple-600 text-white border-0"
        >
          <Sparkles className="mr-1 h-3 w-3" />
          Most Popular
        </Badge>
      )}

      <CardHeader className="pb-4">
        <CardTitle className="text-xl">{features.name}</CardTitle>
        <CardDescription className="min-h-[40px]">
          {plan === "starter" && "Perfect for getting started with influencer marketing"}
          {plan === "growth" && "For growing teams scaling their outreach"}
          {plan === "scale" && "For enterprises with advanced needs"}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1">
        {/* Price */}
        <div className="mb-6">
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-bold">${price}</span>
            <span className="text-muted-foreground">/month</span>
          </div>
          {isAnnual && (
            <p className="text-sm text-green-500 mt-1">
              Save ${(features.price - features.priceAnnual) * 12}/year
            </p>
          )}
        </div>

        {/* Key metrics */}
        <div className="space-y-3 mb-6 pb-6 border-b">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Influencer lookups</span>
            <span className="font-medium">{features.lookups.toLocaleString()}/mo</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Outreach messages</span>
            <span className="font-medium">{features.outreach.toLocaleString()}/mo</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Active campaigns</span>
            <span className="font-medium">
              {features.campaigns === -1 ? "Unlimited" : features.campaigns}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Team members</span>
            <span className="font-medium">{features.team_members}</span>
          </div>
        </div>

        {/* Features list */}
        <ul className="space-y-2.5">
          {features.features.map((feature, index) => (
            <li key={index} className="flex items-start gap-2 text-sm">
              <Check className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
              <span className="text-muted-foreground">{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>

      <CardFooter className="pt-4">
        <Button
          className={cn(
            "w-full",
            isPopular && !isCurrentPlan && "bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700"
          )}
          variant={isCurrentPlan ? "outline" : isUpgrade() ? "default" : "secondary"}
          disabled={isCurrentPlan || isLoading}
          onClick={() => onSelect?.(plan)}
        >
          {isLoading ? "Loading..." : getButtonText()}
        </Button>
      </CardFooter>
    </Card>
  )
}
