'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/stores/ui-store'
import {
  LayoutDashboard,
  Megaphone,
  Users,
  BarChart3,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Campaigns', href: '/campaigns', icon: Megaphone },
  { name: 'Influencers', href: '/influencers', icon: Users },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Settings', href: '/settings', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const { sidebarOpen, sidebarCollapsed, setSidebarOpen, toggleSidebarCollapsed } = useUIStore()

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col',
          'bg-[#0a0a0f] border-r border-slate-800/50',
          'transition-all duration-300 ease-in-out',
          'hover:border-cyan-500/20',
          // Subtle gradient overlay
          'before:absolute before:inset-0 before:bg-cyan-500/[0.02] before:pointer-events-none',
          sidebarCollapsed ? 'w-20' : 'w-64',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Logo */}
        <div className="relative flex h-24 items-center justify-center border-b border-slate-800/50">
          <Link href="/" className="flex items-center justify-center group w-full">
            <div className={cn(
              'flex items-center justify-center',
              'transition-all duration-300',
              'group-hover:scale-105'
            )}>
              <Image
                src="/logo.png"
                alt="LeadPoint.ai"
                width={sidebarCollapsed ? 48 : 180}
                height={sidebarCollapsed ? 17 : 65}
                className="object-contain"
              />
            </div>
          </Link>

          {/* Mobile close button */}
          <button
            onClick={() => setSidebarOpen(false)}
            className={cn(
              'lg:hidden p-2 rounded-lg',
              'text-slate-400 hover:text-cyan-400',
              'hover:bg-slate-800/50',
              'transition-all duration-300'
            )}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navigation.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== '/' && pathname.startsWith(item.href))

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium',
                  'transition-all duration-300 ease-out',
                  'relative overflow-hidden',
                  isActive
                    ? [
                        'text-cyan-400',
                        'bg-cyan-500/10',
                        'border-l-2 border-cyan-400',
                        'shadow-[inset_0_0_20px_rgba(0,212,255,0.1)]',
                      ]
                    : [
                        'text-slate-400',
                        'border-l-2 border-transparent',
                        'hover:text-cyan-400',
                        'hover:bg-slate-800/50',
                        'hover:border-cyan-500/30',
                        'hover:translate-x-1',
                        'hover:shadow-[inset_0_0_20px_rgba(0,212,255,0.05)]',
                      ]
                )}
              >
                {/* Glow effect on hover */}
                <div className={cn(
                  'absolute inset-0 opacity-0 transition-opacity duration-300',
                  'bg-gradient-to-r from-cyan-500/10 to-transparent',
                  'group-hover:opacity-100',
                  isActive && 'opacity-100'
                )} />

                <item.icon
                  className={cn(
                    'h-5 w-5 flex-shrink-0 relative z-10',
                    'transition-all duration-300',
                    isActive
                      ? 'text-cyan-400 drop-shadow-[0_0_8px_rgba(0,212,255,0.5)]'
                      : [
                          'text-slate-500',
                          'group-hover:text-cyan-400',
                          'group-hover:drop-shadow-[0_0_8px_rgba(0,212,255,0.4)]',
                          'group-hover:scale-110',
                        ]
                  )}
                />
                {!sidebarCollapsed && (
                  <span className="relative z-10">{item.name}</span>
                )}
              </Link>
            )
          })}
        </nav>


        {/* User profile section */}
        <div className="border-t border-slate-800/50 p-3">
          <div className={cn(
            'flex items-center gap-3 rounded-xl p-2',
            'transition-all duration-300 cursor-pointer',
            'hover:bg-slate-800/50',
            sidebarCollapsed && 'justify-center'
          )}>
            <div className={cn(
              'flex h-8 w-8 items-center justify-center rounded-full',
              'bg-cyan-500',
              'text-sm font-medium text-white flex-shrink-0',
              'shadow-lg shadow-cyan-500/20',
              'transition-all duration-300',
              'hover:shadow-cyan-500/40'
            )}>
              JD
            </div>
            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">John Doe</p>
                <p className="text-xs text-slate-500 truncate">john@example.com</p>
              </div>
            )}
          </div>

          {/* Logout button */}
          <button
            className={cn(
              'mt-2 flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium',
              'text-slate-400 transition-all duration-300',
              'hover:bg-slate-800/50 hover:text-red-400',
              'group',
              sidebarCollapsed && 'justify-center px-2'
            )}
          >
            <LogOut className={cn(
              'h-4 w-4 flex-shrink-0 transition-all duration-300',
              'group-hover:text-red-400',
              'group-hover:drop-shadow-[0_0_8px_rgba(248,113,113,0.5)]'
            )} />
            {!sidebarCollapsed && <span>Log out</span>}
          </button>
        </div>

        {/* Collapse toggle (desktop only) */}
        <button
          onClick={toggleSidebarCollapsed}
          className={cn(
            'hidden lg:flex absolute -right-3 top-20',
            'h-6 w-6 items-center justify-center rounded-full',
            'bg-slate-900 border border-slate-700',
            'text-slate-400 transition-all duration-300',
            'hover:text-cyan-400 hover:border-cyan-500/50',
            'hover:shadow-[0_0_15px_rgba(0,212,255,0.3)]',
            'hover:scale-110'
          )}
        >
          {sidebarCollapsed ? (
            <ChevronRight className="h-3 w-3" />
          ) : (
            <ChevronLeft className="h-3 w-3" />
          )}
        </button>
      </aside>
    </>
  )
}
