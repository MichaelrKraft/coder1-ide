'use strict';
/**
 * Morning Brief render script
 * Usage: node scripts/morning-brief/render.js [YYYY-MM-DD | sample]
 * Reads:  ./public/morning-briefs/brief-data-{date}.json
 * Writes: ./public/morning-briefs/{date}.html
 *         ./public/morning-briefs/index.html  (archive)
 */

const fs   = require('fs');
const path = require('path');

// ─── Paths ────────────────────────────────────────────────────────────────────
const ROOT       = path.resolve(__dirname, '../../');
const BRIEFS_DIR = path.join(ROOT, 'public', 'morning-briefs');

// ─── Helpers ──────────────────────────────────────────────────────────────────
function safe(val, fallback = '') {
  return (val === null || val === undefined) ? fallback : val;
}

function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─── Inline Lucide SVG Icons (no CDN, instant load) ──────────────────────────
const ICON_PATHS = {
  'sun':             '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
  'cloud-sun':       '<path d="M12 2v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="M20 12h2"/><path d="m19.07 4.93-1.41 1.41"/><path d="M15.947 12.65a4 4 0 0 0-5.925-4.128"/><path d="M13 22H7a5 5 0 1 1 4.9-6H13a3 3 0 0 1 0 6Z"/>',
  'cloud':           '<path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>',
  'cloud-rain':      '<path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M16 14v6"/><path d="M8 14v6"/><path d="M12 16v6"/>',
  'snowflake':       '<line x1="2" x2="22" y1="12" y2="12"/><line x1="12" x2="12" y1="2" y2="22"/><path d="m20 16-4-4 4-4"/><path d="m4 8 4 4-4 4"/><path d="m16 4-4 4-4-4"/><path d="m8 20 4-4 4 4"/>',
  'cloud-lightning': '<path d="M6 16.326A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 .5 8.973"/><path d="m13 12-3 5h4l-3 5"/>',
  'wind':            '<path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2"/><path d="M9.6 4.6A2 2 0 1 1 11 8H2"/><path d="M12.6 19.4A2 2 0 1 0 14 16H2"/>',
  'play':            '<polygon points="6 3 20 12 6 21 6 3"/>',
  'moon':            '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
  'target':          '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
  'radio':           '<path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/><path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"/><circle cx="12" cy="12" r="2"/><path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"/><path d="M19.1 4.9C23 8.8 23 15.2 19.1 19.1"/>',
  'play-square':     '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="m9 8 6 4-6 4Z"/>',
  'alert-triangle':  '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  'zap':             '<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>',
  'info':            '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
  'check-circle':    '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
  'x-circle':        '<circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/>',
  'arrow-right':     '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  'lightbulb':       '<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/>',
  'sparkles':        '<path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/>',
  'shield-check':    '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
  'code-2':          '<path d="m18 16 4-4-4-4"/><path d="m6 8-4 4 4 4"/><path d="m14.5 4-5 16"/>',
  'mail':            '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
  'book-open':       '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
  'send':            '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
  'minus-circle':    '<circle cx="12" cy="12" r="10"/><path d="M8 12h8"/>',
  'newspaper':       '<path d="M4 3h16a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M8 7h8M8 11h8M8 15h4"/>',
  'history':         '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>',
};

function svgIcon(name, size = 16, color = 'currentColor', extraStyle = '') {
  const p = ICON_PATHS[name] || '';
  if (!p) return '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;flex-shrink:0;${extraStyle}">${p}</svg>`;
}

function weatherIcon(condition, size = 30) {
  const c = (condition || '').toLowerCase();
  if (c.includes('sunny') || c.includes('clear')) return svgIcon('sun', size, '#F59E0B');
  if (c.includes('partly')) return svgIcon('cloud-sun', size, '#60A5FA');
  if (c.includes('cloudy') || c.includes('overcast')) return svgIcon('cloud', size, '#94A3B8');
  if (c.includes('rain') || c.includes('drizzle')) return svgIcon('cloud-rain', size, '#60A5FA');
  if (c.includes('snow')) return svgIcon('snowflake', size, '#BAE6FD');
  if (c.includes('thunder') || c.includes('storm')) return svgIcon('cloud-lightning', size, '#F59E0B');
  if (c.includes('fog') || c.includes('mist') || c.includes('wind')) return svgIcon('wind', size, '#94A3B8');
  return svgIcon('cloud-sun', size, '#60A5FA');
}

function signalConfig(type) {
  return {
    urgent:  { icon: svgIcon('alert-triangle', 20, '#EF4444'), bg: 'rgba(239,68,68,0.07)',  border: 'rgba(239,68,68,0.22)'  },
    warning: { icon: svgIcon('zap',            20, '#F59E0B'), bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.25)' },
    info:    { icon: svgIcon('info',           20, '#00D9FF'), bg: 'rgba(0,217,255,0.08)',  border: 'rgba(0,217,255,0.2)'   },
  }[type] || { icon: svgIcon('arrow-right', 20, '#9CA3AF'), bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.08)' };
}

function statusBadge(status) {
  const map = {
    success: { bg: 'rgba(16,185,129,0.15)', color: '#10B981', dot: '#10B981', label: 'success' },
    failed:  { bg: 'rgba(239,68,68,0.15)',  color: '#EF4444', dot: '#EF4444', label: 'failed'  },
    skipped: { bg: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.45)', dot: 'rgba(255,255,255,0.3)', label: 'skipped' },
  };
  const s = map[status] || map.skipped;
  return `<span style="display:inline-flex;align-items:center;gap:5px;font-size:13px;padding:3px 10px;border-radius:9999px;background:${s.bg};color:${s.color};font-weight:600;letter-spacing:0.02em;"><span style="width:6px;height:6px;border-radius:50%;background:${s.dot};display:inline-block;flex-shrink:0;"></span>${s.label}</span>`;
}

function sectionHeader(iconName, label, iconColor = '#64748B') {
  return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:16px;">${svgIcon(iconName, 15, iconColor)}<span style="font-size:13px;font-weight:700;letter-spacing:0.1em;color:rgba(255,255,255,0.4);text-transform:uppercase;">${label}</span></div>`;
}

function landingSection(eyebrow, heading, subtitle, content, accentColor = '#00D9FF') {
  return `
<div class="brief-section" style="border-top:1px solid rgba(255,255,255,0.06);padding:72px 40px;max-width:960px;margin:0 auto;position:relative;">
  <div class="brief-section-header" style="margin-bottom:44px;">
    <span style="font-size:13px;font-weight:700;letter-spacing:0.15em;color:${accentColor};text-transform:uppercase;display:block;margin-bottom:14px;">${eyebrow}</span>
    <h2 style="font-family:'Playfair Display',Georgia,serif;font-size:clamp(28px,3.5vw,46px);font-weight:700;color:#fff;letter-spacing:-0.5px;line-height:1.12;margin:0 0 14px;">${heading}</h2>
    ${subtitle ? `<p style="font-size:20px;line-height:1.6;color:rgba(255,255,255,0.5);max-width:520px;margin:0;">${subtitle}</p>` : ''}
  </div>
  <div class="brief-section-content">
    ${content}
  </div>
</div>`;
}

