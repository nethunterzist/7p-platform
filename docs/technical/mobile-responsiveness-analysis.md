# Mobile Responsiveness Analysis - 7P Education Platform

## 📋 Özet

7P Education Platform'un mobile responsiveness analizi, modern mobile-first yaklaşımı benimseyen, tüm cihaz türlerinde optimal kullanıcı deneyimi sağlayan responsive design stratejilerini kapsar. Bu dokümantasyon, Tailwind CSS, React 19, ve Next.js 15 kullanarak adaptive UI components, touch-first interactions, ve performance-optimized mobile experiences'i detaylandırır.

## 🎯 Amaç ve Kapsam

Bu dokümantasyonun amaçları:
- Mobile-first responsive design methodology implementation
- Cross-device compatibility ve testing strategies
- Touch interface optimization ve gesture support
- Performance optimization for mobile networks
- Progressive Web App (PWA) capabilities integration
- Accessibility compliance for mobile users
- Advanced layout strategies with CSS Grid ve Flexbox
- Mobile-specific UX patterns ve interaction designs
- Device-specific optimizations ve feature detection

## 🏗️ Mevcut Durum Analizi

### ✅ Aktif Responsive Bileşenleri
- **Tailwind CSS**: Utility-first responsive design system
- **Next.js Image**: Responsive image optimization
- **React 19**: Server Component responsive rendering
- **CSS Grid & Flexbox**: Modern layout techniques
- **Viewport Meta Tag**: Proper mobile viewport configuration

### ⚠️ Geliştirilmesi Gereken Alanlar
- Advanced breakpoint management system
- Touch gesture recognition ve haptic feedback
- Offline-first mobile experience
- Device-specific feature detection
- Mobile performance optimization
- Advanced responsive typography
- Mobile-optimized video player

## 🔧 Teknik Detaylar

### 📱 Mobile-First Design System

#### 1. Advanced Breakpoint Management
```typescript
// lib/responsive/breakpoints.ts
export const breakpoints = {
  xs: '320px',   // Small phones
  sm: '375px',   // Standard phones
  md: '768px',   // Tablets portrait
  lg: '1024px',  // Tablets landscape / Small laptops
  xl: '1280px',  // Desktop
  '2xl': '1536px', // Large desktop
  '3xl': '1920px', // Ultra-wide
} as const

export type Breakpoint = keyof typeof breakpoints

// Advanced responsive utilities
export interface ResponsiveValue<T> {
  xs?: T
  sm?: T
  md?: T
  lg?: T
  xl?: T
  '2xl'?: T
  '3xl'?: T
}

export class ResponsiveManager {
  private currentBreakpoint: Breakpoint = 'sm'
  private listeners: Array<(breakpoint: Breakpoint) => void> = []

  constructor() {
    if (typeof window !== 'undefined') {
      this.initializeBreakpointDetection()
    }
  }

  private initializeBreakpointDetection() {
    // Create media query listeners for each breakpoint
    Object.entries(breakpoints).forEach(([bp, width]) => {
      const mediaQuery = window.matchMedia(`(min-width: ${width})`)
      
      mediaQuery.addEventListener('change', () => {
        this.updateCurrentBreakpoint()
      })
    })

    // Initial detection
    this.updateCurrentBreakpoint()
  }

  private updateCurrentBreakpoint() {
    const width = window.innerWidth
    let newBreakpoint: Breakpoint = 'xs'

    // Find the largest breakpoint that matches
    Object.entries(breakpoints).forEach(([bp, minWidth]) => {
      if (width >= parseInt(minWidth)) {
        newBreakpoint = bp as Breakpoint
      }
    })

    if (newBreakpoint !== this.currentBreakpoint) {
      this.currentBreakpoint = newBreakpoint
      this.notifyListeners(newBreakpoint)
    }
  }

  private notifyListeners(breakpoint: Breakpoint) {
    this.listeners.forEach(listener => listener(breakpoint))
  }

  getCurrentBreakpoint(): Breakpoint {
    return this.currentBreakpoint
  }

  onBreakpointChange(callback: (breakpoint: Breakpoint) => void): () => void {
    this.listeners.push(callback)
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(callback)
      if (index > -1) {
        this.listeners.splice(index, 1)
      }
    }
  }

  // Utility methods
  isMobile(): boolean {
    return ['xs', 'sm'].includes(this.currentBreakpoint)
  }

  isTablet(): boolean {
    return ['md'].includes(this.currentBreakpoint)
  }

  isDesktop(): boolean {
    return ['lg', 'xl', '2xl', '3xl'].includes(this.currentBreakpoint)
  }

  // Get responsive value based on current breakpoint
  getResponsiveValue<T>(responsiveValue: ResponsiveValue<T>, fallback: T): T {
    const breakpointOrder: Breakpoint[] = ['3xl', '2xl', 'xl', 'lg', 'md', 'sm', 'xs']
    const currentIndex = breakpointOrder.indexOf(this.currentBreakpoint)

    // Look for the best matching value, starting from current breakpoint and going down
    for (let i = currentIndex; i < breakpointOrder.length; i++) {
      const bp = breakpointOrder[i]
      if (responsiveValue[bp] !== undefined) {
        return responsiveValue[bp] as T
      }
    }

    return fallback
  }
}

export const responsiveManager = new ResponsiveManager()

// React hook for responsive values
export function useResponsive() {
  const [currentBreakpoint, setCurrentBreakpoint] = useState<Breakpoint>('sm')

  useEffect(() => {
    setCurrentBreakpoint(responsiveManager.getCurrentBreakpoint())
    
    return responsiveManager.onBreakpointChange((breakpoint) => {
      setCurrentBreakpoint(breakpoint)
    })
  }, [])

  return {
    currentBreakpoint,
    isMobile: responsiveManager.isMobile(),
    isTablet: responsiveManager.isTablet(),
    isDesktop: responsiveManager.isDesktop(),
    getResponsiveValue: <T>(value: ResponsiveValue<T>, fallback: T) => 
      responsiveManager.getResponsiveValue(value, fallback)
  }
}
```

