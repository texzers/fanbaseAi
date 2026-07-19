/**
 * Tests for A11ySettings component.
 * Verifies toggle behavior, ARIA attributes, and accessibility.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { A11yProvider } from '../context/A11yContext.js';
import A11ySettings from '../components/A11ySettings.js';

function renderWithA11y(ui: React.ReactElement) {
  return render(<A11yProvider>{ui}</A11yProvider>);
}

describe('A11ySettings', () => {
  it('renders the accessibility panel toggle button', () => {
    renderWithA11y(<A11ySettings />);
    const toggleBtn = screen.getByRole('button', { name: /open accessibility settings/i });
    expect(toggleBtn).toBeInTheDocument();
  });

  it('opens the settings panel when toggle is clicked', () => {
    renderWithA11y(<A11ySettings />);
    const toggleBtn = screen.getByRole('button', { name: /open accessibility settings/i });
    
    // Panel should not be visible initially
    expect(screen.queryByRole('dialog')).toBeNull();
    
    fireEvent.click(toggleBtn);
    expect(screen.getByRole('dialog', { name: /accessibility settings/i })).toBeInTheDocument();
  });

  it('closes the panel when toggle is clicked again', () => {
    renderWithA11y(<A11ySettings />);
    const toggleBtn = screen.getByLabelText(/accessibility settings/i);
    
    fireEvent.click(toggleBtn);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    
    fireEvent.click(toggleBtn);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('renders all three toggle switches when panel is open', () => {
    renderWithA11y(<A11ySettings />);
    fireEvent.click(screen.getByLabelText(/open accessibility settings/i));

    expect(screen.getByRole('switch', { name: /high contrast/i })).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: /large text/i })).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: /plain language/i })).toBeInTheDocument();
  });

  it('high contrast toggle changes aria-checked state', () => {
    renderWithA11y(<A11ySettings />);
    fireEvent.click(screen.getByLabelText(/open accessibility settings/i));

    const toggle = screen.getByRole('switch', { name: /high contrast/i });
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-checked', 'true');
  });

  it('large text toggle changes aria-checked state', () => {
    renderWithA11y(<A11ySettings />);
    fireEvent.click(screen.getByLabelText(/open accessibility settings/i));

    const toggle = screen.getByRole('switch', { name: /large text/i });
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-checked', 'true');
  });

  it('panel toggle button has correct aria-expanded attribute', () => {
    renderWithA11y(<A11ySettings />);
    const toggleBtn = screen.getByLabelText(/open accessibility settings/i);
    
    expect(toggleBtn).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(toggleBtn);
    expect(toggleBtn).toHaveAttribute('aria-expanded', 'true');
  });
});
