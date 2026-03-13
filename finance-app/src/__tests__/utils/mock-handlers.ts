import { http, HttpResponse } from 'msw'
import { 
  createMockTransactions, 
  createMockAccounts, 
  createMockUser,
  createMockDocument,
  createMockApiResponse,
  createMockApiError
} from './test-data'

// API Base URL (adjust as needed)
const API_BASE = '/api'

export const mockHandlers = [
  // Authentication endpoints
  http.post(`${API_BASE}/auth/login`, async ({ request }) => {
    const { email, password } = await request.json() as { email: string, password: string }
    
    if (email === 'test@example.com' && password === 'password') {
      return HttpResponse.json(createMockApiResponse({
        user: createMockUser({ email }),
        token: 'mock-jwt-token',
        refreshToken: 'mock-refresh-token'
      }))
    }
    
    return HttpResponse.json(
      createMockApiError('Invalid credentials'),
      { status: 401 }
    )
  }),

  http.post(`${API_BASE}/auth/register`, async ({ request }) => {
    const userData = await request.json()
    return HttpResponse.json(createMockApiResponse({
      user: createMockUser(userData),
      token: 'mock-jwt-token'
    }))
  }),

  http.post(`${API_BASE}/auth/logout`, () => {
    return HttpResponse.json(createMockApiResponse({ message: 'Logged out successfully' }))
  }),

  http.post(`${API_BASE}/auth/forgot-password`, () => {
    return HttpResponse.json(createMockApiResponse({ message: 'Password reset email sent' }))
  }),

  // User endpoints
  http.get(`${API_BASE}/user/profile`, () => {
    return HttpResponse.json(createMockApiResponse(createMockUser()))
  }),

  http.put(`${API_BASE}/user/profile`, async ({ request }) => {
    const updates = await request.json()
    return HttpResponse.json(createMockApiResponse(createMockUser(updates)))
  }),

  // Account endpoints
  http.get(`${API_BASE}/accounts`, ({ request }) => {
    const url = new URL(request.url)
    const limit = parseInt(url.searchParams.get('limit') || '10')
    
    return HttpResponse.json(createMockApiResponse({
      accounts: createMockAccounts(limit),
      total: 25,
      page: 1,
      totalPages: 3
    }))
  }),

  http.post(`${API_BASE}/accounts`, async ({ request }) => {
    const accountData = await request.json()
    return HttpResponse.json(createMockApiResponse(createMockAccounts(1)[0]))
  }),

  http.put(`${API_BASE}/accounts/:id`, ({ params }) => {
    return HttpResponse.json(createMockApiResponse(createMockAccounts(1)[0]))
  }),

  http.delete(`${API_BASE}/accounts/:id`, () => {
    return HttpResponse.json(createMockApiResponse({ message: 'Account deleted successfully' }))
  }),

  // Transaction endpoints
  http.get(`${API_BASE}/transactions`, ({ request }) => {
    const url = new URL(request.url)
    const limit = parseInt(url.searchParams.get('limit') || '50')
    const category = url.searchParams.get('category')
    const search = url.searchParams.get('search')
    
    let transactions = createMockTransactions(limit)
    
    if (category) {
      transactions = transactions.filter(t => t.category === category)
    }
    
    if (search) {
      transactions = transactions.filter(t => 
        t.description.toLowerCase().includes(search.toLowerCase()) ||
        t.merchant.toLowerCase().includes(search.toLowerCase())
      )
    }

    return HttpResponse.json(createMockApiResponse({
      transactions,
      total: 250,
      page: 1,
      totalPages: 5
    }))
  }),

  http.post(`${API_BASE}/transactions`, async ({ request }) => {
    const transactionData = await request.json()
    return HttpResponse.json(createMockApiResponse(createMockTransactions(1, transactionData)[0]))
  }),

  http.put(`${API_BASE}/transactions/:id`, ({ params }) => {
    return HttpResponse.json(createMockApiResponse(createMockTransactions(1)[0]))
  }),

  http.delete(`${API_BASE}/transactions/:id`, () => {
    return HttpResponse.json(createMockApiResponse({ message: 'Transaction deleted successfully' }))
  }),

  // Document endpoints
  http.get(`${API_BASE}/documents`, () => {
    return HttpResponse.json(createMockApiResponse({
      documents: Array.from({ length: 10 }, () => createMockDocument({ status: 'completed' })),
      total: 15
    }))
  }),

  http.post(`${API_BASE}/documents/upload`, async ({ request }) => {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return HttpResponse.json(
        createMockApiError('No file provided'),
        { status: 400 }
      )
    }

    // Simulate file size validation
    if (file.size > 10 * 1024 * 1024) {
      return HttpResponse.json(
        createMockApiError('File too large'),
        { status: 400 }
      )
    }

    return HttpResponse.json(createMockApiResponse({
      document: createMockDocument({
        name: file.name,
        type: file.type.includes('pdf') ? 'pdf' : 'image',
        size: file.size,
        status: 'uploading'
      }),
      uploadId: 'mock-upload-id'
    }))
  }),

  http.get(`${API_BASE}/documents/:id/status`, ({ params }) => {
    const statuses = ['uploading', 'processing', 'completed']
    const randomStatus = statuses[Math.floor(Math.random() * statuses.length)]
    
    return HttpResponse.json(createMockApiResponse({
      status: randomStatus,
      progress: Math.floor(Math.random() * 100),
      extractedTransactions: randomStatus === 'completed' ? Math.floor(Math.random() * 50) + 1 : 0
    }))
  }),

  http.delete(`${API_BASE}/documents/:id`, () => {
    return HttpResponse.json(createMockApiResponse({ message: 'Document deleted successfully' }))
  }),

  // Dashboard/Analytics endpoints
  http.get(`${API_BASE}/dashboard/overview`, () => {
    return HttpResponse.json(createMockApiResponse({
      netWorth: 45250.80,
      monthlyIncome: 4600,
      monthlyExpenses: 3200,
      savingsRate: 30.4,
      trends: {
        netWorth: 2.1,
        income: 5.2,
        expenses: -3.1
      }
    }))
  }),

  http.get(`${API_BASE}/analytics/spending-by-category`, () => {
    return HttpResponse.json(createMockApiResponse([
      { name: "Food & Dining", value: 2400, color: "hsl(var(--chart-1))" },
      { name: "Transportation", value: 1200, color: "hsl(var(--chart-2))" },
      { name: "Entertainment", value: 800, color: "hsl(var(--chart-3))" },
      { name: "Shopping", value: 1500, color: "hsl(var(--chart-4))" },
      { name: "Utilities", value: 600, color: "hsl(var(--chart-5))" }
    ]))
  }),

  http.get(`${API_BASE}/analytics/income-vs-expenses`, () => {
    return HttpResponse.json(createMockApiResponse([
      { name: "Jan", income: 4000, expenses: 3200, savings: 800 },
      { name: "Feb", income: 4200, expenses: 3400, savings: 800 },
      { name: "Mar", income: 3800, expenses: 3600, savings: 200 },
      { name: "Apr", income: 4500, expenses: 3100, savings: 1400 },
      { name: "May", income: 4300, expenses: 3500, savings: 800 },
      { name: "Jun", income: 4600, expenses: 3200, savings: 1400 }
    ]))
  }),

  // Settings endpoints
  http.get(`${API_BASE}/settings`, () => {
    return HttpResponse.json(createMockApiResponse({
      notifications: {
        email: true,
        push: false,
        weekly: true
      },
      preferences: {
        currency: 'USD',
        dateFormat: 'MM/DD/YYYY',
        theme: 'system'
      },
      security: {
        twoFactor: false,
        loginAlerts: true
      }
    }))
  }),

  http.put(`${API_BASE}/settings`, async ({ request }) => {
    const settings = await request.json()
    return HttpResponse.json(createMockApiResponse(settings))
  }),

  // Error simulation endpoints for testing
  http.get(`${API_BASE}/test/error/:code`, ({ params }) => {
    const code = parseInt(params.code as string)
    return HttpResponse.json(
      createMockApiError(`Simulated ${code} error`),
      { status: code }
    )
  }),

  http.get(`${API_BASE}/test/timeout`, () => {
    return new Promise(() => {}) // Never resolves to simulate timeout
  }),
]

// Helper to reset handlers between tests
export const resetHandlers = () => {
  // Reset any stateful behavior in handlers
}

// Helper for testing different response scenarios
export const createErrorHandler = (endpoint: string, errorCode: number, message: string) => {
  return http.get(endpoint, () => {
    return HttpResponse.json(
      createMockApiError(message),
      { status: errorCode }
    )
  })
}

export const createSlowHandler = (endpoint: string, delay: number) => {
  return http.get(endpoint, async () => {
    await new Promise(resolve => setTimeout(resolve, delay))
    return HttpResponse.json(createMockApiResponse({ message: 'Slow response' }))
  })
}