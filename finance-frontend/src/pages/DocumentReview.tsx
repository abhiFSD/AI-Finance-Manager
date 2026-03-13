import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Checkbox,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
  Chip,
  Snackbar,
  Tooltip,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  CloudUpload,
  Refresh,
  CheckCircle,
  Cancel as CancelIcon,
  ArrowBack,
  AutoAwesome as AutoAwesomeIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { documentService } from '../services/document.service';
import { categoryService } from '../services/category.service';
import { accountService } from '../services/account.service';
import { formatCurrency, formatDate } from '../utils/formatters';
import LoadingSpinner from '../components/LoadingSpinner';
import SmartAccountDialog from '../components/SmartAccountDialog';

interface ExtractedTransaction {
  tempId?: string;
  date: string;
  description: string;
  amount: number;
  merchantName?: string;
  category?: string;
  type?: string;
  selected?: boolean;
  tags?: string[];
  notes?: string;
  aiSuggestions?: {
    category?: string;
    merchantName?: string;
    isDuplicate?: boolean;
    isSuspicious?: boolean;
    confidence?: number;
    duplicateCandidates?: any[];
    duplicateDetected?: boolean;
    suspiciousAmount?: boolean;
    normalizedMerchant?: string;
    suggestedCategory?: string;
    suggestedCategoryId?: string;
    categoryConfidence?: number;
    [key: string]: any;
  };
  aiFlags?: string[];
  aiConfidence?: number;
}

interface DocumentData {
  id: string;
  fileName: string;
  status: string;
  type: string;
  uploadedAt: string;
  extractedAt?: string;
  reviewedAt?: string;
  importedAt?: string;
  metadata?: any;
  errorMessage?: string;
}

interface Account {
  id: string;
  name: string;
  type: string;
  balance: number;
}

interface Category {
  id: string;
  name: string;
  color?: string;
  icon?: string;
}

