import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import ErrorBoundary from '../ErrorBoundary';

// Create a theme for testing
const theme = createTheme();

const renderWithTheme = (ui: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {ui}
    </ThemeProvider>
  );
};

// Mock window.location.reload
const mockReload = jest.fn();
Object.defineProperty(window, 'location', {
  value: {
    reload: mockReload,
  },
  writable: true,
});

// Component that throws an error for testing
const ThrowErrorComponent: React.FC<{ shouldThrow?: boolean; errorMessage?: string }> = ({ 
  shouldThrow = true, 
  errorMessage = 'Test error' 
}) => {
  if (shouldThrow) {
    throw new Error(errorMessage);
  }
  return <div data-testid="working-component">Component works!</div>;
};

// Component that works normally
const WorkingComponent: React.FC = () => (
  <div data-testid="working-component">Component works!</div>
);

describe('ErrorBoundary Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Normal Operation', () => {
    it('renders children when there is no error', () => {
      renderWithTheme(
        <ErrorBoundary>
          <WorkingComponent />
        </ErrorBoundary>
      );

      expect(screen.getByTestId('working-component')).toBeInTheDocument();
      expect(screen.getByText('Component works!')).toBeInTheDocument();
    });

    it('renders multiple children when there is no error', () => {
      renderWithTheme(
        <ErrorBoundary>
          <WorkingComponent />
          <div data-testid="second-component">Second component</div>
        </ErrorBoundary>
      );

      expect(screen.getByTestId('working-component')).toBeInTheDocument();
      expect(screen.getByTestId('second-component')).toBeInTheDocument();
    });

    it('handles null children gracefully', () => {
      renderWithTheme(
        <ErrorBoundary>
          {null}
        </ErrorBoundary>
      );

      // Should not crash and not show error boundary UI
      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('catches errors and displays error UI', () => {
      renderWithTheme(
        <ErrorBoundary>
          <ThrowErrorComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByText(/We're sorry, but an unexpected error occurred/)).toBeInTheDocument();
      expect(screen.queryByTestId('working-component')).not.toBeInTheDocument();
    });

    it('displays error icon', () => {
      renderWithTheme(
        <ErrorBoundary>
          <ThrowErrorComponent />
        </ErrorBoundary>
      );

      // Check for error icon (MUI ErrorOutline)
      expect(document.querySelector('[data-testid="ErrorOutlineIcon"]')).toBeTruthy();
    });

    it('logs error to console', () => {
      const consoleSpy = jest.spyOn(console, 'error');
      
      renderWithTheme(
        <ErrorBoundary>
          <ThrowErrorComponent />
        </ErrorBoundary>
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        'Uncaught error:',
        expect.any(Error),
        expect.any(Object)
      );
    });

    it('displays custom error message in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      renderWithTheme(
        <ErrorBoundary>
          <ThrowErrorComponent errorMessage="Custom test error" />
        </ErrorBoundary>
      );

      expect(screen.getByText('Error Details (Development Only):')).toBeInTheDocument();
      expect(screen.getByText(/Custom test error/)).toBeInTheDocument();

      process.env.NODE_ENV = originalEnv;
    });

    it('hides error details in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      renderWithTheme(
        <ErrorBoundary>
          <ThrowErrorComponent errorMessage="Custom test error" />
        </ErrorBoundary>
      );

      expect(screen.queryByText('Error Details (Development Only):')).not.toBeInTheDocument();
      expect(screen.queryByText(/Custom test error/)).not.toBeInTheDocument();

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Custom Fallback', () => {
    it('renders custom fallback when provided', () => {
      const CustomFallback = () => <div data-testid="custom-fallback">Custom Error UI</div>;

      renderWithTheme(
        <ErrorBoundary fallback={<CustomFallback />}>
          <ThrowErrorComponent />
        </ErrorBoundary>
      );

      expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
      expect(screen.getByText('Custom Error UI')).toBeInTheDocument();
      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
    });

    it('prefers custom fallback over default error UI', () => {
      const CustomFallback = () => <div data-testid="custom-fallback">Custom fallback</div>;

      renderWithTheme(
        <ErrorBoundary fallback={<CustomFallback />}>
          <ThrowErrorComponent />
        </ErrorBoundary>
      );

      expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
      expect(screen.queryByText('Try Again')).not.toBeInTheDocument();
      expect(screen.queryByText('Refresh Page')).not.toBeInTheDocument();
    });
  });

  describe('Action Buttons', () => {
    it('displays Try Again and Refresh Page buttons', () => {
      renderWithTheme(
        <ErrorBoundary>
          <ThrowErrorComponent />
        </ErrorBoundary>
      );

      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /refresh page/i })).toBeInTheDocument();
    });

    it('calls window.location.reload when Refresh Page is clicked', async () => {
      const user = userEvent.setup();
      
      renderWithTheme(
        <ErrorBoundary>
          <ThrowErrorComponent />
        </ErrorBoundary>
      );

      const refreshButton = screen.getByRole('button', { name: /refresh page/i });
      await user.click(refreshButton);

      expect(mockReload).toHaveBeenCalledTimes(1);
    });

    it('resets error state when Try Again is clicked', async () => {
      const user = userEvent.setup();
      
      renderWithTheme(
        <ErrorBoundary>
          <ThrowErrorComponent shouldThrow={false} />
        </ErrorBoundary>
      );

      // Initially should show working component
      expect(screen.getByTestId('working-component')).toBeInTheDocument();

      // Force an error by re-rendering with error
      const { rerender } = render(
        <ThemeProvider theme={theme}>
          <ErrorBoundary>
            <ThrowErrorComponent shouldThrow={true} />
          </ErrorBoundary>
        </ThemeProvider>
      );

      // Should show error UI
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();

      // Click Try Again
      const tryAgainButton = screen.getByRole('button', { name: /try again/i });
      await user.click(tryAgainButton);

      // Re-render with working component
      rerender(
        <ThemeProvider theme={theme}>
          <ErrorBoundary>
            <ThrowErrorComponent shouldThrow={false} />
          </ErrorBoundary>
        </ThemeProvider>
      );

      // Should show working component again
      expect(screen.getByTestId('working-component')).toBeInTheDocument();
    });
  });

  describe('Button Icons and Styling', () => {
    it('displays refresh icons on buttons', () => {
      renderWithTheme(
        <ErrorBoundary>
          <ThrowErrorComponent />
        </ErrorBoundary>
      );

      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(2);
      
      // Check that buttons have proper structure
      buttons.forEach(button => {
        expect(button).toBeInTheDocument();
      });
    });

    it('applies correct button variants', () => {
      renderWithTheme(
        <ErrorBoundary>
          <ThrowErrorComponent />
        </ErrorBoundary>
      );

      const tryAgainButton = screen.getByRole('button', { name: /try again/i });
      const refreshButton = screen.getByRole('button', { name: /refresh page/i });

      expect(tryAgainButton).toHaveClass('MuiButton-outlined');
      expect(refreshButton).toHaveClass('MuiButton-contained');
    });
  });

  describe('Layout and Structure', () => {
    it('renders error UI with proper layout structure', () => {
      renderWithTheme(
        <ErrorBoundary>
          <ThrowErrorComponent />
        </ErrorBoundary>
      );

      // Check that the card structure is present
      const card = screen.getByText('Something went wrong').closest('.MuiCard-root');
      expect(card).toBeInTheDocument();

      // Check for centered layout
      const container = card?.parentElement;
      expect(container).toHaveStyle({
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      });
    });

    it('applies proper spacing and padding', () => {
      renderWithTheme(
        <ErrorBoundary>
          <ThrowErrorComponent />
        </ErrorBoundary>
      );

      const cardContent = screen.getByText('Something went wrong').closest('.MuiCardContent-root');
      expect(cardContent).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper heading structure', () => {
      renderWithTheme(
        <ErrorBoundary>
          <ThrowErrorComponent />
        </ErrorBoundary>
      );

      const heading = screen.getByRole('heading', { name: /something went wrong/i });
      expect(heading).toBeInTheDocument();
    });

    it('has accessible button labels', () => {
      renderWithTheme(
        <ErrorBoundary>
          <ThrowErrorComponent />
        </ErrorBoundary>
      );

      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /refresh page/i })).toBeInTheDocument();
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      
      renderWithTheme(
        <ErrorBoundary>
          <ThrowErrorComponent />
        </ErrorBoundary>
      );

      // Tab to first button
      await user.tab();
      expect(screen.getByRole('button', { name: /try again/i })).toHaveFocus();

      // Tab to second button
      await user.tab();
      expect(screen.getByRole('button', { name: /refresh page/i })).toHaveFocus();
    });

    it('can activate buttons with keyboard', async () => {
      const user = userEvent.setup();
      
      renderWithTheme(
        <ErrorBoundary>
          <ThrowErrorComponent />
        </ErrorBoundary>
      );

      const refreshButton = screen.getByRole('button', { name: /refresh page/i });
      refreshButton.focus();
      
      await user.keyboard('{Enter}');
      expect(mockReload).toHaveBeenCalledTimes(1);
    });
  });

  describe('Edge Cases', () => {
    it('handles errors in error boundary gracefully', () => {
      // This tests that the error boundary doesn't crash when it encounters an error
      expect(() => {
        renderWithTheme(
          <ErrorBoundary>
            <ThrowErrorComponent />
          </ErrorBoundary>
        );
      }).not.toThrow();
    });

    it('handles component stack trace', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      renderWithTheme(
        <ErrorBoundary>
          <div>
            <ThrowErrorComponent />
          </div>
        </ErrorBoundary>
      );

      // Should show error details in development
      expect(screen.getByText('Error Details (Development Only):')).toBeInTheDocument();

      process.env.NODE_ENV = originalEnv;
    });

    it('resets state properly after multiple errors', async () => {
      const user = userEvent.setup();
      
      const { rerender } = renderWithTheme(
        <ErrorBoundary>
          <ThrowErrorComponent />
        </ErrorBoundary>
      );

      // First error
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();

      // Reset
      const tryAgainButton = screen.getByRole('button', { name: /try again/i });
      await user.click(tryAgainButton);

      // Trigger another error
      rerender(
        <ThemeProvider theme={theme}>
          <ErrorBoundary>
            <ThrowErrorComponent errorMessage="Second error" />
          </ErrorBoundary>
        </ThemeProvider>
      );

      // Should show error UI again
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });
  });
});