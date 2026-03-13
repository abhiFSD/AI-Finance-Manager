import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LoginPage from '@/app/(auth)/login/page'

// Mock next/link
jest.mock('next/link', () => {
  return function MockedLink({ children, href }: { children: React.ReactNode; href: string }) {
    return <a href={href}>{children}</a>
  }
})

describe('Login Page', () => {
  it('renders login form correctly', () => {
    render(<LoginPage />)
    
    expect(screen.getByText('Welcome back')).toBeInTheDocument()
    expect(screen.getByText('Sign in')).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('validates required fields', async () => {
    render(<LoginPage />)
    
    const submitButton = screen.getByRole('button', { name: /sign in/i })
    
    // Try to submit without filling fields
    fireEvent.click(submitButton)
    
    // Check that form validation prevents submission (HTML5 validation)
    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    
    expect(emailInput).toBeRequired()
    expect(passwordInput).toBeRequired()
  })

  it('handles email input correctly', async () => {
    const user = userEvent.setup()
    render(<LoginPage />)
    
    const emailInput = screen.getByLabelText(/email/i)
    
    await user.type(emailInput, 'test@example.com')
    
    expect(emailInput).toHaveValue('test@example.com')
  })

  it('handles password input correctly', async () => {
    const user = userEvent.setup()
    render(<LoginPage />)
    
    const passwordInput = screen.getByLabelText(/password/i)
    
    await user.type(passwordInput, 'password123')
    
    expect(passwordInput).toHaveValue('password123')
    expect(passwordInput).toHaveAttribute('type', 'password')
  })

  it('toggles password visibility', async () => {
    const user = userEvent.setup()
    render(<LoginPage />)
    
    const passwordInput = screen.getByLabelText(/password/i)
    const toggleButton = screen.getByRole('button', { name: /show password/i })
    
    expect(passwordInput).toHaveAttribute('type', 'password')
    
    await user.click(toggleButton)
    
    expect(passwordInput).toHaveAttribute('type', 'text')
    expect(screen.getByRole('button', { name: /hide password/i })).toBeInTheDocument()
  })

  it('shows loading state when submitting', async () => {
    const user = userEvent.setup()
    render(<LoginPage />)
    
    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /sign in/i })
    
    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'password123')
    await user.click(submitButton)
    
    // Check for loading state
    expect(submitButton).toBeDisabled()
    expect(screen.getByText(/sign in/i)).toBeInTheDocument()
  })

  it('contains forgot password link', () => {
    render(<LoginPage />)
    
    const forgotPasswordLink = screen.getByText('Forgot your password?')
    expect(forgotPasswordLink).toBeInTheDocument()
    expect(forgotPasswordLink.closest('a')).toHaveAttribute('href', '/forgot-password')
  })

  it('contains sign up link', () => {
    render(<LoginPage />)
    
    const signUpLink = screen.getByText('Sign up')
    expect(signUpLink).toBeInTheDocument()
    expect(signUpLink.closest('a')).toHaveAttribute('href', '/register')
  })

  it('disables form elements while loading', async () => {
    const user = userEvent.setup()
    render(<LoginPage />)
    
    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /sign in/i })
    
    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'password123')
    await user.click(submitButton)
    
    // All form elements should be disabled during loading
    expect(emailInput).toBeDisabled()
    expect(passwordInput).toBeDisabled()
    expect(submitButton).toBeDisabled()
  })
})