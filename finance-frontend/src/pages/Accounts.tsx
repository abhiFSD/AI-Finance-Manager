import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  FormControl,
  InputLabel,
  Chip,
  Fab,
  Paper,
  Divider,
  Alert,
  Avatar,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  Add,
  MoreVert,
  Edit,
  Delete,
  Visibility,
  VisibilityOff,
  TrendingUp,
  TrendingDown,
  SwapHoriz,
  Download,
  AccountBalance,
  CreditCard,
  Savings,
  Assessment,
  AttachMoney,
  Search,
  FilterList,
  Refresh,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Account, AccountType, Transaction, AccountFormData } from '../types';
import { accountService, AccountFilters } from '../services/account.service';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatDate, formatAccountType } from '../utils/formatters';
import { APP_CONSTANTS } from '../utils/constants';
import LoadingSpinner from '../components/LoadingSpinner';

interface TransferFormData {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  description: string;
}

const ACCOUNT_TYPE_ICONS = {
  checking: <AccountBalance />,
  savings: <Savings />,
  credit: <CreditCard />,
  investment: <Assessment />,
  cash: <AttachMoney />,
};

const ACCOUNT_TYPE_COLORS = {
  checking: APP_CONSTANTS.COLORS.CHECKING,
  savings: APP_CONSTANTS.COLORS.SAVINGS,
  credit: APP_CONSTANTS.COLORS.CREDIT,
  investment: APP_CONSTANTS.COLORS.INVESTMENT,
  cash: APP_CONSTANTS.COLORS.CASH,
};

