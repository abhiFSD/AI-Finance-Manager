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
  LinearProgress,
  Alert,
  Paper,
  IconButton,
  InputAdornment,
  Divider,
} from '@mui/material';
import {
  Add,
  AccountBalance,
  TrendingDown,
  Percent,
  Payment,
  Edit,
  Delete,
  MonetizationOn,
} from '@mui/icons-material';
import {
  loanService,
  Loan,
  LoanStats,
  PayoffStrategy,
  LoanFormData,
  PaymentFormData,
} from '../services/loan.service';
import { formatCurrency, formatDate, formatPercentage } from '../utils/formatters';
import LoadingSpinner from '../components/LoadingSpinner';

const LOAN_TYPE_COLORS: Record<string, string> = {
  HOME: '#2196f3',
  CAR: '#4caf50',
  PERSONAL: '#ff9800',
  EDUCATION: '#9c27b0',
  BUSINESS: '#607d8b',
  OTHER: '#9e9e9e',
};

const Loans: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [stats, setStats] = useState<LoanStats | null>(null);
  const [strategy, setStrategy] = useState<PayoffStrategy | null>(null);

  // Modal states
  const [formOpen, setFormOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);

  // Form data
  const [formData, setFormData] = useState<LoanFormData>({
    name: '',
    type: 'PERSONAL',
    principalAmount: 0,
    interestRate: 0,
    tenure: 12,
    startDate: new Date().toISOString().split('T')[0],
    lender: '',
  });

  const [paymentData, setPaymentData] = useState<PaymentFormData>({
    amount: 0,
    paymentDate: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      await Promise.all([
        loadLoans(),
        loadStats(),
        loadStrategy(),
      ]);
    } catch (error) {
      setError('Failed to load loan data');
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadLoans = async () => {
    const response = await loanService.getLoans();
    setLoans(Array.isArray(response.data) ? response.data : (response.data as any)?.data || []);
  };

  const loadStats = async () => {
    const response = await loanService.getLoanStats();
    setStats(response.data as LoanStats);
  };

  const loadStrategy = async () => {
    try {
      const response = await loanService.getPayoffStrategy();
      setStrategy(response.data as PayoffStrategy);
    } catch (error) {
      console.log('No payoff strategy available (might not have loans)');
    }
  };

  const handleFormSubmit = async () => {
    try {
      if (selectedLoan) {
        await loanService.updateLoan(selectedLoan.id, formData);
      } else {
        await loanService.createLoan(formData);
      }
      loadData();
      setFormOpen(false);
      resetForm();
    } catch (error) {
      setError('Failed to save loan');
      console.error('Error saving loan:', error);
    }
  };

  const handlePaymentSubmit = async () => {
    if (selectedLoan) {
      try {
        await loanService.makePayment(selectedLoan.id, paymentData);
        loadData();
        setPaymentOpen(false);
        setPaymentData({
          amount: 0,
          paymentDate: new Date().toISOString().split('T')[0],
        });
      } catch (error) {
        setError('Failed to record payment');
        console.error('Error recording payment:', error);
      }
    }
  };

  const handleEdit = (loan: Loan) => {
    setSelectedLoan(loan);
    setFormData({
      name: loan.name,
      type: loan.type,
      principalAmount: loan.principalAmount,
      interestRate: loan.interestRate,
      tenure: loan.tenure,
      startDate: loan.startDate.split('T')[0],
      lender: loan.lender,
    });
    setFormOpen(true);
  };

  const handleDelete = (loan: Loan) => {
    setSelectedLoan(loan);
    setDeleteDialogOpen(true);
  };

  const handlePayment = (loan: Loan) => {
    setSelectedLoan(loan);
    setPaymentData({
      amount: loan.emiAmount,
      paymentDate: new Date().toISOString().split('T')[0],
    });
    setPaymentOpen(true);
  };

  const confirmDelete = async () => {
    if (selectedLoan) {
      try {
        await loanService.deleteLoan(selectedLoan.id);
        loadData();
        setDeleteDialogOpen(false);
        setSelectedLoan(null);
      } catch (error) {
        setError('Failed to delete loan');
        console.error('Error deleting loan:', error);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'PERSONAL',
      principalAmount: 0,
      interestRate: 0,
      tenure: 12,
      startDate: new Date().toISOString().split('T')[0],
      lender: '',
    });
    setSelectedLoan(null);
  };

  const calculateProgress = (loan: Loan) => {
    const paid = loan.principalAmount - loan.outstandingBalance;
    const percentage = (paid / loan.principalAmount) * 100;
    return percentage;
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading loans..." />;
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          Debt Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setFormOpen(true)}
        >
          Add Loan
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
                      Total Debt
                    </Typography>
                    <Typography variant="h5" fontWeight="bold" color="error.main">
                      {formatCurrency(stats.totalDebt)}
                    </Typography>
                  </Box>
                  <TrendingDown sx={{ color: 'error.main', fontSize: 40 }} />
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
                      Monthly EMI Total
                    </Typography>
                    <Typography variant="h5" fontWeight="bold">
                      {formatCurrency(stats.monthlyEmiTotal || 0)}
                    </Typography>
                  </Box>
                  <Payment sx={{ color: 'warning.main', fontSize: 40 }} />
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
                      Avg Interest Rate
                    </Typography>
                    <Typography variant="h5" fontWeight="bold">
                      {formatPercentage(stats.avgInterestRate / 100)}
                    </Typography>
                  </Box>
                  <Percent sx={{ color: 'info.main', fontSize: 40 }} />
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
                      Active Loans
                    </Typography>
                    <Typography variant="h5" fontWeight="bold">
                      {stats.activeLoans}
                    </Typography>
                  </Box>
                  <AccountBalance sx={{ color: 'primary.main', fontSize: 40 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Loan Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {loans.map((loan) => (
          <Grid size={{ xs: 12, md: 6, lg: 4 }} key={loan.id}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box>
                    <Typography variant="h6" fontWeight="bold">
                      {loan.name}
                    </Typography>
                    <Chip
                      label={loan.type}
                      size="small"
                      sx={{
                        bgcolor: LOAN_TYPE_COLORS[loan.type],
                        color: 'white',
                        mt: 0.5,
                      }}
                    />
                  </Box>
                  <Box>
                    <IconButton size="small" onClick={() => handleEdit(loan)}>
                      <Edit fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleDelete(loan)}>
                      <Delete fontSize="small" color="error" />
                    </IconButton>
                  </Box>
                </Box>

                <Divider sx={{ my: 2 }} />

                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" color="textSecondary">
                      Outstanding Balance
                    </Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {formatCurrency(loan.outstandingBalance)}
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" color="textSecondary">
                      Interest Rate
                    </Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {formatPercentage(loan.interestRate / 100)}
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" color="textSecondary">
                      Monthly EMI
                    </Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {formatCurrency(loan.emiAmount)}
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" color="textSecondary">
                      Next Payment
                    </Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {formatDate(loan.nextPaymentDate)}
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" color="textSecondary">
                      Lender
                    </Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {loan.lender}
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" color="textSecondary">
                      Progress
                    </Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {formatPercentage(calculateProgress(loan) / 100)}
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={calculateProgress(loan)}
                    sx={{
                      height: 8,
                      borderRadius: 4,
                      bgcolor: 'grey.300',
                      '& .MuiLinearProgress-bar': {
                        borderRadius: 4,
                        bgcolor: 'success.main',
                      },
                    }}
                  />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                    <Typography variant="caption" color="textSecondary">
                      Paid: {formatCurrency(loan.principalAmount - loan.outstandingBalance)}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      Total: {formatCurrency(loan.principalAmount)}
                    </Typography>
                  </Box>
                </Box>

                <Button
                  fullWidth
                  variant="contained"
                  startIcon={<MonetizationOn />}
                  onClick={() => handlePayment(loan)}
                >
                  Record Payment
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}

        {loans.length === 0 && (
          <Grid size={{ xs: 12 }}>
            <Paper sx={{ p: 6, textAlign: 'center' }}>
              <AccountBalance sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="textSecondary" gutterBottom>
                No loans yet
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
                Track your loans to better manage your debt
              </Typography>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => setFormOpen(true)}
              >
                Add Loan
              </Button>
            </Paper>
          </Grid>
        )}
      </Grid>

      {/* Payoff Strategy */}
      {strategy && loans.length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Debt Payoff Strategy
            </Typography>
            <Grid container spacing={3} sx={{ mt: 1 }}>
              {/* Avalanche Strategy */}
              <Grid size={{ xs: 12, md: 6 }}>
                <Paper sx={{ p: 2, bgcolor: 'background.default', border: strategy.recommendation === 'avalanche' ? '2px solid' : 'none', borderColor: 'primary.main' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6" fontWeight="bold">
                      Avalanche Method
                    </Typography>
                    {strategy.recommendation === 'avalanche' && (
                      <Chip label="Recommended" color="primary" size="small" />
                    )}
                  </Box>
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    Pay off highest interest rate loans first
                  </Typography>

                  <Box sx={{ my: 2 }}>
                    <Typography variant="body2" fontWeight="bold" gutterBottom>
                      Payoff Order:
                    </Typography>
                    {strategy.avalanche.payoffOrder.map((item, index) => (
                      <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Chip label={index + 1} size="small" sx={{ mr: 1, minWidth: 32 }} />
                        <Typography variant="body2">
                          {item.loanName} ({item.monthsToPayoff} months)
                        </Typography>
                      </Box>
                    ))}
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" color="textSecondary">
                      Total Interest Paid:
                    </Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {formatCurrency(strategy.avalanche.totalInterestPaid)}
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="textSecondary">
                      Time to Payoff:
                    </Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {strategy.avalanche.totalMonths} months
                    </Typography>
                  </Box>
                </Paper>
              </Grid>

              {/* Snowball Strategy */}
              <Grid size={{ xs: 12, md: 6 }}>
                <Paper sx={{ p: 2, bgcolor: 'background.default', border: strategy.recommendation === 'snowball' ? '2px solid' : 'none', borderColor: 'primary.main' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6" fontWeight="bold">
                      Snowball Method
                    </Typography>
                    {strategy.recommendation === 'snowball' && (
                      <Chip label="Recommended" color="primary" size="small" />
                    )}
                  </Box>
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    Pay off smallest balance loans first
                  </Typography>

                  <Box sx={{ my: 2 }}>
                    <Typography variant="body2" fontWeight="bold" gutterBottom>
                      Payoff Order:
                    </Typography>
                    {strategy.snowball.payoffOrder.map((item, index) => (
                      <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Chip label={index + 1} size="small" sx={{ mr: 1, minWidth: 32 }} />
                        <Typography variant="body2">
                          {item.loanName} ({item.monthsToPayoff} months)
                        </Typography>
                      </Box>
                    ))}
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" color="textSecondary">
                      Total Interest Paid:
                    </Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {formatCurrency(strategy.snowball.totalInterestPaid)}
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="textSecondary">
                      Time to Payoff:
                    </Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {strategy.snowball.totalMonths} months
                    </Typography>
                  </Box>
                </Paper>
              </Grid>
            </Grid>

            {strategy.recommendation && (
              <Alert severity="info" sx={{ mt: 2 }}>
                <strong>{strategy.recommendation === 'avalanche' ? 'Avalanche' : 'Snowball'}</strong> method is recommended as it will save you{' '}
                {formatCurrency(Math.abs(strategy.avalanche.totalInterestPaid - strategy.snowball.totalInterestPaid))} in interest charges.
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Loan Form Dialog */}
      <Dialog open={formOpen} onClose={() => setFormOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedLoan ? 'Edit Loan' : 'Add New Loan'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              fullWidth
              label="Loan Name"
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
                <MenuItem value="HOME">Home Loan</MenuItem>
                <MenuItem value="CAR">Car Loan</MenuItem>
                <MenuItem value="PERSONAL">Personal Loan</MenuItem>
                <MenuItem value="EDUCATION">Education Loan</MenuItem>
                <MenuItem value="BUSINESS">Business Loan</MenuItem>
                <MenuItem value="OTHER">Other</MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Principal Amount"
              type="number"
              value={formData.principalAmount}
              onChange={(e) => setFormData({ ...formData, principalAmount: parseFloat(e.target.value) || 0 })}
              InputProps={{
                startAdornment: <InputAdornment position="start">₹</InputAdornment>,
              }}
            />

            <TextField
              fullWidth
              label="Interest Rate (% per year)"
              type="number"
              value={formData.interestRate}
              onChange={(e) => setFormData({ ...formData, interestRate: parseFloat(e.target.value) || 0 })}
              InputProps={{
                endAdornment: <InputAdornment position="end">%</InputAdornment>,
              }}
            />

            <TextField
              fullWidth
              label="Tenure (months)"
              type="number"
              value={formData.tenure}
              onChange={(e) => setFormData({ ...formData, tenure: parseInt(e.target.value) || 0 })}
            />

            <TextField
              fullWidth
              label="Start Date"
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />

            <TextField
              fullWidth
              label="Lender"
              value={formData.lender}
              onChange={(e) => setFormData({ ...formData, lender: e.target.value })}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFormOpen(false)}>Cancel</Button>
          <Button onClick={handleFormSubmit} variant="contained">
            {selectedLoan ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Record Payment Dialog */}
      <Dialog open={paymentOpen} onClose={() => setPaymentOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Record Payment</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Alert severity="info">
              Recording payment for: <strong>{selectedLoan?.name}</strong>
            </Alert>

            <TextField
              fullWidth
              label="Payment Amount"
              type="number"
              value={paymentData.amount}
              onChange={(e) => setPaymentData({ ...paymentData, amount: parseFloat(e.target.value) || 0 })}
              InputProps={{
                startAdornment: <InputAdornment position="start">₹</InputAdornment>,
              }}
            />

            <TextField
              fullWidth
              label="Payment Date"
              type="date"
              value={paymentData.paymentDate}
              onChange={(e) => setPaymentData({ ...paymentData, paymentDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPaymentOpen(false)}>Cancel</Button>
          <Button onClick={handlePaymentSubmit} variant="contained">
            Record Payment
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Loan</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            This action cannot be undone.
          </Alert>
          <Typography>
            Are you sure you want to delete "<strong>{selectedLoan?.name}</strong>"?
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

export default Loans;
