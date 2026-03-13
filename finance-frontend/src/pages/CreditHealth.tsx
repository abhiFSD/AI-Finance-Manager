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
  Alert,
  Paper,
  LinearProgress,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  Add,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  Warning,
  Info,
  Lightbulb,
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import {
  creditHealthService,
  CreditHealthRecord,
  CreditHealthStats,
  CreditSuggestion,
  CreditHealthFormData,
} from '../services/credit-health.service';
import { formatDate } from '../utils/formatters';
import LoadingSpinner from '../components/LoadingSpinner';

const getScoreColor = (score: number): string => {
  if (score < 600) return '#f44336'; // red
  if (score < 750) return '#ff9800'; // orange/yellow
  return '#4caf50'; // green
};

const getScoreCategory = (score: number): string => {
  if (score < 600) return 'Poor';
  if (score < 650) return 'Fair';
  if (score < 750) return 'Good';
  if (score < 800) return 'Very Good';
  return 'Excellent';
};

const CreditHealth: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<CreditHealthStats | null>(null);
  const [history, setHistory] = useState<CreditHealthRecord[]>([]);
  const [suggestions, setSuggestions] = useState<CreditSuggestion[]>([]);

  // Modal states
  const [formOpen, setFormOpen] = useState(false);

  // Form data
  const [formData, setFormData] = useState<CreditHealthFormData>({
    creditScore: 0,
    source: 'CIBIL',
    reportDate: new Date().toISOString().split('T')[0],
    creditUtilization: undefined,
    totalAccounts: undefined,
    activeAccounts: undefined,
    onTimePayments: undefined,
    missedPayments: undefined,
    oldestAccountAge: undefined,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      await Promise.all([
        loadStats(),
        loadHistory(),
        loadSuggestions(),
      ]);
    } catch (error) {
      setError('Failed to load credit health data');
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response: any = await creditHealthService.getLatestCreditHealth();
      const raw: any = response.data?.data || response.data;
      // Map API fields to our interface
      const mapped: CreditHealthStats = {
        currentScore: Number(raw.creditScore) || 0,
        previousScore: Number(raw.previousScore) || 0,
        scoreChange: Number(raw.scoreChange) || 0,
        creditUtilization: Number(raw.creditUtilization) || 0,
        onTimePayments: Number(raw.onTimePayments) || 0,
        missedPayments: Number(raw.missedPayments) || 0,
        oldestAccountAge: Number(raw.oldestAccountAge) || 0,
        totalAccounts: Number(raw.totalAccounts) || 0,
        activeAccounts: Number(raw.activeAccounts) || 0,
      };
      setStats(mapped);
    } catch (error) {
      console.log('No credit health stats available yet');
    }
  };

  const loadHistory = async () => {
    try {
      const response = await creditHealthService.getCreditHealthRecords();
      const historyData: any = response.data;
      setHistory(Array.isArray(historyData) ? historyData : (historyData?.data || []));
    } catch (error) {
      console.log('No credit history available yet');
    }
  };

  const loadSuggestions = async () => {
    try {
      const response = await creditHealthService.getSuggestions();
      const suggestionsData: any = response.data;
      setSuggestions(Array.isArray(suggestionsData) ? suggestionsData : (suggestionsData?.data || []));
    } catch (error) {
      console.log('No suggestions available yet');
    }
  };

  const handleFormSubmit = async () => {
    try {
      await creditHealthService.createCreditHealthRecord(formData);
      loadData();
      setFormOpen(false);
      resetForm();
    } catch (error) {
      setError('Failed to add credit score');
      console.error('Error adding credit score:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      creditScore: 0,
      source: 'CIBIL',
      reportDate: new Date().toISOString().split('T')[0],
      creditUtilization: undefined,
      totalAccounts: undefined,
      activeAccounts: undefined,
      onTimePayments: undefined,
      missedPayments: undefined,
      oldestAccountAge: undefined,
    });
  };

  const prepareChartData = () => {
    return history
      .slice()
      .sort((a, b) => new Date(a.reportDate).getTime() - new Date(b.reportDate).getTime())
      .map(record => ({
        date: formatDate(record.reportDate),
        score: record.creditScore,
      }));
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading credit health..." />;
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          Credit Health
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setFormOpen(true)}
        >
          Add Score
        </Button>
      </Box>

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {stats ? (
        <>
          {/* Credit Score Display */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, md: 4 }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" fontWeight="bold" gutterBottom>
                    Current Credit Score
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', my: 3 }}>
                    <Box
                      sx={{
                        width: 200,
                        height: 200,
                        borderRadius: '50%',
                        border: `12px solid ${getScoreColor(stats.currentScore)}`,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Typography variant="h2" fontWeight="bold" color={getScoreColor(stats.currentScore)}>
                        {stats.currentScore}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        out of 900
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ textAlign: 'center' }}>
                    <Chip
                      label={getScoreCategory(stats.currentScore)}
                      sx={{
                        bgcolor: getScoreColor(stats.currentScore),
                        color: 'white',
                        fontWeight: 'bold',
                        mb: 2,
                      }}
                    />
                    {stats.scoreChange !== 0 && (
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                        {stats.scoreChange > 0 ? (
                          <TrendingUp sx={{ color: 'success.main' }} />
                        ) : (
                          <TrendingDown sx={{ color: 'error.main' }} />
                        )}
                        <Typography
                          variant="body2"
                          color={stats.scoreChange > 0 ? 'success.main' : 'error.main'}
                          fontWeight="bold"
                        >
                          {Math.abs(stats.scoreChange)} points{' '}
                          {stats.scoreChange > 0 ? 'increase' : 'decrease'} from last update
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Credit Utilization */}
            <Grid size={{ xs: 12, md: 4 }}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="h6" fontWeight="bold" gutterBottom>
                    Credit Utilization
                  </Typography>
                  <Box sx={{ my: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" color="textSecondary">
                        Current Usage
                      </Typography>
                      <Typography variant="h6" fontWeight="bold" color={stats.creditUtilization > 30 ? 'error.main' : 'success.main'}>
                        {stats.creditUtilization.toFixed(1)}%
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={stats.creditUtilization}
                      sx={{
                        height: 12,
                        borderRadius: 6,
                        bgcolor: 'grey.300',
                        '& .MuiLinearProgress-bar': {
                          borderRadius: 6,
                          bgcolor: stats.creditUtilization > 30 ? 'error.main' : 'success.main',
                        },
                      }}
                    />
                    <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
                      {stats.creditUtilization > 30 
                        ? 'High utilization may negatively impact your score' 
                        : 'Good! Keep utilization below 30%'}
                    </Typography>
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" color="textSecondary">
                        Total Accounts
                      </Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {stats.totalAccounts}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="textSecondary">
                        Active Accounts
                      </Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {stats.activeAccounts}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Payment History */}
            <Grid size={{ xs: 12, md: 4 }}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="h6" fontWeight="bold" gutterBottom>
                    Payment History
                  </Typography>
                  <Box sx={{ my: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                      <CheckCircle sx={{ color: 'success.main', fontSize: 48, mr: 2 }} />
                      <Box>
                        <Typography variant="h4" fontWeight="bold" color="success.main">
                          {stats.onTimePayments}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          On-time Payments
                        </Typography>
                      </Box>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                      <Warning sx={{ color: 'error.main', fontSize: 48, mr: 2 }} />
                      <Box>
                        <Typography variant="h4" fontWeight="bold" color="error.main">
                          {stats.missedPayments}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          Missed Payments
                        </Typography>
                      </Box>
                    </Box>

                    <Divider sx={{ my: 2 }} />

                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="textSecondary">
                        Oldest Account Age
                      </Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {stats.oldestAccountAge} years
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Suggestions Section */}
          {suggestions.length > 0 && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  <Lightbulb sx={{ verticalAlign: 'middle', mr: 1, color: 'warning.main' }} />
                  Tips to Improve Your Credit Score
                </Typography>
                <List>
                  {suggestions
                    .sort((a, b) => b.priority - a.priority)
                    .map((suggestion, index) => (
                      <ListItem key={index} sx={{ bgcolor: 'background.default', mb: 1, borderRadius: 2 }}>
                        <ListItemIcon>
                          <Chip
                            label={suggestion.impact.toUpperCase()}
                            size="small"
                            color={
                              suggestion.impact === 'high' ? 'error' :
                              suggestion.impact === 'medium' ? 'warning' : 'info'
                            }
                          />
                        </ListItemIcon>
                        <ListItemText
                          primary={<strong>{suggestion.category}</strong>}
                          secondary={suggestion.suggestion}
                        />
                      </ListItem>
                    ))}
                </List>
              </CardContent>
            </Card>
          )}

          {/* History Chart */}
          {history.length > 1 && (
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Credit Score History
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={prepareChartData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis domain={[300, 900]} />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke="#2196f3"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                      name="Credit Score"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <Paper sx={{ p: 6, textAlign: 'center' }}>
          <Info sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="textSecondary" gutterBottom>
            No Credit Health Data
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
            Add your first credit score to start tracking your credit health
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setFormOpen(true)}
          >
            Add Score
          </Button>
        </Paper>
      )}

      {/* Add Score Form Dialog */}
      <Dialog open={formOpen} onClose={() => setFormOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Credit Score</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              fullWidth
              label="Credit Score"
              type="number"
              value={formData.creditScore || ''}
              onChange={(e) => setFormData({ ...formData, creditScore: parseInt(e.target.value) || 0 })}
              helperText="Range: 300-900"
              inputProps={{ min: 300, max: 900 }}
            />

            <FormControl fullWidth>
              <InputLabel>Source</InputLabel>
              <Select
                value={formData.source}
                onChange={(e) => setFormData({ ...formData, source: e.target.value as any })}
                label="Source"
              >
                <MenuItem value="CIBIL">CIBIL</MenuItem>
                <MenuItem value="EXPERIAN">Experian</MenuItem>
                <MenuItem value="EQUIFAX">Equifax</MenuItem>
                <MenuItem value="HIGHMARK">CRIF High Mark</MenuItem>
                <MenuItem value="MANUAL">Manual Entry</MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Report Date"
              type="date"
              value={formData.reportDate}
              onChange={(e) => setFormData({ ...formData, reportDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />

            <Divider />

            <Typography variant="subtitle2" color="textSecondary">
              Additional Details (Optional)
            </Typography>

            <TextField
              fullWidth
              label="Credit Utilization (%)"
              type="number"
              value={formData.creditUtilization || ''}
              onChange={(e) => setFormData({ ...formData, creditUtilization: parseFloat(e.target.value) || undefined })}
              inputProps={{ min: 0, max: 100, step: 0.1 }}
            />

            <Grid container spacing={2}>
              <Grid size={{ xs: 6 }}>
                <TextField
                  fullWidth
                  label="Total Accounts"
                  type="number"
                  value={formData.totalAccounts || ''}
                  onChange={(e) => setFormData({ ...formData, totalAccounts: parseInt(e.target.value) || undefined })}
                />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <TextField
                  fullWidth
                  label="Active Accounts"
                  type="number"
                  value={formData.activeAccounts || ''}
                  onChange={(e) => setFormData({ ...formData, activeAccounts: parseInt(e.target.value) || undefined })}
                />
              </Grid>
            </Grid>

            <Grid container spacing={2}>
              <Grid size={{ xs: 6 }}>
                <TextField
                  fullWidth
                  label="On-time Payments"
                  type="number"
                  value={formData.onTimePayments || ''}
                  onChange={(e) => setFormData({ ...formData, onTimePayments: parseInt(e.target.value) || undefined })}
                />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <TextField
                  fullWidth
                  label="Missed Payments"
                  type="number"
                  value={formData.missedPayments || ''}
                  onChange={(e) => setFormData({ ...formData, missedPayments: parseInt(e.target.value) || undefined })}
                />
              </Grid>
            </Grid>

            <TextField
              fullWidth
              label="Oldest Account Age (years)"
              type="number"
              value={formData.oldestAccountAge || ''}
              onChange={(e) => setFormData({ ...formData, oldestAccountAge: parseInt(e.target.value) || undefined })}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFormOpen(false)}>Cancel</Button>
          <Button onClick={handleFormSubmit} variant="contained" disabled={formData.creditScore < 300 || formData.creditScore > 900}>
            Add Score
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CreditHealth;
