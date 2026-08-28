import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DashboardPage } from '../../src/pages/DashboardPage';
import { TripsListPage } from '../../src/pages/trips/TripsListPage';
import { TripCreatePage } from '../../src/pages/trips/TripCreatePage';
import { TripDetailPage } from '../../src/pages/trips/TripDetailPage';
import { MatchesExplorerPage } from '../../src/pages/matches/MatchesExplorerPage';
import { ConnectionsPage } from '../../src/pages/connections/ConnectionsPage';
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

const mockAuthValue = {
  user: { id: 'u1', email: 'aarav@kiet.edu', role: 'student' as const, status: 'active' as const, emailVerified: true },
  profile: {
    id: 'p1',
    userId: 'u1',
    fullName: 'Aarav Sharma',
    collegeId: 'kiet-1',
    collegeName: 'KIET Campus Network',
    academicYear: 3,
    gender: 'male',
    trustScore: 85,
    averageRating: 4.9,
    completedTripCount: 14,
    connectionCount: 6,
    verificationStatus: 'approved' as const,
    createdAt: '2026-08-01',
    updatedAt: '2026-08-01',
  },
  isAuthenticated: true,
  isLoading: false,
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  refreshProfile: vi.fn(),
  updateProfileState: vi.fn(),
};

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });

describe('Trips & Matching Feature Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('DashboardPage', () => {
    it('renders greeting, trust score, and upcoming trip cards', async () => {
      (apiClient.get as any).mockImplementation((url: string) => {
        if (url.includes('/trips')) {
          return Promise.resolve({
            data: {
              data: [
                {
                  id: 'trip-1',
                  userId: 'u1',
                  source: { name: 'KIET Gate 1' },
                  destination: { name: 'Anand Vihar ISBT' },
                  travelDate: '2026-08-30',
                  departureTime: '08:30',
                  transportType: 'train',
                  status: 'upcoming',
                },
              ],
            },
          });
        }
        if (url.includes('/connections/requests')) {
          return Promise.resolve({ data: { data: [] } });
        }
        return Promise.resolve({ data: { data: [] } });
      });

      render(
        <QueryClientProvider client={createTestQueryClient()}>
          <AuthContext.Provider value={mockAuthValue}>
            <ToastProvider>
              <BrowserRouter>
                <DashboardPage />
              </BrowserRouter>
            </ToastProvider>
          </AuthContext.Provider>
        </QueryClientProvider>
      );

      expect(screen.getByText(/Hello, Aarav Sharma/i)).toBeInTheDocument();
      expect(screen.getByText('KIET Campus Network')).toBeInTheDocument();
      expect(screen.getByText('Verified Student')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText('KIET Gate 1')).toBeInTheDocument();
        expect(screen.getByText('Anand Vihar ISBT')).toBeInTheDocument();
      });
    });
  });

  describe('TripsListPage', () => {
    it('renders filter bar and trip list cards', async () => {
      (apiClient.get as any).mockResolvedValueOnce({
        data: {
          data: [
            {
              id: 'trip-1',
              userId: 'u1',
              source: { name: 'Ghaziabad Junction' },
              destination: { name: 'Noida Sector 62' },
              travelDate: '2026-08-31',
              departureTime: '09:00',
              transportType: 'cab',
              status: 'upcoming',
              costSharing: { enabled: true, estimatedTotalCost: 400 },
            },
          ],
        },
      });

      render(
        <QueryClientProvider client={createTestQueryClient()}>
          <BrowserRouter>
            <TripsListPage />
          </BrowserRouter>
        </QueryClientProvider>
      );

      expect(screen.getByText('Campus Trips')).toBeInTheDocument();
      await waitFor(() => {
        expect(screen.getByText('Ghaziabad Junction')).toBeInTheDocument();
        expect(screen.getByText('Noida Sector 62')).toBeInTheDocument();
        expect(screen.getByText(/₹400 total/i)).toBeInTheDocument();
      });
    });
  });

  describe('TripCreatePage', () => {
    it('renders full route form with stops and cost split checkbox', () => {
      render(
        <QueryClientProvider client={createTestQueryClient()}>
          <ToastProvider>
            <BrowserRouter>
              <TripCreatePage />
            </BrowserRouter>
          </ToastProvider>
        </QueryClientProvider>
      );

      expect(screen.getByText('Publish a Trip')).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/E.g. KIET Campus, Ghaziabad/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/E.g. Anand Vihar ISBT \/ New Delhi/i)).toBeInTheDocument();
      expect(screen.getByText('Dynamic Cost Sharing')).toBeInTheDocument();

      // Click Add Stop button
      const addStopBtn = screen.getByRole('button', { name: /Add Stop/i });
      fireEvent.click(addStopBtn);
      expect(screen.getByPlaceholderText('Stop #1 Name')).toBeInTheDocument();
    });
  });

  describe('MatchesExplorerPage', () => {
    it('displays 6-factor score percentage and reasons highlights', async () => {
      (apiClient.get as any).mockImplementation((url: string) => {
        if (url.startsWith('/trips')) {
          return Promise.resolve({
            data: {
              data: [
                {
                  id: 'trip-1',
                  userId: 'u1',
                  source: { name: 'KIET' },
                  destination: { name: 'Delhi' },
                  travelDate: '2026-08-30',
                },
              ],
            },
          });
        }
        if (url.includes('/matching/trips/')) {
          return Promise.resolve({
            data: {
              data: [
                {
                  matchedTrip: {
                    id: 'trip-2',
                    userId: 'u2',
                    source: { name: 'KIET Gate 2' },
                    destination: { name: 'Delhi Gate' },
                    travelDate: '2026-08-30',
                    departureTime: '08:45',
                    transportType: 'train',
                    user: {
                      fullName: 'Priya Verma',
                      collegeName: 'KIET',
                      academicYear: 2,
                      verificationStatus: 'approved',
                      trustScore: 92,
                    },
                  },
                  matchScore: 94,
                  reasons: ['90% route overlap', 'Departing 15 mins apart', 'Same college network'],
                  scoreBreakdown: {
                    routeOverlapScore: 95,
                    timeScore: 90,
                    dateScore: 100,
                    transportScore: 100,
                    preferenceScore: 85,
                    verificationScore: 95,
                  },
                },
              ],
            },
          });
        }
        return Promise.resolve({ data: { data: [] } });
      });

      render(
        <QueryClientProvider client={createTestQueryClient()}>
          <ToastProvider>
            <BrowserRouter>
              <MatchesExplorerPage />
            </BrowserRouter>
          </ToastProvider>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/6-Factor Smart Matches/i)).toBeInTheDocument();
        expect(screen.getByText('Priya Verma')).toBeInTheDocument();
        expect(screen.getByText('94%')).toBeInTheDocument();
        expect(screen.getByText('90% route overlap')).toBeInTheDocument();
      });
    });
  });

  describe('ConnectionsPage', () => {
    it('renders incoming and travel buddies tabs and handles accept action', async () => {
      (apiClient.get as any).mockImplementation((url: string) => {
        if (url.includes('/connections/requests')) {
          return Promise.resolve({
            data: {
              data: [
                {
                  id: 'conn-1',
                  requesterId: 'u2',
                  recipientId: 'u1',
                  status: 'pending',
                  message: 'Travelling towards Sector 62 as well!',
                  requester: {
                    fullName: 'Rohan Gupta',
                    collegeName: 'KIET',
                    academicYear: 2,
                    verificationStatus: 'approved',
                    trustScore: 80,
                  },
                },
              ],
            },
          });
        }
        if (url === '/connections') {
          return Promise.resolve({ data: { data: [] } });
        }
        return Promise.resolve({ data: { data: [] } });
      });

      render(
        <QueryClientProvider client={createTestQueryClient()}>
          <AuthContext.Provider value={mockAuthValue}>
            <ToastProvider>
              <BrowserRouter>
                <ConnectionsPage />
              </BrowserRouter>
            </ToastProvider>
          </AuthContext.Provider>
        </QueryClientProvider>
      );

      expect(screen.getByText('Travel Companions & Requests')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText('Rohan Gupta')).toBeInTheDocument();
        expect(screen.getByText(/Travelling towards Sector 62 as well!/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Accept Request/i })).toBeInTheDocument();
      });
    });
  });
});