// ─── Zone 1: Command Center ───────────────────────────────────────────────────
function renderCommandCenter(d) {
  const hasWeather = d.weather && !d.weather.error;
  const temp   = hasWeather ? safe(d.weather.temp.current, '?') : '?';
  const high   = hasWeather ? safe(d.weather.temp.high, '?') : '?';
  const low    = hasWeather ? safe(d.weather.temp.low, '?') : '?';
  const cond   = hasWeather ? escapeHtml(safe(d.weather.condition, '')) : 'Unavailable';
  const precip = hasWeather ? safe(d.weather.precipitation, 0) : 0;
  const wIcon  = weatherIcon(cond, 32);

  const audioBlock = d.audio && d.audio.url
    ? `<audio id="brief-audio" src="${escapeHtml(d.audio.url)}" preload="metadata"
         onerror="document.getElementById('audio-btn').textContent='Audio unavailable';document.getElementById('audio-btn').disabled=true;document.getElementById('audio-btn').style.opacity='0.5';"></audio>
       <button id="audio-btn" onclick="toggleAudio()"
         style="display:inline-flex;align-items:center;gap:6px;background:rgba(255,255,255,0.18);backdrop-filter:blur(8px);color:#fff;border:1px solid rgba(255,255,255,0.28);padding:7px 16px;border-radius:8px;font-size:15px;cursor:pointer;font-weight:600;">${svgIcon('play',14,'#fff')} Audio</button>
       <span style="font-size:14px;color:rgba(255,255,255,0.45);">${Math.floor(safe(d.audio.durationSec, 0) / 60)}m ${safe(d.audio.durationSec, 0) % 60}s</span>`
    : `<span style="font-size:14px;color:rgba(255,255,255,0.35);">Audio unavailable</span>`;

  const quickLinks = [
    { label: 'Coder1',         href: 'http://localhost:3000',      icon: 'code-2'    },
    { label: 'Gmail',          href: 'https://mail.google.com',    icon: 'mail'      },
    { label: 'Obsidian',       href: 'obsidian://open',            icon: 'book-open' },
    { label: 'YouTube Studio', href: 'https://studio.youtube.com', icon: 'play-square'},
    { label: 'Telegram',       href: 'https://web.telegram.org',   icon: 'send'      },
  ];

  const dockHtml = quickLinks.map(l =>
    `<a href="${l.href}" target="_blank" style="display:inline-flex;align-items:center;gap:6px;padding:7px 14px;border-radius:8px;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.14);color:rgba(255,255,255,0.8);text-decoration:none;font-size:14px;font-weight:500;white-space:nowrap;transition:background 0.15s;" onmouseover="this.style.background='rgba(255,255,255,0.18)'" onmouseout="this.style.background='rgba(255,255,255,0.1)'">${svgIcon(l.icon,13,'rgba(255,255,255,0.7)')} ${l.label}</a>`
  ).join('');

  const newsCount = (d.intelligence && d.intelligence.aiNews) ? d.intelligence.aiNews.length : 0;
  const nlCount   = (d.intelligence && d.intelligence.newsletters) ? d.intelligence.newsletters.length : 0;
  const compCount = ((d.intelligence && d.intelligence.competitors)
    ? ((d.intelligence.competitors.coder1 || []).length + (d.intelligence.competitors.viddocs || []).length) : 0);
  const ytCount   = (d.youtube && d.youtube.latestVideos) ? d.youtube.latestVideos.filter(v => v.isNew !== false).length : 0;

  const statPill = (n, label, color) =>
    `<span style="display:inline-flex;align-items:center;gap:4px;font-size:13px;color:rgba(255,255,255,0.5);"><span style="width:6px;height:6px;border-radius:50%;background:${color};display:inline-block;"></span>${n} ${label}</span>`;

  return `
<style>
@keyframes zenFloat1 { 0%,100%{opacity:0.35;transform:scale(1) translateY(0)} 50%{opacity:0.55;transform:scale(1.12) translateY(-18px)} }
@keyframes zenFloat2 { 0%,100%{opacity:0.2;transform:scale(1) translateX(0)} 50%{opacity:0.38;transform:scale(1.08) translateX(14px)} }
@keyframes zenFloat3 { 0%,100%{opacity:0.15;transform:scale(1)} 50%{opacity:0.28;transform:scale(1.06)} }
</style>
<div style="background:#060810 radial-gradient(ellipse 80% 70% at 50% -5%,rgba(99,102,241,0.45) 0%,rgba(79,70,229,0.18) 40%,transparent 70%),radial-gradient(ellipse 65% 55% at 95% 105%,rgba(6,182,212,0.3) 0%,rgba(14,116,144,0.12) 40%,transparent 70%),radial-gradient(ellipse 55% 50% at -5% 55%,rgba(139,92,246,0.22) 0%,transparent 65%);color:#fff;position:relative;overflow:hidden;">
  <!-- Animated breathing layers (enhances when CSS animations run in browser) -->
  <div style="position:absolute;inset:0;background:radial-gradient(ellipse 80% 70% at 50% -5%,rgba(99,102,241,0.1) 0%,transparent 70%);pointer-events:none;animation:zenFloat1 14s ease-in-out infinite;"></div>
  <div style="position:absolute;inset:0;background:radial-gradient(ellipse 65% 55% at 95% 105%,rgba(6,182,212,0.08) 0%,transparent 70%);pointer-events:none;animation:zenFloat2 18s ease-in-out infinite;"></div>
  <div style="text-align:center;padding:80px 40px 60px;max-width:960px;margin:0 auto;position:relative;">
    <p style="font-size:24px;font-weight:700;color:rgba(255,255,255,0.55);margin:0 0 10px;letter-spacing:0.01em;">Good morning, Mike.</p>
    <h1 style="font-family:'Playfair Display',Georgia,serif;font-size:clamp(32px,4vw,56px);font-weight:700;margin:0 0 12px;color:#fff;letter-spacing:-0.5px;line-height:1.1;">${escapeHtml(safe(d.dateFormatted, d.date))}</h1>
    <p style="margin:0 0 32px;font-size:22px;color:rgba(255,255,255,0.55);">${escapeHtml(safe(d.contextualGreeting))}</p>
    <div style="display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:24px;">${audioBlock}</div>
    <div style="display:flex;flex-wrap:wrap;justify-content:center;gap:12px;margin-bottom:24px;padding-bottom:24px;border-bottom:1px solid rgba(255,255,255,0.07);">
      ${statPill(newsCount, 'stories', '#60A5FA')}
      ${statPill(nlCount,   'newsletters', '#A78BFA')}
      ${statPill(compCount, 'competitors', '#F59E0B')}
      ${statPill(ytCount,   'videos', '#F87171')}
      <span style="display:inline-flex;align-items:center;gap:4px;font-size:13px;color:rgba(255,255,255,0.5);"><span style="width:6px;height:6px;border-radius:50%;background:#F59E0B;display:inline-block;"></span>Day ${safe(d.streak, 1)} · ${safe(d.readingTimeMin, '?')} min read</span>
    </div>
    <div style="display:flex;flex-wrap:wrap;justify-content:center;gap:8px;">${dockHtml}</div>
  </div>
</div>`;
}

// ─── Weekly Stats Band ────────────────────────────────────────────────────────
function renderWeeklyStats(d) {
  const ws = d.weeklyStats;
  if (!ws) return '';

  const costLabel    = ws.claudeCodeCost != null ? `$${Number(ws.claudeCodeCost).toFixed(2)} / wk` : '—';
  const commitsLabel = ws.gitCommits    != null ? `${ws.gitCommits} commits` : '—';

  // Tool calls this week
  const tc = ws.toolCallsThisWeek;
  const tcLabel = tc == null ? '—'
    : tc >= 1000 ? `${(tc / 1000).toFixed(1)}k`
    : String(tc);

  const stat = (value, label, color) =>
    `<div style="flex:1;min-width:100px;text-align:center;padding:18px 24px;">
      <div style="font-size:30px;font-weight:700;color:${color};font-family:'Space Grotesk',sans-serif;letter-spacing:-0.5px;">${escapeHtml(String(value))}</div>
      <div style="font-size:12px;font-weight:700;color:rgba(255,255,255,0.38);text-transform:uppercase;letter-spacing:0.09em;margin-top:5px;">${escapeHtml(label)}</div>
    </div>`;

  const divider = `<div style="width:1px;background:rgba(255,255,255,0.07);margin:14px 0;"></div>`;

  return `<div style="background:rgba(255,255,255,0.025);border-bottom:1px solid rgba(255,255,255,0.06);">
  <div style="max-width:960px;margin:0 auto;padding:0 40px;display:flex;align-items:stretch;">
    ${stat(costLabel, 'Claude Code · This Week', '#00D9FF')}
    ${divider}
    ${stat(tcLabel,   'Tool Calls · This Week',  '#A78BFA')}
    ${divider}
    ${stat(commitsLabel, 'Git Commits · This Week',    '#10B981')}
  </div>
</div>`;
}

// ─── Zone 2: Today's Signal ───────────────────────────────────────────────────
function renderSignal(d) {
  if (!d.todaysSignal || !d.todaysSignal.length) return '';
  const items = d.todaysSignal.map(s => {
    const cfg = signalConfig(s.type);
    return `<div style="display:flex;align-items:flex-start;gap:14px;padding:20px 24px;background:${cfg.bg};border:1px solid ${cfg.border};border-radius:14px;margin-bottom:10px;">
      <div style="flex-shrink:0;margin-top:2px;">${cfg.icon}</div>
      <span style="font-size:18px;font-weight:600;color:rgba(255,255,255,0.9);line-height:1.6;">${escapeHtml(s.text)}</span>
    </div>`;
  }).join('');
  return landingSection("Today's Signal", 'What matters right now', 'Three things that need your attention this morning.', items, '#F59E0B');
}

