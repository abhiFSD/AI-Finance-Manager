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
  ListItemIcon,
  ListItemText,
  InputAdornment,
} from '@mui/material';
import {
  Add,
  MoreVert,
  Edit,
  Delete,
  CreditCard,
  Payment,
  Warning,
  Star,
  TrendingUp,
  Visibility,
  VisibilityOff,
  Refresh,
  Search,
  FilterList,
  AccountBalance,
  LocalAtm,
} from '@mui/icons-material';
import { 
  CreditCard as CreditCardType, 
  CreditCardFormData,
  CreditCardPayment,
  Transaction
} from '../types';
import { creditCardService, CreditCardFilters, PaymentFormData } from '../services/creditcard.service';
import { formatCurrency, formatDate, formatPercentage } from '../utils/formatters';
import LoadingSpinner from '../components/LoadingSpinner';

const CARD_TYPE_COLORS: Record<string, string> = {
  visa: '#1a1f71',
  mastercard: '#eb001b',
  amex: '#006fcf',
  discover: '#ff6000',
  other: '#666666',
  VISA: '#1a1f71',
  MASTERCARD: '#eb001b',
  AMEX: '#006fcf',
  DISCOVER: '#ff6000',
  OTHER: '#666666',
};

const REWARD_TYPE_COLORS = {
  cashback: '#4caf50',
  points: '#2196f3',
  miles: '#ff9800',
  none: '#9e9e9e',
};

