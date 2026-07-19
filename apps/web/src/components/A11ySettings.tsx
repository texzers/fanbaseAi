/**
 * A11y Settings Panel — floating accessibility controls.
 * First-class feature, not an afterthought.
 */

import React, { useState } from 'react';
import { useA11y } from '../context/A11yContext.js';

export default function A11ySettings() {
  const { highContrast, largeText, plainLanguage, reducedMotion, toggleHighContrast, toggleLargeText, togglePlainLanguage } = useA11y();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div style={{ position: 'fixed', bottom: '1.5rem', right: '1.5rem', zIndex: 1000 }}>
      {isOpen && (
        <div
          role="dialog"
          aria-label="Accessibility settings"
          aria-modal="false"
          className="glass"
          style={{ marginBottom: '0.75rem', padding: '1.25rem', width: 260, boxShadow: 'var(--shadow-lg)' }}
        >
          <h2 style={{ fontSize: 'var(--text-sm)', fontWeight: 700, marginBottom: '1rem', color: 'var(--color-text-primary)' }}>
            ♿ Accessibility
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <ToggleRow
              id="toggle-high-contrast"
              label="High Contrast"
              description="Increases color contrast for readability"
              checked={highContrast}
              onChange={toggleHighContrast}
            />
            <ToggleRow
              id="toggle-large-text"
              label="Large Text"
              description="Scales text to 200% for better visibility"
              checked={largeText}
              onChange={toggleLargeText}
            />
            <ToggleRow
              id="toggle-plain-language"
              label="Plain Language"
              description="AI uses simplified language in responses"
              checked={plainLanguage}
              onChange={togglePlainLanguage}
            />
            {reducedMotion && (
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', padding: '0.5rem', background: 'var(--color-bg-base)', borderRadius: 'var(--radius-sm)' }}>
                ✓ Reduced motion detected from your OS settings
              </div>
            )}
          </div>
        </div>
      )}

      <button
        id="a11y-panel-toggle"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-controls="a11y-panel"
        aria-label={isOpen ? 'Close accessibility settings' : 'Open accessibility settings'}
        className="btn btn-secondary"
        style={{ borderRadius: 'var(--radius-full)', width: 52, height: 52, padding: 0, justifyContent: 'center', fontSize: '1.25rem', boxShadow: 'var(--shadow-md)' }}
      >
        ♿
      </button>
    </div>
  );
}

interface ToggleRowProps {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
}

function ToggleRow({ id, label, description, checked, onChange }: ToggleRowProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
      <div style={{ flex: 1 }}>
        <label htmlFor={id} style={{ fontSize: 'var(--text-sm)', fontWeight: 600, cursor: 'pointer', display: 'block' }}>
          {label}
        </label>
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>{description}</span>
      </div>
      <button
        id={id}
        role="switch"
        aria-checked={checked}
        onClick={onChange}
        style={{
          width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
          background: checked ? 'var(--color-brand-primary)' : 'var(--color-bg-elevated)',
          position: 'relative', flexShrink: 0, transition: 'background 0.2s',
          outline: 'none',
        }}
      >
        <div style={{
          width: 18, height: 18, borderRadius: '50%', background: 'white',
          position: 'absolute', top: 3, transition: 'left 0.2s',
          left: checked ? 'calc(100% - 21px)' : 3,
        }} />
        <span className="sr-only">{checked ? 'On' : 'Off'}</span>
      </button>
    </div>
  );
}
