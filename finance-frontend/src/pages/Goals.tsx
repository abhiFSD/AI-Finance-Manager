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
  LinearProgress,
  Fab,
  Paper,
  Divider,
  Alert,
  Avatar,
  ListItemIcon,
  ListItemText,
  InputAdornment,
} from '@mui/material';
import {
  Add,
  MoreVert,
  Edit,
  Delete,
  TrendingUp,
  Flag,
  AttachMoney,
  Home,
  School,
  Flight,
  BusinessCenter,
  SavingsRounded,
  CheckCircle,
  RadioButtonUnchecked,
  Refresh,
  Search,
  FilterList,
  EmojiEvents,
} from '@mui/icons-material';
import { 
  Goal, 
  GoalFormData, 
  GoalCategory,
} from '../types';
import { goalService, GoalFilters } from '../services/goal.service';
import { investmentService, Investment } from '../services/investment.service';
import { formatCurrency, formatDate, formatPercentage } from '../utils/formatters';
import LoadingSpinner from '../components/LoadingSpinner';

interface MilestoneFormData {
  name: string;
  targetAmount: number;
}

const GOAL_CATEGORY_ICONS = {
  emergency_fund: <SavingsRounded />,
  vacation: <Flight />,
  home: <Home />,
  retirement: <BusinessCenter />,
  education: <School />,
  debt_payoff: <AttachMoney />,
  investment: <TrendingUp />,
  other: <Flag />,
};

const GOAL_CATEGORY_COLORS = {
  emergency_fund: '#f44336',
  vacation: '#2196f3',
  home: '#4caf50',
  retirement: '#ff9800',
  education: '#9c27b0',
  debt_payoff: '#795548',
  investment: '#607d8b',
  other: '#9e9e9e',
};

const PRIORITY_COLORS = {
  low: '#4caf50',
  medium: '#ff9800',
  high: '#f44336',
};

