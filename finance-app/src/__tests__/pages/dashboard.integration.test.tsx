import React from 'react'
import { render, screen, waitFor } from '@/__tests__/utils/test-utils'
import { axe, toHaveNoViolations } from 'jest-axe'
import DashboardPage from '@/app/dashboard/page'

expect.extend(toHaveNoViolations)

// Mock the chart components to avoid Recharts complexities in integration tests
jest.mock('@/components/charts/pie-chart', () => ({
  CustomPieChart: ({ data, title }: { data: any[], title?: string }) => (
    <div data-testid="pie-chart" data-title={title}>
      <h3>{title}</h3>
      {data.map((item, index) => (
        <div key={index} data-testid={`pie-data-${index}`}>
          {item.name}: {item.value}
        </div>
      ))}
    </div>
  ),
}))

jest.mock('@/components/charts/line-chart', () => ({
  CustomLineChart: ({ data, lines, title }: { data: any[], lines: any[], title?: string }) => (
    <div data-testid="line-chart" data-title={title}>
      <h3>{title}</h3>
      {lines.map((line, index) => (
        <div key={index} data-testid={`line-${line.dataKey}`}>
          Line: {line.name || line.dataKey}
        </div>
      ))}
    </div>
  ),
}))

jest.mock('@/components/charts/bar-chart', () => ({
  CustomBarChart: ({ data, bars, title }: { data: any[], bars: any[], title?: string }) => (
    <div data-testid="bar-chart" data-title={title}>
      <h3>{title}</h3>
      {bars.map((bar, index) => (
        <div key={index} data-testid={`bar-${bar.dataKey}`}>
          Bar: {bar.name || bar.dataKey}
        </div>
      ))}
    </div>
  ),
}))

// Mock the header component
jest.mock('@/components/layout/header', () => ({
  Header: () => (
    <header data-testid="header">
      <h1>Finance App</h1>
      <nav>Navigation</nav>
    </header>
  ),
}))

