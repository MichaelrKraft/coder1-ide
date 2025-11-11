'use client';

import React, { useEffect, useState } from 'react';
import { BarChart3, MessageSquare, TrendingUp, Clock, Database, CheckCircle, DollarSign, Zap, Award } from 'lucide-react';
import AnalyticsCard from '@/components/analytics/AnalyticsCard';

interface CostTracking {
  apiCalls: number;
  cliCalls: number;
  apiCost: number;
  cliCost: number;
  totalCost: number;
  savings: number;
  savingsPercent: number;
}

interface AnalyticsData {
  totalConversations: number;
  totalSessions: number;
  totalPatterns: number;
  successRate: number;
  timeSavedMinutes: number;
  timeSavedHours: number;
  avgQualityScore: number;
  costTracking: CostTracking;
  lastUpdated: string;
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const useMock = urlParams.get('mock') === 'true';
      const response = await fetch(`/api/analytics/stats${useMock ? '?mock=true' : ''}`);
      const result = await response.json();
      
      if (result.success) {
        setData(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1a1b26] flex items-center justify-center">
        <div className="text-gray-400">Loading analytics...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-[#1a1b26] flex items-center justify-center">
        <div className="text-red-400">Failed to load analytics</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1a1b26] p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Analytics Dashboard</h1>
          <p className="text-gray-400">
            Track your AI-assisted development productivity and insights
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <AnalyticsCard
            title="Total Conversations"
            value={data.totalConversations}
            subtitle="Claude Code interactions captured"
            icon={MessageSquare}
            color="blue"
          />

          <AnalyticsCard
            title="Success Rate"
            value={`${Math.round(data.successRate)}%`}
            subtitle="Successful AI interactions"
            icon={CheckCircle}
            color="green"
          />

          <AnalyticsCard
            title="Session Quality"
            value={`${data.avgQualityScore}/100`}
            subtitle="Average quality score"
            icon={Award}
            color="purple"
          />

          <AnalyticsCard
            title="Time Saved"
            value={`${data.timeSavedHours}h`}
            subtitle={`${data.timeSavedMinutes} minutes total`}
            icon={Clock}
            color="orange"
          />

          <AnalyticsCard
            title="Cost Savings"
            value={`$${data.costTracking.savings}`}
            subtitle={`${data.costTracking.savingsPercent}% saved via CLI`}
            icon={DollarSign}
            color="green"
          />

          <AnalyticsCard
            title="CLI Puppeteer"
            value={data.costTracking.cliCalls}
            subtitle={`${data.costTracking.apiCalls} API calls`}
            icon={Zap}
            color="blue"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-gray-800/30 border border-gray-700/50 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-400" />
              Cost Breakdown
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">API Calls:</span>
                <span className="text-white font-mono">{data.costTracking.apiCalls} × $0.015 = ${data.costTracking.apiCost}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">CLI Calls:</span>
                <span className="text-white font-mono">{data.costTracking.cliCalls} × $0.00 = ${data.costTracking.cliCost}</span>
              </div>
              <div className="border-t border-gray-700 pt-3 flex justify-between items-center">
                <span className="text-gray-300 font-semibold">Total Cost:</span>
                <span className="text-white font-mono font-bold">${data.costTracking.totalCost}</span>
              </div>
              <div className="bg-green-500/10 border border-green-500/20 rounded p-3 mt-3">
                <div className="flex justify-between items-center">
                  <span className="text-green-400 font-semibold">💰 Savings:</span>
                  <span className="text-green-400 font-mono font-bold">${data.costTracking.savings}</span>
                </div>
                <p className="text-xs text-green-300/70 mt-1">
                  If all {data.costTracking.cliCalls + data.costTracking.apiCalls} calls used API: $
                  {((data.costTracking.cliCalls + data.costTracking.apiCalls) * 0.015).toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800/30 border border-gray-700/50 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <Database className="w-5 h-5 text-blue-400" />
              Session Metrics
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Active Sessions:</span>
                <span className="text-white font-mono">{data.totalSessions}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Patterns Detected:</span>
                <span className="text-white font-mono">{data.totalPatterns}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Avg Quality Score:</span>
                <span className="text-white font-mono">{data.avgQualityScore}/100</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Last Updated:</span>
                <span className="text-white font-mono text-sm">
                  {new Date(data.lastUpdated).toLocaleTimeString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gray-800/30 border border-gray-700/50 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">About Analytics</h2>
          <div className="space-y-2 text-gray-400 text-sm">
            <p>
              📊 This dashboard displays metrics from your Coder1 IDE sessions, including AI conversations,
              patterns detected, and estimated time saved.
            </p>
            <p>
              🤖 Data is automatically captured from your terminal interactions with Claude Code and stored
              locally in your session database.
            </p>
            <p>
              ⏱️ Time saved is estimated at 5 minutes per successful AI conversation based on average
              manual coding time for similar tasks.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
