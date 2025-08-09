import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const inputVariants = cva(
  "flex w-full rounded-md border transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        // Default corporate input
        default: "border-gray-300 bg-white px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-corporate-accent focus-visible:ring-offset-2 focus-visible:border-corporate-primary",
        
        // Filled variant with background
        filled: "border-transparent bg-gray-100 px-3 py-2 text-sm focus-visible:bg-white focus-visible:border-corporate-primary focus-visible:ring-2 focus-visible:ring-corporate-accent",
        
        // Outline variant with prominent border
        outline: "border-2 border-gray-300 bg-white px-3 py-2 text-sm focus-visible:border-corporate-primary focus-visible:ring-2 focus-visible:ring-corporate-accent/20",
        
        // Ghost variant with minimal styling
        ghost: "border-transparent bg-transparent px-3 py-2 text-sm focus-visible:border-gray-300 focus-visible:bg-gray-50",
        
        // Error state
        error: "border-error bg-white px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-error focus-visible:ring-offset-2",
        
        // Success state
        success: "border-success bg-white px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-success focus-visible:ring-offset-2",
      },
      size: {
        sm: "h-8 text-xs",
        default: "h-10 text-sm",
        lg: "h-12 text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement>,
    VariantProps<typeof inputVariants> {
  label?: string
  helperText?: string
  errorMessage?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  leftAddon?: React.ReactNode
  rightAddon?: React.ReactNode
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ 
    className, 
    variant, 
    size, 
    type = "text",
    label,
    helperText,
    errorMessage,
    leftIcon,
    rightIcon,
    leftAddon,
    rightAddon,
    ...props 
  }, ref) => {
    const hasError = !!errorMessage
    const inputVariant = hasError ? "error" : variant

    return (
      <div className="w-full">
        {/* Label */}
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {label}
            {props.required && <span className="text-error ml-1">*</span>}
          </label>
        )}
        
        {/* Input Container */}
        <div className="relative">
          {/* Left Addon */}
          {leftAddon && (
            <div className="absolute left-0 top-0 h-full flex items-center pl-3 pointer-events-none">
              <span className="text-gray-500 text-sm">{leftAddon}</span>
            </div>
          )}
          
          {/* Left Icon */}
          {leftIcon && !leftAddon && (
            <div className="absolute left-0 top-0 h-full flex items-center pl-3 pointer-events-none">
              <span className="text-gray-400">{leftIcon}</span>
            </div>
          )}
          
          {/* Input Field */}
          <input
            type={type}
            className={cn(
              inputVariants({ variant: inputVariant, size, className }),
              leftIcon || leftAddon ? "pl-10" : "",
              rightIcon || rightAddon ? "pr-10" : ""
            )}
            ref={ref}
            {...props}
          />
          
          {/* Right Icon */}
          {rightIcon && !rightAddon && (
            <div className="absolute right-0 top-0 h-full flex items-center pr-3 pointer-events-none">
              <span className="text-gray-400">{rightIcon}</span>
            </div>
          )}
          
          {/* Right Addon */}
          {rightAddon && (
            <div className="absolute right-0 top-0 h-full flex items-center pr-3 pointer-events-none">
              <span className="text-gray-500 text-sm">{rightAddon}</span>
            </div>
          )}
        </div>
        
        {/* Helper Text or Error Message */}
        {(helperText || errorMessage) && (
          <p className={cn(
            "mt-2 text-xs",
            hasError ? "text-error" : "text-gray-600"
          )}>
            {errorMessage || helperText}
          </p>
        )}
      </div>
    )
  }
)
Input.displayName = "Input"

// Search Input Component (Udemy-inspired)
export interface SearchInputProps extends Omit<InputProps, 'leftIcon' | 'type'> {
  onSearch?: (value: string) => void
  onClear?: () => void
  showClearButton?: boolean
}

const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ 
    className,
    onSearch,
    onClear,
    showClearButton = true,
    value,
    onChange,
    ...props 
  }, ref) => {
    const [internalValue, setInternalValue] = React.useState(value || "")
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value
      setInternalValue(newValue)
      onChange?.(e)
    }
    
    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        onSearch?.(internalValue)
      }
    }
    
    const handleClear = () => {
      setInternalValue("")
      onClear?.()
    }
    
    return (
      <Input
        ref={ref}
        type="search"
        className={className}
        value={value ?? internalValue}
        onChange={handleChange}
        onKeyPress={handleKeyPress}
        leftIcon={
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        }
        rightIcon={
          showClearButton && (internalValue || value) ? (
            <button
              type="button"
              onClick={handleClear}
              className="text-gray-400 hover:text-gray-600 p-1"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          ) : undefined
        }
        {...props}
      />
    )
  }
)
SearchInput.displayName = "SearchInput"

export { Input, SearchInput, inputVariants }