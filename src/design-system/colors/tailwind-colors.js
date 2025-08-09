// 7P Education Corporate Blue Gradient Color System
// Tailwind CSS Configuration Extension

const corporateColors = {
  // Primary Corporate Blue Palette
  corporate: {
    50: '#eff6ff',
    100: '#dbeafe', 
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
    950: '#172554',
    // Semantic naming for corporate use
    'deep': '#1e3a8a',      // Trust & Stability
    'primary': '#3b82f6',   // Primary Actions
    'accent': '#60a5fa',    // Highlights & Links
    'light': '#93c5fd',     // Backgrounds & Subtle Elements
    'pale': '#dbeafe',      // Very Subtle Backgrounds
  },

  // Supporting Corporate Colors
  success: {
    50: '#ecfdf5',
    100: '#d1fae5',
    200: '#a7f3d0',
    300: '#6ee7b7',
    400: '#34d399',
    500: '#10b981',
    600: '#059669',
    700: '#047857',
    800: '#065f46',
    900: '#064e3b',
  },
  
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
  },
  
  error: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
  },
};

// Corporate Gradient Definitions for Tailwind
const corporateGradients = {
  'hero': 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
  'card': 'linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)',
  'accent': 'linear-gradient(135deg, #60a5fa 0%, #93c5fd 100%)',
  'subtle': 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
  'hover': 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 60%, #60a5fa 100%)',
  'overlay-dark': 'linear-gradient(135deg, rgba(30, 58, 138, 0.9) 0%, rgba(59, 130, 246, 0.8) 100%)',
  'overlay-light': 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(96, 165, 250, 0.05) 100%)',
};

// Corporate Shadow System
const corporateShadows = {
  'corporate-sm': '0 1px 2px 0 rgba(30, 58, 138, 0.05)',
  'corporate': '0 1px 3px 0 rgba(30, 58, 138, 0.1), 0 1px 2px 0 rgba(30, 58, 138, 0.06)',
  'corporate-md': '0 4px 6px -1px rgba(30, 58, 138, 0.1), 0 2px 4px -1px rgba(30, 58, 138, 0.06)',
  'corporate-lg': '0 10px 15px -3px rgba(30, 58, 138, 0.1), 0 4px 6px -2px rgba(30, 58, 138, 0.05)',
  'corporate-xl': '0 20px 25px -5px rgba(30, 58, 138, 0.1), 0 10px 10px -5px rgba(30, 58, 138, 0.04)',
  'corporate-2xl': '0 25px 50px -12px rgba(30, 58, 138, 0.25)',
};

// Animation and Transition Definitions
const corporateAnimations = {
  'gradient-shift': 'gradient-shift 3s ease infinite',
  'card-hover': 'card-hover 0.3s ease-out',
  'button-press': 'button-press 0.1s ease-out',
  'fade-in-up': 'fade-in-up 0.6s ease-out',
};

const corporateKeyframes = {
  'gradient-shift': {
    '0%, 100%': {
      'background-position': '0% 50%'
    },
    '50%': {
      'background-position': '100% 50%'
    }
  },
  'card-hover': {
    '0%': {
      transform: 'translateY(0) scale(1)',
      'box-shadow': '0 1px 3px 0 rgba(30, 58, 138, 0.1), 0 1px 2px 0 rgba(30, 58, 138, 0.06)'
    },
    '100%': {
      transform: 'translateY(-2px) scale(1.02)',
      'box-shadow': '0 10px 15px -3px rgba(30, 58, 138, 0.1), 0 4px 6px -2px rgba(30, 58, 138, 0.05)'
    }
  },
  'button-press': {
    '0%': { transform: 'scale(1)' },
    '50%': { transform: 'scale(0.98)' },
    '100%': { transform: 'scale(1)' }
  },
  'fade-in-up': {
    '0%': {
      opacity: '0',
      transform: 'translateY(20px)'
    },
    '100%': {
      opacity: '1',
      transform: 'translateY(0)'
    }
  }
};

// Corporate Typography Scale
const corporateTypography = {
  fontFamily: {
    'corporate': ['Inter', 'system-ui', 'sans-serif'],
    'corporate-mono': ['JetBrains Mono', 'Monaco', 'Consolas', 'monospace'],
  },
  fontSize: {
    'corporate-xs': ['0.75rem', { lineHeight: '1rem' }],
    'corporate-sm': ['0.875rem', { lineHeight: '1.25rem' }],
    'corporate-base': ['1rem', { lineHeight: '1.5rem' }],
    'corporate-lg': ['1.125rem', { lineHeight: '1.75rem' }],
    'corporate-xl': ['1.25rem', { lineHeight: '1.75rem' }],
    'corporate-2xl': ['1.5rem', { lineHeight: '2rem' }],
    'corporate-3xl': ['1.875rem', { lineHeight: '2.25rem' }],
    'corporate-4xl': ['2.25rem', { lineHeight: '2.5rem' }],
    'corporate-5xl': ['3rem', { lineHeight: '1' }],
    'corporate-6xl': ['3.75rem', { lineHeight: '1' }],
  },
  letterSpacing: {
    'corporate-tight': '-0.025em',
    'corporate-normal': '0em',
    'corporate-wide': '0.025em',
  }
};

// Corporate Spacing System
const corporateSpacing = {
  'corporate-xs': '0.25rem',  // 4px
  'corporate-sm': '0.5rem',   // 8px
  'corporate-md': '1rem',     // 16px
  'corporate-lg': '1.5rem',   // 24px
  'corporate-xl': '2rem',     // 32px
  'corporate-2xl': '3rem',    // 48px
  'corporate-3xl': '4rem',    // 64px
};

// Export for Tailwind Configuration
module.exports = {
  corporateColors,
  corporateGradients,
  corporateShadows,
  corporateAnimations,
  corporateKeyframes,
  corporateTypography,
  corporateSpacing,
  
  // Tailwind Config Extension Object
  tailwindExtension: {
    colors: corporateColors,
    backgroundImage: corporateGradients,
    boxShadow: corporateShadows,
    animation: corporateAnimations,
    keyframes: corporateKeyframes,
    ...corporateTypography,
    spacing: {
      ...corporateSpacing,
    },
    borderRadius: {
      'corporate-sm': '0.25rem',
      'corporate': '0.5rem', 
      'corporate-md': '0.75rem',
      'corporate-lg': '1rem',
      'corporate-xl': '1.25rem',
    }
  }
};