#### 2. Responsive Component Architecture
```typescript
// components/responsive/ResponsiveContainer.tsx
import React from 'react'
import { cn } from '@/lib/utils'
import type { ResponsiveValue } from '@/lib/responsive/breakpoints'

interface ResponsiveContainerProps {
  children: React.ReactNode
  className?: string
  padding?: ResponsiveValue<string>
  margin?: ResponsiveValue<string>
  maxWidth?: ResponsiveValue<string>
  columns?: ResponsiveValue<number>
  gap?: ResponsiveValue<string>
  direction?: ResponsiveValue<'row' | 'column'>
  align?: ResponsiveValue<'start' | 'center' | 'end' | 'stretch'>
  justify?: ResponsiveValue<'start' | 'center' | 'end' | 'between' | 'around' | 'evenly'>
}

export function ResponsiveContainer({
  children,
  className,
  padding,
  margin,
  maxWidth,
  columns,
  gap,
  direction,
  align,
  justify,
}: ResponsiveContainerProps) {
  const { getResponsiveValue } = useResponsive()

  // Generate responsive classes
  const responsiveClasses = useMemo(() => {
    const classes: string[] = []

    // Padding
    if (padding) {
      const paddingValue = getResponsiveValue(padding, 'p-4')
      classes.push(paddingValue)
    }

    // Margin
    if (margin) {
      const marginValue = getResponsiveValue(margin, 'm-0')
      classes.push(marginValue)
    }

    // Max width
    if (maxWidth) {
      const maxWidthValue = getResponsiveValue(maxWidth, 'max-w-full')
      classes.push(maxWidthValue)
    }

    // Grid columns
    if (columns) {
      const columnsValue = getResponsiveValue(columns, 1)
      classes.push(`grid-cols-${columnsValue}`)
    }

    // Gap
    if (gap) {
      const gapValue = getResponsiveValue(gap, 'gap-4')
      classes.push(gapValue)
    }

    // Direction
    if (direction) {
      const directionValue = getResponsiveValue(direction, 'row')
      classes.push(`flex-${directionValue}`)
    }

    // Align
    if (align) {
      const alignValue = getResponsiveValue(align, 'start')
      const alignClass = {
        start: 'items-start',
        center: 'items-center',
        end: 'items-end',
        stretch: 'items-stretch'
      }[alignValue]
      classes.push(alignClass)
    }

    // Justify
    if (justify) {
      const justifyValue = getResponsiveValue(justify, 'start')
      const justifyClass = {
        start: 'justify-start',
        center: 'justify-center',
        end: 'justify-end',
        between: 'justify-between',
        around: 'justify-around',
        evenly: 'justify-evenly'
      }[justifyValue]
      classes.push(justifyClass)
    }

    return classes.join(' ')
  }, [padding, margin, maxWidth, columns, gap, direction, align, justify, getResponsiveValue])

  const containerClasses = cn(
    'w-full',
    columns ? 'grid' : 'flex',
    responsiveClasses,
    className
  )

  return (
    <div className={containerClasses}>
      {children}
    </div>
  )
}

// Responsive Grid Component
interface ResponsiveGridProps {
  children: React.ReactNode
  className?: string
  columns: ResponsiveValue<number>
  gap?: ResponsiveValue<string>
  autoRows?: string
  template?: ResponsiveValue<string>
}

export function ResponsiveGrid({
  children,
  className,
  columns,
  gap,
  autoRows = 'auto',
  template,
}: ResponsiveGridProps) {
  const { getResponsiveValue } = useResponsive()

  const gridClasses = useMemo(() => {
    const classes: string[] = ['grid']

    // Columns
    const columnsValue = getResponsiveValue(columns, 1)
    classes.push(`grid-cols-${columnsValue}`)

    // Gap
    if (gap) {
      const gapValue = getResponsiveValue(gap, 'gap-4')
      classes.push(gapValue)
    }

    // Auto rows
    if (autoRows !== 'auto') {
      classes.push(`grid-rows-[${autoRows}]`)
    }

    // Template
    if (template) {
      const templateValue = getResponsiveValue(template, '')
      if (templateValue) {
        classes.push(`grid-cols-[${templateValue}]`)
      }
    }

    return classes.join(' ')
  }, [columns, gap, autoRows, template, getResponsiveValue])

  return (
    <div className={cn(gridClasses, className)}>
      {children}
    </div>
  )
}

// Responsive Text Component
interface ResponsiveTextProps {
  children: React.ReactNode
  className?: string
  size?: ResponsiveValue<'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl'>
  weight?: ResponsiveValue<'normal' | 'medium' | 'semibold' | 'bold'>
  color?: ResponsiveValue<string>
  align?: ResponsiveValue<'left' | 'center' | 'right' | 'justify'>
  lineHeight?: ResponsiveValue<'tight' | 'normal' | 'relaxed' | 'loose'>
}

export function ResponsiveText({
  children,
  className,
  size,
  weight,
  color,
  align,
  lineHeight,
}: ResponsiveTextProps) {
  const { getResponsiveValue } = useResponsive()

  const textClasses = useMemo(() => {
    const classes: string[] = []

    // Size
    if (size) {
      const sizeValue = getResponsiveValue(size, 'base')
      classes.push(`text-${sizeValue}`)
    }

    // Weight
    if (weight) {
      const weightValue = getResponsiveValue(weight, 'normal')
      classes.push(`font-${weightValue}`)
    }

    // Color
    if (color) {
      const colorValue = getResponsiveValue(color, 'text-gray-900')
      classes.push(colorValue)
    }

    // Align
    if (align) {
      const alignValue = getResponsiveValue(align, 'left')
      classes.push(`text-${alignValue}`)
    }

    // Line height
    if (lineHeight) {
      const lineHeightValue = getResponsiveValue(lineHeight, 'normal')
      classes.push(`leading-${lineHeightValue}`)
    }

    return classes.join(' ')
  }, [size, weight, color, align, lineHeight, getResponsiveValue])

  return (
    <span className={cn(textClasses, className)}>
      {children}
    </span>
  )
}
```

