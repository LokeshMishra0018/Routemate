import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { RegisterPage } from '../../src/pages/auth/RegisterPage';
import { VerifyEmailPage } from '../../src/pages/auth/VerifyEmailPage';
import { ForgotPasswordPage } from '../../src/pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '../../src/pages/auth/ResetPasswordPage';
import { OnboardingPage } from '../../src/pages/auth/OnboardingPage';
import { AuthContext } from '../../src/context/AuthContext';
import { ToastProvider } from '../../src/context/ToastContext';
import { apiClient } from '../../src/services/api.client';

vi.mock('../../src/services/api.client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
  setAuthToken: vi.fn(),
  getAuthToken: vi.fn(() => null),
}));

describe('Auth Feature Pages Test Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('RegisterPage', () => {
    it('fetches colleges and renders registration form', async () => {
      (apiClient.get as any).mockResolvedValueOnce({
        data: {
          data: [{ id: 'kiet-1', name: 'KIET Group of Institutions', domain: 'kiet.edu' }],
        },
      });

      const mockRegister = vi.fn().mockResolvedValue({ userId: 'u1' });

      render(
        <AuthContext.Provider
          value={{
            user: null,
            profile: null,
            isAuthenticated: false,
            isLoading: false,
            login: vi.fn(),
            loginWithGoogle: vi.fn(),
            register: mockRegister,
            logout: vi.fn(),
            refreshProfile: vi.fn(),
            updateProfileState: vi.fn(),
          }}
        >
          <BrowserRouter>
            <RegisterPage />
          </BrowserRouter>
        </AuthContext.Provider>
      );

      expect(screen.getByText('Join RouteMate')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Aarav Sharma')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('aarav.sharma@kiet.edu')).toBeInTheDocument();

      await waitFor(() => {
        expect(apiClient.get).toHaveBeenCalledWith('/colleges');
      });
    });
  });

  describe('VerifyEmailPage', () => {
    it('renders 6-digit OTP input and verify button', () => {
      render(
        <BrowserRouter>
          <VerifyEmailPage />
        </BrowserRouter>
      );

      expect(screen.getByText('Verify College Email')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Verify & Activate Account/i })).toBeInTheDocument();
      expect(screen.getByText(/Resend in/i)).toBeInTheDocument();
    });
  });

  describe('ForgotPasswordPage & ResetPasswordPage', () => {
    it('renders forgot password recovery form', () => {
      render(
        <BrowserRouter>
          <ForgotPasswordPage />
        </BrowserRouter>
      );

      expect(screen.getByText('Forgot Password')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('student@kiet.edu')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Send Recovery Email/i })).toBeInTheDocument();
    });

    it('renders reset password form with 6-digit OTP and new password inputs', () => {
      render(
        <BrowserRouter>
          <ResetPasswordPage />
        </BrowserRouter>
      );

      expect(screen.getByText('Reset Password')).toBeInTheDocument();
      expect(screen.getByText('6-Digit Reset Code')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('student@kiet.edu')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Update Password/i })).toBeInTheDocument();
    });
  });

  describe('OnboardingPage', () => {
    it('renders onboarding profile setup form with academic year and bio fields', () => {
      render(
        <AuthContext.Provider
          value={{
            user: { id: 'u1', email: 'test@kiet.edu', role: 'student', status: 'active', emailVerified: true },
            profile: {
              id: 'p1',
              userId: 'u1',
              fullName: 'Aarav Student',
              collegeId: 'kiet',
              academicYear: 2,
              gender: 'male',
              trustScore: 50,
              averageRating: 5.0,
              completedTripCount: 0,
              connectionCount: 0,
              verificationStatus: 'unverified',
              createdAt: '2026-08-01',
              updatedAt: '2026-08-01',
            },
            isAuthenticated: true,
            isLoading: false,
            login: vi.fn(),
            loginWithGoogle: vi.fn(),
            register: vi.fn(),
            logout: vi.fn(),
            refreshProfile: vi.fn(),
            updateProfileState: vi.fn(),
          }}
        >
          <ToastProvider>
            <BrowserRouter>
              <OnboardingPage />
            </BrowserRouter>
          </ToastProvider>
        </AuthContext.Provider>
      );

      expect(screen.getByText('Student Onboarding')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Aarav Student')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Finish & Explore Campus Trips/i })).toBeInTheDocument();
    });
  });
});