const DocumentReview: React.FC = () => {
  const { documentId } = useParams<{ documentId: string }>();
  const navigate = useNavigate();

  const [document, setDocument] = useState<DocumentData | null>(null);
  const [transactions, setTransactions] = useState<ExtractedTransaction[]>([]);
  const [importedTransactions, setImportedTransactions] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [smartAccountDialogOpen, setSmartAccountDialogOpen] = useState(false);
  const [aiAnalysisSummary, setAiAnalysisSummary] = useState<any>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const handleSelectAll = () => {
    setTransactions(txns => (txns || []).map(t => ({ ...t, selected: true })));
  };

  const handleDeselectAll = () => {
    setTransactions(txns => (txns || []).map(t => ({ ...t, selected: false })));
  };

  const handleSelectToggle = (index: number) => {
    setTransactions(txns => {
      const updated = [...txns];
      updated[index].selected = !updated[index].selected;
      return updated;
    });
  };

  const handleEditTransaction = (index: number) => {
    setEditingIndex(index);
  };

  const handleSaveTransaction = (index: number, updatedTxn: ExtractedTransaction) => {
    setTransactions(txns => {
      const updated = [...txns];
      updated[index] = updatedTxn;
      return updated;
    });
    setEditingIndex(null);
  };

  const handleDeleteTransaction = (index: number) => {
    setTransactions(txns => txns.filter((_, i) => i !== index));
  };

  const handleSaveDraft = async () => {
    try {
      if (!documentId) return;

      await documentService.updateStatus(documentId, 'REVIEWED');
      
      // Update extractedData would require another endpoint
      // For now, status update is sufficient as a draft save
      setSnackbar({ open: true, message: 'Draft saved successfully', severity: 'success' });
    } catch (error) {
      console.error('Error saving draft:', error);
      setSnackbar({ open: true, message: 'Failed to save draft', severity: 'error' });
    }
  };

  const handleAIAnalyze = async () => {
    try {
      if (!documentId) return;

      setAnalyzing(true);

      const response = await documentService.analyzeDocument(documentId, transactions);

      if (response.success && response.data) {
        const { analyzedTransactions, summary } = response.data;

        // Update transactions with AI suggestions
        setTransactions(analyzedTransactions);
        setAiAnalysisSummary(summary);

        setSnackbar({
          open: true,
          message: `✨ AI analyzed: ${summary.categorized} categorized, ${summary.duplicatesFound} duplicates found`,
          severity: 'success',
        });
      }
    } catch (error) {
      console.error('Error analyzing with AI:', error);
      setSnackbar({ open: true, message: 'Failed to run AI analysis', severity: 'error' });
    } finally {
      setAnalyzing(false);
    }
  };

  const handleImportClick = () => {
    const selectedTransactions = (transactions || []).filter(t => t.selected);
    if (selectedTransactions.length === 0) {
      setSnackbar({ open: true, message: 'Please select at least one transaction', severity: 'error' });
      return;
    }
    setSmartAccountDialogOpen(true);
  };

  // Helper function to load extracted data from document.extractedData
  const loadExtractedData = (docData: any) => {
    try {
      // Try to parse extractedData as JSON if it's a string
      let extractedData = null;
      if (docData.document?.extractedData) {
        if (typeof docData.document.extractedData === 'string') {
          extractedData = JSON.parse(docData.document.extractedData);
        } else {
          extractedData = docData.document.extractedData;
        }
      }

      // Fallback to extractedTransactions if extractedData is not available
      if (!extractedData) {
        extractedData = docData.extractedTransactions || {};
      }

      const extractedTransactions = extractedData.transactions || [];
      const safeTransactions = Array.isArray(extractedTransactions) ? extractedTransactions : [];
      const txns = safeTransactions.map((txn: any, idx: number) => ({
        ...txn,
        tempId: txn.tempId || `temp_${idx}`,
        selected: true,
        // Map CREDIT/DEBIT from AI to INCOME/EXPENSE for UI
        type: txn.type === 'CREDIT' ? 'INCOME' : 
              txn.type === 'DEBIT' ? 'EXPENSE' : 
              txn.type || 'EXPENSE',
      }));

      return { txns, extractedData };
    } catch (error) {
      console.error('Error parsing extracted data:', error);
      return { txns: [], extractedData: null };
    }
  };

  // Helper function to reload document data (called from button onClick handlers)
  const reloadDocument = async () => {
    try {
      setLoading(true);
      if (!documentId) return;

      const response = await documentService.getDocumentById(documentId);
      if (response.success && response.data) {
        const docData = response.data;
        setDocument(docData.document);

        const { txns } = loadExtractedData(docData);
        setTransactions(txns);

        // Store imported transactions if document is already imported
        const imported = docData.importedTransactions || [];
        setImportedTransactions(Array.isArray(imported) ? imported : []);
      } else {
        setTransactions([]);
        setImportedTransactions([]);
      }
    } catch (error) {
      console.error('Error loading document:', error);
      setSnackbar({ open: true, message: 'Failed to load document', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async (accountId?: string, createAccount?: boolean, accountData?: any) => {
    try {
      const selectedTransactions = (transactions || []).filter(t => t.selected);

      setImporting(true);
      setSmartAccountDialogOpen(false);
      if (!documentId) return;

      const response = await documentService.importTransactions(documentId, {
        transactions: selectedTransactions,
        accountId,
        createAccount,
        accountData,
      });

      if (response.success && response.data) {
        const message = createAccount 
          ? `Created account and imported ${response.data.imported} transactions`
          : `Successfully imported ${response.data.imported} transactions`;
        
        setSnackbar({ open: true, message, severity: 'success' });
        
        // Reload to see updated status
        setTimeout(() => {
          // Reload document data
          if (documentId) {
            documentService.getDocumentById(documentId).then(resp => {
              if (resp.success && resp.data) {
                const docData = resp.data;
                setDocument(docData.document);
                
                // Use the new helper function to load extracted data
                const { txns } = loadExtractedData(docData);
                setTransactions(txns);
                
                // Update imported transactions too
                const imported = docData.importedTransactions || [];
                setImportedTransactions(Array.isArray(imported) ? imported : []);
              }
            });
          }
          
          // Refresh accounts list if we created a new account
          if (createAccount) {
            accountService.getAccounts().then(resp => {
              if (resp.success && resp.data) {
                const accountsList = (resp.data as any).accounts || resp.data || [];
                const safeAccounts = Array.isArray(accountsList) ? accountsList : [];
                setAccounts(safeAccounts);
                if (safeAccounts.length > 0 && !selectedAccountId) {
                  setSelectedAccountId(safeAccounts[0].id);
                }
              }
            });
          }
        }, 1000);
      }
    } catch (error) {
      console.error('Error importing transactions:', error);
      setSnackbar({ open: true, message: 'Failed to import transactions', severity: 'error' });
    } finally {
      setImporting(false);
    }
  };

  // Load accounts once on mount
  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const response = await accountService.getAccounts();
        if (response.success && response.data) {
          const accountsList = (response.data as any).accounts || response.data || [];
          const safeAccounts = Array.isArray(accountsList) ? accountsList : [];
          setAccounts(safeAccounts);
          if (safeAccounts.length > 0) {
            setSelectedAccountId(safeAccounts[0].id);
          }
        } else {
          setAccounts([]);
        }
      } catch (error) {
        console.error('Error loading accounts:', error);
        setAccounts([]);
      }
    };
    fetchAccounts();
  }, []);

  // Load categories once on mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await categoryService.getAllCategories();
        if (response.success && response.data) {
          const categoryData = response.data as any;
          const categoryList = categoryData.flat || categoryData.hierarchy || categoryData || [];
          const safeCategories = Array.isArray(categoryList) ? categoryList : [];
          setCategories(safeCategories);
        } else {
          setCategories([]);
        }
      } catch (error) {
        console.error('Error loading categories:', error);
        setCategories([]);
      }
    };
    fetchCategories();
  }, []);

  // Load document data when documentId changes
  useEffect(() => {
    const fetchDocument = async () => {
      try {
        setLoading(true);
        if (!documentId) {
          setLoading(false);
          return;
        }

        const response = await documentService.getDocumentById(documentId);
        if (response.success && response.data) {
          const docData = response.data;
          setDocument(docData.document);

          const { txns } = loadExtractedData(docData);
          setTransactions(txns);
        } else {
          setTransactions([]);
        }
      } catch (error) {
        console.error('Error loading document:', error);
        setSnackbar({ open: true, message: 'Failed to load document', severity: 'error' });
      } finally {
        setLoading(false);
      }
    };

    fetchDocument();
  }, [documentId]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!document) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6" color="error">
          Document not found
        </Typography>
        <Button onClick={() => navigate('/documents')} sx={{ mt: 2 }}>
          Back to Documents
        </Button>
      </Box>
    );
  }

  const selectedCount = (transactions || []).filter(t => t.selected).length;
  const getStatusColor = (status: string | undefined) => {
    const colors: Record<string, any> = {
      UPLOADED: 'default',
      PROCESSING: 'info',
      EXTRACTED: 'success',
      REVIEWED: 'primary',
      IMPORTED: 'success',
      FAILED: 'error',
    };
    return (status && colors[status]) || 'default';
  };

  const getStatusIcon = (status: string | undefined) => {
    if (!status) return null;
    switch (status) {
      case 'PROCESSING':
        return <CircularProgress size={20} sx={{ mr: 1 }} />;
      case 'IMPORTED':
        return <CheckCircle sx={{ mr: 1, color: 'success.main' }} />;
      case 'FAILED':
        return <CancelIcon sx={{ mr: 1, color: 'error.main' }} />;
      default:
        return null;
    }
  };

  // Rendering based on document status
  if (document.status === 'UPLOADED' || document.status === 'PROCESSING') {
    return (
      <Box sx={{ p: 3 }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate('/documents')}
          sx={{ mb: 3 }}
        >
          Back to Documents
        </Button>

        <Card sx={{ textAlign: 'center', py: 6 }}>
          <CircularProgress sx={{ mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            Processing Document...
          </Typography>
          <Typography color="textSecondary" gutterBottom>
            OCR and data extraction in progress. This may take a few minutes.
          </Typography>
          <Button
            variant="contained"
            startIcon={<Refresh />}
            onClick={reloadDocument}
            sx={{ mt: 2 }}
          >
            Refresh Status
          </Button>
        </Card>
      </Box>
    );
  }

  if (document.status === 'FAILED') {
    return (
      <Box sx={{ p: 3 }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate('/documents')}
          sx={{ mb: 3 }}
        >
          Back to Documents
        </Button>

        <Card sx={{ textAlign: 'center', py: 6 }}>
          <CancelIcon sx={{ fontSize: 48, color: 'error.main', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            Processing Failed
          </Typography>
          <Typography color="textSecondary" gutterBottom>
            {document.errorMessage || 'Unable to extract text from document'}
          </Typography>
          <Box sx={{ mt: 2, display: 'flex', gap: 2, justifyContent: 'center' }}>
            <Button
              variant="outlined"
              color="error"
              onClick={() => navigate('/documents')}
            >
              Delete Document
            </Button>
            <Button
              variant="contained"
              startIcon={<Refresh />}
              onClick={reloadDocument}
            >
              Retry Processing
            </Button>
          </Box>
        </Card>
      </Box>
    );
  }

  if (document.status === 'IMPORTED') {
    return (
      <Box sx={{ p: 3 }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate('/documents')}
          sx={{ mb: 3 }}
        >
          Back to Documents
        </Button>

        <Card sx={{ mb: 3, p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <CheckCircle sx={{ fontSize: 32, color: 'success.main' }} />
            <Box>
              <Typography variant="h6">
                Document Already Imported
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Imported {importedTransactions.length} transactions on {formatDate(document.importedAt || '')}
              </Typography>
            </Box>
          </Box>
        </Card>

        {/* Show imported transactions */}
        {importedTransactions.length > 0 && (
          <Card>
            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
              <Typography variant="h6">Imported Transactions ({importedTransactions.length})</Typography>
            </Box>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell>Account</TableCell>
                    <TableCell align="right">Amount</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {importedTransactions.map((txn: any) => (
                    <TableRow key={txn.id}>
                      <TableCell>{formatDate(txn.date)}</TableCell>
                      <TableCell>{txn.description}</TableCell>
                      <TableCell>
                        {txn.category?.name || 'Uncategorized'}
                      </TableCell>
                      <TableCell>{txn.account?.name || 'Unknown'}</TableCell>
                      <TableCell align="right">
                        <Typography color={txn.amount >= 0 ? 'success.main' : 'error.main'}>
                          ₹{Math.abs(txn.amount).toFixed(2)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        )}
      </Box>
    );
  }

  // Extracted/Reviewed state - Show editable transaction table
  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Button
        startIcon={<ArrowBack />}
        onClick={() => navigate('/documents')}
        sx={{ mb: 3 }}
      >
        Back to Documents
      </Button>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
            <Box>
              <Typography variant="h5" gutterBottom>
                📄 {document.fileName}
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, mt: 1, alignItems: 'center' }}>
                {getStatusIcon(document.status) ? (
                  <Chip
                    label={document.status}
                    color={getStatusColor(document.status)}
                    size="small"
                    icon={getStatusIcon(document.status)!}
                  />
                ) : (
                  <Chip
                    label={document.status}
                    color={getStatusColor(document.status)}
                    size="small"
                  />
                )}
                <Typography variant="body2" color="textSecondary">
                  Uploaded: {formatDate(document.uploadedAt, 'long')}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Transactions: {transactions.length} found
                </Typography>
              </Box>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Account Selector */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <FormControl fullWidth sx={{ maxWidth: 400 }}>
            <InputLabel>Select Account</InputLabel>
            <Select
              value={selectedAccountId}
              label="Select Account"
              onChange={(e) => setSelectedAccountId(e.target.value)}
            >
              {(accounts || []).map(acc => (
                <MenuItem key={acc.id} value={acc.id}>
                  {acc.name} ({acc.type}) - {formatCurrency(acc.balance)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <Button
              variant="outlined"
              size="small"
              onClick={handleSelectAll}
            >
              Select All
            </Button>
            <Button
              variant="outlined"
              size="small"
              onClick={handleDeselectAll}
            >
              Deselect All
            </Button>
            <Typography sx={{ ml: 'auto', display: 'flex', alignItems: 'center' }}>
              Selected: {selectedCount} of {transactions.length} transactions
            </Typography>
          </Box>

          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead sx={{ bgcolor: 'grey.100' }}>
                <TableRow>
                  <TableCell width="50">
                    <Checkbox
                      checked={(transactions || []).length > 0 && (transactions || []).every(t => t.selected)}
                      indeterminate={(transactions || []).some(t => t.selected) && !(transactions || []).every(t => t.selected)}
                      onChange={() => (transactions || []).every(t => t.selected) ? handleDeselectAll() : handleSelectAll()}
                    />
                  </TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell align="right">Amount</TableCell>
                  <TableCell>Merchant</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell width="100">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(transactions || []).map((txn, index) => (
                  <TransactionRow
                    key={index}
                    transaction={txn}
                    index={index}
                    categories={categories || []}
                    isEditing={editingIndex === index}
                    onToggleSelect={() => handleSelectToggle(index)}
                    onEdit={() => handleEditTransaction(index)}
                    onSave={(updated) => handleSaveTransaction(index, updated)}
                    onDelete={() => handleDeleteTransaction(index)}
                  />
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* AI Analysis Summary */}
      {aiAnalysisSummary && (
        <Card sx={{ mb: 3, bgcolor: 'info.light', borderLeft: '4px solid', borderColor: 'info.main' }}>
          <CardContent>
            <Box sx={{ display: 'flex', gap: 3, alignItems: 'center' }}>
              <AutoAwesomeIcon sx={{ color: 'info.main', fontSize: 28 }} />
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  ✨ AI Analysis Complete
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Categorized: {aiAnalysisSummary.categorized} | Duplicates: {aiAnalysisSummary.duplicatesFound} | 
                  Merchants normalized: {aiAnalysisSummary.merchantsNormalized} | Flagged: {aiAnalysisSummary.flagged} |
                  Confidence: {(aiAnalysisSummary.averageConfidence * 100).toFixed(0)}%
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
        <Tooltip title="Use AI to categorize, normalize merchants, and detect duplicates">
          <Button
            variant="outlined"
            startIcon={<AutoAwesomeIcon />}
            onClick={handleAIAnalyze}
            disabled={transactions.length === 0 || analyzing}
          >
            {analyzing ? <CircularProgress size={20} sx={{ mr: 1 }} /> : null}
            ✨ AI Analyze
          </Button>
        </Tooltip>
        <Button
          variant="outlined"
          onClick={handleSaveDraft}
        >
          Save as Draft
        </Button>
        <Button
          variant="contained"
          startIcon={<CloudUpload />}
          onClick={handleImportClick}
          disabled={selectedCount === 0 || importing}
        >
          Import Selected ({selectedCount})
        </Button>
      </Box>



      {/* Snackbar */}
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

      {/* Smart Account Selection Dialog */}
      <SmartAccountDialog
        open={smartAccountDialogOpen}
        onClose={() => setSmartAccountDialogOpen(false)}
        document={document}
        transactions={transactions}
        accounts={accounts}
        onImport={handleImport}
      />
    </Box>
  );
};

interface TransactionRowProps {
  transaction: ExtractedTransaction;
  index: number;
  categories: Category[];
  isEditing: boolean;
  onToggleSelect: () => void;
  onEdit: () => void;
  onSave: (updated: ExtractedTransaction) => void;
  onDelete: () => void;
}

const TransactionRow: React.FC<TransactionRowProps> = ({
  transaction,
  index,
  categories,
  isEditing,
  onToggleSelect,
  onEdit,
  onSave,
  onDelete,
}) => {
  const [editData, setEditData] = useState(transaction);

  if (isEditing) {
    return (
      <TableRow>
        <TableCell>
          <Checkbox checked={transaction.selected} onChange={onToggleSelect} />
        </TableCell>
        <TableCell>
          <TextField
            type="date"
            value={editData.date}
            onChange={(e) => setEditData({ ...editData, date: e.target.value })}
            size="small"
          />
        </TableCell>
        <TableCell>
          <TextField
            value={editData.description}
            onChange={(e) => setEditData({ ...editData, description: e.target.value })}
            size="small"
            fullWidth
          />
        </TableCell>
        <TableCell>
          <Select
            value={editData.type || 'EXPENSE'}
            onChange={(e) => setEditData({ ...editData, type: e.target.value })}
            size="small"
          >
            <MenuItem value="INCOME">Income</MenuItem>
            <MenuItem value="EXPENSE">Expense</MenuItem>
            <MenuItem value="TRANSFER">Transfer</MenuItem>
          </Select>
        </TableCell>
        <TableCell align="right">
          <TextField
            type="number"
            value={editData.amount}
            onChange={(e) => setEditData({ ...editData, amount: parseFloat(e.target.value) })}
            size="small"
            inputProps={{ step: '0.01' }}
          />
        </TableCell>
        <TableCell>
          <TextField
            value={editData.merchantName || ''}
            onChange={(e) => setEditData({ ...editData, merchantName: e.target.value })}
            size="small"
            fullWidth
          />
        </TableCell>
        <TableCell>
          <Select
            value={editData.category || ''}
            onChange={(e) => setEditData({ ...editData, category: e.target.value })}
            size="small"
            fullWidth
          >
            <MenuItem value="">--</MenuItem>
            {(categories || []).map(cat => (
              <MenuItem key={cat.id} value={cat.id}>{cat.name}</MenuItem>
            ))}
          </Select>
        </TableCell>
        <TableCell>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <Button
              variant="contained"
              size="small"
              onClick={() => onSave(editData)}
            >
              Save
            </Button>
            <Button
              variant="outlined"
              size="small"
              onClick={() => setEditData(transaction)}
            >
              Cancel
            </Button>
          </Box>
        </TableCell>
      </TableRow>
    );
  }

  const aiSuggestions = transaction.aiSuggestions;
  const hasAISuggestions = aiSuggestions && Object.keys(aiSuggestions).some(k => aiSuggestions[k]);

  return (
    <TableRow hover sx={{ 
      bgcolor: aiSuggestions?.duplicateDetected ? 'error.lighter' : 
               aiSuggestions?.suspiciousAmount ? 'warning.lighter' :
               hasAISuggestions ? 'success.lighter' : 'inherit'
    }}>
      <TableCell>
        <Checkbox checked={transaction.selected} onChange={onToggleSelect} />
      </TableCell>
      <TableCell>{formatDate(transaction.date, 'short')}</TableCell>
      <TableCell>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {transaction.description}
          {aiSuggestions?.normalizedMerchant && (
            <Tooltip title={`Normalized: ${aiSuggestions.normalizedMerchant}`}>
              <Chip
                label="🤖 Normalized"
                size="small"
                variant="outlined"
                sx={{ fontSize: '0.65rem' }}
              />
            </Tooltip>
          )}
        </Box>
      </TableCell>
      <TableCell>
        <Chip 
          label={transaction.type || 'EXPENSE'}
          size="small"
          color={transaction.type === 'INCOME' ? 'success' : transaction.type === 'TRANSFER' ? 'info' : 'error'}
          sx={{ fontWeight: 600 }}
        />
      </TableCell>
      <TableCell align="right">
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'flex-end' }}>
          <Typography 
            sx={{ 
              color: transaction.type === 'INCOME' ? 'success.main' : 'error.main',
              fontWeight: 600
            }}
          >
            {transaction.type === 'INCOME' ? '+' : '-'}{formatCurrency(transaction.amount)}
          </Typography>
          {aiSuggestions?.suspiciousAmount && (
            <Tooltip title="High amount flagged by AI">
              <ErrorIcon sx={{ color: 'error.main', fontSize: 18 }} />
            </Tooltip>
          )}
        </Box>
      </TableCell>
      <TableCell>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {aiSuggestions?.normalizedMerchant || transaction.merchantName || '--'}
        </Box>
      </TableCell>
      <TableCell>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          <Typography variant="body2">
            {transaction.category
              ? categories.find(c => c.id === transaction.category)?.name || transaction.category
              : '--'}
          </Typography>
          {aiSuggestions?.suggestedCategory && transaction.category !== aiSuggestions.suggestedCategoryId && (
            <Tooltip title={`Confidence: ${((aiSuggestions.categoryConfidence ?? 0) * 100).toFixed(0)}%`}>
              <Chip
                label={`🤖 ${aiSuggestions.suggestedCategory}`}
                size="small"
                variant="filled"
                sx={{ 
                  bgcolor: 'success.light',
                  fontSize: '0.65rem',
                  height: 20
                }}
              />
            </Tooltip>
          )}
          {aiSuggestions?.duplicateDetected && (
            <Tooltip title="Possible duplicate detected">
              <Chip
                label="⚠️ Duplicate"
                size="small"
                variant="filled"
                sx={{ 
                  bgcolor: 'warning.light',
                  fontSize: '0.65rem',
                  height: 20
                }}
              />
            </Tooltip>
          )}
        </Box>
      </TableCell>
      <TableCell>
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Button
            size="small"
            startIcon={<EditIcon />}
            onClick={onEdit}
            variant="outlined"
          />
          <Button
            size="small"
            startIcon={<DeleteIcon />}
            onClick={onDelete}
            color="error"
            variant="outlined"
          />
        </Box>
      </TableCell>
    </TableRow>
  );
};

export default DocumentReview;
