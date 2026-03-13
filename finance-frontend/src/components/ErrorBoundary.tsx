import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Box, Typography, Button, Card, CardContent } from '@mui/material';
import { ErrorOutline, Refresh } from '@mui/icons-material';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  private handleRefresh = () => {
    window.location.reload();
  };

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '50vh',
            padding: 3,
          }}
        >
          <Card sx={{ maxWidth: 600, width: '100%' }}>
            <CardContent sx={{ textAlign: 'center', py: 4 }}>
              <ErrorOutline
                color="error"
                sx={{ fontSize: 64, mb: 2 }}
              />
              <Typography variant="h5" color="error" gutterBottom>
                Something went wrong
              </Typography>
              <Typography variant="body1" color="textSecondary" paragraph>
                We're sorry, but an unexpected error occurred. Please try refreshing the page or contact support if the problem persists.
              </Typography>
              
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <Box sx={{ mt: 3, mb: 3 }}>
                  <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                    Error Details (Development Only):
                  </Typography>
                  <Box
                    component="pre"
                    sx={{
                      backgroundColor: '#f5f5f5',
                      padding: 2,
                      borderRadius: 1,
                      overflow: 'auto',
                      textAlign: 'left',
                      fontSize: '0.875rem',
                      fontFamily: 'monospace',
                    }}
                  >
                    {this.state.error.toString()}
                    {this.state.errorInfo?.componentStack}
                  </Box>
                </Box>
              )}

              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mt: 3 }}>
                <Button
                  variant="outlined"
                  onClick={this.handleReset}
                  startIcon={<Refresh />}
                >
                  Try Again
                </Button>
                <Button
                  variant="contained"
                  onClick={this.handleRefresh}
                  startIcon={<Refresh />}
                >
                  Refresh Page
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;