#### 3. Touch-First Interaction System
```typescript
// lib/touch/gesture-handler.ts
export type GestureType = 'tap' | 'double-tap' | 'long-press' | 'swipe' | 'pinch' | 'rotate'

export interface GestureEvent {
  type: GestureType
  target: HTMLElement
  touches: Touch[]
  deltaX?: number
  deltaY?: number
  distance?: number
  angle?: number
  scale?: number
  duration: number
}

export interface GestureConfig {
  tapThreshold: number      // ms
  doubleTapThreshold: number // ms between taps
  longPressThreshold: number // ms
  swipeThreshold: number    // pixels
  pinchThreshold: number    // scale difference
  rotateThreshold: number   // degrees
}

class GestureRecognizer {
  private config: GestureConfig = {
    tapThreshold: 200,
    doubleTapThreshold: 300,
    longPressThreshold: 500,
    swipeThreshold: 50,
    pinchThreshold: 0.1,
    rotateThreshold: 15,
  }

  private touchStartTime = 0
  private lastTapTime = 0
  private initialTouches: Touch[] = []
  private initialDistance = 0
  private initialAngle = 0
  private longPressTimer?: NodeJS.Timeout

  constructor(private element: HTMLElement, config?: Partial<GestureConfig>) {
    if (config) {
      this.config = { ...this.config, ...config }
    }
    this.setupEventListeners()
  }

  private setupEventListeners() {
    this.element.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false })
    this.element.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false })
    this.element.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false })
    this.element.addEventListener('touchcancel', this.handleTouchCancel.bind(this))
  }

  private handleTouchStart(event: TouchEvent) {
    event.preventDefault()
    
    this.touchStartTime = Date.now()
    this.initialTouches = Array.from(event.touches)

    if (event.touches.length === 2) {
      this.initialDistance = this.getDistance(event.touches[0], event.touches[1])
      this.initialAngle = this.getAngle(event.touches[0], event.touches[1])
    }

    // Setup long press detection
    this.longPressTimer = setTimeout(() => {
      this.triggerGesture({
        type: 'long-press',
        target: this.element,
        touches: this.initialTouches,
        duration: Date.now() - this.touchStartTime,
      })
    }, this.config.longPressThreshold)
  }

  private handleTouchMove(event: TouchEvent) {
    event.preventDefault()

    // Clear long press timer on move
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer)
      this.longPressTimer = undefined
    }

    if (event.touches.length === 2) {
      this.handleMultiTouch(event)
    }
  }

  private handleTouchEnd(event: TouchEvent) {
    const duration = Date.now() - this.touchStartTime
    
    // Clear long press timer
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer)
      this.longPressTimer = undefined
    }

    if (event.changedTouches.length === 1 && this.initialTouches.length === 1) {
      this.handleSingleTouch(event.changedTouches[0], duration)
    }
  }

  private handleTouchCancel(event: TouchEvent) {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer)
      this.longPressTimer = undefined
    }
  }

  private handleSingleTouch(touch: Touch, duration: number) {
    const deltaX = touch.clientX - this.initialTouches[0].clientX
    const deltaY = touch.clientY - this.initialTouches[0].clientY
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)

    // Check for swipe gesture
    if (distance > this.config.swipeThreshold) {
      this.triggerGesture({
        type: 'swipe',
        target: this.element,
        touches: [touch],
        deltaX,
        deltaY,
        distance,
        duration,
      })
      return
    }

    // Check for tap gestures
    if (duration < this.config.tapThreshold) {
      const now = Date.now()
      const timeSinceLastTap = now - this.lastTapTime

      if (timeSinceLastTap < this.config.doubleTapThreshold) {
        this.triggerGesture({
          type: 'double-tap',
          target: this.element,
          touches: [touch],
          duration,
        })
      } else {
        this.triggerGesture({
          type: 'tap',
          target: this.element,
          touches: [touch],
          duration,
        })
      }

      this.lastTapTime = now
    }
  }

  private handleMultiTouch(event: TouchEvent) {
    if (event.touches.length !== 2) return

    const touch1 = event.touches[0]
    const touch2 = event.touches[1]
    
    const currentDistance = this.getDistance(touch1, touch2)
    const currentAngle = this.getAngle(touch1, touch2)
    
    const scaleChange = currentDistance / this.initialDistance
    const angleChange = Math.abs(currentAngle - this.initialAngle)

    // Check for pinch gesture
    if (Math.abs(scaleChange - 1) > this.config.pinchThreshold) {
      this.triggerGesture({
        type: 'pinch',
        target: this.element,
        touches: Array.from(event.touches),
        scale: scaleChange,
        duration: Date.now() - this.touchStartTime,
      })
    }

    // Check for rotate gesture
    if (angleChange > this.config.rotateThreshold) {
      this.triggerGesture({
        type: 'rotate',
        target: this.element,
        touches: Array.from(event.touches),
        angle: currentAngle - this.initialAngle,
        duration: Date.now() - this.touchStartTime,
      })
    }
  }

  private getDistance(touch1: Touch, touch2: Touch): number {
    const dx = touch1.clientX - touch2.clientX
    const dy = touch1.clientY - touch2.clientY
    return Math.sqrt(dx * dx + dy * dy)
  }

  private getAngle(touch1: Touch, touch2: Touch): number {
    const dx = touch1.clientX - touch2.clientX
    const dy = touch1.clientY - touch2.clientY
    return Math.atan2(dy, dx) * 180 / Math.PI
  }

  private triggerGesture(gesture: GestureEvent) {
    const customEvent = new CustomEvent(`gesture:${gesture.type}`, {
      detail: gesture,
      bubbles: true,
    })
    this.element.dispatchEvent(customEvent)
  }

  destroy() {
    this.element.removeEventListener('touchstart', this.handleTouchStart)
    this.element.removeEventListener('touchmove', this.handleTouchMove)
    this.element.removeEventListener('touchend', this.handleTouchEnd)
    this.element.removeEventListener('touchcancel', this.handleTouchCancel)
    
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer)
    }
  }
}

// React hook for gesture recognition
export function useGestures(
  config?: Partial<GestureConfig>,
  dependencies: any[] = []
) {
  const elementRef = useRef<HTMLElement>(null)
  const gestureRecognizer = useRef<GestureRecognizer>()

  useEffect(() => {
    if (elementRef.current) {
      gestureRecognizer.current = new GestureRecognizer(elementRef.current, config)
    }

    return () => {
      gestureRecognizer.current?.destroy()
    }
  }, dependencies)

  const addEventListener = useCallback((
    type: GestureType,
    handler: (event: CustomEvent<GestureEvent>) => void
  ) => {
    elementRef.current?.addEventListener(`gesture:${type}`, handler as EventListener)
    
    return () => {
      elementRef.current?.removeEventListener(`gesture:${type}`, handler as EventListener)
    }
  }, [])

  return { elementRef, addEventListener }
}

// Touch-optimized button component
interface TouchButtonProps {
  children: React.ReactNode
  onTap?: () => void
  onLongPress?: () => void
  onDoubleTap?: () => void
  className?: string
  hapticFeedback?: boolean
  size?: 'sm' | 'md' | 'lg'
  variant?: 'primary' | 'secondary' | 'ghost'
}

export function TouchButton({
  children,
  onTap,
  onLongPress,
  onDoubleTap,
  className,
  hapticFeedback = true,
  size = 'md',
  variant = 'primary',
}: TouchButtonProps) {
  const { elementRef, addEventListener } = useGestures({
    tapThreshold: 150,
    longPressThreshold: 400,
  })

  useEffect(() => {
    const unsubscribers: Array<() => void> = []

    if (onTap) {
      unsubscribers.push(addEventListener('tap', () => {
        if (hapticFeedback && 'vibrate' in navigator) {
          navigator.vibrate(10) // Light haptic feedback
        }
        onTap()
      }))
    }

    if (onLongPress) {
      unsubscribers.push(addEventListener('long-press', () => {
        if (hapticFeedback && 'vibrate' in navigator) {
          navigator.vibrate([10, 50, 10]) // Pattern for long press
        }
        onLongPress()
      }))
    }

    if (onDoubleTap) {
      unsubscribers.push(addEventListener('double-tap', () => {
        if (hapticFeedback && 'vibrate' in navigator) {
          navigator.vibrate([10, 25, 10]) // Pattern for double tap
        }
        onDoubleTap()
      }))
    }

    return () => {
      unsubscribers.forEach(unsub => unsub())
    }
  }, [onTap, onLongPress, onDoubleTap, hapticFeedback, addEventListener])

  const sizeClasses = {
    sm: 'min-h-[44px] px-3 py-2 text-sm',
    md: 'min-h-[48px] px-4 py-3 text-base',
    lg: 'min-h-[56px] px-6 py-4 text-lg',
  }

  const variantClasses = {
    primary: 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white',
    secondary: 'bg-gray-200 hover:bg-gray-300 active:bg-gray-400 text-gray-900',
    ghost: 'bg-transparent hover:bg-gray-100 active:bg-gray-200 text-gray-700',
  }

  return (
    <button
      ref={elementRef}
      className={cn(
        'rounded-lg font-medium transition-colors select-none touch-manipulation',
        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
      // Disable click to prevent double activation
      onClick={(e) => e.preventDefault()}
    >
      {children}
    </button>
  )
}
```

