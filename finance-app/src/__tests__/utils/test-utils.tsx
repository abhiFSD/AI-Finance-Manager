import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from '@/components/ui/theme-provider'

// Mock theme provider
const MockThemeProvider = ({ children }: { children: React.ReactNode }) => {
  return <div data-theme="light">{children}</div>
}

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: Infinity,
      },
      mutations: {
        retry: false,
      },
    },
  })

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient
  theme?: 'light' | 'dark'
}

const AllTheProviders = ({
  children,
  queryClient,
  theme = 'light',
}: {
  children: React.ReactNode
  queryClient?: QueryClient
  theme?: 'light' | 'dark'
}) => {
  const client = queryClient || createTestQueryClient()
  
  return (
    <QueryClientProvider client={client}>
      <MockThemeProvider>
        <div data-testid="test-wrapper" data-theme={theme}>
          {children}
        </div>
      </MockThemeProvider>
    </QueryClientProvider>
  )
}

const customRender = (
  ui: ReactElement,
  options?: CustomRenderOptions
) => {
  const { queryClient, theme, ...renderOptions } = options || {}
  
  return render(ui, {
    wrapper: (props) => (
      <AllTheProviders queryClient={queryClient} theme={theme} {...props} />
    ),
    ...renderOptions,
  })
}

// Mock implementations for common browser APIs
export const mockLocalStorage = () => {
  let store: { [key: string]: string } = {}
  
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key]
    }),
    clear: jest.fn(() => {
      store = {}
    }),
  }
}

export const mockSessionStorage = mockLocalStorage

// Mock file for testing file uploads
export const createMockFile = (name = 'test.pdf', type = 'application/pdf', size = 1024) => {
  const file = new File(['dummy content'], name, { type })
  Object.defineProperty(file, 'size', { value: size })
  return file
}

// Mock WebSocket
export const mockWebSocket = () => {
  const mockWS = {
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    send: jest.fn(),
    close: jest.fn(),
    readyState: WebSocket.OPEN,
    CONNECTING: WebSocket.CONNECTING,
    OPEN: WebSocket.OPEN,
    CLOSING: WebSocket.CLOSING,
    CLOSED: WebSocket.CLOSED,
  }
  
  return mockWS
}

// Helper to wait for async operations
export const waitForLoad = () => new Promise(resolve => setTimeout(resolve, 0))

// Mock intersection observer
export const mockIntersectionObserver = () => {
  const mockObserver = {
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  }
  
  Object.defineProperty(window, 'IntersectionObserver', {
    writable: true,
    value: jest.fn().mockImplementation(() => mockObserver),
  })
  
  return mockObserver
}

// Mock resize observer
export const mockResizeObserver = () => {
  const mockObserver = {
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  }
  
  Object.defineProperty(window, 'ResizeObserver', {
    writable: true,
    value: jest.fn().mockImplementation(() => mockObserver),
  })
  
  return mockObserver
}

// Custom matchers
export const toBeVisibleAndAccessible = (element: Element) => {
  const isVisible = element.checkVisibility?.() ?? true
  const hasAriaLabel = element.getAttribute('aria-label') || 
                      element.getAttribute('aria-labelledby') ||
                      element.textContent
  
  return {
    pass: isVisible && !!hasAriaLabel,
    message: () =>
      `Expected element to be visible and accessible. Visible: ${isVisible}, HasAriaLabel: ${!!hasAriaLabel}`,
  }
}

// Re-export everything from testing-library
export * from '@testing-library/react'
export { customRender as render }
export { createTestQueryClient }