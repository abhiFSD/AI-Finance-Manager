import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  FormControl,
  InputLabel,
  MenuItem,
  Grid,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Alert,
  Divider,
  InputAdornment,
} from '@mui/material';
import {
  Add,
  TrendingUp,
  Edit,
  Delete,
  AccountBalance,
  ShowChart,
} from '@mui/icons-material';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import {
  investmentService,
  Investment,
  InvestmentStats,
  InvestmentAllocation,
  InvestmentSuggestion,
  InvestmentFormData,
} from '../services/investment.service';
import { goalService } from '../services/goal.service';
import { formatCurrency, formatDate, formatPercentage } from '../utils/formatters';
import LoadingSpinner from '../components/LoadingSpinner';
import { Goal } from '../types';

const INVESTMENT_TYPE_COLORS: Record<string, string> = {
  SIP: '#2196f3',
  MF: '#4caf50',
  ETF: '#ff9800',
  FD: '#9c27b0',
  STOCKS: '#f44336',
  BONDS: '#607d8b',
  OTHER: '#9e9e9e',
};

const Investments: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [stats, setStats] = useState<InvestmentStats | null>(null);
  const [allocation, setAllocation] = useState<InvestmentAllocation[]>([]);
  const [suggestions, setSuggestions] = useState<InvestmentSuggestion[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);

  // Modal states
  const [formOpen, setFormOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedInvestment, setSelectedInvestment] = useState<Investment | null>(null);

  // Form data
  const [formData, setFormData] = useState<InvestmentFormData>({
    name: '',
    type: 'MF',
    platform: '',
    investedAmount: 0,
    currentValue: 0,
    purchaseDate: new Date().toISOString().split('T')[0],
    expectedReturn: undefined,
    goalId: undefined,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      await Promise.all([
        loadInvestments(),
        loadStats(),
        loadAllocation(),
        loadSuggestions(),
        loadGoals(),
      ]);
    } catch (error) {
      setError('Failed to load investment data');
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadInvestments = async () => {
    const response = await investmentService.getInvestments();
    setInvestments(response.data as Investment[]);
  };

  const loadStats = async () => {
    const response = await investmentService.getInvestmentStats();
    setStats(response.data as InvestmentStats);
  };

  const loadAllocation = async () => {
    const response = await investmentService.getAllocation();
    setAllocation(response.data as InvestmentAllocation[]);
  };

  const loadSuggestions = async () => {
    const response = await investmentService.getSuggestions();
    setSuggestions(response.data as InvestmentSuggestion[]);
  };

  const loadGoals = async () => {
    const response = await goalService.getGoals();
    const goalsData: any = response.data;
    setGoals(Array.isArray(goalsData) ? goalsData : goalsData.data || []);
  };

  const handleFormSubmit = async () => {
    try {
      if (selectedInvestment) {
        await investmentService.updateInvestment(selectedInvestment.id, formData);
      } else {
        await investmentService.createInvestment(formData);
      }
      loadData();
      setFormOpen(false);
      resetForm();
    } catch (error) {
      setError('Failed to save investment');
      console.error('Error saving investment:', error);
    }
  };

  const handleEdit = (investment: Investment) => {
    setSelectedInvestment(investment);
    setFormData({
      name: investment.name,
      type: investment.type,
      platform: investment.platform,
      investedAmount: investment.investedAmount,
      currentValue: investment.currentValue,
      purchaseDate: investment.purchaseDate.split('T')[0],
      expectedReturn: investment.expectedReturn,
      goalId: investment.goalId,
    });
    setFormOpen(true);
  };

  const handleDelete = (investment: Investment) => {
    setSelectedInvestment(investment);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (selectedInvestment) {
      try {
        await investmentService.deleteInvestment(selectedInvestment.id);
        loadData();
        setDeleteDialogOpen(false);
        setSelectedInvestment(null);
      } catch (error) {
        setError('Failed to delete investment');
        console.error('Error deleting investment:', error);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'MF',
      platform: '',
      investedAmount: 0,
      currentValue: 0,
      purchaseDate: new Date().toISOString().split('T')[0],
      expectedReturn: undefined,
      goalId: undefined,
    });
    setSelectedInvestment(null);
  };

  const calculateReturns = (investment: Investment) => {
    const returns = investment.currentValue - investment.investedAmount;
    const percentage = (returns / investment.investedAmount) * 100;
    return { returns, percentage };
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading investments..." />;
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          Investment Portfolio
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setFormOpen(true)}
        >
          Add Investment
        </Button>
      </Box>

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Stats Cards */}
      {stats && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="body2" color="textSecondary">
                      Total Invested
                    </Typography>
                    <Typography variant="h5" fontWeight="bold">
                      {formatCurrency(stats.totalInvested)}
                    </Typography>
                  </Box>
                  <AccountBalance sx={{ color: 'primary.main', fontSize: 40 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="body2" color="textSecondary">
                      Current Value
                    </Typography>
                    <Typography variant="h5" fontWeight="bold" color="success.main">
                      {formatCurrency(stats.currentValue)}
                    </Typography>
                  </Box>
                  <ShowChart sx={{ color: 'success.main', fontSize: 40 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="body2" color="textSecondary">
                      Total Returns
                    </Typography>
                    <Typography variant="h5" fontWeight="bold" color={stats.totalReturns >= 0 ? 'success.main' : 'error.main'}>
                      {formatCurrency(stats.totalReturns, 'INR', true)}
                    </Typography>
                    <Typography variant="body2" color={stats.returnPercentage >= 0 ? 'success.main' : 'error.main'}>
                      {formatPercentage(stats.returnPercentage / 100)}
                    </Typography>
                  </Box>
                  <TrendingUp sx={{ color: stats.totalReturns >= 0 ? 'success.main' : 'error.main', fontSize: 40 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="body2" color="textSecondary">
                      Investments
                    </Typography>
                    <Typography variant="h5" fontWeight="bold">
                      {stats.totalInvestments}
                    </Typography>
                  </Box>
                  <TrendingUp sx={{ color: 'info.main', fontSize: 40 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Asset Allocation Chart */}
      {allocation.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Asset Allocation
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={allocation}
                  dataKey="percentage"
                  nameKey="type"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={(entry: any) => `${entry.type}: ${(entry.percentage || entry.percent * 100).toFixed(1)}%`}
                >
                  {allocation.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={INVESTMENT_TYPE_COLORS[entry.type] || '#9e9e9e'} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any) => `${Number(value).toFixed(1)}%`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Investment Suggestions */}
      {suggestions.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Investment Suggestions (Based on Risk Profile)
            </Typography>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              {suggestions.map((suggestion, index) => (
                <Grid size={{ xs: 12, md: 6 }} key={index}>
                  <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="subtitle1" fontWeight="bold">
                        {suggestion.type}
                      </Typography>
                      <Chip
                        label={suggestion.difference >= 0 ? 'Underweight' : 'Overweight'}
                        color={suggestion.difference >= 0 ? 'warning' : 'success'}
                        size="small"
                      />
                    </Box>
                    <Typography variant="body2" color="textSecondary" gutterBottom>
                      {suggestion.reason}
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                      <Typography variant="body2">
                        Current: <strong>{suggestion.current.toFixed(1)}%</strong>
                      </Typography>
                      <Typography variant="body2">
                        Recommended: <strong>{suggestion.recommended.toFixed(1)}%</strong>
                      </Typography>
                    </Box>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Investment List */}
      <Card>
        <CardContent>
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            All Investments
          </Typography>
          {investments.length > 0 ? (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Name</strong></TableCell>
                    <TableCell><strong>Type</strong></TableCell>
                    <TableCell><strong>Platform</strong></TableCell>
                    <TableCell align="right"><strong>Invested</strong></TableCell>
                    <TableCell align="right"><strong>Current Value</strong></TableCell>
                    <TableCell align="right"><strong>Returns</strong></TableCell>
                    <TableCell><strong>Purchase Date</strong></TableCell>
                    <TableCell><strong>Actions</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {investments.map((investment) => {
                    const { returns, percentage } = calculateReturns(investment);
                    return (
                      <TableRow key={investment.id}>
                        <TableCell>{investment.name}</TableCell>
                        <TableCell>
                          <Chip
                            label={investment.type}
                            size="small"
                            sx={{
                              bgcolor: INVESTMENT_TYPE_COLORS[investment.type],
                              color: 'white',
                            }}
                          />
                        </TableCell>
                        <TableCell>{investment.platform}</TableCell>
                        <TableCell align="right">{formatCurrency(investment.investedAmount)}</TableCell>
                        <TableCell align="right">{formatCurrency(investment.currentValue)}</TableCell>
                        <TableCell align="right">
                          <Box>
                            <Typography
                              variant="body2"
                              color={returns >= 0 ? 'success.main' : 'error.main'}
                              fontWeight="bold"
                            >
                              {formatCurrency(returns, 'INR', true)}
                            </Typography>
                            <Typography
                              variant="caption"
                              color={percentage >= 0 ? 'success.main' : 'error.main'}
                            >
                              ({formatPercentage(percentage / 100)})
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>{formatDate(investment.purchaseDate)}</TableCell>
                        <TableCell>
                          <IconButton size="small" onClick={() => handleEdit(investment)}>
                            <Edit fontSize="small" />
                          </IconButton>
                          <IconButton size="small" onClick={() => handleDelete(investment)}>
                            <Delete fontSize="small" color="error" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body1" color="textSecondary">
                No investments yet. Add your first investment to get started!
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Investment Form Dialog */}
      <Dialog open={formOpen} onClose={() => setFormOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedInvestment ? 'Edit Investment' : 'Add New Investment'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              fullWidth
              label="Investment Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />

            <FormControl fullWidth>
              <InputLabel>Type</InputLabel>
              <Select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                label="Type"
              >
                <MenuItem value="SIP">SIP</MenuItem>
                <MenuItem value="MF">Mutual Fund</MenuItem>
                <MenuItem value="ETF">ETF</MenuItem>
                <MenuItem value="FD">Fixed Deposit</MenuItem>
                <MenuItem value="STOCKS">Stocks</MenuItem>
                <MenuItem value="BONDS">Bonds</MenuItem>
                <MenuItem value="OTHER">Other</MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Platform"
              value={formData.platform}
              onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
            />

            <TextField
              fullWidth
              label="Invested Amount"
              type="number"
              value={formData.investedAmount}
              onChange={(e) => setFormData({ ...formData, investedAmount: parseFloat(e.target.value) || 0 })}
              InputProps={{
                startAdornment: <InputAdornment position="start">₹</InputAdornment>,
              }}
            />

            <TextField
              fullWidth
              label="Current Value"
              type="number"
              value={formData.currentValue}
              onChange={(e) => setFormData({ ...formData, currentValue: parseFloat(e.target.value) || 0 })}
              InputProps={{
                startAdornment: <InputAdornment position="start">₹</InputAdornment>,
              }}
            />

            <TextField
              fullWidth
              label="Purchase Date"
              type="date"
              value={formData.purchaseDate}
              onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />

            <TextField
              fullWidth
              label="Expected Return (% per year)"
              type="number"
              value={formData.expectedReturn || ''}
              onChange={(e) => setFormData({ ...formData, expectedReturn: parseFloat(e.target.value) || undefined })}
              InputProps={{
                endAdornment: <InputAdornment position="end">%</InputAdornment>,
              }}
            />

            <FormControl fullWidth>
              <InputLabel>Link to Goal (Optional)</InputLabel>
              <Select
                value={formData.goalId || ''}
                onChange={(e) => setFormData({ ...formData, goalId: e.target.value || undefined })}
                label="Link to Goal (Optional)"
              >
                <MenuItem value="">None</MenuItem>
                {goals.map((goal) => (
                  <MenuItem key={goal.id} value={goal.id}>
                    {goal.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFormOpen(false)}>Cancel</Button>
          <Button onClick={handleFormSubmit} variant="contained">
            {selectedInvestment ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Investment</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            This action cannot be undone.
          </Alert>
          <Typography>
            Are you sure you want to delete "<strong>{selectedInvestment?.name}</strong>"?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={confirmDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Investments;
