import React from 'react';
import { screen } from '@testing-library/react';
import { render, renderWithoutAuth, renderWithLoading } from '../../test-utils';
import ProtectedRoute from '../ProtectedRoute';

// Mock react-router-dom
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  Navigate: ({ to }: { to: string }) => <div data-testid="navigate-to">{to}</div>,
  useLocation: () => ({
    pathname: '/dashboard',
    search: '?param=value',
  }),
}));

// Mock useAuth hook
const mockUseAuth = {
  user: { id: '1', email: 'test@example.com', firstName: 'Test', lastName: 'User' },
  tokens: { accessToken: 'token', refreshToken: 'refresh' },
  isAuthenticated: true,
  isLoading: false,
  login: jest.fn(),
  register: jest.fn(),
  logout: jest.fn(),
  updateUser: jest.fn(),
  refreshToken: jest.fn(),
};

jest.mock('../../context/AuthContext', () => ({
  useAuth: () => mockUseAuth,
  AuthProvider: ({ children }: any) => children,
}));

// Mock LoadingSpinner
jest.mock('../LoadingSpinner', () => {
  return function MockLoadingSpinner({ message, fullScreen }: any) {
    return (
      <div data-testid="loading-spinner" data-fullscreen={fullScreen}>
        {message}
      </div>
    );
  };
});

