import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render, renderWithoutAuth } from '../../test-utils';
import Register from '../Register';

// Mock react-router-dom
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// Mock API services
jest.mock('../../services/api', () => ({
  handleApiError: jest.fn((error) => 'API Error: ' + error.message),
}));

describe('Register Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders registration form correctly', () => {
      renderWithoutAuth(<Register />);
      
      expect(screen.getByRole('heading', { name: /create account/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      expect(screen.getByLabelText('Password')).toBeInTheDocument();
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
    });

    it('displays app branding and welcome message', () => {
      renderWithoutAuth(<Register />);
      
      expect(screen.getByText(/create account/i)).toBeInTheDocument();
      expect(screen.getByText(/join .* and take control of your finances/i)).toBeInTheDocument();
    });

    it('shows registration icon', () => {
      renderWithoutAuth(<Register />);
      
      // Check for PersonAdd icon
      expect(document.querySelector('[data-testid="PersonAddIcon"]')).toBeTruthy();
    });

    it('displays terms and conditions checkbox', () => {
      renderWithoutAuth(<Register />);
      
      const termsCheckbox = screen.getByRole('checkbox', { name: /i agree to the terms/i });
      expect(termsCheckbox).toBeInTheDocument();
      expect(screen.getByText(/terms of service/i)).toBeInTheDocument();
      expect(screen.getByText(/privacy policy/i)).toBeInTheDocument();
    });

    it('displays navigation links', () => {
      renderWithoutAuth(<Register />);
      
      expect(screen.getByText(/already have an account/i)).toBeInTheDocument();
      expect(screen.getByText(/sign in here/i)).toBeInTheDocument();
    });

    it('shows input icons', () => {
      renderWithoutAuth(<Register />);
      
      // Check for person, email, and lock icons
      expect(document.querySelectorAll('[data-testid="PersonIcon"]')).toHaveLength(2); // First and last name
      expect(document.querySelector('[data-testid="EmailIcon"]')).toBeTruthy();
      expect(document.querySelectorAll('[data-testid="LockIcon"]')).toHaveLength(2); // Password and confirm password
    });
  });

  describe('Form Interactions', () => {
    it('allows user to type in all input fields', async () => {
      const user = userEvent.setup();
      renderWithoutAuth(<Register />);
      
      const firstNameInput = screen.getByLabelText(/first name/i);
      const lastNameInput = screen.getByLabelText(/last name/i);
      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText('Password');
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      
      await user.type(firstNameInput, 'John');
      await user.type(lastNameInput, 'Doe');
      await user.type(emailInput, 'john@example.com');
      await user.type(passwordInput, 'password123');
      await user.type(confirmPasswordInput, 'password123');
      
      expect(firstNameInput).toHaveValue('John');
      expect(lastNameInput).toHaveValue('Doe');
      expect(emailInput).toHaveValue('john@example.com');
      expect(passwordInput).toHaveValue('password123');
      expect(confirmPasswordInput).toHaveValue('password123');
    });

    it('toggles password visibility for password field', async () => {
      const user = userEvent.setup();
      renderWithoutAuth(<Register />);
      
      const passwordInput = screen.getByLabelText('Password');
      const toggleButtons = screen.getAllByRole('button', { name: /toggle password visibility/i });
      const passwordToggleButton = toggleButtons[0];
      
      // Password should be hidden initially
      expect(passwordInput).toHaveAttribute('type', 'password');
      
      // Click to show password
      await user.click(passwordToggleButton);
      expect(passwordInput).toHaveAttribute('type', 'text');
      
      // Click to hide password again
      await user.click(passwordToggleButton);
      expect(passwordInput).toHaveAttribute('type', 'password');
    });

    it('toggles password visibility for confirm password field', async () => {
      const user = userEvent.setup();
      renderWithoutAuth(<Register />);
      
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const toggleButton = screen.getByRole('button', { name: /toggle confirm password visibility/i });
      
      // Password should be hidden initially
      expect(confirmPasswordInput).toHaveAttribute('type', 'password');
      
      // Click to show password
      await user.click(toggleButton);
      expect(confirmPasswordInput).toHaveAttribute('type', 'text');
      
      // Click to hide password again
      await user.click(toggleButton);
      expect(confirmPasswordInput).toHaveAttribute('type', 'password');
    });

    it('allows user to check/uncheck terms checkbox', async () => {
      const user = userEvent.setup();
      renderWithoutAuth(<Register />);
      
      const termsCheckbox = screen.getByRole('checkbox', { name: /i agree to the terms/i });
      
      // Should be unchecked initially
      expect(termsCheckbox).not.toBeChecked();
      
      // Check the checkbox
      await user.click(termsCheckbox);
      expect(termsCheckbox).toBeChecked();
      
      // Uncheck the checkbox
      await user.click(termsCheckbox);
      expect(termsCheckbox).not.toBeChecked();
    });

    it('clears field errors when user starts typing', async () => {
      const user = userEvent.setup();
      renderWithoutAuth(<Register />);
      
      const submitButton = screen.getByRole('button', { name: /create account/i });
      const firstNameInput = screen.getByLabelText(/first name/i);
      
      // Submit form to trigger validation
      await user.click(submitButton);
      
      // Should show validation error
      await waitFor(() => {
        expect(screen.getByText(/first name is required/i)).toBeInTheDocument();
      });
      
      // Start typing in first name field
      await user.type(firstNameInput, 'John');
      
      // Error should be cleared
      expect(screen.queryByText(/first name is required/i)).not.toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('shows validation errors for empty fields', async () => {
      const user = userEvent.setup();
      renderWithoutAuth(<Register />);
      
      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/first name is required/i)).toBeInTheDocument();
        expect(screen.getByText(/last name is required/i)).toBeInTheDocument();
        expect(screen.getByText(/email is required/i)).toBeInTheDocument();
        expect(screen.getByText(/password is required/i)).toBeInTheDocument();
        expect(screen.getByText(/you must accept the terms/i)).toBeInTheDocument();
      });
    });

    it('shows validation error for invalid email format', async () => {
      const user = userEvent.setup();
      renderWithoutAuth(<Register />);
      
      const emailInput = screen.getByLabelText(/email address/i);
      const submitButton = screen.getByRole('button', { name: /create account/i });
      
      await user.type(emailInput, 'invalid-email');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
      });
    });

    it('shows validation error for weak password', async () => {
      const user = userEvent.setup();
      renderWithoutAuth(<Register />);
      
      const passwordInput = screen.getByLabelText('Password');
      const submitButton = screen.getByRole('button', { name: /create account/i });
      
      await user.type(passwordInput, 'weak');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/password must be at least/i)).toBeInTheDocument();
      });
    });

    it('shows validation error for password mismatch', async () => {
      const user = userEvent.setup();
      renderWithoutAuth(<Register />);
      
      const passwordInput = screen.getByLabelText('Password');
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const submitButton = screen.getByRole('button', { name: /create account/i });
      
      await user.type(passwordInput, 'password123');
      await user.type(confirmPasswordInput, 'different123');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
      });
    });

    it('shows validation error when terms are not accepted', async () => {
      const user = userEvent.setup();
      renderWithoutAuth(<Register />);
      
      // Fill all fields except terms
      await user.type(screen.getByLabelText(/first name/i), 'John');
      await user.type(screen.getByLabelText(/last name/i), 'Doe');
      await user.type(screen.getByLabelText(/email address/i), 'john@example.com');
      await user.type(screen.getByLabelText('Password'), 'password123');
      await user.type(screen.getByLabelText(/confirm password/i), 'password123');
      
      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/you must accept the terms/i)).toBeInTheDocument();
      });
    });

    it('does not submit form with validation errors', async () => {
      const user = userEvent.setup();
      const mockRegister = jest.fn();
      
      renderWithoutAuth(<Register />, { authContextValue: { register: mockRegister } });
      
      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/first name is required/i)).toBeInTheDocument();
      });
      
      expect(mockRegister).not.toHaveBeenCalled();
    });

    it('allows submission with valid data', async () => {
      const user = userEvent.setup();
      const mockRegister = jest.fn().mockResolvedValue(undefined);
      
      renderWithoutAuth(<Register />, { authContextValue: { register: mockRegister } });
      
      // Fill all fields with valid data
      await user.type(screen.getByLabelText(/first name/i), 'John');
      await user.type(screen.getByLabelText(/last name/i), 'Doe');
      await user.type(screen.getByLabelText(/email address/i), 'john@example.com');
      await user.type(screen.getByLabelText('Password'), 'Password123!');
      await user.type(screen.getByLabelText(/confirm password/i), 'Password123!');
      await user.click(screen.getByRole('checkbox', { name: /i agree to the terms/i }));
      
      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(mockRegister).toHaveBeenCalledWith({
          email: 'john@example.com',
          password: 'Password123!',
          confirmPassword: 'Password123!',
          firstName: 'John',
          lastName: 'Doe',
        });
      });
    });
  });

  describe('Registration Flow', () => {
    it('shows loading state during registration', async () => {
      const user = userEvent.setup();
      const mockRegister = jest.fn(() => new Promise(resolve => setTimeout(resolve, 100)));
      
      renderWithoutAuth(<Register />, { authContextValue: { register: mockRegister } });
      
      // Fill all fields with valid data
      await user.type(screen.getByLabelText(/first name/i), 'John');
      await user.type(screen.getByLabelText(/last name/i), 'Doe');
      await user.type(screen.getByLabelText(/email address/i), 'john@example.com');
      await user.type(screen.getByLabelText('Password'), 'Password123!');
      await user.type(screen.getByLabelText(/confirm password/i), 'Password123!');
      await user.click(screen.getByRole('checkbox', { name: /i agree to the terms/i }));
      
      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);
      
      // Should show loading spinner
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
      
      // Wait for registration to complete
      await waitFor(() => {
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      });
    });

    it('navigates to dashboard after successful registration', async () => {
      const user = userEvent.setup();
      const mockRegister = jest.fn().mockResolvedValue(undefined);
      
      renderWithoutAuth(<Register />, { authContextValue: { register: mockRegister } });
      
      // Fill all fields with valid data
      await user.type(screen.getByLabelText(/first name/i), 'John');
      await user.type(screen.getByLabelText(/last name/i), 'Doe');
      await user.type(screen.getByLabelText(/email address/i), 'john@example.com');
      await user.type(screen.getByLabelText('Password'), 'Password123!');
      await user.type(screen.getByLabelText(/confirm password/i), 'Password123!');
      await user.click(screen.getByRole('checkbox', { name: /i agree to the terms/i }));
      
      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
      });
    });

    it('displays error message for failed registration', async () => {
      const user = userEvent.setup();
      const mockRegister = jest.fn().mockRejectedValue(new Error('Email already exists'));
      
      renderWithoutAuth(<Register />, { authContextValue: { register: mockRegister } });
      
      // Fill all fields with valid data
      await user.type(screen.getByLabelText(/first name/i), 'John');
      await user.type(screen.getByLabelText(/last name/i), 'Doe');
      await user.type(screen.getByLabelText(/email address/i), 'john@example.com');
      await user.type(screen.getByLabelText('Password'), 'Password123!');
      await user.type(screen.getByLabelText(/confirm password/i), 'Password123!');
      await user.click(screen.getByRole('checkbox', { name: /i agree to the terms/i }));
      
      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/api error: email already exists/i)).toBeInTheDocument();
      });
    });

    it('clears API error when user starts typing', async () => {
      const user = userEvent.setup();
      const mockRegister = jest.fn().mockRejectedValue(new Error('Email already exists'));
      
      renderWithoutAuth(<Register />, { authContextValue: { register: mockRegister } });
      
      // Fill form and trigger error
      await user.type(screen.getByLabelText(/first name/i), 'John');
      await user.type(screen.getByLabelText(/last name/i), 'Doe');
      await user.type(screen.getByLabelText(/email address/i), 'john@example.com');
      await user.type(screen.getByLabelText('Password'), 'Password123!');
      await user.type(screen.getByLabelText(/confirm password/i), 'Password123!');
      await user.click(screen.getByRole('checkbox', { name: /i agree to the terms/i }));
      await user.click(screen.getByRole('button', { name: /create account/i }));
      
      await waitFor(() => {
        expect(screen.getByText(/api error: email already exists/i)).toBeInTheDocument();
      });
      
      // Start typing to clear error
      await user.type(screen.getByLabelText(/first name/i), 'x');
      
      expect(screen.queryByText(/api error: email already exists/i)).not.toBeInTheDocument();
    });
  });

  describe('Form Layout', () => {
    it('displays first name and last name side by side', () => {
      renderWithoutAuth(<Register />);
      
      const firstNameInput = screen.getByLabelText(/first name/i);
      const lastNameInput = screen.getByLabelText(/last name/i);
      
      // Both should be in the same container with flex layout
      const container = firstNameInput.closest('div[class*="MuiBox"]');
      expect(container).toContainElement(lastNameInput);
    });
  });

  describe('Navigation Links', () => {
    it('has working login link', () => {
      renderWithoutAuth(<Register />);
      
      const loginLink = screen.getByText(/sign in here/i);
      expect(loginLink).toBeInTheDocument();
      // The Link component from RouterLink should handle navigation
    });
  });

  describe('Terms and Privacy Links', () => {
    it('has proper external links for terms and privacy', () => {
      renderWithoutAuth(<Register />);
      
      const termsLink = screen.getByText(/terms of service/i);
      const privacyLink = screen.getByText(/privacy policy/i);
      
      expect(termsLink.closest('a')).toHaveAttribute('href', '/terms');
      expect(termsLink.closest('a')).toHaveAttribute('target', '_blank');
      expect(termsLink.closest('a')).toHaveAttribute('rel', 'noopener');
      
      expect(privacyLink.closest('a')).toHaveAttribute('href', '/privacy');
      expect(privacyLink.closest('a')).toHaveAttribute('target', '_blank');
      expect(privacyLink.closest('a')).toHaveAttribute('rel', 'noopener');
    });
  });

  describe('Accessibility', () => {
    it('has proper form labels and ARIA attributes', () => {
      renderWithoutAuth(<Register />);
      
      const firstNameInput = screen.getByLabelText(/first name/i);
      const lastNameInput = screen.getByLabelText(/last name/i);
      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText('Password');
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const submitButton = screen.getByRole('button', { name: /create account/i });
      
      expect(firstNameInput).toHaveAttribute('autoComplete', 'given-name');
      expect(lastNameInput).toHaveAttribute('autoComplete', 'family-name');
      expect(emailInput).toHaveAttribute('type', 'email');
      expect(emailInput).toHaveAttribute('autoComplete', 'email');
      expect(passwordInput).toHaveAttribute('autoComplete', 'new-password');
      expect(confirmPasswordInput).toHaveAttribute('autoComplete', 'new-password');
      expect(submitButton).toHaveAttribute('type', 'submit');
    });

    it('focuses first name field on mount', () => {
      renderWithoutAuth(<Register />);
      
      const firstNameInput = screen.getByLabelText(/first name/i);
      expect(firstNameInput).toHaveFocus();
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      renderWithoutAuth(<Register />);
      
      // Tab through form elements
      await user.tab(); // last name
      expect(screen.getByLabelText(/last name/i)).toHaveFocus();
      
      await user.tab(); // email
      expect(screen.getByLabelText(/email address/i)).toHaveFocus();
      
      await user.tab(); // password
      expect(screen.getByLabelText('Password')).toHaveFocus();
    });

    it('provides proper error announcements', async () => {
      const user = userEvent.setup();
      renderWithoutAuth(<Register />);
      
      const firstNameInput = screen.getByLabelText(/first name/i);
      const submitButton = screen.getByRole('button', { name: /create account/i });
      
      // Trigger validation error
      await user.click(submitButton);
      
      await waitFor(() => {
        // Error should be associated with the input
        expect(firstNameInput).toHaveAttribute('aria-invalid', 'true');
        expect(screen.getByText(/first name is required/i)).toBeInTheDocument();
      });
    });
  });

  describe('Security', () => {
    it('has proper autocomplete attributes', () => {
      renderWithoutAuth(<Register />);
      
      const firstNameInput = screen.getByLabelText(/first name/i);
      const lastNameInput = screen.getByLabelText(/last name/i);
      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText('Password');
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      
      expect(firstNameInput).toHaveAttribute('autoComplete', 'given-name');
      expect(lastNameInput).toHaveAttribute('autoComplete', 'family-name');
      expect(emailInput).toHaveAttribute('autoComplete', 'email');
      expect(passwordInput).toHaveAttribute('autoComplete', 'new-password');
      expect(confirmPasswordInput).toHaveAttribute('autoComplete', 'new-password');
    });

    it('masks passwords by default', () => {
      renderWithoutAuth(<Register />);
      
      const passwordInput = screen.getByLabelText('Password');
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      
      expect(passwordInput).toHaveAttribute('type', 'password');
      expect(confirmPasswordInput).toHaveAttribute('type', 'password');
    });
  });

  describe('Edge Cases', () => {
    it('handles special characters in name fields', async () => {
      const user = userEvent.setup();
      renderWithoutAuth(<Register />);
      
      const firstNameInput = screen.getByLabelText(/first name/i);
      const lastNameInput = screen.getByLabelText(/last name/i);
      
      await user.type(firstNameInput, 'José-María');
      await user.type(lastNameInput, "O'Connor");
      
      expect(firstNameInput).toHaveValue('José-María');
      expect(lastNameInput).toHaveValue("O'Connor");
    });

    it('handles network errors gracefully', async () => {
      const user = userEvent.setup();
      const mockRegister = jest.fn().mockRejectedValue(new Error('Network Error'));
      
      renderWithoutAuth(<Register />, { authContextValue: { register: mockRegister } });
      
      // Fill form with valid data
      await user.type(screen.getByLabelText(/first name/i), 'John');
      await user.type(screen.getByLabelText(/last name/i), 'Doe');
      await user.type(screen.getByLabelText(/email address/i), 'john@example.com');
      await user.type(screen.getByLabelText('Password'), 'Password123!');
      await user.type(screen.getByLabelText(/confirm password/i), 'Password123!');
      await user.click(screen.getByRole('checkbox', { name: /i agree to the terms/i }));
      await user.click(screen.getByRole('button', { name: /create account/i }));
      
      await waitFor(() => {
        expect(screen.getByText(/api error: network error/i)).toBeInTheDocument();
      });
    });
  });
});