import { useAuthStore } from '@/store/auth-store'

// Mock zustand store for testing
jest.mock('zustand', () => ({
  create: jest.fn((fn) => {
    const store = fn()
    return jest.fn(() => store)
  }),
}))

describe('AuthStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    })
  })

  it('should initialize with default state', () => {
    const state = useAuthStore.getState()
    expect(state.user).toBeNull()
    expect(state.isAuthenticated).toBe(false)
    expect(state.isLoading).toBe(false)
  })

  it('should login user correctly', () => {
    const mockUser = {
      id: '123',
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
    }

    const { login } = useAuthStore.getState()
    login(mockUser)

    const state = useAuthStore.getState()
    expect(state.user).toEqual(mockUser)
    expect(state.isAuthenticated).toBe(true)
    expect(state.isLoading).toBe(false)
  })

  it('should logout user correctly', () => {
    // First login
    const mockUser = {
      id: '123',
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
    }
    
    const { login, logout } = useAuthStore.getState()
    login(mockUser)
    
    // Then logout
    logout()
    
    const state = useAuthStore.getState()
    expect(state.user).toBeNull()
    expect(state.isAuthenticated).toBe(false)
    expect(state.isLoading).toBe(false)
  })

  it('should update user data correctly', () => {
    const mockUser = {
      id: '123',
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
    }
    
    const { login, updateUser } = useAuthStore.getState()
    login(mockUser)
    
    const updates = {
      firstName: 'Jane',
      avatar: 'avatar.jpg',
    }
    
    updateUser(updates)
    
    const state = useAuthStore.getState()
    expect(state.user).toEqual({
      ...mockUser,
      ...updates,
    })
  })

  it('should not update user if not logged in', () => {
    const { updateUser } = useAuthStore.getState()
    
    updateUser({ firstName: 'Jane' })
    
    const state = useAuthStore.getState()
    expect(state.user).toBeNull()
  })

  it('should set loading state correctly', () => {
    const { setLoading } = useAuthStore.getState()
    
    setLoading(true)
    expect(useAuthStore.getState().isLoading).toBe(true)
    
    setLoading(false)
    expect(useAuthStore.getState().isLoading).toBe(false)
  })
})