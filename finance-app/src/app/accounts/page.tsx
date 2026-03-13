"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Header } from "@/components/layout/header"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { 
  CreditCard,
  Building2,
  PiggyBank,
  TrendingUp,
  Plus,
  Settings,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle,
  Clock,
  DollarSign,
  Pencil,
  Trash2
} from "lucide-react"

interface Account {
  id: string
  name: string
  type: 'checking' | 'savings' | 'credit' | 'investment' | 'loan'
  bank: string
  accountNumber: string
  balance: number
  status: 'active' | 'inactive' | 'pending'
  lastSync: string
}

const mockAccounts: Account[] = [
  {
    id: "1",
    name: "Primary Checking",
    type: "checking",
    bank: "Chase Bank",
    accountNumber: "****1234",
    balance: 5420.80,
    status: "active",
    lastSync: "2024-12-15T10:30:00Z"
  },
  {
    id: "2", 
    name: "Emergency Savings",
    type: "savings",
    bank: "Chase Bank",
    accountNumber: "****5678",
    balance: 12500.00,
    status: "active",
    lastSync: "2024-12-15T10:30:00Z"
  },
  {
    id: "3",
    name: "Travel Credit Card",
    type: "credit",
    bank: "Chase Bank",
    accountNumber: "****9012",
    balance: -1250.45,
    status: "active",
    lastSync: "2024-12-15T10:25:00Z"
  },
  {
    id: "4",
    name: "Investment Portfolio",
    type: "investment",
    bank: "Fidelity",
    accountNumber: "****3456",
    balance: 25890.75,
    status: "active",
    lastSync: "2024-12-15T09:00:00Z"
  },
  {
    id: "5",
    name: "Home Loan",
    type: "loan",
    bank: "Wells Fargo",
    accountNumber: "****7890",
    balance: -185000.00,
    status: "active",
    lastSync: "2024-12-14T15:00:00Z"
  }
]

