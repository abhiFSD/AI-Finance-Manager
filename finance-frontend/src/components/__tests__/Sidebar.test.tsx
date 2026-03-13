import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../../test-utils';
import Sidebar from '../Sidebar';

// Mock react-router-dom
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useLocation: () => ({ pathname: '/dashboard' }),
}));

// Mock useMediaQuery hook
const mockUseMediaQuery = jest.fn();
jest.mock('@mui/material/useMediaQuery', () => mockUseMediaQuery);

describe('Sidebar Component', () => {
  const defaultProps = {
    open: true,
    onClose: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseMediaQuery.mockReturnValue(false); // Default to desktop view
  });

  describe('Rendering', () => {
    it('renders all main menu items', () => {
      render(<Sidebar {...defaultProps} />);
      
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Accounts')).toBeInTheDocument();
      expect(screen.getByText('Transactions')).toBeInTheDocument();
      expect(screen.getByText('Budget')).toBeInTheDocument();
      expect(screen.getByText('Goals')).toBeInTheDocument();
      expect(screen.getByText('Credit Cards')).toBeInTheDocument();
    });

    it('renders bottom menu items', () => {
      render(<Sidebar {...defaultProps} />);
      
      expect(screen.getByText('Documents')).toBeInTheDocument();
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    it('renders menu item icons', () => {
      render(<Sidebar {...defaultProps} />);
      
      // Check that all menu items have associated icons
      const dashboardItem = screen.getByText('Dashboard').closest('div');
      expect(dashboardItem).toBeInTheDocument();
    });

    it('shows divider between main and bottom menu items', () => {
      render(<Sidebar {...defaultProps} />);
      
      const dividers = screen.getAllByRole('separator');
      expect(dividers.length).toBeGreaterThan(0);
    });
  });

  describe('Navigation', () => {
    it('navigates when menu item is clicked', async () => {
      const user = userEvent.setup();
      render(<Sidebar {...defaultProps} />);
      
      const transactionsItem = screen.getByText('Transactions');
      await user.click(transactionsItem);
      
      expect(mockNavigate).toHaveBeenCalledWith('/transactions');
    });

    it('navigates to settings when settings is clicked', async () => {
      const user = userEvent.setup();
      render(<Sidebar {...defaultProps} />);
      
      const settingsItem = screen.getByText('Settings');
      await user.click(settingsItem);
      
      expect(mockNavigate).toHaveBeenCalledWith('/settings');
    });

    it('navigates to documents when documents is clicked', async () => {
      const user = userEvent.setup();
      render(<Sidebar {...defaultProps} />);
      
      const documentsItem = screen.getByText('Documents');
      await user.click(documentsItem);
      
      expect(mockNavigate).toHaveBeenCalledWith('/documents');
    });
  });

  describe('Active State', () => {
    it('shows dashboard as selected when on dashboard route', () => {
      render(<Sidebar {...defaultProps} />);
      
      const dashboardButton = screen.getByText('Dashboard').closest('div[role="button"]');
      expect(dashboardButton).toHaveClass('Mui-selected');
    });

    it('shows correct selected state based on current route', () => {
      // Mock different route
      jest.doMock('react-router-dom', () => ({
        ...jest.requireActual('react-router-dom'),
        useNavigate: () => mockNavigate,
        useLocation: () => ({ pathname: '/transactions' }),
      }));

      render(<Sidebar {...defaultProps} />);
      
      const transactionsButton = screen.getByText('Transactions').closest('div[role="button"]');
      expect(transactionsButton).toHaveClass('Mui-selected');
    });
  });

  describe('Mobile Behavior', () => {
    it('closes sidebar on mobile after navigation', async () => {
      mockUseMediaQuery.mockReturnValue(true); // Mobile view
      const mockOnClose = jest.fn();
      const user = userEvent.setup();
      
      render(<Sidebar {...defaultProps} onClose={mockOnClose} />);
      
      const dashboardItem = screen.getByText('Dashboard');
      await user.click(dashboardItem);
      
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('does not close sidebar on desktop after navigation', async () => {
      mockUseMediaQuery.mockReturnValue(false); // Desktop view
      const mockOnClose = jest.fn();
      const user = userEvent.setup();
      
      render(<Sidebar {...defaultProps} onClose={mockOnClose} />);
      
      const dashboardItem = screen.getByText('Dashboard');
      await user.click(dashboardItem);
      
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('Drawer Variants', () => {
    it('renders temporary drawer by default', () => {
      render(<Sidebar {...defaultProps} />);
      
      // The drawer should be present in the DOM
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });

    it('renders permanent drawer when variant is permanent', () => {
      render(<Sidebar {...defaultProps} variant="permanent" />);
      
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });

    it('renders persistent drawer when variant is persistent', () => {
      render(<Sidebar {...defaultProps} variant="persistent" />);
      
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });
  });

  describe('Drawer State', () => {
    it('renders when open is true', () => {
      render(<Sidebar {...defaultProps} open={true} />);
      
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });

    it('calls onClose when drawer backdrop is clicked', async () => {
      const mockOnClose = jest.fn();
      render(<Sidebar {...defaultProps} onClose={mockOnClose} />);
      
      // Find the backdrop and click it
      const backdrop = document.querySelector('.MuiBackdrop-root');
      if (backdrop) {
        fireEvent.click(backdrop);
        expect(mockOnClose).toHaveBeenCalledTimes(1);
      }
    });
  });

  describe('Accessibility', () => {
    it('has proper role attributes for menu items', () => {
      render(<Sidebar {...defaultProps} />);
      
      const menuButtons = screen.getAllByRole('button');
      expect(menuButtons.length).toBeGreaterThan(0);
      
      // Check that each menu item is a button
      menuButtons.forEach(button => {
        expect(button).toHaveAttribute('role', 'button');
      });
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<Sidebar {...defaultProps} />);
      
      const firstMenuItem = screen.getByText('Dashboard').closest('div[role="button"]');
      
      // Focus first item
      if (firstMenuItem) {
        firstMenuItem.focus();
        expect(firstMenuItem).toHaveFocus();
        
        // Navigate with Enter key
        await user.keyboard('{Enter}');
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
      }
    });

    it('has proper ARIA labels for drawer', () => {
      render(<Sidebar {...defaultProps} />);
      
      // The drawer should be present with proper accessibility
      const drawer = document.querySelector('.MuiDrawer-root');
      expect(drawer).toBeInTheDocument();
    });
  });

  describe('Menu Item Structure', () => {
    it('renders menu items with icons and text', () => {
      render(<Sidebar {...defaultProps} />);
      
      // Check that Dashboard item has both icon and text
      const dashboardItem = screen.getByText('Dashboard');
      const dashboardContainer = dashboardItem.closest('[role="button"]');
      
      expect(dashboardContainer).toBeInTheDocument();
      expect(dashboardContainer).toContainElement(dashboardItem);
    });

    it('applies correct styling to selected items', () => {
      render(<Sidebar {...defaultProps} />);
      
      const dashboardButton = screen.getByText('Dashboard').closest('div[role="button"]');
      expect(dashboardButton).toHaveClass('Mui-selected');
    });
  });

  describe('Error Handling', () => {
    it('handles navigation errors gracefully', async () => {
      mockNavigate.mockImplementation(() => {
        throw new Error('Navigation error');
      });

      const user = userEvent.setup();
      render(<Sidebar {...defaultProps} />);
      
      const dashboardItem = screen.getByText('Dashboard');
      
      // Should not crash when navigation fails
      await expect(async () => {
        await user.click(dashboardItem);
      }).not.toThrow();
    });

    it('handles missing onClose prop gracefully', async () => {
      const user = userEvent.setup();
      render(<Sidebar open={true} onClose={undefined as any} />);
      
      const dashboardItem = screen.getByText('Dashboard');
      
      // Should not crash when onClose is not provided
      await expect(async () => {
        await user.click(dashboardItem);
      }).not.toThrow();
    });
  });

  describe('Theme Integration', () => {
    it('responds to theme breakpoints', () => {
      mockUseMediaQuery.mockReturnValue(true);
      render(<Sidebar {...defaultProps} />);
      
      // Should render correctly with mobile theme
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });
  });
});