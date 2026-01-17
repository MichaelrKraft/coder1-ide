'use client'

import { useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'

type ShortcutHandler = () => void

interface ShortcutConfig {
  key: string
  ctrl?: boolean
  meta?: boolean // Cmd on Mac
  shift?: boolean
  alt?: boolean
  handler: ShortcutHandler
  description: string
  category: 'navigation' | 'actions' | 'general'
}

// Global shortcuts registry
export const shortcuts: ShortcutConfig[] = [
  // Navigation
  {
    key: 'g',
    meta: true,
    handler: () => {},
    description: 'Go to Dashboard',
    category: 'navigation',
  },
  {
    key: 'c',
    meta: true,
    shift: true,
    handler: () => {},
    description: 'Go to Campaigns',
    category: 'navigation',
  },
  {
    key: 'i',
    meta: true,
    shift: true,
    handler: () => {},
    description: 'Go to Influencers',
    category: 'navigation',
  },
  {
    key: 'a',
    meta: true,
    shift: true,
    handler: () => {},
    description: 'Go to Analytics',
    category: 'navigation',
  },
  // Actions
  {
    key: 'k',
    meta: true,
    handler: () => {},
    description: 'Open search',
    category: 'actions',
  },
  {
    key: 'n',
    meta: true,
    handler: () => {},
    description: 'Create new campaign',
    category: 'actions',
  },
  // General
  {
    key: '/',
    handler: () => {},
    description: 'Show keyboard shortcuts',
    category: 'general',
  },
  {
    key: 'Escape',
    handler: () => {},
    description: 'Close modal/dialog',
    category: 'general',
  },
]

interface UseKeyboardShortcutsOptions {
  onSearch?: () => void
  onNewCampaign?: () => void
  onShowShortcuts?: () => void
  onEscape?: () => void
  enabled?: boolean
}

export function useKeyboardShortcuts({
  onSearch,
  onNewCampaign,
  onShowShortcuts,
  onEscape,
  enabled = true,
}: UseKeyboardShortcutsOptions = {}) {
  const router = useRouter()
  const activeElement = useRef<Element | null>(null)

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return

      // Don't trigger shortcuts when typing in inputs
      const target = event.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        // Only allow Escape in inputs
        if (event.key !== 'Escape') return
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
      const modKey = isMac ? event.metaKey : event.ctrlKey

      // Navigation shortcuts (Cmd/Ctrl + Shift + key)
      if (modKey && event.shiftKey) {
        switch (event.key.toLowerCase()) {
          case 'c':
            event.preventDefault()
            router.push('/campaigns')
            break
          case 'i':
            event.preventDefault()
            router.push('/influencers')
            break
          case 'a':
            event.preventDefault()
            router.push('/analytics')
            break
        }
      }

      // Action shortcuts (Cmd/Ctrl + key)
      if (modKey && !event.shiftKey) {
        switch (event.key.toLowerCase()) {
          case 'g':
            event.preventDefault()
            router.push('/')
            break
          case 'k':
            event.preventDefault()
            onSearch?.()
            // Focus search input
            const searchInput = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement
            if (searchInput) {
              searchInput.focus()
              searchInput.select()
            }
            break
          case 'n':
            event.preventDefault()
            onNewCampaign?.()
            router.push('/campaigns/new')
            break
        }
      }

      // General shortcuts
      if (!modKey && !event.shiftKey && !event.altKey) {
        switch (event.key) {
          case '/':
            // Only trigger if not in an input
            if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
              event.preventDefault()
              onShowShortcuts?.()
            }
            break
          case 'Escape':
            event.preventDefault()
            onEscape?.()
            break
        }
      }
    },
    [enabled, router, onSearch, onNewCampaign, onShowShortcuts, onEscape]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  return { shortcuts }
}

// Helper to format shortcut keys for display
export function formatShortcut(shortcut: ShortcutConfig): string {
  const parts: string[] = []
  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0

  if (shortcut.meta || shortcut.ctrl) {
    parts.push(isMac ? '⌘' : 'Ctrl')
  }
  if (shortcut.shift) {
    parts.push(isMac ? '⇧' : 'Shift')
  }
  if (shortcut.alt) {
    parts.push(isMac ? '⌥' : 'Alt')
  }

  // Format the key
  let key = shortcut.key
  if (key === 'Escape') key = 'Esc'
  if (key.length === 1) key = key.toUpperCase()

  parts.push(key)

  return parts.join(isMac ? '' : '+')
}

// Group shortcuts by category
export function groupShortcutsByCategory(): Record<string, ShortcutConfig[]> {
  return shortcuts.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) {
      acc[shortcut.category] = []
    }
    acc[shortcut.category].push(shortcut)
    return acc
  }, {} as Record<string, ShortcutConfig[]>)
}
