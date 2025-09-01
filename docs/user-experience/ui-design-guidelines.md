# 🎨 UI Design Guidelines - Kullanıcı Arayüzü Tasarım Rehberi

## 🎯 Tasarım Felsefesi

7P Education platformu için modern, erişilebilir ve kullanıcı dostu arayüz tasarım prensipleri.

## 🎨 Visual Design System

### Color Palette
```css
/* Primary Colors */
--primary-50: #eff6ff;
--primary-100: #dbeafe;
--primary-500: #3b82f6;
--primary-600: #2563eb;
--primary-900: #1e3a8a;

/* Secondary Colors */
--secondary-50: #f0fdf4;
--secondary-500: #22c55e;
--secondary-600: #16a34a;

/* Neutral Colors */
--gray-50: #f9fafb;
--gray-100: #f3f4f6;
--gray-500: #6b7280;
--gray-700: #374151;
--gray-900: #111827;

/* Status Colors */
--success: #10b981;
--warning: #f59e0b;
--error: #ef4444;
--info: #3b82f6;
```

### Typography System
```css
/* Font Families */
--font-primary: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
--font-mono: 'JetBrains Mono', 'Monaco', 'Consolas', monospace;

/* Font Sizes */
--text-xs: 0.75rem;    /* 12px */
--text-sm: 0.875rem;   /* 14px */
--text-base: 1rem;     /* 16px */
--text-lg: 1.125rem;   /* 18px */
--text-xl: 1.25rem;    /* 20px */
--text-2xl: 1.5rem;    /* 24px */
--text-3xl: 1.875rem;  /* 30px */
--text-4xl: 2.25rem;   /* 36px */

/* Font Weights */
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
```

### Spacing System
```css
/* Spacing Scale (8px base) */
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-3: 0.75rem;   /* 12px */
--space-4: 1rem;      /* 16px */
--space-6: 1.5rem;    /* 24px */
--space-8: 2rem;      /* 32px */
--space-12: 3rem;     /* 48px */
--space-16: 4rem;     /* 64px */

/* Component Spacing */
--section-padding: var(--space-8);
--card-padding: var(--space-6);
--button-padding: var(--space-3) var(--space-6);
```

## 📱 Responsive Design Principles

### Breakpoint System
```css
/* Mobile First Approach */
@media (min-width: 640px) { /* sm */ }
@media (min-width: 768px) { /* md */ }
@media (min-width: 1024px) { /* lg */ }
@media (min-width: 1280px) { /* xl */ }
@media (min-width: 1536px) { /* 2xl */ }
```

### Grid System
```css
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
}

.grid {
  display: grid;
  gap: var(--space-6);
}

.grid-cols-1 { grid-template-columns: repeat(1, minmax(0, 1fr)); }
.grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.grid-cols-12 { grid-template-columns: repeat(12, minmax(0, 1fr)); }

/* Responsive Grid */
@media (min-width: 768px) {
  .md\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .md\:grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}
```

## 🧩 Component Guidelines

### Button Components
```css
.button {
  padding: var(--button-padding);
  border-radius: 0.5rem;
  font-weight: var(--font-medium);
  transition: all 0.2s ease-in-out;
  cursor: pointer;
  border: none;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
}

/* Button Variants */
.button-primary {
  background-color: var(--primary-600);
  color: white;
}

.button-primary:hover {
  background-color: var(--primary-700);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
}

.button-secondary {
  background-color: transparent;
  color: var(--primary-600);
  border: 1px solid var(--primary-600);
}

.button-ghost {
  background-color: transparent;
  color: var(--gray-700);
}

/* Button Sizes */
.button-sm { padding: var(--space-2) var(--space-4); font-size: var(--text-sm); }
.button-md { padding: var(--space-3) var(--space-6); font-size: var(--text-base); }
.button-lg { padding: var(--space-4) var(--space-8); font-size: var(--text-lg); }
```

### Card Components
```css
.card {
  background: white;
  border-radius: 0.75rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border: 1px solid var(--gray-200);
  overflow: hidden;
  transition: all 0.3s ease;
}

.card:hover {
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
  transform: translateY(-2px);
}

.card-header {
  padding: var(--space-6);
  border-bottom: 1px solid var(--gray-100);
}

.card-body {
  padding: var(--space-6);
}

.card-footer {
  padding: var(--space-6);
  background: var(--gray-50);
  border-top: 1px solid var(--gray-100);
}
```

### Form Components
```css
.form-group {
  margin-bottom: var(--space-6);
}

.label {
  display: block;
  font-weight: var(--font-medium);
  color: var(--gray-700);
  margin-bottom: var(--space-2);
  font-size: var(--text-sm);
}

.input {
  width: 100%;
  padding: var(--space-3) var(--space-4);
  border: 1px solid var(--gray-300);
  border-radius: 0.5rem;
  font-size: var(--text-base);
  transition: all 0.2s ease;
  background: white;
}

.input:focus {
  outline: none;
  border-color: var(--primary-500);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.input:invalid {
  border-color: var(--error);
}

.error-message {
  color: var(--error);
  font-size: var(--text-sm);
  margin-top: var(--space-1);
}
```

