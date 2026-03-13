import React from 'react'
import { render, screen } from '@/__tests__/utils/test-utils'
import { axe, toHaveNoViolations, configureAxe } from 'jest-axe'
import userEvent from '@testing-library/user-event'
import DashboardPage from '@/app/dashboard/page'
import { FileUpload } from '@/components/upload/file-upload'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

expect.extend(toHaveNoViolations)

// Configure axe for more comprehensive testing
configureAxe({
  rules: {
    // Enable additional rules for comprehensive testing
    'color-contrast': { enabled: true },
    'focus-order-semantics': { enabled: true },
    'keyboard-navigation': { enabled: true },
    'landmark-unique': { enabled: true },
  }
})

// Mock the chart components for accessibility testing
jest.mock('@/components/charts/pie-chart', () => ({
  CustomPieChart: ({ title }: { title?: string }) => (
    <div role="img" aria-label={title || 'Pie chart'} data-testid="pie-chart">
      <h3>{title}</h3>
    </div>
  ),
}))

jest.mock('@/components/charts/line-chart', () => ({
  CustomLineChart: ({ title }: { title?: string }) => (
    <div role="img" aria-label={title || 'Line chart'} data-testid="line-chart">
      <h3>{title}</h3>
    </div>
  ),
}))

jest.mock('@/components/charts/bar-chart', () => ({
  CustomBarChart: ({ title }: { title?: string }) => (
    <div role="img" aria-label={title || 'Bar chart'} data-testid="bar-chart">
      <h3>{title}</h3>
    </div>
  ),
}))

jest.mock('@/components/layout/header', () => ({
  Header: () => (
    <header role="banner">
      <nav role="navigation" aria-label="Main navigation">
        <h1>Finance App</h1>
      </nav>
    </header>
  ),
}))

