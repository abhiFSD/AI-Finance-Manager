"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Header } from "@/components/layout/header"
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { 
  Search,
  Filter,
  Download,
  Calendar,
  ArrowUpDown,
  TrendingUp,
  TrendingDown,
  DollarSign,
  CreditCard,
  Plus,
  Edit,
  Tag
} from "lucide-react"

// Mock transaction data
const mockTransactions = [
  {
    id: "1",
    date: "2024-12-15",
    merchant: "Starbucks Coffee",
    category: "Food & Dining",
    amount: -12.50,
    type: "debit",
    account: "Chase Checking",
    description: "Coffee and pastry",
    status: "completed"
  },
  {
    id: "2",
    date: "2024-12-15",
    merchant: "Salary Deposit",
    category: "Income",
    amount: 3500.00,
    type: "credit",
    account: "Chase Checking", 
    description: "Monthly salary",
    status: "completed"
  },
  {
    id: "3",
    date: "2024-12-14",
    merchant: "Amazon.com",
    category: "Shopping",
    amount: -89.99,
    type: "debit",
    account: "Chase Credit Card",
    description: "Electronics purchase",
    status: "completed"
  },
  {
    id: "4",
    date: "2024-12-14",
    merchant: "Shell Gas Station",
    category: "Transportation",
    amount: -45.20,
    type: "debit",
    account: "Chase Checking",
    description: "Gas fill-up",
    status: "completed"
  },
  {
    id: "5",
    date: "2024-12-13",
    merchant: "Netflix",
    category: "Entertainment",
    amount: -14.99,
    type: "debit",
    account: "Chase Checking",
    description: "Monthly subscription",
    status: "completed"
  },
  {
    id: "6",
    date: "2024-12-12",
    merchant: "Whole Foods",
    category: "Groceries",
    amount: -156.78,
    type: "debit",
    account: "Chase Checking",
    description: "Weekly grocery shopping",
    status: "completed"
  },
  {
    id: "7",
    date: "2024-12-12",
    merchant: "Uber",
    category: "Transportation",
    amount: -23.45,
    type: "debit",
    account: "Chase Credit Card",
    description: "Ride to airport",
    status: "completed"
  },
  {
    id: "8",
    date: "2024-12-11",
    merchant: "Gym Membership",
    category: "Health & Fitness",
    amount: -79.99,
    type: "debit",
    account: "Chase Checking",
    description: "Monthly gym membership",
    status: "completed"
  }
]

export default function TransactionsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [transactions] = useState(mockTransactions)
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null)
  const [filterCategory, setFilterCategory] = useState("all")
  const [filterType, setFilterType] = useState("all")

  // Filter transactions
  let filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = transaction.merchant.toLowerCase().includes(searchQuery.toLowerCase()) ||
      transaction.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      transaction.category.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesCategory = filterCategory === "all" || transaction.category === filterCategory
    const matchesType = filterType === "all" || transaction.type === filterType

    return matchesSearch && matchesCategory && matchesType
  })

  // Sort transactions
  if (sortConfig) {
    filteredTransactions = [...filteredTransactions].sort((a, b) => {
      const aValue = a[sortConfig.key as keyof typeof a]
      const bValue = b[sortConfig.key as keyof typeof b]
      
      if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1
      if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1
      return 0
    })
  }

  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev?.key === key && prev.direction === "asc" ? "desc" : "asc"
    }))
  }

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      "Food & Dining": "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
      "Transportation": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
      "Shopping": "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
      "Entertainment": "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300",
      "Groceries": "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
      "Income": "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300",
      "Health & Fitness": "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300"
    }
    return colors[category] || "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
  }

  const totalIncome = transactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0)
  const totalExpenses = Math.abs(transactions.filter(t => t.amount < 0).reduce((sum, t) => sum + t.amount, 0))

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      
      <main className="flex-1 space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
            <p className="text-muted-foreground">
              View and manage all your financial transactions
            </p>
          </div>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Transaction
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Transactions</p>
                  <p className="text-2xl font-bold">{transactions.length}</p>
                </div>
                <CreditCard className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Income</p>
                  <p className="text-2xl font-bold text-green-600">${totalIncome.toLocaleString()}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Expenses</p>
                  <p className="text-2xl font-bold text-red-600">${totalExpenses.toLocaleString()}</p>
                </div>
                <TrendingDown className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Net Amount</p>
                  <p className={`text-2xl font-bold ${totalIncome - totalExpenses >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ${(totalIncome - totalExpenses).toLocaleString()}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>All Transactions</CardTitle>
                <CardDescription>
                  Filter and search through your transaction history
                </CardDescription>
              </div>
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search transactions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 w-64"
                  />
                </div>
                <select 
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="px-3 py-2 text-sm border rounded-md bg-background"
                >
                  <option value="all">All Categories</option>
                  <option value="Food & Dining">Food & Dining</option>
                  <option value="Transportation">Transportation</option>
                  <option value="Shopping">Shopping</option>
                  <option value="Entertainment">Entertainment</option>
                  <option value="Groceries">Groceries</option>
                  <option value="Income">Income</option>
                  <option value="Health & Fitness">Health & Fitness</option>
                </select>
                <select 
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-3 py-2 text-sm border rounded-md bg-background"
                >
                  <option value="all">All Types</option>
                  <option value="credit">Income</option>
                  <option value="debit">Expenses</option>
                </select>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <Button 
                      variant="ghost" 
                      onClick={() => handleSort("date")}
                      className="h-auto p-0 font-semibold"
                    >
                      Date
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button 
                      variant="ghost" 
                      onClick={() => handleSort("merchant")}
                      className="h-auto p-0 font-semibold"
                    >
                      Merchant
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead>
                    <Button 
                      variant="ghost" 
                      onClick={() => handleSort("amount")}
                      className="h-auto p-0 font-semibold"
                    >
                      Amount
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>
                      <div className="flex items-center space-x-1 text-sm">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        {new Date(transaction.date).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{transaction.merchant}</div>
                        <div className="text-sm text-muted-foreground">{transaction.description}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${getCategoryColor(transaction.category)}`}>
                        {transaction.category}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">{transaction.account}</span>
                    </TableCell>
                    <TableCell>
                      <span className={`font-medium ${
                        transaction.amount > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {transaction.amount > 0 ? '+' : ''}${Math.abs(transaction.amount).toFixed(2)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Tag className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}