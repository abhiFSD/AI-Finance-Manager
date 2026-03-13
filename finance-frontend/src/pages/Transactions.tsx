import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Menu,
  Card,
  CardContent,
  
  Fab,
} from '@mui/material';
// import { Grid } from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  MoreVert,
  Search,
  FilterList,
  Download,
  Upload,
  TrendingUp,
  TrendingDown,
  SwapHoriz,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { Transaction, TransactionFilters, Account, Category } from '../types';
import { transactionService } from '../services/transaction.service';
import { categoryService } from '../services/category.service';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatDate, formatTransactionType } from '../utils/formatters';
import LoadingSpinner from '../components/LoadingSpinner';

interface TransactionFormData {
  accountId: string;
  amount: number;
  type: 'income' | 'expense' | 'transfer';
  category: string;
  description: string;
  date: Date;
  tags: string[];
}

const Transactions: React.FC = () => {
  const { accounts, isLoading, setLoading, setError } = useApp();
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [filters, setFilters] = useState<TransactionFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [formData, setFormData] = useState<TransactionFormData>({
    accountId: '',
    amount: 0,
    type: 'expense',
    category: '',
    description: '',
    date: new Date(),
    tags: [],
  });

  useEffect(() => {
    loadTransactions();
  }, [page, rowsPerPage, filters]);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await categoryService.getAllCategories();
        // response = { success, data: { hierarchy: [...], flat: [...] }, meta }
        const resData: any = response.data;
        let categoriesData: any[] = [];
        if (resData && typeof resData === 'object' && !Array.isArray(resData)) {
          // Extract flat list from { hierarchy, flat } structure
          categoriesData = resData['flat'] || resData['hierarchy'] || [];
        } else if (Array.isArray(resData)) {
          categoriesData = resData;
        }
        console.log('Categories loaded:', categoriesData.length, categoriesData.map((c: any) => c.name));
        setCategories(Array.isArray(categoriesData) ? categoriesData : []);
      } catch (error) {
        console.error('Error loading categories:', error);
        setCategories([]);
      }
    };
    loadCategories();
  }, []);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const response = await transactionService.getTransactions(
        page + 1,
        rowsPerPage,
        filters
      );
      setTransactions(response.data.data);
      setTotalTransactions(response.data.pagination.total);
    } catch (error) {
      setError('Failed to load transactions');
      console.error('Error loading transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field: keyof TransactionFilters) => (
    value: any
  ) => {
    setFilters({ ...filters, [field]: value });
    setPage(0); // Reset to first page when filters change
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    handleFilterChange('search')(event.target.value);
  };

  const handlePageChange = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleRowsPerPageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, transaction: Transaction) => {
    event.stopPropagation();
    setSelectedTransaction(transaction);
    setMenuAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
    setSelectedTransaction(null);
  };

  const handleEdit = () => {
    if (selectedTransaction) {
      setFormData({
        accountId: selectedTransaction.accountId,
        amount: selectedTransaction.amount,
        type: selectedTransaction.type,
        category: selectedTransaction.category,
        description: selectedTransaction.description,
        date: new Date(selectedTransaction.date),
        tags: selectedTransaction.tags || [],
      });
      setFormOpen(true);
    }
    handleMenuClose();
  };

  const handleDelete = () => {
    setDeleteDialogOpen(true);
    handleMenuClose();
  };

  const confirmDelete = async () => {
    if (selectedTransaction) {
      try {
        await transactionService.deleteTransaction(selectedTransaction.id);
        loadTransactions();
        setDeleteDialogOpen(false);
        setSelectedTransaction(null);
      } catch (error) {
        setError('Failed to delete transaction');
        console.error('Error deleting transaction:', error);
      }
    }
  };

  const handleFormSubmit = async () => {
    try {
      // Find the category ID from the category name
      const selectedCategory = categories.find(cat => cat.name === formData.category);
      
      const transactionData = {
        accountId: formData.accountId,
        amount: formData.amount,
        type: formData.type.toUpperCase(), // Backend expects uppercase type
        categoryId: selectedCategory?.id, // Backend expects categoryId, not category name
        description: formData.description,
        date: formData.date.toISOString().split('T')[0],
        tags: formData.tags,
      };

      if (selectedTransaction) {
        await transactionService.updateTransaction(selectedTransaction.id, transactionData as any);
      } else {
        await transactionService.createTransaction(transactionData as any);
      }

      loadTransactions();
      setFormOpen(false);
      resetForm();
    } catch (error) {
      setError('Failed to save transaction');
      console.error('Error saving transaction:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      accountId: '',
      amount: 0,
      type: 'expense',
      category: '',
      description: '',
      date: new Date(),
      tags: [],
    });
    setSelectedTransaction(null);
  };

  const handleExport = async () => {
    try {
      const blob = await transactionService.exportTransactions(filters);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `transactions-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      setError('Failed to export transactions');
      console.error('Error exporting transactions:', error);
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'income':
        return <TrendingUp color="success" />;
      case 'expense':
        return <TrendingDown color="error" />;
      case 'transfer':
        return <SwapHoriz color="info" />;
      default:
        return <TrendingDown />;
    }
  };

  const clearFilters = () => {
    setFilters({});
    setPage(0);
  };

  if (isLoading && transactions.length === 0) {
    return <LoadingSpinner message="Loading transactions..." />;
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" fontWeight="bold">
            Transactions
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<Download />}
              onClick={handleExport}
            >
              Export
            </Button>
            <Button
              variant="outlined"
              startIcon={<Upload />}
            >
              Import
            </Button>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setFormOpen(true)}
            >
              Add Transaction
            </Button>
          </Box>
        </Box>

        {/* Filters */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                Filters
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
              <Box sx={{ flexGrow: 1, flexBasis: { xs: '100%', md: 'calc(33.333% - 16px)' } }}>
                <TextField
                  fullWidth
                  label="Search"
                  value={filters.search || ''}
                  onChange={handleSearchChange}
                  InputProps={{
                    startAdornment: <Search sx={{ mr: 1, color: 'action.active' }} />,
                  }}
                />
              </Box>

              {showFilters && (
                <>
                  <Box sx={{ flexGrow: 1, flexBasis: { xs: '100%', md: 'calc(16.666% - 16px)' } }}>
                    <FormControl fullWidth>
                      <InputLabel>Type</InputLabel>
                      <Select
                        value={filters.type || ''}
                        onChange={(e) => handleFilterChange('type')(e.target.value)}
                        label="Type"
                      >
                        <MenuItem value="">All</MenuItem>
                        <MenuItem value="income">Income</MenuItem>
                        <MenuItem value="expense">Expense</MenuItem>
                        <MenuItem value="transfer">Transfer</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>

                  <Box sx={{ flexGrow: 1, flexBasis: { xs: '100%', md: 'calc(16.666% - 16px)' } }}>
                    <FormControl fullWidth>
                      <InputLabel>Account</InputLabel>
                      <Select
                        value={filters.accountId || ''}
                        onChange={(e) => handleFilterChange('accountId')(e.target.value)}
                        label="Account"
                      >
                        <MenuItem value="">All Accounts</MenuItem>
                        {accounts.map((account) => (
                          <MenuItem key={account.id} value={account.id}>
                            {account.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Box>

                  <Box sx={{ flexGrow: 1, flexBasis: { xs: '100%', md: 'calc(16.666% - 16px)' } }}>
                    <FormControl fullWidth>
                      <InputLabel>Category</InputLabel>
                      <Select
                        value={filters.category || ''}
                        onChange={(e) => handleFilterChange('category')(e.target.value)}
                        label="Category"
                      >
                        <MenuItem value="">All Categories</MenuItem>
                        {categories.map((category) => (
                          <MenuItem key={category.id} value={category.name}>
                            {category.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Box>

                  <Box sx={{ flexGrow: 1, flexBasis: { xs: '100%', md: 'calc(16.666% - 16px)' } }}>
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

        {/* Transactions Table */}
        <Paper>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Type</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell>Account</TableCell>
                  <TableCell align="right">Amount</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Tags</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {transactions.map((transaction) => (
                  <TableRow key={transaction.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {getTransactionIcon(transaction.type)}
                        <Typography variant="body2">
                          {formatTransactionType(transaction.type)}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {transaction.description}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={transaction.category && typeof transaction.category === 'object' ? (transaction.category as any).name : transaction.category || 'Uncategorized'}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      {transaction.account?.name || accounts.find(acc => acc.id === transaction.accountId)?.name || 'Unknown'}
                    </TableCell>
                    <TableCell align="right">
                      <Typography
                        variant="body2"
                        fontWeight="bold"
                        color={
                          transaction.type === 'income' 
                            ? 'success.main' 
                            : transaction.type === 'expense'
                            ? 'error.main'
                            : 'text.primary'
                        }
                      >
                        {formatCurrency(transaction.amount, 'INR', transaction.type === 'income')}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {formatDate(transaction.date)}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {Array.isArray(transaction.tags) ? transaction.tags.map((tag) => (
                          <Chip
                            key={tag}
                            size="small"
                            label={tag}
                            variant="outlined"
                            color="primary"
                          />
                        )) : transaction.tags && typeof transaction.tags === 'string' ? (
                          (transaction.tags as string).split(',').map((tag) => (
                            <Chip
                              key={tag.trim()}
                              size="small"
                              label={tag.trim()}
                              variant="outlined"
                              color="primary"
                            />
                          ))
                        ) : null}
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <IconButton
                        onClick={(e) => handleMenuClick(e, transaction)}
                        size="small"
                      >
                        <MoreVert />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            rowsPerPageOptions={[10, 25, 50, 100]}
            component="div"
            count={totalTransactions}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handlePageChange}
            onRowsPerPageChange={handleRowsPerPageChange}
          />
        </Paper>

        {/* Action Menu */}
        <Menu
          anchorEl={menuAnchorEl}
          open={Boolean(menuAnchorEl)}
          onClose={handleMenuClose}
        >
          <MenuItem onClick={handleEdit}>
            <Edit fontSize="small" sx={{ mr: 1 }} />
            Edit
          </MenuItem>
          <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
            <Delete fontSize="small" sx={{ mr: 1 }} />
            Delete
          </MenuItem>
        </Menu>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
          <DialogTitle>Delete Transaction</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to delete this transaction? This action cannot be undone.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button onClick={confirmDelete} color="error" variant="contained">
              Delete
            </Button>
          </DialogActions>
        </Dialog>

        {/* Add/Edit Transaction Form Dialog */}
        <Dialog 
          open={formOpen} 
          onClose={() => setFormOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            {selectedTransaction ? 'Edit Transaction' : 'Add Transaction'}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 1 }}>
              <Box sx={{ flexGrow: 1, flexBasis: { xs: '100%', md: 'calc(50% - 12px)' } }}>
                <FormControl fullWidth>
                  <InputLabel>Type</InputLabel>
                  <Select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    label="Type"
                  >
                    <MenuItem value="income">Income</MenuItem>
                    <MenuItem value="expense">Expense</MenuItem>
                    <MenuItem value="transfer">Transfer</MenuItem>
                  </Select>
                </FormControl>
              </Box>

              <Box sx={{ flexGrow: 1, flexBasis: { xs: '100%', md: 'calc(50% - 12px)' } }}>
                <FormControl fullWidth>
                  <InputLabel>Account</InputLabel>
                  <Select
                    value={formData.accountId}
                    onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
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
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </Box>

              <Box sx={{ flexGrow: 1, flexBasis: { xs: '100%', md: 'calc(50% - 12px)' } }}>
                <TextField
                  fullWidth
                  label="Amount"
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                  inputProps={{ step: 0.01 }}
                />
              </Box>

              <Box sx={{ flexGrow: 1, flexBasis: { xs: '100%', md: 'calc(50% - 12px)' } }}>
                <FormControl fullWidth>
                  <InputLabel>Category</InputLabel>
                  <Select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    label="Category"
                  >
                    {categories
                      .filter(cat => {
                        // If category has a type field, filter by it; otherwise show all
                        if (!cat.type) return true;
                        return cat.type === formData.type || cat.type === formData.type.toUpperCase();
                      })
                      .map((category) => (
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
                  value={formData.date}
                  onChange={(date) => setFormData({ ...formData, date: date || new Date() })}
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
            <Button onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button onClick={handleFormSubmit} variant="contained">
              {selectedTransaction ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Floating Action Button */}
        <Fab
          color="primary"
          aria-label="add transaction"
          sx={{ position: 'fixed', bottom: 16, right: 16 }}
          onClick={() => setFormOpen(true)}
        >
          <Add />
        </Fab>
      </Box>
    </LocalizationProvider>
  );
};

export default Transactions;