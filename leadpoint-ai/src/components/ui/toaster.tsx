"use client"

import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { CheckCircle2, XCircle, AlertTriangle, Info, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

const variantIcons = {
  default: null,
  destructive: XCircle,
  success: CheckCircle2,
  warning: AlertTriangle,
  info: Info,
}

const variantIconStyles = {
  default: "text-slate-400",
  destructive: "text-red-400",
  success: "text-emerald-400",
  warning: "text-amber-400",
  info: "text-cyan-400",
}

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, variant = "default", ...props }) {
        const Icon = variantIcons[variant as keyof typeof variantIcons]
        const iconStyle = variantIconStyles[variant as keyof typeof variantIconStyles]

        return (
          <Toast key={id} variant={variant as "default" | "destructive" | "success" | "warning" | "info"} {...props}>
            <div className="flex items-start gap-3">
              {/* Icon with animation */}
              {Icon && (
                <div className={cn(
                  "flex-shrink-0 mt-0.5",
                  variant === "success" && "animate-bounce-once"
                )}>
                  <Icon className={cn("h-5 w-5", iconStyle)} />
                </div>
              )}

              {/* Content */}
              <div className="grid gap-1 flex-1">
                {title && (
                  <ToastTitle className={cn(
                    "font-semibold",
                    variant === "destructive" && "text-red-100",
                    variant === "success" && "text-emerald-100",
                    variant === "warning" && "text-amber-100",
                    variant === "info" && "text-cyan-100"
                  )}>
                    {title}
                  </ToastTitle>
                )}
                {description && (
                  <ToastDescription className={cn(
                    "text-sm opacity-90",
                    variant === "destructive" && "text-red-200/80",
                    variant === "success" && "text-emerald-200/80",
                    variant === "warning" && "text-amber-200/80",
                    variant === "info" && "text-cyan-200/80"
                  )}>
                    {description}
                  </ToastDescription>
                )}
              </div>
            </div>
            {action}
            <ToastClose className={cn(
              "opacity-70 hover:opacity-100",
              variant === "destructive" && "text-red-300 hover:text-red-100",
              variant === "success" && "text-emerald-300 hover:text-emerald-100",
              variant === "warning" && "text-amber-300 hover:text-amber-100",
              variant === "info" && "text-cyan-300 hover:text-cyan-100"
            )} />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}

// Loading toast helper for async operations
export function ToasterWithProgress() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, variant = "default", ...props }) {
        const isLoading = (props as { loading?: boolean }).loading
        const Icon = isLoading ? Loader2 : variantIcons[variant as keyof typeof variantIcons]
        const iconStyle = isLoading ? "text-cyan-400 animate-spin" : variantIconStyles[variant as keyof typeof variantIconStyles]

        return (
          <Toast key={id} variant={variant as "default" | "destructive" | "success" | "warning" | "info"} {...props}>
            <div className="flex items-start gap-3">
              {Icon && (
                <div className="flex-shrink-0 mt-0.5">
                  <Icon className={cn("h-5 w-5", iconStyle)} />
                </div>
              )}
              <div className="grid gap-1 flex-1">
                {title && <ToastTitle>{title}</ToastTitle>}
                {description && <ToastDescription>{description}</ToastDescription>}
              </div>
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
