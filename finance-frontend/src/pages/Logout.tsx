import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useAuth } from '../context/AuthContext';

const Logout: React.FC = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Perform logout
    logout();
    
    // Redirect to login page after a short delay
    setTimeout(() => {
      navigate('/login');
    }, 1000);
  }, [logout, navigate]);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        gap: 2,
      }}
    >
      <CircularProgress />
      <Typography variant="h6">Logging out...</Typography>
    </Box>
  );
};

export default Logout;