## 🎭 Animation & Transitions

### Animation Guidelines
```css
/* Standard Transitions */
.transition-smooth { transition: all 0.3s ease; }
.transition-quick { transition: all 0.15s ease; }
.transition-slow { transition: all 0.5s ease; }

/* Hover Effects */
.hover-lift:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.hover-scale:hover {
  transform: scale(1.02);
}

/* Loading Animations */
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
.spin { animation: spin 1s linear infinite; }

/* Page Transitions */
.page-enter {
  opacity: 0;
  transform: translateX(20px);
}

.page-enter-active {
  opacity: 1;
  transform: translateX(0);
  transition: all 0.3s ease;
}
```

## 📐 Layout Patterns

### Header Layout
```css
.header {
  position: sticky;
  top: 0;
  z-index: 50;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid var(--gray-200);
}

.navbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4) var(--space-6);
  max-width: 1200px;
  margin: 0 auto;
}

.nav-links {
  display: flex;
  align-items: center;
  gap: var(--space-6);
}

@media (max-width: 768px) {
  .nav-links {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: white;
    flex-direction: column;
    padding: var(--space-4);
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    transform: translateY(-100%);
    opacity: 0;
    visibility: hidden;
    transition: all 0.3s ease;
  }
  
  .nav-links.open {
    transform: translateY(0);
    opacity: 1;
    visibility: visible;
  }
}
```

### Course Card Layout
```css
.course-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: var(--space-6);
  padding: var(--space-6);
}

.course-card {
  background: white;
  border-radius: 0.75rem;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.course-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}

.course-thumbnail {
  position: relative;
  aspect-ratio: 16/9;
  overflow: hidden;
  background: var(--gray-200);
}

.course-info {
  padding: var(--space-4);
}

.course-title {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  color: var(--gray-900);
  margin-bottom: var(--space-2);
  line-height: 1.4;
}

.course-meta {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  color: var(--gray-600);
  font-size: var(--text-sm);
  margin-bottom: var(--space-3);
}
```

## 🌐 Dark Mode Support

### Dark Mode Variables
```css
/* Light Mode (default) */
:root {
  --bg-primary: white;
  --bg-secondary: var(--gray-50);
  --text-primary: var(--gray-900);
  --text-secondary: var(--gray-600);
  --border-color: var(--gray-200);
}

/* Dark Mode */
@media (prefers-color-scheme: dark) {
  :root {
    --bg-primary: var(--gray-900);
    --bg-secondary: var(--gray-800);
    --text-primary: var(--gray-50);
    --text-secondary: var(--gray-300);
    --border-color: var(--gray-700);
  }
}

[data-theme="dark"] {
  --bg-primary: var(--gray-900);
  --bg-secondary: var(--gray-800);
  --text-primary: var(--gray-50);
  --text-secondary: var(--gray-300);
  --border-color: var(--gray-700);
}
```

## ♿ Accessibility Guidelines

### Focus Management
```css
/* Focus Indicators */
.focusable:focus {
  outline: 2px solid var(--primary-500);
  outline-offset: 2px;
}

/* Skip to content link */
.skip-to-content {
  position: absolute;
  top: -40px;
  left: 6px;
  background: var(--primary-600);
  color: white;
  padding: 8px;
  border-radius: 4px;
  text-decoration: none;
  transition: top 0.3s ease;
}

.skip-to-content:focus {
  top: 6px;
}

/* Screen reader only content */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
}
```

### Semantic HTML Guidelines
```html
<!-- Course Cards -->
<article class="course-card" role="article">
  <img src="..." alt="Course thumbnail: JavaScript Fundamentals" />
  <div class="course-info">
    <h2 class="course-title">JavaScript Fundamentals</h2>
    <p class="course-description">Learn JavaScript from scratch...</p>
    <div class="course-meta">
      <span aria-label="Duration">2 hours</span>
      <span aria-label="Difficulty">Beginner</span>
      <span aria-label="Rating">4.8 stars</span>
    </div>
    <button 
      aria-label="Enroll in JavaScript Fundamentals course"
      class="button button-primary"
    >
      Enroll Now
    </button>
  </div>
</article>

<!-- Navigation -->
<nav role="navigation" aria-label="Main navigation">
  <ul class="nav-links">
    <li><a href="/courses" aria-current="page">Courses</a></li>
    <li><a href="/dashboard">Dashboard</a></li>
    <li><a href="/profile">Profile</a></li>
  </ul>
</nav>

<!-- Form Elements -->
<form role="form" aria-labelledby="login-title">
  <h2 id="login-title">Login to Your Account</h2>
  <div class="form-group">
    <label for="email">Email Address</label>
    <input 
      type="email" 
      id="email" 
      name="email"
      required
      aria-describedby="email-error"
      autocomplete="email"
    />
    <div id="email-error" class="error-message" role="alert"></div>
  </div>
</form>
```

---

*Bu dokümantasyon, 7P Education platformunun UI/UX tasarım standartlarını ve erişilebilirlik gereksinimlerini kapsamaktadır.*