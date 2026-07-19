/**
 * Tests for LoginPage component.
 * Covers rendering, quick login buttons, form validation, and ARIA.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext.js';
import { A11yProvider } from '../context/A11yContext.js';
import LoginPage from '../pages/LoginPage.js';

// Mock fetch for auth API
const mockFetch = vi.fn();
global.fetch = mockFetch;

function renderLoginPage() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <A11yProvider>
          <LoginPage />
        </A11yProvider>
      </AuthProvider>
    </MemoryRouter>
  );
}

describe('LoginPage', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('renders the FanPulse AI title', () => {
    renderLoginPage();
    expect(screen.getByRole('heading', { name: /fanpulse ai/i })).toBeInTheDocument();
  });

  it('renders all three quick login buttons', () => {
    renderLoginPage();
    expect(screen.getByRole('button', { name: /quick login as.*fan/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /quick login as.*volunteer/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /quick login as.*organizer/i })).toBeInTheDocument();
  });

  it('renders the manual login form with username and password fields', () => {
    renderLoginPage();
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('displays error on invalid credentials', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ success: false, error: 'Invalid username or password.' }),
    });

    renderLoginPage();
    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'bad_user' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'wrongpass' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  it('has accessible landmark regions', () => {
    renderLoginPage();
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /quick demo login/i })).toBeInTheDocument();
  });

  it('username field has unique id for test automation', () => {
    renderLoginPage();
    expect(document.getElementById('username')).toBeInTheDocument();
    expect(document.getElementById('password')).toBeInTheDocument();
    expect(document.getElementById('manual-login-btn')).toBeInTheDocument();
  });
});