// ─── Zone 3: Overnight Debrief ────────────────────────────────────────────────
function renderOvernight(d) {
  const ov = d.overnight || {};
  const jobs = d.cronJobs || [];

  // Overnight agent results
  let agentHtml = '';
  if (ov.allQuiet || !ov.hasData) {
    agentHtml = `<div style="display:flex;align-items:center;gap:8px;font-size:16px;color:rgba(255,255,255,0.5);">${svgIcon('shield-check',18,'#10B981')} All systems nominal overnight.</div>`;
  } else {
    const statusColors = {
      success: { bg: 'rgba(16,185,129,0.07)', border: 'rgba(16,185,129,0.2)' },
      failed:  { bg: 'rgba(239,68,68,0.07)',  border: 'rgba(239,68,68,0.22)' },
      skipped: { bg: 'rgba(255,255,255,0.03)', border: 'rgba(255,255,255,0.08)' },
    };
    const rows = (ov.items || []).map(item => {
      const sc = statusColors[item.status] || statusColors.skipped;
      return `<div style="display:flex;align-items:flex-start;gap:16px;padding:20px 24px;background:${sc.bg};border:1px solid ${sc.border};border-radius:14px;margin-bottom:10px;">
        <div style="flex-shrink:0;padding-top:2px;">${statusBadge(item.status)}</div>
        <div style="flex:1;">
          <div style="font-size:18px;font-weight:700;color:rgba(255,255,255,0.9);margin-bottom:5px;">${escapeHtml(item.name)}</div>
          <div style="font-size:16px;color:rgba(255,255,255,0.55);line-height:1.5;">${escapeHtml(item.output || '')}</div>
        </div>
      </div>`;
    }).join('');
    agentHtml = rows || '';
  }

  // Cron job registry
  let cronHtml = '';
  if (jobs.length) {
    const statusDot = s => {
      const c = s === 'success' ? '#10B981' : s === 'failed' ? '#EF4444' : '#6B7280';
      return `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${c};flex-shrink:0;"></span>`;
    };
    const rows = jobs.map(j => {
      const dur = j.durationMs != null ? (j.durationMs < 1000 ? `${j.durationMs}ms` : `${(j.durationMs/1000).toFixed(1)}s`) : '—';
      const disabledStyle = j.enabled ? '' : 'opacity:0.4;';
      return `<div style="display:grid;grid-template-columns:1fr 1.4fr 0.9fr 60px 0.9fr;gap:12px;align-items:center;padding:14px 20px;border-bottom:1px solid rgba(255,255,255,0.05);${disabledStyle}">
        <div style="display:flex;align-items:center;gap:8px;">
          ${statusDot(j.status)}
          <span style="font-size:15px;font-weight:600;color:rgba(255,255,255,0.85);">${escapeHtml(j.name)}</span>
        </div>
        <div style="font-size:13px;color:rgba(255,255,255,0.4);">${escapeHtml(j.schedule)}</div>
        <div style="font-size:13px;color:rgba(255,255,255,0.45);">${escapeHtml(j.lastRun || '—')}</div>
        <div style="font-size:13px;color:rgba(255,255,255,0.3);text-align:right;">${escapeHtml(dur)}</div>
        <div style="font-size:13px;color:rgba(255,255,255,0.3);">Next: ${escapeHtml(j.nextRun || '—')}</div>
      </div>`;
    }).join('');

    cronHtml = `
      <div style="margin-top:${agentHtml ? '24px' : '0'};border:1px solid rgba(255,255,255,0.07);border-radius:14px;overflow:hidden;">
        <div style="display:grid;grid-template-columns:1fr 1.4fr 0.9fr 60px 0.9fr;gap:12px;padding:10px 20px;background:rgba(255,255,255,0.03);border-bottom:1px solid rgba(255,255,255,0.08);">
          <div style="font-size:11px;font-weight:700;letter-spacing:0.08em;color:rgba(255,255,255,0.3);text-transform:uppercase;">Job</div>
          <div style="font-size:11px;font-weight:700;letter-spacing:0.08em;color:rgba(255,255,255,0.3);text-transform:uppercase;">Schedule</div>
          <div style="font-size:11px;font-weight:700;letter-spacing:0.08em;color:rgba(255,255,255,0.3);text-transform:uppercase;">Last Run</div>
          <div style="font-size:11px;font-weight:700;letter-spacing:0.08em;color:rgba(255,255,255,0.3);text-transform:uppercase;text-align:right;">Duration</div>
          <div style="font-size:11px;font-weight:700;letter-spacing:0.08em;color:rgba(255,255,255,0.3);text-transform:uppercase;">Next Run</div>
        </div>
        ${rows}
      </div>`;
  }

  const inner = agentHtml + cronHtml || `<p style="font-size:16px;color:rgba(255,255,255,0.5);margin:0;">No data.</p>`;
  return landingSection('Overnight', 'While you slept', 'Agent activity + scheduled jobs.', inner, '#94A3B8');
}

