import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, jest, afterEach } from '@jest/globals';
import { usePaymentMode, usePaymentsEnabled } from '@/hooks/usePaymentMode';

// Mock fetch globally
global.fetch = jest.fn();

describe('usePaymentMode Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('usePaymentMode', () => {
    it('should return loading state initially', () => {
      const { result } = renderHook(() => usePaymentMode());

      expect(result.current.loading).toBe(true);
      expect(result.current.paymentsEnabled).toBe(false);
      expect(result.current.mode).toBe('disabled');
      expect(result.current.error).toBe(null);
    });

    it('should detect payments enabled from health endpoint', async () => {
      const mockHealthResponse = {
        status: 'healthy',
        checks: {
          database: true,
          memory: true,
          disk: true,
          stripe: true // Stripe check present and passing
        }
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockHealthResponse)
      });

      const { result } = renderHook(() => usePaymentMode());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.paymentsEnabled).toBe(true);
      expect(result.current.mode).toBe('stripe');
      expect(result.current.error).toBe(null);
    });

    it('should detect payments disabled from health endpoint', async () => {
      const mockHealthResponse = {
        status: 'healthy',
        checks: {
          database: true,
          memory: true,
          disk: true,
          stripe: null // Stripe check is null (disabled)
        }
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockHealthResponse)
      });

      const { result } = renderHook(() => usePaymentMode());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.paymentsEnabled).toBe(false);
      expect(result.current.mode).toBe('disabled');
      expect(result.current.error).toBe(null);
    });

    it('should handle health endpoint failure gracefully', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => usePaymentMode());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.paymentsEnabled).toBe(false);
      expect(result.current.mode).toBe('disabled');
      expect(result.current.error).toBe('Failed to check payment status');
    });

    it('should handle malformed health response', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}) // Empty response
      });

      const { result } = renderHook(() => usePaymentMode());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.paymentsEnabled).toBe(false);
      expect(result.current.mode).toBe('disabled');
      expect(result.current.error).toBe(null);
    });

    it('should handle HTTP error responses', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Server error' })
      });

      const { result } = renderHook(() => usePaymentMode());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.paymentsEnabled).toBe(false);
      expect(result.current.mode).toBe('disabled');
      expect(result.current.error).toBe('Failed to check payment status');
    });

    it('should call health endpoint once on mount', async () => {
      const mockHealthResponse = {
        checks: { stripe: true }
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockHealthResponse)
      });

      renderHook(() => usePaymentMode());

      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(global.fetch).toHaveBeenCalledWith('/api/health');
    });

    it('should handle missing stripe check in health response', async () => {
      const mockHealthResponse = {
        status: 'healthy',
        checks: {
          database: true,
          memory: true,
          disk: true
          // No stripe property
        }
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockHealthResponse)
      });

      const { result } = renderHook(() => usePaymentMode());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.paymentsEnabled).toBe(false);
      expect(result.current.mode).toBe('disabled');
    });
  });

  describe('usePaymentsEnabled', () => {
    it('should return boolean value for payments enabled', async () => {
      const mockHealthResponse = {
        checks: { stripe: true }
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockHealthResponse)
      });

      const { result } = renderHook(() => usePaymentsEnabled());

      await waitFor(() => {
        expect(typeof result.current).toBe('boolean');
      });

      expect(result.current).toBe(true);
    });

    it('should return false when payments are disabled', async () => {
      const mockHealthResponse = {
        checks: { stripe: null }
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockHealthResponse)
      });

      const { result } = renderHook(() => usePaymentsEnabled());

      await waitFor(() => {
        expect(result.current).toBe(false);
      });
    });

    it('should return false during loading', () => {
      const { result } = renderHook(() => usePaymentsEnabled());

      expect(result.current).toBe(false);
    });
  });

  describe('Error Scenarios', () => {
    it('should handle JSON parsing errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.reject(new Error('Invalid JSON'))
      });

      const { result } = renderHook(() => usePaymentMode());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.paymentsEnabled).toBe(false);
      expect(result.current.mode).toBe('disabled');
      expect(result.current.error).toBe('Failed to check payment status');
    });

    it('should handle network timeouts', async () => {
      (global.fetch as jest.Mock).mockImplementationOnce(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 100)
        )
      );

      const { result } = renderHook(() => usePaymentMode());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.paymentsEnabled).toBe(false);
      expect(result.current.mode).toBe('disabled');
    });
  });

  describe('Console Warnings', () => {
    it('should log warning when health check fails', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => usePaymentMode());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to check payment mode, defaulting to disabled:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Re-renders and Stability', () => {
    it('should not cause unnecessary re-renders', async () => {
      const mockHealthResponse = {
        checks: { stripe: true }
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockHealthResponse)
      });

      const { result, rerender } = renderHook(() => usePaymentMode());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const firstResult = result.current;

      rerender();

      expect(result.current).toBe(firstResult); // Should be the same object reference
      expect(global.fetch).toHaveBeenCalledTimes(1); // Should not call API again
    });
  });

  describe('Multiple Hook Instances', () => {
    it('should work correctly with multiple instances', async () => {
      const mockHealthResponse = {
        checks: { stripe: false }
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockHealthResponse)
      });

      const { result: result1 } = renderHook(() => usePaymentMode());
      const { result: result2 } = renderHook(() => usePaymentsEnabled());

      await waitFor(() => {
        expect(result1.current.loading).toBe(false);
      });

      expect(result1.current.paymentsEnabled).toBe(false);
      expect(result2.current).toBe(false);
    });
  });
});