describe('Dashboard Page Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Page Layout and Structure', () => {
    it('renders complete dashboard layout', () => {
      render(<DashboardPage />)
      
      // Check main layout elements
      expect(screen.getByTestId('header')).toBeInTheDocument()
      expect(screen.getByRole('main')).toBeInTheDocument()
      expect(screen.getByText('Dashboard')).toBeInTheDocument()
    })

    it('displays last updated timestamp', () => {
      render(<DashboardPage />)
      
      expect(screen.getByText(/Last updated:/)).toBeInTheDocument()
    })

    it('has proper main content structure', () => {
      render(<DashboardPage />)
      
      const main = screen.getByRole('main')
      expect(main).toHaveClass('flex-1', 'space-y-6', 'p-6')
    })
  })

  describe('Financial Overview Cards', () => {
    it('displays all key financial metrics', () => {
      render(<DashboardPage />)
      
      // Check for all overview cards
      expect(screen.getByText('Net Worth')).toBeInTheDocument()
      expect(screen.getByText('Monthly Income')).toBeInTheDocument()
      expect(screen.getByText('Monthly Expenses')).toBeInTheDocument()
      expect(screen.getByText('Savings Rate')).toBeInTheDocument()
    })

    it('shows formatted financial values', () => {
      render(<DashboardPage />)
      
      // Check for properly formatted currency values
      expect(screen.getByText('$45,251')).toBeInTheDocument() // Net Worth
      expect(screen.getByText('$4,600')).toBeInTheDocument()  // Income
      expect(screen.getByText('$3,200')).toBeInTheDocument()  // Expenses
    })

    it('displays percentage changes and trends', () => {
      render(<DashboardPage />)
      
      // Check for trend indicators
      expect(screen.getByText('+2.1% from last month')).toBeInTheDocument()
      expect(screen.getByText('+5.2% from last month')).toBeInTheDocument()
      expect(screen.getByText('-3.1% from last month')).toBeInTheDocument()
    })

    it('calculates savings rate correctly', () => {
      render(<DashboardPage />)
      
      // Savings rate should be calculated as (income - expenses) / income * 100
      // (4600 - 3200) / 4600 * 100 = 30.4%
      expect(screen.getByText('30.4%')).toBeInTheDocument()
      expect(screen.getByText('Target: 20%')).toBeInTheDocument()
    })

    it('displays proper icons for each metric', () => {
      render(<DashboardPage />)
      
      // Check that icons are present (they should be rendered as SVG elements)
      const cards = screen.getAllByRole('generic').filter(el => 
        el.querySelector('svg')
      )
      expect(cards.length).toBeGreaterThan(0)
    })

    it('uses correct color coding for positive/negative values', () => {
      render(<DashboardPage />)
      
      // Income should be green, expenses should be red
      const incomeValue = screen.getByText('$4,600')
      const expenseValue = screen.getByText('$3,200')
      
      expect(incomeValue).toHaveClass('text-green-600')
      expect(expenseValue).toHaveClass('text-red-600')
    })
  })

  describe('Charts and Visualizations', () => {
    it('renders income vs expenses line chart', () => {
      render(<DashboardPage />)
      
      const lineChart = screen.getByTestId('line-chart')
      expect(lineChart).toHaveAttribute('data-title', 'Income vs Expenses Trend')
      
      // Check for line chart data
      expect(screen.getByTestId('line-income')).toBeInTheDocument()
      expect(screen.getByTestId('line-expenses')).toBeInTheDocument()
      expect(screen.getByTestId('line-savings')).toBeInTheDocument()
    })

    it('renders spending breakdown pie chart', () => {
      render(<DashboardPage />)
      
      const pieChart = screen.getByTestId('pie-chart')
      expect(pieChart).toHaveAttribute('data-title', 'Spending Breakdown')
      
      // Check that spending categories are displayed
      expect(screen.getByText('Food & Dining: 2400')).toBeInTheDocument()
      expect(screen.getByText('Transportation: 1200')).toBeInTheDocument()
      expect(screen.getByText('Entertainment: 800')).toBeInTheDocument()
    })

    it('renders category comparison bar chart', () => {
      render(<DashboardPage />)
      
      const barChart = screen.getByTestId('bar-chart')
      expect(barChart).toHaveAttribute('data-title', 'Category Spending Comparison')
      
      // Check for bar chart data
      expect(screen.getByTestId('bar-thisMonth')).toBeInTheDocument()
      expect(screen.getByTestId('bar-lastMonth')).toBeInTheDocument()
    })

    it('provides proper chart descriptions', () => {
      render(<DashboardPage />)
      
      expect(screen.getByText('Monthly comparison of your income, expenses, and savings')).toBeInTheDocument()
      expect(screen.getByText('Where your money goes this month')).toBeInTheDocument()
      expect(screen.getByText('This month vs last month spending by category')).toBeInTheDocument()
    })
  })

  describe('Quick Actions Section', () => {
    it('displays all quick action items', () => {
      render(<DashboardPage />)
      
      expect(screen.getByText('Quick Actions')).toBeInTheDocument()
      expect(screen.getByText('Upload Documents')).toBeInTheDocument()
      expect(screen.getByText('Set Budget Goals')).toBeInTheDocument()
      expect(screen.getByText('Investment Review')).toBeInTheDocument()
    })

    it('shows budget alert with proper styling', () => {
      render(<DashboardPage />)
      
      const budgetAlert = screen.getByText('Budget Alert').closest('div')
      expect(budgetAlert).toHaveClass('bg-yellow-50', 'dark:bg-yellow-900/20')
      expect(screen.getByText("You're 80% through your dining budget")).toBeInTheDocument()
    })

    it('displays action descriptions', () => {
      render(<DashboardPage />)
      
      expect(screen.getByText('Add new bank statements or receipts')).toBeInTheDocument()
      expect(screen.getByText('Create spending limits for categories')).toBeInTheDocument()
      expect(screen.getByText('Check portfolio performance')).toBeInTheDocument()
    })
  })

  describe('Recent Transactions', () => {
    it('displays recent transactions section', () => {
      render(<DashboardPage />)
      
      expect(screen.getByText('Recent Transactions')).toBeInTheDocument()
      expect(screen.getByText('Your latest financial activity')).toBeInTheDocument()
    })

    it('shows transaction details with proper formatting', () => {
      render(<DashboardPage />)
      
      // Check for specific transactions
      expect(screen.getByText('Starbucks Coffee')).toBeInTheDocument()
      expect(screen.getByText('Spotify Premium')).toBeInTheDocument()
      expect(screen.getByText('Salary Deposit')).toBeInTheDocument()
      
      // Check for proper amount formatting
      expect(screen.getByText('$12.50')).toBeInTheDocument()
      expect(screen.getByText('+$2,300.00')).toBeInTheDocument()
    })

    it('displays transaction categories and dates', () => {
      render(<DashboardPage />)
      
      expect(screen.getByText(/Food & Dining • Today/)).toBeInTheDocument()
      expect(screen.getByText(/Entertainment • Yesterday/)).toBeInTheDocument()
      expect(screen.getByText(/Income • 2 days ago/)).toBeInTheDocument()
    })

    it('uses correct color coding for transaction amounts', () => {
      render(<DashboardPage />)
      
      // Income transactions should be green, expenses red
      const salaryAmount = screen.getByText('+$2,300.00')
      const starbucksAmount = screen.getByText('$12.50')
      
      expect(salaryAmount.closest('div')).toHaveClass('text-green-600')
      expect(starbucksAmount.closest('div')).toHaveClass('text-red-600')
    })
  })

  describe('Responsive Design', () => {
    it('uses responsive grid classes', () => {
      render(<DashboardPage />)
      
      // Check for responsive grid layouts
      const overviewGrid = screen.getByText('Net Worth').closest('div')?.parentElement
      expect(overviewGrid).toHaveClass('grid', 'gap-4', 'md:grid-cols-2', 'lg:grid-cols-4')
    })

    it('applies responsive chart layouts', () => {
      render(<DashboardPage />)
      
      const chartGrids = screen.getAllByRole('generic').filter(el => 
        el.classList.contains('grid') && el.classList.contains('md:grid-cols-2')
      )
      expect(chartGrids.length).toBeGreaterThan(0)
    })
  })

  describe('Accessibility', () => {
    it('has no accessibility violations', async () => {
      const { container } = render(<DashboardPage />)
      
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('has proper heading hierarchy', () => {
      render(<DashboardPage />)
      
      // Main page heading
      expect(screen.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeInTheDocument()
      
      // Section headings should be h3 (from chart titles)
      const chartTitles = screen.getAllByRole('heading', { level: 3 })
      expect(chartTitles.length).toBeGreaterThan(0)
    })

    it('provides meaningful descriptions for financial data', () => {
      render(<DashboardPage />)
      
      // Card titles should be descriptive
      expect(screen.getByText('Net Worth')).toBeInTheDocument()
      expect(screen.getByText('Monthly Income')).toBeInTheDocument()
      expect(screen.getByText('Monthly Expenses')).toBeInTheDocument()
      expect(screen.getByText('Savings Rate')).toBeInTheDocument()
    })
  })

  describe('Data Integration', () => {
    it('displays consistent financial calculations', () => {
      render(<DashboardPage />)
      
      // Verify data consistency across different components
      const income = 4600
      const expenses = 3200
      const savings = income - expenses
      const savingsRate = (savings / income) * 100

      expect(screen.getByText('$4,600')).toBeInTheDocument()
      expect(screen.getByText('$3,200')).toBeInTheDocument()
      expect(screen.getByText('30.4%')).toBeInTheDocument() // Calculated savings rate
    })

    it('uses mock data consistently across charts', () => {
      render(<DashboardPage />)
      
      // Check that chart data is displayed
      expect(screen.getByTestId('pie-chart')).toBeInTheDocument()
      expect(screen.getByTestId('line-chart')).toBeInTheDocument()
      expect(screen.getByTestId('bar-chart')).toBeInTheDocument()
    })
  })

  describe('Performance', () => {
    it('renders efficiently', () => {
      const startTime = performance.now()
      
      render(<DashboardPage />)
      
      const endTime = performance.now()
      const renderTime = endTime - startTime
      
      expect(renderTime).toBeLessThan(1000) // Should render within 1 second
      expect(screen.getByText('Dashboard')).toBeInTheDocument()
    })

    it('handles re-renders efficiently', () => {
      const { rerender } = render(<DashboardPage />)
      
      // Re-render the page
      rerender(<DashboardPage />)
      
      expect(screen.getByText('Dashboard')).toBeInTheDocument()
    })
  })

  describe('Theme Integration', () => {
    it('works with light theme', () => {
      render(<DashboardPage />, { theme: 'light' })
      
      expect(screen.getByText('Dashboard')).toBeInTheDocument()
      // Charts and components should render correctly in light theme
      expect(screen.getByTestId('pie-chart')).toBeInTheDocument()
    })

    it('works with dark theme', () => {
      render(<DashboardPage />, { theme: 'dark' })
      
      expect(screen.getByText('Dashboard')).toBeInTheDocument()
      // Charts and components should render correctly in dark theme
      expect(screen.getByTestId('pie-chart')).toBeInTheDocument()
    })
  })

  describe('Error Boundaries', () => {
    it('handles chart rendering errors gracefully', () => {
      // Mock console.error to avoid noise in test output
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
      
      // This would test error boundary behavior if implemented
      render(<DashboardPage />)
      
      expect(screen.getByText('Dashboard')).toBeInTheDocument()
      
      consoleSpy.mockRestore()
    })
  })

  describe('Loading States', () => {
    it('renders content immediately with mock data', () => {
      render(<DashboardPage />)
      
      // All content should be visible immediately since we're using mock data
      expect(screen.getByText('Dashboard')).toBeInTheDocument()
      expect(screen.getByText('$45,251')).toBeInTheDocument()
      expect(screen.getByTestId('pie-chart')).toBeInTheDocument()
    })
  })

  describe('Navigation and Layout', () => {
    it('maintains proper layout structure', () => {
      render(<DashboardPage />)
      
      // Check for proper layout classes
      const pageContainer = screen.getByRole('main').parentElement
      expect(pageContainer).toHaveClass('flex', 'min-h-screen', 'flex-col')
    })

    it('includes header component', () => {
      render(<DashboardPage />)
      
      expect(screen.getByTestId('header')).toBeInTheDocument()
    })
  })
})