// ─── Zone 4: Today's Focus ────────────────────────────────────────────────────
function renderFocus(d) {
  const tf = d.todaysFocus || {};

  let goalsReview = '';
  if (tf.yesterdaysGoals && tf.yesterdaysGoals.length) {
    const rows = tf.yesterdaysGoals.map(g => {
      const icon = g.completed
        ? svgIcon('check-circle', 16, '#10B981', 'flex-shrink:0;')
        : svgIcon('x-circle',    16, '#EF4444', 'flex-shrink:0;');
      return `<div style="display:flex;align-items:center;gap:10px;padding:6px 0;">
        ${icon}<span style="font-size:16px;color:${g.completed ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.3)'};${g.completed ? '' : 'text-decoration:line-through;'}">${escapeHtml(g.text)}</span>
      </div>`;
    }).join('');
    goalsReview = `
      <div style="margin-bottom:20px;padding-bottom:20px;border-bottom:1px solid rgba(255,255,255,0.07);">
        <div style="font-size:13px;font-weight:700;letter-spacing:0.1em;color:rgba(255,255,255,0.4);text-transform:uppercase;margin-bottom:10px;">Yesterday's Goals</div>
        ${rows}
      </div>`;
  }

  const preloaded = tf.goalsPreloaded || [];
  const goalInputs = [1, 2, 3].map(i =>
    `<div style="margin-bottom:12px;">
       <label style="font-size:13px;font-weight:600;color:rgba(255,255,255,0.4);letter-spacing:0.05em;display:block;margin-bottom:6px;text-transform:uppercase;">Priority ${i}</label>
       <input id="goal-${i}" type="text" value="${escapeHtml(preloaded[i - 1] || '')}"
         style="width:100%;padding:14px 18px;border:1px solid rgba(255,255,255,0.15);border-radius:10px;font-size:18px;font-family:Inter,sans-serif;outline:none;box-sizing:border-box;background:rgba(255,255,255,0.07);color:#fff;"
         placeholder="What's priority ${i} today?"
         onfocus="this.style.borderColor='#00D9FF';this.style.boxShadow='0 0 0 3px rgba(0,217,255,0.12)'"
         onblur="this.style.borderColor='rgba(255,255,255,0.15)';this.style.boxShadow='none'" />
     </div>`
  ).join('');

  const parkedItems = (tf.parkedIdeas && tf.parkedIdeas.length)
    ? tf.parkedIdeas.map((p, i) => {
        const pid = `parked-${i}`;
        return `<div id="${pid}" style="padding:10px 14px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-left:3px solid #F59E0B;border-radius:10px;margin-bottom:8px;display:flex;align-items:flex-start;gap:10px;max-height:200px;overflow:hidden;">
         <div style="flex:1;">
           <div class="parked-text" style="font-size:15px;color:rgba(255,255,255,0.85);font-weight:500;">${escapeHtml(p.text)}</div>
           <div style="font-size:13px;color:rgba(255,255,255,0.4);margin-top:4px;">${escapeHtml(p.date)}${p.context ? ' · ' + escapeHtml(p.context) : ''}</div>
         </div>
         <button onclick="dismissParked('${pid}')" title="Mark done &amp; remove"
           style="flex-shrink:0;width:22px;height:22px;border-radius:50%;border:1.5px solid rgba(255,255,255,0.2);background:transparent;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;margin-top:1px;"
           onmouseover="this.style.borderColor='#10B981';this.style.background='rgba(16,185,129,0.15)'"
           onmouseout="this.style.borderColor='rgba(255,255,255,0.2)';this.style.background='transparent'">${svgIcon('check-circle',13,'rgba(255,255,255,0.4)')}</button>
       </div>`;
      }).join('')
    : '';

  const parked = `
    <div style="margin-top:20px;padding-top:20px;border-top:1px solid rgba(255,255,255,0.07);">
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:10px;">${svgIcon('lightbulb',13,'#F59E0B')}<span style="font-size:13px;font-weight:700;letter-spacing:0.1em;color:rgba(255,255,255,0.4);text-transform:uppercase;">Parked Ideas</span></div>
      <div id="parked-ideas-list">${parkedItems}</div>
      <div style="margin-top:12px;display:flex;flex-direction:column;gap:8px;">
        <input id="new-idea-text" type="text" placeholder="New idea to park…"
          style="width:100%;padding:12px 16px;border:1px solid rgba(255,255,255,0.15);border-radius:10px;font-size:16px;font-family:Inter,sans-serif;outline:none;box-sizing:border-box;background:rgba(255,255,255,0.07);color:#fff;"
          onfocus="this.style.borderColor='#F59E0B';this.style.boxShadow='0 0 0 3px rgba(245,158,11,0.12)'"
          onblur="this.style.borderColor='rgba(255,255,255,0.15)';this.style.boxShadow='none'" />
        <input id="new-idea-context" type="text" placeholder="Context (optional — e.g. Coder1 / YouTube)"
          style="width:100%;padding:10px 16px;border:1px solid rgba(255,255,255,0.1);border-radius:10px;font-size:14px;font-family:Inter,sans-serif;outline:none;box-sizing:border-box;background:rgba(255,255,255,0.05);color:#fff;"
          onfocus="this.style.borderColor='#F59E0B';this.style.boxShadow='0 0 0 3px rgba(245,158,11,0.08)'"
          onblur="this.style.borderColor='rgba(255,255,255,0.1)';this.style.boxShadow='none'" />
        <div style="display:flex;align-items:center;gap:10px;">
          <button id="add-idea-btn"
            style="background:linear-gradient(135deg,#F59E0B,#D97706);color:#fff;border:none;padding:10px 24px;border-radius:10px;font-size:15px;font-weight:700;cursor:pointer;letter-spacing:0.02em;">
            Park Idea
          </button>
          <span id="add-idea-success" style="display:none;font-size:14px;color:#10B981;font-weight:600;">${svgIcon('check-circle',13,'#10B981')} Parked to Obsidian</span>
          <span id="add-idea-error" style="font-size:14px;color:#EF4444;"></span>
        </div>
      </div>
    </div>`;

  let suggested = '';
  if (tf.suggestedTodos && tf.suggestedTodos.length) {
    const items = tf.suggestedTodos.map(t =>
      `<div style="display:flex;align-items:flex-start;gap:8px;padding:6px 0;font-size:16px;color:rgba(255,255,255,0.75);">${svgIcon('arrow-right',14,'#F59E0B','margin-top:3px;flex-shrink:0;')}${escapeHtml(t)}</div>`
    ).join('');
    suggested = `
      <div style="margin-top:16px;padding-top:16px;border-top:1px solid rgba(255,255,255,0.07);">
        <div style="font-size:13px;font-weight:700;letter-spacing:0.1em;color:rgba(255,255,255,0.4);text-transform:uppercase;margin-bottom:10px;">Suggested Todos</div>
        ${items}
      </div>`;
  }

  const ambientBlock = tf.hasAmbientData && tf.ambientSummary
    ? `<div style="font-size:16px;color:rgba(255,255,255,0.75);background:rgba(255,255,255,0.05);padding:12px 16px;border-radius:10px;border-left:3px solid rgba(255,255,255,0.2);line-height:1.6;">${escapeHtml(tf.ambientSummary)}</div>`
    : `<div style="font-size:16px;color:rgba(255,255,255,0.35);font-style:italic;">No Ambient data for yesterday.</div>`;

  const focusContent = `
  ${goalsReview}
  <div style="margin-bottom:4px;">
    <div style="font-size:13px;font-weight:700;letter-spacing:0.1em;color:rgba(255,255,255,0.4);text-transform:uppercase;margin-bottom:14px;">Set Today's Goals</div>
    ${goalInputs}
    <button id="save-goals-btn"
      style="margin-top:8px;background:linear-gradient(135deg,#00D9FF,#0099BB);color:#080C18;border:none;padding:14px 32px;border-radius:10px;font-size:18px;font-weight:700;cursor:pointer;letter-spacing:0.02em;box-shadow:0 4px 12px rgba(0,217,255,0.25);">
      Save Goals
    </button>
    <div id="goals-success" style="display:none;margin-top:8px;font-size:15px;color:#10B981;font-weight:600;align-items:center;gap:5px;">${svgIcon('check-circle',14,'#10B981')} Saved to Obsidian</div>
    <div id="goals-error" style="font-size:14px;color:#EF4444;margin-top:6px;"></div>
  </div>
  ${parked}
  ${suggested}
  <div style="margin-top:20px;padding-top:20px;border-top:1px solid rgba(255,255,255,0.07);">
    <div style="font-size:13px;font-weight:700;letter-spacing:0.1em;color:rgba(255,255,255,0.4);text-transform:uppercase;margin-bottom:10px;">Yesterday's Activity</div>
    ${ambientBlock}
  </div>`;
  return landingSection('Your Day', "Today's Focus", "Set your intentions. Review what's parked.", focusContent, '#F59E0B');
}

