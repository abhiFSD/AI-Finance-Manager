import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render, renderWithoutAuth, mockApiResponse } from '../../test-utils';
import Login from '../Login';

// Mock react-router-dom
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useLocation: () => ({
    search: '?returnTo=%2Fdashboard',
  }),
}));

// Mock API services
jest.mock('../../services/api', () => ({
  handleApiError: jest.fn((error) => 'API Error: ' + error.message),
}));

describe('Login Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders login form correctly', () => {
      renderWithoutAuth(<Login />);
      
      expect(screen.getByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    it('displays app branding and welcome message', () => {
      renderWithoutAuth(<Login />);
      
      expect(screen.getByText(/welcome back/i)).toBeInTheDocument();
      expect(screen.getByText(/sign in to your .* account/i)).toBeInTheDocument();
    });

    it('shows login icon', () => {
      renderWithoutAuth(<Login />);
      
      // Check for login icon (MUI LoginOutlined)
      expect(document.querySelector('[data-testid="LoginOutlinedIcon"]')).toBeTruthy();
    });

    it('displays navigation links', () => {
      renderWithoutAuth(<Login />);
      
      expect(screen.getByText(/forgot your password/i)).toBeInTheDocument();
      expect(screen.getByText(/don't have an account/i)).toBeInTheDocument();
      expect(screen.getByText(/sign up here/i)).toBeInTheDocument();
    });

    it('shows email and password input icons', () => {
      renderWithoutAuth(<Login />);
      
      // Check for email and lock icons
      expect(document.querySelector('[data-testid="EmailIcon"]')).toBeTruthy();
      expect(document.querySelector('[data-testid="LockIcon"]')).toBeTruthy();
    });
  });

  describe('Form Interactions', () => {
    it('allows user to type in email field', async () => {
      const user = userEvent.setup();
      renderWithoutAuth(<Login />);
      
      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, 'test@example.com');
      
      expect(emailInput).toHaveValue('test@example.com');
    });

    it('allows user to type in password field', async () => {
      const user = userEvent.setup();
      renderWithoutAuth(<Login />);
      
      const passwordInput = screen.getByLabelText(/password/i);
      await user.type(passwordInput, 'password123');
      
      expect(passwordInput).toHaveValue('password123');
    });

    it('toggles password visibility', async () => {
      const user = userEvent.setup();
      renderWithoutAuth(<Login />);
      
      const passwordInput = screen.getByLabelText(/password/i);
      const toggleButton = screen.getByRole('button', { name: /toggle password visibility/i });
      
      // Password should be hidden initially
      expect(passwordInput).toHaveAttribute('type', 'password');
      
      // Click to show password
      await user.click(toggleButton);
      expect(passwordInput).toHaveAttribute('type', 'text');
      
      // Click to hide password again
      await user.click(toggleButton);
      expect(passwordInput).toHaveAttribute('type', 'password');
    });

    it('clears field errors when user starts typing', async () => {
      const user = userEvent.setup();
      renderWithoutAuth(<Login />);
      
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      const emailInput = screen.getByLabelText(/email address/i);
      
      // Submit form to trigger validation
      await user.click(submitButton);
      
      // Should show validation error
      await waitFor(() => {
        expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      });
      
      // Start typing in email field
      await user.type(emailInput, 'test');
      
      // Error should be cleared
      expect(screen.queryByText(/email is required/i)).not.toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('shows validation errors for empty fields', async () => {
      const user = userEvent.setup();
      renderWithoutAuth(<Login />);
      
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/email is required/i)).toBeInTheDocument();
        expect(screen.getByText(/password is required/i)).toBeInTheDocument();
      });
    });

    it('shows validation error for invalid email format', async () => {
      const user = userEvent.setup();
      renderWithoutAuth(<Login />);
      
      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      
      await user.type(emailInput, 'invalid-email');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
      });
    });

    it('does not submit form with validation errors', async () => {
      const user = userEvent.setup();
      const mockLogin = jest.fn();
      
      renderWithoutAuth(<Login />, { authContextValue: { login: mockLogin } });
      
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      });
      
      expect(mockLogin).not.toHaveBeenCalled();
    });

    it('allows submission with valid data', async () => {
      const user = userEvent.setup();
      const mockLogin = jest.fn().mockResolvedValue(undefined);
      
      renderWithoutAuth(<Login />, { authContextValue: { login: mockLogin } });
      
      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123',
        });
      });
    });
  });

  describe('Authentication Flow', () => {
    it('shows loading state during login', async () => {
      const user = userEvent.setup();
      const mockLogin = jest.fn(() => new Promise(resolve => setTimeout(resolve, 100)));
      
      renderWithoutAuth(<Login />, { authContextValue: { login: mockLogin } });
      
      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);
      
      // Should show loading spinner
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
      
      // Wait for login to complete
      await waitFor(() => {
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      });
    });

    it('navigates to dashboard after successful login', async () => {
      const user = userEvent.setup();
      const mockLogin = jest.fn().mockResolvedValue(undefined);
      
      renderWithoutAuth(<Login />, { authContextValue: { login: mockLogin } });
      
      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
      });
    });

    it('navigates to returnTo URL after successful login', async () => {
      // Mock location with returnTo parameter
      jest.doMock('react-router-dom', () => ({
        ...jest.requireActual('react-router-dom'),
        useNavigate: () => mockNavigate,
        useLocation: () => ({
          search: '?returnTo=%2Ftransactions',
        }),
      }));

      const user = userEvent.setup();
      const mockLogin = jest.fn().mockResolvedValue(undefined);
      
      renderWithoutAuth(<Login />, { authContextValue: { login: mockLogin } });
      
      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/transactions', { replace: true });
      });
    });

    it('displays error message for failed login', async () => {
      const user = userEvent.setup();
      const mockLogin = jest.fn().mockRejectedValue(new Error('Invalid credentials'));
      
      renderWithoutAuth(<Login />, { authContextValue: { login: mockLogin } });
      
      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'wrongpassword');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/api error: invalid credentials/i)).toBeInTheDocument();
      });
    });

    it('clears API error when user starts typing', async () => {
      const user = userEvent.setup();
      const mockLogin = jest.fn().mockRejectedValue(new Error('Invalid credentials'));
      
      renderWithoutAuth(<Login />, { authContextValue: { login: mockLogin } });
      
      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      
      // Trigger error
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'wrongpassword');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/api error: invalid credentials/i)).toBeInTheDocument();
      });
      
      // Start typing to clear error
      await user.type(emailInput, 'x');
      
      expect(screen.queryByText(/api error: invalid credentials/i)).not.toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    it('can be submitted by pressing Enter in email field', async () => {
      const user = userEvent.setup();
      const mockLogin = jest.fn().mockResolvedValue(undefined);
      
      renderWithoutAuth(<Login />, { authContextValue: { login: mockLogin } });
      
      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.keyboard('{Enter}');
      
      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalled();
      });
    });

    it('can be submitted by pressing Enter in password field', async () => {
      const user = userEvent.setup();
      const mockLogin = jest.fn().mockResolvedValue(undefined);
      
      renderWithoutAuth(<Login />, { authContextValue: { login: mockLogin } });
      
      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      
      // Focus on password field and press Enter
      passwordInput.focus();
      await user.keyboard('{Enter}');
      
      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalled();
      });
    });
  });

  describe('Navigation Links', () => {
    it('has working forgot password link', () => {
      renderWithoutAuth(<Login />);
      
      const forgotPasswordLink = screen.getByText(/forgot your password/i);
      expect(forgotPasswordLink.closest('a')).toHaveAttribute('href', '/forgot-password');
    });

    it('has working register link', () => {
      renderWithoutAuth(<Login />);
      
      const registerLink = screen.getByText(/sign up here/i);
      expect(registerLink).toBeInTheDocument();
      // The Link component from RouterLink should handle navigation
    });
  });

  describe('Accessibility', () => {
    it('has proper form labels and ARIA attributes', () => {
      renderWithoutAuth(<Login />);
      
      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      
      expect(emailInput).toHaveAttribute('type', 'email');
      expect(emailInput).toHaveAttribute('autoComplete', 'email');
      expect(passwordInput).toHaveAttribute('autoComplete', 'current-password');
      expect(submitButton).toHaveAttribute('type', 'submit');
    });

    it('focuses email field on mount', () => {
      renderWithoutAuth(<Login />);
      
      const emailInput = screen.getByLabelText(/email address/i);
      expect(emailInput).toHaveFocus();
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      renderWithoutAuth(<Login />);
      
      // Tab through form elements
      await user.tab();
      expect(screen.getByLabelText(/password/i)).toHaveFocus();
      
      await user.tab();
      expect(screen.getByRole('button', { name: /toggle password visibility/i })).toHaveFocus();
      
      await user.tab();
      expect(screen.getByRole('button', { name: /sign in/i })).toHaveFocus();
    });

    it('provides proper error announcements', async () => {
      const user = userEvent.setup();
      renderWithoutAuth(<Login />);
      
      const emailInput = screen.getByLabelText(/email address/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      
      // Trigger validation error
      await user.click(submitButton);
      
      await waitFor(() => {
        // Error should be associated with the input
        expect(emailInput).toHaveAttribute('aria-invalid', 'true');
        expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      });
    });
  });

  describe('Security', () => {
    it('has proper autocomplete attributes', () => {
      renderWithoutAuth(<Login />);
      
      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      
      expect(emailInput).toHaveAttribute('autoComplete', 'email');
      expect(passwordInput).toHaveAttribute('autoComplete', 'current-password');
    });

    it('masks password by default', () => {
      renderWithoutAuth(<Login />);
      
      const passwordInput = screen.getByLabelText(/password/i);
      expect(passwordInput).toHaveAttribute('type', 'password');
    });
  });

  describe('Edge Cases', () => {
    it('handles very long email addresses', async () => {
      const user = userEvent.setup();
      renderWithoutAuth(<Login />);
      
      const emailInput = screen.getByLabelText(/email address/i);
      const longEmail = 'very.long.email.address.that.might.cause.issues@example.com';
      
      await user.type(emailInput, longEmail);
      expect(emailInput).toHaveValue(longEmail);
    });

    it('handles special characters in password', async () => {
      const user = userEvent.setup();
      renderWithoutAuth(<Login />);
      
      const passwordInput = screen.getByLabelText(/password/i);
      const specialPassword = 'P@ssw0rd!@#$%^&*()';
      
      await user.type(passwordInput, specialPassword);
      expect(passwordInput).toHaveValue(specialPassword);
    });

    it('handles network errors gracefully', async () => {
      const user = userEvent.setup();
      const mockLogin = jest.fn().mockRejectedValue(new Error('Network Error'));
      
      renderWithoutAuth(<Login />, { authContextValue: { login: mockLogin } });
      
      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/api error: network error/i)).toBeInTheDocument();
      });
    });
  });
});