export default function AccountsPage() {
  const [accounts, setAccounts] = useState(mockAccounts)
  const [showBalances, setShowBalances] = useState(true)
  const [newAccount, setNewAccount] = useState({
    name: "",
    type: "checking" as Account['type'],
    bank: "",
    accountNumber: ""
  })
  const [isAddingAccount, setIsAddingAccount] = useState(false)

  const getAccountIcon = (type: Account['type']) => {
    switch (type) {
      case 'checking':
      case 'savings':
        return Building2
      case 'credit':
        return CreditCard
      case 'investment':
        return TrendingUp
      case 'loan':
        return PiggyBank
      default:
        return Building2
    }
  }

  const getAccountTypeColor = (type: Account['type']) => {
    switch (type) {
      case 'checking':
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
      case 'savings':
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
      case 'credit':
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300"
      case 'investment':
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300"
      case 'loan':
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
    }
  }

  const getStatusIcon = (status: Account['status']) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'inactive':
        return <AlertCircle className="h-4 w-4 text-red-600" />
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />
    }
  }

  const formatBalance = (balance: number, type: Account['type']) => {
    const isDebt = type === 'credit' || type === 'loan' || balance < 0
    const amount = Math.abs(balance)
    
    return {
      value: `${isDebt ? '-' : '+'}$${amount.toLocaleString()}`,
      className: isDebt ? 'text-red-600' : 'text-green-600'
    }
  }

  const totalAssets = accounts
    .filter(acc => acc.type !== 'credit' && acc.type !== 'loan' && acc.balance > 0)
    .reduce((sum, acc) => sum + acc.balance, 0)

  const totalLiabilities = Math.abs(accounts
    .filter(acc => acc.type === 'credit' || acc.type === 'loan' || acc.balance < 0)
    .reduce((sum, acc) => sum + Math.abs(acc.balance), 0))

  const netWorth = totalAssets - totalLiabilities

  const handleAddAccount = () => {
    const account: Account = {
      id: crypto.randomUUID(),
      ...newAccount,
      balance: 0,
      status: 'pending',
      lastSync: new Date().toISOString()
    }
    
    setAccounts(prev => [...prev, account])
    setNewAccount({ name: "", type: "checking", bank: "", accountNumber: "" })
    setIsAddingAccount(false)
  }

  const handleDeleteAccount = (id: string) => {
    setAccounts(prev => prev.filter(acc => acc.id !== id))
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      
      <main className="flex-1 space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Accounts</h1>
            <p className="text-muted-foreground">
              Manage your bank accounts, credit cards, and investments
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowBalances(!showBalances)}
            >
              {showBalances ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
              {showBalances ? 'Hide' : 'Show'} Balances
            </Button>
            <Dialog open={isAddingAccount} onOpenChange={setIsAddingAccount}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Account
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Account</DialogTitle>
                  <DialogDescription>
                    Connect a new financial account to start tracking.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="accountName">Account Name</Label>
                    <Input
                      id="accountName"
                      placeholder="e.g., Primary Checking"
                      value={newAccount.name}
                      onChange={(e) => setNewAccount(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="accountType">Account Type</Label>
                    <select 
                      id="accountType"
                      value={newAccount.type}
                      onChange={(e) => setNewAccount(prev => ({ ...prev, type: e.target.value as Account['type'] }))}
                      className="w-full px-3 py-2 text-sm border rounded-md bg-background"
                    >
                      <option value="checking">Checking</option>
                      <option value="savings">Savings</option>
                      <option value="credit">Credit Card</option>
                      <option value="investment">Investment</option>
                      <option value="loan">Loan</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bankName">Bank/Institution</Label>
                    <Input
                      id="bankName"
                      placeholder="e.g., Chase Bank"
                      value={newAccount.bank}
                      onChange={(e) => setNewAccount(prev => ({ ...prev, bank: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="accountNumber">Account Number (Last 4 digits)</Label>
                    <Input
                      id="accountNumber"
                      placeholder="1234"
                      maxLength={4}
                      value={newAccount.accountNumber}
                      onChange={(e) => setNewAccount(prev => ({ ...prev, accountNumber: e.target.value }))}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddingAccount(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleAddAccount}
                    disabled={!newAccount.name || !newAccount.bank || !newAccount.accountNumber}
                  >
                    Add Account
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Assets</p>
                  <p className="text-2xl font-bold text-green-600">
                    {showBalances ? `$${totalAssets.toLocaleString()}` : '••••••'}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Liabilities</p>
                  <p className="text-2xl font-bold text-red-600">
                    {showBalances ? `$${totalLiabilities.toLocaleString()}` : '••••••'}
                  </p>
                </div>
                <CreditCard className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Net Worth</p>
                  <p className={`text-2xl font-bold ${netWorth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {showBalances ? `$${netWorth.toLocaleString()}` : '••••••'}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Connected Accounts</p>
                  <p className="text-2xl font-bold">{accounts.length}</p>
                </div>
                <Building2 className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Accounts Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Accounts</CardTitle>
            <CardDescription>
              Overview of all your connected financial accounts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Bank</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Sync</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.map((account) => {
                  const Icon = getAccountIcon(account.type)
                  const balanceFormat = formatBalance(account.balance, account.type)
                  
                  return (
                    <TableRow key={account.id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <Icon className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <div className="font-medium">{account.name}</div>
                            <div className="text-sm text-muted-foreground">
                              ****{account.accountNumber}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium capitalize ${getAccountTypeColor(account.type)}`}>
                          {account.type}
                        </span>
                      </TableCell>
                      <TableCell>{account.bank}</TableCell>
                      <TableCell>
                        <span className={`font-medium ${balanceFormat.className}`}>
                          {showBalances ? balanceFormat.value : '••••••'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(account.status)}
                          <span className="capitalize">{account.status}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {new Date(account.lastSync).toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <Button variant="ghost" size="sm">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Settings className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-red-600 hover:text-red-700"
                            onClick={() => handleDeleteAccount(account.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Connection Info */}
        <Card>
          <CardHeader>
            <CardTitle>Account Connection</CardTitle>
            <CardDescription>
              Information about connecting and syncing your accounts
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                All accounts are securely connected using bank-level encryption. 
                We never store your login credentials.
              </AlertDescription>
            </Alert>
            
            <div className="space-y-3">
              <h4 className="font-medium">Sync Schedule</h4>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>• Bank accounts: Every 4 hours</p>
                <p>• Credit cards: Every 2 hours</p>
                <p>• Investment accounts: Daily at 9 AM</p>
                <p>• Loan accounts: Daily at 3 PM</p>
              </div>
            </div>
            
            <div className="flex space-x-2">
              <Button variant="outline">
                Sync All Accounts
              </Button>
              <Button variant="outline">
                Connection Settings
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}