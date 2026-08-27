import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter, MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ChatPage } from '../../src/pages/chat/ChatPage';
import { GroupsPage } from '../../src/pages/groups/GroupsPage';
import { GroupDetailPage } from '../../src/pages/groups/GroupDetailPage';
import { ProfilePage } from '../../src/pages/profile/ProfilePage';
import { VerificationPage } from '../../src/pages/verification/VerificationPage';
import { SafetyHubPage } from '../../src/pages/safety/SafetyHubPage';
import { AdminDashboardPage } from '../../src/pages/admin/AdminDashboardPage';
import { AdminVerificationsPage } from '../../src/pages/admin/AdminVerificationsPage';
import { AdminReportsPage } from '../../src/pages/admin/AdminReportsPage';
import { AdminSosPage } from '../../src/pages/admin/AdminSosPage';
import { AdminUsersPage } from '../../src/pages/admin/AdminUsersPage';
import { AuthContext } from '../../src/context/AuthContext';
import { SocketContext } from '../../src/context/SocketContext';
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

const mockAdminUser = {
  id: 'admin-1',
  email: 'moderator@kiet.edu',
  role: 'moderator' as const,
  status: 'active' as const,
  emailVerified: true,
};

const mockAdminProfile = {
  id: 'p-admin',
  userId: 'admin-1',
  fullName: 'Campus Moderator',
  collegeId: 'kiet-1',
  academicYear: 4,
  gender: 'other',
  trustScore: 99,
  averageRating: 5.0,
  completedTripCount: 30,
  connectionCount: 50,
  verificationStatus: 'approved' as const,
  createdAt: '2026-08-01',
  updatedAt: '2026-08-01',
};

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });

