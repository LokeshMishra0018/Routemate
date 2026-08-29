import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';

// Layouts & Guards
import { AppLayout } from '../layouts/AppLayout';
import { AuthLayout } from '../layouts/AuthLayout';
import { AdminLayout } from '../layouts/AdminLayout';
import { ProtectedRoute } from '../components/layout/ProtectedRoute';
import { AdminRoute } from '../components/layout/AdminRoute';

// Auth Pages
import { LoginPage } from '../pages/auth/LoginPage';
import { RegisterPage } from '../pages/auth/RegisterPage';
import { VerifyEmailPage } from '../pages/auth/VerifyEmailPage';
import { ForgotPasswordPage } from '../pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '../pages/auth/ResetPasswordPage';
import { OnboardingPage } from '../pages/auth/OnboardingPage';

// Main App Pages
import { DashboardPage } from '../pages/DashboardPage';
import { TripsListPage } from '../pages/trips/TripsListPage';
import { TripCreatePage } from '../pages/trips/TripCreatePage';
import { TripDetailPage } from '../pages/trips/TripDetailPage';
import { MatchesExplorerPage } from '../pages/matches/MatchesExplorerPage';
import { ConnectionsPage } from '../pages/connections/ConnectionsPage';
import { ChatPage } from '../pages/chat/ChatPage';
import { GroupsPage } from '../pages/groups/GroupsPage';
import { GroupDetailPage } from '../pages/groups/GroupDetailPage';
import { ProfilePage } from '../pages/profile/ProfilePage';
import { VerificationPage } from '../pages/verification/VerificationPage';
import { SafetyHubPage } from '../pages/safety/SafetyHubPage';
import { NotificationsPage } from '../pages/notifications/NotificationsPage';

// Admin Portal Pages
import { AdminDashboardPage } from '../pages/admin/AdminDashboardPage';
import { AdminLiveUsersPage } from '../pages/admin/AdminLiveUsersPage';
import { AdminTripsPage } from '../pages/admin/AdminTripsPage';
import { AdminUserFunnelPage } from '../pages/admin/AdminUserFunnelPage';
import { AdminDemandAnalyticsPage } from '../pages/admin/AdminDemandAnalyticsPage';
import { AdminMatchingPage } from '../pages/admin/AdminMatchingPage';
import { AdminGroupsPage } from '../pages/admin/AdminGroupsPage';
import { AdminSystemHealthPage } from '../pages/admin/AdminSystemHealthPage';
import { AdminVerificationsPage } from '../pages/admin/AdminVerificationsPage';
import { AdminReportsPage } from '../pages/admin/AdminReportsPage';
import { AdminSosPage } from '../pages/admin/AdminSosPage';
import { AdminUsersPage } from '../pages/admin/AdminUsersPage';
import { AdminSecurityPage } from '../pages/admin/AdminSecurityPage';
// Overview & Landing Page
import { LandingPage } from '../pages/LandingPage';

export const router = createBrowserRouter([
  // Public Overview / Introduction Page
  { path: '/', element: <LandingPage /> },
  { path: '/overview', element: <LandingPage /> },
  { path: '/about', element: <LandingPage /> },

  // Public / Auth Routes
  {
    element: <AuthLayout />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
      { path: '/verify-email', element: <VerifyEmailPage /> },
      { path: '/forgot-password', element: <ForgotPasswordPage /> },
      { path: '/reset-password', element: <ResetPasswordPage /> },
    ],
  },

  // Onboarding (Protected)
  {
    path: '/onboarding',
    element: (
      <ProtectedRoute>
        <AuthLayout>
          <OnboardingPage />
        </AuthLayout>
      </ProtectedRoute>
    ),
  },

  // Main Application Routes (Protected by session)
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'trips', element: <TripsListPage /> },
      { path: 'trips/new', element: <TripCreatePage /> },
      { path: 'trips/:id', element: <TripDetailPage /> },
      { path: 'matches', element: <MatchesExplorerPage /> },
      { path: 'connections', element: <ConnectionsPage /> },
      { path: 'messages', element: <ChatPage /> },
      { path: 'messages/:conversationId', element: <ChatPage /> },
      { path: 'groups', element: <GroupsPage /> },
      { path: 'groups/:id', element: <GroupDetailPage /> },
      { path: 'profile', element: <ProfilePage /> },
      { path: 'profile/:id', element: <ProfilePage /> },
      { path: 'verification', element: <VerificationPage /> },
      { path: 'safety', element: <SafetyHubPage /> },
      { path: 'notifications', element: <NotificationsPage /> },
    ],
  },

  // Admin & Command Center Portal (Protected by Role Guard)
  {
    path: '/admin',
    element: (
      <AdminRoute>
        <AdminLayout />
      </AdminRoute>
    ),
    children: [
      { index: true, element: <AdminDashboardPage /> },
      { path: 'live', element: <AdminLiveUsersPage /> },
      { path: 'trips', element: <AdminTripsPage /> },
      { path: 'users-funnel', element: <AdminUserFunnelPage /> },
      { path: 'demand', element: <AdminDemandAnalyticsPage /> },
      { path: 'matching', element: <AdminMatchingPage /> },
      { path: 'groups', element: <AdminGroupsPage /> },
      { path: 'system', element: <AdminSystemHealthPage /> },
      { path: 'verifications', element: <AdminVerificationsPage /> },
      { path: 'reports', element: <AdminReportsPage /> },
      { path: 'sos', element: <AdminSosPage /> },
      { path: 'users', element: <AdminUsersPage /> },
      { path: 'security', element: <AdminSecurityPage /> },
    ],
  },

  // Catch-all 404 redirect
  {
    path: '*',
    element: <Navigate to="/dashboard" replace />,
  },
]);
