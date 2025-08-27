'use client';

// Service Worker registration and management utilities

export interface ServiceWorkerConfig {
  enabled: boolean;
  swPath: string;
  scope: string;
  updateInterval: number;
  enablePush: boolean;
  enableSync: boolean;
}

export const defaultSWConfig: ServiceWorkerConfig = {
  enabled: process.env.NODE_ENV === 'production',
  swPath: '/sw.js',
  scope: '/',
  updateInterval: 24 * 60 * 60 * 1000, // 24 hours
  enablePush: false,
  enableSync: true,
};

export class ServiceWorkerManager {
  private static instance: ServiceWorkerManager;
  private registration: ServiceWorkerRegistration | null = null;
  private config: ServiceWorkerConfig;
  private updateCheckInterval: NodeJS.Timeout | null = null;

  private constructor(config: ServiceWorkerConfig = defaultSWConfig) {
    this.config = { ...defaultSWConfig, ...config };
  }

  static getInstance(config?: Partial<ServiceWorkerConfig>): ServiceWorkerManager {
    if (!ServiceWorkerManager.instance) {
      ServiceWorkerManager.instance = new ServiceWorkerManager(config);
    }
    return ServiceWorkerManager.instance;
  }

  /**
   * Initialize and register service worker
   */
  async init(): Promise<void> {
    if (!this.config.enabled || typeof window === 'undefined') {
      console.log('[SW Manager] Service worker disabled or not in browser');
      return;
    }

    if (!('serviceWorker' in navigator)) {
      console.warn('[SW Manager] Service worker not supported');
      return;
    }

    try {
      // Register service worker
      this.registration = await navigator.serviceWorker.register(
        this.config.swPath,
        { scope: this.config.scope }
      );

      console.log('[SW Manager] Service worker registered successfully');

      // Set up event listeners
      this.setupEventListeners();

      // Check for updates periodically
      this.startUpdateChecks();

      // Handle initial installation
      if (this.registration.installing) {
        console.log('[SW Manager] Service worker installing...');
        this.handleServiceWorkerUpdate(this.registration.installing);
      } else if (this.registration.waiting) {
        console.log('[SW Manager] Service worker waiting...');
        this.showUpdatePrompt();
      }

    } catch (error) {
      console.error('[SW Manager] Service worker registration failed:', error);
    }
  }

