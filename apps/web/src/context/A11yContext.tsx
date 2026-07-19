/**
 * A11yContext — accessibility settings state and actions.
 *
 * Provides:
 * - High contrast mode toggle
 * - Large text mode toggle (up to 200% scaling per WCAG requirement)
 * - Plain language / simplified language mode
 * - Reduced motion preference (auto-detected from OS)
 *
 * Settings are persisted in localStorage so they survive page refreshes.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface A11ySettings {
  highContrast: boolean;
  largeText: boolean;
  plainLanguage: boolean;
  reducedMotion: boolean; // read-only, from OS preference
}

interface A11yContextValue extends A11ySettings {
  toggleHighContrast: () => void;
  toggleLargeText: () => void;
  togglePlainLanguage: () => void;
}

const A11yContext = createContext<A11yContextValue | null>(null);

const STORAGE_KEY = 'fanpulse_a11y';

function loadSettings(): Partial<A11ySettings> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? (JSON.parse(stored) as Partial<A11ySettings>) : {};
  } catch {
    return {};
  }
}

function saveSettings(settings: Partial<A11ySettings>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function A11yProvider({ children }: { children: React.ReactNode }) {
  const stored = loadSettings();

  const [highContrast, setHighContrast] = useState(stored.highContrast ?? false);
  const [largeText, setLargeText] = useState(stored.largeText ?? false);
  const [plainLanguage, setPlainLanguage] = useState(stored.plainLanguage ?? false);
  const [reducedMotion, setReducedMotion] = useState(false);

  // Detect OS reduced-motion preference
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Apply CSS classes to document root
  useEffect(() => {
    document.documentElement.classList.toggle('high-contrast', highContrast);
    document.documentElement.classList.toggle('large-text', largeText);
    document.documentElement.classList.toggle('reduced-motion', reducedMotion);
  }, [highContrast, largeText, reducedMotion]);

  const toggleHighContrast = useCallback(() => {
    setHighContrast((prev) => {
      const next = !prev;
      saveSettings({ highContrast: next, largeText, plainLanguage });
      return next;
    });
  }, [largeText, plainLanguage]);

  const toggleLargeText = useCallback(() => {
    setLargeText((prev) => {
      const next = !prev;
      saveSettings({ highContrast, largeText: next, plainLanguage });
      return next;
    });
  }, [highContrast, plainLanguage]);

  const togglePlainLanguage = useCallback(() => {
    setPlainLanguage((prev) => {
      const next = !prev;
      saveSettings({ highContrast, largeText, plainLanguage: next });
      return next;
    });
  }, [highContrast, largeText]);

  return (
    <A11yContext.Provider
      value={{
        highContrast,
        largeText,
        plainLanguage,
        reducedMotion,
        toggleHighContrast,
        toggleLargeText,
        togglePlainLanguage,
      }}
    >
      {children}
    </A11yContext.Provider>
  );
}

export function useA11y(): A11yContextValue {
  const ctx = useContext(A11yContext);
  if (!ctx) throw new Error('useA11y must be used within A11yProvider');
  return ctx;
}
