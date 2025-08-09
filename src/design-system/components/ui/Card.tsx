import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const cardVariants = cva(
  "rounded-lg border bg-card text-card-foreground shadow-sm transition-all duration-300",
  {
    variants: {
      variant: {
        // Default card with subtle shadow
        default: "border-gray-200 bg-white shadow-corporate",
        
        // Elevated card with more prominence
        elevated: "border-gray-200 bg-white shadow-corporate-md hover:shadow-corporate-lg",
        
        // Interactive card with hover effects
        interactive: "border-gray-200 bg-white shadow-corporate hover:shadow-corporate-lg hover:-translate-y-1 cursor-pointer",
        
        // Course card inspired by Udemy
        course: "border-gray-200 bg-white shadow-corporate hover:shadow-corporate-lg hover:-translate-y-1 cursor-pointer overflow-hidden",
        
        // Feature card with gradient background
        feature: "border-corporate-200 bg-gradient-card text-white shadow-corporate-md",
        
        // Outline card with border emphasis
        outline: "border-2 border-corporate-primary bg-white shadow-none",
        
        // Flat card without shadow
        flat: "border-gray-200 bg-gray-50 shadow-none",
        
        // Glass card with backdrop blur effect
        glass: "border-white/20 bg-white/10 backdrop-blur-sm shadow-corporate-lg",
      },
      padding: {
        none: "p-0",
        sm: "p-4",
        default: "p-6",
        lg: "p-8",
      },
    },
    defaultVariants: {
      variant: "default",
      padding: "default",
    },
  }
)

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  asChild?: boolean
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, padding, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardVariants({ variant, padding, className }))}
      {...props}
    />
  )
)
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn("text-lg font-semibold leading-none tracking-tight text-gray-900", className)}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-gray-600 leading-relaxed", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div 
    ref={ref} 
    className={cn("", className)} 
    {...props} 
  />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center pt-4", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

// Specialized Course Card Component (Udemy-inspired)
export interface CourseCardProps extends React.HTMLAttributes<HTMLDivElement> {
  imageUrl?: string
  imageAlt?: string
  title: string
  instructor?: string
  rating?: number
  ratingCount?: number
  price?: string
  originalPrice?: string
  duration?: string
  level?: "Beginner" | "Intermediate" | "Advanced"
  badge?: string
  onEnroll?: () => void
}

const CourseCard = React.forwardRef<HTMLDivElement, CourseCardProps>(
  ({
    className,
    imageUrl,
    imageAlt,
    title,
    instructor,
    rating,
    ratingCount,
    price,
    originalPrice,
    duration,
    level,
    badge,
    onEnroll,
    ...props
  }, ref) => (
    <Card 
      ref={ref}
      variant="course" 
      padding="none"
      className={cn("max-w-sm", className)}
      {...props}
    >
      {/* Course Image */}
      <div className="relative aspect-video bg-gradient-subtle">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={imageAlt || title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-subtle">
            <div className="text-gray-400 text-4xl">📚</div>
          </div>
        )}
        
        {/* Badge */}
        {badge && (
          <div className="absolute top-2 left-2 bg-corporate-primary text-white text-xs px-2 py-1 rounded">
            {badge}
          </div>
        )}
        
        {/* Level indicator */}
        {level && (
          <div className="absolute top-2 right-2 bg-white/90 text-gray-700 text-xs px-2 py-1 rounded">
            {level}
          </div>
        )}
      </div>

      {/* Course Content */}
      <CardContent className="p-4">
        <CardTitle className="text-base font-semibold mb-2 line-clamp-2">
          {title}
        </CardTitle>
        
        {instructor && (
          <p className="text-sm text-gray-600 mb-2">{instructor}</p>
        )}

        {/* Rating */}
        {rating && (
          <div className="flex items-center gap-1 mb-2">
            <span className="text-sm font-medium text-gray-900">{rating}</span>
            <div className="flex items-center">
              {[...Array(5)].map((_, i) => (
                <svg
                  key={i}
                  className={cn(
                    "w-3 h-3",
                    i < Math.floor(rating)
                      ? "text-yellow-400 fill-current"
                      : "text-gray-300"
                  )}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
            {ratingCount && (
              <span className="text-xs text-gray-500">({ratingCount})</span>
            )}
          </div>
        )}

        {/* Course Meta */}
        {duration && (
          <p className="text-xs text-gray-500 mb-3">{duration}</p>
        )}

        {/* Price and Action */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {price && (
              <span className="text-lg font-bold text-gray-900">{price}</span>
            )}
            {originalPrice && (
              <span className="text-sm text-gray-500 line-through">{originalPrice}</span>
            )}
          </div>
          
          {onEnroll && (
            <Button 
              size="sm" 
              variant="corporate"
              onClick={onEnroll}
            >
              Enroll
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
)
CourseCard.displayName = "CourseCard"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent, CourseCard, cardVariants }