#### 4. Mobile Performance Optimization
```typescript
// lib/mobile/performance.ts
interface PerformanceConfig {
  enableLazyLoading: boolean
  enableImageOptimization: boolean
  enableResourceHints: boolean
  enableServiceWorker: boolean
  enableVirtualization: boolean
  enableCodeSplitting: boolean
}

class MobilePerformanceOptimizer {
  private config: PerformanceConfig = {
    enableLazyLoading: true,
    enableImageOptimization: true,
    enableResourceHints: true,
    enableServiceWorker: true,
    enableVirtualization: true,
    enableCodeSplitting: true,
  }

  private observer?: IntersectionObserver
  private connectionSpeed: 'slow-2g' | '2g' | '3g' | '4g' | 'unknown' = 'unknown'

  constructor(config?: Partial<PerformanceConfig>) {
    if (config) {
      this.config = { ...this.config, ...config }
    }
    this.initializeOptimizations()
  }

  private initializeOptimizations() {
    if (typeof window === 'undefined') return

    // Detect connection speed
    this.detectConnectionSpeed()

    // Initialize lazy loading
    if (this.config.enableLazyLoading) {
      this.initializeLazyLoading()
    }

    // Preload critical resources
    if (this.config.enableResourceHints) {
      this.preloadCriticalResources()
    }

    // Register service worker
    if (this.config.enableServiceWorker) {
      this.registerServiceWorker()
    }
  }

  private detectConnectionSpeed() {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection
      this.connectionSpeed = connection.effectiveType || 'unknown'
      
      // Adjust optimizations based on connection speed
      this.adjustForConnection()
    }
  }

  private adjustForConnection() {
    const isSlowConnection = ['slow-2g', '2g'].includes(this.connectionSpeed)
    
    if (isSlowConnection) {
      // Reduce image quality for slow connections
      document.documentElement.style.setProperty('--image-quality', '60')
      
      // Disable non-critical animations
      document.documentElement.classList.add('reduce-motion')
      
      // Increase lazy loading threshold
      if (this.observer) {
        this.observer.disconnect()
        this.initializeLazyLoading('50px')
      }
    }
  }

  private initializeLazyLoading(rootMargin = '100px') {
    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const target = entry.target as HTMLElement
          
          // Handle images
          if (target.tagName === 'IMG') {
            const img = target as HTMLImageElement
            if (img.dataset.src) {
              img.src = img.dataset.src
              img.removeAttribute('data-src')
            }
          }
          
          // Handle background images
          if (target.dataset.backgroundImage) {
            target.style.backgroundImage = `url(${target.dataset.backgroundImage})`
            target.removeAttribute('data-background-image')
          }
          
          // Handle video
          if (target.tagName === 'VIDEO') {
            const video = target as HTMLVideoElement
            if (video.dataset.src) {
              video.src = video.dataset.src
              video.removeAttribute('data-src')
            }
          }
          
          this.observer!.unobserve(target)
        }
      })
    }, {
      rootMargin,
      threshold: 0.1
    })

    // Observe existing lazy elements
    document.querySelectorAll('[data-src], [data-background-image]').forEach(el => {
      this.observer!.observe(el)
    })
  }

  private preloadCriticalResources() {
    // Preload critical CSS
    const criticalStyles = [
      '/styles/critical.css',
      '/styles/above-fold.css'
    ]

    criticalStyles.forEach(href => {
      const link = document.createElement('link')
      link.rel = 'preload'
      link.as = 'style'
      link.href = href
      document.head.appendChild(link)
    })

    // Preconnect to external domains
    const externalDomains = [
      'https://fonts.googleapis.com',
      'https://fonts.gstatic.com',
      'https://api.stripe.com'
    ]

    externalDomains.forEach(domain => {
      const link = document.createElement('link')
      link.rel = 'preconnect'
      link.href = domain
      link.crossOrigin = 'anonymous'
      document.head.appendChild(link)
    })

    // Prefetch likely next pages
    const prefetchUrls = [
      '/courses',
      '/profile',
      '/dashboard'
    ]

    // Only prefetch on fast connections
    if (!['slow-2g', '2g'].includes(this.connectionSpeed)) {
      prefetchUrls.forEach(url => {
        const link = document.createElement('link')
        link.rel = 'prefetch'
        link.href = url
        document.head.appendChild(link)
      })
    }
  }

  private async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js')
        console.log('Service Worker registered:', registration)
        
        // Listen for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New content available, refresh recommended
                this.showUpdateNotification()
              }
            })
          }
        })
      } catch (error) {
        console.error('Service Worker registration failed:', error)
      }
    }
  }

  private showUpdateNotification() {
    // Show update notification to user
    const notification = document.createElement('div')
    notification.className = 'fixed top-4 right-4 bg-blue-600 text-white p-4 rounded-lg shadow-lg z-50'
    notification.innerHTML = `
      <p class="mb-2">New version available!</p>
      <button onclick="window.location.reload()" class="bg-white text-blue-600 px-3 py-1 rounded text-sm">
        Update Now
      </button>
    `
    document.body.appendChild(notification)

    setTimeout(() => {
      notification.remove()
    }, 10000)
  }

  // Optimize images based on device capabilities
  optimizeImageLoading(img: HTMLImageElement) {
    const devicePixelRatio = window.devicePixelRatio || 1
    const isRetina = devicePixelRatio > 1
    const isSlowConnection = ['slow-2g', '2g'].includes(this.connectionSpeed)

    // Adjust image quality based on conditions
    let quality = 85
    if (isSlowConnection) quality = 60
    if (!isRetina) quality = 75

    // Generate optimized image URL
    const optimizedUrl = this.generateOptimizedImageUrl(img.src, {
      width: img.width * devicePixelRatio,
      height: img.height * devicePixelRatio,
      quality,
      format: this.getSupportedImageFormat()
    })

    img.src = optimizedUrl
  }

  private getSupportedImageFormat(): 'webp' | 'avif' | 'jpeg' {
    // Check for AVIF support
    const avifSupport = document.createElement('canvas').toDataURL('image/avif').indexOf('avif') > -1
    if (avifSupport) return 'avif'

    // Check for WebP support
    const webpSupport = document.createElement('canvas').toDataURL('image/webp').indexOf('webp') > -1
    if (webpSupport) return 'webp'

    return 'jpeg'
  }

  private generateOptimizedImageUrl(originalUrl: string, options: {
    width: number
    height: number
    quality: number
    format: string
  }): string {
    const { width, height, quality, format } = options
    
    // This would integrate with your CDN's image optimization service
    return `/api/images/optimize?url=${encodeURIComponent(originalUrl)}&w=${width}&h=${height}&q=${quality}&f=${format}`
  }

  // Memory management for mobile devices
  cleanupUnusedResources() {
    // Remove images that are far from viewport
    const images = document.querySelectorAll('img')
    const viewportHeight = window.innerHeight
    
    images.forEach(img => {
      const rect = img.getBoundingClientRect()
      const distanceFromViewport = Math.abs(rect.top - viewportHeight / 2)
      
      // If image is very far from viewport, unload it
      if (distanceFromViewport > viewportHeight * 3) {
        const placeholder = img.cloneNode(true) as HTMLImageElement
        placeholder.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMSIgaGVpZ2h0PSIxIj48L3N2Zz4=' // 1x1 transparent SVG
        img.parentNode?.replaceChild(placeholder, img)
      }
    })

    // Force garbage collection if available
    if ('gc' in window && typeof (window as any).gc === 'function') {
      (window as any).gc()
    }
  }

  // Battery optimization
  optimizeForBatteryLevel() {
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        const handleBatteryChange = () => {
          const isLowBattery = battery.level < 0.2 && !battery.charging
          
          if (isLowBattery) {
            // Reduce animations
            document.documentElement.classList.add('reduce-motion')
            
            // Reduce update frequency
            this.reduceCPUUsage()
          } else {
            document.documentElement.classList.remove('reduce-motion')
          }
        }

        battery.addEventListener('levelchange', handleBatteryChange)
        battery.addEventListener('chargingchange', handleBatteryChange)
        handleBatteryChange()
      })
    }
  }

  private reduceCPUUsage() {
    // Throttle scroll events
    let ticking = false
    const throttledScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          // Handle scroll with reduced frequency
          ticking = false
        })
        ticking = true
      }
    }

    window.addEventListener('scroll', throttledScroll, { passive: true })
  }
}

export const mobileOptimizer = new MobilePerformanceOptimizer()

// React hook for mobile performance optimization
export function useMobileOptimization() {
  const [connectionSpeed, setConnectionSpeed] = useState<string>('unknown')
  const [batteryLevel, setBatteryLevel] = useState<number>(1)
  const [isLowPowerMode, setIsLowPowerMode] = useState(false)

  useEffect(() => {
    // Monitor connection changes
    if ('connection' in navigator) {
      const connection = (navigator as any).connection
      setConnectionSpeed(connection.effectiveType || 'unknown')
      
      const handleConnectionChange = () => {
        setConnectionSpeed(connection.effectiveType || 'unknown')
      }
      
      connection.addEventListener('change', handleConnectionChange)
      
      return () => {
        connection.removeEventListener('change', handleConnectionChange)
      }
    }
  }, [])

  useEffect(() => {
    // Monitor battery level
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        setBatteryLevel(battery.level)
        setIsLowPowerMode(battery.level < 0.2 && !battery.charging)
        
        const handleBatteryChange = () => {
          setBatteryLevel(battery.level)
          setIsLowPowerMode(battery.level < 0.2 && !battery.charging)
        }
        
        battery.addEventListener('levelchange', handleBatteryChange)
        battery.addEventListener('chargingchange', handleBatteryChange)
        
        return () => {
          battery.removeEventListener('levelchange', handleBatteryChange)
          battery.removeEventListener('chargingchange', handleBatteryChange)
        }
      })
    }
  }, [])

  return {
    connectionSpeed,
    batteryLevel,
    isLowPowerMode,
    isSlowConnection: ['slow-2g', '2g'].includes(connectionSpeed),
    shouldReduceAnimations: isLowPowerMode,
    shouldOptimizeImages: ['slow-2g', '2g', '3g'].includes(connectionSpeed),
  }
}
```

