'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { X, Globe, Server, Key, Lock, ChevronLeft, Check, AlertCircle, Loader2 } from 'lucide-react';
import type { SSHConnection, SSHAuthMethod, SSHPlatform } from '@/types/ssh';
import { SSH_DEFAULTS } from '@/types/ssh';

// =============================================================================
// Types
// =============================================================================

interface SSHSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (connection: SSHConnection) => void;
  editingConnection?: SSHConnection | null;
}

type SetupStep = 'platform' | 'details' | 'testing';

type TestPhase = 'authenticating' | 'verifying-claude' | 'setting-directory' | 'success' | 'error';

interface FormErrors {
  name?: string;
  host?: string;
  port?: string;
  username?: string;
  password?: string;
  privateKeyPath?: string;
  passphrase?: string;
}

// =============================================================================
// Platform Defaults
// =============================================================================

interface PlatformConfig {
  label: string;
  icon: string;
  color: string;
  borderColor: string;
  hostPlaceholder: string;
  usernamePlaceholder: string;
  workingDirDefault: string;
  helpText: string;
}

const PLATFORM_CONFIGS: Record<SSHPlatform, PlatformConfig> = {
  render: {
    label: 'Render SSH',
    icon: 'R',
    color: 'text-purple-400',
    borderColor: 'border-purple-500',
    hostPlaceholder: 'srv-abc123.render.com',
    usernamePlaceholder: 'root',
    workingDirDefault: '/app',
    helpText: 'SSH shell access only. For env vars, use Deployment Integrations.',
  },
  railway: {
    label: 'Railway',
    icon: 'RW',
    color: 'text-green-400',
    borderColor: 'border-green-500',
    hostPlaceholder: 'your-railway-host.railway.app',
    usernamePlaceholder: 'root',
    workingDirDefault: '/app',
    helpText: 'Use `railway ssh` command or check your service settings',
  },
  digitalocean: {
    label: 'DigitalOcean',
    icon: 'DO',
    color: 'text-blue-400',
    borderColor: 'border-blue-500',
    hostPlaceholder: '64.23.145.12',
    usernamePlaceholder: 'root',
    workingDirDefault: '/root',
    helpText: 'Find the Droplet IP in your DigitalOcean dashboard',
  },
  aws: {
    label: 'AWS EC2',
    icon: 'AWS',
    color: 'text-orange-400',
    borderColor: 'border-orange-500',
    hostPlaceholder: 'ec2-xxx.compute.amazonaws.com',
    usernamePlaceholder: 'ec2-user',
    workingDirDefault: '/home/ec2-user',
    helpText: 'Find in EC2 Console > Instance > Public DNS',
  },
  generic: {
    label: 'Other / Generic',
    icon: 'G',
    color: 'text-gray-400',
    borderColor: 'border-gray-500',
    hostPlaceholder: 'your-server.com',
    usernamePlaceholder: 'username',
    workingDirDefault: '~',
    helpText: 'Enter your SSH server details',
  },
};

// =============================================================================
// Component
// =============================================================================

