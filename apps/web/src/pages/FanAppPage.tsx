/**
 * Fan App Page — mobile-first stadium experience for fans.
 *
 * Tabs:
 * - Chat: AI Concierge in fan's language
 * - Wayfinding: Step-by-step crowd-aware directions
 * - Sustainability: Carbon-aware transport options
 * - Alerts: Live safety/operational announcements
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { useA11y } from '../context/A11yContext.js';
import { chatApi, sustainabilityApi, crowdApi } from '../api/client.js';
import type {
  ChatMessage,
  WayfindingResponse,
  SustainabilityResponse,
  CrowdStatusResponse,
  LiveAlert,
} from '@fanpulse/shared-types';

type FanTab = 'chat' | 'wayfinding' | 'sustainability' | 'alerts';

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'ar', label: 'العربية' },
  { code: 'pt', label: 'Português' },
  { code: 'de', label: 'Deutsch' },
  { code: 'zh', label: '中文' },
  { code: 'ja', label: '日本語' },
];

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function FanAppPage() {
  const { user, logout } = useAuth();
  const { plainLanguage } = useA11y();
  const [activeTab, setActiveTab] = useState<FanTab>('chat');
  const [language, setLanguage] = useState('en');

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--color-bg-base)' }}>
      {/* Header */}
      <header style={{
        background: 'var(--color-bg-surface)',
        borderBottom: '1px solid var(--color-border)',
        padding: '0.875rem 1rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '1.5rem' }} role="img" aria-label="Stadium">🏟️</span>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'var(--text-base)' }}>
              <span className="gradient-text">FanPulse AI</span>
            </div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
              Welcome, {user?.username}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <select
            id="language-selector"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            aria-label="Select your language"
            style={{
              background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)',
              color: 'var(--color-text-primary)', borderRadius: 'var(--radius-md)',
              padding: '0.3rem 0.5rem', fontSize: 'var(--text-xs)', cursor: 'pointer',
            }}
          >
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>{l.label}</option>
            ))}
          </select>
          <button onClick={logout} className="btn btn-ghost btn-sm" aria-label="Sign out">
            ↩
          </button>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav
        aria-label="Fan app navigation"
        style={{
          background: 'var(--color-bg-surface)',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex', padding: '0.5rem',
          overflowX: 'auto', gap: '0.25rem',
        }}
      >
        {([
          { id: 'chat', icon: '💬', label: 'AI Chat' },
          { id: 'wayfinding', icon: '🗺️', label: 'Wayfinding' },
          { id: 'sustainability', icon: '🌱', label: 'Transport' },
          { id: 'alerts', icon: '🔔', label: 'Alerts' },
        ] as const).map((tab) => (
          <button
            key={tab.id}
            id={`tab-${tab.id}`}
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`panel-${tab.id}`}
            onClick={() => setActiveTab(tab.id)}
            className={`nav-tab ${activeTab === tab.id ? 'active' : ''}`}
            style={{ flex: '1 1 auto', justifyContent: 'center', minWidth: 80 }}
          >
            <span aria-hidden="true">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* Tab Panels */}
      <main style={{ flex: 1, overflow: 'hidden' }}>
        <div role="tabpanel" id="panel-chat" aria-labelledby="tab-chat" hidden={activeTab !== 'chat'} style={{ height: '100%' }}>
          {activeTab === 'chat' && <ConciergeChat language={language} plainLanguage={plainLanguage} />}
        </div>
        <div role="tabpanel" id="panel-wayfinding" aria-labelledby="tab-wayfinding" hidden={activeTab !== 'wayfinding'}>
          {activeTab === 'wayfinding' && <WayfindingPanel language={language} />}
        </div>
        <div role="tabpanel" id="panel-sustainability" aria-labelledby="tab-sustainability" hidden={activeTab !== 'sustainability'}>
          {activeTab === 'sustainability' && <SustainabilityPanel language={language} />}
        </div>
        <div role="tabpanel" id="panel-alerts" aria-labelledby="tab-alerts" hidden={activeTab !== 'alerts'}>
          {activeTab === 'alerts' && <AlertsPanel />}
        </div>
      </main>
    </div>
  );
}

// ── Concierge Chat ─────────────────────────────────────────────────────────────

