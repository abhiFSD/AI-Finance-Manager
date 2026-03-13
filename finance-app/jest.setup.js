import '@testing-library/jest-dom'
import 'jest-axe/extend-expect'

// Polyfill fetch and Response for Node.js environment
global.fetch = jest.fn()

global.Response = class Response {
  constructor(body, init = {}) {
    this.body = body
    this.status = init.status || 200
    this.statusText = init.statusText || 'OK'
    this.headers = new Headers(init.headers)
    this.ok = this.status >= 200 && this.status < 300
  }

  json() {
    return Promise.resolve(typeof this.body === 'string' ? JSON.parse(this.body) : this.body)
  }

  text() {
    return Promise.resolve(String(this.body))
  }
}

global.Request = class Request {
  constructor(input, init = {}) {
    this.url = typeof input === 'string' ? input : input.url
    this.method = init.method || 'GET'
    this.headers = new Headers(init.headers)
    this.body = init.body
  }

  json() {
    return Promise.resolve(typeof this.body === 'string' ? JSON.parse(this.body) : this.body)
  }
}

global.Headers = class Headers extends Map {
  constructor(init) {
    super()
    if (init) {
      if (typeof init === 'object' && init[Symbol.iterator]) {
        for (const [key, value] of init) {
          this.set(key, value)
        }
      } else if (typeof init === 'object') {
        for (const [key, value] of Object.entries(init)) {
          this.set(key, value)
        }
      }
    }
  }

  get(name) {
    return super.get(name.toLowerCase())
  }

  set(name, value) {
    return super.set(name.toLowerCase(), String(value))
  }

  has(name) {
    return super.has(name.toLowerCase())
  }

  delete(name) {
    return super.delete(name.toLowerCase())
  }
}

// Mock next/navigation
const mockPush = jest.fn()
const mockReplace = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: mockPush,
      replace: mockReplace,
      pathname: '/',
      query: {},
      asPath: '/',
    }
  },
  useSearchParams() {
    return new URLSearchParams()
  },
  usePathname() {
    return '/'
  },
}))

// Mock next/font/google
jest.mock('next/font/google', () => ({
  Geist: () => ({
    variable: '--font-geist-sans',
    className: 'font-geist-sans',
  }),
  Geist_Mono: () => ({
    variable: '--font-geist-mono',
    className: 'font-geist-mono',
  }),
}))

// Mock crypto for UUID generation
global.crypto = {
  randomUUID: () => 'test-uuid-' + Math.random().toString(36).substring(2),
}

// Mock window.matchMedia for responsive components
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))