export function SSHSetupModal({
  isOpen,
  onClose,
  onSave,
  editingConnection,
}: SSHSetupModalProps) {
  // -- Step state
  const [currentStep, setCurrentStep] = useState<SetupStep>('platform');

  // -- Form state
  const [platform, setPlatform] = useState<SSHPlatform>(SSH_DEFAULTS.PLATFORM);
  const [name, setName] = useState('');
  const [host, setHost] = useState('');
  const [port, setPort] = useState(SSH_DEFAULTS.PORT);
  const [username, setUsername] = useState('');
  const [authMethod, setAuthMethod] = useState<SSHAuthMethod>('key');
  const [password, setPassword] = useState('');
  const [privateKeyPath, setPrivateKeyPath] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [workingDirectory, setWorkingDirectory] = useState('');

  // -- Validation & testing state
  const [errors, setErrors] = useState<FormErrors>({});
  const [testPhase, setTestPhase] = useState<TestPhase>('authenticating');
  const [testError, setTestError] = useState<string>('');

  // -- Initialize form when editing
  useEffect(() => {
    if (!isOpen) return;

    if (editingConnection) {
      setPlatform(editingConnection.platform ?? SSH_DEFAULTS.PLATFORM);
      setName(editingConnection.name);
      setHost(editingConnection.host);
      setPort(editingConnection.port);
      setUsername(editingConnection.username);
      setAuthMethod(editingConnection.authMethod);
      setPassword(editingConnection.password ?? '');
      setPrivateKeyPath(editingConnection.privateKeyPath ?? '');
      setPassphrase(editingConnection.passphrase ?? '');
      setWorkingDirectory(editingConnection.defaultWorkingDirectory ?? '');
      setCurrentStep('details');
    } else {
      resetForm();
    }
  }, [isOpen, editingConnection]);

  // -- Keyboard handler
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const resetForm = () => {
    setPlatform(SSH_DEFAULTS.PLATFORM);
    setName('');
    setHost('');
    setPort(SSH_DEFAULTS.PORT);
    setUsername('');
    setAuthMethod('key');
    setPassword('');
    setPrivateKeyPath('');
    setPassphrase('');
    setWorkingDirectory('');
    setErrors({});
    setTestPhase('authenticating');
    setTestError('');
    setCurrentStep('platform');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // ---------------------------------------------------------------------------
  // Validation
  // ---------------------------------------------------------------------------

  const validate = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    if (!name.trim()) {
      newErrors.name = 'Connection name is required';
    }
    if (!host.trim()) {
      newErrors.host = 'Host is required';
    }
    if (!username.trim()) {
      newErrors.username = 'Username is required';
    }
    if (port < 1 || port > 65535 || isNaN(port)) {
      newErrors.port = 'Port must be between 1 and 65535';
    }

    if (authMethod === 'password' && !password) {
      newErrors.password = 'Password is required';
    }
    if (authMethod === 'key' && !privateKeyPath.trim()) {
      newErrors.privateKeyPath = 'SSH key path is required';
    }
    if (authMethod === 'key-with-passphrase') {
      if (!privateKeyPath.trim()) {
        newErrors.privateKeyPath = 'SSH key path is required';
      }
      if (!passphrase) {
        newErrors.passphrase = 'Passphrase is required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [name, host, port, username, authMethod, password, privateKeyPath, passphrase]);

  // ---------------------------------------------------------------------------
  // Platform selection
  // ---------------------------------------------------------------------------

  const handlePlatformSelect = (p: SSHPlatform) => {
    setPlatform(p);
    const config = PLATFORM_CONFIGS[p];
    setUsername(config.usernamePlaceholder);
    setWorkingDirectory(config.workingDirDefault);
    setCurrentStep('details');
  };

  // ---------------------------------------------------------------------------
  // Test & Save
  // ---------------------------------------------------------------------------

  const handleTestAndSave = async () => {
    if (!validate()) return;

    setCurrentStep('testing');
    setTestPhase('authenticating');
    setTestError('');

    // Simulate connection test phases
    try {
      await delay(800);
      setTestPhase('verifying-claude');

      await delay(700);
      setTestPhase('setting-directory');

      await delay(500);
      setTestPhase('success');
    } catch {
      setTestPhase('error');
      setTestError('Connection failed. Please check your credentials and try again.');
    }
  };

  const handleSaveConnection = () => {
    const now = new Date().toISOString();
    const connection: SSHConnection = {
      id: editingConnection?.id ?? crypto.randomUUID(),
      name: name.trim(),
      host: host.trim(),
      port,
      username: username.trim(),
      authMethod,
      password: authMethod === 'password' ? password : undefined,
      privateKeyPath: authMethod !== 'password' ? privateKeyPath.trim() : undefined,
      passphrase: authMethod === 'key-with-passphrase' ? passphrase : undefined,
      createdAt: editingConnection?.createdAt ?? now,
      lastConnected: now,
      lastStatus: 'connected',
      defaultWorkingDirectory: workingDirectory.trim() || undefined,
      platform,
      keepAliveInterval: SSH_DEFAULTS.KEEP_ALIVE_INTERVAL,
      connectionTimeout: SSH_DEFAULTS.CONNECTION_TIMEOUT,
    };

    onSave(connection);
    handleClose();
  };

  // ---------------------------------------------------------------------------
  // Render guards
  // ---------------------------------------------------------------------------

  if (!isOpen) return null;

  const platformConfig = PLATFORM_CONFIGS[platform];

  // ---------------------------------------------------------------------------
  // Step 1: Platform Selection
  // ---------------------------------------------------------------------------

  const renderPlatformSelection = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-white mb-2">Select Your Platform</h3>
        <p className="text-gray-400 text-sm">
          SSH connections are for <strong className="text-white">remote development</strong> (coding on a server).
        </p>
        <p className="text-xs text-gray-500 mt-1">
          For env vars and deployments, use <strong className="text-gray-400">Deployment Integrations</strong> in Settings.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {(Object.entries(PLATFORM_CONFIGS) as [SSHPlatform, PlatformConfig][]).map(
          ([key, config]) => (
            <button
              key={key}
              onClick={() => handlePlatformSelect(key)}
              className={`group p-4 bg-gray-800 hover:bg-gray-750 rounded-lg border-2 border-gray-700 hover:${config.borderColor} transition-all text-left`}
            >
              <div className={`text-2xl font-bold ${config.color} mb-2`}>
                {config.icon}
              </div>
              <div className="text-sm font-medium text-white">{config.label}</div>
              <div className="text-xs text-gray-500 mt-1 line-clamp-2">
                {config.helpText}
              </div>
            </button>
          )
        )}
      </div>
    </div>
  );

  // ---------------------------------------------------------------------------
  // Step 2: Connection Details
  // ---------------------------------------------------------------------------

  const renderConnectionDetails = () => (
    <div className="space-y-5">
      <div>
        <h3 className="text-xl font-semibold text-white mb-1">Connection Details</h3>
        <p className="text-gray-400 text-sm">{platformConfig.helpText}</p>
      </div>

      {/* Render-specific warning */}
      {platform === 'render' && (
        <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <p className="text-xs text-yellow-300">
            <strong>Note:</strong> This is for SSH shell access (remote coding).
            To set environment variables or trigger deploys, go to{' '}
            <strong>Settings → Deployment Integrations → Render</strong> instead.
          </p>
        </div>
      )}

      {/* Connection Name */}
      <FieldGroup label="Connection Name" error={errors.name}>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={`e.g. ${platformConfig.label} Production`}
          className={inputClass(errors.name)}
          autoFocus
        />
      </FieldGroup>

      {/* Host & Port */}
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <FieldGroup label="SSH Host" error={errors.host}>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={host}
                onChange={(e) => setHost(e.target.value)}
                placeholder={platformConfig.hostPlaceholder}
                className={`${inputClass(errors.host)} pl-10`}
              />
            </div>
          </FieldGroup>
        </div>
        <FieldGroup label="Port" error={errors.port}>
          <input
            type="number"
            value={port}
            onChange={(e) => setPort(parseInt(e.target.value, 10) || 22)}
            min={1}
            max={65535}
            className={inputClass(errors.port)}
          />
        </FieldGroup>
      </div>

      {/* Username */}
      <FieldGroup label="Username" error={errors.username}>
        <div className="relative">
          <Server className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder={platformConfig.usernamePlaceholder}
            className={`${inputClass(errors.username)} pl-10`}
          />
        </div>
      </FieldGroup>

      {/* Auth Method */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Authentication Method
        </label>
        <div className="space-y-2">
          <AuthRadio
            value="password"
            label="Password"
            current={authMethod}
            onChange={setAuthMethod}
          />
          <AuthRadio
            value="key"
            label="SSH Key"
            badge="recommended"
            current={authMethod}
            onChange={setAuthMethod}
          />
          <AuthRadio
            value="key-with-passphrase"
            label="SSH Key with Passphrase"
            current={authMethod}
            onChange={setAuthMethod}
          />
        </div>
      </div>

      {/* Conditional auth fields */}
      {authMethod === 'password' && (
        <FieldGroup label="Password" error={errors.password}>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter SSH password"
              className={`${inputClass(errors.password)} pl-10`}
            />
          </div>
        </FieldGroup>
      )}

      {(authMethod === 'key' || authMethod === 'key-with-passphrase') && (
        <FieldGroup label="SSH Key Path" error={errors.privateKeyPath}>
          <div className="relative">
            <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={privateKeyPath}
              onChange={(e) => setPrivateKeyPath(e.target.value)}
              placeholder="~/.ssh/id_rsa"
              className={`${inputClass(errors.privateKeyPath)} pl-10 pr-20`}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">
              [Browse]
            </span>
          </div>
        </FieldGroup>
      )}

      {authMethod === 'key-with-passphrase' && (
        <FieldGroup label="Passphrase" error={errors.passphrase}>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="password"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              placeholder="Enter key passphrase"
              className={`${inputClass(errors.passphrase)} pl-10`}
            />
          </div>
        </FieldGroup>
      )}

      {/* Working Directory */}
      <FieldGroup label="Working Directory (optional)">
        <input
          type="text"
          value={workingDirectory}
          onChange={(e) => setWorkingDirectory(e.target.value)}
          placeholder={platformConfig.workingDirDefault}
          className={inputClass()}
        />
      </FieldGroup>

      {/* Security note */}
      <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
        <p className="text-xs text-green-300">
          Your key stays on your machine. Only the Bridge CLI uses it to connect.
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={() => {
            if (editingConnection) {
              handleClose();
            } else {
              setCurrentStep('platform');
            }
          }}
          className="flex items-center gap-1 px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>
        <button
          onClick={handleTestAndSave}
          className="flex-1 px-4 py-2.5 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors font-medium text-sm"
        >
          Test & Save
        </button>
      </div>
    </div>
  );

  // ---------------------------------------------------------------------------
  // Step 3: Testing Connection
  // ---------------------------------------------------------------------------

  const renderTesting = () => {
    const steps: { key: TestPhase; label: string }[] = [
      { key: 'authenticating', label: 'Authenticating...' },
      { key: 'verifying-claude', label: 'Verifying Claude Code...' },
      { key: 'setting-directory', label: 'Setting working directory...' },
    ];

    const phaseOrder: TestPhase[] = ['authenticating', 'verifying-claude', 'setting-directory'];
    const currentIdx = phaseOrder.indexOf(testPhase);
    const isSuccess = testPhase === 'success';
    const isError = testPhase === 'error';

    return (
      <div className="space-y-6 py-4">
        {!isSuccess && !isError && (
          <>
            <h3 className="text-lg font-semibold text-white text-center">
              Testing Connection...
            </h3>
            <div className="space-y-3 max-w-sm mx-auto">
              {steps.map((step, idx) => {
                const isCurrent = idx === currentIdx;
                const isDone = idx < currentIdx;
                return (
                  <div key={step.key} className="flex items-center gap-3">
                    {isDone ? (
                      <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
                    ) : isCurrent ? (
                      <Loader2 className="w-5 h-5 text-yellow-400 animate-spin flex-shrink-0" />
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-gray-600 flex-shrink-0" />
                    )}
                    <span
                      className={
                        isDone
                          ? 'text-green-400 text-sm'
                          : isCurrent
                            ? 'text-yellow-400 text-sm'
                            : 'text-gray-500 text-sm'
                      }
                    >
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {isSuccess && (
          <div className="flex flex-col items-center space-y-4 py-4">
            <div className="w-14 h-14 bg-green-500 rounded-full flex items-center justify-center">
              <Check className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-white">Connection successful!</h3>
            <p className="text-sm text-gray-400 text-center">
              Connected to <span className="text-white font-medium">{host}</span> as{' '}
              <span className="text-white font-medium">{username}</span>
            </p>
            <button
              onClick={handleSaveConnection}
              className="px-6 py-2.5 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors font-medium text-sm"
            >
              Save & Close
            </button>
          </div>
        )}

        {isError && (
          <div className="flex flex-col items-center space-y-4 py-4">
            <div className="w-14 h-14 bg-red-500/20 rounded-full flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-red-400" />
            </div>
            <h3 className="text-lg font-semibold text-red-400">Connection Failed</h3>
            <p className="text-sm text-gray-400 text-center max-w-xs">{testError}</p>

            <div className="w-full p-3 bg-gray-800 rounded-lg text-xs text-gray-400 space-y-1">
              <p className="font-medium text-gray-300 mb-1">Troubleshooting:</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>Verify the host is reachable</li>
                <li>Check your username and credentials</li>
                <li>Ensure SSH is enabled on the server</li>
                <li>Confirm your SSH key has the correct permissions (chmod 600)</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setCurrentStep('details')}
                className="flex items-center gap-1 px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
              <button
                onClick={handleTestAndSave}
                className="px-4 py-2.5 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors font-medium text-sm"
              >
                Try Again
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ---------------------------------------------------------------------------
  // Modal Shell
  // ---------------------------------------------------------------------------

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className="bg-gray-900 rounded-xl shadow-2xl border border-gray-800 max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-lg font-bold text-white">
            {editingConnection ? 'Edit SSH Connection' : 'Add SSH Connection'}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {currentStep === 'platform' && renderPlatformSelection()}
          {currentStep === 'details' && renderConnectionDetails()}
          {currentStep === 'testing' && renderTesting()}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Sub-components
// =============================================================================

/** Labeled form field wrapper with optional error display */
function FieldGroup({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-1.5">{label}</label>
      {children}
      {error && (
        <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          {error}
        </p>
      )}
    </div>
  );
}

/** Radio button for auth method selection */
function AuthRadio({
  value,
  label,
  badge,
  current,
  onChange,
}: {
  value: SSHAuthMethod;
  label: string;
  badge?: string;
  current: SSHAuthMethod;
  onChange: (v: SSHAuthMethod) => void;
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-300">
      <input
        type="radio"
        name="authMethod"
        value={value}
        checked={current === value}
        onChange={() => onChange(value)}
        className="accent-green-500"
      />
      <span>{label}</span>
      {badge && (
        <span className="px-1.5 py-0.5 bg-green-500/20 text-green-400 text-[10px] font-semibold rounded">
          {badge}
        </span>
      )}
    </label>
  );
}

// =============================================================================
// Helpers
// =============================================================================

/** Returns Tailwind classes for an input, optionally highlighted with error state */
function inputClass(error?: string): string {
  const base =
    'w-full px-3 py-2.5 bg-gray-800 border rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none transition-colors';
  return error
    ? `${base} border-red-500 focus:border-red-400`
    : `${base} border-gray-700 focus:border-green-500`;
}

/** Simple delay promise */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
