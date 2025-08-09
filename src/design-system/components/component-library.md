# 7P Education Component Library

## Overview
A comprehensive React component library built on Udemy-inspired design patterns, optimized for corporate education platforms with accessibility, performance, and professional aesthetics as core principles.

## 🚀 Quick Start

### Installation
The component library is built into the 7P Education platform and ready to use:

```tsx
import { Button } from '@/design-system/components/ui/Button'
import { Card, CardHeader, CardTitle, CardContent } from '@/design-system/components/ui/Card'
import { Input } from '@/design-system/components/ui/Input'
```

### Basic Usage
```tsx
function ExamplePage() {
  return (
    <div className="container mx-auto py-8">
      <Card variant="course">
        <CardHeader>
          <CardTitle>React Development Fundamentals</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">
            Master modern React development with hands-on projects...
          </p>
          <Button variant="corporate" size="lg">
            Enroll Now
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
```

## 📝 Component Categories

### 1. Interactive Components

#### Button Component
Professional button system with multiple variants for different contexts.

**Variants:**
- `primary` - Gradient background for main CTAs
- `corporate` - Solid corporate blue for professional actions
- `secondary` - Outline style for secondary actions
- `destructive` - Red for delete/remove actions
- `outline` - Border-only styling
- `ghost` - Minimal styling for subtle actions
- `link` - Text-only for navigation
- `success` - Green for positive confirmations
- `warning` - Amber for caution actions

**Sizes:**
- `sm` - Small (32px height)
- `default` - Standard (36px height) 
- `lg` - Large (40px height)
- `xl` - Extra large (48px height)
- `icon` - Square icon button (36x36px)

**Example:**
```tsx
<Button variant="corporate" size="lg" loading={isLoading}>
  Enroll in Course
</Button>

<Button variant="outline" leftIcon={<SearchIcon />}>
  Search Courses
</Button>

<Button variant="ghost" size="icon">
  <MoreIcon />
</Button>
```

**Props:**
```tsx
interface ButtonProps {
  variant?: 'primary' | 'corporate' | 'secondary' | 'destructive' | 'outline' | 'ghost' | 'link' | 'success' | 'warning'
  size?: 'sm' | 'default' | 'lg' | 'xl' | 'icon'
  loading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  disabled?: boolean
  asChild?: boolean
}
```

### 2. Layout Components

#### Card Component
Flexible card system supporting various content types and interaction patterns.

**Variants:**
- `default` - Basic content containers
- `elevated` - Enhanced shadows for prominence
- `interactive` - Hover effects and cursor pointer
- `course` - Udemy-inspired course display cards
- `feature` - Gradient backgrounds for highlights
- `outline` - Border emphasis styling
- `flat` - No shadow for minimal appearance
- `glass` - Backdrop blur effect

**Padding Options:**
- `none` - No internal padding
- `sm` - Small padding (16px)
- `default` - Standard padding (24px)
- `lg` - Large padding (32px)

**Example:**
```tsx
<Card variant="course" padding="none">
  <CardHeader>
    <CardTitle>Advanced JavaScript Concepts</CardTitle>
    <CardDescription>
      Master closures, prototypes, and async programming
    </CardDescription>
  </CardHeader>
  <CardContent>
    <p>Course content and details...</p>
  </CardContent>
  <CardFooter>
    <Button variant="corporate">Start Learning</Button>
  </CardFooter>
</Card>
```

#### CourseCard Component
Specialized component for displaying course information in Udemy-style layouts.

**Features:**
- Course image with aspect ratio preservation
- Instructor information display
- Star rating system
- Progress tracking for enrolled students
- Pricing information with discount support
- Level indicators (Beginner/Intermediate/Advanced)
- Badge support for special offers

**Example:**
```tsx
<CourseCard
  title="Full Stack Web Development"
  instructor="John Smith"
  rating={4.8}
  ratingCount={1250}
  price="$89.99"
  originalPrice="$199.99"
  duration="12 hours"
  level="Intermediate"
  badge="Bestseller"
  imageUrl="/courses/fullstack.jpg"
  onEnroll={() => handleEnroll()}
/>
```

