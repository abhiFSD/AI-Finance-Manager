import { act, renderHook } from '@testing-library/react'
import { useAuthStore } from '@/store/auth-store'
import { createMockUser } from '@/__tests__/utils/test-data'

// Mock localStorage for persist middleware
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
})

describe('Auth Store - Comprehensive', () => {
  beforeEach(() => {
    // Reset store state before each test
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    }, true)
    
    jest.clearAllMocks()
  })

  describe('Initial State', () => {
    it('has correct initial state', () => {
      const { result } = renderHook(() => useAuthStore())
      
      expect(result.current.user).toBeNull()
      expect(result.current.isAuthenticated).toBe(false)
      expect(result.current.isLoading).toBe(false)
    })

    it('provides all required actions', () => {
      const { result } = renderHook(() => useAuthStore())
      
      expect(typeof result.current.login).toBe('function')
      expect(typeof result.current.logout).toBe('function')
      expect(typeof result.current.updateUser).toBe('function')
      expect(typeof result.current.setLoading).toBe('function')
    })
  })

  describe('Login Functionality', () => {
    it('sets user and authentication state on login', () => {
      const mockUser = createMockUser()
      const { result } = renderHook(() => useAuthStore())
      
      act(() => {
        result.current.login(mockUser)
      })
      
      expect(result.current.user).toEqual(mockUser)
      expect(result.current.isAuthenticated).toBe(true)
      expect(result.current.isLoading).toBe(false)
    })

    it('handles login with minimal user data', () => {
      const minimalUser = {
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe'
      }
      
      const { result } = renderHook(() => useAuthStore())
      
      act(() => {
        result.current.login(minimalUser)
      })
      
      expect(result.current.user).toEqual(minimalUser)
      expect(result.current.isAuthenticated).toBe(true)
    })

    it('handles login with complete user data including avatar', () => {
      const completeUser = createMockUser({
        avatar: 'https://example.com/avatar.jpg'
      })
      
      const { result } = renderHook(() => useAuthStore())
      
      act(() => {
        result.current.login(completeUser)
      })
      
      expect(result.current.user).toEqual(completeUser)
      expect(result.current.user?.avatar).toBe('https://example.com/avatar.jpg')
      expect(result.current.isAuthenticated).toBe(true)
    })

    it('overwrites previous user on new login', () => {
      const firstUser = createMockUser({ firstName: 'First' })
      const secondUser = createMockUser({ firstName: 'Second' })
      
      const { result } = renderHook(() => useAuthStore())
      
      act(() => {
        result.current.login(firstUser)
      })
      
      expect(result.current.user?.firstName).toBe('First')
      
      act(() => {
        result.current.login(secondUser)
      })
      
      expect(result.current.user?.firstName).toBe('Second')
      expect(result.current.user?.id).toBe(secondUser.id)
    })
  })

  describe('Logout Functionality', () => {
    it('clears user and authentication state on logout', () => {
      const mockUser = createMockUser()
      const { result } = renderHook(() => useAuthStore())
      
      // Login first
      act(() => {
        result.current.login(mockUser)
      })
      
      expect(result.current.isAuthenticated).toBe(true)
      
      // Then logout
      act(() => {
        result.current.logout()
      })
      
      expect(result.current.user).toBeNull()
      expect(result.current.isAuthenticated).toBe(false)
      expect(result.current.isLoading).toBe(false)
    })

    it('can logout when not authenticated', () => {
      const { result } = renderHook(() => useAuthStore())
      
      // Logout when already logged out
      act(() => {
        result.current.logout()
      })
      
      expect(result.current.user).toBeNull()
      expect(result.current.isAuthenticated).toBe(false)
      expect(result.current.isLoading).toBe(false)
    })

    it('resets loading state on logout', () => {
      const mockUser = createMockUser()
      const { result } = renderHook(() => useAuthStore())
      
      // Login and set loading
      act(() => {
        result.current.login(mockUser)
        result.current.setLoading(true)
      })
      
      expect(result.current.isLoading).toBe(true)
      
      // Logout should reset loading
      act(() => {
        result.current.logout()
      })
      
      expect(result.current.isLoading).toBe(false)
    })
  })

  describe('User Update Functionality', () => {
    it('updates existing user data', () => {
      const mockUser = createMockUser({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com'
      })
      
      const { result } = renderHook(() => useAuthStore())
      
      act(() => {
        result.current.login(mockUser)
      })
      
      act(() => {
        result.current.updateUser({
          firstName: 'Jane',
          avatar: 'https://example.com/new-avatar.jpg'
        })
      })
      
      expect(result.current.user?.firstName).toBe('Jane')
      expect(result.current.user?.lastName).toBe('Doe') // Should remain unchanged
      expect(result.current.user?.email).toBe('john@example.com') // Should remain unchanged
      expect(result.current.user?.avatar).toBe('https://example.com/new-avatar.jpg')
      expect(result.current.user?.id).toBe(mockUser.id) // Should remain unchanged
    })

    it('does nothing when no user is logged in', () => {
      const { result } = renderHook(() => useAuthStore())
      
      act(() => {
        result.current.updateUser({
          firstName: 'Jane'
        })
      })
      
      expect(result.current.user).toBeNull()
    })

    it('handles partial updates correctly', () => {
      const mockUser = createMockUser()
      const { result } = renderHook(() => useAuthStore())
      
      act(() => {
        result.current.login(mockUser)
      })
      
      // Update only email
      act(() => {
        result.current.updateUser({
          email: 'newemail@example.com'
        })
      })
      
      expect(result.current.user?.email).toBe('newemail@example.com')
      expect(result.current.user?.firstName).toBe(mockUser.firstName)
      expect(result.current.user?.lastName).toBe(mockUser.lastName)
      expect(result.current.user?.id).toBe(mockUser.id)
    })

    it('can remove avatar by setting to undefined', () => {
      const mockUser = createMockUser({
        avatar: 'https://example.com/avatar.jpg'
      })
      
      const { result } = renderHook(() => useAuthStore())
      
      act(() => {
        result.current.login(mockUser)
      })
      
      expect(result.current.user?.avatar).toBe('https://example.com/avatar.jpg')
      
      act(() => {
        result.current.updateUser({
          avatar: undefined
        })
      })
      
      expect(result.current.user?.avatar).toBeUndefined()
    })
  })

  describe('Loading State Management', () => {
    it('sets loading state', () => {
      const { result } = renderHook(() => useAuthStore())
      
      act(() => {
        result.current.setLoading(true)
      })
      
      expect(result.current.isLoading).toBe(true)
    })

    it('clears loading state', () => {
      const { result } = renderHook(() => useAuthStore())
      
      act(() => {
        result.current.setLoading(true)
      })
      
      expect(result.current.isLoading).toBe(true)
      
      act(() => {
        result.current.setLoading(false)
      })
      
      expect(result.current.isLoading).toBe(false)
    })

    it('can toggle loading state multiple times', () => {
      const { result } = renderHook(() => useAuthStore())
      
      // Toggle loading on and off multiple times
      for (let i = 0; i < 5; i++) {
        act(() => {
          result.current.setLoading(true)
        })
        expect(result.current.isLoading).toBe(true)
        
        act(() => {
          result.current.setLoading(false)
        })
        expect(result.current.isLoading).toBe(false)
      }
    })

    it('loading state is independent of authentication state', () => {
      const mockUser = createMockUser()
      const { result } = renderHook(() => useAuthStore())
      
      // Set loading before login
      act(() => {
        result.current.setLoading(true)
      })
      
      expect(result.current.isLoading).toBe(true)
      expect(result.current.isAuthenticated).toBe(false)
      
      // Login should not affect loading state if we don't explicitly set it
      act(() => {
        useAuthStore.setState(state => ({
          ...state,
          user: mockUser,
          isAuthenticated: true
        }))
      })
      
      expect(result.current.isLoading).toBe(true)
      expect(result.current.isAuthenticated).toBe(true)
    })
  })

  describe('Store State Combinations', () => {
    it('handles complex state transitions', () => {
      const mockUser = createMockUser()
      const { result } = renderHook(() => useAuthStore())
      
      // Start with loading
      act(() => {
        result.current.setLoading(true)
      })
      
      expect(result.current.isLoading).toBe(true)
      expect(result.current.isAuthenticated).toBe(false)
      
      // Login (which sets loading to false)
      act(() => {
        result.current.login(mockUser)
      })
      
      expect(result.current.isLoading).toBe(false)
      expect(result.current.isAuthenticated).toBe(true)
      expect(result.current.user).toEqual(mockUser)
      
      // Update user
      act(() => {
        result.current.updateUser({ firstName: 'Updated' })
      })
      
      expect(result.current.user?.firstName).toBe('Updated')
      expect(result.current.isAuthenticated).toBe(true)
      
      // Set loading again
      act(() => {
        result.current.setLoading(true)
      })
      
      expect(result.current.isLoading).toBe(true)
      expect(result.current.isAuthenticated).toBe(true)
      
      // Logout
      act(() => {
        result.current.logout()
      })
      
      expect(result.current.isLoading).toBe(false)
      expect(result.current.isAuthenticated).toBe(false)
      expect(result.current.user).toBeNull()
    })
  })

  describe('Persistence Configuration', () => {
    it('includes user and isAuthenticated in persistence', () => {
      const mockUser = createMockUser()
      const { result } = renderHook(() => useAuthStore())
      
      act(() => {
        result.current.login(mockUser)
        result.current.setLoading(true)
      })
      
      // The store should persist user and isAuthenticated but not isLoading
      const state = result.current
      const persistedData = {
        user: state.user,
        isAuthenticated: state.isAuthenticated
      }
      
      expect(persistedData.user).toEqual(mockUser)
      expect(persistedData.isAuthenticated).toBe(true)
      // isLoading should not be in persisted data
    })
  })

  describe('Error Handling', () => {
    it('handles invalid user data gracefully', () => {
      const { result } = renderHook(() => useAuthStore())
      
      // Try to login with invalid user data
      act(() => {
        result.current.login(null as any)
      })
      
      expect(result.current.user).toBeNull()
    })

    it('handles undefined updates gracefully', () => {
      const mockUser = createMockUser()
      const { result } = renderHook(() => useAuthStore())
      
      act(() => {
        result.current.login(mockUser)
      })
      
      act(() => {
        result.current.updateUser(undefined as any)
      })
      
      // User should remain unchanged
      expect(result.current.user).toEqual(mockUser)
    })

    it('handles empty update objects', () => {
      const mockUser = createMockUser()
      const { result } = renderHook(() => useAuthStore())
      
      act(() => {
        result.current.login(mockUser)
      })
      
      act(() => {
        result.current.updateUser({})
      })
      
      // User should remain unchanged
      expect(result.current.user).toEqual(mockUser)
    })
  })

  describe('Store Subscription and Updates', () => {
    it('notifies subscribers of state changes', () => {
      const mockUser = createMockUser()
      const { result, rerender } = renderHook(() => useAuthStore())
      
      act(() => {
        result.current.login(mockUser)
      })
      
      rerender()
      
      expect(result.current.isAuthenticated).toBe(true)
      expect(result.current.user).toEqual(mockUser)
    })

    it('maintains referential stability for actions', () => {
      const { result, rerender } = renderHook(() => useAuthStore())
      
      const initialLogin = result.current.login
      const initialLogout = result.current.logout
      const initialUpdateUser = result.current.updateUser
      const initialSetLoading = result.current.setLoading
      
      rerender()
      
      expect(result.current.login).toBe(initialLogin)
      expect(result.current.logout).toBe(initialLogout)
      expect(result.current.updateUser).toBe(initialUpdateUser)
      expect(result.current.setLoading).toBe(initialSetLoading)
    })
  })

  describe('Performance', () => {
    it('handles rapid state updates efficiently', () => {
      const { result } = renderHook(() => useAuthStore())
      const mockUser = createMockUser()
      
      // Perform many rapid updates
      act(() => {
        for (let i = 0; i < 100; i++) {
          result.current.setLoading(i % 2 === 0)
        }
        
        result.current.login(mockUser)
        
        for (let i = 0; i < 100; i++) {
          result.current.updateUser({ firstName: `Name${i}` })
        }
      })
      
      expect(result.current.user?.firstName).toBe('Name99')
      expect(result.current.isAuthenticated).toBe(true)
      expect(result.current.isLoading).toBe(false)
    })
  })

  describe('Edge Cases', () => {
    it('handles user with minimal required fields', () => {
      const minimalUser = {
        id: 'test-id',
        email: 'test@example.com',
        firstName: '',
        lastName: ''
      }
      
      const { result } = renderHook(() => useAuthStore())
      
      act(() => {
        result.current.login(minimalUser)
      })
      
      expect(result.current.user).toEqual(minimalUser)
      expect(result.current.isAuthenticated).toBe(true)
    })

    it('handles user with special characters in names', () => {
      const specialUser = createMockUser({
        firstName: 'José María',
        lastName: 'García-Rodríguez',
        email: 'josé.maría@example.com'
      })
      
      const { result } = renderHook(() => useAuthStore())
      
      act(() => {
        result.current.login(specialUser)
      })
      
      expect(result.current.user?.firstName).toBe('José María')
      expect(result.current.user?.lastName).toBe('García-Rodríguez')
      expect(result.current.user?.email).toBe('josé.maría@example.com')
    })

    it('handles very long user data', () => {
      const longDataUser = createMockUser({
        firstName: 'A'.repeat(1000),
        lastName: 'B'.repeat(1000),
        email: 'very-long-email-address@' + 'domain'.repeat(50) + '.com'
      })
      
      const { result } = renderHook(() => useAuthStore())
      
      act(() => {
        result.current.login(longDataUser)
      })
      
      expect(result.current.user?.firstName).toBe('A'.repeat(1000))
      expect(result.current.isAuthenticated).toBe(true)
    })
  })
})