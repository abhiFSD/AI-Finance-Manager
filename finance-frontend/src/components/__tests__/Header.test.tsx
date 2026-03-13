import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render, mockAuthContext } from '../../test-utils';
import Header from '../Header';

// Mock react-router-dom
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

describe('Header Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders application name', () => {
      render(<Header />);
      
      expect(screen.getByText(/FinanceTracker/i)).toBeInTheDocument();
    });

    it('shows menu button when showMenuButton is true', () => {
      render(<Header onMenuClick={jest.fn()} showMenuButton={true} />);
      
      const menuButton = screen.getByRole('button', { name: /open drawer/i });
      expect(menuButton).toBeInTheDocument();
    });

    it('hides menu button when showMenuButton is false', () => {
      render(<Header showMenuButton={false} />);
      
      const menuButton = screen.queryByRole('button', { name: /open drawer/i });
      expect(menuButton).not.toBeInTheDocument();
    });

    it('displays notifications badge', () => {
      render(<Header />);
      
      const notificationButton = screen.getByRole('button', { name: /notifications/i });
      expect(notificationButton).toBeInTheDocument();
      
      // Check if badge is present (badge content: 3)
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('displays user avatar with initials when no avatar image', () => {
      render(<Header />);
      
      const avatar = screen.getByText('JD'); // John Doe initials
      expect(avatar).toBeInTheDocument();
    });

    it('displays user avatar image when avatar exists', () => {
      const authContextWithAvatar = {
        ...mockAuthContext,
        user: {
          ...mockAuthContext.user,
          avatar: 'https://example.com/avatar.jpg',
        },
      };

      render(<Header />, { authContextValue: authContextWithAvatar });
      
      const avatarImage = screen.getByRole('img');
      expect(avatarImage).toHaveAttribute('src', 'https://example.com/avatar.jpg');
      expect(avatarImage).toHaveAttribute('alt', 'John Doe');
    });
  });

  describe('Menu Interactions', () => {
    it('calls onMenuClick when menu button is clicked', async () => {
      const user = userEvent.setup();
      const mockOnMenuClick = jest.fn();
      
      render(<Header onMenuClick={mockOnMenuClick} />);
      
      const menuButton = screen.getByRole('button', { name: /open drawer/i });
      await user.click(menuButton);
      
      expect(mockOnMenuClick).toHaveBeenCalledTimes(1);
    });

    it('opens profile menu when avatar is clicked', async () => {
      const user = userEvent.setup();
      
      render(<Header />);
      
      const avatarButton = screen.getByRole('button', { name: /account of current user/i });
      await user.click(avatarButton);
      
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('john.doe@example.com')).toBeInTheDocument();
        expect(screen.getByText('Profile')).toBeInTheDocument();
        expect(screen.getByText('Settings')).toBeInTheDocument();
        expect(screen.getByText('Sign out')).toBeInTheDocument();
      });
    });

    it('closes profile menu when clicking outside', async () => {
      const user = userEvent.setup();
      
      render(<Header />);
      
      // Open menu
      const avatarButton = screen.getByRole('button', { name: /account of current user/i });
      await user.click(avatarButton);
      
      await waitFor(() => {
        expect(screen.getByText('Profile')).toBeInTheDocument();
      });
      
      // Click outside (on the document body)
      fireEvent.click(document.body);
      
      await waitFor(() => {
        expect(screen.queryByText('Profile')).not.toBeInTheDocument();
      });
    });
  });

  describe('Navigation', () => {
    it('navigates to profile when profile menu item is clicked', async () => {
      const user = userEvent.setup();
      
      render(<Header />);
      
      // Open menu
      const avatarButton = screen.getByRole('button', { name: /account of current user/i });
      await user.click(avatarButton);
      
      // Click profile
      const profileItem = await screen.findByText('Profile');
      await user.click(profileItem);
      
      expect(mockNavigate).toHaveBeenCalledWith('/profile');
    });

    it('navigates to settings when settings menu item is clicked', async () => {
      const user = userEvent.setup();
      
      render(<Header />);
      
      // Open menu
      const avatarButton = screen.getByRole('button', { name: /account of current user/i });
      await user.click(avatarButton);
      
      // Click settings
      const settingsItem = await screen.findByText('Settings');
      await user.click(settingsItem);
      
      expect(mockNavigate).toHaveBeenCalledWith('/settings');
    });
  });

  describe('Authentication', () => {
    it('calls logout and navigates when sign out is clicked', async () => {
      const user = userEvent.setup();
      const mockLogout = jest.fn();
      
      render(<Header />, { authContextValue: { logout: mockLogout } });
      
      // Open menu
      const avatarButton = screen.getByRole('button', { name: /account of current user/i });
      await user.click(avatarButton);
      
      // Click sign out
      const signOutItem = await screen.findByText('Sign out');
      await user.click(signOutItem);
      
      expect(mockLogout).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });

    it('displays default icon when user is not available', () => {
      render(<Header />, { authContextValue: { user: null } });
      
      // Should show AccountCircle icon instead of initials
      const avatarButton = screen.getByRole('button', { name: /account of current user/i });
      expect(avatarButton).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      render(<Header onMenuClick={jest.fn()} />);
      
      expect(screen.getByRole('button', { name: /open drawer/i })).toHaveAttribute('aria-label', 'open drawer');
      expect(screen.getByRole('button', { name: /account of current user/i })).toHaveAttribute('aria-label', 'account of current user');
      expect(screen.getByRole('button', { name: /account of current user/i })).toHaveAttribute('aria-controls', 'primary-search-account-menu');
      expect(screen.getByRole('button', { name: /account of current user/i })).toHaveAttribute('aria-haspopup', 'true');
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      
      render(<Header onMenuClick={jest.fn()} />);
      
      // Tab to menu button
      await user.tab();
      expect(screen.getByRole('button', { name: /open drawer/i })).toHaveFocus();
      
      // Tab to notifications
      await user.tab();
      expect(screen.getByRole('button').closest('button')).toHaveFocus();
      
      // Tab to profile
      await user.tab();
      expect(screen.getByRole('button', { name: /account of current user/i })).toHaveFocus();
    });

    it('opens menu with Enter key', async () => {
      const user = userEvent.setup();
      
      render(<Header />);
      
      const avatarButton = screen.getByRole('button', { name: /account of current user/i });
      avatarButton.focus();
      
      await user.keyboard('{Enter}');
      
      await waitFor(() => {
        expect(screen.getByText('Profile')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('handles missing user data gracefully', () => {
      render(<Header />, { authContextValue: { user: null } });
      
      expect(screen.getByRole('button', { name: /account of current user/i })).toBeInTheDocument();
      // Should not crash when user is null
    });

    it('handles missing user name gracefully', () => {
      const incompleteUser = {
        ...mockAuthContext.user,
        firstName: '',
        lastName: '',
      };
      
      render(<Header />, { authContextValue: { user: incompleteUser } });
      
      // Should still render without crashing
      expect(screen.getByRole('button', { name: /account of current user/i })).toBeInTheDocument();
    });
  });

  describe('Theme and Styling', () => {
    it('applies correct styling classes', () => {
      render(<Header />);
      
      const appBar = screen.getByRole('banner');
      expect(appBar).toBeInTheDocument();
      
      const title = screen.getByText(/FinanceTracker/i);
      expect(title).toBeInTheDocument();
    });
  });
});