/**
 * Client-side storage utilities that are server-side safe
 * Prevents localStorage errors during SSR
 */

/**
 * Check if we're running on the client side
 */
export const isClient = typeof window !== 'undefined';

/**
 * Safe localStorage wrapper that won't crash on server-side
 */
export const safeLocalStorage = {
  getItem: (key: string): string | null => {
    if (!isClient) return null;
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.warn('localStorage.getItem failed:', error);
      return null;
    }
  },

  setItem: (key: string, value: string): void => {
    if (!isClient) return;
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      console.warn('localStorage.setItem failed:', error);
    }
  },

  removeItem: (key: string): void => {
    if (!isClient) return;
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn('localStorage.removeItem failed:', error);
    }
  },

  clear: (): void => {
    if (!isClient) return;
    try {
      localStorage.clear();
    } catch (error) {
      console.warn('localStorage.clear failed:', error);
    }
  }
};

/**
 * Get parsed JSON from localStorage safely
 */
export const getStorageJson = <T = any>(key: string, defaultValue: T | null = null): T | null => {
  const item = safeLocalStorage.getItem(key);
  if (!item) return defaultValue;
  
  try {
    return JSON.parse(item) as T;
  } catch (error) {
    console.warn('Failed to parse localStorage JSON:', error);
    return defaultValue;
  }
};

/**
 * Set JSON to localStorage safely
 */
export const setStorageJson = <T = any>(key: string, value: T): void => {
  try {
    safeLocalStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn('Failed to stringify localStorage JSON:', error);
  }
};

/**
 * Use effect hook for client-side only operations
 */
export const useClientEffect = (effect: () => void | (() => void), deps?: React.DependencyList): void => {
  // This will be imported as useEffect in components
  const { useEffect } = require('react');
  
  useEffect(() => {
    if (!isClient) return;
    return effect();
  }, deps);
};