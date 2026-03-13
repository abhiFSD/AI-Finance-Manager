import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline, Box, useMediaQuery } from '@mui/material';
import { AuthProvider } from './context/AuthContext';
import { AppProvider } from './context/AppContext';
import ErrorBoundary from './components/ErrorBoundary';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import ProtectedRoute from './components/ProtectedRoute';
// ChatWidget removed - using sidebar navigation only

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Accounts from './pages/Accounts';
import Documents from './pages/Documents';
import DocumentReview from './pages/DocumentReview';
import Settings from './pages/Settings';
import BudgetPage from './pages/Budget';
import Goals from './pages/Goals';
import CreditCards from './pages/CreditCards';
import Investments from './pages/Investments';
import Loans from './pages/Loans';
import CreditHealth from './pages/CreditHealth';
import Chat from './pages/Chat';
import Logout from './pages/Logout';

// Utils
import { ROUTE_PATHS, APP_CONSTANTS } from './utils/constants';

const App: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');

  // Create theme
  const theme = createTheme({
    palette: {
      mode: 'light', // You can make this dynamic based on user preferences
      primary: {
        main: APP_CONSTANTS.COLORS.PRIMARY,
      },
      secondary: {
        main: APP_CONSTANTS.COLORS.SECONDARY,
      },
      success: {
        main: APP_CONSTANTS.COLORS.SUCCESS,
      },
      error: {
        main: APP_CONSTANTS.COLORS.ERROR,
      },
      warning: {
        main: APP_CONSTANTS.COLORS.WARNING,
      },
      info: {
        main: APP_CONSTANTS.COLORS.INFO,
      },
    },
    typography: {
      fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
      h1: {
        fontWeight: 700,
      },
      h2: {
        fontWeight: 700,
      },
      h3: {
        fontWeight: 600,
      },
      h4: {
        fontWeight: 600,
      },
      h5: {
        fontWeight: 600,
      },
      h6: {
        fontWeight: 600,
      },
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            borderRadius: 8,
            fontWeight: 600,
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: 8,
            },
          },
        },
      },
      MuiSelect: {
        styleOverrides: {
          root: {
            borderRadius: 8,
          },
        },
      },
    },
  });

  const handleSidebarToggle = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleSidebarClose = () => {
    setSidebarOpen(false);
  };

  // Layout component for authenticated routes
  const AuthenticatedLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const isDesktop = useMediaQuery(theme.breakpoints.up('md'));

    return (
      <Box sx={{ display: 'flex', minHeight: '100vh' }}>
        <Header onMenuClick={handleSidebarToggle} />
        
        <Sidebar
          open={isDesktop ? true : sidebarOpen}
          onClose={handleSidebarClose}
          variant={isDesktop ? 'permanent' : 'temporary'}
        />
        
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            backgroundColor: 'background.default',
            mt: 8, // Account for header height
            ml: isDesktop ? 0 : 0, // Sidebar width is handled by the Sidebar component
          }}
        >
          {children}
        </Box>
        
        {/* AI Chat Widget - appears on all authenticated pages */}
        {/* ChatWidget removed - using sidebar AI Advisor navigation */}
      </Box>
    );
  };

  return (
    <ErrorBoundary>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Router>
          <AuthProvider>
            <AppProvider>
              <Routes>
                {/* Public Routes */}
                <Route 
                  path={ROUTE_PATHS.LOGIN} 
                  element={
                    <ProtectedRoute requireAuth={false}>
                      <Login />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path={ROUTE_PATHS.REGISTER} 
                  element={
                    <ProtectedRoute requireAuth={false}>
                      <Register />
                    </ProtectedRoute>
                  } 
                />
                
                {/* Logout Route - accessible without authentication check */}
                <Route 
                  path="/logout" 
                  element={<Logout />} 
                />

                {/* Protected Routes */}
                <Route 
                  path={ROUTE_PATHS.DASHBOARD} 
                  element={
                    <ProtectedRoute>
                      <AuthenticatedLayout>
                        <Dashboard />
                      </AuthenticatedLayout>
                    </ProtectedRoute>
                  } 
                />
                
                <Route 
                  path={ROUTE_PATHS.TRANSACTIONS} 
                  element={
                    <ProtectedRoute>
                      <AuthenticatedLayout>
                        <Transactions />
                      </AuthenticatedLayout>
                    </ProtectedRoute>
                  } 
                />
                
                <Route 
                  path={ROUTE_PATHS.DOCUMENTS} 
                  element={
                    <ProtectedRoute>
                      <AuthenticatedLayout>
                        <Documents />
                      </AuthenticatedLayout>
                    </ProtectedRoute>
                  } 
                />
                
                <Route 
                  path="/documents/:documentId/review" 
                  element={
                    <ProtectedRoute>
                      <AuthenticatedLayout>
                        <DocumentReview />
                      </AuthenticatedLayout>
                    </ProtectedRoute>
                  } 
                />
                
                <Route 
                  path={ROUTE_PATHS.SETTINGS} 
                  element={
                    <ProtectedRoute>
                      <AuthenticatedLayout>
                        <Settings />
                      </AuthenticatedLayout>
                    </ProtectedRoute>
                  } 
                />

                {/* Additional protected routes */}
                <Route 
                  path="/accounts" 
                  element={
                    <ProtectedRoute>
                      <AuthenticatedLayout>
                        <Accounts />
                      </AuthenticatedLayout>
                    </ProtectedRoute>
                  } 
                />
                
                <Route 
                  path="/budget" 
                  element={
                    <ProtectedRoute>
                      <AuthenticatedLayout>
                        <BudgetPage />
                      </AuthenticatedLayout>
                    </ProtectedRoute>
                  } 
                />
                
                <Route 
                  path="/goals" 
                  element={
                    <ProtectedRoute>
                      <AuthenticatedLayout>
                        <Goals />
                      </AuthenticatedLayout>
                    </ProtectedRoute>
                  } 
                />
                
                <Route 
                  path="/credit-cards" 
                  element={
                    <ProtectedRoute>
                      <AuthenticatedLayout>
                        <CreditCards />
                      </AuthenticatedLayout>
                    </ProtectedRoute>
                  } 
                />

                <Route 
                  path="/investments" 
                  element={
                    <ProtectedRoute>
                      <AuthenticatedLayout>
                        <Investments />
                      </AuthenticatedLayout>
                    </ProtectedRoute>
                  } 
                />

                <Route 
                  path="/loans" 
                  element={
                    <ProtectedRoute>
                      <AuthenticatedLayout>
                        <Loans />
                      </AuthenticatedLayout>
                    </ProtectedRoute>
                  } 
                />

                <Route 
                  path="/credit-health" 
                  element={
                    <ProtectedRoute>
                      <AuthenticatedLayout>
                        <CreditHealth />
                      </AuthenticatedLayout>
                    </ProtectedRoute>
                  } 
                />

                <Route 
                  path={ROUTE_PATHS.CHAT} 
                  element={
                    <ProtectedRoute>
                      <AuthenticatedLayout>
                        <Chat />
                      </AuthenticatedLayout>
                    </ProtectedRoute>
                  } 
                />

                <Route 
                  path={ROUTE_PATHS.PROFILE} 
                  element={
                    <ProtectedRoute>
                      <AuthenticatedLayout>
                        <Settings />
                      </AuthenticatedLayout>
                    </ProtectedRoute>
                  } 
                />

                {/* Default redirect */}
                <Route 
                  path={ROUTE_PATHS.HOME} 
                  element={<Navigate to={ROUTE_PATHS.DASHBOARD} replace />} 
                />

                {/* Catch all - redirect to dashboard */}
                <Route 
                  path="*" 
                  element={<Navigate to={ROUTE_PATHS.DASHBOARD} replace />} 
                />
              </Routes>
            </AppProvider>
          </AuthProvider>
        </Router>
      </ThemeProvider>
    </ErrorBoundary>
  );
};

export default App;