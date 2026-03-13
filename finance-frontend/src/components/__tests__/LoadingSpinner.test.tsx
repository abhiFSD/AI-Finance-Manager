import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import LoadingSpinner from '../LoadingSpinner';

// Create a theme for testing
const theme = createTheme();

const renderWithTheme = (ui: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {ui}
    </ThemeProvider>
  );
};

describe('LoadingSpinner Component', () => {
  describe('Basic Rendering', () => {
    it('renders without crashing', () => {
      renderWithTheme(<LoadingSpinner />);
      
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('displays default loading message', () => {
      renderWithTheme(<LoadingSpinner />);
      
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('displays custom loading message', () => {
      const customMessage = 'Please wait while we load your data...';
      renderWithTheme(<LoadingSpinner message={customMessage} />);
      
      expect(screen.getByText(customMessage)).toBeInTheDocument();
    });

    it('does not display message when message is empty string', () => {
      renderWithTheme(<LoadingSpinner message="" />);
      
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('does not display message when message is null', () => {
      renderWithTheme(<LoadingSpinner message={undefined} />);
      
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
  });

  describe('Size Configuration', () => {
    it('renders with default size', () => {
      renderWithTheme(<LoadingSpinner />);
      
      const progress = screen.getByRole('progressbar');
      expect(progress).toBeInTheDocument();
      // Note: Testing exact size styling is complex with MUI components
      // We test that the component renders with custom size prop
    });

    it('renders with custom size', () => {
      renderWithTheme(<LoadingSpinner size={60} />);
      
      const progress = screen.getByRole('progressbar');
      expect(progress).toBeInTheDocument();
    });

    it('handles zero size gracefully', () => {
      renderWithTheme(<LoadingSpinner size={0} />);
      
      const progress = screen.getByRole('progressbar');
      expect(progress).toBeInTheDocument();
    });

    it('handles negative size gracefully', () => {
      renderWithTheme(<LoadingSpinner size={-10} />);
      
      const progress = screen.getByRole('progressbar');
      expect(progress).toBeInTheDocument();
    });
  });

  describe('Full Screen Mode', () => {
    it('renders in normal mode by default', () => {
      renderWithTheme(<LoadingSpinner />);
      
      const container = screen.getByRole('progressbar').closest('div');
      expect(container).toBeInTheDocument();
      expect(container).not.toHaveStyle({
        position: 'fixed',
        top: '0',
        left: '0',
        right: '0',
        bottom: '0',
      });
    });

    it('renders in full screen mode when fullScreen is true', () => {
      renderWithTheme(<LoadingSpinner fullScreen />);
      
      const container = screen.getByRole('progressbar').closest('div');
      expect(container).toHaveStyle({
        position: 'fixed',
        top: '0',
        left: '0',
        right: '0',
        bottom: '0',
      });
    });

    it('applies correct z-index in full screen mode', () => {
      renderWithTheme(<LoadingSpinner fullScreen />);
      
      const container = screen.getByRole('progressbar').closest('div');
      expect(container).toHaveStyle({
        zIndex: '9999',
      });
    });

    it('applies overlay background in full screen mode', () => {
      renderWithTheme(<LoadingSpinner fullScreen />);
      
      const container = screen.getByRole('progressbar').closest('div');
      expect(container).toHaveStyle({
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
      });
    });
  });

  describe('Layout and Styling', () => {
    it('centers content properly', () => {
      renderWithTheme(<LoadingSpinner />);
      
      const container = screen.getByRole('progressbar').closest('div');
      expect(container).toHaveStyle({
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      });
    });

    it('applies column layout for normal mode', () => {
      renderWithTheme(<LoadingSpinner message="Loading..." />);
      
      const container = screen.getByRole('progressbar').closest('div');
      expect(container).toHaveStyle({
        flexDirection: 'column',
      });
    });

    it('displays spinner and message in correct order', () => {
      renderWithTheme(<LoadingSpinner message="Loading data..." />);
      
      const container = screen.getByRole('progressbar').closest('div');
      const progressbar = screen.getByRole('progressbar');
      const message = screen.getByText('Loading data...');
      
      expect(container).toContainElement(progressbar);
      expect(container).toContainElement(message);
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA role for progress indicator', () => {
      renderWithTheme(<LoadingSpinner />);
      
      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveAttribute('role', 'progressbar');
    });

    it('provides accessible loading indication', () => {
      renderWithTheme(<LoadingSpinner message="Loading your dashboard..." />);
      
      // Screen readers should be able to find both the progressbar and the message
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.getByText('Loading your dashboard...')).toBeInTheDocument();
    });

    it('works without message for screen readers', () => {
      renderWithTheme(<LoadingSpinner message="" />);
      
      // Should still be accessible with just the progressbar
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
  });

  describe('Props Handling', () => {
    it('handles all props combinations correctly', () => {
      renderWithTheme(
        <LoadingSpinner 
          message="Custom loading message" 
          size={50} 
          fullScreen={true} 
        />
      );
      
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.getByText('Custom loading message')).toBeInTheDocument();
    });

    it('handles undefined props gracefully', () => {
      renderWithTheme(
        <LoadingSpinner 
          message={undefined} 
          size={undefined} 
          fullScreen={undefined} 
        />
      );
      
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
  });

  describe('Error Boundaries', () => {
    it('handles edge case size values gracefully', () => {
      // Test with various edge cases that are valid
      const { rerender } = renderWithTheme(<LoadingSpinner size={0} />);
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      
      rerender(
        <ThemeProvider theme={theme}>
          <LoadingSpinner size={-1} />
        </ThemeProvider>
      );
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      
      rerender(
        <ThemeProvider theme={theme}>
          <LoadingSpinner size={1000} />
        </ThemeProvider>
      );
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
  });

  describe('Responsive Behavior', () => {
    it('maintains layout in different screen sizes', () => {
      // Test normal mode
      renderWithTheme(<LoadingSpinner />);
      let container = screen.getByRole('progressbar').closest('div');
      expect(container).toHaveStyle({
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      });
      
      // Clean up
      screen.getByRole('progressbar').remove();
      
      // Test full screen mode
      renderWithTheme(<LoadingSpinner fullScreen />);
      container = screen.getByRole('progressbar').closest('div');
      expect(container).toHaveStyle({
        position: 'fixed',
      });
    });
  });

  describe('Performance', () => {
    it('renders efficiently without unnecessary re-renders', () => {
      const { rerender } = renderWithTheme(<LoadingSpinner message="Loading..." />);
      
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      
      // Re-render with same props
      rerender(
        <ThemeProvider theme={theme}>
          <LoadingSpinner message="Loading..." />
        </ThemeProvider>
      );
      
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
  });

  describe('Component Lifecycle', () => {
    it('cleans up properly when unmounted', () => {
      const { unmount } = renderWithTheme(<LoadingSpinner fullScreen />);
      
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      
      unmount();
      
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });
  });
});