### 🔧 Advanced Responsive Testing

#### 5. Cross-Device Testing Framework
```typescript
// lib/testing/responsive-testing.ts
export interface DeviceProfile {
  name: string
  userAgent: string
  viewport: {
    width: number
    height: number
    devicePixelRatio: number
  }
  capabilities: {
    touch: boolean
    hover: boolean
    orientation: 'portrait' | 'landscape' | 'both'
  }
  network: {
    type: '2g' | '3g' | '4g' | '5g' | 'wifi'
    downlink: number // Mbps
    rtt: number // ms
  }
}

export const deviceProfiles: DeviceProfile[] = [
  {
    name: 'iPhone SE',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15',
    viewport: { width: 375, height: 667, devicePixelRatio: 2 },
    capabilities: { touch: true, hover: false, orientation: 'both' },
    network: { type: '4g', downlink: 10, rtt: 50 }
  },
  {
    name: 'iPhone 14 Pro Max',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
    viewport: { width: 428, height: 926, devicePixelRatio: 3 },
    capabilities: { touch: true, hover: false, orientation: 'both' },
    network: { type: '5g', downlink: 100, rtt: 20 }
  },
  {
    name: 'iPad Air',
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X) AppleWebKit/605.1.15',
    viewport: { width: 820, height: 1180, devicePixelRatio: 2 },
    capabilities: { touch: true, hover: false, orientation: 'both' },
    network: { type: 'wifi', downlink: 50, rtt: 25 }
  },
  {
    name: 'Samsung Galaxy S21',
    userAgent: 'Mozilla/5.0 (Linux; Android 11; SM-G991B) AppleWebKit/537.36',
    viewport: { width: 360, height: 800, devicePixelRatio: 3 },
    capabilities: { touch: true, hover: false, orientation: 'both' },
    network: { type: '5g', downlink: 80, rtt: 30 }
  },
  {
    name: 'Desktop 1920x1080',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    viewport: { width: 1920, height: 1080, devicePixelRatio: 1 },
    capabilities: { touch: false, hover: true, orientation: 'landscape' },
    network: { type: 'wifi', downlink: 100, rtt: 15 }
  }
]

class ResponsiveTestRunner {
  async runTestSuite(tests: ResponsiveTest[]): Promise<TestResult[]> {
    const results: TestResult[] = []

    for (const test of tests) {
      for (const device of deviceProfiles) {
        const result = await this.runTest(test, device)
        results.push(result)
      }
    }

    return results
  }

  private async runTest(test: ResponsiveTest, device: DeviceProfile): Promise<TestResult> {
    const startTime = Date.now()
    
    try {
      // Simulate device conditions
      await this.simulateDevice(device)
      
      // Run the test
      const passed = await test.execute(device)
      
      return {
        testName: test.name,
        deviceName: device.name,
        passed,
        duration: Date.now() - startTime,
        error: null,
        screenshots: await this.captureScreenshots(device),
        metrics: await this.collectMetrics()
      }
    } catch (error) {
      return {
        testName: test.name,
        deviceName: device.name,
        passed: false,
        duration: Date.now() - startTime,
        error: error.message,
        screenshots: [],
        metrics: null
      }
    }
  }

  private async simulateDevice(device: DeviceProfile) {
    // Simulate viewport
    if (typeof window !== 'undefined') {
      Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: device.viewport.width })
      Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: device.viewport.height })
      Object.defineProperty(window, 'devicePixelRatio', { writable: true, configurable: true, value: device.viewport.devicePixelRatio })
    }

    // Simulate network conditions
    if ('connection' in navigator) {
      Object.defineProperty(navigator, 'connection', {
        writable: true,
        configurable: true,
        value: {
          effectiveType: device.network.type === 'wifi' ? '4g' : device.network.type,
          downlink: device.network.downlink,
          rtt: device.network.rtt
        }
      })
    }

    // Simulate touch capabilities
    Object.defineProperty(navigator, 'maxTouchPoints', {
      writable: true,
      configurable: true,
      value: device.capabilities.touch ? 10 : 0
    })

    // Trigger resize event
    window.dispatchEvent(new Event('resize'))
  }

  private async captureScreenshots(device: DeviceProfile): Promise<string[]> {
    if (typeof window === 'undefined') return []

    try {
      // Use html2canvas or similar library to capture screenshots
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      
      canvas.width = device.viewport.width
      canvas.height = device.viewport.height
      
      // Capture current page state
      // This would require additional implementation with a screenshot library
      
      return [canvas.toDataURL()]
    } catch (error) {
      console.error('Screenshot capture failed:', error)
      return []
    }
  }

  private async collectMetrics(): Promise<PerformanceMetrics> {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
    const paint = performance.getEntriesByType('paint')
    
    return {
      loadTime: navigation.loadEventEnd - navigation.loadEventStart,
      domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
      firstPaint: paint.find(p => p.name === 'first-paint')?.startTime || 0,
      firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0,
      layoutShift: await this.measureCLS(),
      interactionDelay: await this.measureFID()
    }
  }

  private async measureCLS(): Promise<number> {
    return new Promise((resolve) => {
      let clsValue = 0
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            clsValue += (entry as any).value
          }
        }
        resolve(clsValue)
      }).observe({ type: 'layout-shift', buffered: true })
      
      setTimeout(() => resolve(clsValue), 1000)
    })
  }

  private async measureFID(): Promise<number> {
    return new Promise((resolve) => {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          resolve((entry as any).processingStart - entry.startTime)
        }
      }).observe({ type: 'first-input', buffered: true })
      
      setTimeout(() => resolve(0), 1000)
    })
  }
}

interface ResponsiveTest {
  name: string
  execute: (device: DeviceProfile) => Promise<boolean>
}

interface TestResult {
  testName: string
  deviceName: string
  passed: boolean
  duration: number
  error: string | null
  screenshots: string[]
  metrics: PerformanceMetrics | null
}

interface PerformanceMetrics {
  loadTime: number
  domContentLoaded: number
  firstPaint: number
  firstContentfulPaint: number
  layoutShift: number
  interactionDelay: number
}

// Example responsive tests
export const responsiveTests: ResponsiveTest[] = [
  {
    name: 'Navigation Menu Accessibility',
    execute: async (device) => {
      const nav = document.querySelector('[role="navigation"]')
      if (!nav) return false

      if (device.viewport.width < 768) {
        // Mobile: Check for hamburger menu
        const hamburger = nav.querySelector('[aria-label*="menu"]')
        return hamburger !== null && hamburger.getAttribute('aria-expanded') !== null
      } else {
        // Desktop: Check for horizontal navigation
        const navItems = nav.querySelectorAll('a, button')
        return navItems.length > 0
      }
    }
  },
  {
    name: 'Touch Target Sizes',
    execute: async (device) => {
      if (!device.capabilities.touch) return true // Skip for non-touch devices

      const interactiveElements = document.querySelectorAll('button, a, input, [role="button"]')
      const minSize = 44 // iOS/Android minimum touch target size

      for (const element of interactiveElements) {
        const rect = element.getBoundingClientRect()
        if (rect.width < minSize || rect.height < minSize) {
          return false
        }
      }

      return true
    }
  },
  {
    name: 'Responsive Images',
    execute: async (device) => {
      const images = document.querySelectorAll('img')
      
      for (const img of images) {
        // Check if image has responsive attributes
        const hasSrcset = img.hasAttribute('srcset')
        const hasSizes = img.hasAttribute('sizes')
        const isWithinContainer = img.offsetWidth <= img.parentElement!.offsetWidth

        if (!hasSrcset && !hasSizes && !isWithinContainer) {
          return false
        }
      }

      return true
    }
  },
  {
    name: 'Form Usability',
    execute: async (device) => {
      const forms = document.querySelectorAll('form')
      
      for (const form of forms) {
        const inputs = form.querySelectorAll('input, textarea, select')
        
        for (const input of inputs) {
          const label = form.querySelector(`label[for="${input.id}"]`)
          const rect = input.getBoundingClientRect()
          
          // Check minimum input height for mobile
          if (device.capabilities.touch && rect.height < 44) {
            return false
          }
          
          // Check for proper labeling
          if (!label && !input.getAttribute('aria-label')) {
            return false
          }
        }
      }

      return true
    }
  }
]

export const responsiveTestRunner = new ResponsiveTestRunner()
```

