'use client'

import { useEffect } from 'react'
import { X, Keyboard, Command, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { shortcuts, formatShortcut, groupShortcutsByCategory } from '@/hooks/use-keyboard-shortcuts'

interface KeyboardShortcutsModalProps {
  isOpen: boolean
  onClose: () => void
}

const categoryLabels: Record<string, { label: string; icon: React.ReactNode }> = {
  navigation: { label: 'Navigation', icon: <ArrowRight className="h-4 w-4" /> },
  actions: { label: 'Actions', icon: <Command className="h-4 w-4" /> },
  general: { label: 'General', icon: <Keyboard className="h-4 w-4" /> },
}

export function KeyboardShortcutsModal({ isOpen, onClose }: KeyboardShortcutsModalProps) {
  const groupedShortcuts = groupShortcutsByCategory()

  // Close on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg">
        <div className={cn(
          "rounded-2xl border border-slate-700/50 bg-slate-900/95 backdrop-blur-xl",
          "shadow-2xl shadow-black/50",
          "overflow-hidden",
          "animate-in fade-in-0 zoom-in-95 duration-200"
        )}>
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/50">
            <div className="flex items-center gap-3">
              <div className={cn(
                "flex h-9 w-9 items-center justify-center rounded-lg",
                "bg-cyan-500/20",
                "border border-cyan-500/20"
              )}>
                <Keyboard className="h-5 w-5 text-cyan-400" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-white">Keyboard Shortcuts</h2>
                <p className="text-xs text-slate-400">Navigate faster with these shortcuts</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className={cn(
                "p-2 rounded-lg",
                "text-slate-400 hover:text-white",
                "hover:bg-slate-800/50",
                "transition-all duration-200"
              )}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-4 max-h-[60vh] overflow-y-auto space-y-6">
            {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => {
              const categoryInfo = categoryLabels[category] || { label: category, icon: null }

              return (
                <div key={category}>
                  {/* Category header */}
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-cyan-400">{categoryInfo.icon}</span>
                    <h3 className="text-sm font-medium text-slate-300 uppercase tracking-wider">
                      {categoryInfo.label}
                    </h3>
                  </div>

                  {/* Shortcuts list */}
                  <div className="space-y-2">
                    {categoryShortcuts.map((shortcut, index) => (
                      <div
                        key={index}
                        className={cn(
                          "flex items-center justify-between py-2 px-3 rounded-lg",
                          "bg-slate-800/30 hover:bg-slate-800/50",
                          "transition-all duration-200",
                          "group"
                        )}
                      >
                        <span className="text-sm text-slate-300 group-hover:text-white transition-colors">
                          {shortcut.description}
                        </span>
                        <kbd className={cn(
                          "inline-flex items-center gap-1 px-2 py-1 rounded-md",
                          "bg-slate-900/80 border border-slate-700/50",
                          "text-xs font-mono text-slate-400 group-hover:text-cyan-400",
                          "transition-all duration-200",
                          "group-hover:border-cyan-500/30 group-hover:shadow-[0_0_10px_rgba(0,212,255,0.1)]"
                        )}>
                          {formatShortcut(shortcut)}
                        </kbd>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Footer */}
          <div className="px-6 py-3 border-t border-slate-800/50 bg-slate-900/50">
            <p className="text-xs text-slate-500 text-center">
              Press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">/</kbd> anywhere to show this dialog
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