const CreditCards: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cards, setCards] = useState<CreditCardType[]>([]);
  const [filteredCards, setFilteredCards] = useState<CreditCardType[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<CreditCardFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCard, setSelectedCard] = useState<CreditCardType | null>(null);
  const [cardStats, setCardStats] = useState<any>(null);
  const [hideBalances, setHideBalances] = useState(false);

  // Modal states
  const [formOpen, setFormOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);

  // Form data
  const [formData, setFormData] = useState<CreditCardFormData>({
    name: '',
    lastFourDigits: '',
    creditLimit: 0,
    currentBalance: 0,
    apr: 0,
    minimumPayment: 0,
    paymentDueDate: '',
    issuer: '',
    cardType: 'visa',
    rewardType: 'none',
    annualFee: 0,
  });

  const [paymentData, setPaymentData] = useState<PaymentFormData>({
    amount: 0,
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'bank_transfer',
    confirmationNumber: '',
  });

  useEffect(() => {
    loadCards();
    loadCardStats();
  }, [filters]);

  useEffect(() => {
    filterCards();
  }, [cards, searchTerm, filters]);

  const loadCards = async () => {
    try {
      setIsLoading(true);
      const response = await creditCardService.getCreditCards(filters);
      // Handle various response structures: { data: [...] }, { data: { data: [...] } }, or [...]
      const resData = response.data;
      let cardsList: any[] = [];
      if (Array.isArray(resData)) {
        cardsList = resData;
      } else if (resData && typeof resData === 'object') {
        // Check for nested data.data structure first (API returns { success, data: { data: [...], pagination } })
        if (Array.isArray((resData as any).data?.data)) {
          cardsList = (resData as any).data.data;
        } else if (Array.isArray((resData as any).data)) {
          cardsList = (resData as any).data;
        } else if (Array.isArray((resData as any).creditCards)) {
          cardsList = (resData as any).creditCards;
        }
      }
      setCards(cardsList);
      setError(null);
    } catch (error) {
      setError('Failed to load credit cards');
      console.error('Error loading cards:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadCardStats = async () => {
    try {
      const response = await creditCardService.getCreditCardStats();
      console.log('Card stats response:', response);
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
      
      setCardStats({
        totalCards: Number(summary.totalCards) || 0,
        totalBalance: Number(summary.totalBalance) || 0,
        totalAvailableCredit: Number(summary.totalAvailableCredit) || 0,
        averageUtilization: Number(summary.avgUtilization || summary.averageUtilization) || 0,
        totalRewards: Number(summary.totalRewards) || 0,
      });
    } catch (error) {
      console.error('Error loading card stats:', error);
      // Set default stats on error
      setCardStats({
        totalCards: 0,
        totalBalance: 0,
        totalAvailableCredit: 0,
        averageUtilization: 0,
        totalRewards: 0,
      });
    }
  };

  const filterCards = () => {
    let filtered = [...cards];

    if (searchTerm) {
      filtered = filtered.filter(card =>
        card.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        card.issuer.toLowerCase().includes(searchTerm.toLowerCase()) ||
        card.lastFourDigits.includes(searchTerm)
      );
    }

    if (filters.cardType) {
      filtered = filtered.filter(card => card.cardType === filters.cardType);
    }

    if (filters.issuer) {
      filtered = filtered.filter(card => card.issuer.toLowerCase().includes(filters.issuer!.toLowerCase()));
    }

    if (filters.rewardType) {
      filtered = filtered.filter(card => card.rewardType === filters.rewardType);
    }

    if (filters.isActive !== undefined) {
      filtered = filtered.filter(card => card.isActive === filters.isActive);
    }

    setFilteredCards(filtered);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, card: CreditCardType) => {
    event.stopPropagation();
    setSelectedCard(card);
    setMenuAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
  };

  const handleCardClick = (card: CreditCardType) => {
    setSelectedCard(card);
    setDetailsOpen(true);
  };

  const handleEdit = () => {
    if (selectedCard) {
      setFormData({
        name: selectedCard.name,
        lastFourDigits: selectedCard.lastFourDigits,
        creditLimit: selectedCard.creditLimit,
        currentBalance: selectedCard.currentBalance,
        apr: selectedCard.apr,
        minimumPayment: selectedCard.minimumPayment,
        paymentDueDate: selectedCard.paymentDueDate.split('T')[0],
        issuer: selectedCard.issuer,
        cardType: selectedCard.cardType,
        rewardType: selectedCard.rewardType || 'none',
        annualFee: selectedCard.annualFee,
      });
      setFormOpen(true);
    }
    handleMenuClose();
  };

  const handleDelete = () => {
    setDeleteDialogOpen(true);
    handleMenuClose();
  };

  const handleMakePayment = () => {
    if (selectedCard) {
      setPaymentData({
        amount: selectedCard.minimumPayment,
        paymentDate: new Date().toISOString().split('T')[0],
        paymentMethod: 'bank_transfer',
        confirmationNumber: '',
      });
      setPaymentOpen(true);
    }
    handleMenuClose();
  };

  const confirmDelete = async () => {
    if (selectedCard) {
      try {
        await creditCardService.deleteCreditCard(selectedCard.id);
        loadCards();
        setDeleteDialogOpen(false);
        setSelectedCard(null);
      } catch (error) {
        setError('Failed to delete credit card');
        console.error('Error deleting card:', error);
      }
    }
  };

  const handleFormSubmit = async () => {
    try {
      if (selectedCard) {
        await creditCardService.updateCreditCard(selectedCard.id, formData);
      } else {
        await creditCardService.createCreditCard(formData);
      }

      loadCards();
      setFormOpen(false);
      resetForm();
    } catch (error) {
      setError('Failed to save credit card');
      console.error('Error saving card:', error);
    }
  };

  const handlePaymentSubmit = async () => {
    if (selectedCard) {
      try {
        await creditCardService.makePayment(selectedCard.id, paymentData);
        loadCards();
        loadCardStats();
        setPaymentOpen(false);
        setPaymentData({
          amount: 0,
          paymentDate: new Date().toISOString().split('T')[0],
          paymentMethod: 'bank_transfer',
          confirmationNumber: '',
        });
      } catch (error) {
        setError('Failed to process payment');
        console.error('Error processing payment:', error);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      lastFourDigits: '',
      creditLimit: 0,
      currentBalance: 0,
      apr: 0,
      minimumPayment: 0,
      paymentDueDate: '',
      issuer: '',
      cardType: 'visa',
      rewardType: 'none',
      annualFee: 0,
    });
    setSelectedCard(null);
  };

  const clearFilters = () => {
    setFilters({});
    setSearchTerm('');
  };

  const getUtilizationPercentage = (card: CreditCardType) => {
    return Math.min((card.currentBalance / card.creditLimit) * 100, 100);
  };

  const getUtilizationColor = (utilization: number) => {
    if (utilization <= 30) return 'success.main';
    if (utilization <= 70) return 'warning.main';
    return 'error.main';
  };

  const getDaysUntilDue = (dueDate: string | null | undefined) => {
    if (!dueDate) return null;
    try {
      const due = new Date(dueDate);
      if (isNaN(due.getTime())) return null;
      const today = new Date();
      const diffTime = due.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    } catch {
      return null;
    }
  };

  const formatCardType = (type: string) => {
    const cardNetworkMap: Record<string, string> = {
      'visa': 'Visa',
      'mastercard': 'Mastercard',
      'amex': 'American Express',
      'american_express': 'American Express',
      'AMERICAN_EXPRESS': 'American Express',
      'VISA': 'Visa',
      'MASTERCARD': 'Mastercard',
      'AMEX': 'American Express',
      'discover': 'Discover',
      'DISCOVER': 'Discover',
      'other': 'Other',
      'OTHER': 'Other',
    };
    return cardNetworkMap[type] || type.charAt(0).toUpperCase() + type.slice(1);
  };

  const formatRewardType = (type: string | undefined) => {
    if (!type || type === 'none') return 'No Rewards';
    if (type === 'cashback') return 'Cash Back';
    if (type === 'points') return 'Points';
    if (type === 'miles') return 'Miles';
    return type;
  };

  const cardTypeData = cards.reduce((acc, card) => {
    const type = formatCardType(card.cardType);
    const existing = acc.find(item => item.name === type);
    if (existing) {
      existing.value += 1;
    } else {
      acc.push({
        name: type,
        value: 1,
        color: CARD_TYPE_COLORS[card.cardType],
      });
    }
    return acc;
  }, [] as Array<{ name: string; value: number; color: string }>);

  if (isLoading && cards.length === 0) {
    return <LoadingSpinner message="Loading credit cards..." />;
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          Credit Cards
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={loadCards}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setFormOpen(true)}
          >
            Add Card
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
      {cardStats && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 3 }}>
          <Box sx={{ flexGrow: 1, flexBasis: { xs: '100%', sm: 'calc(50% - 12px)', lg: 'calc(20% - 16px)' } }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="body2" color="textSecondary">
                      Total Cards
                    </Typography>
                    <Typography variant="h5" fontWeight="bold">
                      {cardStats.totalCards}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <IconButton onClick={() => setHideBalances(!hideBalances)} size="small">
                      {hideBalances ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                    <CreditCard sx={{ color: 'primary.main', fontSize: 40 }} />
                  </Box>
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
                      Total Balance
                    </Typography>
                    <Typography variant="h5" fontWeight="bold" color="error.main">
                      {hideBalances ? '••••••' : formatCurrency(cardStats.totalBalance)}
                    </Typography>
                  </Box>
                  <TrendingUp sx={{ color: 'error.main', fontSize: 40 }} />
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
                      Available Credit
                    </Typography>
                    <Typography variant="h5" fontWeight="bold" color="success.main">
                      {hideBalances ? '••••••' : formatCurrency(cardStats.totalAvailableCredit)}
                    </Typography>
                  </Box>
                  <AccountBalance sx={{ color: 'success.main', fontSize: 40 }} />
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
                      Avg Utilization
                    </Typography>
                    <Typography variant="h5" fontWeight="bold" color="warning.main">
                      {formatPercentage(cardStats.averageUtilization / 100)}
                    </Typography>
                  </Box>
                  <LocalAtm sx={{ color: 'warning.main', fontSize: 40 }} />
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
                      Total Rewards
                    </Typography>
                    <Typography variant="h5" fontWeight="bold" color="info.main">
                      {hideBalances ? '••••••' : formatCurrency(cardStats.totalRewards)}
                    </Typography>
                  </Box>
                  <Star sx={{ color: 'info.main', fontSize: 40 }} />
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
                label="Search cards"
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
                    <InputLabel>Card Type</InputLabel>
                    <Select
                      value={filters.cardType || ''}
                      onChange={(e) => setFilters({ ...filters, cardType: e.target.value as any })}
                      label="Card Type"
                    >
                      <MenuItem value="">All Types</MenuItem>
                      <MenuItem value="visa">Visa</MenuItem>
                      <MenuItem value="mastercard">Mastercard</MenuItem>
                      <MenuItem value="amex">American Express</MenuItem>
                      <MenuItem value="discover">Discover</MenuItem>
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

      {/* Cards Grid */}
      {filteredCards.length > 0 ? (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
          {filteredCards.map((card) => {
            const utilization = getUtilizationPercentage(card);
            const daysUntilDue = getDaysUntilDue(card.paymentDueDate);
            const isOverdue = daysUntilDue !== null && daysUntilDue < 0;
            const isDueSoon = daysUntilDue !== null && daysUntilDue <= 7 && daysUntilDue >= 0;

            return (
              <Box key={card.id} sx={{ flexGrow: 1, flexBasis: { xs: '100%', sm: 'calc(50% - 12px)', lg: 'calc(33.333% - 16px)' } }}>
                <Card
                  sx={{
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    background: `linear-gradient(135deg, ${CARD_TYPE_COLORS[card.cardType] || CARD_TYPE_COLORS.other}, ${CARD_TYPE_COLORS[card.cardType] || CARD_TYPE_COLORS.other}dd)`,
                    color: 'white',
                    '&:hover': {
                      boxShadow: 4,
                      transform: 'translateY(-2px)',
                    },
                  }}
                  onClick={() => handleCardClick(card)}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Box>
                        <Typography variant="h6" fontWeight="bold" sx={{ color: 'white' }}>
                          {card.name}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                          {card.issuer}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {(isOverdue || isDueSoon) && (
                          <Warning sx={{ color: isOverdue ? 'error.light' : 'warning.light' }} />
                        )}
                        <IconButton
                          onClick={(e) => handleMenuOpen(e, card)}
                          size="small"
                          sx={{ color: 'white' }}
                        >
                          <MoreVert />
                        </IconButton>
                      </Box>
                    </Box>

                    <Box sx={{ mb: 2 }}>
                      <Typography variant="h4" fontWeight="bold" sx={{ color: 'white', letterSpacing: 2 }}>
                        •••• •••• •••• {card.lastFourDigits}
                      </Typography>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                          {formatCardType(card.cardType)}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                          {card.rewardType && card.rewardType !== 'none' && (
                            <Chip
                              size="small"
                              label={formatRewardType(card.rewardType)}
                              sx={{ 
                                bgcolor: REWARD_TYPE_COLORS[card.rewardType],
                                color: 'white',
                                fontSize: '0.75rem',
                              }}
                            />
                          )}
                        </Typography>
                      </Box>
                    </Box>

                    <Divider sx={{ my: 2, bgcolor: 'rgba(255,255,255,0.3)' }} />

                    <Box sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                          Balance / Limit
                        </Typography>
                        <Typography variant="body2" fontWeight="bold" sx={{ color: 'white' }}>
                          {hideBalances ? '••••••' : `${formatCurrency(card.currentBalance)} / ${formatCurrency(card.creditLimit)}`}
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={utilization}
                        sx={{
                          height: 6,
                          borderRadius: 3,
                          bgcolor: 'rgba(255,255,255,0.3)',
                          '& .MuiLinearProgress-bar': {
                            borderRadius: 3,
                            bgcolor: utilization > 70 ? '#ff5252' : utilization > 30 ? '#ffb74d' : '#66bb6a',
                          },
                        }}
                      />
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                          Utilization: {formatPercentage(utilization / 100)}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                          Available: {hideBalances ? '••••••' : formatCurrency(card.availableCredit)}
                        </Typography>
                      </Box>
                    </Box>

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box>
                        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                          Due Date
                        </Typography>
                        <Typography variant="body2" fontWeight="bold" sx={{ color: 'white' }}>
                          {card.paymentDueDate ? formatDate(card.paymentDueDate) : 'No due date set'}
                        </Typography>
                        {isOverdue && daysUntilDue !== null && (
                          <Typography variant="body2" sx={{ color: 'error.light' }}>
                            {Math.abs(daysUntilDue)} days overdue
                          </Typography>
                        )}
                        {isDueSoon && daysUntilDue !== null && (
                          <Typography variant="body2" sx={{ color: 'warning.light' }}>
                            Due in {daysUntilDue} days
                          </Typography>
                        )}
                      </Box>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                          Min Payment
                        </Typography>
                        <Typography variant="body2" fontWeight="bold" sx={{ color: 'white' }}>
                          {hideBalances ? '••••••' : formatCurrency(card.minimumPayment)}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Box>
            );
          })}
        </Box>
      ) : (
        <Paper sx={{ p: 6, textAlign: 'center' }}>
          <CreditCard sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="textSecondary" gutterBottom>
            No credit cards found
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
            {searchTerm || Object.keys(filters).length > 0
              ? 'Try adjusting your search or filters'
              : 'Get started by adding your first credit card'}
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setFormOpen(true)}
          >
            Add Card
          </Button>
        </Paper>
      )}

      {/* Action Menu */}
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleMakePayment}>
          <ListItemIcon>
            <Payment fontSize="small" />
          </ListItemIcon>
          <ListItemText>Make Payment</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleEdit}>
          <ListItemIcon>
            <Edit fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
          <ListItemIcon>
            <Delete fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>

      {/* Add/Edit Card Form Dialog */}
      <Dialog open={formOpen} onClose={() => setFormOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedCard ? 'Edit Credit Card' : 'Add New Credit Card'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 1 }}>
            <Box sx={{ flexBasis: { xs: '100%', sm: 'calc(50% - 8px)' } }}>
              <TextField
                fullWidth
                label="Card Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </Box>
            <Box sx={{ flexBasis: { xs: '100%', sm: 'calc(50% - 8px)' } }}>
              <TextField
                fullWidth
                label="Issuer"
                value={formData.issuer}
                onChange={(e) => setFormData({ ...formData, issuer: e.target.value })}
              />
            </Box>
            <Box sx={{ flexBasis: { xs: '100%', sm: 'calc(50% - 8px)' } }}>
              <TextField
                fullWidth
                label="Last 4 Digits"
                value={formData.lastFourDigits}
                onChange={(e) => setFormData({ ...formData, lastFourDigits: e.target.value.slice(0, 4) })}
                inputProps={{ maxLength: 4 }}
              />
            </Box>
            <Box sx={{ flexBasis: { xs: '100%', sm: 'calc(50% - 8px)' } }}>
              <FormControl fullWidth>
                <InputLabel>Card Type</InputLabel>
                <Select
                  value={formData.cardType}
                  onChange={(e) => setFormData({ ...formData, cardType: e.target.value as any })}
                  label="Card Type"
                >
                  <MenuItem value="visa">Visa</MenuItem>
                  <MenuItem value="mastercard">Mastercard</MenuItem>
                  <MenuItem value="amex">American Express</MenuItem>
                  <MenuItem value="discover">Discover</MenuItem>
                  <MenuItem value="other">Other</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ flexBasis: { xs: '100%', sm: 'calc(50% - 8px)' } }}>
              <TextField
                fullWidth
                label="Credit Limit"
                type="number"
                value={formData.creditLimit}
                onChange={(e) => setFormData({ ...formData, creditLimit: parseFloat(e.target.value) || 0 })}
                InputProps={{
                  startAdornment: <InputAdornment position="start">$</InputAdornment>,
                }}
              />
            </Box>
            <Box sx={{ flexBasis: { xs: '100%', sm: 'calc(50% - 8px)' } }}>
              <TextField
                fullWidth
                label="Current Balance"
                type="number"
                value={formData.currentBalance}
                onChange={(e) => setFormData({ ...formData, currentBalance: parseFloat(e.target.value) || 0 })}
                InputProps={{
                  startAdornment: <InputAdornment position="start">$</InputAdornment>,
                }}
              />
            </Box>
            <Box sx={{ flexBasis: { xs: '100%', sm: 'calc(50% - 8px)' } }}>
              <TextField
                fullWidth
                label="APR (%)"
                type="number"
                value={formData.apr}
                onChange={(e) => setFormData({ ...formData, apr: parseFloat(e.target.value) || 0 })}
                InputProps={{
                  endAdornment: <InputAdornment position="end">%</InputAdornment>,
                }}
              />
            </Box>
            <Box sx={{ flexBasis: { xs: '100%', sm: 'calc(50% - 8px)' } }}>
              <TextField
                fullWidth
                label="Minimum Payment"
                type="number"
                value={formData.minimumPayment}
                onChange={(e) => setFormData({ ...formData, minimumPayment: parseFloat(e.target.value) || 0 })}
                InputProps={{
                  startAdornment: <InputAdornment position="start">$</InputAdornment>,
                }}
              />
            </Box>
            <Box sx={{ flexBasis: { xs: '100%', sm: 'calc(50% - 8px)' } }}>
              <TextField
                fullWidth
                label="Payment Due Date"
                type="date"
                value={formData.paymentDueDate}
                onChange={(e) => setFormData({ ...formData, paymentDueDate: e.target.value })}
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </Box>
            <Box sx={{ flexBasis: { xs: '100%', sm: 'calc(50% - 8px)' } }}>
              <FormControl fullWidth>
                <InputLabel>Reward Type</InputLabel>
                <Select
                  value={formData.rewardType}
                  onChange={(e) => setFormData({ ...formData, rewardType: e.target.value as any })}
                  label="Reward Type"
                >
                  <MenuItem value="none">No Rewards</MenuItem>
                  <MenuItem value="cashback">Cash Back</MenuItem>
                  <MenuItem value="points">Points</MenuItem>
                  <MenuItem value="miles">Miles</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ flexBasis: { xs: '100%', sm: 'calc(50% - 8px)' } }}>
              <TextField
                fullWidth
                label="Annual Fee"
                type="number"
                value={formData.annualFee}
                onChange={(e) => setFormData({ ...formData, annualFee: parseFloat(e.target.value) || 0 })}
                InputProps={{
                  startAdornment: <InputAdornment position="start">$</InputAdornment>,
                }}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFormOpen(false)}>Cancel</Button>
          <Button onClick={handleFormSubmit} variant="contained">
            {selectedCard ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={paymentOpen} onClose={() => setPaymentOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Make Payment</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              fullWidth
              label="Amount"
              type="number"
              value={paymentData.amount}
              onChange={(e) => setPaymentData({ ...paymentData, amount: parseFloat(e.target.value) || 0 })}
              InputProps={{
                startAdornment: <InputAdornment position="start">$</InputAdornment>,
              }}
            />
            <TextField
              fullWidth
              label="Payment Date"
              type="date"
              value={paymentData.paymentDate}
              onChange={(e) => setPaymentData({ ...paymentData, paymentDate: e.target.value })}
              InputLabelProps={{
                shrink: true,
              }}
            />
            <FormControl fullWidth>
              <InputLabel>Payment Method</InputLabel>
              <Select
                value={paymentData.paymentMethod}
                onChange={(e) => setPaymentData({ ...paymentData, paymentMethod: e.target.value })}
                label="Payment Method"
              >
                <MenuItem value="bank_transfer">Bank Transfer</MenuItem>
                <MenuItem value="online_banking">Online Banking</MenuItem>
                <MenuItem value="check">Check</MenuItem>
                <MenuItem value="cash">Cash</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="Confirmation Number (Optional)"
              value={paymentData.confirmationNumber}
              onChange={(e) => setPaymentData({ ...paymentData, confirmationNumber: e.target.value })}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPaymentOpen(false)}>Cancel</Button>
          <Button onClick={handlePaymentSubmit} variant="contained" disabled={paymentData.amount <= 0}>
            Make Payment
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Credit Card</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            This action cannot be undone. All transactions and payment history associated with this card will also be deleted.
          </Alert>
          <Typography>
            Are you sure you want to delete "<strong>{selectedCard?.name}</strong>"?
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
        aria-label="add credit card"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        onClick={() => setFormOpen(true)}
      >
        <Add />
      </Fab>
    </Box>
  );
};

export default CreditCards;