describe('Groups, Chat, Safety & Admin Features Test Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ChatPage', () => {
    it('renders conversation list and handles realtime message feed', async () => {
      const mockSocket = {
        on: vi.fn(),
        off: vi.fn(),
        emit: vi.fn(),
      };

      (apiClient.get as any).mockImplementation((url: string) => {
        if (url === '/messaging/conversations') {
          return Promise.resolve({
            data: {
              data: [
                {
                  id: 'conv-1',
                  participants: ['admin-1', 'user-2'],
                  participantProfiles: {
                    'user-2': {
                      fullName: 'Neha Sharma',
                      avatarUrl: null,
                      verificationStatus: 'approved',
                    },
                  },
                  lastMessage: { content: 'See you at the gate!', createdAt: '2026-08-27T10:00:00Z' },
                },
              ],
            },
          });
        }
        if (url.includes('/messages')) {
          return Promise.resolve({
            data: {
              data: [
                {
                  id: 'msg-1',
                  conversationId: 'conv-1',
                  senderId: 'user-2',
                  content: 'See you at the gate!',
                  createdAt: '2026-08-27T10:00:00Z',
                },
              ],
            },
          });
        }
        return Promise.resolve({ data: { data: [] } });
      });

      render(
        <QueryClientProvider client={createTestQueryClient()}>
          <AuthContext.Provider
            value={{
              user: mockAdminUser,
              profile: mockAdminProfile,
              isAuthenticated: true,
              isLoading: false,
              login: vi.fn(),
              register: vi.fn(),
              logout: vi.fn(),
              refreshProfile: vi.fn(),
              updateProfileState: vi.fn(),
            }}
          >
            <SocketContext.Provider value={{ socket: mockSocket as any, isConnected: true }}>
              <BrowserRouter>
                <ChatPage />
              </BrowserRouter>
            </SocketContext.Provider>
          </AuthContext.Provider>
        </QueryClientProvider>
      );

      expect(screen.getByText('Messages')).toBeInTheDocument();
      await waitFor(() => {
        expect(screen.getAllByText('Neha Sharma').length).toBeGreaterThan(0);
        expect(screen.getAllByText('See you at the gate!').length).toBeGreaterThan(0);
      });
    });
  });

  describe('GroupsPage & GroupDetailPage', () => {
    it('renders groups roster and cost split metrics', async () => {
      (apiClient.get as any).mockResolvedValueOnce({
        data: {
          data: {
            id: 'grp-1',
            tripId: 'trip-1',
            ownerId: 'admin-1',
            name: 'KIET Morning Carpool',
            description: 'Split cab fare evenly',
            maxCapacity: 4,
            currentMemberCount: 3,
            costSplit: {
              totalEstimatedCost: 600,
              costPerMember: 200,
              currency: 'INR',
            },
            members: [
              {
                id: 'm-1',
                userId: 'admin-1',
                role: 'owner',
                status: 'active',
                user: { fullName: 'Campus Moderator', collegeName: 'KIET', trustScore: 99, verificationStatus: 'approved' },
              },
            ],
          },
        },
      });

      render(
        <QueryClientProvider client={createTestQueryClient()}>
          <AuthContext.Provider
            value={{
              user: mockAdminUser,
              profile: mockAdminProfile,
              isAuthenticated: true,
              isLoading: false,
              login: vi.fn(),
              register: vi.fn(),
              logout: vi.fn(),
              refreshProfile: vi.fn(),
              updateProfileState: vi.fn(),
            }}
          >
            <ToastProvider>
              <MemoryRouter initialEntries={['/groups/grp-1']}>
                <Routes>
                  <Route path="/groups/:id" element={<GroupDetailPage />} />
                </Routes>
              </MemoryRouter>
            </ToastProvider>
          </AuthContext.Provider>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('KIET Morning Carpool')).toBeInTheDocument();
        expect(screen.getByText(/₹600/)).toBeInTheDocument();
        expect(screen.getByText(/₹200/)).toBeInTheDocument();
        expect(screen.getByText('3 Students')).toBeInTheDocument();
      });
    });
  });

  describe('SafetyHubPage', () => {
    it('renders emergency contacts and triggers SOS alert modal', async () => {
      (apiClient.get as any).mockResolvedValueOnce({
        data: {
          data: [
            {
              id: 'ec-1',
              name: 'Dr. R. Sharma',
              phone: '9876543210',
              relationship: 'Parent',
              isPrimary: true,
            },
          ],
        },
      });

      render(
        <QueryClientProvider client={createTestQueryClient()}>
          <ToastProvider>
            <BrowserRouter>
              <SafetyHubPage />
            </BrowserRouter>
          </ToastProvider>
        </QueryClientProvider>
      );

      expect(screen.getByText('Campus Safety & SOS Center')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /TRIGGER SOS ALERT/i })).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText('Dr. R. Sharma')).toBeInTheDocument();
        expect(screen.getByText('Primary')).toBeInTheDocument();
      });

      // Open SOS modal
      fireEvent.click(screen.getByRole('button', { name: /TRIGGER SOS ALERT/i }));
      expect(screen.getByText('Confirm Emergency SOS Trigger')).toBeInTheDocument();
    });
  });

  describe('Admin Portal Pages', () => {
    it('renders verification queue and approves student ID', async () => {
      (apiClient.get as any).mockResolvedValueOnce({
        data: {
          data: [
            {
              id: 'vreq-1',
              userId: 'u-student',
              status: 'pending',
              documentUrl: 'https://example.com/id.jpg',
              user: { fullName: 'Vikram Patel', email: 'vikram@kiet.edu', collegeName: 'KIET' },
            },
          ],
        },
      });

      (apiClient.patch as any).mockResolvedValueOnce({ data: { success: true } });

      render(
        <QueryClientProvider client={createTestQueryClient()}>
          <ToastProvider>
            <BrowserRouter>
              <AdminVerificationsPage />
            </BrowserRouter>
          </ToastProvider>
        </QueryClientProvider>
      );

      expect(screen.getByText('Student ID Verifications Queue')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText('Vikram Patel')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Approve ID/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /Approve ID/i }));
      await waitFor(() => {
        expect(apiClient.patch).toHaveBeenCalledWith('/admin/verifications/vreq-1/approve');
      });
    });

    it('renders live SOS events monitor and reports resolution', async () => {
      (apiClient.get as any).mockResolvedValueOnce({
        data: {
          data: [
            {
              id: 'sos-1',
              userId: 'u-student',
              status: 'active',
              location: { type: 'Point', coordinates: [77.498, 28.752] },
              createdAt: '2026-08-27T12:00:00Z',
              user: { fullName: 'Pooja Singh', phone: '9988776655', collegeName: 'KIET' },
            },
          ],
        },
      });

      render(
        <QueryClientProvider client={createTestQueryClient()}>
          <ToastProvider>
            <BrowserRouter>
              <AdminSosPage />
            </BrowserRouter>
          </ToastProvider>
        </QueryClientProvider>
      );

      expect(screen.getByText('Live Emergency SOS Monitor')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText('Pooja Singh')).toBeInTheDocument();
        expect(screen.getByText(/GPS: 28.75200, 77.49800/)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Resolve Incident/i })).toBeInTheDocument();
      });
    });
  });
});