// ─── Zone 5: Intelligence Feed ────────────────────────────────────────────────
function renderIntelligence(d, dateStr) {
  const intel = d.intelligence || {};
  const comp  = intel.competitors || {};

  const defaultTab = comp.urgentTab === 'competitors' ? 'competitors' : 'ai-news';
  const urgentDot  = comp.urgentTab === 'competitors'
    ? `<span style="display:inline-block;width:7px;height:7px;background:#F59E0B;border-radius:50%;margin-left:5px;vertical-align:middle;box-shadow:0 0 6px rgba(245,158,11,0.7);"></span>`
    : '';

  // AI News tab
  const aiNewsHtml = (intel.aiNews && intel.aiNews.length)
    ? intel.aiNews.map((item, i) => `
        <div style="padding:16px 0;border-bottom:1px solid rgba(255,255,255,0.06);">
          <div style="display:flex;align-items:flex-start;gap:12px;">
            <div style="width:3px;flex-shrink:0;border-radius:2px;background:linear-gradient(180deg,#60A5FA,#3B82F6);align-self:stretch;min-height:40px;"></div>
            <div style="flex:1;">
              <a href="${escapeHtml(item.url || '#')}" target="_blank"
                 style="font-size:17px;font-weight:600;color:rgba(255,255,255,0.9);text-decoration:none;line-height:1.4;display:block;margin-bottom:6px;" onmouseover="this.style.color='#60A5FA'" onmouseout="this.style.color='rgba(255,255,255,0.9)'">${escapeHtml(item.headline)}</a>
              <p style="font-size:15px;font-weight:500;color:rgba(255,255,255,0.65);margin:0 0 8px;line-height:1.6;">${escapeHtml(item.summary)}</p>
              <span style="font-size:13px;background:rgba(59,130,246,0.15);color:#60A5FA;padding:3px 10px;border-radius:9999px;font-weight:600;">${escapeHtml(item.source)}</span>
            </div>
          </div>
        </div>`).join('')
    : `<div style="padding:24px 0;text-align:center;font-size:16px;color:rgba(255,255,255,0.35);">No AI news items today.</div>`;

  // Newsletters tab — supports both items[] (new) and single-entry (legacy) formats
  let newslettersHtml = '';
  if (intel.newsletters && intel.newsletters.length) {
    newslettersHtml = intel.newsletters.map(n => {
      if (n.items && n.items.length) {
        // New format: multiple story items per newsletter
        const itemRows = n.items.map(item => `
          <div style="display:flex;align-items:flex-start;gap:10px;padding:9px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
            <div style="width:3px;flex-shrink:0;background:linear-gradient(180deg,#A78BFA,#7C3AED);border-radius:2px;align-self:stretch;min-height:30px;"></div>
            <div style="flex:1;">
              ${n.emailUrl
                ? `<a href="${escapeHtml(n.emailUrl)}" target="_blank" style="font-size:15px;font-weight:600;color:rgba(255,255,255,0.85);text-decoration:none;" onmouseover="this.style.color='#A78BFA'" onmouseout="this.style.color='rgba(255,255,255,0.85)'">${escapeHtml(item.headline)}</a>`
                : `<div style="font-size:15px;font-weight:600;color:rgba(255,255,255,0.85);">${escapeHtml(item.headline)}</div>`}
              <div style="font-size:14px;color:rgba(255,255,255,0.5);margin-top:3px;font-style:italic;">${escapeHtml(item.takeaway)}</div>
            </div>
            ${item.relevanceScore ? `<span style="font-size:13px;background:rgba(124,58,237,0.2);color:#A78BFA;padding:2px 7px;border-radius:9999px;font-weight:700;flex-shrink:0;align-self:flex-start;">${Math.round(item.relevanceScore * 100)}%</span>` : ''}
          </div>`).join('');
        return `
          <div style="padding:12px 0;border-bottom:1px solid rgba(255,255,255,0.06);">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
              <span style="font-size:15px;font-weight:700;color:rgba(255,255,255,0.9);">${escapeHtml(n.sender)}</span>
              ${n.emailUrl ? `<a href="${escapeHtml(n.emailUrl)}" target="_blank" style="font-size:13px;color:#7C3AED;font-weight:600;text-decoration:none;" onmouseover="this.style.opacity='0.7'" onmouseout="this.style.opacity='1'">Open →</a>` : ''}
            </div>
            ${itemRows}
          </div>`;
      }
      // Legacy format: single collapsed accordion item
      return `
        <details style="border-bottom:1px solid rgba(255,255,255,0.06);padding:12px 0;">
          <summary style="cursor:pointer;list-style:none;display:flex;flex-direction:column;gap:3px;">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <span style="font-size:16px;font-weight:600;color:rgba(255,255,255,0.9);">${escapeHtml(n.sender)}</span>
              ${n.relevanceScore ? `<span style="font-size:13px;background:rgba(124,58,237,0.2);color:#A78BFA;padding:2px 8px;border-radius:9999px;font-weight:600;">${Math.round(n.relevanceScore * 100)}% relevant</span>` : ''}
            </div>
            <span style="font-size:15px;color:rgba(255,255,255,0.75);font-weight:500;">${escapeHtml(n.subject || '')}</span>
            <span style="font-size:15px;color:rgba(255,255,255,0.5);font-style:italic;">${escapeHtml(n.takeaway || '')}</span>
          </summary>
          <div style="padding:12px 0 4px;">
            <p style="font-size:15px;color:rgba(255,255,255,0.7);margin:0 0 10px;line-height:1.6;">${escapeHtml(n.fullSummary || '')}</p>
            ${n.emailUrl ? `<a href="${escapeHtml(n.emailUrl)}" target="_blank" style="font-size:15px;color:#A78BFA;font-weight:700;text-decoration:none;">Open email →</a>` : ''}
          </div>
        </details>`;
    }).join('');
  } else {
    newslettersHtml = `<div style="padding:24px 0;text-align:center;font-size:16px;color:rgba(255,255,255,0.35);">No newsletters today.</div>`;
  }

  // Competitors tab
  function compSection(title, items) {
    if (!items || !items.length) return '';
    const rows = items.map(c => {
      const isHigh = c.priority === 'high';
      return `<div style="padding:12px 0;border-bottom:1px solid rgba(255,255,255,0.06);">
        <div style="display:flex;align-items:flex-start;gap:10px;">
          <div style="flex-shrink:0;margin-top:2px;">
            ${isHigh
              ? `<span style="display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;background:rgba(245,158,11,0.15);border-radius:6px;">${svgIcon('zap',13,'#F59E0B')}</span>`
              : `<span style="display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;background:rgba(255,255,255,0.07);border-radius:6px;">${svgIcon('minus-circle',13,'rgba(255,255,255,0.3)')}</span>`}
          </div>
          <div style="flex:1;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
              <a href="${escapeHtml(c.url || '#')}" target="_blank" style="font-size:16px;font-weight:700;color:rgba(255,255,255,0.9);text-decoration:none;">${escapeHtml(c.name)}</a>
              ${isHigh ? `<span style="font-size:13px;font-weight:700;background:rgba(245,158,11,0.15);color:#F59E0B;padding:2px 7px;border-radius:9999px;text-transform:uppercase;letter-spacing:0.05em;">HIGH</span>` : ''}
            </div>
            <p style="font-size:15px;font-weight:500;color:rgba(255,255,255,0.75);margin:0 0 4px;">${escapeHtml(c.change)}</p>
            <p style="font-size:15px;font-weight:600;color:#F59E0B;font-style:italic;margin:0 0 6px;">→ ${escapeHtml(c.soWhat)}</p>
            ${c.url ? `<a href="${escapeHtml(c.url)}" target="_blank" style="font-size:14px;color:rgba(255,255,255,0.35);text-decoration:none;font-weight:600;" onmouseover="this.style.color='#00D9FF'" onmouseout="this.style.color='rgba(255,255,255,0.35)'">Read more →</a>` : ''}
          </div>
        </div>
      </div>`;
    }).join('');
    return `<div style="margin-bottom:20px;"><div style="font-size:13px;font-weight:700;letter-spacing:0.1em;color:rgba(255,255,255,0.4);text-transform:uppercase;margin-bottom:8px;padding-bottom:8px;border-bottom:1px solid rgba(255,255,255,0.07);">${escapeHtml(title)}</div>${rows}</div>`;
  }

  const coder1Comps  = comp.coder1  || [];
  const viddocsComps = comp.viddocs || [];
  let competitorsHtml = compSection('Coder1 Rivals', coder1Comps) + compSection('VidDocs Rivals', viddocsComps);
  if (!coder1Comps.length && !viddocsComps.length) {
    const lastDate = comp.lastNotableDate || '';
    const lastDesc = comp.lastNotableDesc || '';
    competitorsHtml = `<div style="padding:24px 0;text-align:center;font-size:16px;color:rgba(255,255,255,0.35);">No significant moves. Last notable: ${escapeHtml(lastDate)}${lastDesc ? ' — ' + escapeHtml(lastDesc) : ''}</div>`;
  }

  function tabBtn(id, label, extra = '') {
    const isDefault = id === defaultTab;
    return `<button class="tab-btn${isDefault ? ' active' : ''}" data-tab="${id}"
      style="padding:10px 24px;border:none;border-radius:7px;cursor:pointer;font-size:16px;font-weight:600;transition:all 0.15s;${isDefault ? 'background:#00D9FF;color:#080C18;font-weight:700;box-shadow:0 2px 8px rgba(0,217,255,0.25);' : 'background:transparent;color:rgba(255,255,255,0.5);'}">${label}${extra}</button>`;
  }

  const intelContent = `
  <div style="display:flex;gap:4px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:4px;margin-bottom:32px;">
    ${tabBtn('ai-news', 'AI News')}
    ${tabBtn('newsletters', 'Newsletters')}
    ${tabBtn('competitors', 'Competitors', urgentDot)}
  </div>
  <div id="tab-ai-news" class="tab-content" style="display:${defaultTab === 'ai-news' ? 'block' : 'none'};">${aiNewsHtml}</div>
  <div id="tab-newsletters" class="tab-content" style="display:${defaultTab === 'newsletters' ? 'block' : 'none'};">${newslettersHtml}</div>
  <div id="tab-competitors" class="tab-content" style="display:${defaultTab === 'competitors' ? 'block' : 'none'};">${competitorsHtml}</div>`;
  return landingSection('Intelligence', "What's happening", 'AI news, newsletters, and competitor moves — curated for you.', intelContent, '#60A5FA');
}

