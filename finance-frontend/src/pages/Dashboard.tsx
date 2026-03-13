import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  InputAdornment,
} from '@mui/material';
// Grid removed - using Box with flexbox instead
import {
  TrendingUp,
  TrendingDown,
  AccountBalance,
  Receipt,
  Add,
  Refresh,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useApp } from '../context/AppContext';
import { transactionService } from '../services/transaction.service';
import { accountService } from '../services/account.service';
import { netWorthService, NetWorthData } from '../services/net-worth.service';
import { insightService, Insight } from '../services/insight.service';
import { alertService, Alert as AlertType } from '../services/alert.service';
import { Transaction } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';
import { APP_CONSTANTS } from '../utils/constants';
import LoadingSpinner from '../components/LoadingSpinner';

interface DashboardStats {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  netIncome: number;
}

interface ChartData {
  name: string;
  value: number;
  color: string;
}

interface TrendData {
  date: string;
  income: number;
  expenses: number;
  balance: number;
}

interface TransactionFormData {
  accountId: string;
  amount: number;
  type: 'income' | 'expense' | 'transfer';
  category: string;
  description: string;
  date: Date;
}

const Dashboard: React.FC = () => {
  const { accounts, selectedAccount, setSelectedAccount, isLoading, setLoading, categories, setAccounts } = useApp();
  const [stats, setStats] = useState<DashboardStats>({
    totalBalance: 0,
    monthlyIncome: 0,
    monthlyExpenses: 0,
    netIncome: 0,
  });
  const [categoryData, setCategoryData] = useState<ChartData[]>([]);
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [timeRange, setTimeRange] = useState<'7days' | '30days' | '90days' | '1year'>('30days');
  const [netWorth, setNetWorth] = useState<NetWorthData | null>(null);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [alerts, setAlerts] = useState<AlertType[]>([]);
  const [transactionFormOpen, setTransactionFormOpen] = useState(false);
  const [transactionFormData, setTransactionFormData] = useState<TransactionFormData>({
    accountId: '',
    amount: 0,
    type: 'expense',
    category: '',
    description: '',
    date: new Date(),
  });

  // Load accounts on mount
  useEffect(() => {
    const loadAccounts = async () => {
      try {
        const response = await accountService.getAccounts();
        if (response.success && response.data) {
          // API returns { accounts: [...], pagination } — extract the array
          const accountsData = Array.isArray(response.data) 
            ? response.data 
            : (response.data as any).accounts || [];
          setAccounts(accountsData);
        }
      } catch (error) {
        console.error('Failed to load accounts:', error);
      }
    };
    
    loadAccounts();
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [selectedAccount, timeRange, accounts]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      const endDate = new Date();
      const startDate = new Date();
      
      switch (timeRange) {
        case '7days':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case '30days':
          startDate.setDate(endDate.getDate() - 30);
          break;
        case '90days':
          startDate.setDate(endDate.getDate() - 90);
          break;
        case '1year':
          startDate.setFullYear(endDate.getFullYear() - 1);
          break;
      }

      const [
        statsResponse,
        categoryResponse,
        trendsResponse,
        transactionsResponse,
        netWorthResponse,
        insightsResponse,
        alertsResponse,
      ] = await Promise.all([
        transactionService.getTransactionStats(
          selectedAccount?.id,
          startDate.toISOString().split('T')[0],
          endDate.toISOString().split('T')[0]
        ),
        transactionService.getTransactionsByCategory(
          selectedAccount?.id,
          startDate.toISOString().split('T')[0],
          endDate.toISOString().split('T')[0]
        ),
        transactionService.getTransactionTrends(
          selectedAccount?.id,
          timeRange === '7days' ? 'daily' : 'monthly',
          startDate.toISOString().split('T')[0],
          endDate.toISOString().split('T')[0]
        ),
        transactionService.getTransactions(1, 5, {
          accountId: selectedAccount?.id,
        }),
        netWorthService.getNetWorth().catch(() => ({ data: null })),
        insightService.getInsights({ limit: 5 }).catch(() => ({ data: [] })),
        alertService.getAlerts({ isRead: false, limit: 5 }).catch(() => ({ data: [] })),
      ]);

      // Calculate stats
      const totalBalance = accounts.reduce((sum, account) => sum + account.balance, 0);
      const monthlyIncome = statsResponse.data.totalIncome;
      const monthlyExpenses = Math.abs(statsResponse.data.totalExpenses); // Ensure positive
      const netIncome = monthlyIncome - monthlyExpenses; // Correct calculation: Income - Expenses
      
      setStats({
        totalBalance,
        monthlyIncome,
        monthlyExpenses,
        netIncome,
      });

      // Prepare category chart data - filter out income categories
      const incomeCategories = ['Salary', 'Freelance', 'Investment', 'Gift', 'Refund', 'Other Income'];
      const categoryChartData = categoryResponse.data
        .filter((item) => !incomeCategories.includes(item.category))
        .map((item, index) => ({
          name: item.category,
          value: Math.abs(item.amount),
          color: APP_CONSTANTS.CHART_COLORS[index % APP_CONSTANTS.CHART_COLORS.length],
        }));
      setCategoryData(categoryChartData);

      // Prepare trend data
      const trendChartData = trendsResponse.data.map((item) => ({
        date: formatDate(item.date, 'short'),
        income: item.income,
        expenses: Math.abs(item.expenses),
        balance: totalBalance, // This would be calculated based on historical data
      }));
      setTrendData(trendChartData);

      setRecentTransactions(transactionsResponse.data.data);
      
      // Set new data
      setNetWorth(netWorthResponse.data as NetWorthData);
      setInsights(Array.isArray(insightsResponse.data) ? insightsResponse.data : []);
      setAlerts(Array.isArray(alertsResponse.data) ? alertsResponse.data : []);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    loadDashboardData();
  };

  const handleAccountChange = (accountId: string) => {
    const account = accounts.find(acc => acc.id === accountId) || null;
    setSelectedAccount(account);
  };

  const handleAddTransactionClick = () => {
    setTransactionFormOpen(true);
  };

  const handleTransactionFormSubmit = async () => {
    try {
      const transactionData = {
        accountId: transactionFormData.accountId,
        amount: transactionFormData.amount,
        type: transactionFormData.type,
        category: transactionFormData.category,
        description: transactionFormData.description,
        date: transactionFormData.date.toISOString().split('T')[0],
      };

      await transactionService.createTransaction(transactionData);
      setTransactionFormOpen(false);
      setTransactionFormData({
        accountId: '',
        amount: 0,
        type: 'expense',
        category: '',
        description: '',
        date: new Date(),
      });
      loadDashboardData(); // Reload data
    } catch (error) {
      console.error('Error creating transaction:', error);
    }
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading dashboard..." />;
  }

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          Dashboard
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Account</InputLabel>
            <Select
              value={selectedAccount?.id || 'all'}
              onChange={(e) => handleAccountChange(e.target.value)}
              label="Account"
            >
              <MenuItem value="all">All Accounts</MenuItem>
              {accounts.map((account) => (
                <MenuItem key={account.id} value={account.id}>
                  {account.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Period</InputLabel>
            <Select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as any)}
              label="Period"
            >
              <MenuItem value="7days">7 Days</MenuItem>
              <MenuItem value="30days">30 Days</MenuItem>
              <MenuItem value="90days">90 Days</MenuItem>
              <MenuItem value="1year">1 Year</MenuItem>
            </Select>
          </FormControl>

          <IconButton onClick={handleRefresh}>
            <Refresh />
          </IconButton>

          <Button variant="contained" startIcon={<Add />} onClick={handleAddTransactionClick}>
            Add Transaction
          </Button>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 3 }}>
        {/* Stats Cards */}
        <Box sx={{ flexGrow: 1, flexBasis: { xs: '100%', sm: 'calc(50% - 12px)', lg: 'calc(25% - 18px)' } }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body2" color="textSecondary">
                    Total Balance
                  </Typography>
                  <Typography variant="h5" fontWeight="bold">
                    {formatCurrency(stats.totalBalance)}
                  </Typography>
                </Box>
                <AccountBalance sx={{ color: 'primary.main', fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ flexGrow: 1, flexBasis: { xs: '100%', sm: 'calc(50% - 12px)', lg: 'calc(25% - 18px)' } }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body2" color="textSecondary">
                    Monthly Income
                  </Typography>
                  <Typography variant="h5" fontWeight="bold" color="success.main">
                    {formatCurrency(stats.monthlyIncome)}
                  </Typography>
                </Box>
                <TrendingUp sx={{ color: 'success.main', fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ flexGrow: 1, flexBasis: { xs: '100%', sm: 'calc(50% - 12px)', lg: 'calc(25% - 18px)' } }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body2" color="textSecondary">
                    Monthly Expenses
                  </Typography>
                  <Typography variant="h5" fontWeight="bold" color="error.main">
                    {formatCurrency(stats.monthlyExpenses)}
                  </Typography>
                </Box>
                <TrendingDown sx={{ color: 'error.main', fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ flexGrow: 1, flexBasis: { xs: '100%', sm: 'calc(50% - 12px)', lg: 'calc(25% - 18px)' } }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body2" color="textSecondary">
                    Net Income
                  </Typography>
                  <Typography 
                    variant="h5" 
                    fontWeight="bold" 
                    color={stats.netIncome >= 0 ? 'success.main' : 'error.main'}
                  >
                    {formatCurrency(stats.netIncome, 'INR', true)}
                  </Typography>
                </Box>
                <Receipt sx={{ color: 'info.main', fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Net Worth Widget */}
      {netWorth && (
        <Box sx={{ mb: 3 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Net Worth
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, alignItems: 'center' }}>
                <Box>
                  <Typography variant="body2" color="textSecondary">
                    Total Net Worth
                  </Typography>
                  <Typography variant="h4" fontWeight="bold" color="primary.main">
                    {formatCurrency(netWorth.netWorth)}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="textSecondary">
                    Assets
                  </Typography>
                  <Typography variant="h6" fontWeight="bold" color="success.main">
                    {formatCurrency(netWorth.assets.total)}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="textSecondary">
                    Liabilities
                  </Typography>
                  <Typography variant="h6" fontWeight="bold" color="error.main">
                    {formatCurrency(netWorth.liabilities.total)}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>
      )}

      {/* Insights & Alerts Section */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 3 }}>
        {/* Recent Insights */}
        {insights.length > 0 && (
          <Box sx={{ flexGrow: 1, flexBasis: { xs: '100%', md: 'calc(50% - 12px)' } }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" fontWeight="bold">
                    Recent Insights
                  </Typography>
                  <Chip label={insights.length} color="primary" size="small" />
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {insights.slice(0, 5).map((insight) => (
                    <Box
                      key={insight.id}
                      sx={{
                        p: 2,
                        bgcolor: 'background.default',
                        borderRadius: 2,
                        borderLeft: `4px solid ${
                          insight.priority === 'high' ? '#f44336' :
                          insight.priority === 'medium' ? '#ff9800' : '#2196f3'
                        }`,
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                            {insight.title}
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            {insight.message}
                          </Typography>
                        </Box>
                        <IconButton
                          size="small"
                          onClick={async () => {
                            try {
                              await insightService.markAsRead(insight.id);
                              setInsights(insights.filter(i => i.id !== insight.id));
                            } catch (error) {
                              console.error('Error dismissing insight:', error);
                            }
                          }}
                        >
                          <Chip label="✕" size="small" />
                        </IconButton>
                      </Box>
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Box>
        )}

        {/* Alerts Widget */}
        {alerts.length > 0 && (
          <Box sx={{ flexGrow: 1, flexBasis: { xs: '100%', md: 'calc(50% - 12px)' } }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" fontWeight="bold">
                    Alerts
                  </Typography>
                  <Chip label={`${alerts.length} unread`} color="warning" size="small" />
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {alerts.slice(0, 5).map((alert) => (
                    <Box
                      key={alert.id}
                      sx={{
                        p: 2,
                        bgcolor: 'background.default',
                        borderRadius: 2,
                        borderLeft: `4px solid ${
                          alert.severity === 'error' ? '#f44336' :
                          alert.severity === 'warning' ? '#ff9800' :
                          alert.severity === 'success' ? '#4caf50' : '#2196f3'
                        }`,
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                            {alert.title}
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            {alert.message}
                          </Typography>
                        </Box>
                        <IconButton
                          size="small"
                          onClick={async () => {
                            try {
                              await alertService.markAsRead(alert.id);
                              setAlerts(alerts.filter(a => a.id !== alert.id));
                            } catch (error) {
                              console.error('Error dismissing alert:', error);
                            }
                          }}
                        >
                          <Chip label="✕" size="small" />
                        </IconButton>
                      </Box>
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Box>
        )}
      </Box>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 3 }}>
        {/* Income vs Expenses Trend */}
        <Box sx={{ flexGrow: 1, flexBasis: { xs: '100%', lg: 'calc(66.666% - 12px)' } }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Income vs Expenses Trend
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: any, name: string | undefined) => [
                      formatCurrency(value),
                      name || ''
                    ]}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="income" 
                    stroke="#4caf50" 
                    strokeWidth={2}
                    name="Income"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="expenses" 
                    stroke="#f44336" 
                    strokeWidth={2}
                    name="Expenses"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Box>

        {/* Expenses by Category */}
        <Box sx={{ flexGrow: 1, flexBasis: { xs: '100%', lg: 'calc(33.333% - 12px)' } }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Expenses by Category
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: any) => formatCurrency(value)}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
        {/* Recent Transactions */}
        <Box sx={{ flexGrow: 1, flexBasis: '100%' }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  Recent Transactions
                </Typography>
                <Button variant="text" size="small">
                  View All
                </Button>
              </Box>
              
              {recentTransactions.length > 0 ? (
                <Box>
                  {recentTransactions.map((transaction) => (
                    <Box
                      key={transaction.id}
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        py: 2,
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                        '&:last-child': { borderBottom: 'none' },
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box
                          sx={{
                            width: 40,
                            height: 40,
                            borderRadius: '50%',
                            backgroundColor: transaction.type === 'income' ? 'success.light' : 'error.light',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {transaction.type === 'income' ? (
                            <TrendingUp sx={{ color: 'success.dark' }} />
                          ) : (
                            <TrendingDown sx={{ color: 'error.dark' }} />
                          )}
                        </Box>
                        <Box>
                          <Typography variant="body1" fontWeight="medium">
                            {transaction.description}
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            {transaction.category && typeof transaction.category === 'object' ? (transaction.category as any).name : transaction.category || 'Uncategorized'} • {formatDate(transaction.date)}
                          </Typography>
                        </Box>
                      </Box>
                      
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography
                          variant="body1"
                          fontWeight="bold"
                          color={transaction.type === 'income' ? 'success.main' : 'error.main'}
                        >
                          {formatCurrency(
                            transaction.type === 'expense' ? -transaction.amount : transaction.amount,
                            'INR',
                            true
                          )}
                        </Typography>
                        <Chip
                          size="small"
                          label={transaction.type}
                          color={transaction.type === 'income' ? 'success' : 'error'}
                          variant="outlined"
                        />
                      </Box>
                    </Box>
                  ))}
                </Box>
              ) : (
                <Typography variant="body2" color="textSecondary" textAlign="center" py={4}>
                  No recent transactions found
                </Typography>
              )}
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Add Transaction Dialog */}
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <Dialog 
          open={transactionFormOpen} 
          onClose={() => setTransactionFormOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>Add Transaction</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 1 }}>
              <Box sx={{ flexGrow: 1, flexBasis: { xs: '100%', md: 'calc(50% - 8px)' } }}>
                <FormControl fullWidth>
                  <InputLabel>Type</InputLabel>
                  <Select
                    value={transactionFormData.type}
                    onChange={(e) => setTransactionFormData({ ...transactionFormData, type: e.target.value as any })}
                    label="Type"
                  >
                    <MenuItem value="income">Income</MenuItem>
                    <MenuItem value="expense">Expense</MenuItem>
                    <MenuItem value="transfer">Transfer</MenuItem>
                  </Select>
                </FormControl>
              </Box>

              <Box sx={{ flexGrow: 1, flexBasis: { xs: '100%', md: 'calc(50% - 8px)' } }}>
                <FormControl fullWidth>
                  <InputLabel>Account</InputLabel>
                  <Select
                    value={transactionFormData.accountId}
                    onChange={(e) => setTransactionFormData({ ...transactionFormData, accountId: e.target.value })}
                    label="Account"
                  >
                    {accounts.map((account) => (
                      <MenuItem key={account.id} value={account.id}>
                        {account.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              <Box sx={{ flexGrow: 1, flexBasis: '100%' }}>
                <TextField
                  fullWidth
                  label="Description"
                  value={transactionFormData.description}
                  onChange={(e) => setTransactionFormData({ ...transactionFormData, description: e.target.value })}
                />
              </Box>

              <Box sx={{ flexGrow: 1, flexBasis: { xs: '100%', md: 'calc(50% - 8px)' } }}>
                <TextField
                  fullWidth
                  label="Amount"
                  type="number"
                  value={transactionFormData.amount}
                  onChange={(e) => setTransactionFormData({ ...transactionFormData, amount: parseFloat(e.target.value) || 0 })}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                    inputProps: { step: 0.01 }
                  }}
                />
              </Box>

              <Box sx={{ flexGrow: 1, flexBasis: { xs: '100%', md: 'calc(50% - 8px)' } }}>
                <FormControl fullWidth>
                  <InputLabel>Category</InputLabel>
                  <Select
                    value={transactionFormData.category}
                    onChange={(e) => setTransactionFormData({ ...transactionFormData, category: e.target.value })}
                    label="Category"
                  >
                    {(categories || [])
                      .filter((cat: any) => cat.type === transactionFormData.type || cat.type === 'both')
                      .map((category: any) => (
                        <MenuItem key={category.id} value={category.name}>
                          {category.name}
                        </MenuItem>
                      ))}
                  </Select>
                </FormControl>
              </Box>

              <Box sx={{ flexGrow: 1, flexBasis: '100%' }}>
                <DatePicker
                  label="Date"
                  value={transactionFormData.date}
                  onChange={(date) => setTransactionFormData({ ...transactionFormData, date: date || new Date() })}
                  slotProps={{
                    textField: {
                      fullWidth: true
                    }
                  }}
                />
              </Box>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setTransactionFormOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleTransactionFormSubmit} 
              variant="contained"
              disabled={!transactionFormData.accountId || !transactionFormData.description || transactionFormData.amount <= 0}
            >
              Create Transaction
            </Button>
          </DialogActions>
        </Dialog>
      </LocalizationProvider>
    </Box>
  );
};

export default Dashboard;