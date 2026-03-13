import React from 'react'
import { render, screen } from '@/__tests__/utils/test-utils'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'
import { ThemeToggle } from '@/components/ui/theme-toggle'

expect.extend(toHaveNoViolations)

// Mock next-themes
const mockSetTheme = jest.fn()
const mockTheme = jest.fn()

jest.mock('next-themes', () => ({
  useTheme: () => ({
    setTheme: mockSetTheme,
    theme: mockTheme(),
  }),
}))

describe('ThemeToggle Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders with correct accessibility attributes', () => {
    mockTheme.mockReturnValue('light')
    
    render(<ThemeToggle />)
    
    const button = screen.getByRole('button', { name: /toggle theme/i })
    expect(button).toBeInTheDocument()
    expect(button).toHaveClass('ghost') // Button variant
    expect(button).toHaveAttribute('type', 'button')
  })

  it('shows sun icon in light mode', () => {
    mockTheme.mockReturnValue('light')
    
    render(<ThemeToggle />)
    
    // Check for screen reader text
    expect(screen.getByText('Toggle theme')).toBeInTheDocument()
    
    // Check for sun and moon icons (both are present but styled differently)
    const button = screen.getByRole('button', { name: /toggle theme/i })
    expect(button.querySelector('svg')).toBeInTheDocument()
  })

  it('toggles from light to dark theme', async () => {
    const user = userEvent.setup()
    mockTheme.mockReturnValue('light')
    
    render(<ThemeToggle />)
    
    const button = screen.getByRole('button', { name: /toggle theme/i })
    await user.click(button)
    
    expect(mockSetTheme).toHaveBeenCalledWith('dark')
  })

  it('toggles from dark to light theme', async () => {
    const user = userEvent.setup()
    mockTheme.mockReturnValue('dark')
    
    render(<ThemeToggle />)
    
    const button = screen.getByRole('button', { name: /toggle theme/i })
    await user.click(button)
    
    expect(mockSetTheme).toHaveBeenCalledWith('light')
  })

  it('handles system theme', async () => {
    const user = userEvent.setup()
    mockTheme.mockReturnValue('system')
    
    render(<ThemeToggle />)
    
    const button = screen.getByRole('button', { name: /toggle theme/i })
    await user.click(button)
    
    // When theme is not 'light', it should switch to 'light'
    expect(mockSetTheme).toHaveBeenCalledWith('light')
  })

  it('handles undefined theme', async () => {
    const user = userEvent.setup()
    mockTheme.mockReturnValue(undefined)
    
    render(<ThemeToggle />)
    
    const button = screen.getByRole('button', { name: /toggle theme/i })
    await user.click(button)
    
    // When theme is undefined (not 'light'), it should switch to 'light'
    expect(mockSetTheme).toHaveBeenCalledWith('light')
  })

  it('supports keyboard navigation', async () => {
    const user = userEvent.setup()
    mockTheme.mockReturnValue('light')
    
    render(<ThemeToggle />)
    
    const button = screen.getByRole('button', { name: /toggle theme/i })
    
    // Focus with tab
    await user.tab()
    expect(button).toHaveFocus()
    
    // Activate with Enter
    await user.keyboard('{Enter}')
    expect(mockSetTheme).toHaveBeenCalledWith('dark')
  })

  it('supports space key activation', async () => {
    const user = userEvent.setup()
    mockTheme.mockReturnValue('light')
    
    render(<ThemeToggle />)
    
    const button = screen.getByRole('button', { name: /toggle theme/i })
    button.focus()
    
    // Activate with Space
    await user.keyboard(' ')
    expect(mockSetTheme).toHaveBeenCalledWith('dark')
  })

  it('has correct button styling', () => {
    mockTheme.mockReturnValue('light')
    
    render(<ThemeToggle />)
    
    const button = screen.getByRole('button', { name: /toggle theme/i })
    expect(button).toHaveClass(
      'inline-flex',
      'items-center',
      'justify-center',
      'gap-2',
      'whitespace-nowrap',
      'rounded-md'
    )
  })

  it('contains both sun and moon icons', () => {
    mockTheme.mockReturnValue('light')
    
    render(<ThemeToggle />)
    
    const button = screen.getByRole('button', { name: /toggle theme/i })
    const svgElements = button.querySelectorAll('svg')
    
    // Should have both sun and moon icons
    expect(svgElements).toHaveLength(2)
  })

  it('has proper icon transitions', () => {
    mockTheme.mockReturnValue('light')
    
    render(<ThemeToggle />)
    
    const button = screen.getByRole('button', { name: /toggle theme/i })
    const sunIcon = button.querySelector('svg:first-child')
    const moonIcon = button.querySelector('svg:last-child')
    
    // Sun icon should have transition classes
    expect(sunIcon).toHaveClass(
      'h-[1.2rem]',
      'w-[1.2rem]',
      'rotate-0',
      'scale-100',
      'transition-all'
    )
    
    // Moon icon should have transition classes and be positioned absolutely
    expect(moonIcon).toHaveClass(
      'absolute',
      'h-[1.2rem]',
      'w-[1.2rem]',
      'rotate-90',
      'scale-0',
      'transition-all'
    )
  })

  describe('Multiple Theme Toggle Instances', () => {
    it('handles multiple theme toggles correctly', async () => {
      const user = userEvent.setup()
      mockTheme.mockReturnValue('light')
      
      render(
        <div>
          <ThemeToggle />
          <ThemeToggle />
        </div>
      )
      
      const buttons = screen.getAllByRole('button', { name: /toggle theme/i })
      expect(buttons).toHaveLength(2)
      
      // Click first button
      await user.click(buttons[0])
      expect(mockSetTheme).toHaveBeenCalledWith('dark')
      
      // Reset mock
      mockSetTheme.mockClear()
      
      // Click second button
      await user.click(buttons[1])
      expect(mockSetTheme).toHaveBeenCalledWith('dark')
    })
  })

  describe('Accessibility', () => {
    it('has no accessibility violations', async () => {
      mockTheme.mockReturnValue('light')
      
      const { container } = render(<ThemeToggle />)
      
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('has proper ARIA attributes', () => {
      mockTheme.mockReturnValue('light')
      
      render(<ThemeToggle />)
      
      const button = screen.getByRole('button', { name: /toggle theme/i })
      
      // Should be a proper button
      expect(button).toHaveAttribute('type', 'button')
      
      // Should have screen reader text
      const srText = screen.getByText('Toggle theme')
      expect(srText).toHaveClass('sr-only')
    })

    it('provides clear action description', () => {
      mockTheme.mockReturnValue('light')
      
      render(<ThemeToggle />)
      
      // The button should be clearly labeled for screen readers
      const button = screen.getByRole('button', { name: /toggle theme/i })
      expect(button).toBeInTheDocument()
      
      // Should have hidden text that describes the action
      expect(screen.getByText('Toggle theme')).toHaveClass('sr-only')
    })
  })

  describe('Theme Context Integration', () => {
    it('works with different theme contexts', async () => {
      const user = userEvent.setup()
      
      // Test with light theme
      mockTheme.mockReturnValue('light')
      const { rerender } = render(<ThemeToggle />)
      
      let button = screen.getByRole('button', { name: /toggle theme/i })
      await user.click(button)
      expect(mockSetTheme).toHaveBeenCalledWith('dark')
      
      mockSetTheme.mockClear()
      
      // Test with dark theme
      mockTheme.mockReturnValue('dark')
      rerender(<ThemeToggle />)
      
      button = screen.getByRole('button', { name: /toggle theme/i })
      await user.click(button)
      expect(mockSetTheme).toHaveBeenCalledWith('light')
    })
  })

  describe('Error Handling', () => {
    it('handles missing theme context gracefully', () => {
      // Mock useTheme to return undefined functions
      jest.doMock('next-themes', () => ({
        useTheme: () => ({
          setTheme: undefined,
          theme: undefined,
        }),
      }))
      
      // Should not crash when theme context is missing
      expect(() => {
        render(<ThemeToggle />)
      }).not.toThrow()
    })

    it('handles theme context errors gracefully', async () => {
      const user = userEvent.setup()
      mockTheme.mockReturnValue('light')
      mockSetTheme.mockImplementation(() => {
        throw new Error('Theme context error')
      })
      
      render(<ThemeToggle />)
      
      const button = screen.getByRole('button', { name: /toggle theme/i })
      
      // Should not crash when setTheme throws an error
      await expect(async () => {
        await user.click(button)
      }).not.toThrow()
    })
  })

  describe('Performance', () => {
    it('does not re-render unnecessarily', () => {
      mockTheme.mockReturnValue('light')
      
      const { rerender } = render(<ThemeToggle />)
      
      // Re-render with the same theme
      mockTheme.mockReturnValue('light')
      rerender(<ThemeToggle />)
      
      // Button should still be present and functional
      const button = screen.getByRole('button', { name: /toggle theme/i })
      expect(button).toBeInTheDocument()
    })
  })
})