// ─── Zone 6: YouTube Studio ───────────────────────────────────────────────────
function renderYouTube(d) {
  const yt = d.youtube || {};

  let carouselHtml = '';
  const newVideos = (yt.latestVideos || []).filter(v => v.isNew !== false);
  if (newVideos.length) {
    const cards = newVideos.map(v => {
      const thumb = v.thumbnailUrl || `https://img.youtube.com/vi/${escapeHtml(v.videoId)}/mqdefault.jpg`;
      const badge = v.isNew
        ? `<span style="position:absolute;top:8px;left:8px;background:linear-gradient(135deg,#EF4444,#DC2626);color:#fff;font-size:13px;font-weight:800;padding:3px 8px;border-radius:6px;letter-spacing:0.05em;text-transform:uppercase;box-shadow:0 2px 8px rgba(239,68,68,0.4);">NEW</span>`
        : '';
      return `<a href="${escapeHtml(v.watchUrl || '#')}" target="_blank"
        style="display:flex;flex-direction:column;flex-shrink:0;width:188px;text-decoration:none;color:inherit;transition:transform 0.15s;"
        onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='none'">
        <div style="position:relative;width:188px;padding-bottom:56.25%;background:#0F0F23;border-radius:10px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.15);">
          <img src="${thumb}" alt="${escapeHtml(v.title)}"
               style="position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;"
               onerror="this.style.display='none'"/>
          ${badge}
          <div style="position:absolute;bottom:0;left:0;right:0;background:linear-gradient(transparent,rgba(0,0,0,0.85));padding:8px 10px;">
            <span style="font-size:13px;color:rgba(255,255,255,0.85);font-weight:600;">${escapeHtml(v.creator)}</span>
          </div>
        </div>
        <p style="font-size:14px;color:rgba(255,255,255,0.7);margin:6px 0 0;line-height:1.4;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${escapeHtml(v.title)}</p>
      </a>`;
    }).join('');
    carouselHtml = `
      <div style="margin-bottom:24px;">
        <div style="font-size:13px;font-weight:700;letter-spacing:0.1em;color:rgba(255,255,255,0.4);text-transform:uppercase;margin-bottom:12px;">New Today</div>
        <div style="display:flex;gap:14px;overflow-x:auto;padding-bottom:10px;-webkit-overflow-scrolling:touch;">${cards}</div>
      </div>`;
  } else {
    carouselHtml = `
      <div style="margin-bottom:24px;">
        <div style="font-size:13px;font-weight:700;letter-spacing:0.1em;color:rgba(255,255,255,0.4);text-transform:uppercase;margin-bottom:12px;">New Today</div>
        <div style="padding:20px 0;text-align:center;font-size:16px;color:rgba(255,255,255,0.35);">No new videos from tracked creators in the last 24 hours.</div>
      </div>`;
  }

  let ideasHtml = '';
  if (yt.videoIdeas && yt.videoIdeas.length) {
    const first3 = yt.videoIdeas.slice(0, 3).map((idea, i) =>
      `<div style="display:flex;align-items:flex-start;gap:10px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.06);">
        <span style="font-size:13px;font-weight:800;color:#E11D48;flex-shrink:0;width:20px;text-align:right;margin-top:2px;">${i + 1}</span>
        <span style="font-size:16px;color:rgba(255,255,255,0.75);">${escapeHtml(idea)}</span>
      </div>`
    ).join('');
    const rest = yt.videoIdeas.slice(3).map((idea, i) =>
      `<div style="display:flex;align-items:flex-start;gap:10px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.06);">
        <span style="font-size:13px;font-weight:800;color:#E11D48;flex-shrink:0;width:20px;text-align:right;margin-top:2px;">${i + 4}</span>
        <span style="font-size:16px;color:rgba(255,255,255,0.75);">${escapeHtml(idea)}</span>
      </div>`
    ).join('');
    const toggleBtn = yt.videoIdeas.length > 3
      ? `<button id="video-ideas-toggle" style="margin-top:10px;background:none;border:1.5px solid rgba(255,255,255,0.15);color:rgba(255,255,255,0.5);font-size:15px;font-weight:600;cursor:pointer;padding:6px 16px;border-radius:8px;" onmouseover="this.style.borderColor='#F59E0B';this.style.color='#F59E0B'" onmouseout="this.style.borderColor='rgba(255,255,255,0.15)';this.style.color='rgba(255,255,255,0.5)'">Show all ${yt.videoIdeas.length}</button>`
      : '';
    ideasHtml = `
      <div style="margin-bottom:24px;">
        <div style="font-size:13px;font-weight:700;letter-spacing:0.1em;color:rgba(255,255,255,0.4);text-transform:uppercase;margin-bottom:10px;">Video Ideas</div>
        ${first3}
        <div id="video-ideas-extra" style="display:none;">${rest}</div>
        ${toggleBtn}
      </div>`;
  }

  let watchHtml = '';
  if (yt.watchHistory && yt.watchHistory.length) {
    const entries = yt.watchHistory.map(w => {
      const takeaways = (w.takeaways || []).map(t =>
        `<li style="font-size:15px;color:rgba(255,255,255,0.7);padding:3px 0;line-height:1.5;">${escapeHtml(t)}</li>`
      ).join('');
      const opinionBlock = w.opinion
        ? `<div style="background:rgba(0,217,255,0.07);border-left:3px solid #00D9FF;border-radius:6px;padding:10px 14px;margin-bottom:10px;"><span style="font-size:13px;font-weight:700;letter-spacing:0.12em;color:#00D9FF;display:block;margin-bottom:4px;text-transform:uppercase;">AI's Take</span><p style="font-size:15px;color:rgba(255,255,255,0.8);margin:0;line-height:1.6;font-style:italic;">${escapeHtml(w.opinion)}</p></div>`
        : '';
      const adviceBlock = w.advice
        ? `<div style="background:rgba(245,158,11,0.1);border-left:3px solid #F59E0B;border-radius:6px;padding:10px 14px;"><span style="font-size:13px;font-weight:700;letter-spacing:0.12em;color:#F59E0B;display:block;margin-bottom:4px;text-transform:uppercase;">Advice for You</span><p style="font-size:15px;color:rgba(255,255,255,0.85);margin:0;line-height:1.6;font-style:italic;">${escapeHtml(w.advice)}</p></div>`
        : '';
      return `<details style="border-bottom:1px solid rgba(255,255,255,0.06);">
        <summary style="cursor:pointer;list-style:none;padding:14px 0;display:flex;justify-content:space-between;align-items:flex-start;gap:12px;-webkit-appearance:none;">
          <div style="flex:1;">
            <div style="font-size:16px;font-weight:700;color:rgba(255,255,255,0.9);margin-bottom:2px;">${escapeHtml(w.title)}</div>
            ${w.creator ? `<div style="font-size:14px;color:rgba(255,255,255,0.4);">${escapeHtml(w.creator)}</div>` : ''}
          </div>
          <span class="details-chevron" style="font-size:13px;color:rgba(255,255,255,0.3);flex-shrink:0;padding-top:4px;letter-spacing:0.04em;">expand ↓</span>
        </summary>
        <div style="padding:0 0 18px;display:flex;flex-direction:column;gap:12px;">
          ${w.summary ? `<div><div style="font-size:13px;font-weight:700;letter-spacing:0.12em;color:rgba(255,255,255,0.3);text-transform:uppercase;margin-bottom:6px;">Overview</div><p style="font-size:15px;color:rgba(255,255,255,0.65);line-height:1.65;margin:0;">${escapeHtml(w.summary)}</p></div>` : ''}
          ${takeaways ? `<div><div style="font-size:13px;font-weight:700;letter-spacing:0.12em;color:rgba(255,255,255,0.3);text-transform:uppercase;margin-bottom:6px;">Key Takeaways</div><ul style="margin:0;padding-left:18px;">${takeaways}</ul></div>` : ''}
          ${opinionBlock}
          ${adviceBlock}
        </div>
      </details>`;
    }).join('');
    watchHtml = `
      <div>
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:10px;">${svgIcon('history',13,'#94A3B8')}<span style="font-size:13px;font-weight:700;letter-spacing:0.1em;color:#94A3B8;text-transform:uppercase;">Watch History</span></div>
        ${entries}
      </div>`;
  } else {
    watchHtml = `
      <div>
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:10px;">${svgIcon('history',13,'#94A3B8')}<span style="font-size:13px;font-weight:700;letter-spacing:0.1em;color:#94A3B8;text-transform:uppercase;">Watch History</span></div>
        <div style="padding:20px 0;text-align:center;font-size:16px;color:rgba(255,255,255,0.35);">No YouTube activity captured yesterday.</div>
      </div>`;
  }

  // Reddit Ideas sub-section
  let redditHtml = '';
  if (d.redditIdeas && d.redditIdeas.length) {
    const rows = d.redditIdeas.map(r =>
      `<div style="display:flex;align-items:flex-start;gap:10px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
        <div style="flex:1;">
          <div style="font-size:15px;color:rgba(255,255,255,0.85);font-weight:500;">${escapeHtml(r.title)}</div>
          <div style="font-size:13px;color:#FF4500;font-weight:600;margin-top:3px;">${escapeHtml(r.subreddit)}</div>
        </div>
      </div>`
    ).join('');
    redditHtml = `
      <div style="margin-top:28px;padding-top:28px;border-top:1px solid rgba(255,255,255,0.07);">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:12px;">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FF4500" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8.56 2.75c4.37 6.03 6.02 9.42 8.03 17.72m2.54-15.38c-3.72 4.35-8.94 5.66-16.88 5.85m19.5 1.9c-3.5-.93-6.63-.82-8.94 0-2.58.92-5.01 2.86-7.44 6.32"/></svg>
          <span style="font-size:13px;font-weight:700;letter-spacing:0.1em;color:rgba(255,255,255,0.4);text-transform:uppercase;">Reddit Post Ideas</span>
          <span style="font-size:11px;color:rgba(255,255,255,0.25);font-weight:500;">from Medium Daily Digest</span>
        </div>
        ${rows}
      </div>`;
  }

  return landingSection('YouTube Studio', 'Your content ecosystem', 'Latest from the creators you track. Ideas for your channel. What you watched.', `${carouselHtml}${ideasHtml}${watchHtml}${redditHtml}`, '#E11D48');
}

