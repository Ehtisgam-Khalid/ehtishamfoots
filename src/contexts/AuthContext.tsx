import React, { createContext, useContext, useEffect, useState } from 'react';
import { UserProfile } from '../types';
import api from '../services/api';

interface AuthContextType {
  user: any | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, phone: string, otp: string) => Promise<void>;
  logout: () => void;
  setProfile: (profile: UserProfile | null) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  isAdmin: false,
  login: async () => {},
  register: async () => {},
  logout: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = async () => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const response = await api.get('/auth/me');
        setProfile(response.data);
      } catch (err) {
        localStorage.removeItem('token');
        setProfile(null);
      }
    } else {
      setProfile(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', response.data.token);
    setProfile(response.data.user);
  };

  const register = async (name: string, email: string, password: string, phone: string, otp: string) => {
    const response = await api.post('/auth/register', { name, email, password, phone, otp });
    localStorage.setItem('token', response.data.token);
    setProfile(response.data.user);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ 
      user: profile, 
      profile, 
      loading, 
      isAdmin: profile?.role === 'admin',
      login,
      register,
      logout,
      setProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
