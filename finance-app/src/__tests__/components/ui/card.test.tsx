import React from 'react'
import { render, screen } from '@/__tests__/utils/test-utils'
import { axe, toHaveNoViolations } from 'jest-axe'
import { 
  Card, 
  CardHeader, 
  CardFooter, 
  CardTitle, 
  CardDescription, 
  CardContent 
} from '@/components/ui/card'

expect.extend(toHaveNoViolations)

describe('Card Components', () => {
  describe('Card', () => {
    it('renders with default styling', () => {
      render(<Card data-testid="card">Card content</Card>)
      
      const card = screen.getByTestId('card')
      expect(card).toBeInTheDocument()
      expect(card).toHaveClass(
        'rounded-lg',
        'border',
        'bg-card',
        'text-card-foreground',
        'shadow-sm'
      )
    })

    it('accepts custom className', () => {
      render(<Card className="custom-class" data-testid="card">Content</Card>)
      
      const card = screen.getByTestId('card')
      expect(card).toHaveClass('custom-class')
      expect(card).toHaveClass('rounded-lg') // Still has default classes
    })

    it('forwards ref correctly', () => {
      const ref = React.createRef<HTMLDivElement>()
      render(<Card ref={ref}>Content</Card>)
      
      expect(ref.current).toBeInstanceOf(HTMLDivElement)
    })

    it('spreads additional props', () => {
      render(
        <Card 
          data-testid="card" 
          id="custom-id"
          aria-label="Custom card"
          role="region"
        >
          Content
        </Card>
      )
      
      const card = screen.getByTestId('card')
      expect(card).toHaveAttribute('id', 'custom-id')
      expect(card).toHaveAttribute('aria-label', 'Custom card')
      expect(card).toHaveAttribute('role', 'region')
    })

    it('has no accessibility violations', async () => {
      const { container } = render(
        <Card>
          <CardHeader>
            <CardTitle>Card Title</CardTitle>
            <CardDescription>Card description</CardDescription>
          </CardHeader>
          <CardContent>Card content</CardContent>
        </Card>
      )
      
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })
  })

  describe('CardHeader', () => {
    it('renders with correct styling', () => {
      render(<CardHeader data-testid="header">Header content</CardHeader>)
      
      const header = screen.getByTestId('header')
      expect(header).toHaveClass('flex', 'flex-col', 'space-y-1.5', 'p-6')
    })

    it('accepts custom className', () => {
      render(<CardHeader className="custom-header" data-testid="header">Content</CardHeader>)
      
      const header = screen.getByTestId('header')
      expect(header).toHaveClass('custom-header', 'flex', 'flex-col')
    })

    it('forwards ref correctly', () => {
      const ref = React.createRef<HTMLDivElement>()
      render(<CardHeader ref={ref}>Content</CardHeader>)
      
      expect(ref.current).toBeInstanceOf(HTMLDivElement)
    })
  })

  describe('CardTitle', () => {
    it('renders as h3 element with correct styling', () => {
      render(<CardTitle>Title Text</CardTitle>)
      
      const title = screen.getByRole('heading', { level: 3 })
      expect(title).toHaveTextContent('Title Text')
      expect(title).toHaveClass(
        'text-2xl',
        'font-semibold',
        'leading-none',
        'tracking-tight'
      )
    })

    it('accepts custom className', () => {
      render(<CardTitle className="custom-title">Title</CardTitle>)
      
      const title = screen.getByRole('heading')
      expect(title).toHaveClass('custom-title', 'text-2xl')
    })

    it('forwards ref correctly', () => {
      const ref = React.createRef<HTMLHeadingElement>()
      render(<CardTitle ref={ref}>Title</CardTitle>)
      
      expect(ref.current).toBeInstanceOf(HTMLHeadingElement)
      expect(ref.current?.tagName).toBe('H3')
    })

    it('spreads additional props', () => {
      render(<CardTitle id="title-id" data-testid="title">Title</CardTitle>)
      
      const title = screen.getByTestId('title')
      expect(title).toHaveAttribute('id', 'title-id')
    })
  })

  describe('CardDescription', () => {
    it('renders as paragraph with correct styling', () => {
      render(<CardDescription>Description text</CardDescription>)
      
      const description = screen.getByText('Description text')
      expect(description.tagName).toBe('P')
      expect(description).toHaveClass('text-sm', 'text-muted-foreground')
    })

    it('accepts custom className', () => {
      render(<CardDescription className="custom-desc">Description</CardDescription>)
      
      const description = screen.getByText('Description')
      expect(description).toHaveClass('custom-desc', 'text-sm')
    })

    it('forwards ref correctly', () => {
      const ref = React.createRef<HTMLParagraphElement>()
      render(<CardDescription ref={ref}>Description</CardDescription>)
      
      expect(ref.current).toBeInstanceOf(HTMLParagraphElement)
    })
  })

  describe('CardContent', () => {
    it('renders with correct styling', () => {
      render(<CardContent data-testid="content">Content</CardContent>)
      
      const content = screen.getByTestId('content')
      expect(content).toHaveClass('p-6', 'pt-0')
    })

    it('accepts custom className', () => {
      render(<CardContent className="custom-content" data-testid="content">Content</CardContent>)
      
      const content = screen.getByTestId('content')
      expect(content).toHaveClass('custom-content', 'p-6')
    })

    it('forwards ref correctly', () => {
      const ref = React.createRef<HTMLDivElement>()
      render(<CardContent ref={ref}>Content</CardContent>)
      
      expect(ref.current).toBeInstanceOf(HTMLDivElement)
    })
  })

  describe('CardFooter', () => {
    it('renders with correct styling', () => {
      render(<CardFooter data-testid="footer">Footer content</CardFooter>)
      
      const footer = screen.getByTestId('footer')
      expect(footer).toHaveClass('flex', 'items-center', 'p-6', 'pt-0')
    })

    it('accepts custom className', () => {
      render(<CardFooter className="custom-footer" data-testid="footer">Footer</CardFooter>)
      
      const footer = screen.getByTestId('footer')
      expect(footer).toHaveClass('custom-footer', 'flex')
    })

    it('forwards ref correctly', () => {
      const ref = React.createRef<HTMLDivElement>()
      render(<CardFooter ref={ref}>Footer</CardFooter>)
      
      expect(ref.current).toBeInstanceOf(HTMLDivElement)
    })
  })

  describe('Complete Card Structure', () => {
    it('renders a complete card with all components', () => {
      render(
        <Card data-testid="complete-card">
          <CardHeader>
            <CardTitle>Test Card Title</CardTitle>
            <CardDescription>Test card description</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Test card content</p>
          </CardContent>
          <CardFooter>
            <button>Action Button</button>
          </CardFooter>
        </Card>
      )

      expect(screen.getByTestId('complete-card')).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: 'Test Card Title' })).toBeInTheDocument()
      expect(screen.getByText('Test card description')).toBeInTheDocument()
      expect(screen.getByText('Test card content')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Action Button' })).toBeInTheDocument()
    })

    it('maintains proper structure and accessibility', async () => {
      const { container } = render(
        <Card>
          <CardHeader>
            <CardTitle>Accessible Card</CardTitle>
            <CardDescription>This card follows accessibility guidelines</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Card content with proper structure</p>
            <ul>
              <li>Item 1</li>
              <li>Item 2</li>
            </ul>
          </CardContent>
          <CardFooter>
            <button type="button">Primary Action</button>
            <button type="button">Secondary Action</button>
          </CardFooter>
        </Card>
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })
  })

  describe('Edge Cases', () => {
    it('handles empty content', () => {
      render(<Card data-testid="empty-card" />)
      
      const card = screen.getByTestId('empty-card')
      expect(card).toBeInTheDocument()
      expect(card).toBeEmptyDOMElement()
    })

    it('handles only title without description', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Only Title</CardTitle>
          </CardHeader>
        </Card>
      )
      
      expect(screen.getByRole('heading', { name: 'Only Title' })).toBeInTheDocument()
      expect(screen.queryByText(/description/i)).not.toBeInTheDocument()
    })

    it('handles content without header or footer', () => {
      render(
        <Card data-testid="content-only">
          <CardContent>Just content</CardContent>
        </Card>
      )
      
      const card = screen.getByTestId('content-only')
      expect(card).toHaveTextContent('Just content')
      expect(screen.queryByRole('heading')).not.toBeInTheDocument()
    })

    it('handles nested elements', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>
              <span>Nested</span> <strong>Title</strong>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <p>Nested paragraph</p>
              <Card>
                <CardTitle>Nested Card</CardTitle>
              </Card>
            </div>
          </CardContent>
        </Card>
      )
      
      expect(screen.getByText('Nested')).toBeInTheDocument()
      expect(screen.getByText('Title')).toBeInTheDocument()
      expect(screen.getByText('Nested paragraph')).toBeInTheDocument()
      expect(screen.getByText('Nested Card')).toBeInTheDocument()
    })
  })

  describe('Theme Integration', () => {
    it('works with light theme', () => {
      render(
        <Card data-testid="light-card">Light theme content</Card>,
        { theme: 'light' }
      )
      
      const card = screen.getByTestId('light-card')
      expect(card).toHaveClass('bg-card', 'text-card-foreground')
    })

    it('works with dark theme', () => {
      render(
        <Card data-testid="dark-card">Dark theme content</Card>,
        { theme: 'dark' }
      )
      
      const card = screen.getByTestId('dark-card')
      expect(card).toHaveClass('bg-card', 'text-card-foreground')
    })
  })
})