function ConciergeChat({ language, plainLanguage }: { language: string; plainLanguage: boolean }) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `Hi! I'm your FanPulse AI concierge 👋\n\nI can help you with:\n• Finding your gate or seat\n• Nearest restrooms, food courts, prayer & nursing rooms\n• Re-entry rules\n• Accessibility routes\n• Transport options\n\nWhat can I help you with today?`,
      timestamp: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debouncedInput = useDebounce(input, 300);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const history = messages.slice(-8).map((m) => ({ role: m.role, content: m.content }));
      const res = await chatApi.fanChat({
        message: text,
        language,
        conversationHistory: history,
        accessibilityMode: plainLanguage,
      });
      setMessages((prev) => [...prev, res.message]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: '⚠️ Sorry, I could not process your request. Please try again.',
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  }, [input, isLoading, messages, language, plainLanguage]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const QUICK_QUESTIONS = [
    'How do I get to my seat?',
    'Where is the nearest restroom?',
    'Is there a prayer room?',
    'What are the re-entry rules?',
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 130px)', maxWidth: 680, margin: '0 auto', width: '100%' }}>
      {/* Chat messages */}
      <div
        role="log"
        aria-live="polite"
        aria-label="Chat conversation"
        aria-atomic="false"
        style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            className="animate-fadeInUp"
            style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}
          >
            {msg.role === 'assistant' && (
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#1d8ef7,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', marginRight: '0.5rem', flexShrink: 0, marginTop: 4 }} aria-hidden="true">
                🤖
              </div>
            )}
            <div
              className={msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-ai'}
              style={{ fontSize: 'var(--text-sm)', lineHeight: 1.6 }}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} aria-live="polite" aria-label="AI is thinking">
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#1d8ef7,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem' }} aria-hidden="true">🤖</div>
            <div className="chat-bubble-ai" style={{ display: 'flex', gap: 4, padding: '0.75rem 1rem' }}>
              {[0,1,2].map((i) => (
                <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--color-text-muted)', animation: `pulse-red 1.2s ease ${i * 0.2}s infinite` }} />
              ))}
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick questions */}
      {messages.length <= 2 && (
        <div style={{ padding: '0 1rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {QUICK_QUESTIONS.map((q) => (
            <button
              key={q}
              onClick={() => { setInput(q); setTimeout(() => sendMessage, 0); }}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: 'var(--text-xs)' }}
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid var(--color-border)', display: 'flex', gap: '0.5rem', background: 'var(--color-bg-surface)' }}>
        <input
          ref={inputRef}
          id="chat-input"
          type="text"
          className="input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything about the stadium…"
          aria-label="Type your message"
          disabled={isLoading}
          style={{ flex: 1 }}
          maxLength={1000}
        />
        <button
          id="chat-send-btn"
          onClick={sendMessage}
          disabled={!input.trim() || isLoading}
          className="btn btn-primary"
          aria-label="Send message"
          style={{ flexShrink: 0 }}
        >
          {isLoading ? <div className="spinner" aria-hidden="true" /> : '→'}
        </button>
      </div>
    </div>
  );
}

// ── Wayfinding Panel ───────────────────────────────────────────────────────────

