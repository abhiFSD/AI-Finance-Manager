import React from 'react'
import { render, screen } from '@/__tests__/utils/test-utils'
import { axe, toHaveNoViolations } from 'jest-axe'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'

expect.extend(toHaveNoViolations)

describe('Label Component', () => {
  it('renders with default styling', () => {
    render(<Label>Label text</Label>)
    
    const label = screen.getByText('Label text')
    expect(label).toBeInTheDocument()
    expect(label).toHaveClass(
      'text-sm',
      'font-medium',
      'leading-none',
      'peer-disabled:cursor-not-allowed',
      'peer-disabled:opacity-70'
    )
  })

  it('accepts custom className', () => {
    render(<Label className="custom-label">Label</Label>)
    
    const label = screen.getByText('Label')
    expect(label).toHaveClass('custom-label', 'text-sm')
  })

  it('forwards ref correctly', () => {
    const ref = React.createRef<HTMLLabelElement>()
    render(<Label ref={ref}>Label</Label>)
    
    expect(ref.current).toBeInstanceOf(HTMLElement)
  })

  it('spreads additional props', () => {
    render(
      <Label 
        htmlFor="input-id"
        id="label-id"
        data-testid="label"
      >
        Label text
      </Label>
    )
    
    const label = screen.getByTestId('label')
    expect(label).toHaveAttribute('for', 'input-id')
    expect(label).toHaveAttribute('id', 'label-id')
  })

  it('associates with input element', () => {
    render(
      <div>
        <Label htmlFor="test-input">Test Label</Label>
        <Input id="test-input" />
      </div>
    )
    
    const label = screen.getByText('Test Label')
    const input = screen.getByLabelText('Test Label')
    
    expect(label).toHaveAttribute('for', 'test-input')
    expect(input).toHaveAttribute('id', 'test-input')
  })

  it('handles click to focus associated input', async () => {
    render(
      <div>
        <Label htmlFor="clickable-input">Clickable Label</Label>
        <Input id="clickable-input" />
      </div>
    )
    
    const label = screen.getByText('Clickable Label')
    const input = screen.getByLabelText('Clickable Label')
    
    label.click()
    expect(input).toHaveFocus()
  })

  it('shows disabled state when peer input is disabled', () => {
    render(
      <div>
        <Label htmlFor="disabled-input" className="peer-disabled:text-gray-400">
          Disabled Input Label
        </Label>
        <Input id="disabled-input" disabled className="peer" />
      </div>
    )
    
    const label = screen.getByText('Disabled Input Label')
    expect(label).toHaveClass('peer-disabled:cursor-not-allowed', 'peer-disabled:opacity-70')
  })

  it('supports nested elements', () => {
    render(
      <Label>
        <span>Required</span> <strong>*</strong> Field
      </Label>
    )
    
    expect(screen.getByText('Required')).toBeInTheDocument()
    expect(screen.getByText('*')).toBeInTheDocument()
    expect(screen.getByText('Field')).toBeInTheDocument()
  })

  it('has no accessibility violations', async () => {
    const { container } = render(
      <div>
        <Label htmlFor="accessible-input">Accessible Label</Label>
        <Input id="accessible-input" />
      </div>
    )
    
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('works without htmlFor attribute', () => {
    render(<Label>Standalone Label</Label>)
    
    const label = screen.getByText('Standalone Label')
    expect(label).toBeInTheDocument()
    expect(label).not.toHaveAttribute('for')
  })

  describe('Form Integration', () => {
    it('works in form context', async () => {
      const handleSubmit = jest.fn((e) => e.preventDefault())
      
      render(
        <form onSubmit={handleSubmit}>
          <Label htmlFor="form-input">Form Input</Label>
          <Input id="form-input" name="testField" defaultValue="test" />
          <button type="submit">Submit</button>
        </form>
      )
      
      const label = screen.getByText('Form Input')
      const input = screen.getByLabelText('Form Input')
      
      expect(label).toBeInTheDocument()
      expect(input).toHaveValue('test')
    })

    it('handles required field indication', () => {
      render(
        <div>
          <Label htmlFor="required-input">
            Email Address <span className="text-red-500">*</span>
          </Label>
          <Input id="required-input" type="email" required />
        </div>
      )
      
      const label = screen.getByText(/Email Address/i)
      const asterisk = screen.getByText('*')
      const input = screen.getByLabelText(/Email Address/i)
      
      expect(label).toBeInTheDocument()
      expect(asterisk).toHaveClass('text-red-500')
      expect(input).toHaveAttribute('required')
    })
  })

  describe('Edge Cases', () => {
    it('handles empty content', () => {
      render(<Label data-testid="empty-label" />)
      
      const label = screen.getByTestId('empty-label')
      expect(label).toBeInTheDocument()
      expect(label).toBeEmptyDOMElement()
    })

    it('handles very long text', () => {
      const longText = 'This is a very long label text that might wrap to multiple lines and should still maintain proper styling and accessibility'
      render(<Label>{longText}</Label>)
      
      const label = screen.getByText(longText)
      expect(label).toBeInTheDocument()
      expect(label).toHaveClass('leading-none')
    })

    it('handles special characters', () => {
      const specialText = 'Label with special chars: !@#$%^&*()_+{}|:"<>?[]\\;\'.,/'
      render(<Label>{specialText}</Label>)
      
      const label = screen.getByText(specialText)
      expect(label).toBeInTheDocument()
    })
  })

  describe('Theme Integration', () => {
    it('works with light theme', () => {
      render(
        <Label data-testid="light-label">Light theme label</Label>,
        { theme: 'light' }
      )
      
      const label = screen.getByTestId('light-label')
      expect(label).toHaveClass('text-sm', 'font-medium')
    })

    it('works with dark theme', () => {
      render(
        <Label data-testid="dark-label">Dark theme label</Label>,
        { theme: 'dark' }
      )
      
      const label = screen.getByTestId('dark-label')
      expect(label).toHaveClass('text-sm', 'font-medium')
    })
  })

  describe('Multiple Labels', () => {
    it('handles multiple labels correctly', () => {
      render(
        <div>
          <Label htmlFor="input1">Label 1</Label>
          <Input id="input1" />
          
          <Label htmlFor="input2">Label 2</Label>
          <Input id="input2" />
          
          <Label htmlFor="input3">Label 3</Label>
          <Input id="input3" />
        </div>
      )
      
      expect(screen.getByLabelText('Label 1')).toBeInTheDocument()
      expect(screen.getByLabelText('Label 2')).toBeInTheDocument()
      expect(screen.getByLabelText('Label 3')).toBeInTheDocument()
    })
  })
})