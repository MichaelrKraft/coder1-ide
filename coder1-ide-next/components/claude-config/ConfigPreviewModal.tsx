'use client';

import React, { useState } from 'react';
import { X, Download, Shield, DollarSign, Sparkles, ChevronRight } from 'lucide-react';
import { ConfigPreview } from '@/lib/claude-config/types';
import { CapabilitiesList } from './CapabilitiesList';
import { PermissionsView } from './PermissionsView';
import { CostEstimate } from './CostEstimate';
import { permissionAnalyzer } from '@/lib/claude-config';

interface ConfigPreviewModalProps {
  preview: ConfigPreview | null;
  isOpen: boolean;
  onClose: () => void;
  onInstall: (location: 'local' | 'global') => void;
}

export function ConfigPreviewModal({ preview, isOpen, onClose, onInstall }: ConfigPreviewModalProps) {
  const [activeTab, setActiveTab] = useState<'preview' | 'content'>('preview');
  const [selectedLocation, setSelectedLocation] = useState<'local' | 'global'>('local');

  if (!isOpen || !preview) return null;

  const permissionAnalysis = permissionAnalyzer.analyzePermissions(preview.permissions);
  const riskScore = permissionAnalyzer.calculateRiskScore(preview.permissions);
  const riskLevel = permissionAnalyzer.getRiskLevel(riskScore);

  const handleInstall = () => {
    onInstall(selectedLocation);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-4xl max-h-[85vh] mx-4 bg-[#0a0a0a] rounded-2xl shadow-2xl overflow-hidden border border-cyan-500/30">
        {/* Header */}
        <div className="relative h-24 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 overflow-hidden">
          <div className="absolute inset-0 bg-black/20" />
          
          <div className="relative h-full flex items-center justify-between px-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
                <Sparkles className="w-6 h-6" />
                {preview.template.name}
              </h2>
              <p className="text-blue-100 text-sm">{preview.template.description}</p>
            </div>
            
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 px-6 pt-4 border-b border-cyan-500/20">
          <button
            onClick={() => setActiveTab('preview')}
            className={`px-4 py-2 rounded-t-lg font-medium transition-all ${
              activeTab === 'preview'
                ? 'bg-gray-800 text-white border-b-2 border-blue-500'
                : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('content')}
            className={`px-4 py-2 rounded-t-lg font-medium transition-all ${
              activeTab === 'content'
                ? 'bg-gray-800 text-white border-b-2 border-blue-500'
                : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
            }`}
          >
            View Content
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-6" style={{ maxHeight: 'calc(85vh - 200px)' }}>
          {activeTab === 'preview' ? (
            <div className="space-y-6">
              {/* Capabilities */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-blue-400" />
                  What This Config Does
                </h3>
                <CapabilitiesList capabilities={preview.capabilities} />
              </div>

              {/* Permissions & Security */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-blue-400" />
                  Permissions & Security
                </h3>
                <PermissionsView 
                  permissions={preview.permissions}
                  analysis={permissionAnalysis}
                />
              </div>

              {/* Cost Estimate */}
              {preview.estimatedCost > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-blue-400" />
                    Cost Estimate
                  </h3>
                  <CostEstimate estimate={preview.estimatedCost} />
                </div>
              )}
            </div>
          ) : (
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">Config Content</h3>
              <div className="bg-black/60 border border-cyan-500/30 rounded-lg p-4 overflow-auto">
                <pre className="text-sm text-cyan-100/80 whitespace-pre-wrap font-mono">
                  {preview.content}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-cyan-500/20 bg-gradient-to-r from-cyan-500/5 via-purple-500/5 to-orange-500/5 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-cyan-300/70 font-semibold mb-2">Install Location:</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setSelectedLocation('local')}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    selectedLocation === 'local'
                      ? 'bg-blue-500 text-white'
                      : 'bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 border border-cyan-500/30'
                  }`}
                >
                  Local (.claude/)
                </button>
                <button
                  onClick={() => setSelectedLocation('global')}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    selectedLocation === 'global'
                      ? 'bg-blue-500 text-white'
                      : 'bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 border border-cyan-500/30'
                  }`}
                >
                  Global (~/.claude/)
                </button>
              </div>
              <p className="text-xs text-cyan-300/50 mt-2">
                {selectedLocation === 'local' 
                  ? 'Config will only apply to this project'
                  : 'Config will apply to all projects'
                }
              </p>
            </div>

            <button
              onClick={handleInstall}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold rounded-lg transition-all transform hover:scale-105 flex items-center gap-2"
            >
              <Download className="w-5 h-5" />
              Install Config
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Risk Warning */}
          {riskLevel !== 'low' && (
            <div className={`p-3 rounded-lg border ${
              riskLevel === 'high' 
                ? 'bg-red-900/20 border-red-700/30' 
                : 'bg-yellow-900/20 border-yellow-700/30'
            }`}>
              <p className={`text-sm ${
                riskLevel === 'high' ? 'text-red-300' : 'text-yellow-300'
              }`}>
                <strong>Security Notice:</strong> This config has {riskLevel} risk level (score: {riskScore}/100). 
                Review the permissions and content carefully before installing.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