describe('Comprehensive Accessibility Tests', () => {
  describe('Page-Level Accessibility', () => {
    it('Dashboard page has no accessibility violations', async () => {
      const { container } = render(<DashboardPage />)
      
      const results = await axe(container, {
        rules: {
          'page-has-heading-one': { enabled: true },
          'landmark-one-main': { enabled: true },
          'region': { enabled: true },
        }
      })
      
      expect(results).toHaveNoViolations()
    })

    it('Dashboard has proper landmark structure', async () => {
      render(<DashboardPage />)
      
      // Check for proper landmarks
      expect(screen.getByRole('banner')).toBeInTheDocument() // Header
      expect(screen.getByRole('main')).toBeInTheDocument()   // Main content
      expect(screen.getByRole('navigation')).toBeInTheDocument() // Navigation
    })

    it('Dashboard has proper heading hierarchy', async () => {
      render(<DashboardPage />)
      
      // Should have one h1 for the page title
      const h1Elements = screen.getAllByRole('heading', { level: 1 })
      expect(h1Elements).toHaveLength(1)
      expect(h1Elements[0]).toHaveTextContent('Dashboard')
      
      // Should have section headings
      const headings = screen.getAllByRole('heading')
      expect(headings.length).toBeGreaterThan(1)
      
      // Verify no heading level gaps (h1 followed by h3 without h2)
      const headingLevels = headings.map(heading => {
        const tagName = heading.tagName.toLowerCase()
        return parseInt(tagName.charAt(1))
      })
      
      for (let i = 1; i < headingLevels.length; i++) {
        const diff = headingLevels[i] - headingLevels[i - 1]
        expect(diff).toBeLessThanOrEqual(1) // No skipped heading levels
      }
    })
  })

  describe('Component-Level Accessibility', () => {
    it('Button component has no accessibility violations', async () => {
      const { container } = render(
        <div>
          <Button>Default Button</Button>
          <Button variant="destructive">Delete Button</Button>
          <Button variant="outline">Outline Button</Button>
          <Button size="sm">Small Button</Button>
          <Button disabled>Disabled Button</Button>
          <Button asChild>
            <a href="/test">Link Button</a>
          </Button>
        </div>
      )
      
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('Form components have proper accessibility', async () => {
      const { container } = render(
        <form>
          <Label htmlFor="test-input">Test Input Label</Label>
          <Input id="test-input" type="text" placeholder="Enter text" />
          
          <Label htmlFor="email-input">Email Address <span aria-label="required">*</span></Label>
          <Input id="email-input" type="email" required aria-describedby="email-help" />
          <div id="email-help">Please enter a valid email address</div>
          
          <Button type="submit">Submit Form</Button>
        </form>
      )
      
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('Card components have proper semantic structure', async () => {
      const { container } = render(
        <Card>
          <CardHeader>
            <CardTitle>Accessible Card Title</CardTitle>
            <CardDescription>This card follows accessibility guidelines</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Card content with proper semantic structure</p>
            <ul>
              <li>List item 1</li>
              <li>List item 2</li>
            </ul>
          </CardContent>
        </Card>
      )
      
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('Dialog component has proper accessibility attributes', async () => {
      const { container } = render(
        <Dialog>
          <DialogTrigger asChild>
            <Button>Open Dialog</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Accessible Dialog</DialogTitle>
              <DialogDescription>
                This dialog follows accessibility guidelines and supports screen readers.
              </DialogDescription>
            </DialogHeader>
            <div>
              <p>Dialog content goes here</p>
              <Button>Action Button</Button>
            </div>
          </DialogContent>
        </Dialog>
      )
      
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('File Upload component is accessible', async () => {
      const { container } = render(<FileUpload />)
      
      const results = await axe(container, {
        rules: {
          // File inputs have special accessibility considerations
          'form-field-multiple-labels': { enabled: true },
        }
      })
      
      expect(results).toHaveNoViolations()
    })

    it('Theme Toggle has proper accessibility', async () => {
      const { container } = render(<ThemeToggle />)
      
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })
  })

  describe('Keyboard Navigation', () => {
    it('supports keyboard navigation through interactive elements', async () => {
      const user = userEvent.setup()
      
      render(
        <div>
          <Button>Button 1</Button>
          <Button>Button 2</Button>
          <Input placeholder="Input field" />
          <Button>Button 3</Button>
        </div>
      )
      
      // Tab through elements
      await user.tab()
      expect(screen.getByText('Button 1')).toHaveFocus()
      
      await user.tab()
      expect(screen.getByText('Button 2')).toHaveFocus()
      
      await user.tab()
      expect(screen.getByPlaceholderText('Input field')).toHaveFocus()
      
      await user.tab()
      expect(screen.getByText('Button 3')).toHaveFocus()
      
      // Shift+Tab should reverse
      await user.keyboard('{Shift>}{Tab}{/Shift}')
      expect(screen.getByPlaceholderText('Input field')).toHaveFocus()
    })

    it('handles Enter and Space key activation on buttons', async () => {
      const user = userEvent.setup()
      const handleClick = jest.fn()
      
      render(<Button onClick={handleClick}>Test Button</Button>)
      
      const button = screen.getByText('Test Button')
      button.focus()
      
      // Test Enter key
      await user.keyboard('{Enter}')
      expect(handleClick).toHaveBeenCalled()
      
      handleClick.mockClear()
      
      // Test Space key
      await user.keyboard(' ')
      expect(handleClick).toHaveBeenCalled()
    })

    it('manages focus in dialogs properly', async () => {
      const user = userEvent.setup()
      
      render(
        <Dialog>
          <DialogTrigger asChild>
            <Button>Open Dialog</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Test Dialog</DialogTitle>
            </DialogHeader>
            <Input placeholder="First input" />
            <Input placeholder="Second input" />
            <Button>Dialog Button</Button>
          </DialogContent>
        </Dialog>
      )
      
      // Open dialog
      await user.click(screen.getByText('Open Dialog'))
      
      // Focus should be trapped in dialog
      await user.tab()
      expect(screen.getByPlaceholderText('First input')).toHaveFocus()
      
      await user.tab()
      expect(screen.getByPlaceholderText('Second input')).toHaveFocus()
      
      await user.tab()
      expect(screen.getByText('Dialog Button')).toHaveFocus()
    })
  })

  describe('Screen Reader Support', () => {
    it('provides proper ARIA labels and descriptions', async () => {
      render(
        <div>
          <Button aria-label="Delete item">🗑️</Button>
          <Input aria-label="Search" type="search" />
          <div role="status" aria-live="polite">Status message</div>
          <div role="alert" aria-live="assertive">Error message</div>
        </div>
      )
      
      expect(screen.getByLabelText('Delete item')).toBeInTheDocument()
      expect(screen.getByLabelText('Search')).toBeInTheDocument()
      expect(screen.getByRole('status')).toBeInTheDocument()
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })

    it('provides meaningful text for icon buttons', async () => {
      render(<ThemeToggle />)
      
      const themeButton = screen.getByRole('button', { name: /toggle theme/i })
      expect(themeButton).toBeInTheDocument()
      
      // Should have screen reader text
      expect(screen.getByText('Toggle theme')).toHaveClass('sr-only')
    })

    it('uses proper ARIA roles for custom components', async () => {
      render(
        <div>
          <div role="img" aria-label="Financial chart showing income trends">
            Chart placeholder
          </div>
          <div role="tablist">
            <div role="tab" aria-selected="true">Tab 1</div>
            <div role="tab" aria-selected="false">Tab 2</div>
          </div>
        </div>
      )
      
      expect(screen.getByRole('img')).toHaveAttribute('aria-label', 'Financial chart showing income trends')
      expect(screen.getByRole('tablist')).toBeInTheDocument()
      expect(screen.getAllByRole('tab')).toHaveLength(2)
    })
  })

  describe('Color and Contrast', () => {
    it('meets WCAG color contrast requirements', async () => {
      const { container } = render(
        <div>
          <Card>
            <CardContent>
              <p>Default text color</p>
              <p className="text-muted-foreground">Muted text</p>
              <Button variant="destructive">Delete</Button>
              <Button variant="outline">Cancel</Button>
            </CardContent>
          </Card>
        </div>
      )
      
      const results = await axe(container, {
        rules: {
          'color-contrast': { enabled: true },
          'color-contrast-enhanced': { enabled: true },
        }
      })
      
      expect(results).toHaveNoViolations()
    })

    it('does not rely solely on color for information', async () => {
      render(
        <div>
          {/* Good: Uses both color and text */}
          <div className="text-red-600">
            <span aria-label="Error">⚠️</span> Error: Please fix this issue
          </div>
          
          {/* Good: Uses both color and icons */}
          <div className="text-green-600">
            <span aria-label="Success">✅</span> Success: Operation completed
          </div>
        </div>
      )
      
      expect(screen.getByText(/Error: Please fix this issue/)).toBeInTheDocument()
      expect(screen.getByText(/Success: Operation completed/)).toBeInTheDocument()
    })
  })

  describe('Focus Management', () => {
    it('has visible focus indicators', async () => {
      const user = userEvent.setup()
      
      render(
        <div>
          <Button>First Button</Button>
          <Button>Second Button</Button>
          <Input placeholder="Input field" />
        </div>
      )
      
      // Tab to first button and check focus
      await user.tab()
      const firstButton = screen.getByText('First Button')
      expect(firstButton).toHaveFocus()
      
      // Focus should be visible (this is handled by CSS, we just verify element has focus)
      expect(firstButton).toHaveClass('focus-visible:outline-none', 'focus-visible:ring-2')
    })

    it('manages focus order logically', async () => {
      const user = userEvent.setup()
      
      render(
        <div>
          <h1>Page Title</h1>
          <nav>
            <Button>Nav Button 1</Button>
            <Button>Nav Button 2</Button>
          </nav>
          <main>
            <Input placeholder="Main content input" />
            <Button>Main action</Button>
          </main>
          <aside>
            <Button>Sidebar button</Button>
          </aside>
        </div>
      )
      
      // Focus should move in logical order
      await user.tab() // First focusable element
      expect(screen.getByText('Nav Button 1')).toHaveFocus()
      
      await user.tab()
      expect(screen.getByText('Nav Button 2')).toHaveFocus()
      
      await user.tab()
      expect(screen.getByPlaceholderText('Main content input')).toHaveFocus()
    })

    it('returns focus appropriately after modal closes', async () => {
      const user = userEvent.setup()
      
      render(
        <div>
          <Button>Outside Button</Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button>Open Dialog</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Test Dialog</DialogTitle>
              </DialogHeader>
              <Button>Inside Button</Button>
            </DialogContent>
          </Dialog>
        </div>
      )
      
      const openButton = screen.getByText('Open Dialog')
      
      // Focus on open button
      openButton.focus()
      expect(openButton).toHaveFocus()
      
      // Open dialog
      await user.click(openButton)
      
      // Focus should move into dialog
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      
      // Close dialog with Escape
      await user.keyboard('{Escape}')
      
      // Focus should return to trigger button
      expect(openButton).toHaveFocus()
    })
  })

  describe('Error Handling and Feedback', () => {
    it('provides accessible error messages', async () => {
      render(
        <div>
          <Label htmlFor="error-input">Email Address</Label>
          <Input 
            id="error-input" 
            type="email" 
            aria-invalid="true" 
            aria-describedby="error-message"
          />
          <div id="error-message" role="alert">
            Please enter a valid email address
          </div>
        </div>
      )
      
      const input = screen.getByLabelText('Email Address')
      expect(input).toHaveAttribute('aria-invalid', 'true')
      expect(input).toHaveAttribute('aria-describedby', 'error-message')
      
      const errorMessage = screen.getByRole('alert')
      expect(errorMessage).toHaveTextContent('Please enter a valid email address')
    })

    it('announces dynamic content changes', async () => {
      const TestComponent = () => {
        const [message, setMessage] = React.useState('')
        
        return (
          <div>
            <Button onClick={() => setMessage('Operation completed successfully')}>
              Trigger Action
            </Button>
            {message && (
              <div role="status" aria-live="polite">
                {message}
              </div>
            )}
          </div>
        )
      }
      
      const user = userEvent.setup()
      render(<TestComponent />)
      
      await user.click(screen.getByText('Trigger Action'))
      
      expect(screen.getByRole('status')).toHaveTextContent('Operation completed successfully')
      expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite')
    })
  })

  describe('Mobile and Touch Accessibility', () => {
    it('has adequately sized touch targets', async () => {
      render(
        <div>
          <Button size="sm">Small Button</Button>
          <Button size="default">Default Button</Button>
          <Button size="lg">Large Button</Button>
        </div>
      )
      
      // Default button should meet minimum touch target size (44px)
      const defaultButton = screen.getByText('Default Button')
      expect(defaultButton).toHaveClass('h-10') // 40px, which is close to 44px with padding
      
      const largeButton = screen.getByText('Large Button')
      expect(largeButton).toHaveClass('h-11') // 44px, meets requirement
    })
  })

  describe('Performance and Loading States', () => {
    it('provides accessible loading indicators', async () => {
      render(
        <div>
          <div role="status" aria-label="Loading content">
            <div className="animate-spin">⏳</div>
            <span className="sr-only">Loading...</span>
          </div>
        </div>
      )
      
      expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Loading content')
      expect(screen.getByText('Loading...')).toHaveClass('sr-only')
    })
  })
})