### 3. Form Components

#### Input Component
Comprehensive input system with validation states and interactive elements.

**Variants:**
- `default` - Standard input with border
- `filled` - Background-filled variant
- `outline` - Prominent border styling
- `ghost` - Minimal styling
- `error` - Red styling for validation errors
- `success` - Green styling for validated inputs

**Sizes:**
- `sm` - Small (32px height)
- `default` - Standard (40px height)
- `lg` - Large (48px height)

**Features:**
- Label and helper text support
- Error message display
- Left and right icon support
- Left and right addon support
- Required field indicators

**Example:**
```tsx
<Input
  label="Email Address"
  type="email"
  placeholder="Enter your email"
  helperText="We'll never share your email"
  leftIcon={<EmailIcon />}
  required
/>

<Input
  label="Course Price"
  type="number"
  leftAddon="$"
  rightAddon="USD"
  errorMessage="Please enter a valid price"
/>
```

#### SearchInput Component
Specialized search input with built-in search and clear functionality.

**Features:**
- Built-in search icon
- Clear button when text is present
- Search on Enter key press
- Customizable search and clear callbacks

**Example:**
```tsx
<SearchInput
  placeholder="Search for courses..."
  onSearch={(query) => handleSearch(query)}
  onClear={() => handleClear()}
  showClearButton={true}
/>
```

### 4. Progress Components

#### Progress Component
Linear progress indicators for various learning contexts.

**Variants:**
- `default` - Standard progress bar
- `corporate` - Corporate blue theme
- `success` - Green success theme
- `warning` - Amber warning theme
- `error` - Red error theme
- `gradient` - Gradient background theme

**Sizes:**
- `sm` - Small (4px height)
- `default` - Standard (8px height)
- `lg` - Large (12px height)
- `xl` - Extra large (16px height)

**Example:**
```tsx
<Progress
  value={75}
  max={100}
  variant="corporate"
  size="lg"
  label="Course Progress"
  showPercentage={true}
  showValue={true}
/>
```

#### CircularProgress Component
Circular progress indicators for dashboard and achievement displays.

**Example:**
```tsx
<CircularProgress
  value={85}
  size={120}
  variant="corporate"
  showPercentage={true}
>
  <div className="text-center">
    <div className="text-2xl font-bold">85%</div>
    <div className="text-sm text-gray-600">Complete</div>
  </div>
</CircularProgress>
```

#### CourseProgress Component
Specialized progress component for course completion tracking.

**Example:**
```tsx
<CourseProgress
  completed={8}
  total={12}
  currentLesson="Building the User Interface"
  variant="corporate"
  showDetails={true}
/>
```

#### StepProgress Component
Multi-step progress indicator for forms and learning paths.

**Example:**
```tsx
<StepProgress
  steps={[
    { id: '1', title: 'Basics', completed: true },
    { id: '2', title: 'Intermediate', current: true },
    { id: '3', title: 'Advanced', completed: false }
  ]}
/>
```

### 5. Navigation Components

#### HeaderNavigation Component
Main site navigation with Udemy-inspired layout and functionality.

**Features:**
- Logo area with brand presentation
- Dropdown navigation menus
- Integrated search functionality
- User authentication state
- Responsive mobile behavior

**Example:**
```tsx
<HeaderNavigation
  logo={<Logo />}
  user={{
    name: "John Doe",
    email: "john@example.com",
    avatar: "/avatars/john.jpg"
  }}
  onSearch={(query) => handleSearch(query)}
/>
```

#### Breadcrumb Component
Path navigation for deep site structures.

**Example:**
```tsx
<Breadcrumb
  items={[
    { label: "Home", href: "/" },
    { label: "Courses", href: "/courses" },
    { label: "Web Development", href: "/courses/web-dev" },
    { label: "React Fundamentals", current: true }
  ]}
/>
```

#### SidebarNavigation Component
Hierarchical navigation for complex applications.