// ─── Zone 7: Closing ──────────────────────────────────────────────────────────
function renderClosing(d) {
  const vi   = d.vaultIdea   || {};
  const insp = d.inspiration || {};

  const vaultContextBlock = vi.hasData
    ? `${vi.context ? `<p style="font-size:18px;color:rgba(255,255,255,0.65);line-height:1.7;margin:0 0 16px;">${escapeHtml(vi.context)}</p>` : ''}
       ${vi.whyToday ? `<p style="font-size:17px;color:rgba(255,255,255,0.6);margin:0 0 32px;font-style:italic;"><strong style="color:rgba(255,255,255,0.8);">Why today:</strong> ${escapeHtml(vi.whyToday)}</p>` : ''}`
    : '';

  const quoteBlock = insp.quote
    ? `<div style="text-align:center;padding:40px 20px 32px;border-top:1px solid rgba(255,255,255,0.06);">
        <div style="color:rgba(255,255,255,0.1);font-family:'Playfair Display',Georgia,serif;font-size:72px;line-height:0.6;margin-bottom:20px;user-select:none;">"</div>
        <p style="font-size:34px;font-style:italic;color:rgba(255,255,255,0.9);font-family:'Playfair Display',Georgia,serif;margin:0 0 18px;line-height:1.45;max-width:640px;margin-left:auto;margin-right:auto;">${escapeHtml(insp.quote)}</p>
        ${insp.author ? `<p style="font-size:16px;color:rgba(255,255,255,0.4);margin:0 0 20px;font-weight:600;letter-spacing:0.05em;">— ${escapeHtml(insp.author)}</p>` : ''}
        ${insp.encouragement ? `<div style="display:inline-block;background:rgba(16,185,129,0.12);border:1px solid rgba(16,185,129,0.25);border-radius:10px;padding:12px 24px;font-size:17px;color:#10B981;">${escapeHtml(insp.encouragement)}</div>` : ''}
       </div>`
    : '';

  const closingContent = `
  ${vaultContextBlock}
  ${quoteBlock}
  <div style="text-align:center;padding-top:24px;">
    <a href="/morning-briefs/" style="display:inline-flex;align-items:center;gap:6px;font-size:15px;color:rgba(255,255,255,0.5);text-decoration:none;font-weight:600;padding:10px 24px;border:1.5px solid rgba(255,255,255,0.15);border-radius:8px;" onmouseover="this.style.borderColor='#00D9FF';this.style.color='#00D9FF'" onmouseout="this.style.borderColor='rgba(255,255,255,0.15)';this.style.color='rgba(255,255,255,0.5)'">${svgIcon('newspaper',13,'currentColor')} View past briefs</a>
  </div>`;

  const heading = (vi.hasData && vi.title) ? escapeHtml(vi.title) : 'End of Brief';
  const subtitle = (vi.hasData && vi.context) ? '' : null;
  return landingSection('Vault', heading, subtitle, closingContent, '#00D9FF');
}

// ─── Full page template ───────────────────────────────────────────────────────
function buildPage(d, dateStr) {
  const zone1      = renderCommandCenter(d);
  const zoneStats  = renderWeeklyStats(d);
  const zone2      = renderSignal(d);
  const zone3 = renderOvernight(d);
  const zone4 = renderFocus(d);
  const zone5 = renderIntelligence(d, dateStr);
  const zone6 = renderYouTube(d);
  const zone7 = renderClosing(d);

  const inlineScript = `
<script>
// Tab switching
document.querySelectorAll('.tab-btn').forEach(function(btn) {
  btn.addEventListener('click', function() {
    var tab = btn.dataset.tab;
    document.querySelectorAll('.tab-btn').forEach(function(b) {
      b.classList.remove('active');
      b.style.background = 'transparent';
      b.style.color = 'rgba(255,255,255,0.5)';
      b.style.boxShadow = 'none';
    });
    document.querySelectorAll('.tab-content').forEach(function(c) { c.style.display = 'none'; });
    btn.classList.add('active');
    btn.style.background = '#00D9FF';
    btn.style.color = '#080C18';
    btn.style.boxShadow = '0 2px 8px rgba(0,217,255,0.25)';
    var panel = document.getElementById('tab-' + tab);
    if (panel) panel.style.display = 'block';
  });
});

// Goals form save
var saveBtn = document.getElementById('save-goals-btn');
if (saveBtn) {
  saveBtn.addEventListener('click', async function() {
    var goals = [
      document.getElementById('goal-1').value,
      document.getElementById('goal-2').value,
      document.getElementById('goal-3').value
    ].filter(Boolean);
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving…';
    var successEl = document.getElementById('goals-success');
    var errEl = document.getElementById('goals-error');
    if (errEl) errEl.textContent = '';
    try {
      localStorage.setItem('morning-brief-goals-${dateStr}', JSON.stringify(goals));
      if (successEl) { successEl.style.display = 'flex'; }
      saveBtn.style.background = 'linear-gradient(135deg,#10B981,#059669)';
      saveBtn.style.color = '#fff';
      saveBtn.textContent = 'Saved!';
      setTimeout(function() {
        if (successEl) successEl.style.display = 'none';
        saveBtn.style.background = 'linear-gradient(135deg,#00D9FF,#0099BB)';
        saveBtn.style.color = '#080C18';
        saveBtn.textContent = 'Save Goals';
        saveBtn.disabled = false;
      }, 3000);
    } catch(e) {
      if (errEl) errEl.textContent = 'Could not save goals \u2014 localStorage unavailable';
      saveBtn.textContent = 'Save Goals';
      saveBtn.disabled = false;
    }
  });
}

// Park Idea form
var addIdeaBtn = document.getElementById('add-idea-btn');
if (addIdeaBtn) {
  addIdeaBtn.addEventListener('click', async function() {
    var textInput = document.getElementById('new-idea-text');
    var ctxInput  = document.getElementById('new-idea-context');
    var text = textInput ? textInput.value.trim() : '';
    var context = ctxInput ? ctxInput.value.trim() : '';
    var successEl = document.getElementById('add-idea-success');
    var errEl = document.getElementById('add-idea-error');
    if (errEl) errEl.textContent = '';
    if (!text) {
      if (errEl) errEl.textContent = 'Enter an idea first';
      return;
    }
    addIdeaBtn.disabled = true;
    addIdeaBtn.textContent = 'Parking\u2026';
    try {
      var parkedKey = 'morning-brief-parked-ideas';
      var existing = JSON.parse(localStorage.getItem(parkedKey) || '[]');
      existing.push({ text: text, context: context || 'Morning Brief', date: new Date().toISOString() });
      localStorage.setItem(parkedKey, JSON.stringify(existing));
      if (successEl) successEl.style.display = 'inline-flex';
      addIdeaBtn.style.background = 'linear-gradient(135deg,#10B981,#059669)';
      addIdeaBtn.textContent = 'Parked!';
      var list = document.getElementById('parked-ideas-list');
      if (list) {
        var newEl = document.createElement('div');
        newEl.style.cssText = 'padding:10px 14px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-left:3px solid #F59E0B;border-radius:10px;margin-bottom:8px;';
        var esc = function(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); };
        newEl.innerHTML = '<div style="font-size:15px;color:rgba(255,255,255,0.85);font-weight:500;">' + esc(text) + '</div>' +
          '<div style="font-size:13px;color:rgba(255,255,255,0.4);margin-top:4px;">Just now' + (context ? ' \u00b7 ' + esc(context) : '') + '</div>';
        list.appendChild(newEl);
      }
      if (textInput) textInput.value = '';
      if (ctxInput)  ctxInput.value  = '';
      setTimeout(function() {
        if (successEl) successEl.style.display = 'none';
        addIdeaBtn.style.background = 'linear-gradient(135deg,#F59E0B,#D97706)';
        addIdeaBtn.textContent = 'Park Idea';
        addIdeaBtn.disabled = false;
      }, 3000);
    } catch(e) {
      if (errEl) errEl.textContent = 'Could not save \u2014 localStorage unavailable';
      addIdeaBtn.textContent = 'Park Idea';
      addIdeaBtn.disabled = false;
    }
  });
}

// Video ideas toggle
var ideasBtn = document.getElementById('video-ideas-toggle');
if (ideasBtn) {
  ideasBtn.addEventListener('click', function() {
    var extra = document.getElementById('video-ideas-extra');
    if (extra) {
      var shown = extra.style.display !== 'none';
      extra.style.display = shown ? 'none' : 'block';
      ideasBtn.textContent = shown ? 'Show all 10' : 'Show less';
    }
  });
}

// Dismiss a parked idea (strikethrough → collapse → remove)
function dismissParked(id) {
  var el = document.getElementById(id);
  if (!el) return;
  var textEl = el.querySelector('.parked-text');
  if (textEl) textEl.style.textDecoration = 'line-through';
  el.style.opacity = '0.35';
  setTimeout(function() {
    el.style.transition = 'max-height 0.35s ease, margin-bottom 0.35s ease, padding 0.35s ease, opacity 0.35s ease';
    el.style.maxHeight = '0';
    el.style.marginBottom = '0';
    el.style.paddingTop = '0';
    el.style.paddingBottom = '0';
    el.style.opacity = '0';
    setTimeout(function() { if (el.parentNode) el.parentNode.removeChild(el); }, 380);
  }, 320);
}

// Audio player toggle
function toggleAudio() {
  var a = document.getElementById('brief-audio');
  var btn = document.getElementById('audio-btn');
  if (!a) return;
  if (a.paused) {
    var p = a.play();
    if (p !== undefined) {
      p.then(function() {
        btn.textContent = '\u25a0 Stop';
      }).catch(function() {
        btn.textContent = 'Audio unavailable';
        btn.disabled = true;
        btn.style.opacity = '0.5';
        btn.style.cursor = 'default';
      });
    } else {
      btn.textContent = '\u25a0 Stop';
    }
  } else {
    a.pause();
    btn.textContent = '\u25b6 Audio';
  }
}

// Page fade-in
document.body.style.opacity = '0';
document.body.style.transition = 'opacity 0.35s ease';
window.addEventListener('load', function() { document.body.style.opacity = '1'; });

// Scroll reveal
(function() {
  var revealObs = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        revealObs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
  document.querySelectorAll('.brief-section-header, .brief-section-content').forEach(function(el) {
    revealObs.observe(el);
  });
})();
</script>`;

  const navWeather = (() => {
    const hw = d.weather && !d.weather.error;
    if (!hw) return '';
    const navCond = escapeHtml(safe(d.weather.condition, ''));
    const navTemp = safe(d.weather.temp.current, '?');
    const navHigh = safe(d.weather.temp.high, '?');
    const navLow  = safe(d.weather.temp.low, '?');
    const navPrec = safe(d.weather.precipitation, 0);
    const navIcon = weatherIcon(navCond, 16);
    return `<div style="display:flex;align-items:center;gap:10px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:6px 16px;">
      ${navIcon}
      <span style="font-size:18px;font-weight:700;color:#fff;">${navTemp}°</span>
      <span style="font-size:16px;font-weight:500;color:rgba(255,255,255,0.6);">${navCond} · H:${navHigh} L:${navLow} · ${navPrec}% rain</span>
    </div>`;
  })();

  const navBar = `<nav style="position:sticky;top:0;z-index:100;background:rgba(8,12,24,0.85);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);border-bottom:1px solid rgba(255,255,255,0.07);padding:0 40px;height:60px;display:flex;align-items:center;justify-content:space-between;">
  <div style="display:flex;align-items:center;gap:10px;">
    <div style="width:28px;height:28px;background:linear-gradient(135deg,#635bff,#00D9FF);border-radius:6px;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;color:white;">C1</div>
    <span style="font-size:16px;font-weight:600;color:white;">Morning Brief</span>
  </div>
  <div style="display:flex;align-items:center;gap:16px;">
    ${navWeather}
    <span style="font-size:16px;font-weight:500;color:rgba(255,255,255,0.6);">${escapeHtml(safe(d.dateFormatted, dateStr))}</span>
  </div>
</nav>`;

  const orbs = `<div style="position:fixed;top:0;left:0;right:0;bottom:0;pointer-events:none;z-index:0;overflow:hidden;">
  <div style="position:absolute;width:700px;height:700px;background:radial-gradient(circle,rgba(99,91,255,0.18) 0%,transparent 70%);top:-200px;left:-200px;border-radius:50%;filter:blur(60px);"></div>
  <div style="position:absolute;width:500px;height:500px;background:radial-gradient(circle,rgba(0,217,255,0.12) 0%,transparent 70%);top:100px;right:-100px;border-radius:50%;filter:blur(60px);"></div>
  <div style="position:absolute;width:600px;height:400px;background:radial-gradient(circle,rgba(99,91,255,0.1) 0%,transparent 70%);bottom:200px;left:50%;transform:translateX(-50%);border-radius:50%;filter:blur(80px);"></div>
</div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Morning Brief — ${escapeHtml(safe(d.dateFormatted, dateStr))}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Playfair+Display:wght@700&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body { font-family: 'Inter', sans-serif; background: #080C18; color: #FFFFFF; margin: 0; padding: 0; }
    h1,h2,h3 { font-family: 'Space Grotesk', sans-serif; }
    details > summary { -webkit-user-select: none; user-select: none; }
    details > summary::-webkit-details-marker { display: none; }
    ::-webkit-scrollbar { height: 4px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 4px; }
    input::placeholder { color: rgba(255,255,255,0.3); }
    .brief-section-header { opacity: 0; transform: translateY(32px); transition: opacity 0.75s cubic-bezier(0.16,1,0.3,1), transform 0.75s cubic-bezier(0.16,1,0.3,1); }
    .brief-section-content { opacity: 0; transform: translateY(24px); transition: opacity 0.75s cubic-bezier(0.16,1,0.3,1) 0.12s, transform 0.75s cubic-bezier(0.16,1,0.3,1) 0.12s; }
    .brief-section-header.revealed, .brief-section-content.revealed { opacity: 1; transform: translateY(0); }
  </style>
</head>
<body>
  ${navBar}
  ${orbs}
  <div style="max-width:100%;overflow-x:hidden;position:relative;z-index:1;">
    ${zone1}
    ${zoneStats}
    ${zone2}
    ${zone3}
    ${zone4}
    ${zone5}
    ${zone6}
    ${zone7}
  </div>
  ${inlineScript}
</body>
</html>`;
}

