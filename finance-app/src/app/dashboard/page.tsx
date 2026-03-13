"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CustomPieChart } from "@/components/charts/pie-chart"
import { CustomLineChart } from "@/components/charts/line-chart"
import { CustomBarChart } from "@/components/charts/bar-chart"
import { Header } from "@/components/layout/header"
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  CreditCard, 
  Target,
  PiggyBank,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react"

// Mock data for demonstration
const mockSpendingData = [
  { name: "Food & Dining", value: 2400, color: "hsl(var(--chart-1))" },
  { name: "Transportation", value: 1200, color: "hsl(var(--chart-2))" },
  { name: "Entertainment", value: 800, color: "hsl(var(--chart-3))" },
  { name: "Shopping", value: 1500, color: "hsl(var(--chart-4))" },
  { name: "Utilities", value: 600, color: "hsl(var(--chart-5))" }
]

const mockMonthlyData = [
  { name: "Jan", income: 4000, expenses: 3200, savings: 800 },
  { name: "Feb", income: 4200, expenses: 3400, savings: 800 },
  { name: "Mar", income: 3800, expenses: 3600, savings: 200 },
  { name: "Apr", income: 4500, expenses: 3100, savings: 1400 },
  { name: "May", income: 4300, expenses: 3500, savings: 800 },
  { name: "Jun", income: 4600, expenses: 3200, savings: 1400 }
]

const mockCategoryTrends = [
  { name: "Food", thisMonth: 1200, lastMonth: 1100 },
  { name: "Transport", thisMonth: 800, lastMonth: 900 },
  { name: "Entertainment", thisMonth: 600, lastMonth: 500 },
  { name: "Shopping", thisMonth: 900, lastMonth: 700 },
  { name: "Bills", thisMonth: 1500, lastMonth: 1400 }
]

export default function DashboardPage() {
  const netWorth = 45250.80
  const monthlyIncome = 4600
  const monthlyExpenses = 3200
  const monthlySavings = monthlyIncome - monthlyExpenses
  const savingsRate = (monthlySavings / monthlyIncome) * 100

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      
      <main className="flex-1 space-y-6 p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <div className="text-sm text-muted-foreground">
            Last updated: {new Date().toLocaleString()}
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Net Worth</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${netWorth.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                <TrendingUp className="inline h-3 w-3 mr-1" />
                +2.1% from last month
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Income</CardTitle>
              <ArrowUpRight className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">${monthlyIncome.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                +5.2% from last month
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Expenses</CardTitle>
              <ArrowDownRight className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">${monthlyExpenses.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                -3.1% from last month
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Savings Rate</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{savingsRate.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">
                Target: 20%
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
          <Card className="col-span-4">
            <CardHeader>
              <CardTitle>Income vs Expenses Trend</CardTitle>
              <CardDescription>
                Monthly comparison of your income, expenses, and savings
              </CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
              <CustomLineChart
                data={mockMonthlyData}
                lines={[
                  { dataKey: "income", name: "Income", color: "hsl(var(--chart-1))" },
                  { dataKey: "expenses", name: "Expenses", color: "hsl(var(--chart-2))" },
                  { dataKey: "savings", name: "Savings", color: "hsl(var(--chart-3))" }
                ]}
              />
            </CardContent>
          </Card>
          
          <Card className="col-span-3">
            <CardHeader>
              <CardTitle>Spending Breakdown</CardTitle>
              <CardDescription>
                Where your money goes this month
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CustomPieChart data={mockSpendingData} />
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
          <Card className="col-span-4">
            <CardHeader>
              <CardTitle>Category Spending Comparison</CardTitle>
              <CardDescription>
                This month vs last month spending by category
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CustomBarChart
                data={mockCategoryTrends}
                bars={[
                  { dataKey: "thisMonth", name: "This Month", color: "hsl(var(--chart-1))" },
                  { dataKey: "lastMonth", name: "Last Month", color: "hsl(var(--chart-2))" }
                ]}
              />
            </CardContent>
          </Card>
          
          <Card className="col-span-3">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Common financial tasks
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-4 rounded-md border p-4">
                <CreditCard className="h-5 w-5 text-blue-600" />
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium leading-none">
                    Upload Documents
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Add new bank statements or receipts
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4 rounded-md border p-4">
                <Target className="h-5 w-5 text-green-600" />
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium leading-none">
                    Set Budget Goals
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Create spending limits for categories
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4 rounded-md border p-4">
                <PiggyBank className="h-5 w-5 text-purple-600" />
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium leading-none">
                    Investment Review
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Check portfolio performance
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-4 rounded-md border p-4 bg-yellow-50 dark:bg-yellow-900/20">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium leading-none">
                    Budget Alert
                  </p>
                  <p className="text-xs text-muted-foreground">
                    You're 80% through your dining budget
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Transactions Preview */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
            <CardDescription>
              Your latest financial activity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { date: "Today", merchant: "Starbucks Coffee", category: "Food & Dining", amount: -12.50 },
                { date: "Yesterday", merchant: "Spotify Premium", category: "Entertainment", amount: -14.99 },
                { date: "2 days ago", merchant: "Salary Deposit", category: "Income", amount: 2300.00 },
                { date: "3 days ago", merchant: "Amazon Purchase", category: "Shopping", amount: -89.99 },
                { date: "4 days ago", merchant: "Shell Gas Station", category: "Transportation", amount: -45.20 }
              ].map((transaction, index) => (
                <div key={index} className="flex items-center justify-between border-b pb-2">
                  <div className="flex items-center space-x-4">
                    <div>
                      <p className="text-sm font-medium">{transaction.merchant}</p>
                      <p className="text-xs text-muted-foreground">{transaction.category} • {transaction.date}</p>
                    </div>
                  </div>
                  <div className={`text-sm font-medium ${
                    transaction.amount > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {transaction.amount > 0 ? '+' : ''}${Math.abs(transaction.amount).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}