**Example:**
```tsx
<SidebarNavigation
  items={[
    {
      label: "Dashboard",
      href: "/dashboard",
      icon: <DashboardIcon />,
      active: true
    },
    {
      label: "Courses",
      href: "/courses",
      icon: <CoursesIcon />,
      children: [
        { label: "All Courses", href: "/courses/all" },
        { label: "My Courses", href: "/courses/mine", active: true },
        { label: "Wishlist", href: "/courses/wishlist" }
      ]
    }
  ]}
/>
```

## 🎨 Styling and Customization

### CSS Custom Properties
All components use CSS custom properties for easy theming:

```css
:root {
  --color-corporate-primary: #3b82f6;
  --color-corporate-deep: #1e3a8a;
  --gradient-hero: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
}
```

### Tailwind Integration
Components work seamlessly with Tailwind utilities:

```tsx
<Button 
  variant="corporate" 
  className="w-full md:w-auto shadow-lg hover:shadow-xl"
>
  Custom Styled Button
</Button>
```

### Component Composition
Components are designed for easy composition:

```tsx
<Card variant="interactive">
  <div className="relative">
    <img src="/course-image.jpg" alt="Course" className="w-full h-48 object-cover" />
    <div className="absolute top-2 right-2">
      <Button variant="ghost" size="icon">
        <HeartIcon />
      </Button>
    </div>
  </div>
  <CardContent>
    <CardTitle>Advanced React Patterns</CardTitle>
    <Progress value={60} variant="corporate" className="mt-4" />
  </CardContent>
</Card>
```

## ♿ Accessibility Features

### Keyboard Navigation
- All interactive components support keyboard navigation
- Focus management with visible focus indicators
- Proper tab order and skip links

### Screen Reader Support
- Semantic HTML structure
- ARIA labels and descriptions
- Alternative text for visual elements

### Color and Contrast
- WCAG 2.1 AA compliant color combinations
- High contrast mode support
- Color-blind friendly design patterns

## 🔧 Advanced Usage

### Custom Variants
Extend existing components with custom variants:

```tsx
const customButtonVariants = cva(
  buttonVariants.base,
  {
    variants: {
      ...buttonVariants.variants,
      gradient: "bg-gradient-corporate-hero text-white shadow-lg hover:shadow-xl"
    }
  }
)
```

### Compound Components
Build complex interfaces with component composition:

```tsx
function CourseGrid({ courses }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {courses.map(course => (
        <CourseCard
          key={course.id}
          {...course}
          onEnroll={() => handleEnroll(course.id)}
        />
      ))}
    </div>
  )
}
```

### Performance Optimization
- Tree-shaking support for minimal bundle size
- Lazy loading for large component sets
- Memoization for expensive computations

## 📊 Component Status

| Component | Status | Accessibility | Tests | Documentation |
|-----------|--------|--------------|-------|---------------|
| Button | ✅ Complete | ✅ WCAG AA | ✅ Full | ✅ Complete |
| Card | ✅ Complete | ✅ WCAG AA | ✅ Full | ✅ Complete |
| Input | ✅ Complete | ✅ WCAG AA | ✅ Full | ✅ Complete |
| Progress | ✅ Complete | ✅ WCAG AA | ✅ Full | ✅ Complete |
| Navigation | ✅ Complete | ✅ WCAG AA | ✅ Full | ✅ Complete |

## 🚀 Coming Soon

### Planned Components
- **Table** - Data tables with sorting and filtering
- **Modal** - Dialog and overlay components
- **Tooltip** - Contextual help and information
- **Alert** - Notification and status messages
- **Dropdown** - Menu and selection components
- **Tabs** - Content organization and navigation
- **Avatar** - User profile pictures and placeholders
- **Badge** - Status indicators and labels

### Planned Features
- **Dark mode** - Full dark theme support
- **Animations** - Micro-interactions and transitions
- **Form validation** - Built-in validation patterns
- **Data visualization** - Charts and progress indicators

This component library provides a solid foundation for building professional, accessible, and visually appealing corporate education interfaces while maintaining the proven usability patterns that make platforms like Udemy so successful.