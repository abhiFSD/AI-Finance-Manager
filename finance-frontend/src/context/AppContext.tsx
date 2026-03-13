import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { Account, Category, AppState } from '../types';
import { accountService } from '../services/account.service';

interface AppContextType extends AppState {
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setAccounts: (accounts: Account[]) => void;
  addAccount: (account: Account) => void;
  updateAccount: (accountId: string, updates: Partial<Account>) => void;
  removeAccount: (accountId: string) => void;
  setCategories: (categories: Category[]) => void;
  setSelectedAccount: (account: Account | null) => void;
  clearError: () => void;
}

type AppAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_ACCOUNTS'; payload: Account[] }
  | { type: 'ADD_ACCOUNT'; payload: Account }
  | { type: 'UPDATE_ACCOUNT'; payload: { accountId: string; updates: Partial<Account> } }
  | { type: 'REMOVE_ACCOUNT'; payload: string }
  | { type: 'SET_CATEGORIES'; payload: Category[] }
  | { type: 'SET_SELECTED_ACCOUNT'; payload: Account | null }
  | { type: 'CLEAR_ERROR' };

const initialState: AppState = {
  isLoading: false,
  error: null,
  accounts: [],
  categories: [],
  selectedAccount: null,
};

const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };
    case 'SET_ACCOUNTS':
      return { ...state, accounts: action.payload };
    case 'ADD_ACCOUNT':
      return { ...state, accounts: [...state.accounts, action.payload] };
    case 'UPDATE_ACCOUNT':
      return {
        ...state,
        accounts: state.accounts.map(account =>
          account.id === action.payload.accountId
            ? { ...account, ...action.payload.updates }
            : account
        ),
      };
    case 'REMOVE_ACCOUNT':
      return {
        ...state,
        accounts: state.accounts.filter(account => account.id !== action.payload),
        selectedAccount:
          state.selectedAccount?.id === action.payload ? null : state.selectedAccount,
      };
    case 'SET_CATEGORIES':
      return { ...state, categories: action.payload };
    case 'SET_SELECTED_ACCOUNT':
      return { ...state, selectedAccount: action.payload };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    default:
      return state;
  }
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Load accounts globally on mount so all pages have access
  useEffect(() => {
    const loadInitialAccounts = async () => {
      try {
        const response = await accountService.getAccounts();
        if (response.success && response.data) {
          const accountsData = Array.isArray(response.data)
            ? response.data
            : (response.data as any).accounts || [];
          dispatch({ type: 'SET_ACCOUNTS', payload: accountsData });
        }
      } catch (error) {
        // Silently fail - accounts will load when user navigates to relevant page
      }
    };
    loadInitialAccounts();
  }, []);

  const setLoading = (loading: boolean) => {
    dispatch({ type: 'SET_LOADING', payload: loading });
  };

  const setError = (error: string | null) => {
    dispatch({ type: 'SET_ERROR', payload: error });
  };

  const setAccounts = (accounts: Account[]) => {
    dispatch({ type: 'SET_ACCOUNTS', payload: accounts });
  };

  const addAccount = (account: Account) => {
    dispatch({ type: 'ADD_ACCOUNT', payload: account });
  };

  const updateAccount = (accountId: string, updates: Partial<Account>) => {
    dispatch({ type: 'UPDATE_ACCOUNT', payload: { accountId, updates } });
  };

  const removeAccount = (accountId: string) => {
    dispatch({ type: 'REMOVE_ACCOUNT', payload: accountId });
  };

  const setCategories = (categories: Category[]) => {
    dispatch({ type: 'SET_CATEGORIES', payload: categories });
  };

  const setSelectedAccount = (account: Account | null) => {
    dispatch({ type: 'SET_SELECTED_ACCOUNT', payload: account });
  };

  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  const value: AppContextType = {
    ...state,
    setLoading,
    setError,
    setAccounts,
    addAccount,
    updateAccount,
    removeAccount,
    setCategories,
    setSelectedAccount,
    clearError,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};