// ─── Archive updater ──────────────────────────────────────────────────────────
function updateArchive(dateStr, d) {
  const indexPath = path.join(BRIEFS_DIR, 'index.html');
  const firstSignal = (d.todaysSignal && d.todaysSignal[0]) ? d.todaysSignal[0].text : '';
  const weatherText = (d.weather && !d.weather.error) ? `${safe(d.weather.temp.current, '?')}°F · ${d.weather.condition}` : '';

  const newEntry = `
    <a href="/morning-briefs/${dateStr}.html"
       style="display:flex;justify-content:space-between;align-items:center;padding:14px 20px;background:rgba(255,255,255,0.04);border-radius:12px;border:1px solid rgba(255,255,255,0.08);text-decoration:none;color:inherit;margin-bottom:10px;">
      <div>
        <span style="font-size:17px;font-weight:700;color:rgba(255,255,255,0.9);">${escapeHtml(safe(d.dateFormatted, dateStr))}</span>
        ${firstSignal ? `<p style="font-size:15px;color:rgba(255,255,255,0.5);margin:3px 0 0;">${escapeHtml(firstSignal)}</p>` : ''}
      </div>
      <span style="font-size:14px;color:rgba(255,255,255,0.35);white-space:nowrap;margin-left:12px;">${escapeHtml(weatherText)}</span>
    </a>`;

  if (fs.existsSync(indexPath)) {
    let existing = fs.readFileSync(indexPath, 'utf8');
    const marker = '<!-- BRIEFS_LIST_START -->';
    if (existing.includes(marker)) {
      existing = existing.replace(marker, marker + newEntry);
    } else {
      existing = existing.replace('</body>', newEntry + '</body>');
    }
    fs.writeFileSync(indexPath, existing, 'utf8');
  } else {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Morning Brief Archive</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body { font-family: 'Inter', sans-serif; background: #080C18; color: #FFFFFF; margin: 0; padding: 0; }
  </style>
</head>
<body>
  <div style="max-width:680px;margin:0 auto;padding:40px 20px;">
    <div style="background:linear-gradient(145deg,#0F0F23,#1A1A3E,#0D2847);padding:32px 36px;border-radius:20px;margin-bottom:32px;color:#fff;">
      <h1 style="font-family:'Space Grotesk',sans-serif;font-size:26px;font-weight:700;margin:0 0 6px;">Morning Brief Archive</h1>
      <p style="font-size:16px;opacity:0.55;margin:0;">All past daily briefs</p>
    </div>
    <div id="briefs-list">
      <!-- BRIEFS_LIST_START -->
      ${newEntry}
    </div>
  </div>
</body>
</html>`;
    fs.writeFileSync(indexPath, html, 'utf8');
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────
function main() {
  const arg = process.argv[2];
  const dateStr = arg || new Date().toISOString().slice(0, 10);

  const dataPath = path.join(BRIEFS_DIR, `brief-data-${dateStr}.json`);
  if (!fs.existsSync(dataPath)) {
    console.error(`[morning-brief] Data file not found: ${dataPath}`);
    process.exit(1);
  }

  let data;
  try {
    data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  } catch (err) {
    console.error(`[morning-brief] Failed to parse JSON: ${err.message}`);
    process.exit(1);
  }

  const html = buildPage(data, dateStr);
  const outPath = path.join(BRIEFS_DIR, `${dateStr}.html`);
  fs.writeFileSync(outPath, html, 'utf8');
  console.log(`[morning-brief] Wrote ${outPath}`);

  updateArchive(dateStr, data);
  console.log(`[morning-brief] Archive updated`);
}

main();
