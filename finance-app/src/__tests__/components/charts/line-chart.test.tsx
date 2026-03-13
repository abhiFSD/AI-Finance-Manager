import React from 'react'
import { render, screen } from '@/__tests__/utils/test-utils'
import { axe, toHaveNoViolations } from 'jest-axe'
import { CustomLineChart } from '@/components/charts/line-chart'
import { createMockMonthlyData } from '@/__tests__/utils/test-data'

expect.extend(toHaveNoViolations)

// Mock Recharts components
jest.mock('recharts', () => ({
  ...jest.requireActual('recharts'),
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  LineChart: ({ data, children }: { data: any[], children: React.ReactNode }) => (
    <div data-testid="line-chart" role="img" aria-label="Line chart" data-length={data.length}>
      {children}
    </div>
  ),
  Line: ({ dataKey, stroke, name }: { dataKey: string, stroke: string, name: string }) => (
    <div 
      data-testid={`line-${dataKey}`} 
      data-stroke={stroke}
      data-name={name}
    >
      Line: {dataKey}
    </div>
  ),
  XAxis: ({ dataKey }: { dataKey: string }) => (
    <div data-testid="x-axis" data-key={dataKey} />
  ),
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: ({ strokeDasharray }: { strokeDasharray: string }) => (
    <div data-testid="cartesian-grid" data-stroke-dasharray={strokeDasharray} />
  ),
  Tooltip: () => <div data-testid="chart-tooltip" />,
  Legend: () => <div data-testid="chart-legend" />,
}))

