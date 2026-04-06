'use client';

import { useState, useEffect } from 'react';
import { Save, FileText } from 'lucide-react';

const MAX_SIZE = 4 * 1024;

export default function OwnerProfileEditor() {
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/agent-hub/settings/owner-profile')
      .then((r) => r.json())
      .then((data) => setContent(data.content || ''))
      .catch(() => {});
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const res = await fetch('/api/agent-hub/settings/owner-profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-coder1-cyan" />
          <h2 className="text-sm font-semibold text-text-primary">Owner Profile</h2>
        </div>
        <span
          className={`text-[10px] font-mono ${
            content.length > MAX_SIZE * 0.9 ? 'text-red-400' : 'text-text-muted'
          }`}
        >
          {content.length.toLocaleString()} / {MAX_SIZE.toLocaleString()} chars
        </span>
      </div>
      <p className="text-xs text-text-muted">
        Saved to ~/.coder1/owner.md. Injected as context into every agent run. Describe your role,
        brand voice, working preferences, and key decisions.
      </p>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value.slice(0, MAX_SIZE))}
        className="w-full h-64 bg-bg-tertiary border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary font-mono placeholder:text-text-muted focus:outline-none focus:border-coder1-cyan/50 resize-y"
        placeholder={`# Owner Profile\n\nI'm a solo founder building...`}
      />
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
