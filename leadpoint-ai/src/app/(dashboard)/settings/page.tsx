'use client'

import { useState } from 'react'
import {
  User,
  Mail,
  Building2,
  Bell,
  Shield,
  Palette,
  Save,
  Check,
} from 'lucide-react'
import Link from 'next/link'

export default function SettingsPage() {
  const [saved, setSaved] = useState(false)
  const [profile, setProfile] = useState({
    name: 'John Doe',
    email: 'john@example.com',
    company: 'Acme Inc',
    role: 'Marketing Manager',
  })

  const [notifications, setNotifications] = useState({
    emailNewResponse: true,
    emailCampaignMilestone: true,
    emailWeeklySummary: false,
    pushNewResponse: true,
    pushCampaignMilestone: false,
  })

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Settings</h1>
          <p className="mt-1 text-slate-400">Manage your account and preferences</p>
        </div>

        {/* Navigation tabs */}
        <div className="flex gap-1 border-b border-slate-800 mb-8">
          <Link
            href="/settings"
            className="px-4 py-2 text-sm font-medium text-white border-b-2 border-cyan-500 transition-all duration-300"
          >
            Profile
          </Link>
          <Link
            href="/settings/billing"
            className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white border-b-2 border-transparent hover:border-slate-600 transition-all duration-300"
          >
            Billing
          </Link>
        </div>

        <div className="space-y-8">
          {/* Profile Section */}
          <section className="rounded-xl border border-slate-800/50 bg-slate-900/50 backdrop-blur-sm shadow-sm overflow-hidden hover:border-cyan-500/30 hover:shadow-[0_0_20px_rgba(0,212,255,0.1)] transition-all duration-300">
            <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-800/50">
              <User className="h-5 w-5 text-cyan-400" />
              <h2 className="font-semibold text-white">Profile Information</h2>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    className="w-full rounded-lg bg-slate-800/50 border border-slate-700 px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 focus:shadow-[0_0_15px_rgba(0,212,255,0.15)] transition-all duration-300"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                    className="w-full rounded-lg bg-slate-800/50 border border-slate-700 px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 focus:shadow-[0_0_15px_rgba(0,212,255,0.15)] transition-all duration-300"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Company
                  </label>
                  <input
                    type="text"
                    value={profile.company}
                    onChange={(e) => setProfile({ ...profile, company: e.target.value })}
                    className="w-full rounded-lg bg-slate-800/50 border border-slate-700 px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 focus:shadow-[0_0_15px_rgba(0,212,255,0.15)] transition-all duration-300"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Role
                  </label>
                  <input
                    type="text"
                    value={profile.role}
                    onChange={(e) => setProfile({ ...profile, role: e.target.value })}
                    className="w-full rounded-lg bg-slate-800/50 border border-slate-700 px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 focus:shadow-[0_0_15px_rgba(0,212,255,0.15)] transition-all duration-300"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Notifications Section */}
          <section className="rounded-xl border border-slate-800/50 bg-slate-900/50 backdrop-blur-sm shadow-sm overflow-hidden hover:border-purple-500/30 hover:shadow-[0_0_20px_rgba(139,92,246,0.1)] transition-all duration-300">
            <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-800/50">
              <Bell className="h-5 w-5 text-purple-400" />
              <h2 className="font-semibold text-white">Notification Preferences</h2>
            </div>
            <div className="p-6">
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-medium text-white mb-4">Email Notifications</h3>
                  <div className="space-y-3">
                    <label className="flex items-center justify-between group">
                      <span className="text-sm text-slate-400 group-hover:text-slate-300 transition-colors duration-300">New influencer responses</span>
                      <button
                        onClick={() => setNotifications({ ...notifications, emailNewResponse: !notifications.emailNewResponse })}
                        className={`relative h-6 w-11 rounded-full transition-all duration-300 ${
                          notifications.emailNewResponse
                            ? 'bg-gradient-to-r from-cyan-500 to-cyan-400 shadow-[0_0_12px_rgba(0,212,255,0.4)]'
                            : 'bg-slate-700 hover:bg-slate-600'
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-all duration-300 shadow-md ${
                            notifications.emailNewResponse ? 'translate-x-5' : ''
                          }`}
                        />
                      </button>
                    </label>
                    <label className="flex items-center justify-between group">
                      <span className="text-sm text-slate-400 group-hover:text-slate-300 transition-colors duration-300">Campaign milestones</span>
                      <button
                        onClick={() => setNotifications({ ...notifications, emailCampaignMilestone: !notifications.emailCampaignMilestone })}
                        className={`relative h-6 w-11 rounded-full transition-all duration-300 ${
                          notifications.emailCampaignMilestone
                            ? 'bg-gradient-to-r from-cyan-500 to-cyan-400 shadow-[0_0_12px_rgba(0,212,255,0.4)]'
                            : 'bg-slate-700 hover:bg-slate-600'
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-all duration-300 shadow-md ${
                            notifications.emailCampaignMilestone ? 'translate-x-5' : ''
                          }`}
                        />
                      </button>
                    </label>
                    <label className="flex items-center justify-between group">
                      <span className="text-sm text-slate-400 group-hover:text-slate-300 transition-colors duration-300">Weekly summary digest</span>
                      <button
                        onClick={() => setNotifications({ ...notifications, emailWeeklySummary: !notifications.emailWeeklySummary })}
                        className={`relative h-6 w-11 rounded-full transition-all duration-300 ${
                          notifications.emailWeeklySummary
                            ? 'bg-gradient-to-r from-cyan-500 to-cyan-400 shadow-[0_0_12px_rgba(0,212,255,0.4)]'
                            : 'bg-slate-700 hover:bg-slate-600'
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-all duration-300 shadow-md ${
                            notifications.emailWeeklySummary ? 'translate-x-5' : ''
                          }`}
                        />
                      </button>
                    </label>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800/50">
                  <h3 className="text-sm font-medium text-white mb-4">Push Notifications</h3>
                  <div className="space-y-3">
                    <label className="flex items-center justify-between group">
                      <span className="text-sm text-slate-400 group-hover:text-slate-300 transition-colors duration-300">New influencer responses</span>
                      <button
                        onClick={() => setNotifications({ ...notifications, pushNewResponse: !notifications.pushNewResponse })}
                        className={`relative h-6 w-11 rounded-full transition-all duration-300 ${
                          notifications.pushNewResponse
                            ? 'bg-gradient-to-r from-cyan-500 to-cyan-400 shadow-[0_0_12px_rgba(0,212,255,0.4)]'
                            : 'bg-slate-700 hover:bg-slate-600'
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-all duration-300 shadow-md ${
                            notifications.pushNewResponse ? 'translate-x-5' : ''
                          }`}
                        />
                      </button>
                    </label>
                    <label className="flex items-center justify-between group">
                      <span className="text-sm text-slate-400 group-hover:text-slate-300 transition-colors duration-300">Campaign milestones</span>
                      <button
                        onClick={() => setNotifications({ ...notifications, pushCampaignMilestone: !notifications.pushCampaignMilestone })}
                        className={`relative h-6 w-11 rounded-full transition-all duration-300 ${
                          notifications.pushCampaignMilestone
                            ? 'bg-gradient-to-r from-cyan-500 to-cyan-400 shadow-[0_0_12px_rgba(0,212,255,0.4)]'
                            : 'bg-slate-700 hover:bg-slate-600'
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-all duration-300 shadow-md ${
                            notifications.pushCampaignMilestone ? 'translate-x-5' : ''
                          }`}
                        />
                      </button>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Security Section */}
          <section className="rounded-xl border border-slate-800/50 bg-slate-900/50 backdrop-blur-sm shadow-sm overflow-hidden hover:border-emerald-500/30 hover:shadow-[0_0_20px_rgba(16,185,129,0.1)] transition-all duration-300">
            <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-800/50">
              <Shield className="h-5 w-5 text-emerald-400" />
              <h2 className="font-semibold text-white">Security</h2>
            </div>
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-white">Password</h3>
                  <p className="text-sm text-slate-500 mt-0.5">Last changed 30 days ago</p>
                </div>
                <button className="px-4 py-2 text-sm font-medium text-cyan-400 border border-cyan-500/50 rounded-lg hover:bg-cyan-500/10 hover:border-cyan-400 hover:shadow-[0_0_15px_rgba(0,212,255,0.2)] transition-all duration-300">
                  Change Password
                </button>
              </div>
            </div>
          </section>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              className={`flex items-center gap-2 px-6 py-2.5 font-medium rounded-lg transition-all duration-300 ${
                saved
                  ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-[0_0_25px_rgba(16,185,129,0.4)]'
                  : 'bg-gradient-to-r from-cyan-500 to-cyan-600 text-white hover:shadow-[0_0_25px_rgba(0,212,255,0.4)] hover:-translate-y-0.5'
              }`}
            >
              {saved ? (
                <>
                  <Check className="h-4 w-4" />
                  Saved!
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
