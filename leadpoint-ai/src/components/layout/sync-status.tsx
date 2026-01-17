'use client'

import { useState, useEffect } from 'react'
import { Check, Cloud, RefreshCw, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

type SyncStatus = 'synced' | 'syncing' | 'offline' | 'error'

interface SyncStatusProps {
  className?: string
}

export function SyncStatus({ className }: SyncStatusProps) {
  const [status, setStatus] = useState<SyncStatus>('synced')
  const [lastSaved, setLastSaved] = useState<Date>(new Date())

  // Simulate sync status changes for demo purposes
  useEffect(() => {
    // Check online status
    const handleOnline = () => setStatus('synced')
    const handleOffline = () => setStatus('offline')

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Update last saved time periodically
    const interval = setInterval(() => {
      // Simulate occasional syncing
      if (Math.random() > 0.95) {
        setStatus('syncing')
        setTimeout(() => {
          setStatus('synced')
          setLastSaved(new Date())
        }, 1500)
      }
    }, 5000)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      clearInterval(interval)
    }
  }, [])

  const getTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000)
    if (seconds < 60) return 'Just now'
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    return `${hours}h ago`
  }

  const statusConfig = {
    synced: {
      icon: Check,
      text: `Saved ${getTimeAgo(lastSaved)}`,
      iconClass: 'text-emerald-400',
      bgClass: 'bg-emerald-500/10',
      borderClass: 'border-emerald-500/20',
    },
    syncing: {
      icon: RefreshCw,
      text: 'Syncing...',
      iconClass: 'text-cyan-400 animate-spin',
      bgClass: 'bg-cyan-500/10',
      borderClass: 'border-cyan-500/20',
    },
    offline: {
      icon: Cloud,
      text: 'Offline',
      iconClass: 'text-amber-400',
      bgClass: 'bg-amber-500/10',
      borderClass: 'border-amber-500/20',
    },
    error: {
      icon: AlertCircle,
      text: 'Sync error',
      iconClass: 'text-red-400',
      bgClass: 'bg-red-500/10',
      borderClass: 'border-red-500/20',
    },
  }

  const config = statusConfig[status]
  const IconComponent = config.icon

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 rounded-full px-2.5 py-1',
        'border',
        config.bgClass,
        config.borderClass,
        'transition-all duration-300',
        className
      )}
    >
      <IconComponent className={cn('h-3 w-3', config.iconClass)} />
      <span className="text-xs text-slate-400">{config.text}</span>
    </div>
  )
}