const Goals: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [filteredGoals, setFilteredGoals] = useState<Goal[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<GoalFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [goalStats, setGoalStats] = useState<any>(null);
  const [investments, setInvestments] = useState<Investment[]>([]);

  // Modal states
  const [formOpen, setFormOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [contributionOpen, setContributionOpen] = useState(false);
  const [milestoneOpen, setMilestoneOpen] = useState(false);
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);

  // Form data
  const [formData, setFormData] = useState<GoalFormData>({
    name: '',
    description: '',
    category: 'other',
    targetAmount: 0,
    targetDate: '',
    priority: 'medium',
  });

  const [contributionAmount, setContributionAmount] = useState<number>(0);
  const [contributionDescription, setContributionDescription] = useState('');
  const [milestoneData, setMilestoneData] = useState<MilestoneFormData>({
    name: '',
    targetAmount: 0,
  });

  useEffect(() => {
    loadGoals();
    loadGoalStats();
    loadInvestments();
  }, [filters]);

  useEffect(() => {
    filterGoals();
  }, [goals, searchTerm, filters]);

  const loadGoals = async () => {
    try {
      setIsLoading(true);
      const response = await goalService.getGoals(filters);
      // Handle paginated response structure
      if (response.data && Array.isArray((response.data as any).data)) {
        setGoals((response.data as any).data);
      } else if (Array.isArray(response.data)) {
        setGoals(response.data);
      } else {
        setGoals([]);
      }
    } catch (error) {
      setError('Failed to load goals');
      console.error('Error loading goals:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadGoalStats = async () => {
    try {
      const response = await goalService.getGoalStats();
      console.log('Goal stats response:', response);
      // API returns { success, data: { summary: {...} } }
      // The service already returns response.data, so we need to check the structure
      const resData: any = response;
      
      // Handle both wrapped and unwrapped response formats
      let summary;
      if (resData.data?.summary) {
        // Wrapped: { success, data: { summary: {...} } }
        summary = resData.data.summary;
      } else if (resData.summary) {
        // Direct: { summary: {...} }
        summary = resData.summary;
      } else {
        // Fallback to resData itself or empty object
        summary = resData;
      }
      
      console.log('Extracted summary:', summary);
      
      setGoalStats({
        totalGoals: Number(summary.totalGoals) || 0,
        completedGoals: Number(summary.completedGoals) || 0,
        totalTargetAmount: Number(summary.totalTarget || summary.totalTargetAmount) || 0,
        totalCurrentAmount: Number(summary.totalSaved || summary.totalCurrentAmount) || 0,
        averageProgress: Number(summary.overallProgress || summary.averageProgress) || 0,
      });
    } catch (error) {
      console.error('Error loading goal stats:', error);
      // Set default stats on error
      setGoalStats({
        totalGoals: 0,
        completedGoals: 0,
        totalTargetAmount: 0,
        totalCurrentAmount: 0,
        averageProgress: 0,
      });
    }
  };

  const loadInvestments = async () => {
    try {
      const response = await investmentService.getInvestments();
      setInvestments(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error loading investments:', error);
    }
  };

  const getLinkedInvestments = (goalId: string) => {
    return investments.filter(inv => inv.goalId === goalId);
  };

  const filterGoals = () => {
    let filtered = [...goals];

    if (searchTerm) {
      filtered = filtered.filter(goal =>
        goal.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        goal.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filters.category) {
      filtered = filtered.filter(goal => goal.category === filters.category);
    }

    if (filters.priority) {
      filtered = filtered.filter(goal => goal.priority === filters.priority);
    }

    if (filters.isCompleted !== undefined) {
      filtered = filtered.filter(goal => goal.isCompleted === filters.isCompleted);
    }

    setFilteredGoals(filtered);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, goal: Goal) => {
    event.stopPropagation();
    setSelectedGoal(goal);
    setMenuAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
  };

  const handleGoalClick = (goal: Goal) => {
    setSelectedGoal(goal);
    setDetailsOpen(true);
  };

  const handleEdit = () => {
    if (selectedGoal) {
      setFormData({
        name: selectedGoal.name,
        description: selectedGoal.description || '',
        category: selectedGoal.category,
        targetAmount: selectedGoal.targetAmount,
        targetDate: selectedGoal.targetDate.split('T')[0],
        priority: selectedGoal.priority,
      });
      setFormOpen(true);
    }
    handleMenuClose();
  };

  const handleDelete = () => {
    setDeleteDialogOpen(true);
    handleMenuClose();
  };

  const handleComplete = async () => {
    if (selectedGoal) {
      try {
        await goalService.completeGoal(selectedGoal.id);
        loadGoals();
        handleMenuClose();
      } catch (error) {
        setError('Failed to complete goal');
        console.error('Error completing goal:', error);
      }
    }
  };

  const confirmDelete = async () => {
    if (selectedGoal) {
      try {
        await goalService.deleteGoal(selectedGoal.id);
        loadGoals();
        setDeleteDialogOpen(false);
        setSelectedGoal(null);
      } catch (error) {
        setError('Failed to delete goal');
        console.error('Error deleting goal:', error);
      }
    }
  };

  const handleFormSubmit = async () => {
    try {
      if (selectedGoal) {
        await goalService.updateGoal(selectedGoal.id, formData);
      } else {
        await goalService.createGoal(formData);
      }

      loadGoals();
      setFormOpen(false);
      resetForm();
    } catch (error) {
      setError('Failed to save goal');
      console.error('Error saving goal:', error);
    }
  };

  const handleContribution = async () => {
    if (selectedGoal) {
      try {
        await goalService.addContribution(
          selectedGoal.id, 
          contributionAmount, 
          contributionDescription
        );
        loadGoals();
        loadGoalStats();
        setContributionOpen(false);
        setContributionAmount(0);
        setContributionDescription('');
      } catch (error) {
        setError('Failed to add contribution');
        console.error('Error adding contribution:', error);
      }
    }
  };

  const handleMilestoneSubmit = async () => {
    if (selectedGoal) {
      try {
        await goalService.createMilestone(selectedGoal.id, milestoneData);
        loadGoals();
        setMilestoneOpen(false);
        setMilestoneData({ name: '', targetAmount: 0 });
      } catch (error) {
        setError('Failed to create milestone');
        console.error('Error creating milestone:', error);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: 'other',
      targetAmount: 0,
      targetDate: '',
      priority: 'medium',
    });
    setSelectedGoal(null);
  };

  const clearFilters = () => {
    setFilters({});
    setSearchTerm('');
  };

  const getProgressPercentage = (goal: Goal) => {
    return (goal.currentAmount / goal.targetAmount) * 100;
  };

  const formatGoalCategory = (category: GoalCategory): string => {
    const categoryMap: Record<GoalCategory, string> = {
      emergency_fund: 'Emergency Fund',
      vacation: 'Vacation',
      home: 'Home',
      retirement: 'Retirement',
      education: 'Education',
      debt_payoff: 'Debt Payoff',
      investment: 'Investment',
      other: 'Other',
    };
    return categoryMap[category];
  };

  if (isLoading && goals.length === 0) {
    return <LoadingSpinner message="Loading goals..." />;
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          Financial Goals
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={loadGoals}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setFormOpen(true)}
          >
            Add Goal
          </Button>
        </Box>
      </Box>

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Stats Cards */}
      {goalStats && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 3 }}>
          <Box sx={{ flexGrow: 1, flexBasis: { xs: '100%', sm: 'calc(50% - 12px)', lg: 'calc(20% - 16px)' } }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="body2" color="textSecondary">
                      Total Goals
                    </Typography>
                    <Typography variant="h5" fontWeight="bold">
                      {goalStats.totalGoals}
                    </Typography>
                  </Box>
                  <Flag sx={{ color: 'primary.main', fontSize: 40 }} />
                </Box>
              </CardContent>
            </Card>
          </Box>

          <Box sx={{ flexGrow: 1, flexBasis: { xs: '100%', sm: 'calc(50% - 12px)', lg: 'calc(20% - 16px)' } }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="body2" color="textSecondary">
                      Completed
                    </Typography>
                    <Typography variant="h5" fontWeight="bold" color="success.main">
                      {goalStats.completedGoals}
                    </Typography>
                  </Box>
                  <CheckCircle sx={{ color: 'success.main', fontSize: 40 }} />
                </Box>
              </CardContent>
            </Card>
          </Box>

          <Box sx={{ flexGrow: 1, flexBasis: { xs: '100%', sm: 'calc(50% - 12px)', lg: 'calc(20% - 16px)' } }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="body2" color="textSecondary">
                      Target Amount
                    </Typography>
                    <Typography variant="h5" fontWeight="bold">
                      {formatCurrency(goalStats.totalTargetAmount)}
                    </Typography>
                  </Box>
                  <EmojiEvents sx={{ color: 'warning.main', fontSize: 40 }} />
                </Box>
              </CardContent>
            </Card>
          </Box>

          <Box sx={{ flexGrow: 1, flexBasis: { xs: '100%', sm: 'calc(50% - 12px)', lg: 'calc(20% - 16px)' } }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="body2" color="textSecondary">
                      Saved Amount
                    </Typography>
                    <Typography variant="h5" fontWeight="bold" color="success.main">
                      {formatCurrency(goalStats.totalCurrentAmount)}
                    </Typography>
                  </Box>
                  <SavingsRounded sx={{ color: 'success.main', fontSize: 40 }} />
                </Box>
              </CardContent>
            </Card>
          </Box>

          <Box sx={{ flexGrow: 1, flexBasis: { xs: '100%', sm: '100%', lg: 'calc(20% - 16px)' } }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="body2" color="textSecondary">
                      Avg Progress
                    </Typography>
                    <Typography variant="h5" fontWeight="bold" color="info.main">
                      {formatPercentage(goalStats.averageProgress / 100)}
                    </Typography>
                  </Box>
                  <TrendingUp sx={{ color: 'info.main', fontSize: 40 }} />
                </Box>
              </CardContent>
            </Card>
          </Box>
        </Box>
      )}

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Search & Filters
            </Typography>
            <Button
              variant="text"
              onClick={() => setShowFilters(!showFilters)}
              startIcon={<FilterList />}
            >
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </Button>
          </Box>

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ flexGrow: 1, flexBasis: { xs: '100%', md: 'calc(50% - 8px)' } }}>
              <TextField
                fullWidth
                label="Search goals"
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
                    <InputLabel>Category</InputLabel>
                    <Select
                      value={filters.category || ''}
                      onChange={(e) => setFilters({ ...filters, category: e.target.value as GoalCategory })}
                      label="Category"
                    >
                      <MenuItem value="">All Categories</MenuItem>
                      <MenuItem value="emergency_fund">Emergency Fund</MenuItem>
                      <MenuItem value="vacation">Vacation</MenuItem>
                      <MenuItem value="home">Home</MenuItem>
                      <MenuItem value="retirement">Retirement</MenuItem>
                      <MenuItem value="education">Education</MenuItem>
                      <MenuItem value="debt_payoff">Debt Payoff</MenuItem>
                      <MenuItem value="investment">Investment</MenuItem>
                      <MenuItem value="other">Other</MenuItem>
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

      {/* Goals Grid */}
      {filteredGoals.length > 0 ? (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
          {filteredGoals.map((goal) => (
            <Box key={goal.id} sx={{ flexGrow: 1, flexBasis: { xs: '100%', sm: 'calc(50% - 12px)', lg: 'calc(33.333% - 16px)' } }}>
              <Card
                sx={{
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  '&:hover': {
                    boxShadow: 4,
                    transform: 'translateY(-2px)',
                  },
                }}
                onClick={() => handleGoalClick(goal)}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar sx={{ bgcolor: GOAL_CATEGORY_COLORS[goal.category], width: 48, height: 48 }}>
                        {GOAL_CATEGORY_ICONS[goal.category]}
                      </Avatar>
                      <Box>
                        <Typography variant="h6" fontWeight="bold">
                          {goal.name}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                          <Chip
                            size="small"
                            label={formatGoalCategory(goal.category)}
                            color="primary"
                            variant="outlined"
                          />
                          <Chip
                            size="small"
                            label={goal.priority}
                            sx={{ 
                              bgcolor: PRIORITY_COLORS[goal.priority],
                              color: 'white',
                            }}
                          />
                        </Box>
                      </Box>
                    </Box>
                    <IconButton
                      onClick={(e) => handleMenuOpen(e, goal)}
                      size="small"
                    >
                      <MoreVert />
                    </IconButton>
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" color="textSecondary">
                          Progress
                        </Typography>
                        {getProgressPercentage(goal) >= 100 && (
                          <Chip
                            size="small"
                            label={goal.currentAmount > goal.targetAmount ? "Overfunded" : "Completed"}
                            color="success"
                            sx={{ height: 20 }}
                          />
                        )}
                      </Box>
                      <Typography variant="body2" fontWeight="bold">
                        {formatPercentage(getProgressPercentage(goal) / 100)}
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min(getProgressPercentage(goal), 100)}
                      sx={{
                        height: 8,
                        borderRadius: 4,
                        bgcolor: 'grey.300',
                        '& .MuiLinearProgress-bar': {
                          borderRadius: 4,
                          bgcolor: getProgressPercentage(goal) >= 100 ? 'success.main' : 'primary.main',
                        },
                      }}
                    />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                      <Typography variant="body2" color="textSecondary">
                        {formatCurrency(goal.currentAmount)}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        {formatCurrency(goal.targetAmount)}
                      </Typography>
                    </Box>
                  </Box>

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography variant="body2" color="textSecondary">
                        Target Date
                      </Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {goal.targetDate ? (() => {
                          const parts = formatDate(goal.targetDate, 'short').split('/');
                          return `${parts[1]}/${parts[0]}/${parts[2]}`; // Convert MM/DD/YYYY to DD/MM/YYYY
                        })() : 'N/A'}
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography variant="body2" color="textSecondary">
                        Status
                      </Typography>
                      <Chip
                        size="small"
                        label={goal.isCompleted ? 'Completed' : 'Active'}
                        color={goal.isCompleted ? 'success' : 'primary'}
                        variant="filled"
                        icon={goal.isCompleted ? <CheckCircle /> : <RadioButtonUnchecked />}
                      />
                    </Box>
                  </Box>

                  {/* Linked Investments */}
                  {(() => {
                    const linkedInvestments = getLinkedInvestments(goal.id);
                    return linkedInvestments.length > 0 && (
                      <>
                        <Divider sx={{ my: 2 }} />
                        <Box>
                          <Typography variant="body2" fontWeight="bold" color="textSecondary" gutterBottom>
                            Linked Investments ({linkedInvestments.length})
                          </Typography>
                          {linkedInvestments.map((inv) => (
                            <Chip
                              key={inv.id}
                              label={inv.name}
                              size="small"
                              sx={{ mr: 0.5, mb: 0.5 }}
                              color="primary"
                              variant="outlined"
                            />
                          ))}
                        </Box>
                      </>
                    );
                  })()}
                </CardContent>
              </Card>
            </Box>
          ))}
        </Box>
      ) : (
        <Paper sx={{ p: 6, textAlign: 'center' }}>
          <Flag sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="textSecondary" gutterBottom>
            No goals found
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
            {searchTerm || Object.keys(filters).length > 0
              ? 'Try adjusting your search or filters'
              : 'Get started by creating your first financial goal'}
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setFormOpen(true)}
          >
            Add Goal
          </Button>
        </Paper>
      )}

      {/* Action Menu */}
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => setContributionOpen(true)}>
          <ListItemIcon>
            <AttachMoney fontSize="small" />
          </ListItemIcon>
          <ListItemText>Add Contribution</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleEdit}>
          <ListItemIcon>
            <Edit fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit</ListItemText>
        </MenuItem>
        {!selectedGoal?.isCompleted && (
          <MenuItem onClick={handleComplete}>
            <ListItemIcon>
              <CheckCircle fontSize="small" />
            </ListItemIcon>
            <ListItemText>Mark Complete</ListItemText>
          </MenuItem>
        )}
        <Divider />
        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
          <ListItemIcon>
            <Delete fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>

      {/* Add/Edit Goal Form Dialog */}
      <Dialog open={formOpen} onClose={() => setFormOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedGoal ? 'Edit Goal' : 'Add New Goal'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              fullWidth
              label="Goal Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />

            <TextField
              fullWidth
              label="Description (Optional)"
              multiline
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />

            <FormControl fullWidth>
              <InputLabel>Category</InputLabel>
              <Select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as GoalCategory })}
                label="Category"
              >
                <MenuItem value="emergency_fund">Emergency Fund</MenuItem>
                <MenuItem value="vacation">Vacation</MenuItem>
                <MenuItem value="home">Home</MenuItem>
                <MenuItem value="retirement">Retirement</MenuItem>
                <MenuItem value="education">Education</MenuItem>
                <MenuItem value="debt_payoff">Debt Payoff</MenuItem>
                <MenuItem value="investment">Investment</MenuItem>
                <MenuItem value="other">Other</MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Target Amount"
              type="number"
              value={formData.targetAmount}
              onChange={(e) => setFormData({ ...formData, targetAmount: parseFloat(e.target.value) || 0 })}
              InputProps={{
                startAdornment: <InputAdornment position="start">$</InputAdornment>,
              }}
            />

            <TextField
              fullWidth
              label="Target Date"
              type="date"
              value={formData.targetDate}
              onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
              InputLabelProps={{
                shrink: true,
              }}
            />

            <FormControl fullWidth>
              <InputLabel>Priority</InputLabel>
              <Select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as 'low' | 'medium' | 'high' })}
                label="Priority"
              >
                <MenuItem value="low">Low</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="high">High</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFormOpen(false)}>Cancel</Button>
          <Button onClick={handleFormSubmit} variant="contained">
            {selectedGoal ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Contribution Dialog */}
      <Dialog open={contributionOpen} onClose={() => setContributionOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Contribution</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              fullWidth
              label="Amount"
              type="number"
              value={contributionAmount}
              onChange={(e) => setContributionAmount(parseFloat(e.target.value) || 0)}
              InputProps={{
                startAdornment: <InputAdornment position="start">$</InputAdornment>,
              }}
            />
            <TextField
              fullWidth
              label="Description (Optional)"
              value={contributionDescription}
              onChange={(e) => setContributionDescription(e.target.value)}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setContributionOpen(false)}>Cancel</Button>
          <Button onClick={handleContribution} variant="contained" disabled={contributionAmount <= 0}>
            Add Contribution
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Goal</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            This action cannot be undone. All contributions and milestones associated with this goal will also be deleted.
          </Alert>
          <Typography>
            Are you sure you want to delete "<strong>{selectedGoal?.name}</strong>"?
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
        aria-label="add goal"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        onClick={() => setFormOpen(true)}
      >
        <Add />
      </Fab>
    </Box>
  );
};

export default Goals;