'use client';

import { useState, useEffect } from 'react';
import { Save, DollarSign } from 'lucide-react';

export default function BudgetSettings() {
  const [monthlyCapCents, setMonthlyCapCents] = useState(10000);
  const [alertThresholdPercent, setAlertThresholdPercent] = useState(80);
  const [currentMonthSpendCents, setCurrentMonthSpendCents] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/agent-hub/settings/budget')
      .then((r) => r.json())
      .then((data) => {
        if (data.monthlyCapCents !== undefined) setMonthlyCapCents(data.monthlyCapCents);
        if (data.alertThresholdPercent !== undefined) setAlertThresholdPercent(data.alertThresholdPercent);
        if (data.currentMonthSpendCents !== undefined) setCurrentMonthSpendCents(data.currentMonthSpendCents);
      })
      .catch(() => {});
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const res = await fetch('/api/agent-hub/settings/budget', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monthlyCapCents, alertThresholdPercent }),
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

  const spendPercent = monthlyCapCents > 0 ? Math.min(100, (currentMonthSpendCents / monthlyCapCents) * 100) : 0;
  const isOverThreshold = spendPercent >= alertThresholdPercent;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <DollarSign className="w-4 h-4 text-coder1-cyan" />
        <h2 className="text-sm font-semibold text-text-primary">Budget Controls</h2>
      </div>
      <p className="text-xs text-text-muted">
        Set a global monthly spending cap and alert threshold for all agent runs.
      </p>

      <div className="space-y-4">
        {/* Current spend display */}
        <div className="bg-bg-tertiary border border-border-default rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-text-secondary">Current Month Spend</span>
            <span className={`text-sm font-semibold ${isOverThreshold ? 'text-red-400' : 'text-text-primary'}`}>
              ${(currentMonthSpendCents / 100).toFixed(2)} / ${(monthlyCapCents / 100).toFixed(2)}
            </span>
          </div>
          <div className="w-full h-2 bg-bg-primary rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                isOverThreshold ? 'bg-red-400' : 'bg-coder1-cyan'
              }`}
              style={{ width: `${spendPercent}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-[10px] text-text-muted">{spendPercent.toFixed(1)}% used</span>
            <span className="text-[10px] text-text-muted">Alert at {alertThresholdPercent}%</span>
          </div>
        </div>

        <div>
          <label className="block text-xs text-text-secondary mb-1">
            Global Monthly Cap (dollars)
          </label>
          <input
            type="number"
            min={0}
            step={1}
            value={monthlyCapCents / 100}
            onChange={(e) => setMonthlyCapCents(Math.max(0, Math.round(parseFloat(e.target.value || '0') * 100)))}
            className="w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-coder1-cyan/50"
          />
        </div>

        <div>
          <label className="block text-xs text-text-secondary mb-1">
            Alert Threshold (%)
          </label>
          <input
            type="number"
            min={0}
            max={100}
            value={alertThresholdPercent}
            onChange={(e) => setAlertThresholdPercent(Math.min(100, Math.max(0, parseInt(e.target.value || '0', 10))))}
            className="w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-coder1-cyan/50"
          />
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
