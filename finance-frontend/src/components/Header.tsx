import React, { useState, useEffect } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  Box,
  Divider,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  Menu as MenuIcon,
  AccountCircle,
  Settings,
  ExitToApp,
  Notifications,
} from '@mui/icons-material';
import { Badge } from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { APP_CONSTANTS, ROUTE_PATHS } from '../utils/constants';
import { alertService } from '../services/alert.service';

interface HeaderProps {
  onMenuClick?: () => void;
  showMenuButton?: boolean;
}

const Header: React.FC<HeaderProps> = ({
  onMenuClick,
  showMenuButton = true,
}) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [notificationAnchorEl, setNotificationAnchorEl] = useState<null | HTMLElement>(null);
  const [notificationCount, setNotificationCount] = useState<number>(0);

  // Load unread notification count
  useEffect(() => {
    const loadNotifications = async () => {
      try {
        const response = await alertService.getAlerts({ isRead: false, limit: 100 });
        const alerts = Array.isArray(response.data) ? response.data : [];
        setNotificationCount(alerts.length);
      } catch (error) {
        // Silently fail - notification count will stay at 0
        setNotificationCount(0);
      }
    };
    
    if (user) {
      loadNotifications();
      // Refresh every 60 seconds
      const interval = setInterval(loadNotifications, 60000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleNotificationMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setNotificationAnchorEl(event.currentTarget);
  };

  const handleNotificationMenuClose = () => {
    setNotificationAnchorEl(null);
  };

  const handleProfileClick = () => {
    navigate(ROUTE_PATHS.PROFILE);
    handleMenuClose();
  };

  const handleSettingsClick = () => {
    navigate(ROUTE_PATHS.SETTINGS);
    handleMenuClose();
  };

  const handleLogout = () => {
    logout();
    handleMenuClose();
    navigate(ROUTE_PATHS.LOGIN);
  };

  const getInitials = (name: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
    }
    return name.charAt(0).toUpperCase();
  };

  const isMenuOpen = Boolean(anchorEl);

  return (
    <AppBar
      position="fixed"
      sx={{
        zIndex: (theme) => theme.zIndex.drawer + 1,
        backgroundColor: 'background.paper',
        color: 'text.primary',
        boxShadow: 1,
      }}
    >
      <Toolbar>
        {showMenuButton && (
          <IconButton
            color="inherit"
            aria-label="open drawer"
            onClick={onMenuClick}
            edge="start"
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
        )}

        <Typography
          variant="h6"
          noWrap
          component="div"
          sx={{ 
            flexGrow: 1,
            fontWeight: 'bold',
            color: 'primary.main',
          }}
        >
          {APP_CONSTANTS.APP_NAME}
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {/* Notifications */}
          <IconButton 
            color="inherit"
            onClick={handleNotificationMenuOpen}
            aria-label="notifications"
          >
            <Badge badgeContent={notificationCount} color="error">
              <Notifications />
            </Badge>
          </IconButton>

          {/* Profile Menu */}
          <IconButton
            size="large"
            edge="end"
            aria-label="account of current user"
            aria-controls="primary-search-account-menu"
            aria-haspopup="true"
            onClick={handleProfileMenuOpen}
            color="inherit"
          >
            {user?.avatar ? (
              <Avatar
                src={user.avatar}
                alt={(user as any).name || user.email}
                sx={{ width: 32, height: 32 }}
              />
            ) : (
              <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                {user ? getInitials((user as any).name || user.email || '') : <AccountCircle />}
              </Avatar>
            )}
          </IconButton>
        </Box>

        <Menu
          anchorEl={anchorEl}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
          }}
          keepMounted
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
          open={isMenuOpen}
          onClose={handleMenuClose}
          sx={{ mt: 1 }}
        >
          <Box sx={{ px: 2, py: 1 }}>
            <Typography variant="subtitle1" fontWeight="medium">
              {(user as any)?.name || 'User'}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              {user?.email}
            </Typography>
          </Box>
          
          <Divider />
          
          <MenuItem onClick={handleProfileClick}>
            <ListItemIcon>
              <AccountCircle fontSize="small" />
            </ListItemIcon>
            <ListItemText>Profile</ListItemText>
          </MenuItem>
          
          <MenuItem onClick={handleSettingsClick}>
            <ListItemIcon>
              <Settings fontSize="small" />
            </ListItemIcon>
            <ListItemText>Settings</ListItemText>
          </MenuItem>
          
          <Divider />
          
          <MenuItem onClick={handleLogout}>
            <ListItemIcon>
              <ExitToApp fontSize="small" />
            </ListItemIcon>
            <ListItemText>Sign out</ListItemText>
          </MenuItem>
        </Menu>

        {/* Notification Menu */}
        <Menu
          anchorEl={notificationAnchorEl}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
          }}
          keepMounted
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
          open={Boolean(notificationAnchorEl)}
          onClose={handleNotificationMenuClose}
          sx={{ mt: 1 }}
        >
          <Box sx={{ px: 2, py: 1, minWidth: 300 }}>
            <Typography variant="h6" fontWeight="medium">
              Notifications
            </Typography>
          </Box>
          
          <Divider />
          
          <MenuItem onClick={handleNotificationMenuClose}>
            <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
              <Typography variant="body2" fontWeight="medium">
                Budget Alert: Groceries
              </Typography>
              <Typography variant="caption" color="textSecondary">
                You've spent 85% of your monthly groceries budget
              </Typography>
              <Typography variant="caption" color="textSecondary" sx={{ mt: 0.5 }}>
                2 hours ago
              </Typography>
            </Box>
          </MenuItem>

          <MenuItem onClick={handleNotificationMenuClose}>
            <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
              <Typography variant="body2" fontWeight="medium">
                Payment Due: Credit Card
              </Typography>
              <Typography variant="caption" color="textSecondary">
                Your Chase Sapphire payment is due in 3 days
              </Typography>
              <Typography variant="caption" color="textSecondary" sx={{ mt: 0.5 }}>
                1 day ago
              </Typography>
            </Box>
          </MenuItem>

          <MenuItem onClick={handleNotificationMenuClose}>
            <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
              <Typography variant="body2" fontWeight="medium">
                Goal Achievement
              </Typography>
              <Typography variant="caption" color="textSecondary">
                You've reached 100% of your Emergency Fund goal! 🎉
              </Typography>
              <Typography variant="caption" color="textSecondary" sx={{ mt: 0.5 }}>
                2 days ago
              </Typography>
            </Box>
          </MenuItem>
          
          <Divider />
          
          <MenuItem onClick={handleNotificationMenuClose} sx={{ justifyContent: 'center' }}>
            <Typography variant="body2" color="primary">
              View All Notifications
            </Typography>
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
};

export default Header;