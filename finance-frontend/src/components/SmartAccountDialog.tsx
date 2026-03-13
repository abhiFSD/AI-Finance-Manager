import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
  Select,
  MenuItem,
  InputLabel,
  Typography,
  Box,
  Chip,
  Divider,
  Alert,
  Collapse,
  IconButton,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  AccountBalance as AccountBalanceIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { formatCurrency } from '../utils/formatters';

interface Account {
  id: string;
  name: string;
  institution?: string;
  type: string;
  balance: number;
}

interface Transaction {
  description: string;
  amount: number;
  selected?: boolean;
}

interface SmartAccountDialogProps {
  open: boolean;
  onClose: () => void;
  document: any;
  transactions: Transaction[];
  accounts: Account[];
  onImport: (accountId?: string, createAccount?: boolean, accountData?: any) => void;
}

const SmartAccountDialog: React.FC<SmartAccountDialogProps> = ({
  open,
  onClose,
  document,
  transactions,
  accounts,
  onImport,
}) => {
  const [mode, setMode] = useState<'select' | 'create'>('select');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [accountName, setAccountName] = useState('');
  const [accountInstitution, setAccountInstitution] = useState('');
  const [accountType, setAccountType] = useState('SAVINGS');
  const [accountNumber, setAccountNumber] = useState('');

  const selectedTransactions = transactions.filter(t => t.selected !== false);
  const totalAmount = selectedTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const bankDetected = document?.metadata?.bankDetected || '';
  const fullBankName = getBankFullName(bankDetected);

  useEffect(() => {
    if (open && accounts.length > 0) {
      // Try to find matching account
      const matched = findMatchingAccount(accounts, fullBankName);
      if (matched) {
        setSelectedAccountId(matched.id);
        setMode('select');
      } else {
        // Suggest creating new account
        setMode('create');
        setShowCreateForm(true);
        setAccountName(`${fullBankName} Savings Account`);
        setAccountInstitution(fullBankName);
        setAccountType('SAVINGS');
      }
    }
  }, [open, accounts, fullBankName]);

  const handleImport = () => {
    if (mode === 'create') {
      onImport(undefined, true, {
        name: accountName,
        institution: accountInstitution,
        type: accountType,
        accountNumber: accountNumber || undefined,
      });
    } else {
      onImport(selectedAccountId);
    }
  };

  const isMatchedAccount = (accountId: string) => {
    const account = accounts.find(a => a.id === accountId);
    if (!account) return false;
    const institution = account.institution?.toLowerCase() || account.name.toLowerCase();
    const bank = fullBankName.toLowerCase();
    return institution.includes(bank) || bank.includes(institution.split(' ')[0]);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <AccountBalanceIcon color="primary" />
          <Typography variant="h6">
            Import from {document?.filename || 'Document'}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box mb={3}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            <strong>🏦 Detected Bank:</strong> {fullBankName || 'Unknown'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            <strong>📊 Transactions:</strong> {selectedTransactions.length} selected
            ({formatCurrency(totalAmount)} total)
          </Typography>
        </Box>

        {/* Create New Account Section */}
        <Box mb={2}>
          <Box
            display="flex"
            alignItems="center"
            justifyContent="space-between"
            sx={{
              p: 2,
              border: mode === 'create' ? '2px solid' : '1px solid',
              borderColor: mode === 'create' ? 'primary.main' : 'divider',
              borderRadius: 1,
              cursor: 'pointer',
              bgcolor: mode === 'create' ? 'action.selected' : 'background.paper',
            }}
            onClick={() => {
              setMode('create');
              setShowCreateForm(true);
            }}
          >
            <Box>
              <Typography variant="subtitle1" fontWeight="bold">
                ✨ Create New Account {!accounts.some(a => isMatchedAccount(a.id)) && '(Recommended)'}
              </Typography>
            </Box>
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                setShowCreateForm(!showCreateForm);
              }}
            >
              <ExpandMoreIcon
                sx={{
                  transform: showCreateForm ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.3s',
                }}
              />
            </IconButton>
          </Box>

          <Collapse in={showCreateForm && mode === 'create'}>
            <Box mt={2} p={2} bgcolor="grey.50" borderRadius={1}>
              <TextField
                fullWidth
                label="Account Name"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                margin="dense"
              />
              <TextField
                fullWidth
                label="Institution"
                value={accountInstitution}
                onChange={(e) => setAccountInstitution(e.target.value)}
                margin="dense"
              />
              <FormControl fullWidth margin="dense">
                <InputLabel>Account Type</InputLabel>
                <Select
                  value={accountType}
                  onChange={(e) => setAccountType(e.target.value)}
                  label="Account Type"
                >
                  <MenuItem value="SAVINGS">Savings</MenuItem>
                  <MenuItem value="CHECKING">Checking</MenuItem>
                  <MenuItem value="CREDIT">Credit Card</MenuItem>
                  <MenuItem value="INVESTMENT">Investment</MenuItem>
                </Select>
              </FormControl>
              <TextField
                fullWidth
                label="Account Number (optional)"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                margin="dense"
                placeholder="****1234"
              />
            </Box>
          </Collapse>
        </Box>

        <Divider>
          <Typography variant="caption" color="text.secondary">
            OR
          </Typography>
        </Divider>

        {/* Select Existing Account Section */}
        <Box mt={2}>
          <FormControl component="fieldset" fullWidth>
            <FormLabel component="legend">
              <Typography variant="subtitle1" fontWeight="bold">
                📁 Select Existing Account
              </Typography>
            </FormLabel>
            <RadioGroup
              value={mode === 'select' ? selectedAccountId : ''}
              onChange={(e) => {
                setMode('select');
                setSelectedAccountId(e.target.value);
              }}
            >
              {accounts.map((account) => (
                <FormControlLabel
                  key={account.id}
                  value={account.id}
                  control={<Radio />}
                  label={
                    <Box display="flex" alignItems="center" justifyContent="space-between" width="100%">
                      <Box>
                        <Typography variant="body2">
                          {account.institution || account.name} - {account.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatCurrency(account.balance)}
                        </Typography>
                      </Box>
                      {isMatchedAccount(account.id) && (
                        <Chip
                          label="✓ MATCHED"
                          size="small"
                          color="success"
                          icon={<CheckCircleIcon />}
                        />
                      )}
                    </Box>
                  }
                  sx={{ py: 1, px: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1, mb: 1 }}
                />
              ))}
            </RadioGroup>
          </FormControl>
        </Box>

        {mode === 'select' && !selectedAccountId && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            Please select an account to import transactions
          </Alert>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleImport}
          variant="contained"
          disabled={
            mode === 'create'
              ? !accountName || !accountInstitution
              : !selectedAccountId
          }
        >
          {mode === 'create'
            ? `Create & Import (${selectedTransactions.length})`
            : `Import to Selected (${selectedTransactions.length})`}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

function getBankFullName(bankCode: string): string {
  const mappings: { [key: string]: string } = {
    hdfc: 'HDFC Bank',
    sbi: 'State Bank of India',
    icici: 'ICICI Bank',
    axis: 'Axis Bank',
    kotak: 'Kotak Mahindra Bank',
  };
  
  const code = bankCode.toLowerCase();
  for (const [key, value] of Object.entries(mappings)) {
    if (code.includes(key)) return value;
  }
  return bankCode;
}

function findMatchingAccount(accounts: Account[], bankName: string): Account | null {
  const normalized = bankName.toLowerCase();
  return accounts.find(a => {
    const institution = (a.institution || a.name).toLowerCase();
    return institution.includes(normalized) || normalized.includes(institution.split(' ')[0]);
  }) || null;
}

export default SmartAccountDialog;