## 💡 Öneriler ve Best Practices

### 📱 Mobile-First Design Principles
- **Touch-First Interactions**: 44px minimum touch target sizes
- **Thumb-Friendly Navigation**: Bottom navigation for mobile apps
- **Readable Typography**: Minimum 16px font size on mobile
- **Fast Loading**: Critical resources under 1.5MB for mobile

### 🔧 Performance Optimization
- **Image Optimization**: Responsive images with srcset ve sizes attributes
- **Code Splitting**: Route-based ve component-based lazy loading
- **Resource Hints**: Preconnect, prefetch, ve preload directives
- **Service Worker**: Offline-first caching strategies

### 🧪 Testing Strategies
- **Device Matrix Testing**: Popular devices ve screen sizes
- **Performance Testing**: Core Web Vitals optimization
- **Accessibility Testing**: Touch navigation ve screen readers
- **Network Testing**: 2G, 3G, 4G, ve WiFi conditions

## 📊 Implementation Roadmap

### Phase 1: Foundation (1 week)
- [ ] Responsive breakpoint system implementation
- [ ] Touch-first component library
- [ ] Basic performance optimizations
- [ ] Cross-device testing setup

### Phase 2: Advanced Features (2 weeks)
- [ ] Gesture recognition system
- [ ] Advanced image optimization
- [ ] Battery ve network optimization
- [ ] PWA capabilities integration

