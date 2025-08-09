# Dashboard Layout System

A comprehensive, professional dashboard layout system for 7P Education with role-based navigation, corporate branding, and responsive design.

## Components

### DashboardLayout
Main wrapper component that provides the complete dashboard structure.

```tsx
import { DashboardLayout } from '@/components/layout';

<DashboardLayout
  title="Page Title"
  subtitle="Page description"
  breadcrumbs={[
    { label: 'Section', href: '/section' },
    { label: 'Current Page' }
  ]}
  actions={
    <Button>Action Button</Button>
  }
>
  {/* Page content */}
</DashboardLayout>
```

**Features:**
- Professional header with navigation and user profile
- Role-based sidebar navigation (student/admin)
- Responsive design with mobile hamburger menu
- Corporate blue gradient design integration
- Automatic user authentication and role detection

### DashboardHeader
Professional header with global navigation, search, and user menu.

**Features:**
- 7P Education branding with logo
- Global search functionality
- Notification center with badge
- User profile dropdown with role indication
- Quick access buttons for courses and admin panel
- Responsive design with mobile optimization

### DashboardSidebar
Role-based navigation sidebar with different menus for students and admins.

**Student Navigation:**
- Learning: Dashboard, Courses, Progress, Achievements, Schedule
- Resources: Library, Discussions, Notes
- Account: Profile, Settings

**Admin Navigation:**
- Administration: Dashboard, Analytics, Users, Courses
- Content: Library, Assessments, Certificates
- System: Database, Security, Settings
- Student View: Access to student features

**Features:**
- Auto-collapse on mobile with overlay
- Active state indicators with corporate blue gradients
- Quick stats display (progress for students, metrics for admins)
- Next goal tracking for students
- Role badge and user information

### DashboardContent
Main content area with optional header, breadcrumbs, and actions.

**Features:**
- Responsive content area that adapts to sidebar
- Optional page header with title, subtitle, and actions
- Breadcrumb navigation
- Automatic spacing and layout management

### Utility Components

#### DashboardStats
Pre-built statistics display component:
```tsx
<DashboardStats
  stats={[
    {
      label: "Active Courses",
      value: 12,
      change: "Growing collection",
      changeType: "positive",
      icon: BookOpen
    }
  ]}
/>
```

#### DashboardSection
Section wrapper with title and optional action:
```tsx
<DashboardSection
  title="Section Title"
  subtitle="Description"
  action={<Button>Action</Button>}
>
  Content
</DashboardSection>
```

#### DashboardCard
Styled card component with corporate design:
```tsx
<DashboardCard className="optional-classes">
  Card content
</DashboardCard>
```

#### DashboardGrid
Responsive grid layout:
```tsx
<DashboardGrid>
  <DashboardCard>Item 1</DashboardCard>
  <DashboardCard>Item 2</DashboardCard>
</DashboardGrid>
```

#### DashboardEmptyState
Empty state component with icon and call-to-action:
```tsx
<DashboardEmptyState
  icon={BookOpen}
  title="No courses yet"
  description="Start your learning journey"
  action={<Button>Browse Courses</Button>}
/>
```

## Design System Integration

### Corporate Colors
- Primary: `corporate-primary` (#3b82f6)
- Deep: `corporate-deep` (#1e3a8a)
- Accent: `corporate-accent` (#60a5fa)
- Gradients: Hero, card, accent, and overlay gradients

### Shadows
- `shadow-corporate-sm`: Subtle shadow
- `shadow-corporate`: Standard shadow
- `shadow-corporate-md`: Medium shadow
- `shadow-corporate-lg`: Large shadow

### Typography
- Corporate font family (Inter)
- Consistent sizing scale
- Proper contrast ratios

### Spacing
- Corporate spacing scale (4px/8px grid)
- Consistent padding and margins
- Responsive breakpoints

## Role-Based Features

### Student Features
- Learning progress tracking
- Course enrollment status
- Achievement badges
- Study streak display
- Next goal visualization
- Quick access to learning resources

### Admin Features
- System overview dashboard
- User and course management
- Analytics and reporting
- System health monitoring
- Quick action buttons
- Activity feed
- Revenue tracking

## Responsive Design

### Breakpoints
- Mobile: < 768px (hamburger menu, stacked layout)
- Tablet: 768px - 1024px (collapsible sidebar)
- Desktop: > 1024px (full sidebar navigation)

### Mobile Optimizations
- Hamburger menu with slide-out sidebar
- Touch-friendly navigation
- Optimized header with essential actions
- Responsive grid layouts
- Mobile-first design approach

## Accessibility Features

- ARIA labels for navigation
- Keyboard navigation support
- Screen reader friendly
- Color contrast compliance
- Focus management
- Semantic HTML structure

## Usage Examples

### Student Dashboard Page
```tsx
export default function StudentDashboard() {
  return (
    <DashboardLayout
      title="Learning Dashboard"
      subtitle="Track your progress and continue your learning journey"
    >
      <DashboardStats stats={studentStats} />
      <DashboardSection title="My Courses">
        <CourseGrid />
      </DashboardSection>
    </DashboardLayout>
  );
}
```

### Admin Dashboard Page
```tsx
export default function AdminDashboard() {
  return (
    <DashboardLayout
      title="Admin Dashboard"
      subtitle="System overview and management"
      breadcrumbs={[
        { label: 'Admin', href: '/admin' },
        { label: 'Dashboard' }
      ]}
    >
      <DashboardStats stats={adminStats} />
      <DashboardGrid>
        <SystemHealth />
        <RecentActivity />
        <QuickActions />
      </DashboardGrid>
    </DashboardLayout>
  );
}
```

## Implementation Notes

- Uses Supabase for authentication and role management
- Integrates with existing useAdmin hook
- Supports both student and admin user types
- Handles loading states and error conditions
- Optimized for performance with lazy loading
- TypeScript support with proper type definitions

## Future Enhancements

- Dark mode support
- Additional role types (instructor, moderator)
- Customizable sidebar ordering
- Advanced notification system
- Multi-language support
- Enhanced analytics dashboard