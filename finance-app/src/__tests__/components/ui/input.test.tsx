import React from 'react'
import { render, screen, fireEvent } from '@/__tests__/utils/test-utils'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'
import { Input } from '@/components/ui/input'

expect.extend(toHaveNoViolations)

describe('Input Component', () => {
  it('renders with default styling', () => {
    render(<Input data-testid="input" />)
    
    const input = screen.getByTestId('input')
    expect(input).toBeInTheDocument()
    expect(input).toHaveClass(
      'flex',
      'h-10',
      'w-full',
      'rounded-md',
      'border',
      'border-input',
      'bg-background',
      'px-3',
      'py-2',
      'text-sm'
    )
  })

  it('accepts and displays a value', () => {
    render(<Input value="test value" onChange={() => {}} />)
    
    const input = screen.getByDisplayValue('test value')
    expect(input).toBeInTheDocument()
  })

  it('handles user input', async () => {
    const user = userEvent.setup()
    const handleChange = jest.fn()
    render(<Input onChange={handleChange} />)
    
    const input = screen.getByRole('textbox')
    await user.type(input, 'Hello World')
    
    expect(handleChange).toHaveBeenCalledTimes(11) // One call per character
    expect(input).toHaveValue('Hello World')
  })

  it('accepts custom className', () => {
    render(<Input className="custom-class" data-testid="input" />)
    
    const input = screen.getByTestId('input')
    expect(input).toHaveClass('custom-class')
    expect(input).toHaveClass('flex') // Still has default classes
  })

  it('forwards ref correctly', () => {
    const ref = React.createRef<HTMLInputElement>()
    render(<Input ref={ref} />)
    
    expect(ref.current).toBeInstanceOf(HTMLInputElement)
  })

  it('spreads additional props', () => {
    render(
      <Input 
        data-testid="input" 
        id="custom-id"
        placeholder="Enter text"
        aria-label="Custom input"
        maxLength={100}
      />
    )
    
    const input = screen.getByTestId('input')
    expect(input).toHaveAttribute('id', 'custom-id')
    expect(input).toHaveAttribute('placeholder', 'Enter text')
    expect(input).toHaveAttribute('aria-label', 'Custom input')
    expect(input).toHaveAttribute('maxLength', '100')
  })

  describe('Input Types', () => {
    it('renders text input by default', () => {
      render(<Input data-testid="input" />)
      
      const input = screen.getByTestId('input')
      expect(input).toHaveAttribute('type', 'text')
    })

    it('renders password input', () => {
      render(<Input type="password" data-testid="input" />)
      
      const input = screen.getByTestId('input')
      expect(input).toHaveAttribute('type', 'password')
    })

    it('renders email input', () => {
      render(<Input type="email" data-testid="input" />)
      
      const input = screen.getByTestId('input')
      expect(input).toHaveAttribute('type', 'email')
    })

    it('renders number input', () => {
      render(<Input type="number" data-testid="input" />)
      
      const input = screen.getByTestId('input')
      expect(input).toHaveAttribute('type', 'number')
    })

    it('renders file input', () => {
      render(<Input type="file" data-testid="input" />)
      
      const input = screen.getByTestId('input')
      expect(input).toHaveAttribute('type', 'file')
    })

    it('renders search input', () => {
      render(<Input type="search" data-testid="input" />)
      
      const input = screen.getByTestId('input')
      expect(input).toHaveAttribute('type', 'search')
    })

    it('renders date input', () => {
      render(<Input type="date" data-testid="input" />)
      
      const input = screen.getByTestId('input')
      expect(input).toHaveAttribute('type', 'date')
    })
  })

  describe('States', () => {
    it('can be disabled', () => {
      render(<Input disabled />)
      
      const input = screen.getByRole('textbox')
      expect(input).toBeDisabled()
      expect(input).toHaveClass('disabled:cursor-not-allowed', 'disabled:opacity-50')
    })

    it('can be readonly', () => {
      render(<Input readOnly value="readonly value" />)
      
      const input = screen.getByDisplayValue('readonly value')
      expect(input).toHaveAttribute('readonly')
    })

    it('can be required', () => {
      render(<Input required />)
      
      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('required')
    })

    it('shows placeholder text', () => {
      render(<Input placeholder="Enter your name" />)
      
      const input = screen.getByPlaceholderText('Enter your name')
      expect(input).toBeInTheDocument()
      expect(input).toHaveClass('placeholder:text-muted-foreground')
    })
  })

  describe('Focus Management', () => {
    it('focuses when clicked', async () => {
      const user = userEvent.setup()
      render(<Input data-testid="input" />)
      
      const input = screen.getByTestId('input')
      await user.click(input)
      
      expect(input).toHaveFocus()
    })

    it('shows focus styles', async () => {
      const user = userEvent.setup()
      render(<Input data-testid="input" />)
      
      const input = screen.getByTestId('input')
      await user.click(input)
      
      expect(input).toHaveClass(
        'focus-visible:outline-none',
        'focus-visible:ring-2',
        'focus-visible:ring-ring',
        'focus-visible:ring-offset-2'
      )
    })

    it('handles blur event', async () => {
      const user = userEvent.setup()
      const handleBlur = jest.fn()
      render(<Input onBlur={handleBlur} />)
      
      const input = screen.getByRole('textbox')
      await user.click(input)
      await user.tab()
      
      expect(handleBlur).toHaveBeenCalled()
      expect(input).not.toHaveFocus()
    })
  })

  describe('Events', () => {
    it('handles onChange event', async () => {
      const user = userEvent.setup()
      const handleChange = jest.fn()
      render(<Input onChange={handleChange} />)
      
      const input = screen.getByRole('textbox')
      await user.type(input, 'test')
      
      expect(handleChange).toHaveBeenCalled()
    })

    it('handles onFocus event', async () => {
      const user = userEvent.setup()
      const handleFocus = jest.fn()
      render(<Input onFocus={handleFocus} />)
      
      const input = screen.getByRole('textbox')
      await user.click(input)
      
      expect(handleFocus).toHaveBeenCalled()
    })

    it('handles onKeyDown event', async () => {
      const user = userEvent.setup()
      const handleKeyDown = jest.fn()
      render(<Input onKeyDown={handleKeyDown} />)
      
      const input = screen.getByRole('textbox')
      await user.type(input, 'a')
      
      expect(handleKeyDown).toHaveBeenCalled()
    })

    it('handles Enter key press', async () => {
      const user = userEvent.setup()
      const handleKeyDown = jest.fn((e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
        }
      })
      render(<Input onKeyDown={handleKeyDown} />)
      
      const input = screen.getByRole('textbox')
      await user.type(input, '{Enter}')
      
      expect(handleKeyDown).toHaveBeenCalledWith(
        expect.objectContaining({ key: 'Enter' })
      )
    })
  })

  describe('Validation', () => {
    it('supports HTML5 validation attributes', () => {
      render(
        <Input 
          type="email"
          required
          pattern="[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$"
          minLength={5}
          maxLength={100}
        />
      )
      
      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('required')
      expect(input).toHaveAttribute('pattern')
      expect(input).toHaveAttribute('minLength', '5')
      expect(input).toHaveAttribute('maxLength', '100')
    })

    it('works with form validation', async () => {
      const user = userEvent.setup()
      const handleSubmit = jest.fn((e) => e.preventDefault())
      
      render(
        <form onSubmit={handleSubmit}>
          <Input type="email" required name="email" />
          <button type="submit">Submit</button>
        </form>
      )
      
      const submitButton = screen.getByRole('button', { name: 'Submit' })
      await user.click(submitButton)
      
      // Form should not submit with empty required field
      expect(handleSubmit).not.toHaveBeenCalled()
    })
  })

  describe('File Input', () => {
    it('handles file selection', async () => {
      const user = userEvent.setup()
      const handleChange = jest.fn()
      render(<Input type="file" onChange={handleChange} />)
      
      const input = screen.getByRole('button', { name: /choose file/i }) // File input appears as button
      const file = new File(['dummy content'], 'test.txt', { type: 'text/plain' })
      
      await user.upload(input as HTMLInputElement, file)
      
      expect(handleChange).toHaveBeenCalled()
    })

    it('applies file-specific styles', () => {
      render(<Input type="file" data-testid="file-input" />)
      
      const input = screen.getByTestId('file-input')
      expect(input).toHaveClass(
        'file:border-0',
        'file:bg-transparent',
        'file:text-sm',
        'file:font-medium',
        'file:text-foreground'
      )
    })
  })

  describe('Accessibility', () => {
    it('has no accessibility violations', async () => {
      const { container } = render(
        <div>
          <label htmlFor="test-input">Test Input</label>
          <Input id="test-input" placeholder="Enter text" />
        </div>
      )
      
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('works with aria-describedby', () => {
      render(
        <div>
          <Input aria-describedby="help-text" />
          <div id="help-text">This is help text</div>
        </div>
      )
      
      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('aria-describedby', 'help-text')
    })

    it('works with aria-invalid', () => {
      render(<Input aria-invalid="true" />)
      
      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('aria-invalid', 'true')
    })

    it('supports screen reader labels', () => {
      render(<Input aria-label="Search field" />)
      
      const input = screen.getByLabelText('Search field')
      expect(input).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('handles undefined value', () => {
      render(<Input value={undefined} onChange={() => {}} />)
      
      const input = screen.getByRole('textbox')
      expect(input).toHaveValue('')
    })

    it('handles null onChange', () => {
      // Should not crash
      render(<Input onChange={null as any} />)
      
      const input = screen.getByRole('textbox')
      expect(input).toBeInTheDocument()
    })

    it('handles very long text', async () => {
      const user = userEvent.setup()
      const longText = 'a'.repeat(1000)
      render(<Input />)
      
      const input = screen.getByRole('textbox')
      await user.type(input, longText)
      
      expect(input).toHaveValue(longText)
    })

    it('handles special characters', async () => {
      const user = userEvent.setup()
      const specialText = '!@#$%^&*()_+{}|:"<>?[]\\;\'.,/'
      render(<Input />)
      
      const input = screen.getByRole('textbox')
      await user.type(input, specialText)
      
      expect(input).toHaveValue(specialText)
    })
  })
})