describe('CustomLineChart Component', () => {
  const mockData = createMockMonthlyData(6)
  const basicLines = [
    { dataKey: 'income', name: 'Income', color: '#22c55e' },
    { dataKey: 'expenses', name: 'Expenses', color: '#ef4444' }
  ]

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Basic Rendering', () => {
    it('renders with basic props', () => {
      render(<CustomLineChart data={mockData} lines={basicLines} />)
      
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument()
      expect(screen.getByTestId('line-chart')).toBeInTheDocument()
      expect(screen.getByTestId('x-axis')).toBeInTheDocument()
      expect(screen.getByTestId('y-axis')).toBeInTheDocument()
      expect(screen.getByTestId('cartesian-grid')).toBeInTheDocument()
      expect(screen.getByTestId('chart-tooltip')).toBeInTheDocument()
      expect(screen.getByTestId('chart-legend')).toBeInTheDocument()
    })

    it('renders title when provided', () => {
      const title = 'Monthly Income vs Expenses'
      render(<CustomLineChart data={mockData} lines={basicLines} title={title} />)
      
      const titleElement = screen.getByText(title)
      expect(titleElement).toBeInTheDocument()
      expect(titleElement).toHaveClass('text-lg', 'font-semibold', 'mb-4', 'text-center')
    })

    it('does not render title when not provided', () => {
      render(<CustomLineChart data={mockData} lines={basicLines} />)
      
      expect(screen.queryByRole('heading')).not.toBeInTheDocument()
    })

    it('passes data to LineChart component', () => {
      render(<CustomLineChart data={mockData} lines={basicLines} />)
      
      const lineChart = screen.getByTestId('line-chart')
      expect(lineChart).toHaveAttribute('data-length', mockData.length.toString())
    })
  })

  describe('Lines Configuration', () => {
    it('renders all specified lines', () => {
      const multiLines = [
        { dataKey: 'income', name: 'Income', color: '#22c55e' },
        { dataKey: 'expenses', name: 'Expenses', color: '#ef4444' },
        { dataKey: 'savings', name: 'Savings', color: '#3b82f6' }
      ]
      
      render(<CustomLineChart data={mockData} lines={multiLines} />)
      
      expect(screen.getByTestId('line-income')).toBeInTheDocument()
      expect(screen.getByTestId('line-expenses')).toBeInTheDocument()
      expect(screen.getByTestId('line-savings')).toBeInTheDocument()
    })

    it('uses custom colors when provided', () => {
      const customColorLines = [
        { dataKey: 'income', color: '#ff0000' },
        { dataKey: 'expenses', color: '#00ff00' }
      ]
      
      render(<CustomLineChart data={mockData} lines={customColorLines} />)
      
      const incomeLine = screen.getByTestId('line-income')
      const expensesLine = screen.getByTestId('line-expenses')
      
      expect(incomeLine).toHaveAttribute('data-stroke', '#ff0000')
      expect(expensesLine).toHaveAttribute('data-stroke', '#00ff00')
    })

    it('uses default colors when not provided', () => {
      const noColorLines = [
        { dataKey: 'income' },
        { dataKey: 'expenses' }
      ]
      
      render(<CustomLineChart data={mockData} lines={noColorLines} />)
      
      const incomeLine = screen.getByTestId('line-income')
      expect(incomeLine).toHaveAttribute('data-stroke', 'hsl(var(--chart-1))')
    })

    it('uses custom names when provided', () => {
      const customNameLines = [
        { dataKey: 'income', name: 'Monthly Income' },
        { dataKey: 'expenses', name: 'Monthly Expenses' }
      ]
      
      render(<CustomLineChart data={mockData} lines={customNameLines} />)
      
      const incomeLine = screen.getByTestId('line-income')
      const expensesLine = screen.getByTestId('line-expenses')
      
      expect(incomeLine).toHaveAttribute('data-name', 'Monthly Income')
      expect(expensesLine).toHaveAttribute('data-name', 'Monthly Expenses')
    })

    it('uses dataKey as name when name not provided', () => {
      const noNameLines = [{ dataKey: 'income' }]
      
      render(<CustomLineChart data={mockData} lines={noNameLines} />)
      
      const incomeLine = screen.getByTestId('line-income')
      expect(incomeLine).toHaveAttribute('data-name', 'income')
    })

    it('handles single line', () => {
      const singleLine = [{ dataKey: 'income', color: '#22c55e' }]
      
      render(<CustomLineChart data={mockData} lines={singleLine} />)
      
      expect(screen.getByTestId('line-income')).toBeInTheDocument()
      expect(screen.queryByTestId('line-expenses')).not.toBeInTheDocument()
    })

    it('handles many lines with color cycling', () => {
      const manyLines = Array.from({ length: 8 }, (_, i) => ({
        dataKey: `line${i}`,
        name: `Line ${i}`
      }))
      
      render(<CustomLineChart data={mockData} lines={manyLines} />)
      
      // Check that lines use cycled colors
      const line6 = screen.getByTestId('line-line6') // Index 6, should cycle to chart-2
      expect(line6).toHaveAttribute('data-stroke', 'hsl(var(--chart-2))')
    })
  })

  describe('Axis Configuration', () => {
    it('uses default xAxisKey', () => {
      render(<CustomLineChart data={mockData} lines={basicLines} />)
      
      const xAxis = screen.getByTestId('x-axis')
      expect(xAxis).toHaveAttribute('data-key', 'name')
    })

    it('uses custom xAxisKey when provided', () => {
      render(<CustomLineChart data={mockData} lines={basicLines} xAxisKey="month" />)
      
      const xAxis = screen.getByTestId('x-axis')
      expect(xAxis).toHaveAttribute('data-key', 'month')
    })

    it('renders CartesianGrid with correct dash array', () => {
      render(<CustomLineChart data={mockData} lines={basicLines} />)
      
      const grid = screen.getByTestId('cartesian-grid')
      expect(grid).toHaveAttribute('data-stroke-dasharray', '3 3')
    })
  })

  describe('Data Handling', () => {
    it('handles empty data array', () => {
      render(<CustomLineChart data={[]} lines={basicLines} />)
      
      const lineChart = screen.getByTestId('line-chart')
      expect(lineChart).toHaveAttribute('data-length', '0')
    })

    it('handles empty lines array', () => {
      render(<CustomLineChart data={mockData} lines={[]} />)
      
      expect(screen.getByTestId('line-chart')).toBeInTheDocument()
      expect(screen.queryByTestId(/^line-/)).not.toBeInTheDocument()
    })

    it('handles single data point', () => {
      const singleData = [{ name: 'Jan', income: 1000, expenses: 800 }]
      
      render(<CustomLineChart data={singleData} lines={basicLines} />)
      
      const lineChart = screen.getByTestId('line-chart')
      expect(lineChart).toHaveAttribute('data-length', '1')
    })

    it('handles data with missing values', () => {
      const incompleteData = [
        { name: 'Jan', income: 1000 }, // Missing expenses
        { name: 'Feb', expenses: 800 }, // Missing income
        { name: 'Mar', income: 1200, expenses: 900 }
      ]
      
      render(<CustomLineChart data={incompleteData} lines={basicLines} />)
      
      expect(screen.getByTestId('line-chart')).toBeInTheDocument()
    })
  })

  describe('Styling and Layout', () => {
    it('has proper container classes', () => {
      render(<CustomLineChart data={mockData} lines={basicLines} />)
      
      const container = screen.getByTestId('responsive-container').parentElement
      expect(container).toHaveClass('w-full', 'h-80')
    })

    it('renders chart with proper ARIA attributes', () => {
      render(<CustomLineChart data={mockData} lines={basicLines} />)
      
      const chart = screen.getByTestId('line-chart')
      expect(chart).toHaveAttribute('role', 'img')
      expect(chart).toHaveAttribute('aria-label', 'Line chart')
    })

    it('title has proper styling', () => {
      const title = 'Test Chart Title'
      render(<CustomLineChart data={mockData} lines={basicLines} title={title} />)
      
      const titleElement = screen.getByText(title)
      expect(titleElement).toHaveClass('text-lg', 'font-semibold', 'mb-4', 'text-center')
    })
  })

  describe('Chart Components', () => {
    it('includes all required chart components', () => {
      render(<CustomLineChart data={mockData} lines={basicLines} />)
      
      expect(screen.getByTestId('x-axis')).toBeInTheDocument()
      expect(screen.getByTestId('y-axis')).toBeInTheDocument()
      expect(screen.getByTestId('cartesian-grid')).toBeInTheDocument()
      expect(screen.getByTestId('chart-tooltip')).toBeInTheDocument()
      expect(screen.getByTestId('chart-legend')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has no accessibility violations', async () => {
      const { container } = render(
        <CustomLineChart 
          data={mockData} 
          lines={basicLines} 
          title="Accessible Line Chart" 
        />
      )
      
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('provides chart description through title', () => {
      const title = 'Monthly Financial Trends'
      render(<CustomLineChart data={mockData} lines={basicLines} title={title} />)
      
      expect(screen.getByText(title)).toBeInTheDocument()
    })

    it('chart has proper role and aria-label', () => {
      render(<CustomLineChart data={mockData} lines={basicLines} />)
      
      const chart = screen.getByRole('img')
      expect(chart).toHaveAttribute('aria-label', 'Line chart')
    })
  })

  describe('Edge Cases', () => {
    it('handles undefined data gracefully', () => {
      expect(() => {
        render(<CustomLineChart data={undefined as any} lines={basicLines} />)
      }).not.toThrow()
    })

    it('handles null lines gracefully', () => {
      expect(() => {
        render(<CustomLineChart data={mockData} lines={null as any} />)
      }).not.toThrow()
    })

    it('handles lines with missing dataKey', () => {
      const invalidLines = [
        { dataKey: 'income' },
        { name: 'Invalid Line' } as any // Missing dataKey
      ]
      
      expect(() => {
        render(<CustomLineChart data={mockData} lines={invalidLines} />)
      }).not.toThrow()
    })

    it('handles very large datasets', () => {
      const largeData = Array.from({ length: 1000 }, (_, i) => ({
        name: `Month ${i}`,
        value1: Math.random() * 1000,
        value2: Math.random() * 1000
      }))
      
      const lines = [
        { dataKey: 'value1', name: 'Value 1' },
        { dataKey: 'value2', name: 'Value 2' }
      ]
      
      render(<CustomLineChart data={largeData} lines={lines} />)
      
      const lineChart = screen.getByTestId('line-chart')
      expect(lineChart).toHaveAttribute('data-length', '1000')
    })

    it('handles special characters in data keys', () => {
      const specialData = [{ 
        'name': 'Jan',
        'income-total': 1000, 
        'expenses_total': 800 
      }]
      
      const specialLines = [
        { dataKey: 'income-total', name: 'Income Total' },
        { dataKey: 'expenses_total', name: 'Expenses Total' }
      ]
      
      render(<CustomLineChart data={specialData} lines={specialLines} />)
      
      expect(screen.getByTestId('line-income-total')).toBeInTheDocument()
      expect(screen.getByTestId('line-expenses_total')).toBeInTheDocument()
    })
  })

  describe('Performance', () => {
    it('renders efficiently with complex data', () => {
      const startTime = performance.now()
      
      const complexData = Array.from({ length: 100 }, (_, i) => ({
        name: `Period ${i}`,
        line1: Math.random() * 1000,
        line2: Math.random() * 1000,
        line3: Math.random() * 1000,
        line4: Math.random() * 1000,
        line5: Math.random() * 1000
      }))
      
      const complexLines = Array.from({ length: 5 }, (_, i) => ({
        dataKey: `line${i + 1}`,
        name: `Line ${i + 1}`,
        color: `#${Math.floor(Math.random()*16777215).toString(16)}`
      }))
      
      render(<CustomLineChart data={complexData} lines={complexLines} />)
      
      const endTime = performance.now()
      const renderTime = endTime - startTime
      
      expect(renderTime).toBeLessThan(1000) // Should render within 1 second
      expect(screen.getByTestId('line-chart')).toBeInTheDocument()
    })

    it('does not re-render unnecessarily', () => {
      const { rerender } = render(
        <CustomLineChart data={mockData} lines={basicLines} />
      )
      
      // Re-render with same props
      rerender(<CustomLineChart data={mockData} lines={basicLines} />)
      
      expect(screen.getByTestId('line-chart')).toBeInTheDocument()
    })
  })

  describe('Theme Integration', () => {
    it('works with light theme', () => {
      render(
        <CustomLineChart 
          data={mockData} 
          lines={basicLines} 
          title="Light Theme Chart" 
        />,
        { theme: 'light' }
      )
      
      expect(screen.getByTestId('line-chart')).toBeInTheDocument()
      expect(screen.getByText('Light Theme Chart')).toBeInTheDocument()
    })

    it('works with dark theme', () => {
      render(
        <CustomLineChart 
          data={mockData} 
          lines={basicLines} 
          title="Dark Theme Chart" 
        />,
        { theme: 'dark' }
      )
      
      expect(screen.getByTestId('line-chart')).toBeInTheDocument()
      expect(screen.getByText('Dark Theme Chart')).toBeInTheDocument()
    })
  })
})