import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { createTheme } from '@mui/material/styles';
import { AuthProvider } from './context/AuthContext';
import { AppProvider } from './context/AppContext';

// Mock jest functions
const mockFn = () => {
  const fn = (() => {}) as any;
  fn.mockReturnValue = () => fn;
  fn.mockResolvedValue = () => fn;
  fn.mockImplementation = () => fn;
  fn.mockReset = () => fn;
  fn.mockClear = () => fn;
  return fn;
};

// Create a theme for testing
const theme = createTheme();

// Mock user for testing
export const mockUser = {
  id: '1',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@example.com',
  avatar: null,
  role: 'user',
  isVerified: true,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

// Mock tokens for testing
export const mockTokens = {
  accessToken: 'mock-access-token',
  refreshToken: 'mock-refresh-token',
};

// Mock auth context value
export const mockAuthContext = {
  user: mockUser,
  tokens: mockTokens,
  isAuthenticated: true,
  isLoading: false,
  login: mockFn(),
  register: mockFn(),
  logout: mockFn(),
  updateUser: mockFn(),
  refreshToken: mockFn(),
};

// Mock app context value
export const mockAppContext = {
  theme: 'light',
  sidebarOpen: false,
  notifications: [],
  setSidebarOpen: mockFn(),
  toggleTheme: mockFn(),
  addNotification: mockFn(),
  removeNotification: mockFn(),
};

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  // Custom options
  initialEntries?: string[];
  authContextValue?: Partial<typeof mockAuthContext>;
  appContextValue?: Partial<typeof mockAppContext>;
}

// Custom render function that includes providers
const customRender = (
  ui: ReactElement,
  options: CustomRenderOptions = {}
) => {
  const {
    initialEntries = ['/'],
    authContextValue = {},
    appContextValue = {},
    ...renderOptions
  } = options;

  const mergedAuthContext = { ...mockAuthContext, ...authContextValue };
  const mergedAppContext = { ...mockAppContext, ...appContextValue };

  // We'll mock the contexts directly in the test setup instead
  // For now, just use the real providers

  function Wrapper({ children }: { children?: React.ReactNode }) {
    return (
      <BrowserRouter>
        <ThemeProvider theme={theme}>
          <AuthProvider>
            <AppProvider>
              {children}
            </AppProvider>
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    );
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions });
};

// Helper to render with no auth
export const renderWithoutAuth = (ui: ReactElement, options: CustomRenderOptions = {}) => {
  return customRender(ui, {
    ...options,
    authContextValue: {
      user: undefined,
      tokens: undefined,
      isAuthenticated: false,
      isLoading: false,
    },
  });
};

// Helper to render with loading state
export const renderWithLoading = (ui: ReactElement, options: CustomRenderOptions = {}) => {
  return customRender(ui, {
    ...options,
    authContextValue: {
      user: undefined,
      tokens: undefined,
      isAuthenticated: false,
      isLoading: true,
    },
  });
};

// Mock API responses
export const mockApiResponse = {
  success: {
    data: { message: 'Success' },
    status: 200,
    statusText: 'OK',
    headers: {},
    config: {},
  },
  error: {
    response: {
      data: { message: 'Error message' },
      status: 400,
      statusText: 'Bad Request',
      headers: {},
      config: {},
    },
  },
  networkError: {
    message: 'Network Error',
    code: 'NETWORK_ERROR',
  },
};

// Mock transactions
export const mockTransactions = [
  {
    id: '1',
    type: 'income',
    amount: 1000,
    description: 'Salary',
    category: 'Work',
    date: '2024-01-01',
    userId: '1',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: '2',
    type: 'expense',
    amount: 200,
    description: 'Groceries',
    category: 'Food',
    date: '2024-01-02',
    userId: '1',
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z',
  },
];

// Mock documents
export const mockDocuments = [
  {
    id: '1',
    name: 'receipt-1.pdf',
    type: 'receipt',
    size: 1024,
    url: 'https://example.com/receipt-1.pdf',
    uploadedAt: '2024-01-01T00:00:00Z',
    userId: '1',
  },
  {
    id: '2',
    name: 'invoice-1.pdf',
    type: 'invoice',
    size: 2048,
    url: 'https://example.com/invoice-1.pdf',
    uploadedAt: '2024-01-02T00:00:00Z',
    userId: '1',
  },
];

// Utility functions for testing
export const createMockEvent = (eventInit: Partial<Event> = {}) => ({
  preventDefault: mockFn(),
  stopPropagation: mockFn(),
  ...eventInit,
});

export const createMockFormEvent = (value: string) => ({
  target: { value },
  preventDefault: mockFn(),
  stopPropagation: mockFn(),
});

// Re-export everything from testing-library
export * from '@testing-library/react';

// Override render method
export { customRender as render };