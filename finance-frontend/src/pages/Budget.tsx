import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Alert,
  Snackbar,
  ToggleButton,
  ToggleButtonGroup,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Paper,
  CircularProgress,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  TrendingUp,
  TrendingDown,
  Warning,
  AccountBalance,
  Assessment,
  Refresh,
} from '@mui/icons-material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { useApp } from '../context/AppContext';
import { budgetService, BudgetFormData, BudgetStats } from '../services/budget.service';
import { categoryService } from '../services/category.service';
import { Budget as BudgetType, Category, BudgetPeriod } from '../types';
import { formatCurrency, formatDate, formatPercentage } from '../utils/formatters';
import { APP_CONSTANTS } from '../utils/constants';
import LoadingSpinner from '../components/LoadingSpinner';

interface BudgetWithProgress extends BudgetType {
  percentage: number;
  isOverBudget: boolean;
  categoryNames: string[];
}

interface BudgetChartData {
  name: string;
  budgeted: number;
  spent: number;
  remaining: number;
}

const BudgetPage: React.FC = () => {
  const { isLoading, setLoading } = useApp();
  const [budgets, setBudgets] = useState<BudgetWithProgress[]>([]);
  const [stats, setStats] = useState<BudgetStats>({
    totalBudgeted: 0,
    totalSpent: 0,
    totalRemaining: 0,
    budgetCount: 0,
    overBudgetCount: 0,
  });
  const [categories, setCategories] = useState<Category[]>([]);
  const [chartData, setChartData] = useState<BudgetChartData[]>([]);
  const [period, setPeriod] = useState<'monthly' | 'yearly'>('monthly');
  
  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState<BudgetType | null>(null);
  
  // Form state
  const [formData, setFormData] = useState<BudgetFormData>({
    name: '',
    amount: 0,
    period: 'monthly',
    categories: [],
    startDate: new Date().toISOString().split('T')[0],
    endDate: undefined,
  });
  
  // UI states
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const [submitLoading, setSubmitLoading] = useState(false);

  useEffect(() => {
    loadBudgetData();
    loadCategories();
  }, [period]);

  const loadBudgetData = async () => {
    try {
      setLoading(true);
      const [budgetsResponse, statsResponse] = await Promise.all([
        budgetService.getBudgets(1, 50, { period: period === 'monthly' ? 'monthly' : 'yearly' }),
        budgetService.getBudgetStats(period === 'monthly' ? 'monthly' : 'yearly'),
      ]);

      // Process budgets with progress calculation
      const budgetsArray = Array.isArray(budgetsResponse.data) 
        ? budgetsResponse.data 
        : (budgetsResponse.data?.data || []);
        
      const budgetsWithProgress: BudgetWithProgress[] = budgetsArray.map((budget: any) => {
        const spent = budget.spending?.totalSpent || 0;
        const percentage = budget.amount > 0 ? (Math.abs(spent) / budget.amount) * 100 : 0;
        const isOverBudget = percentage > 100;
        const name = budget.category?.name || 'Unknown Category';
        
        return {
          ...budget,
          name,
          spent: Math.abs(spent),
          percentage: Math.min(percentage, 100),
          isOverBudget,
          categoryNames: budget.categories || [], // This would be resolved to names in a real app
        };
      });

      setBudgets(budgetsWithProgress);
      // Handle stats response structure - check if it's wrapped in data.summary
      const rawStats = (statsResponse.data as any)?.summary || statsResponse.data || {};
      const statsData = {
        totalBudgeted: rawStats.totalBudgeted || 0,
        totalSpent: Math.abs(rawStats.totalSpent || 0),
        totalRemaining: rawStats.totalRemaining || 0,
        budgetCount: rawStats.budgetCount || 0,
        overBudgetCount: rawStats.overBudgetCount || 0
      };
      setStats(statsData);

      // Prepare chart data
      const chartDataFormatted: BudgetChartData[] = budgetsWithProgress.map((budget) => ({
        name: budget.name.length > 15 ? budget.name.substring(0, 15) + '...' : budget.name,
        budgeted: budget.amount,
        spent: budget.spent,
        remaining: Math.max(budget.amount - budget.spent, 0),
      }));
      setChartData(chartDataFormatted);

    } catch (error) {
      console.error('Error loading budget data:', error);
      setSnackbar({
        open: true,
        message: 'Failed to load budget data',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await categoryService.getAllCategories('expense');
      // Handle the response structure - it has hierarchy and flat arrays
      const responseData = response.data as any;
      const categoriesData = responseData?.flat || responseData?.hierarchy || responseData || [];
      setCategories(Array.isArray(categoriesData) ? categoriesData : []);
    } catch (error) {
      console.error('Error loading categories:', error);
      setCategories([]);
    }
  };

  const handleCreateBudget = async () => {
    try {
      setSubmitLoading(true);
      
      // Transform formData to match backend expectations
      const backendData = {
        categoryId: formData.categories[0], // Backend expects single categoryId, not array
        amount: formData.amount,
        period: formData.period.toUpperCase(), // Backend expects uppercase period
        startDate: formData.startDate,
        ...(formData.endDate && { endDate: formData.endDate }),
      };
      
      await budgetService.createBudget(backendData as any);
      setCreateDialogOpen(false);
      resetForm();
      loadBudgetData();
      setSnackbar({
        open: true,
        message: 'Budget created successfully!',
        severity: 'success',
      });
    } catch (error) {
      console.error('Error creating budget:', error);
      setSnackbar({
        open: true,
        message: 'Failed to create budget',
        severity: 'error',
      });
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleEditBudget = async () => {
    if (!selectedBudget) return;
    
    try {
      setSubmitLoading(true);
      
      // Transform formData to match backend expectations
      const backendData = {
        categoryId: formData.categories[0], // Backend expects single categoryId, not array
        amount: formData.amount,
        period: formData.period.toUpperCase(), // Backend expects uppercase period
        startDate: formData.startDate,
        ...(formData.endDate && { endDate: formData.endDate }),
      };
      
      await budgetService.updateBudget(selectedBudget.id, backendData as any);
      setEditDialogOpen(false);
      setSelectedBudget(null);
      resetForm();
      loadBudgetData();
      setSnackbar({
        open: true,
        message: 'Budget updated successfully!',
        severity: 'success',
      });
    } catch (error) {
      console.error('Error updating budget:', error);
      setSnackbar({
        open: true,
        message: 'Failed to update budget',
        severity: 'error',
      });
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDeleteBudget = async () => {
    if (!selectedBudget) return;
    
    try {
      setSubmitLoading(true);
      await budgetService.deleteBudget(selectedBudget.id);
      setDeleteDialogOpen(false);
      setSelectedBudget(null);
      loadBudgetData();
      setSnackbar({
        open: true,
        message: 'Budget deleted successfully!',
        severity: 'success',
      });
    } catch (error) {
      console.error('Error deleting budget:', error);
      setSnackbar({
        open: true,
        message: 'Failed to delete budget',
        severity: 'error',
      });
    } finally {
      setSubmitLoading(false);
    }
  };

  const openEditDialog = (budget: BudgetType) => {
    setSelectedBudget(budget);
    setFormData({
      name: budget.name,
      amount: budget.amount,
      period: budget.period,
      categories: budget.categories,
      startDate: formatDate(budget.startDate, 'iso'),
      endDate: formatDate(budget.endDate, 'iso'),
    });
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (budget: BudgetType) => {
    setSelectedBudget(budget);
    setDeleteDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      amount: 0,
      period: 'monthly',
      categories: [],
      startDate: new Date().toISOString().split('T')[0],
      endDate: undefined,
    });
  };

  const handlePeriodChange = (
    _event: React.MouseEvent<HTMLElement>,
    newPeriod: 'monthly' | 'yearly'
  ) => {
    if (newPeriod) {
      setPeriod(newPeriod);
    }
  };

  const getProgressColor = (budget: BudgetWithProgress) => {
    if (budget.isOverBudget) return 'error';
    if (budget.percentage > 80) return 'warning';
    return 'primary';
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading budgets..." />;
  }

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          Budget Management
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <ToggleButtonGroup
            value={period}
            exclusive
            onChange={handlePeriodChange}
            size="small"
          >
            <ToggleButton value="monthly">Monthly</ToggleButton>
            <ToggleButton value="yearly">Yearly</ToggleButton>
          </ToggleButtonGroup>
          
          <IconButton onClick={loadBudgetData}>
            <Refresh />
          </IconButton>

          <Button 
            variant="contained" 
            startIcon={<Add />}
            onClick={() => setCreateDialogOpen(true)}
          >
            Create Budget
          </Button>
        </Box>
      </Box>

      {/* Statistics Cards */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 3 }}>
        <Box sx={{ flexGrow: 1, flexBasis: { xs: '100%', sm: 'calc(50% - 12px)', lg: 'calc(25% - 18px)' } }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body2" color="textSecondary">
                    Total Budgeted
                  </Typography>
                  <Typography variant="h5" fontWeight="bold">
                    {formatCurrency(stats.totalBudgeted)}
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
                    Total Spent
                  </Typography>
                  <Typography variant="h5" fontWeight="bold" color="error.main">
                    {formatCurrency(stats.totalSpent)}
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
                    Remaining
                  </Typography>
                  <Typography variant="h5" fontWeight="bold" color="success.main">
                    {formatCurrency(stats.totalRemaining)}
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
                    Over Budget
                  </Typography>
                  <Typography variant="h5" fontWeight="bold" color="warning.main">
                    {stats.overBudgetCount} / {stats.budgetCount}
                  </Typography>
                </Box>
                <Warning sx={{ color: 'warning.main', fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 3 }}>
        {/* Budget vs Actual Chart */}
        <Box sx={{ flexGrow: 1, flexBasis: { xs: '100%', lg: 'calc(66.666% - 12px)' } }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Budget vs Actual Spending
              </Typography>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <RechartsTooltip 
                    formatter={(value: any, name: string | undefined) => [
                      formatCurrency(value),
                      name || ''
                    ]}
                  />
                  <Legend />
                  <Bar dataKey="budgeted" fill="#8884d8" name="Budgeted" />
                  <Bar dataKey="spent" fill="#82ca9d" name="Spent" />
                  <Bar dataKey="remaining" fill="#ffc658" name="Remaining" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Box>

        {/* Budget Breakdown Pie Chart */}
        <Box sx={{ flexGrow: 1, flexBasis: { xs: '100%', lg: 'calc(33.333% - 12px)' } }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Budget Allocation
              </Typography>
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={120}
                    paddingAngle={5}
                    dataKey="budgeted"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={APP_CONSTANTS.CHART_COLORS[index % APP_CONSTANTS.CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    formatter={(value: any) => formatCurrency(value)}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Budget List */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Active Budgets
          </Typography>
          
          {budgets.length > 0 ? (
            <List>
              {budgets.map((budget) => (
                <ListItem key={budget.id} divider>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle1" fontWeight="medium">
                          {budget.name}
                        </Typography>
                        {budget.isOverBudget && (
                          <Chip 
                            icon={<Warning />}
                            label="Over Budget"
                            color="error"
                            size="small"
                          />
                        )}
                      </Box>
                    }
                    secondary={
                      <Box sx={{ mt: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="body2">
                            {formatCurrency(budget.spent)} of {formatCurrency(budget.amount)}
                          </Typography>
                          <Typography variant="body2" fontWeight="medium">
                            {formatPercentage(budget.percentage / 100)}
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={budget.percentage}
                          color={getProgressColor(budget)}
                          sx={{ height: 8, borderRadius: 4 }}
                        />
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                          <Typography variant="caption" color="textSecondary">
                            Period: {budget.period} • {formatDate(budget.startDate)} - {formatDate(budget.endDate)}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            Remaining: {formatCurrency(budget.amount - budget.spent)}
                          </Typography>
                        </Box>
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <IconButton 
                      edge="end" 
                      onClick={() => openEditDialog(budget)}
                      sx={{ mr: 1 }}
                    >
                      <Edit />
                    </IconButton>
                    <IconButton 
                      edge="end" 
                      onClick={() => openDeleteDialog(budget)}
                      color="error"
                    >
                      <Delete />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          ) : (
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Assessment sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="textSecondary" gutterBottom>
                No budgets found
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                Create your first budget to start tracking your spending
              </Typography>
              <Button 
                variant="contained" 
                startIcon={<Add />}
                onClick={() => setCreateDialogOpen(true)}
              >
                Create Budget
              </Button>
            </Paper>
          )}
        </CardContent>
      </Card>

      {/* Create Budget Dialog */}
      <Dialog 
        open={createDialogOpen} 
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Create New Budget</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Budget Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              fullWidth
              required
            />
            
            <TextField
              label="Budget Amount"
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
              fullWidth
              required
              InputProps={{
                startAdornment: '$',
              }}
            />

            <FormControl fullWidth>
              <InputLabel>Period</InputLabel>
              <Select
                value={formData.period}
                onChange={(e) => setFormData({ ...formData, period: e.target.value as BudgetPeriod })}
                label="Period"
              >
                <MenuItem value="weekly">Weekly</MenuItem>
                <MenuItem value="monthly">Monthly</MenuItem>
                <MenuItem value="quarterly">Quarterly</MenuItem>
                <MenuItem value="yearly">Yearly</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth required>
              <InputLabel>Category</InputLabel>
              <Select
                value={formData.categories[0] || ''}
                onChange={(e) => setFormData({ ...formData, categories: [e.target.value] })}
                label="Category"
              >
                {categories.map((category) => (
                  <MenuItem key={category.id} value={category.id}>
                    {category.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Start Date"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
                fullWidth
                required
              />
              
              <TextField
                label="End Date (Optional)"
                type="date"
                value={formData.endDate || ''}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleCreateBudget}
            variant="contained"
            disabled={submitLoading || !formData.name || !formData.amount || !formData.categories[0]}
          >
            {submitLoading ? <CircularProgress size={20} /> : 'Create Budget'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Budget Dialog */}
      <Dialog 
        open={editDialogOpen} 
        onClose={() => setEditDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Edit Budget</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Budget Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              fullWidth
              required
            />
            
            <TextField
              label="Budget Amount"
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
              fullWidth
              required
              InputProps={{
                startAdornment: '$',
              }}
            />

            <FormControl fullWidth>
              <InputLabel>Period</InputLabel>
              <Select
                value={formData.period}
                onChange={(e) => setFormData({ ...formData, period: e.target.value as BudgetPeriod })}
                label="Period"
              >
                <MenuItem value="weekly">Weekly</MenuItem>
                <MenuItem value="monthly">Monthly</MenuItem>
                <MenuItem value="quarterly">Quarterly</MenuItem>
                <MenuItem value="yearly">Yearly</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth required>
              <InputLabel>Category</InputLabel>
              <Select
                value={formData.categories[0] || ''}
                onChange={(e) => setFormData({ ...formData, categories: [e.target.value] })}
                label="Category"
              >
                {categories.map((category) => (
                  <MenuItem key={category.id} value={category.id}>
                    {category.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Start Date"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
                fullWidth
                required
              />
              
              <TextField
                label="End Date (Optional)"
                type="date"
                value={formData.endDate || ''}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleEditBudget}
            variant="contained"
            disabled={submitLoading || !formData.name || !formData.amount || !formData.categories[0]}
          >
            {submitLoading ? <CircularProgress size={20} /> : 'Update Budget'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Budget Dialog */}
      <Dialog 
        open={deleteDialogOpen} 
        onClose={() => setDeleteDialogOpen(false)}
        maxWidth="sm"
      >
        <DialogTitle>Delete Budget</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the budget "{selectedBudget?.name}"? 
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteBudget}
            variant="contained"
            color="error"
            disabled={submitLoading}
          >
            {submitLoading ? <CircularProgress size={20} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success/Error Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default BudgetPage;