### Phase 3: Testing & Optimization (1 week)
- [ ] Comprehensive responsive testing
- [ ] Performance benchmarking
- [ ] Accessibility compliance verification
- [ ] User experience optimization

### Phase 4: Monitoring & Analytics (1 week)
- [ ] Real User Monitoring setup
- [ ] Performance analytics dashboard
- [ ] A/B testing for mobile optimizations
- [ ] Continuous improvement processes

## 🔗 İlgili Dosyalar

- [PWA Implementation](./pwa-implementation.md) - Progressive Web App features
- [Performance Optimization](./performance-optimization.md) - General performance strategies
- [Touch Interface Design](../ux/touch-interface.md) - Touch-optimized UI patterns
- [Accessibility Compliance](../ux/accessibility-guidelines.md) - Mobile accessibility
- [Testing Strategies](./testing-strategy.md) - Comprehensive testing approach
- [Image Optimization](./cdn-performance-optimization.md) - CDN ve image optimization

## 📚 Kaynaklar

### 📖 Responsive Design
- [CSS Grid Layout Guide](https://css-tricks.com/snippets/css/complete-guide-grid/)
- [Flexbox Complete Guide](https://css-tricks.com/snippets/css/a-guide-to-flexbox/)
- [Responsive Web Design Basics](https://web.dev/responsive-web-design-basics/)

### 📱 Mobile Optimization
- [Mobile Performance Checklist](https://web.dev/mobile/)
- [Touch Design Guidelines](https://material.io/design/usability/accessibility.html)
- [PWA Best Practices](https://web.dev/pwa-checklist/)

### 🧪 Testing & Analytics
- [Core Web Vitals](https://web.dev/vitals/)
- [Mobile Testing Tools](https://developers.google.com/web/tools/)
- [Real User Monitoring](https://web.dev/user-centric-performance-metrics/)

---

*Son güncelleme: ${new Date().toLocaleDateString('tr-TR')}*
*Doküman versiyonu: 1.0.0*
*İnceleme durumu: ✅ Tamamlandı*