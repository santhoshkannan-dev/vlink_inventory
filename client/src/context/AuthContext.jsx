import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('vlink_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (e) {
      return null;
    }
  });
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [loading, setLoading] = useState(true);

  // Configure axios authorization header globally
  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete axios.defaults.headers.common['Authorization'];
  }

  const API_URL = '/api';

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('vlink_user');
    setToken('');
    setUser(null);
  };

  useEffect(() => {
    const fetchUser = async () => {
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }
      try {
        const res = await axios.get(`${API_URL}/auth/me`);
        const userData = {
          _id: res.data._id || res.data.id,
          id: res.data._id || res.data.id,
          name: res.data.name,
          email: res.data.email,
          role: res.data.role
        };
        setUser(userData);
        localStorage.setItem('vlink_user', JSON.stringify(userData));
      } catch (err) {
        console.error('Session validation failed', err);
        logout();
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [token]);

  useEffect(() => {
    // Intercept 401 Unauthorized errors to automatically log out user
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response && error.response.status === 401) {
          logout();
          toast.error('Session expired. Please log in again.');
        }
        return Promise.reject(error);
      }
    );

    // Check auth health when app gains focus or laptop wakes from sleep
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && token) {
        try {
          await axios.get(`${API_URL}/auth/me`);
        } catch (err) {
          if (err.response && err.response.status === 401) {
            logout();
            toast.error('Session expired. Please log in again.');
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);

    return () => {
      axios.interceptors.response.eject(interceptor);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
    };
  }, [token]);

  const login = async (email, password) => {
    try {
      const res = await axios.post(`${API_URL}/auth/login`, { email, password }, { timeout: 45000 });
      
      const userData = {
        _id: res.data.user.id || res.data.user._id,
        id: res.data.user.id || res.data.user._id,
        name: res.data.user.name,
        email: res.data.user.email,
        role: res.data.user.role
      };

      localStorage.setItem('token', res.data.token);
      localStorage.setItem('vlink_user', JSON.stringify(userData));
      setToken(res.data.token);
      setUser(userData);
      return { success: true };
    } catch (err) {
      let message = 'Login failed. Please check credentials.';
      if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        message = 'Server is taking longer to respond. It may be waking up from sleep. Please try again.';
      } else if (!err.response) {
        message = 'Network error or unable to connect to the server. Please check your connection and retry.';
      } else if (err.response.data?.message) {
        message = err.response.data.message;
      }
      return {
        success: false,
        message
      };
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
