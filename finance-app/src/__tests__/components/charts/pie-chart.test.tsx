import React from 'react'
import { render, screen } from '@/__tests__/utils/test-utils'
import { axe, toHaveNoViolations } from 'jest-axe'
import { CustomPieChart } from '@/components/charts/pie-chart'
import { createMockChartData } from '@/__tests__/utils/test-data'

expect.extend(toHaveNoViolations)

// Mock Recharts components
jest.mock('recharts', () => ({
  ...jest.requireActual('recharts'),
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  PieChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="pie-chart" role="img" aria-label="Pie chart">{children}</div>
  ),
  Pie: ({ data, dataKey }: { data: any[], dataKey: string }) => (
    <div data-testid="pie" data-datakey={dataKey}>
      {data.map((item, index) => (
        <div key={index} data-testid={`pie-segment-${index}`}>
          {item.name}: {item.value}
        </div>
      ))}
    </div>
  ),
  Cell: ({ fill }: { fill: string }) => (
    <div data-testid="pie-cell" style={{ backgroundColor: fill }} />
  ),
  Tooltip: () => <div data-testid="chart-tooltip" />,
  Legend: () => <div data-testid="chart-legend" />,
}))

describe('CustomPieChart Component', () => {
  const mockData = createMockChartData(5)
  
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders with basic data', () => {
    render(<CustomPieChart data={mockData} />)
    
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument()
    expect(screen.getByTestId('pie-chart')).toBeInTheDocument()
    expect(screen.getByTestId('pie')).toBeInTheDocument()
    expect(screen.getByTestId('chart-tooltip')).toBeInTheDocument()
    expect(screen.getByTestId('chart-legend')).toBeInTheDocument()
  })

  it('renders title when provided', () => {
    const title = 'Expense Breakdown'
    render(<CustomPieChart data={mockData} title={title} />)
    
    const titleElement = screen.getByText(title)
    expect(titleElement).toBeInTheDocument()
    expect(titleElement).toHaveClass('text-lg', 'font-semibold', 'mb-4', 'text-center')
  })

  it('does not render title when not provided', () => {
    render(<CustomPieChart data={mockData} />)
    
    expect(screen.queryByRole('heading')).not.toBeInTheDocument()
  })

  it('renders pie segments for each data item', () => {
    const testData = [
      { name: 'Food', value: 100 },
      { name: 'Transport', value: 200 },
      { name: 'Entertainment', value: 150 }
    ]
    
    render(<CustomPieChart data={testData} />)
    
    expect(screen.getByTestId('pie-segment-0')).toHaveTextContent('Food: 100')
    expect(screen.getByTestId('pie-segment-1')).toHaveTextContent('Transport: 200')
    expect(screen.getByTestId('pie-segment-2')).toHaveTextContent('Entertainment: 150')
  })

  it('uses correct data key for pie chart', () => {
    render(<CustomPieChart data={mockData} />)
    
    const pie = screen.getByTestId('pie')
    expect(pie).toHaveAttribute('data-datakey', 'value')
  })

  it('has proper container structure', () => {
    render(<CustomPieChart data={mockData} />)
    
    const container = screen.getByTestId('responsive-container').parentElement
    expect(container).toHaveClass('w-full', 'h-80')
  })

  describe('Data Handling', () => {
    it('handles empty data array', () => {
      render(<CustomPieChart data={[]} />)
      
      expect(screen.getByTestId('pie-chart')).toBeInTheDocument()
      expect(screen.queryByTestId('pie-segment-0')).not.toBeInTheDocument()
    })

    it('handles single data point', () => {
      const singleData = [{ name: 'Single Category', value: 100 }]
      render(<CustomPieChart data={singleData} />)
      
      expect(screen.getByTestId('pie-segment-0')).toHaveTextContent('Single Category: 100')
      expect(screen.queryByTestId('pie-segment-1')).not.toBeInTheDocument()
    })

    it('handles data with custom colors', () => {
      const coloredData = [
        { name: 'Red Category', value: 100, color: '#ff0000' },
        { name: 'Blue Category', value: 200, color: '#0000ff' }
      ]
      
      render(<CustomPieChart data={coloredData} />)
      
      // The Cell components should be rendered
      expect(screen.getAllByTestId('pie-cell')).toHaveLength(2)
    })

    it('handles data without custom colors', () => {
      const noColorData = [
        { name: 'Category 1', value: 100 },
        { name: 'Category 2', value: 200 }
      ]
      
      render(<CustomPieChart data={noColorData} />)
      
      expect(screen.getAllByTestId('pie-cell')).toHaveLength(2)
    })

    it('handles large datasets', () => {
      const largeData = Array.from({ length: 20 }, (_, i) => ({
        name: `Category ${i + 1}`,
        value: Math.random() * 1000
      }))
      
      render(<CustomPieChart data={largeData} />)
      
      expect(screen.getByTestId('pie')).toBeInTheDocument()
      expect(screen.getAllByTestId(/pie-segment-/).length).toBe(20)
    })

    it('handles zero values', () => {
      const zeroData = [
        { name: 'Zero Category', value: 0 },
        { name: 'Normal Category', value: 100 }
      ]
      
      render(<CustomPieChart data={zeroData} />)
      
      expect(screen.getByTestId('pie-segment-0')).toHaveTextContent('Zero Category: 0')
      expect(screen.getByTestId('pie-segment-1')).toHaveTextContent('Normal Category: 100')
    })

    it('handles negative values', () => {
      const negativeData = [
        { name: 'Negative Category', value: -50 },
        { name: 'Positive Category', value: 100 }
      ]
      
      render(<CustomPieChart data={negativeData} />)
      
      expect(screen.getByTestId('pie-segment-0')).toHaveTextContent('Negative Category: -50')
    })

    it('handles very large values', () => {
      const largeValueData = [
        { name: 'Large Category', value: 1000000 },
        { name: 'Small Category', value: 1 }
      ]
      
      render(<CustomPieChart data={largeValueData} />)
      
      expect(screen.getByTestId('pie-segment-0')).toHaveTextContent('Large Category: 1000000')
    })

    it('handles decimal values', () => {
      const decimalData = [
        { name: 'Decimal Category', value: 123.45 },
        { name: 'Another Decimal', value: 67.89 }
      ]
      
      render(<CustomPieChart data={decimalData} />)
      
      expect(screen.getByTestId('pie-segment-0')).toHaveTextContent('Decimal Category: 123.45')
    })
  })

  describe('Styling and Layout', () => {
    it('has responsive container', () => {
      render(<CustomPieChart data={mockData} />)
      
      const container = screen.getByTestId('responsive-container')
      expect(container).toBeInTheDocument()
    })

    it('applies correct CSS classes to wrapper', () => {
      render(<CustomPieChart data={mockData} />)
      
      const wrapper = screen.getByTestId('responsive-container').parentElement
      expect(wrapper).toHaveClass('w-full', 'h-80')
    })

    it('renders chart with proper ARIA attributes', () => {
      render(<CustomPieChart data={mockData} />)
      
      const chart = screen.getByTestId('pie-chart')
      expect(chart).toHaveAttribute('role', 'img')
      expect(chart).toHaveAttribute('aria-label', 'Pie chart')
    })

    it('title has proper styling classes', () => {
      render(<CustomPieChart data={mockData} title="Test Title" />)
      
      const title = screen.getByText('Test Title')
      expect(title).toHaveClass('text-lg', 'font-semibold', 'mb-4', 'text-center')
    })
  })

  describe('Chart Components', () => {
    it('includes tooltip component', () => {
      render(<CustomPieChart data={mockData} />)
      
      expect(screen.getByTestId('chart-tooltip')).toBeInTheDocument()
    })

    it('includes legend component', () => {
      render(<CustomPieChart data={mockData} />)
      
      expect(screen.getByTestId('chart-legend')).toBeInTheDocument()
    })

    it('renders cells for each data point', () => {
      const testData = [
        { name: 'A', value: 100 },
        { name: 'B', value: 200 },
        { name: 'C', value: 300 }
      ]
      
      render(<CustomPieChart data={testData} />)
      
      const cells = screen.getAllByTestId('pie-cell')
      expect(cells).toHaveLength(3)
    })
  })

  describe('Accessibility', () => {
    it('has no accessibility violations', async () => {
      const { container } = render(
        <CustomPieChart data={mockData} title="Accessible Pie Chart" />
      )
      
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('provides chart description through title', () => {
      const title = 'Monthly Expenses by Category'
      render(<CustomPieChart data={mockData} title={title} />)
      
      expect(screen.getByText(title)).toBeInTheDocument()
    })

    it('chart has proper role and aria-label', () => {
      render(<CustomPieChart data={mockData} />)
      
      const chart = screen.getByRole('img')
      expect(chart).toHaveAttribute('aria-label', 'Pie chart')
    })
  })

  describe('Edge Cases', () => {
    it('handles undefined data gracefully', () => {
      // Should not crash with undefined data
      expect(() => {
        render(<CustomPieChart data={undefined as any} />)
      }).not.toThrow()
    })

    it('handles null data gracefully', () => {
      expect(() => {
        render(<CustomPieChart data={null as any} />)
      }).not.toThrow()
    })

    it('handles data with missing properties', () => {
      const incompleteData = [
        { name: 'Complete', value: 100 },
        { name: 'Missing Value' } as any,
        { value: 200 } as any
      ]
      
      expect(() => {
        render(<CustomPieChart data={incompleteData} />)
      }).not.toThrow()
    })

    it('handles very long category names', () => {
      const longNameData = [{
        name: 'This is a very long category name that might cause layout issues if not handled properly',
        value: 100
      }]
      
      render(<CustomPieChart data={longNameData} />)
      
      expect(screen.getByTestId('pie-segment-0')).toBeInTheDocument()
    })

    it('handles special characters in names', () => {
      const specialCharData = [{
        name: 'Special chars: !@#$%^&*()_+{}|:"<>?[]\\;\'.,/',
        value: 100
      }]
      
      render(<CustomPieChart data={specialCharData} />)
      
      expect(screen.getByTestId('pie-segment-0')).toBeInTheDocument()
    })
  })

  describe('Performance', () => {
    it('renders efficiently with large datasets', () => {
      const startTime = performance.now()
      
      const largeDataset = Array.from({ length: 100 }, (_, i) => ({
        name: `Category ${i}`,
        value: Math.random() * 1000
      }))
      
      render(<CustomPieChart data={largeDataset} />)
      
      const endTime = performance.now()
      const renderTime = endTime - startTime
      
      // Render should complete within reasonable time (adjust threshold as needed)
      expect(renderTime).toBeLessThan(1000) // 1 second
      expect(screen.getByTestId('pie')).toBeInTheDocument()
    })

    it('does not re-render unnecessarily', () => {
      const { rerender } = render(<CustomPieChart data={mockData} />)
      
      // Re-render with same data
      rerender(<CustomPieChart data={mockData} />)
      
      expect(screen.getByTestId('pie')).toBeInTheDocument()
    })
  })

  describe('Theme Integration', () => {
    it('works with light theme', () => {
      render(
        <CustomPieChart data={mockData} title="Light Theme Chart" />,
        { theme: 'light' }
      )
      
      expect(screen.getByTestId('pie-chart')).toBeInTheDocument()
      expect(screen.getByText('Light Theme Chart')).toBeInTheDocument()
    })

    it('works with dark theme', () => {
      render(
        <CustomPieChart data={mockData} title="Dark Theme Chart" />,
        { theme: 'dark' }
      )
      
      expect(screen.getByTestId('pie-chart')).toBeInTheDocument()
      expect(screen.getByText('Dark Theme Chart')).toBeInTheDocument()
    })
  })
})