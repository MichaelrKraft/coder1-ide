'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/stores/ui-store'
import {
  Menu,
  Search,
  Bell,
  ChevronRight,
  User,
  CreditCard,
  HelpCircle,
  LogOut,
} from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { SyncStatus } from './sync-status'

const routeTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/campaigns': 'Campaigns',
  '/campaigns/new': 'Create Campaign',
  '/influencers': 'Influencers',
  '/analytics': 'Analytics',
  '/settings': 'Settings',
  '/settings/billing': 'Billing',
}

function getBreadcrumbs(pathname: string) {
  const segments = pathname.split('/').filter(Boolean)
  const breadcrumbs = [{ name: 'Home', href: '/' }]

  let currentPath = ''
  for (const segment of segments) {
    currentPath += `/${segment}`
    const name = routeTitles[currentPath] || segment.charAt(0).toUpperCase() + segment.slice(1)
    breadcrumbs.push({ name, href: currentPath })
  }

  return breadcrumbs
}

function getPageTitle(pathname: string) {
  // Check for dynamic routes
  if (pathname.match(/^\/campaigns\/[^/]+$/)) {
    return 'Campaign Details'
  }
  return routeTitles[pathname] || 'Dashboard'
}

export function Header() {
  const pathname = usePathname()
  const { setSidebarOpen } = useUIStore()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const notificationsRef = useRef<HTMLDivElement>(null)

  const pageTitle = getPageTitle(pathname)
  const breadcrumbs = getBreadcrumbs(pathname)

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false)
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-slate-800/50 bg-[#0a0a0f]/80 backdrop-blur-xl px-4 sm:px-6">
      {/* Mobile menu button */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="lg:hidden p-2 rounded-md text-slate-400 hover:text-cyan-400 hover:bg-slate-800/50 transition-all duration-300"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Page title and breadcrumbs */}
      <div className="flex-1 min-w-0">
        {/* Breadcrumbs */}
        <nav className="hidden sm:flex items-center gap-1 text-xs text-slate-500 mb-0.5">
          {breadcrumbs.map((crumb, index) => (
            <div key={crumb.href} className="flex items-center gap-1">
              {index > 0 && <ChevronRight className="h-3 w-3 text-slate-600" />}
              {index === breadcrumbs.length - 1 ? (
                <span className="text-slate-400">{crumb.name}</span>
              ) : (
                <Link
                  href={crumb.href}
                  className="hover:text-cyan-400 transition-all duration-300"
                >
                  {crumb.name}
                </Link>
              )}
            </div>
          ))}
        </nav>

        {/* Page title */}
        <h1 className="text-base font-medium text-white truncate hover:text-cyan-100 transition-all duration-300 cursor-default">
          {pageTitle}
        </h1>
      </div>

      {/* Search bar */}
      <div className="hidden md:flex items-center">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within:text-cyan-400 transition-all duration-300" />
          <input
            type="text"
            placeholder="Search..."
            className="w-56 rounded-lg bg-slate-900/50 border border-slate-700 pl-9 pr-4 py-1.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:shadow-[0_0_15px_rgba(0,212,255,0.2)] transition-all duration-300"
          />
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
            <kbd className="hidden lg:inline-flex h-5 items-center gap-0.5 rounded bg-slate-800/80 border border-slate-700 px-1.5 font-mono text-[10px] font-medium text-slate-400">
              <span className="text-xs">&#8984;</span>K
            </kbd>
          </div>
        </div>
      </div>

      {/* Sync Status */}
      <SyncStatus className="hidden sm:flex" />

      {/* Keyboard shortcut hint */}
      <button
        onClick={() => {
          // Dispatch a custom event to open shortcuts modal
          window.dispatchEvent(new KeyboardEvent('keydown', { key: '/' }))
        }}
        className="hidden lg:flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-slate-500 hover:text-slate-300 hover:bg-slate-800/50 transition-all duration-200"
        title="Keyboard shortcuts"
      >
        <kbd className="px-1.5 py-0.5 rounded bg-slate-800/80 border border-slate-700 font-mono text-[10px]">/</kbd>
        <span>Shortcuts</span>
      </button>

      {/* Notifications */}
      <div className="relative" ref={notificationsRef}>
        <button
          onClick={() => setNotificationsOpen(!notificationsOpen)}
          className="relative p-2 rounded-md text-slate-400 hover:text-cyan-400 hover:bg-slate-800/50 transition-all duration-300"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-cyan-500 ring-2 ring-[#0a0a0f] animate-pulse" />
        </button>

        {/* Notifications dropdown */}
        {notificationsOpen && (
          <div className="absolute right-0 mt-2 w-80 rounded-lg border border-slate-700 bg-slate-900/95 backdrop-blur-xl shadow-lg shadow-black/50 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-800">
              <h3 className="text-sm font-medium text-white">Notifications</h3>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {/* Sample notifications */}
              <div className="px-4 py-3 hover:bg-slate-800/50 transition-all duration-300 cursor-pointer border-b border-slate-800 group">
                <p className="text-sm text-slate-200 group-hover:text-cyan-100">New response from @fashionista_123</p>
                <p className="text-xs text-slate-500 mt-0.5">2 minutes ago</p>
              </div>
              <div className="px-4 py-3 hover:bg-slate-800/50 transition-all duration-300 cursor-pointer border-b border-slate-800 group">
                <p className="text-sm text-slate-200 group-hover:text-cyan-100">Campaign &quot;Summer Sale&quot; reached 50% milestone</p>
                <p className="text-xs text-slate-500 mt-0.5">1 hour ago</p>
              </div>
              <div className="px-4 py-3 hover:bg-slate-800/50 transition-all duration-300 cursor-pointer group">
                <p className="text-sm text-slate-200 group-hover:text-cyan-100">3 new influencers match your criteria</p>
                <p className="text-xs text-slate-500 mt-0.5">3 hours ago</p>
              </div>
            </div>
            <div className="px-4 py-3 border-t border-slate-800">
              <Link
                href="/notifications"
                className="text-sm text-cyan-400 hover:text-cyan-300 transition-all duration-300"
              >
                View all notifications
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* User menu */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex items-center gap-2 p-1 rounded-lg hover:bg-slate-800/50 transition-all duration-300 group"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-500 text-sm font-medium text-white ring-2 ring-transparent group-hover:ring-cyan-500/50 transition-all duration-300">
            JD
          </div>
          <ChevronRight
            className={cn(
              'hidden sm:block h-4 w-4 text-slate-400 transition-all duration-300',
              dropdownOpen && 'rotate-90 text-cyan-400'
            )}
          />
        </button>

        {/* User dropdown */}
        {dropdownOpen && (
          <div className="absolute right-0 mt-2 w-56 rounded-lg border border-slate-700 bg-slate-900/95 backdrop-blur-xl shadow-lg shadow-black/50 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-800">
              <p className="text-sm font-medium text-white">John Doe</p>
              <p className="text-xs text-slate-500">john@example.com</p>
            </div>
            <div className="py-1">
              <Link
                href="/settings"
                onClick={() => setDropdownOpen(false)}
                className="flex items-center gap-3 px-4 py-2 text-sm text-slate-300 hover:text-cyan-400 hover:bg-slate-800/50 transition-all duration-300"
              >
                <User className="h-4 w-4" />
                Profile Settings
              </Link>
              <Link
                href="/settings/billing"
                onClick={() => setDropdownOpen(false)}
                className="flex items-center gap-3 px-4 py-2 text-sm text-slate-300 hover:text-cyan-400 hover:bg-slate-800/50 transition-all duration-300"
              >
                <CreditCard className="h-4 w-4" />
                Billing
              </Link>
              <Link
                href="/help"
                onClick={() => setDropdownOpen(false)}
                className="flex items-center gap-3 px-4 py-2 text-sm text-slate-300 hover:text-cyan-400 hover:bg-slate-800/50 transition-all duration-300"
              >
                <HelpCircle className="h-4 w-4" />
                Help & Documentation
              </Link>
            </div>
            <div className="border-t border-slate-800 py-1">
              <button className="flex w-full items-center gap-3 px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-slate-800/50 transition-all duration-300">
                <LogOut className="h-4 w-4" />
                Log out
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
