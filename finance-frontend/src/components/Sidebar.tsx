import React from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Divider,
  Box,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Dashboard,
  AccountBalance,
  Receipt,
  Description,
  Settings,
  TrendingUp,
  CreditCard,
  PieChart,
  ShowChart,
  CreditScore,
  SmartToy,
} from '@mui/icons-material';
import { useLocation, useNavigate } from 'react-router-dom';
import { ROUTE_PATHS } from '../utils/constants';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  variant?: 'permanent' | 'persistent' | 'temporary';
}

const drawerWidth = 240;

const menuItems = [
  {
    text: 'Dashboard',
    icon: <Dashboard />,
    path: ROUTE_PATHS.DASHBOARD,
  },
  {
    text: 'Accounts',
    icon: <AccountBalance />,
    path: '/accounts',
  },
  {
    text: 'Transactions',
    icon: <Receipt />,
    path: ROUTE_PATHS.TRANSACTIONS,
  },
  {
    text: 'Budget',
    icon: <PieChart />,
    path: '/budget',
  },
  {
    text: 'Goals',
    icon: <TrendingUp />,
    path: '/goals',
  },
  {
    text: 'Investments',
    icon: <ShowChart />,
    path: '/investments',
  },
  {
    text: 'Loans',
    icon: <AccountBalance />,
    path: '/loans',
  },
  {
    text: 'Credit Cards',
    icon: <CreditCard />,
    path: '/credit-cards',
  },
  {
    text: 'Credit Health',
    icon: <CreditScore />,
    path: '/credit-health',
  },
  {
    text: 'AI Advisor',
    icon: <SmartToy />,
    path: '/chat',
  },
];

const bottomMenuItems = [
  {
    text: 'Documents',
    icon: <Description />,
    path: ROUTE_PATHS.DOCUMENTS,
  },
  {
    text: 'Settings',
    icon: <Settings />,
    path: ROUTE_PATHS.SETTINGS,
  },
];

const Sidebar: React.FC<SidebarProps> = ({
  open,
  onClose,
  variant = 'temporary',
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const handleMenuItemClick = (path: string) => {
    navigate(path);
    if (isMobile) {
      onClose();
    }
  };

  const isSelected = (path: string) => {
    return location.pathname === path;
  };

  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Toolbar />
      
      <List sx={{ flexGrow: 1 }}>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              selected={isSelected(item.path)}
              onClick={() => handleMenuItemClick(item.path)}
              sx={{
                '&.Mui-selected': {
                  backgroundColor: 'primary.main',
                  color: 'primary.contrastText',
                  '&:hover': {
                    backgroundColor: 'primary.dark',
                  },
                  '& .MuiListItemIcon-root': {
                    color: 'primary.contrastText',
                  },
                },
                '&:hover': {
                  backgroundColor: 'action.hover',
                },
                borderRadius: '0 25px 25px 0',
                marginRight: 1,
                marginY: 0.5,
              }}
            >
              <ListItemIcon
                sx={{
                  color: isSelected(item.path) ? 'inherit' : 'action.active',
                }}
              >
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      <Divider />

      <List>
        {bottomMenuItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              selected={isSelected(item.path)}
              onClick={() => handleMenuItemClick(item.path)}
              sx={{
                '&.Mui-selected': {
                  backgroundColor: 'primary.main',
                  color: 'primary.contrastText',
                  '&:hover': {
                    backgroundColor: 'primary.dark',
                  },
                  '& .MuiListItemIcon-root': {
                    color: 'primary.contrastText',
                  },
                },
                '&:hover': {
                  backgroundColor: 'action.hover',
                },
                borderRadius: '0 25px 25px 0',
                marginRight: 1,
                marginY: 0.5,
              }}
            >
              <ListItemIcon
                sx={{
                  color: isSelected(item.path) ? 'inherit' : 'action.active',
                }}
              >
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );

  if (variant === 'permanent') {
    return (
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
          },
        }}
        open
      >
        {drawerContent}
      </Drawer>
    );
  }

  return (
    <Drawer
      variant={variant}
      open={open}
      onClose={onClose}
      ModalProps={{
        keepMounted: true, // Better open performance on mobile
      }}
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
        },
      }}
    >
      {drawerContent}
    </Drawer>
  );
};

export default Sidebar;