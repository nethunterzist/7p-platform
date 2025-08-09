import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-corporate-accent focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Primary corporate button with gradient
        primary: "bg-gradient-card text-white shadow hover:bg-gradient-hover focus:ring-corporate-accent",
        
        // Professional corporate button
        corporate: "bg-corporate-primary text-white shadow-sm hover:bg-corporate-deep focus:ring-corporate-accent",
        
        // Secondary outline button
        secondary: "border border-corporate-primary text-corporate-primary bg-transparent hover:bg-corporate-primary hover:text-white focus:ring-corporate-accent",
        
        // Destructive actions
        destructive: "bg-error text-white shadow-sm hover:bg-red-600 focus:ring-red-500",
        
        // Outline variant
        outline: "border border-gray-300 bg-transparent text-gray-700 shadow-sm hover:bg-gray-50 hover:text-gray-900 focus:ring-corporate-accent",
        
        // Ghost variant for minimal appearance
        ghost: "text-corporate-primary hover:bg-corporate-100 hover:text-corporate-deep focus:ring-corporate-accent",
        
        // Link style button
        link: "text-corporate-primary underline-offset-4 hover:underline focus:ring-corporate-accent",
        
        // Success variant
        success: "bg-success text-white shadow-sm hover:bg-green-600 focus:ring-green-500",
        
        // Warning variant
        warning: "bg-warning text-white shadow-sm hover:bg-amber-600 focus:ring-amber-500",
      },
      size: {
        sm: "h-8 rounded-md px-3 text-xs",
        default: "h-9 px-4 py-2",
        lg: "h-10 rounded-md px-8",
        xl: "h-12 rounded-lg px-10 text-base",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, leftIcon, rightIcon, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <div className="flex items-center gap-2">
            <svg
              className="animate-spin -ml-1 mr-2 h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            {children}
          </div>
        ) : (
          <>
            {leftIcon && <span className="mr-1">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="ml-1">{rightIcon}</span>}
          </>
        )}
      </Comp>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }