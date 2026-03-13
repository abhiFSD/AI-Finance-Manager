import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { User, AuthTokens, AuthState, LoginCredentials, RegisterData } from '../types';
import { authService } from '../services/auth.service';
import { APP_CONSTANTS } from '../utils/constants';

interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
  refreshToken: () => Promise<void>;
}

type AuthAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_USER'; payload: User | null }
  | { type: 'SET_TOKENS'; payload: AuthTokens | null }
  | { type: 'SET_AUTHENTICATED'; payload: boolean }
  | { type: 'CLEAR_AUTH' };

const initialState: AuthState = {
  user: null,
  tokens: null,
  isAuthenticated: false,
  isLoading: true,
};

const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_USER':
      return { ...state, user: action.payload };
    case 'SET_TOKENS':
      return { ...state, tokens: action.payload };
    case 'SET_AUTHENTICATED':
      return { ...state, isAuthenticated: action.payload };
    case 'CLEAR_AUTH':
      return { ...initialState, isLoading: false };
    default:
      return state;
  }
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Load user and tokens from localStorage on mount
  useEffect(() => {
    const loadStoredAuth = () => {
      try {
        const storedTokens = localStorage.getItem(APP_CONSTANTS.TOKEN_STORAGE_KEY);
        const storedUser = localStorage.getItem(APP_CONSTANTS.USER_STORAGE_KEY);

        if (storedTokens && storedUser) {
          const tokens: AuthTokens = JSON.parse(storedTokens);
          const user: User = JSON.parse(storedUser);

          dispatch({ type: 'SET_TOKENS', payload: tokens });
          dispatch({ type: 'SET_USER', payload: user });
          dispatch({ type: 'SET_AUTHENTICATED', payload: true });
        }
      } catch (error) {
        console.error('Error loading stored auth:', error);
        clearStoredAuth();
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    loadStoredAuth();
  }, []);

  const clearStoredAuth = () => {
    localStorage.removeItem(APP_CONSTANTS.TOKEN_STORAGE_KEY);
    localStorage.removeItem(APP_CONSTANTS.USER_STORAGE_KEY);
  };

  const storeAuth = (user: User, tokens: AuthTokens) => {
    localStorage.setItem(APP_CONSTANTS.USER_STORAGE_KEY, JSON.stringify(user));
    localStorage.setItem(APP_CONSTANTS.TOKEN_STORAGE_KEY, JSON.stringify(tokens));
  };

  const login = async (credentials: LoginCredentials): Promise<void> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const response = await authService.login(credentials);
      const { user, tokens } = response.data;

      storeAuth(user, tokens);
      dispatch({ type: 'SET_USER', payload: user });
      dispatch({ type: 'SET_TOKENS', payload: tokens });
      dispatch({ type: 'SET_AUTHENTICATED', payload: true });
    } catch (error) {
      clearStoredAuth();
      dispatch({ type: 'CLEAR_AUTH' });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const register = async (data: RegisterData): Promise<void> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const response = await authService.register(data);
      const { user, tokens } = response.data;

      storeAuth(user, tokens);
      dispatch({ type: 'SET_USER', payload: user });
      dispatch({ type: 'SET_TOKENS', payload: tokens });
      dispatch({ type: 'SET_AUTHENTICATED', payload: true });
    } catch (error) {
      clearStoredAuth();
      dispatch({ type: 'CLEAR_AUTH' });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const logout = () => {
    clearStoredAuth();
    dispatch({ type: 'CLEAR_AUTH' });
    
    // Optionally call logout API endpoint
    if (state.tokens) {
      authService.logout().catch(console.error);
    }
  };

  const updateUser = (updatedUser: Partial<User>) => {
    if (state.user) {
      const newUser = { ...state.user, ...updatedUser };
      localStorage.setItem(APP_CONSTANTS.USER_STORAGE_KEY, JSON.stringify(newUser));
      dispatch({ type: 'SET_USER', payload: newUser });
    }
  };

  const refreshToken = async (): Promise<void> => {
    try {
      if (!state.tokens?.refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await authService.refreshToken(state.tokens.refreshToken);
      const { tokens } = response.data;

      if (state.user) {
        storeAuth(state.user, tokens);
      }
      dispatch({ type: 'SET_TOKENS', payload: tokens });
    } catch (error) {
      console.error('Token refresh failed:', error);
      logout();
      throw error;
    }
  };

  const value: AuthContextType = {
    ...state,
    login,
    register,
    logout,
    updateUser,
    refreshToken,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};