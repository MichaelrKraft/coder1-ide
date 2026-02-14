'use client';

import React, { useState } from 'react';
import { APIKeyStorage, APIProvider } from '@/lib/api-key-storage';

interface APIKeySetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
  defaultProvider?: APIProvider;
}

type SetupStep = 'provider-selection' | 'glm-setup' | 'anthropic-setup' | 'validation' | 'success';

interface ValidationState {
  isValidating: boolean;
  isValid: boolean | null;
  error: string | null;
  message: string | null;
}

export function APIKeySetupModal({ 
  isOpen, 
  onClose, 
  onComplete,
  defaultProvider 
}: APIKeySetupModalProps) {
  const [currentStep, setCurrentStep] = useState<SetupStep>(
    defaultProvider ? `${defaultProvider}-setup` as SetupStep : 'provider-selection'
  );
  const [selectedProvider, setSelectedProvider] = useState<APIProvider | null>(
    defaultProvider || null
  );
  const [apiKey, setApiKey] = useState('');
  const [validation, setValidation] = useState<ValidationState>({
    isValidating: false,
    isValid: null,
    error: null,
    message: null
  });
  const [preference, setPreference] = useState<'glm' | 'anthropic' | 'auto'>('auto');

  if (!isOpen) return null;

  const handleProviderSelect = (provider: APIProvider) => {
    setSelectedProvider(provider);
    setCurrentStep(`${provider}-setup` as SetupStep);
  };

  const handleValidateAndSave = async () => {
    if (!selectedProvider || !apiKey) {
      setValidation({
        isValidating: false,
        isValid: false,
        error: 'Provider and API key are required',
        message: null
      });
      return;
    }

    setValidation({
      isValidating: true,
      isValid: null,
      error: null,
      message: null
    });
    setCurrentStep('validation');

    try {
      const response = await fetch('/api/settings/validate-api-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: selectedProvider,
          apiKey: apiKey
        })
      });

      const result = await response.json();

      if (result.valid) {
        await APIKeyStorage.saveKey(selectedProvider, apiKey);
        
        if (preference !== 'auto') {
          APIKeyStorage.setPreferredProvider(preference);
        }

        setValidation({
          isValidating: false,
          isValid: true,
          error: null,
          message: result.message || 'API key validated and saved successfully'
        });
        setCurrentStep('success');

        setTimeout(() => {
          if (onComplete) onComplete();
          handleClose();
        }, 2000);

      } else {
        setValidation({
          isValidating: false,
          isValid: false,
          error: result.error || 'Validation failed',
          message: null
        });
        setCurrentStep(`${selectedProvider}-setup` as SetupStep);
      }

    } catch (error) {
      console.error('[APIKeySetupModal] Validation error:', error);
      setValidation({
        isValidating: false,
        isValid: false,
        error: 'Network error. Please check your connection and try again.',
        message: null
      });
      setCurrentStep(`${selectedProvider}-setup` as SetupStep);
    }
  };

  const handleClose = () => {
    setCurrentStep(defaultProvider ? `${defaultProvider}-setup` as SetupStep : 'provider-selection');
    setSelectedProvider(defaultProvider || null);
    setApiKey('');
    setValidation({
      isValidating: false,
      isValid: null,
      error: null,
      message: null
    });
    onClose();
  };

  const renderProviderSelection = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-white mb-2">Choose Your AI Provider</h3>
        <p className="text-gray-400">
          Select an AI provider to enable Parallel Exploration (AI Team) feature
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={() => handleProviderSelect('glm')}
          className="group relative p-6 bg-gray-800 hover:bg-gray-750 rounded-lg border-2 border-gray-700 hover:border-green-500 transition-all text-left"
        >
          <div className="absolute top-4 right-4">
            <span className="px-3 py-1 bg-green-500 text-white text-xs font-bold rounded-full">
              RECOMMENDED
            </span>
          </div>
          
          <div className="mb-4">
            <h4 className="text-lg font-semibold text-white mb-2">智谱 GLM 4.6</h4>
            <div className="flex items-baseline gap-2 mb-3">
              <span className="text-3xl font-bold text-green-400">$0.10</span>
              <span className="text-gray-400">/ million tokens</span>
            </div>
          </div>

          <ul className="space-y-2 text-sm text-gray-300 mb-4">
            <li className="flex items-center gap-2">
              <span className="text-green-400">✓</span>
              <span>30x cheaper than Anthropic</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-400">✓</span>
              <span>Comparable quality to Claude</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-400">✓</span>
              <span>5-minute setup</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-400">✓</span>
              <span>Free tier available</span>
            </li>
          </ul>

          <div className="pt-4 border-t border-gray-700">
            <p className="text-xs text-gray-400">
              Get your API key from <span className="text-blue-400">open.bigmodel.cn</span>
            </p>
          </div>
        </button>

        <button
          onClick={() => handleProviderSelect('anthropic')}
          className="group p-6 bg-gray-800 hover:bg-gray-750 rounded-lg border-2 border-gray-700 hover:border-blue-500 transition-all text-left"
        >
          <div className="mb-4">
            <h4 className="text-lg font-semibold text-white mb-2">Anthropic Claude</h4>
            <div className="flex items-baseline gap-2 mb-3">
              <span className="text-3xl font-bold text-blue-400">$3.00</span>
              <span className="text-gray-400">/ million tokens</span>
            </div>
          </div>

          <ul className="space-y-2 text-sm text-gray-300 mb-4">
            <li className="flex items-center gap-2">
              <span className="text-blue-400">✓</span>
              <span>Premium quality responses</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-blue-400">✓</span>
              <span>Large context windows</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-blue-400">✓</span>
              <span>Advanced reasoning</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-blue-400">✓</span>
              <span>Industry standard</span>
            </li>
          </ul>

          <div className="pt-4 border-t border-gray-700">
            <p className="text-xs text-gray-400">
              Get your API key from <span className="text-blue-400">console.anthropic.com</span>
            </p>
          </div>
        </button>
      </div>

      <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
        <p className="text-sm text-blue-300">
          💡 <strong>Pro Tip:</strong> Start with GLM for cost-effective exploration, 
          then upgrade to Anthropic if you need premium quality.
        </p>
      </div>
    </div>
  );

  const renderGLMSetup = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-white mb-2">GLM API Key Setup</h3>
        <p className="text-gray-400">Get your API key from 智谱AI (ZhipuAI)</p>
      </div>

      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-semibold text-white mb-2">Step 1: Create Account</h4>
          <ol className="list-decimal list-inside space-y-1 text-sm text-gray-400 ml-4">
            <li>Visit <a href="https://open.bigmodel.cn" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">open.bigmodel.cn</a></li>
            <li>Click &quot;注册&quot; (Register) or &quot;登录&quot; (Login)</li>
            <li>Complete registration using phone or email</li>
          </ol>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-white mb-2">Step 2: Get API Key</h4>
          <ol className="list-decimal list-inside space-y-1 text-sm text-gray-400 ml-4">
            <li>Navigate to &quot;API Keys&quot; section in dashboard</li>
            <li>Click &quot;Create API Key&quot; button</li>
            <li>Copy your new API key (format: <code className="text-xs bg-gray-800 px-1 py-0.5 rounded">xxxx.xxxx</code>)</li>
          </ol>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-white mb-2">Step 3: Enter Your API Key</h4>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Enter your GLM API key (e.g., 404684ddd055469d9de62d085e114e54.ZR5bbmvOf8jC5qWZ)"
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
          />
          <p className="mt-2 text-xs text-gray-400">
            Expected format: <code className="bg-gray-800 px-1 py-0.5 rounded">[32-hex-chars].[16-alphanumeric]</code>
          </p>
        </div>

        {validation.error && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p className="text-sm text-red-300">
              <strong>❌ Error:</strong> {validation.error}
            </p>
            <p className="text-xs text-red-400 mt-2">
              Please check your API key format and try again.
            </p>
          </div>
        )}

        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm text-gray-300">
            <input
              type="radio"
              name="preference"
              value="glm"
              checked={preference === 'glm'}
              onChange={() => setPreference('glm')}
              className="text-green-500"
            />
            <span>Always use GLM (cost-optimized)</span>
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-300">
            <input
              type="radio"
              name="preference"
              value="auto"
              checked={preference === 'auto'}
              onChange={() => setPreference('auto')}
              className="text-blue-500"
            />
            <span>Auto-select based on availability</span>
          </label>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => setCurrentStep('provider-selection')}
          className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
        >
          ← Back
        </button>
        <button
          onClick={handleValidateAndSave}
          disabled={!apiKey || validation.isValidating}
          className="flex-1 px-4 py-3 bg-green-500 hover:bg-green-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-semibold"
        >
          {validation.isValidating ? 'Validating...' : 'Validate & Save'}
        </button>
      </div>
    </div>
  );

  const renderAnthropicSetup = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-white mb-2">Anthropic API Key Setup</h3>
        <p className="text-gray-400">Get your API key from Anthropic Console</p>
      </div>

      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-semibold text-white mb-2">Step 1: Create Account</h4>
          <ol className="list-decimal list-inside space-y-1 text-sm text-gray-400 ml-4">
            <li>Visit <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">console.anthropic.com</a></li>
            <li>Click &quot;Sign Up&quot; or &quot;Log In&quot;</li>
            <li>Complete registration using email</li>
          </ol>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-white mb-2">Step 2: Get API Key</h4>
          <ol className="list-decimal list-inside space-y-1 text-sm text-gray-400 ml-4">
            <li>Navigate to &quot;API Keys&quot; section</li>
            <li>Click &quot;Create Key&quot; button</li>
            <li>Copy your new API key (starts with <code className="text-xs bg-gray-800 px-1 py-0.5 rounded">sk-ant-</code>)</li>
          </ol>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-white mb-2">Step 3: Enter Your API Key</h4>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Enter your Anthropic API key (starts with sk-ant-)"
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
          <p className="mt-2 text-xs text-gray-400">
            Must start with: <code className="bg-gray-800 px-1 py-0.5 rounded">sk-ant-</code>
          </p>
        </div>

        {validation.error && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p className="text-sm text-red-300">
              <strong>❌ Error:</strong> {validation.error}
            </p>
            <p className="text-xs text-red-400 mt-2">
              Please check your API key format and try again.
            </p>
          </div>
        )}

        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm text-gray-300">
            <input
              type="radio"
              name="preference"
              value="anthropic"
              checked={preference === 'anthropic'}
              onChange={() => setPreference('anthropic')}
              className="text-blue-500"
            />
            <span>Always use Anthropic (premium quality)</span>
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-300">
            <input
              type="radio"
              name="preference"
              value="auto"
              checked={preference === 'auto'}
              onChange={() => setPreference('auto')}
              className="text-blue-500"
            />
            <span>Auto-select based on availability</span>
          </label>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => setCurrentStep('provider-selection')}
          className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
        >
          ← Back
        </button>
        <button
          onClick={handleValidateAndSave}
          disabled={!apiKey || validation.isValidating}
          className="flex-1 px-4 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-semibold"
        >
          {validation.isValidating ? 'Validating...' : 'Validate & Save'}
        </button>
      </div>
    </div>
  );

  const renderValidation = () => (
    <div className="flex flex-col items-center justify-center py-12 space-y-6">
      <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-700 border-t-green-500"></div>
      <div className="text-center">
        <h3 className="text-xl font-semibold text-white mb-2">Validating API Key...</h3>
        <p className="text-gray-400">
          Testing connection to {selectedProvider === 'glm' ? 'GLM' : 'Anthropic'} servers
        </p>
      </div>
    </div>
  );

  const renderSuccess = () => (
    <div className="flex flex-col items-center justify-center py-12 space-y-6">
      <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center">
        <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <div className="text-center">
        <h3 className="text-xl font-semibold text-white mb-2">API Key Validated!</h3>
        <p className="text-gray-400">
          {validation.message || 'Your API key has been saved successfully'}
        </p>
        <p className="text-sm text-gray-500 mt-2">
          You can now use the AI Team (Parallel Exploration) feature
        </p>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-xl shadow-2xl border border-gray-800 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">
            API Key Setup - AI Team
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          {currentStep === 'provider-selection' && renderProviderSelection()}
          {currentStep === 'glm-setup' && renderGLMSetup()}
          {currentStep === 'anthropic-setup' && renderAnthropicSetup()}
          {currentStep === 'validation' && renderValidation()}
          {currentStep === 'success' && renderSuccess()}
        </div>
      </div>
    </div>
  );
}