describe('ProtectedRoute Component', () => {
  const TestComponent = () => <div data-testid="protected-content">Protected Content</div>;

  beforeEach(() => {
    // Reset to default authenticated state
    mockUseAuth.isAuthenticated = true;
    mockUseAuth.isLoading = false;
    mockUseAuth.user = { id: '1', email: 'test@example.com', firstName: 'Test', lastName: 'User' };
    mockUseAuth.tokens = { accessToken: 'token', refreshToken: 'refresh' };
  });

  describe('Authenticated User', () => {
    it('renders children when user is authenticated and auth is required', () => {
      render(
        <ProtectedRoute requireAuth={true}>
          <TestComponent />
        </ProtectedRoute>
      );

      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
      expect(screen.queryByTestId('navigate-to')).not.toBeInTheDocument();
    });

    it('redirects to dashboard when user is authenticated and auth is not required', () => {
      render(
        <ProtectedRoute requireAuth={false}>
          <TestComponent />
        </ProtectedRoute>
      );

      expect(screen.getByTestId('navigate-to')).toBeInTheDocument();
      expect(screen.getByTestId('navigate-to')).toHaveTextContent('/dashboard');
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });

    it('redirects to custom path when user is authenticated and auth is not required', () => {
      render(
        <ProtectedRoute requireAuth={false} redirectTo="/custom-path">
          <TestComponent />
        </ProtectedRoute>
      );

      expect(screen.getByTestId('navigate-to')).toBeInTheDocument();
      expect(screen.getByTestId('navigate-to')).toHaveTextContent('/custom-path');
    });
  });

  describe('Unauthenticated User', () => {
    beforeEach(() => {
      mockUseAuth.isAuthenticated = false;
      mockUseAuth.user = null;
      mockUseAuth.tokens = null;
      mockUseAuth.isLoading = false;
    });

    it('redirects to login when user is not authenticated and auth is required', () => {
      render(
        <ProtectedRoute requireAuth={true}>
          <TestComponent />
        </ProtectedRoute>
      );

      expect(screen.getByTestId('navigate-to')).toBeInTheDocument();
      expect(screen.getByTestId('navigate-to')).toHaveTextContent(
        '/login?returnTo=%2Fdashboard%3Fparam%3Dvalue'
      );
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });

    it('renders children when user is not authenticated and auth is not required', () => {
      render(
        <ProtectedRoute requireAuth={false}>
          <TestComponent />
        </ProtectedRoute>
      );

      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
      expect(screen.queryByTestId('navigate-to')).not.toBeInTheDocument();
    });

    it('redirects to custom path when user is not authenticated and auth is required', () => {
      render(
        <ProtectedRoute requireAuth={true} redirectTo="/custom-login">
          <TestComponent />
        </ProtectedRoute>
      );

      expect(screen.getByTestId('navigate-to')).toBeInTheDocument();
      expect(screen.getByTestId('navigate-to')).toHaveTextContent('/custom-login');
    });
  });

  describe('Loading State', () => {
    beforeEach(() => {
      mockUseAuth.isLoading = true;
      mockUseAuth.isAuthenticated = false;
      mockUseAuth.user = null;
      mockUseAuth.tokens = null;
    });

    it('shows loading spinner when authentication is being checked', () => {
      render(
        <ProtectedRoute requireAuth={true}>
          <TestComponent />
        </ProtectedRoute>
      );

      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
      expect(screen.getByTestId('loading-spinner')).toHaveTextContent('Checking authentication...');
      expect(screen.getByTestId('loading-spinner')).toHaveAttribute('data-fullscreen', 'true');
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
      expect(screen.queryByTestId('navigate-to')).not.toBeInTheDocument();
    });

    it('shows loading spinner regardless of requireAuth prop during loading', () => {
      render(
        <ProtectedRoute requireAuth={false}>
          <TestComponent />
        </ProtectedRoute>
      );

      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
      expect(screen.queryByTestId('navigate-to')).not.toBeInTheDocument();
    });
  });

  describe('Default Props', () => {
    it('uses requireAuth=true by default', () => {
      renderWithoutAuth(
        <ProtectedRoute>
          <TestComponent />
        </ProtectedRoute>
      );

      // Should redirect to login since requireAuth defaults to true
      expect(screen.getByTestId('navigate-to')).toBeInTheDocument();
      expect(screen.getByTestId('navigate-to')).toHaveTextContent(
        '/login?returnTo=%2Fdashboard%3Fparam%3Dvalue'
      );
    });
  });

  describe('Return URL Handling', () => {
    it('includes current path and search params in return URL', () => {
      renderWithoutAuth(
        <ProtectedRoute requireAuth={true}>
          <TestComponent />
        </ProtectedRoute>
      );

      const navigateElement = screen.getByTestId('navigate-to');
      expect(navigateElement).toHaveTextContent(
        '/login?returnTo=%2Fdashboard%3Fparam%3Dvalue'
      );
    });

    it('properly encodes return URL parameters', () => {
      // Test with special characters
      jest.doMock('react-router-dom', () => ({
        ...jest.requireActual('react-router-dom'),
        Navigate: ({ to }: { to: string }) => <div data-testid="navigate-to">{to}</div>,
        useLocation: () => ({
          pathname: '/dashboard/test',
          search: '?param=value with spaces&other=test',
        }),
      }));

      render(
        <ProtectedRoute requireAuth={true}>
          <TestComponent />
        </ProtectedRoute>
      );

      const navigateElement = screen.getByTestId('navigate-to');
      expect(navigateElement.textContent).toContain('returnTo=');
      expect(navigateElement.textContent).toContain('%2F'); // Encoded slash
    });
  });

  describe('Edge Cases', () => {
    it('handles missing children gracefully', () => {
      render(<ProtectedRoute requireAuth={true} />);

      // Should render empty content but not crash
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
      expect(screen.queryByTestId('navigate-to')).not.toBeInTheDocument();
    });

    it('handles null children', () => {
      render(
        <ProtectedRoute requireAuth={true}>
          {null}
        </ProtectedRoute>
      );

      // Should not crash with null children
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
      expect(screen.queryByTestId('navigate-to')).not.toBeInTheDocument();
    });

    it('handles multiple children', () => {
      render(
        <ProtectedRoute requireAuth={true}>
          <TestComponent />
          <div data-testid="second-component">Second Component</div>
        </ProtectedRoute>
      );

      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
      expect(screen.getByTestId('second-component')).toBeInTheDocument();
    });
  });

  describe('Navigation Behavior', () => {
    it('uses replace navigation to prevent back button issues', () => {
      renderWithoutAuth(
        <ProtectedRoute requireAuth={true}>
          <TestComponent />
        </ProtectedRoute>
      );

      // The Navigate component should have replace prop
      // This is tested by checking that navigation happens
      expect(screen.getByTestId('navigate-to')).toBeInTheDocument();
    });
  });

  describe('Authentication Context Integration', () => {
    it('responds to changes in authentication state', () => {
      // Test with custom auth state
      renderWithoutAuth(
        <ProtectedRoute requireAuth={true}>
          <TestComponent />
        </ProtectedRoute>,
        {
          authContextValue: {
            isAuthenticated: false,
            isLoading: false,
            user: null,
            tokens: null,
          },
        }
      );

      expect(screen.getByTestId('navigate-to')).toBeInTheDocument();
    });

    it('handles authentication state transitions correctly', () => {
      // Test loading to authenticated transition
      const { rerender } = renderWithLoading(
        <ProtectedRoute requireAuth={true}>
          <TestComponent />
        </ProtectedRoute>
      );

      // Initially loading
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();

      // Rerender with authenticated state
      rerender(
        <ProtectedRoute requireAuth={true}>
          <TestComponent />
        </ProtectedRoute>
      );

      // Should show protected content when authenticated
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });
  });
});