function WayfindingPanel({ language }: { language: string }) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [stepFree, setStepFree] = useState(false);
  const [result, setResult] = useState<WayfindingResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!from.trim() || !to.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await chatApi.wayfinding({ fromLocation: from, toLocation: to, preferStepFree: stepFree, language });
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get directions');
    } finally {
      setIsLoading(false);
    }
  };

  const statusColors: Record<string, string> = { low: 'var(--color-crowd-low)', moderate: 'var(--color-crowd-moderate)', congested: 'var(--color-crowd-congested)' };
  const statusIcons: Record<string, string> = { low: '✅', moderate: '⚠️', congested: '🚨' };

  return (
    <div style={{ padding: '1.5rem 1rem', maxWidth: 600, margin: '0 auto' }}>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', fontWeight: 700, marginBottom: '1.5rem' }}>
        🗺️ Smart Wayfinding
      </h2>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <label htmlFor="from-location" style={{ display: 'block', fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginBottom: '0.4rem' }}>
            From (current location)
          </label>
          <input
            id="from-location"
            type="text"
            className="input"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            placeholder="e.g. Gate A, Main Entrance, Section 101"
            required
          />
        </div>
        <div>
          <label htmlFor="to-location" style={{ display: 'block', fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginBottom: '0.4rem' }}>
            To (destination)
          </label>
          <input
            id="to-location"
            type="text"
            className="input"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="e.g. Section 214, North Restroom, Gate C"
            required
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            id="step-free-toggle"
            type="button"
            role="switch"
            aria-checked={stepFree}
            onClick={() => setStepFree(!stepFree)}
            style={{
              width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
              background: stepFree ? 'var(--color-brand-primary)' : 'var(--color-bg-elevated)',
              position: 'relative', flexShrink: 0, transition: 'background 0.2s',
            }}
          >
            <div style={{
              width: 18, height: 18, borderRadius: '50%', background: 'white',
              position: 'absolute', top: 3, transition: 'left 0.2s',
              left: stepFree ? 'calc(100% - 21px)' : 3,
            }} />
            <span className="sr-only">{stepFree ? 'Step-free route on' : 'Step-free route off'}</span>
          </button>
          <label htmlFor="step-free-toggle" style={{ fontSize: 'var(--text-sm)', cursor: 'pointer' }}>
            ♿ Step-free route (elevators only, no stairs)
          </label>
        </div>
        <button id="get-directions-btn" type="submit" className="btn btn-primary" disabled={isLoading || !from || !to}>
          {isLoading ? <><div className="spinner" aria-hidden="true" /> Getting directions…</> : '🗺️ Get AI Directions'}
        </button>
      </form>

      {error && <div role="alert" className="alert alert-critical" style={{ marginBottom: '1rem' }}><span>⚠️</span><span>{error}</span></div>}

      {result && (
        <div className="card animate-fadeInUp" aria-label="Wayfinding directions">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <span style={{ fontSize: '1.25rem' }} aria-hidden="true">{statusIcons[result.routeStatus]}</span>
            <div>
              <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>
                Route Status: <span style={{ color: statusColors[result.routeStatus] }}>{result.routeStatus.toUpperCase()}</span>
              </div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                ~{result.estimatedMinutes} min walk{result.stepFreeRoute ? ' • ♿ Step-free' : ''}
              </div>
            </div>
          </div>
          <div
            aria-live="polite"
            style={{ fontSize: 'var(--text-sm)', lineHeight: 1.8, whiteSpace: 'pre-wrap', color: 'var(--color-text-primary)' }}
          >
            {result.directions}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sustainability Panel ───────────────────────────────────────────────────────

function SustainabilityPanel({ language }: { language: string }) {
  const [origin, setOrigin] = useState('');
  const [result, setResult] = useState<SustainabilityResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!origin.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await sustainabilityApi.getRecommendations({ origin, language });
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get recommendations');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ padding: '1.5rem 1rem', maxWidth: 600, margin: '0 auto' }}>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', fontWeight: 700, marginBottom: '0.5rem' }}>
        🌱 Sustainability Assistant
      </h2>
      <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)', marginBottom: '1.5rem' }}>
        Find the lowest-carbon way to reach the stadium
      </p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <label htmlFor="origin-input" style={{ display: 'block', fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginBottom: '0.4rem' }}>
            Your starting location
          </label>
          <input
            id="origin-input"
            type="text"
            className="input"
            value={origin}
            onChange={(e) => setOrigin(e.target.value)}
            placeholder="e.g. Downtown, Airport, North District"
            required
          />
        </div>
        <button id="get-transport-btn" type="submit" className="btn btn-primary" disabled={isLoading || !origin}>
          {isLoading ? <><div className="spinner" aria-hidden="true" /> Finding options…</> : '🌱 Get Green Transport Options'}
        </button>
      </form>

      {error && <div role="alert" className="alert alert-critical"><span>⚠️</span><span>{error}</span></div>}

      {result && (
        <div className="animate-fadeInUp" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="card" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
            <div style={{ fontSize: 'var(--text-sm)', color: '#6ee7b7', lineHeight: 1.7 }}>
              {result.aiSummary}
            </div>
            {result.carbonSavedVsDriving > 0 && (
              <div style={{ marginTop: '0.75rem', padding: '0.5rem 0.75rem', background: 'rgba(16,185,129,0.12)', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)', color: 'var(--color-crowd-low)', fontWeight: 600 }}>
                🌍 Save ~{result.carbonSavedVsDriving.toFixed(1)} kg CO₂ vs driving alone
              </div>
            )}
          </div>

          {result.options.map((opt, i) => (
            <div
              key={i}
              className="card"
              style={{ border: opt.isBestOption ? '1px solid rgba(16,185,129,0.5)' : undefined }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>
                  {opt.isBestOption && <span style={{ color: 'var(--color-crowd-low)', marginRight: '0.4rem' }}>★</span>}
                  {opt.mode}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
                  <span className="badge badge-info">~{opt.estimatedMinutes} min</span>
                  <span className="badge" style={{ background: 'rgba(16,185,129,0.1)', color: 'var(--color-crowd-low)', border: '1px solid rgba(16,185,129,0.25)' }}>
                    {opt.carbonKgCO2.toFixed(1)} kg CO₂
                  </span>
                </div>
              </div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>{opt.details}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Alerts Panel ───────────────────────────────────────────────────────────────

function AlertsPanel() {
  const [alerts, setAlerts] = useState<LiveAlert[]>([]);
  const [crowdStatus, setCrowdStatus] = useState<CrowdStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const SEED_ALERTS: LiveAlert[] = [
      { id: 'a1', type: 'operational', title: 'Gates Open — Match Day', content: 'All gates are now open. Please proceed to your assigned gate. Show your ticket QR code at turnstiles.', severity: 'info', issuedAt: new Date().toISOString() },
      { id: 'a2', type: 'transport', title: 'Metro Running — Extended Service', content: 'Metro Line 7 and Bus Route 42 are operating extended hours today. Free service for ticket holders.', severity: 'info', issuedAt: new Date(Date.now() - 10 * 60000).toISOString() },
      { id: 'a3', type: 'safety', title: 'No Re-Entry After Kickoff', content: 'Once the match begins, re-entry is not permitted. Plan restroom and food visits before kickoff.', severity: 'warning', issuedAt: new Date(Date.now() - 30 * 60000).toISOString() },
    ];
    setAlerts(SEED_ALERTS);

    crowdApi.getStatus().then((s) => setCrowdStatus(s)).catch(console.error).finally(() => setIsLoading(false));

    const interval = setInterval(() => {
      crowdApi.getStatus().then(setCrowdStatus).catch(console.error);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const severityClass: Record<string, string> = { info: 'alert-info', warning: 'alert-warning', critical: 'alert-critical' };
  const typeIcon: Record<string, string> = { safety: '🛡️', operational: '📢', weather: '🌤️', transport: '🚇' };

  return (
    <div style={{ padding: '1.5rem 1rem', maxWidth: 600, margin: '0 auto' }}>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', fontWeight: 700, marginBottom: '1.5rem' }}>
        🔔 Live Alerts
      </h2>

      {/* Crowd Status Summary */}
      {isLoading ? (
        <div className="skeleton" style={{ height: 80, marginBottom: '1.5rem' }} aria-label="Loading crowd status" />
      ) : crowdStatus && (
        <div className="card" style={{ marginBottom: '1.5rem', background: 'var(--color-bg-elevated)' }} aria-label="Overall crowd status">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>Stadium Crowd Status</span>
            <span className={`badge badge-${crowdStatus.overallStatus}`}>
              {crowdStatus.overallStatus.toUpperCase()}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {crowdStatus.zones.map((z) => (
              <div key={z.zoneId} className="badge" style={{ background: 'var(--color-bg-base)' }}>
                {z.zoneName.split(' ')[0]}: {z.avgDensityPercentage}%
              </div>
            ))}
          </div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
            ⚠️ Simulated data — not real IoT feed
          </div>
        </div>
      )}

      {/* Alerts */}
      <div
        aria-live="polite"
        aria-label="Live alerts"
        style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
      >
        {alerts.map((alert) => (
          <div key={alert.id} className={`alert ${severityClass[alert.severity]}`} role="article">
            <span style={{ fontSize: '1.25rem' }} aria-hidden="true">{typeIcon[alert.type] ?? '📢'}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)', marginBottom: '0.25rem' }}>{alert.title}</div>
              <div style={{ fontSize: 'var(--text-sm)', lineHeight: 1.5 }}>{alert.content}</div>
              <div style={{ fontSize: 'var(--text-xs)', opacity: 0.7, marginTop: '0.4rem' }}>
                {new Date(alert.issuedAt).toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
