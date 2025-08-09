import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const progressVariants = cva(
  "relative h-2 w-full overflow-hidden rounded-full",
  {
    variants: {
      variant: {
        // Default corporate progress bar
        default: "bg-gray-200",
        
        // Corporate blue theme
        corporate: "bg-corporate-100",
        
        // Success theme
        success: "bg-green-100",
        
        // Warning theme
        warning: "bg-yellow-100",
        
        // Error theme
        error: "bg-red-100",
        
        // Gradient background
        gradient: "bg-gradient-subtle",
      },
      size: {
        sm: "h-1",
        default: "h-2",
        lg: "h-3",
        xl: "h-4",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const progressIndicatorVariants = cva(
  "h-full w-full flex-1 transition-all duration-300 ease-out",
  {
    variants: {
      variant: {
        default: "bg-corporate-primary",
        corporate: "bg-gradient-card",
        success: "bg-success",
        warning: "bg-warning",
        error: "bg-error",
        gradient: "bg-gradient-hero",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface ProgressProps
  extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>,
    VariantProps<typeof progressVariants> {
  value?: number
  max?: number
  label?: string
  showPercentage?: boolean
  showValue?: boolean
}

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  ProgressProps
>(({ 
  className, 
  variant, 
  size,
  value = 0,
  max = 100,
  label,
  showPercentage = false,
  showValue = false,
  ...props 
}, ref) => {
  const percentage = Math.round((value / max) * 100)
  
  return (
    <div className="w-full">
      {/* Label and value display */}
      {(label || showPercentage || showValue) && (
        <div className="flex items-center justify-between mb-2">
          {label && (
            <span className="text-sm font-medium text-gray-700">{label}</span>
          )}
          <div className="flex items-center gap-2">
            {showValue && (
              <span className="text-sm text-gray-600">
                {value} / {max}
              </span>
            )}
            {showPercentage && (
              <span className="text-sm font-medium text-corporate-primary">
                {percentage}%
              </span>
            )}
          </div>
        </div>
      )}
      
      {/* Progress bar */}
      <ProgressPrimitive.Root
        ref={ref}
        className={cn(progressVariants({ variant, size, className }))}
        value={value}
        max={max}
        {...props}
      >
        <ProgressPrimitive.Indicator
          className={cn(progressIndicatorVariants({ variant }))}
          style={{ transform: `translateX(-${100 - percentage}%)` }}
        />
      </ProgressPrimitive.Root>
    </div>
  )
})
Progress.displayName = ProgressPrimitive.Root.displayName

// Circular Progress Component
export interface CircularProgressProps {
  value?: number
  max?: number
  size?: number
  strokeWidth?: number
  className?: string
  variant?: "default" | "corporate" | "success" | "warning" | "error"
  showPercentage?: boolean
  children?: React.ReactNode
}

const CircularProgress: React.FC<CircularProgressProps> = ({
  value = 0,
  max = 100,
  size = 120,
  strokeWidth = 8,
  className,
  variant = "default",
  showPercentage = true,
  children,
}) => {
  const percentage = Math.round((value / max) * 100)
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const strokeDashoffset = circumference - (percentage / 100) * circumference

  const colorMap = {
    default: "stroke-corporate-primary",
    corporate: "stroke-corporate-primary",
    success: "stroke-success",
    warning: "stroke-warning",
    error: "stroke-error",
  }

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          className="text-gray-200"
        />
        
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className={cn("transition-all duration-300 ease-out", colorMap[variant])}
        />
      </svg>
      
      {/* Center content */}
      <div className="absolute inset-0 flex items-center justify-center">
        {children || (showPercentage && (
          <span className="text-lg font-semibold text-gray-900">
            {percentage}%
          </span>
        ))}
      </div>
    </div>
  )
}

// Course Progress Component (Udemy-inspired)
export interface CourseProgressProps {
  completed: number
  total: number
  currentLesson?: string
  variant?: "default" | "corporate"
  showDetails?: boolean
  className?: string
}

const CourseProgress: React.FC<CourseProgressProps> = ({
  completed,
  total,
  currentLesson,
  variant = "corporate",
  showDetails = true,
  className,
}) => {
  const percentage = Math.round((completed / total) * 100)
  
  return (
    <div className={cn("space-y-2", className)}>
      {showDetails && (
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-gray-700">
            Progress: {completed} of {total} lessons
          </span>
          <span className="font-semibold text-corporate-primary">
            {percentage}% complete
          </span>
        </div>
      )}
      
      <Progress
        value={completed}
        max={total}
        variant={variant}
        size="lg"
      />
      
      {currentLesson && (
        <p className="text-xs text-gray-600">
          Current: {currentLesson}
        </p>
      )}
    </div>
  )
}

// Step Progress Component (Multi-step forms, learning paths)
export interface StepProgressProps {
  steps: Array<{
    id: string
    title: string
    completed?: boolean
    current?: boolean
  }>
  className?: string
}

const StepProgress: React.FC<StepProgressProps> = ({ steps, className }) => {
  return (
    <div className={cn("flex items-center", className)}>
      {steps.map((step, index) => (
        <React.Fragment key={step.id}>
          {/* Step circle */}
          <div className="flex flex-col items-center">
            <div
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                step.completed
                  ? "bg-corporate-primary text-white"
                  : step.current
                  ? "bg-corporate-accent text-white"
                  : "bg-gray-200 text-gray-600"
              )}
            >
              {step.completed ? (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                index + 1
              )}
            </div>
            <span className="mt-2 text-xs font-medium text-gray-600 text-center max-w-20">
              {step.title}
            </span>
          </div>
          
          {/* Connector line */}
          {index < steps.length - 1 && (
            <div
              className={cn(
                "flex-1 h-0.5 mx-2 mt-4 transition-colors",
                steps[index + 1]?.completed || step.completed
                  ? "bg-corporate-primary"
                  : "bg-gray-200"
              )}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  )
}

export { Progress, CircularProgress, CourseProgress, StepProgress, progressVariants }