  /**
   * Set up event listeners
   */
  private setupEventListeners(): void {
    if (!this.registration) return;

    // Handle updates
    this.registration.addEventListener('updatefound', () => {
      console.log('[SW Manager] New service worker version found');
      const newWorker = this.registration!.installing;
      if (newWorker) {
        this.handleServiceWorkerUpdate(newWorker);
      }
    });

    // Handle controller change
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('[SW Manager] Service worker controller changed');
      // Refresh the page to load the new version
      window.location.reload();
    });

    // Handle messages from service worker
    navigator.serviceWorker.addEventListener('message', (event) => {
      this.handleServiceWorkerMessage(event);
    });

    // Handle network status
    window.addEventListener('online', () => {
      console.log('[SW Manager] Network back online');
      this.syncWhenOnline();
    });

    window.addEventListener('offline', () => {
      console.log('[SW Manager] Network offline');
      this.handleOffline();
    });
  }

  /**
   * Handle service worker updates
   */
  private handleServiceWorkerUpdate(worker: ServiceWorker): void {
    worker.addEventListener('statechange', () => {
      switch (worker.state) {
        case 'installed':
          if (navigator.serviceWorker.controller) {
            // New version available
            console.log('[SW Manager] New version available');
            this.showUpdatePrompt();
          } else {
            // First time installation
            console.log('[SW Manager] App is cached and ready for offline use');
            this.notifyInstallReady();
          }
          break;

        case 'activated':
          console.log('[SW Manager] Service worker activated');
          break;

        case 'redundant':
          console.log('[SW Manager] Service worker became redundant');
          break;
      }
    });
  }

  /**
   * Show update prompt to user
   */
  private showUpdatePrompt(): void {
    // Dispatch custom event for UI to handle
    const event = new CustomEvent('swUpdate', {
      detail: {
        registration: this.registration,
        skipWaiting: () => this.skipWaiting(),
      },
    });
    window.dispatchEvent(event);

    // Auto-update after delay if no user interaction
    setTimeout(() => {
      if (this.registration?.waiting) {
        console.log('[SW Manager] Auto-updating service worker after timeout');
        this.skipWaiting();
      }
    }, 30000); // 30 seconds
  }

  /**
   * Skip waiting and activate new service worker
   */
  async skipWaiting(): Promise<void> {
    if (this.registration?.waiting) {
      this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  }

  /**
   * Start periodic update checks
   */
  private startUpdateChecks(): void {
    this.updateCheckInterval = setInterval(() => {
      this.checkForUpdates();
    }, this.config.updateInterval);
  }

  /**
   * Check for service worker updates
   */
  async checkForUpdates(): Promise<void> {
    if (this.registration) {
      try {
        await this.registration.update();
        console.log('[SW Manager] Update check completed');
      } catch (error) {
        console.warn('[SW Manager] Update check failed:', error);
      }
    }
  }

  /**
   * Handle messages from service worker
   */
  private handleServiceWorkerMessage(event: MessageEvent): void {
    const { data } = event;

    switch (data.type) {
      case 'CACHE_UPDATED':
        console.log('[SW Manager] Cache updated:', data.cacheName);
        break;

      case 'BACKGROUND_SYNC':
        console.log('[SW Manager] Background sync completed');
        break;

      case 'PUSH_NOTIFICATION':
        this.handlePushNotification(data.notification);
        break;

      default:
        console.log('[SW Manager] Unknown message:', data);
    }
  }

  /**
   * Handle push notifications
   */
  private handlePushNotification(notification: any): void {
    // Dispatch custom event for notification handling
    const event = new CustomEvent('pushNotification', { detail: notification });
    window.dispatchEvent(event);
  }

  /**
   * Notify that app is ready for offline use
   */
  private notifyInstallReady(): void {
    const event = new CustomEvent('swInstalled', {
      detail: { message: 'App is ready for offline use!' },
    });
    window.dispatchEvent(event);
  }

  /**
   * Handle offline scenario
   */
  private handleOffline(): void {
    const event = new CustomEvent('appOffline');
    window.dispatchEvent(event);
  }

  /**
   * Sync when back online
   */
  private syncWhenOnline(): void {
    if (this.registration && 'sync' in this.registration) {
      this.registration.sync.register('background-sync').catch((error) => {
        console.warn('[SW Manager] Background sync registration failed:', error);
      });
    }

    const event = new CustomEvent('appOnline');
    window.dispatchEvent(event);
  }

  /**
   * Get cache status
   */
  async getCacheStatus(): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!navigator.serviceWorker.controller) {
        reject(new Error('No service worker controller'));
        return;
      }

      const messageChannel = new MessageChannel();
      
      messageChannel.port1.onmessage = (event) => {
        resolve(event.data);
      };

      navigator.serviceWorker.controller.postMessage(
        { type: 'GET_CACHE_STATUS' },
        [messageChannel.port2]
      );

      // Timeout after 5 seconds
      setTimeout(() => {
        reject(new Error('Cache status request timeout'));
      }, 5000);
    });
  }

  /**
   * Clear all caches
   */
  async clearCaches(): Promise<void> {
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
      console.log('[SW Manager] All caches cleared');
    }
  }

  /**
   * Unregister service worker
   */
  async unregister(): Promise<void> {
    if (this.registration) {
      await this.registration.unregister();
      this.registration = null;
      
      if (this.updateCheckInterval) {
        clearInterval(this.updateCheckInterval);
        this.updateCheckInterval = null;
      }
      
      console.log('[SW Manager] Service worker unregistered');
    }
  }

  /**
   * Get registration status
   */
  getRegistration(): ServiceWorkerRegistration | null {
    return this.registration;
  }

  /**
   * Check if service worker is supported
   */
  static isSupported(): boolean {
    return typeof window !== 'undefined' && 'serviceWorker' in navigator;
  }

  /**
   * Check if app is running in standalone mode (PWA)
   */
  static isStandalone(): boolean {
    return typeof window !== 'undefined' && 
           (window.matchMedia('(display-mode: standalone)').matches ||
            (window.navigator as any).standalone === true);
  }
}

// React hooks for service worker
export function useServiceWorker(config?: Partial<ServiceWorkerConfig>) {
  const [isInstalled, setIsInstalled] = useState(false);
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const swManager = ServiceWorkerManager.getInstance(config);
    swManager.init();

    // Event listeners
    const handleSwInstalled = () => setIsInstalled(true);
    const handleSwUpdate = () => setIsUpdateAvailable(true);
    const handleOffline = () => setIsOffline(true);
    const handleOnline = () => setIsOffline(false);

    window.addEventListener('swInstalled', handleSwInstalled);
    window.addEventListener('swUpdate', handleSwUpdate);
    window.addEventListener('appOffline', handleOffline);
    window.addEventListener('appOnline', handleOnline);

    return () => {
      window.removeEventListener('swInstalled', handleSwInstalled);
      window.removeEventListener('swUpdate', handleSwUpdate);
      window.removeEventListener('appOffline', handleOffline);
      window.removeEventListener('appOnline', handleOnline);
    };
  }, []);

  const updateApp = () => {
    const swManager = ServiceWorkerManager.getInstance();
    swManager.skipWaiting();
  };

  const getCacheStatus = async () => {
    const swManager = ServiceWorkerManager.getInstance();
    return await swManager.getCacheStatus();
  };

  return {
    isInstalled,
    isUpdateAvailable,
    isOffline,
    updateApp,
    getCacheStatus,
    isSupported: ServiceWorkerManager.isSupported(),
    isStandalone: ServiceWorkerManager.isStandalone(),
  };
}

// Export singleton instance
export const serviceWorkerManager = ServiceWorkerManager.getInstance();

// Auto-initialize in browser
if (typeof window !== 'undefined') {
  serviceWorkerManager.init();
}

// React imports (if not already available)
const React = require('react');
const { useState, useEffect } = React;