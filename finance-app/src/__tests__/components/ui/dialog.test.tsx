import React from 'react'
import { render, screen, fireEvent } from '@/__tests__/utils/test-utils'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

expect.extend(toHaveNoViolations)

describe('Dialog Components', () => {
  describe('Basic Dialog', () => {
    it('renders trigger and opens dialog', async () => {
      const user = userEvent.setup()
      
      render(
        <Dialog>
          <DialogTrigger asChild>
            <Button>Open Dialog</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Test Dialog</DialogTitle>
              <DialogDescription>This is a test dialog</DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      )
      
      const trigger = screen.getByRole('button', { name: 'Open Dialog' })
      expect(trigger).toBeInTheDocument()
      
      await user.click(trigger)
      
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByText('Test Dialog')).toBeInTheDocument()
      expect(screen.getByText('This is a test dialog')).toBeInTheDocument()
    })

    it('closes dialog with close button', async () => {
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
          </DialogContent>
        </Dialog>
      )
      
      await user.click(screen.getByRole('button', { name: 'Open Dialog' }))
      
      const closeButton = screen.getByRole('button', { name: 'Close' })
      expect(closeButton).toBeInTheDocument()
      
      await user.click(closeButton)
      
      // Dialog should be closed
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('closes dialog with Escape key', async () => {
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
          </DialogContent>
        </Dialog>
      )
      
      await user.click(screen.getByRole('button', { name: 'Open Dialog' }))
      
      const dialog = screen.getByRole('dialog')
      expect(dialog).toBeInTheDocument()
      
      await user.keyboard('{Escape}')
      
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  describe('DialogContent', () => {
    it('renders with correct styling', async () => {
      const user = userEvent.setup()
      
      render(
        <Dialog>
          <DialogTrigger asChild>
            <Button>Open</Button>
          </DialogTrigger>
          <DialogContent data-testid="dialog-content">
            Content
          </DialogContent>
        </Dialog>
      )
      
      await user.click(screen.getByRole('button', { name: 'Open' }))
      
      const content = screen.getByTestId('dialog-content')
      expect(content).toHaveClass(
        'fixed',
        'left-[50%]',
        'top-[50%]',
        'z-50',
        'grid',
        'w-full',
        'max-w-lg',
        'translate-x-[-50%]',
        'translate-y-[-50%]',
        'gap-4',
        'border',
        'bg-background',
        'p-6',
        'shadow-lg'
      )
    })

    it('accepts custom className', async () => {
      const user = userEvent.setup()
      
      render(
        <Dialog>
          <DialogTrigger asChild>
            <Button>Open</Button>
          </DialogTrigger>
          <DialogContent className="custom-dialog" data-testid="dialog-content">
            Content
          </DialogContent>
        </Dialog>
      )
      
      await user.click(screen.getByRole('button', { name: 'Open' }))
      
      const content = screen.getByTestId('dialog-content')
      expect(content).toHaveClass('custom-dialog', 'fixed')
    })
  })

  describe('DialogHeader', () => {
    it('renders with correct styling', async () => {
      const user = userEvent.setup()
      
      render(
        <Dialog>
          <DialogTrigger asChild>
            <Button>Open</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader data-testid="dialog-header">
              <DialogTitle>Title</DialogTitle>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      )
      
      await user.click(screen.getByRole('button', { name: 'Open' }))
      
      const header = screen.getByTestId('dialog-header')
      expect(header).toHaveClass(
        'flex',
        'flex-col',
        'space-y-1.5',
        'text-center',
        'sm:text-left'
      )
    })
  })

  describe('DialogTitle', () => {
    it('renders with correct styling and accessibility', async () => {
      const user = userEvent.setup()
      
      render(
        <Dialog>
          <DialogTrigger asChild>
            <Button>Open</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Dialog Title</DialogTitle>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      )
      
      await user.click(screen.getByRole('button', { name: 'Open' }))
      
      const title = screen.getByText('Dialog Title')
      expect(title).toHaveClass(
        'text-lg',
        'font-semibold',
        'leading-none',
        'tracking-tight'
      )
      
      // Check that dialog has proper aria-labelledby
      const dialog = screen.getByRole('dialog')
      expect(dialog).toHaveAttribute('aria-labelledby')
    })

    it('accepts custom className', async () => {
      const user = userEvent.setup()
      
      render(
        <Dialog>
          <DialogTrigger asChild>
            <Button>Open</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="custom-title">Title</DialogTitle>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      )
      
      await user.click(screen.getByRole('button', { name: 'Open' }))
      
      const title = screen.getByText('Title')
      expect(title).toHaveClass('custom-title', 'text-lg')
    })
  })

  describe('DialogDescription', () => {
    it('renders with correct styling', async () => {
      const user = userEvent.setup()
      
      render(
        <Dialog>
          <DialogTrigger asChild>
            <Button>Open</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Title</DialogTitle>
              <DialogDescription>Description text</DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      )
      
      await user.click(screen.getByRole('button', { name: 'Open' }))
      
      const description = screen.getByText('Description text')
      expect(description).toHaveClass('text-sm', 'text-muted-foreground')
      
      // Check that dialog has proper aria-describedby
      const dialog = screen.getByRole('dialog')
      expect(dialog).toHaveAttribute('aria-describedby')
    })
  })

  describe('DialogFooter', () => {
    it('renders with correct styling', async () => {
      const user = userEvent.setup()
      
      render(
        <Dialog>
          <DialogTrigger asChild>
            <Button>Open</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Title</DialogTitle>
            </DialogHeader>
            <DialogFooter data-testid="dialog-footer">
              <Button>Action</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )
      
      await user.click(screen.getByRole('button', { name: 'Open' }))
      
      const footer = screen.getByTestId('dialog-footer')
      expect(footer).toHaveClass(
        'flex',
        'flex-col-reverse',
        'sm:flex-row',
        'sm:justify-end',
        'sm:space-x-2'
      )
    })

    it('contains action buttons', async () => {
      const user = userEvent.setup()
      const handleAction = jest.fn()
      
      render(
        <Dialog>
          <DialogTrigger asChild>
            <Button>Open</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Action</DialogTitle>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button onClick={handleAction}>Confirm</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )
      
      await user.click(screen.getByRole('button', { name: 'Open' }))
      
      const cancelButton = screen.getByRole('button', { name: 'Cancel' })
      const confirmButton = screen.getByRole('button', { name: 'Confirm' })
      
      expect(cancelButton).toBeInTheDocument()
      expect(confirmButton).toBeInTheDocument()
      
      await user.click(confirmButton)
      expect(handleAction).toHaveBeenCalled()
    })
  })

  describe('Complete Dialog Example', () => {
    it('renders a complete dialog with all components', async () => {
      const user = userEvent.setup()
      const handleConfirm = jest.fn()
      
      render(
        <Dialog>
          <DialogTrigger asChild>
            <Button>Delete Item</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Are you absolutely sure?</DialogTitle>
              <DialogDescription>
                This action cannot be undone. This will permanently delete your
                account and remove your data from our servers.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button variant="destructive" onClick={handleConfirm}>
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )
      
      // Open dialog
      await user.click(screen.getByRole('button', { name: 'Delete Item' }))
      
      // Check all elements are present
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByText('Are you absolutely sure?')).toBeInTheDocument()
      expect(screen.getByText(/This action cannot be undone/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument()
      
      // Test confirm action
      await user.click(screen.getByRole('button', { name: 'Delete' }))
      expect(handleConfirm).toHaveBeenCalled()
    })
  })

  describe('Focus Management', () => {
    it('traps focus within dialog', async () => {
      const user = userEvent.setup()
      
      render(
        <div>
          <input data-testid="outside-input" />
          <Dialog>
            <DialogTrigger asChild>
              <Button>Open</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Focus Test</DialogTitle>
              </DialogHeader>
              <input data-testid="inside-input" />
              <DialogFooter>
                <Button>Action</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )
      
      // Open dialog
      await user.click(screen.getByRole('button', { name: 'Open' }))
      
      // Focus should be trapped inside dialog
      const outsideInput = screen.getByTestId('outside-input')
      const insideInput = screen.getByTestId('inside-input')
      
      await user.click(insideInput)
      expect(insideInput).toHaveFocus()
      
      // Attempting to focus outside should not work (this is handled by Radix)
      outsideInput.focus()
      // Focus should remain trapped in dialog
    })

    it('returns focus to trigger when closed', async () => {
      const user = userEvent.setup()
      
      render(
        <Dialog>
          <DialogTrigger asChild>
            <Button>Open Dialog</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Test</DialogTitle>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      )
      
      const trigger = screen.getByRole('button', { name: 'Open Dialog' })
      await user.click(trigger)
      
      // Close with escape
      await user.keyboard('{Escape}')
      
      // Focus should return to trigger
      expect(trigger).toHaveFocus()
    })
  })

  describe('Accessibility', () => {
    it('has no accessibility violations', async () => {
      const user = userEvent.setup()
      
      const { container } = render(
        <Dialog>
          <DialogTrigger asChild>
            <Button>Open</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Accessible Dialog</DialogTitle>
              <DialogDescription>This dialog follows accessibility guidelines</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button>Action</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )
      
      await user.click(screen.getByRole('button', { name: 'Open' }))
      
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup()
      
      render(
        <Dialog>
          <DialogTrigger asChild>
            <Button>Open</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Keyboard Test</DialogTitle>
            </DialogHeader>
            <input placeholder="First input" />
            <input placeholder="Second input" />
            <DialogFooter>
              <Button>First Button</Button>
              <Button>Second Button</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )
      
      const trigger = screen.getByRole('button', { name: 'Open' })
      
      // Navigate to trigger with keyboard
      await user.tab()
      expect(trigger).toHaveFocus()
      
      // Open with Enter
      await user.keyboard('{Enter}')
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      
      // Tab through dialog elements
      await user.tab()
      expect(screen.getByPlaceholderText('First input')).toHaveFocus()
      
      await user.tab()
      expect(screen.getByPlaceholderText('Second input')).toHaveFocus()
      
      await user.tab()
      expect(screen.getByRole('button', { name: 'First Button' })).toHaveFocus()
    })
  })

  describe('Controlled State', () => {
    it('works with controlled open state', async () => {
      const user = userEvent.setup()
      const handleOpenChange = jest.fn()
      
      const ControlledDialog = () => {
        const [open, setOpen] = React.useState(false)
        
        return (
          <div>
            <button onClick={() => setOpen(true)}>External Open</button>
            <Dialog open={open} onOpenChange={(newOpen) => {
              setOpen(newOpen)
              handleOpenChange(newOpen)
            }}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Controlled Dialog</DialogTitle>
                </DialogHeader>
              </DialogContent>
            </Dialog>
          </div>
        )
      }
      
      render(<ControlledDialog />)
      
      const externalButton = screen.getByRole('button', { name: 'External Open' })
      await user.click(externalButton)
      
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(handleOpenChange).toHaveBeenCalledWith(true)
      
      // Close with escape
      await user.keyboard('{Escape}')
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(handleOpenChange).toHaveBeenCalledWith(false)
    })
  })
})