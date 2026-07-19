import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';

/** Demo credentials for quick testing — shown on the login screen. */
const DEMO_CREDENTIALS = [
  {
    role: 'fan' as const,
    username: 'alex_fan',
    password: 'fan123',
    label: '⚽ Fan',
    description: 'Stadium navigation, chat, sustainability',
    color: '#1d8ef7',
    gradient: 'rgba(29,142,247',
  },
  {
    role: 'volunteer' as const,
    username: 'sam_volunteer',
    password: 'vol123',
    label: '🦺 Volunteer',
    description: 'Incident reporting, ops dashboard',
    color: '#10b981',
    gradient: 'rgba(16,185,129',
  },
  {
    role: 'organizer' as const,
    username: 'admin_organizer',
    password: 'org123',
    label: '🏟️ Organizer',
    description: 'Full ops dashboard, briefings, crowd intel',
    color: '#7c3aed',
    gradient: 'rgba(124,58,237',
  },
];

export default function LoginPage() {
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ username: '', password: '' });
  const [activeQuickLogin, setActiveQuickLogin] = useState<string | null>(null);

  const handleQuickLogin = async (cred: (typeof DEMO_CREDENTIALS)[number]) => {
    setError(null);
    setActiveQuickLogin(cred.role);
    try {
      await login(cred.username, cred.password);
      navigate(cred.role === 'fan' ? '/fan' : '/ops');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setActiveQuickLogin(null);
    }
  };

  const handleManualLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await login(form.username, form.password);
      navigate('/fan');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    }
  };

  return (
    <main
      style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}
      aria-label="FanPulse AI login page"
    >
      {/* Background gradients */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0,
        background: 'radial-gradient(ellipse at 20% 20%, rgba(29,142,247,0.12) 0%, transparent 60%), radial-gradient(ellipse at 80% 80%, rgba(124,58,237,0.12) 0%, transparent 60%)',
      }} aria-hidden="true" />

      {/* Grid pattern */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0, opacity: 0.03,
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
        backgroundSize: '60px 60px',
      }} aria-hidden="true" />

      <div style={{
        position: 'relative', zIndex: 1, flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem', gap: '2rem',
      }}>

        {/* Logo / Header */}
        <header className="animate-fadeInUp" style={{ textAlign: 'center' }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%', margin: '0 auto 1rem',
            background: 'linear-gradient(135deg, #1d8ef7, #7c3aed)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '2rem', boxShadow: '0 0 40px rgba(29,142,247,0.4)',
          }} role="img" aria-label="Stadium icon">
            🏟️
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 800, marginBottom: '0.5rem' }}>
            <span className="gradient-text">FanPulse AI</span>
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '1rem' }}>
            GenAI-Powered Stadium Operations & Fan Experience
          </p>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            FIFA World Cup 2026
          </p>
        </header>

        {/* Quick Login Cards */}
        <section
          className="animate-fadeInUp"
          aria-labelledby="quick-login-heading"
          style={{ width: '100%', maxWidth: 640 }}
        >
          <h2 id="quick-login-heading" style={{
            fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)',
            textAlign: 'center', marginBottom: '1rem',
            textTransform: 'uppercase', letterSpacing: '0.12em',
          }}>
            Quick Demo Login
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
            {DEMO_CREDENTIALS.map((cred) => (
              <button
                key={cred.role}
                id={`quick-login-${cred.role}`}
                onClick={() => handleQuickLogin(cred)}
                disabled={isLoading}
                className="card"
                style={{
                  textAlign: 'left', cursor: isLoading ? 'not-allowed' : 'pointer',
                  opacity: isLoading && activeQuickLogin !== cred.role ? 0.5 : 1,
                  transition: 'all 0.25s ease',
                  background: activeQuickLogin === cred.role ? `${cred.gradient},0.15)` : undefined,
                  borderColor: activeQuickLogin === cred.role ? cred.color : undefined,
                }}
                aria-label={`Quick login as ${cred.label}. ${cred.description}`}
                aria-busy={activeQuickLogin === cred.role}
              >
                <div style={{ fontSize: '1.75rem', marginBottom: '0.75rem' }}>{cred.label}</div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
                  {cred.description}
                </div>
                {activeQuickLogin === cred.role && (
                  <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div className="spinner" style={{ width: 14, height: 14 }} />
                    <span style={{ fontSize: 'var(--text-xs)', color: cred.color }}>Signing in…</span>
                  </div>
                )}
              </button>
            ))}
          </div>
        </section>

        {/* Manual Login Form */}
        <div className="card animate-fadeInUp" style={{ width: '100%', maxWidth: 400 }}>
          <h2 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, marginBottom: '1.25rem', color: 'var(--color-text-secondary)', textAlign: 'center' }}>
            Or sign in manually
          </h2>
          <form onSubmit={handleManualLogin} noValidate>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label htmlFor="username" style={{ display: 'block', fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginBottom: '0.4rem' }}>
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  className="input"
                  value={form.username}
                  onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                  autoComplete="username"
                  required
                  placeholder="e.g. alex_fan"
                />
              </div>
              <div>
                <label htmlFor="password" style={{ display: 'block', fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginBottom: '0.4rem' }}>
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  className="input"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  autoComplete="current-password"
                  required
                  placeholder="••••••••"
                />
              </div>

              {error && (
                <div role="alert" aria-live="assertive" className="alert alert-critical">
                  <span aria-hidden="true">⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              <button
                id="manual-login-btn"
                type="submit"
                className="btn btn-primary btn-full"
                disabled={isLoading}
                aria-busy={isLoading}
              >
                {isLoading ? (
                  <><div className="spinner" aria-hidden="true" /><span>Signing in…</span></>
                ) : (
                  'Sign In'
                )}
              </button>
            </div>
          </form>
        </div>

        <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)', textAlign: 'center' }}>
          Demo platform — no real personal data is collected or stored.
        </p>
      </div>
    </main>
  );
}
