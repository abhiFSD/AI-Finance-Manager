import { cn } from '@/lib/utils'

describe('Utility Functions', () => {
  describe('cn (className merger)', () => {
    it('should merge class names correctly', () => {
      const result = cn('text-white', 'bg-blue-500')
      expect(result).toBe('text-white bg-blue-500')
    })

    it('should handle conditional classes', () => {
      const isActive = true
      const result = cn('base-class', isActive && 'active-class')
      expect(result).toBe('base-class active-class')
    })

    it('should handle false conditions', () => {
      const isActive = false
      const result = cn('base-class', isActive && 'active-class')
      expect(result).toBe('base-class')
    })

    it('should merge conflicting tailwind classes correctly', () => {
      const result = cn('p-4', 'p-2')
      expect(result).toBe('p-2') // Last one should win
    })

    it('should handle arrays of classes', () => {
      const result = cn(['text-white', 'bg-blue-500'], 'rounded')
      expect(result).toBe('text-white bg-blue-500 rounded')
    })

    it('should handle empty or undefined values', () => {
      const result = cn('text-white', undefined, null, '', 'bg-blue-500')
      expect(result).toBe('text-white bg-blue-500')
    })

    it('should handle object notation', () => {
      const result = cn({
        'text-white': true,
        'bg-blue-500': true,
        'hidden': false,
      })
      expect(result).toBe('text-white bg-blue-500')
    })
  })
})