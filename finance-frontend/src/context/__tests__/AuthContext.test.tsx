import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../AuthContext';
import { authService } from '../../services/auth.service';

// Mock auth service
jest.mock('../../services/auth.service', () => ({
  authService: {
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
    refreshToken: jest.fn(),
  },
}));

// Mock console.error
const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

describe('AuthContext', () => {
  const mockAuthService = authService as jest.Mocked<typeof authService>;
  
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('AuthProvider', () => {
    it('provides initial state', () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      expect(result.current.user).toBeNull();
      expect(result.current.tokens).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isLoading).toBe(false); // After mount effect
    });

    it('throws error when used outside provider', () => {
      expect(() => {
        renderHook(() => useAuth());
      }).toThrow('useAuth must be used within an AuthProvider');
    });

    it('loads stored auth data on mount', async () => {
      const mockUser = {
        id: '1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
      };
      const mockTokens = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      };

      localStorage.setItem('auth_user', JSON.stringify(mockUser));
      localStorage.setItem('auth_tokens', JSON.stringify(mockTokens));

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
        expect(result.current.tokens).toEqual(mockTokens);
        expect(result.current.isAuthenticated).toBe(true);
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('handles invalid stored auth data', async () => {
      localStorage.setItem('auth_user', 'invalid-json');
      localStorage.setItem('auth_tokens', 'invalid-json');

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.user).toBeNull();
        expect(result.current.tokens).toBeNull();
        expect(result.current.isAuthenticated).toBe(false);
        expect(result.current.isLoading).toBe(false);
      });

      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('successfully logs in user', async () => {
      const mockResponse = {
        data: {
          user: {
            id: '1',
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
          },
          tokens: {
            accessToken: 'access-token',
            refreshToken: 'refresh-token',
          },
        },
      };

      mockAuthService.login.mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      const credentials = { email: 'john@example.com', password: 'password' };

      await act(async () => {
        await result.current.login(credentials);
      });

      expect(mockAuthService.login).toHaveBeenCalledWith(credentials);
      expect(result.current.user).toEqual(mockResponse.data.user);
      expect(result.current.tokens).toEqual(mockResponse.data.tokens);
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.isLoading).toBe(false);

      // Check localStorage
      expect(localStorage.getItem('auth_user')).toBe(JSON.stringify(mockResponse.data.user));
      expect(localStorage.getItem('auth_tokens')).toBe(JSON.stringify(mockResponse.data.tokens));
    });

    it('handles login failure', async () => {
      const error = new Error('Invalid credentials');
      mockAuthService.login.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      const credentials = { email: 'john@example.com', password: 'wrong' };

      await act(async () => {
        await expect(result.current.login(credentials)).rejects.toThrow('Invalid credentials');
      });

      expect(result.current.user).toBeNull();
      expect(result.current.tokens).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isLoading).toBe(false);

      // Check localStorage is cleared
      expect(localStorage.getItem('auth_user')).toBeNull();
      expect(localStorage.getItem('auth_tokens')).toBeNull();
    });

    it('shows loading state during login', async () => {
      let resolveLogin: (value: any) => void;
      const loginPromise = new Promise(resolve => {
        resolveLogin = resolve;
      });
      mockAuthService.login.mockReturnValueOnce(loginPromise);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      const credentials = { email: 'john@example.com', password: 'password' };

      // Start login
      act(() => {
        result.current.login(credentials);
      });

      // Should be loading
      expect(result.current.isLoading).toBe(true);

      // Complete login
      await act(async () => {
        resolveLogin!({
          data: {
            user: { id: '1', email: 'john@example.com' },
            tokens: { accessToken: 'token', refreshToken: 'refresh' },
          },
        });
        await loginPromise;
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('register', () => {
    it('successfully registers user', async () => {
      const mockResponse = {
        data: {
          user: {
            id: '1',
            firstName: 'Jane',
            lastName: 'Smith',
            email: 'jane@example.com',
          },
          tokens: {
            accessToken: 'access-token',
            refreshToken: 'refresh-token',
          },
        },
      };

      mockAuthService.register.mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      const registerData = {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com',
        password: 'password',
        confirmPassword: 'password',
      };

      await act(async () => {
        await result.current.register(registerData);
      });

      expect(mockAuthService.register).toHaveBeenCalledWith(registerData);
      expect(result.current.user).toEqual(mockResponse.data.user);
      expect(result.current.tokens).toEqual(mockResponse.data.tokens);
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('handles registration failure', async () => {
      const error = new Error('Email already exists');
      mockAuthService.register.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      const registerData = {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com',
        password: 'password',
        confirmPassword: 'password',
      };

      await act(async () => {
        await expect(result.current.register(registerData)).rejects.toThrow('Email already exists');
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe('logout', () => {
    it('clears user state and localStorage', async () => {
      // Set up initial authenticated state
      const mockUser = { id: '1', email: 'john@example.com' };
      const mockTokens = { accessToken: 'token', refreshToken: 'refresh' };
      
      localStorage.setItem('auth_user', JSON.stringify(mockUser));
      localStorage.setItem('auth_tokens', JSON.stringify(mockTokens));

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });

      // Logout
      act(() => {
        result.current.logout();
      });

      expect(result.current.user).toBeNull();
      expect(result.current.tokens).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isLoading).toBe(false);

      // Check localStorage is cleared
      expect(localStorage.getItem('auth_user')).toBeNull();
      expect(localStorage.getItem('auth_tokens')).toBeNull();
    });

    it('calls logout API when tokens exist', () => {
      // Set up initial authenticated state
      localStorage.setItem('auth_user', JSON.stringify({ id: '1' }));
      localStorage.setItem('auth_tokens', JSON.stringify({ accessToken: 'token' }));

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      act(() => {
        result.current.logout();
      });

      expect(mockAuthService.logout).toHaveBeenCalled();
    });
  });

  describe('updateUser', () => {
    it('updates user data', async () => {
      // Set up initial authenticated state
      const initialUser = {
        id: '1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
      };
      
      localStorage.setItem('auth_user', JSON.stringify(initialUser));
      localStorage.setItem('auth_tokens', JSON.stringify({ accessToken: 'token' }));

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.user).toEqual(initialUser);
      });

      const updates = { firstName: 'Jane' };

      act(() => {
        result.current.updateUser(updates);
      });

      const expectedUser = { ...initialUser, ...updates };
      expect(result.current.user).toEqual(expectedUser);

      // Check localStorage is updated
      expect(localStorage.getItem('auth_user')).toBe(JSON.stringify(expectedUser));
    });

    it('does nothing when no user is logged in', () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      act(() => {
        result.current.updateUser({ firstName: 'Jane' });
      });

      expect(result.current.user).toBeNull();
    });
  });

  describe('refreshToken', () => {
    it('successfully refreshes tokens', async () => {
      const mockResponse = {
        data: {
          tokens: {
            accessToken: 'new-access-token',
            refreshToken: 'new-refresh-token',
          },
        },
      };

      mockAuthService.refreshToken.mockResolvedValueOnce(mockResponse);

      // Set up initial state with user and tokens
      const initialUser = { id: '1', email: 'john@example.com' };
      const initialTokens = { accessToken: 'old-token', refreshToken: 'refresh-token' };
      
      localStorage.setItem('auth_user', JSON.stringify(initialUser));
      localStorage.setItem('auth_tokens', JSON.stringify(initialTokens));

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.tokens).toEqual(initialTokens);
      });

      await act(async () => {
        await result.current.refreshToken();
      });

      expect(mockAuthService.refreshToken).toHaveBeenCalledWith('refresh-token');
      expect(result.current.tokens).toEqual(mockResponse.data.tokens);

      // Check localStorage is updated
      expect(localStorage.getItem('auth_tokens')).toBe(JSON.stringify(mockResponse.data.tokens));
    });

    it('handles refresh failure by logging out', async () => {
      const error = new Error('Refresh token expired');
      mockAuthService.refreshToken.mockRejectedValueOnce(error);

      // Set up initial authenticated state
      localStorage.setItem('auth_user', JSON.stringify({ id: '1' }));
      localStorage.setItem('auth_tokens', JSON.stringify({ refreshToken: 'refresh-token' }));

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await act(async () => {
        await expect(result.current.refreshToken()).rejects.toThrow('Refresh token expired');
      });

      // Should be logged out
      expect(result.current.user).toBeNull();
      expect(result.current.tokens).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);

      // Check localStorage is cleared
      expect(localStorage.getItem('auth_user')).toBeNull();
      expect(localStorage.getItem('auth_tokens')).toBeNull();
    });

    it('throws error when no refresh token is available', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await act(async () => {
        await expect(result.current.refreshToken()).rejects.toThrow('No refresh token available');
      });
    });
  });

  describe('Error Handling', () => {
    it('handles corrupted localStorage data gracefully', async () => {
      localStorage.setItem('auth_user', '{corrupted json');
      localStorage.setItem('auth_tokens', '{also corrupted}');

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.user).toBeNull();
      expect(result.current.tokens).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalled();

      // localStorage should be cleared
      expect(localStorage.getItem('auth_user')).toBeNull();
      expect(localStorage.getItem('auth_tokens')).toBeNull();
    });
  });
});