const Accounts: React.FC = () => {
  const { isLoading, setLoading, setError } = useApp();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [filteredAccounts, setFilteredAccounts] = useState<Account[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<AccountFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [accountStats, setAccountStats] = useState<any>(null);
  const [balanceHistory, setBalanceHistory] = useState<any[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  
  // Modal states
  const [formOpen, setFormOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  
  // Form data
  const [formData, setFormData] = useState<AccountFormData & { institution?: string }>({
    name: '',
    type: 'checking',
    balance: 0,
    currency: 'USD',
    institution: '',
  });
  
  const [transferData, setTransferData] = useState<TransferFormData>({
    fromAccountId: '',
    toAccountId: '',
    amount: 0,
    description: '',
  });
  
  const [hideBalances, setHideBalances] = useState(false);

  useEffect(() => {
    loadAccounts();
  }, [filters]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    filterAccounts();
  }, [accounts, searchTerm, filters]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadAccounts = async () => {
    try {
      setLoading(true);
      const response = await accountService.getAccounts(filters);
      // Handle various response formats: { success, data: { accounts: [] } } or { data: [] } etc.
      const resData: any = response.data;
      if (resData) {
        if (Array.isArray(resData)) {
          setAccounts(resData);
        } else if (resData.data?.accounts && Array.isArray(resData.data.accounts)) {
          setAccounts(resData.data.accounts);
        } else if (resData.accounts && Array.isArray(resData.accounts)) {
          setAccounts(resData.accounts);
        } else if (resData.data && Array.isArray(resData.data)) {
          setAccounts(resData.data);
        } else {
          setAccounts([]);
        }
      } else {
        setAccounts([]);
      }
    } catch (error) {
      setError('Failed to load accounts');
      console.error('Error loading accounts:', error);
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  };

  const filterAccounts = () => {
    let filtered = [...accounts];
    
    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(account =>
        account.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        account.type.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Filter by type
    if (filters.type) {
      filtered = filtered.filter(account => account.type === filters.type);
    }
    
    // Filter by active status
    if (filters.isActive !== undefined) {
      filtered = filtered.filter(account => account.isActive === filters.isActive);
    }
    
    setFilteredAccounts(filtered);
  };

  const loadAccountDetails = async (account: Account) => {
    try {
      setLoading(true);
      const [statsResponse, historyResponse, transactionsResponse] = await Promise.all([
        accountService.getAccountStats(account.id),
        accountService.getBalanceHistory(account.id),
        accountService.getAccountTransactions(account.id, 1, 5),
      ]);
      
      setAccountStats(statsResponse.data);
      setBalanceHistory(historyResponse.data);
      setRecentTransactions(transactionsResponse.data.data);
    } catch (error) {
      setError('Failed to load account details');
      console.error('Error loading account details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, account: Account) => {
    event.stopPropagation();
    setSelectedAccount(account);
    setMenuAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
  };

  const handleAccountClick = (account: Account) => {
    setSelectedAccount(account);
    loadAccountDetails(account);
    setDetailsOpen(true);
  };

  const handleEdit = () => {
    if (selectedAccount) {
      setFormData({
        name: selectedAccount.name,
        type: selectedAccount.type,
        balance: selectedAccount.balance,
        currency: selectedAccount.currency,
        institution: (selectedAccount as any).institution || '',
      });
      setFormOpen(true);
    }
    handleMenuClose();
  };

  const handleDelete = () => {
    setDeleteDialogOpen(true);
    handleMenuClose();
  };

  const handleExport = async () => {
    if (selectedAccount) {
      try {
        const blob = await accountService.exportAccountData(selectedAccount.id);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `${selectedAccount.name}-data-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
      } catch (error) {
        setError('Failed to export account data');
        console.error('Error exporting account data:', error);
      }
    }
    handleMenuClose();
  };

  const confirmDelete = async () => {
    if (selectedAccount) {
      try {
        await accountService.deleteAccount(selectedAccount.id);
        loadAccounts();
        setDeleteDialogOpen(false);
        setSelectedAccount(null);
      } catch (error) {
        setError('Failed to delete account');
        console.error('Error deleting account:', error);
      }
    }
  };

  const handleFormSubmit = async () => {
    try {
      // Map frontend type values to backend enum values
      const typeMapping: Record<string, string> = {
        'checking': 'CHECKING',
        'savings': 'SAVINGS',
        'credit': 'CREDIT_CARD',
        'investment': 'INVESTMENT',
        'cash': 'OTHER'
      };
      
      const accountData = {
        name: formData.name,
        type: typeMapping[formData.type] || formData.type.toUpperCase(),
        balance: formData.balance,
        currency: formData.currency,
        institution: formData.institution || 'N/A', // Backend requires institution
      };
      
      if (selectedAccount) {
        await accountService.updateAccount(selectedAccount.id, accountData as any);
      } else {
        await accountService.createAccount(accountData as any);
      }
      
      loadAccounts();
      setFormOpen(false);
      resetForm();
    } catch (error) {
      setError('Failed to save account');
      console.error('Error saving account:', error);
    }
  };

  const handleTransfer = async () => {
    try {
      await accountService.transferMoney(transferData);
      loadAccounts();
      setTransferOpen(false);
      resetTransferForm();
    } catch (error) {
      setError('Failed to transfer money');
      console.error('Error transferring money:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'checking',
      balance: 0,
      currency: 'USD',
      institution: '',
    });
    setSelectedAccount(null);
  };

  const resetTransferForm = () => {
    setTransferData({
      fromAccountId: '',
      toAccountId: '',
      amount: 0,
      description: '',
    });
  };

  const clearFilters = () => {
    setFilters({});
    setSearchTerm('');
  };

  const getTotalBalance = () => {
    return accounts.reduce((sum, account) => sum + account.balance, 0);
  };

  const getAccountsByType = () => {
    return accounts.reduce((acc, account) => {
      acc[account.type] = (acc[account.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  };

  const accountTypeData = Object.entries(getAccountsByType()).map(([type, count], index) => ({
    name: formatAccountType(type),
    value: count,
    color: ACCOUNT_TYPE_COLORS[type as AccountType] || APP_CONSTANTS.CHART_COLORS[index],
  }));

  if (isLoading && accounts.length === 0) {
    return <LoadingSpinner message="Loading accounts..." />;
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          Accounts
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<SwapHoriz />}
            onClick={() => setTransferOpen(true)}
            disabled={accounts.length < 2}
          >
            Transfer
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setFormOpen(true)}
          >
            Add Account
          </Button>
        </Box>
      </Box>

      {/* Summary Cards */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 3 }}>
        <Box sx={{ flexGrow: 1, flexBasis: { xs: '100%', sm: 'calc(50% - 12px)', lg: 'calc(33.333% - 16px)' } }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body2" color="textSecondary">
                    Total Balance
                  </Typography>
                  <Typography variant="h5" fontWeight="bold">
                    {hideBalances ? '••••••' : formatCurrency(getTotalBalance())}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <IconButton onClick={() => setHideBalances(!hideBalances)} size="small">
                    {hideBalances ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                  <AccountBalance sx={{ color: 'primary.main', fontSize: 40 }} />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>
        
        <Box sx={{ flexGrow: 1, flexBasis: { xs: '100%', sm: 'calc(50% - 12px)', lg: 'calc(33.333% - 16px)' } }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body2" color="textSecondary">
                    Active Accounts
                  </Typography>
                  <Typography variant="h5" fontWeight="bold">
                    {accounts.filter(acc => acc.isActive).length}
                  </Typography>
                </Box>
                <Assessment sx={{ color: 'success.main', fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Box>
        
        <Box sx={{ flexGrow: 1, flexBasis: { xs: '100%', sm: '100%', lg: 'calc(33.333% - 16px)' } }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Account Types
              </Typography>
              <ResponsiveContainer width="100%" height={120}>
                <PieChart>
                  <Pie
                    data={accountTypeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={30}
                    outerRadius={50}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {accountTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Search & Filters
            </Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="text"
                onClick={() => setShowFilters(!showFilters)}
                startIcon={<FilterList />}
              >
                {showFilters ? 'Hide Filters' : 'Show Filters'}
              </Button>
              <IconButton onClick={loadAccounts}>
                <Refresh />
              </IconButton>
            </Box>
          </Box>
          
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ flexGrow: 1, flexBasis: { xs: '100%', md: 'calc(50% - 8px)' } }}>
              <TextField
                fullWidth
                label="Search accounts"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: <Search sx={{ mr: 1, color: 'action.active' }} />,
                }}
              />
            </Box>
            
            {showFilters && (
              <>
                <Box sx={{ flexGrow: 1, flexBasis: { xs: '100%', md: 'calc(25% - 8px)' } }}>
                  <FormControl fullWidth>
                    <InputLabel>Account Type</InputLabel>
                    <Select
                      value={filters.type || ''}
                      onChange={(e) => setFilters({ ...filters, type: e.target.value as AccountType })}
                      label="Account Type"
                    >
                      <MenuItem value="">All Types</MenuItem>
                      <MenuItem value="checking">Checking</MenuItem>
                      <MenuItem value="savings">Savings</MenuItem>
                      <MenuItem value="credit">Credit Card</MenuItem>
                      <MenuItem value="investment">Investment</MenuItem>
                      <MenuItem value="cash">Cash</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
                
                <Box sx={{ flexGrow: 1, flexBasis: { xs: '100%', md: 'calc(25% - 8px)' } }}>
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={clearFilters}
                    sx={{ height: '56px' }}
                  >
                    Clear Filters
                  </Button>
                </Box>
              </>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Accounts Grid */}
      {filteredAccounts.length > 0 ? (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
          {filteredAccounts.map((account) => (
            <Box key={account.id} sx={{ flexGrow: 1, flexBasis: { xs: '100%', sm: 'calc(50% - 12px)', lg: 'calc(33.333% - 16px)' } }}>
              <Card 
                sx={{ 
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  '&:hover': {
                    boxShadow: 4,
                    transform: 'translateY(-2px)',
                  },
                }}
                onClick={() => handleAccountClick(account)}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar sx={{ bgcolor: ACCOUNT_TYPE_COLORS[account.type], width: 48, height: 48 }}>
                        {ACCOUNT_TYPE_ICONS[account.type]}
                      </Avatar>
                      <Box>
                        <Typography variant="h6" fontWeight="bold">
                          {account.name}
                        </Typography>
                        <Chip
                          size="small"
                          label={formatAccountType(account.type)}
                          color="primary"
                          variant="outlined"
                        />
                      </Box>
                    </Box>
                    <IconButton
                      onClick={(e) => handleMenuOpen(e, account)}
                      size="small"
                    >
                      <MoreVert />
                    </IconButton>
                  </Box>
                  
                  <Divider sx={{ my: 2 }} />
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography variant="body2" color="textSecondary">
                        Balance
                      </Typography>
                      <Typography 
                        variant="h5" 
                        fontWeight="bold"
                        color={account.balance >= 0 ? 'success.main' : 'error.main'}
                      >
                        {hideBalances ? '••••••' : formatCurrency(account.balance, account.currency)}
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography variant="body2" color="textSecondary">
                        Status
                      </Typography>
                      <Chip
                        size="small"
                        label={account.isActive ? 'Active' : 'Inactive'}
                        color={account.isActive ? 'success' : 'default'}
                        variant={account.isActive ? 'filled' : 'outlined'}
                      />
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Box>
          ))}
        </Box>
      ) : (
        <Paper sx={{ p: 6, textAlign: 'center' }}>
          <AccountBalance sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="textSecondary" gutterBottom>
            No accounts found
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
            {searchTerm || Object.keys(filters).length > 0
              ? 'Try adjusting your search or filters'
              : 'Get started by creating your first account'}
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setFormOpen(true)}
          >
            Add Account
          </Button>
        </Paper>
      )}

      {/* Action Menu */}
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleEdit}>
          <ListItemIcon>
            <Edit fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleExport}>
          <ListItemIcon>
            <Download fontSize="small" />
          </ListItemIcon>
          <ListItemText>Export Data</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
          <ListItemIcon>
            <Delete fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>

      {/* Account Details Dialog */}
      <Dialog
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {selectedAccount && ACCOUNT_TYPE_ICONS[selectedAccount.type]}
            <Box>
              <Typography variant="h6">
                {selectedAccount?.name}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {selectedAccount && formatAccountType(selectedAccount.type)}
              </Typography>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedAccount && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
              <Box sx={{ flexGrow: 1, flexBasis: { xs: '100%', md: 'calc(50% - 12px)' } }}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Account Summary
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography>Current Balance:</Typography>
                        <Typography fontWeight="bold" color={selectedAccount.balance >= 0 ? 'success.main' : 'error.main'}>
                          {formatCurrency(selectedAccount.balance, selectedAccount.currency)}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography>Currency:</Typography>
                        <Typography>{selectedAccount.currency}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography>Status:</Typography>
                        <Chip
                          size="small"
                          label={selectedAccount.isActive ? 'Active' : 'Inactive'}
                          color={selectedAccount.isActive ? 'success' : 'default'}
                        />
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography>Created:</Typography>
                        <Typography>{formatDate(selectedAccount.createdAt)}</Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Box>
              
              <Box sx={{ flexGrow: 1, flexBasis: { xs: '100%', md: 'calc(50% - 12px)' } }}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Balance Trend
                    </Typography>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={balanceHistory}>
                        <XAxis dataKey="date" />
                        <YAxis />
                        <RechartsTooltip 
                          formatter={(value: any) => [formatCurrency(value), 'Balance']}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="balance" 
                          stroke={APP_CONSTANTS.COLORS.PRIMARY} 
                          strokeWidth={2}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </Box>
              
              <Box sx={{ flexGrow: 1, flexBasis: '100%' }}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Recent Transactions
                    </Typography>
                    {recentTransactions.length > 0 ? (
                      <Box>
                        {recentTransactions.map((transaction) => (
                          <Box
                            key={transaction.id}
                            sx={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              py: 1,
                              borderBottom: '1px solid',
                              borderColor: 'divider',
                              '&:last-child': { borderBottom: 'none' },
                            }}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                              <Avatar sx={{ 
                                bgcolor: transaction.type === 'income' ? 'success.light' : 'error.light',
                                width: 32,
                                height: 32,
                              }}>
                                {transaction.type === 'income' ? (
                                  <TrendingUp sx={{ color: 'success.dark', fontSize: 20 }} />
                                ) : (
                                  <TrendingDown sx={{ color: 'error.dark', fontSize: 20 }} />
                                )}
                              </Avatar>
                              <Box>
                                <Typography variant="body2" fontWeight="medium">
                                  {transaction.description}
                                </Typography>
                                <Typography variant="caption" color="textSecondary">
                                  {typeof transaction.category === 'object' ? (transaction.category as any)?.name : transaction.category} • {formatDate(transaction.date)}
                                </Typography>
                              </Box>
                            </Box>
                            <Typography
                              variant="body2"
                              fontWeight="bold"
                              color={transaction.type === 'income' ? 'success.main' : 'error.main'}
                            >
                              {formatCurrency(
                                transaction.type === 'income' ? transaction.amount : -transaction.amount,
                                'USD',
                                true
                              )}
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                    ) : (
                      <Typography variant="body2" color="textSecondary" textAlign="center" py={2}>
                        No recent transactions
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add/Edit Account Form Dialog */}
      <Dialog 
        open={formOpen} 
        onClose={() => setFormOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {selectedAccount ? 'Edit Account' : 'Add New Account'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              fullWidth
              label="Account Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            
            <FormControl fullWidth required>
              <InputLabel>Account Type</InputLabel>
              <Select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as AccountType })}
                label="Account Type"
              >
                <MenuItem value="checking">Checking</MenuItem>
                <MenuItem value="savings">Savings</MenuItem>
                <MenuItem value="credit">Credit Card</MenuItem>
                <MenuItem value="investment">Investment</MenuItem>
                <MenuItem value="cash">Cash</MenuItem>
              </Select>
            </FormControl>
            
            <TextField
              fullWidth
              label="Institution / Bank Name"
              value={formData.institution}
              onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
              placeholder="e.g., Chase, Bank of America"
              required
            />
            
            <TextField
              fullWidth
              label="Initial Balance"
              type="number"
              value={formData.balance}
              onChange={(e) => setFormData({ ...formData, balance: parseFloat(e.target.value) || 0 })}
              inputProps={{ step: 0.01 }}
              required
            />
            
            <FormControl fullWidth required>
              <InputLabel>Currency</InputLabel>
              <Select
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                label="Currency"
              >
                {APP_CONSTANTS.SUPPORTED_CURRENCIES.map((currency) => (
                  <MenuItem key={currency} value={currency}>
                    {currency}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFormOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleFormSubmit} 
            variant="contained"
            disabled={!formData.name || !formData.institution || formData.balance === undefined}
          >
            {selectedAccount ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Transfer Money Dialog */}
      <Dialog 
        open={transferOpen} 
        onClose={() => setTransferOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Transfer Money
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>From Account</InputLabel>
              <Select
                value={transferData.fromAccountId}
                onChange={(e) => setTransferData({ ...transferData, fromAccountId: e.target.value })}
                label="From Account"
              >
                {accounts.filter(acc => acc.isActive).map((account) => (
                  <MenuItem key={account.id} value={account.id}>
                    {account.name} ({formatCurrency(account.balance, account.currency)})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <FormControl fullWidth>
              <InputLabel>To Account</InputLabel>
              <Select
                value={transferData.toAccountId}
                onChange={(e) => setTransferData({ ...transferData, toAccountId: e.target.value })}
                label="To Account"
              >
                {accounts
                  .filter(acc => acc.isActive && acc.id !== transferData.fromAccountId)
                  .map((account) => (
                    <MenuItem key={account.id} value={account.id}>
                      {account.name} ({formatCurrency(account.balance, account.currency)})
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
            
            <TextField
              fullWidth
              label="Amount"
              type="number"
              value={transferData.amount}
              onChange={(e) => setTransferData({ ...transferData, amount: parseFloat(e.target.value) || 0 })}
              inputProps={{ step: 0.01, min: 0 }}
            />
            
            <TextField
              fullWidth
              label="Description (Optional)"
              value={transferData.description}
              onChange={(e) => setTransferData({ ...transferData, description: e.target.value })}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTransferOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleTransfer} 
            variant="contained"
            disabled={!transferData.fromAccountId || !transferData.toAccountId || transferData.amount <= 0}
          >
            Transfer
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Account</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            This action cannot be undone. All transactions associated with this account will also be deleted.
          </Alert>
          <Typography>
            Are you sure you want to delete "<strong>{selectedAccount?.name}</strong>"?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={confirmDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Floating Action Button */}
      <Fab
        color="primary"
        aria-label="add account"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        onClick={() => setFormOpen(true)}
      >
        <Add />
      </Fab>
    </Box>
  );
};

export default Accounts;