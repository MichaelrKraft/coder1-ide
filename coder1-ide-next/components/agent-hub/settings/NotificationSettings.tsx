'use client';

import { useState, useEffect } from 'react';
import { Save, Bell } from 'lucide-react';

const TRIGGER_OPTIONS = [
  { value: 'run_completed', label: 'Run Completed' },
  { value: 'run_failed', label: 'Run Failed' },
  { value: 'budget_alert', label: 'Budget Alert' },
  { value: 'task_completed', label: 'Task Completed' },
];

export default function NotificationSettings() {
  const [telegramBotToken, setTelegramBotToken] = useState('');
  const [telegramChatId, setTelegramChatId] = useState('');
  const [triggers, setTriggers] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/agent-hub/settings/notifications')
      .then((r) => r.json())
      .then((data) => {
        if (data.telegramBotToken) setTelegramBotToken(data.telegramBotToken);
        if (data.telegramChatId) setTelegramChatId(data.telegramChatId);
        if (data.triggers) setTriggers(data.triggers);
      })
      .catch(() => {});
  }, []);

  const toggleTrigger = (trigger: string) => {
    setTriggers((prev) =>
      prev.includes(trigger) ? prev.filter((t) => t !== trigger) : [...prev, trigger]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const res = await fetch('/api/agent-hub/settings/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegramBotToken, telegramChatId, triggers }),
      });
      if (!res.ok) throw new Error('Save failed');
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Bell className="w-4 h-4 text-coder1-cyan" />
        <h2 className="text-sm font-semibold text-text-primary">Notifications</h2>
      </div>
      <p className="text-xs text-text-muted">
        Configure Telegram notifications for agent events. Get alerts when runs complete, fail, or hit budget limits.
      </p>

      <div className="space-y-4">
        <div>
          <label className="block text-xs text-text-secondary mb-1">Telegram Bot Token</label>
          <input
            type="password"
            value={telegramBotToken}
            onChange={(e) => setTelegramBotToken(e.target.value)}
            className="w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-coder1-cyan/50"
            placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
          />
        </div>

        <div>
          <label className="block text-xs text-text-secondary mb-1">Telegram Chat ID</label>
          <input
            type="text"
            value={telegramChatId}
            onChange={(e) => setTelegramChatId(e.target.value)}
            className="w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-coder1-cyan/50"
            placeholder="-1001234567890"
          />
        </div>

        <div>
          <label className="block text-xs text-text-secondary mb-2">Notification Triggers</label>
          <div className="space-y-2">
            {TRIGGER_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className="flex items-center gap-2 cursor-pointer group"
              >
                <div
                  className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                    triggers.includes(opt.value)
                      ? 'bg-coder1-cyan/20 border-coder1-cyan'
                      : 'bg-bg-tertiary border-border-default group-hover:border-coder1-cyan/50'
                  }`}
                  onClick={() => toggleTrigger(opt.value)}
                >
                  {triggers.includes(opt.value) && (
                    <svg className="w-2.5 h-2.5 text-coder1-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span
                  className="text-xs text-text-primary"
                  onClick={() => toggleTrigger(opt.value)}
                >
                  {opt.label}
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-coder1-cyan/10 text-coder1-cyan text-xs font-medium rounded hover:bg-coder1-cyan/20 transition-colors disabled:opacity-50"
        >
          <Save className="w-3 h-3" />
          {saving ? 'Saving...' : 'Save'}
        </button>
        {saved && <span className="text-xs text-green-400">Saved</span>}
        {error && <span className="text-xs text-red-400">{error}</span>}
      </div>
    </div>
  );
}
