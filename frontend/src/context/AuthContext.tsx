import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, UserProfile } from '../types';
import { apiClient, setAuthToken, getAuthToken } from '../services/api.client';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<User>;
  loginWithGoogle: (idToken: string) => Promise<User>;
  register: (data: { email: string; password: string; fullName: string; collegeId?: string }) => Promise<{ userId: string }>;
  adminProvision?: (data: { adminPasscode: string; email: string; password: string; fullName: string }) => Promise<{ userId: string; email: string; message: string }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfileState: (updated: Partial<UserProfile>) => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCurrentUser = useCallback(async () => {
    try {
      const res = await apiClient.get('/users/me');
      const data = res.data.data;
      const userObj = data.user || {
        id: data.id,
        email: data.email,
        role: data.role,
        status: data.status,
        emailVerified: data.emailVerified,
        fullName: data.profile?.fullName,
        avatarUrl: data.profile?.avatarUrl,
        collegeId: data.profile?.collegeId,
        collegeName: data.profile?.collegeName,
        trustScore: data.profile?.trustScore,
        verificationStatus: data.profile?.verificationStatus,
      };
      setUser(userObj);
      setProfile(data.profile || null);
    } catch {
      setUser(null);
      setProfile(null);
      setAuthToken(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = getAuthToken();
    if (token) {
      fetchCurrentUser();
    } else {
      setIsLoading(false);
    }

    const handleUnauthorized = () => {
      setUser(null);
      setProfile(null);
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, [fetchCurrentUser]);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await apiClient.post('/auth/login', { email, password });
      const { accessToken, user: loggedUser, profile: userProfile } = res.data.data;
      setAuthToken(accessToken);
      setUser(loggedUser);
      setProfile(userProfile);
      return loggedUser;
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async (idToken: string) => {
    setIsLoading(true);
    try {
      const res = await apiClient.post('/auth/google', { idToken });
      const { accessToken, user: loggedUser, profile: userProfile } = res.data.data;
      setAuthToken(accessToken);
      const userObj = {
        id: loggedUser.id,
        email: loggedUser.email,
        role: loggedUser.role,
        status: loggedUser.status,
        emailVerified: loggedUser.emailVerified,
        fullName: loggedUser.profile?.fullName,
        avatarUrl: loggedUser.profile?.avatarUrl,
        collegeId: loggedUser.profile?.collegeId,
        collegeName: loggedUser.profile?.college?.name,
        trustScore: loggedUser.profile?.trustScore,
        verificationStatus: loggedUser.profile?.verificationStatus,
      };
      setUser(userObj as any);
      setProfile(userProfile || loggedUser.profile || null);
      return loggedUser;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: { email: string; password: string; fullName: string; collegeId?: string }) => {
    const res = await apiClient.post('/auth/register', data);
    return res.data.data;
  };

  const adminProvision = async (data: { adminPasscode: string; email: string; password: string; fullName: string }) => {
    const res = await apiClient.post('/auth/admin-provision', data);
    return res.data.data;
  };

  const logout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // Ignore network failure on logout
    } finally {
      setAuthToken(null);
      setUser(null);
      setProfile(null);
    }
  };

  const refreshProfile = async () => {
    await fetchCurrentUser();
  };

  const updateProfileState = (updated: Partial<UserProfile>) => {
    setProfile((prev) => (prev ? { ...prev, ...updated } : null));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isLoading,
        isAuthenticated: Boolean(user),
        login,
        loginWithGoogle,
        register,
        adminProvision,
        logout,
        refreshProfile,
        updateProfileState,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
