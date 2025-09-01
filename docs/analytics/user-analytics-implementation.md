# User Analytics Implementation Guide

## Executive Summary

This comprehensive guide details the implementation of advanced user analytics for the 7P Education Platform, providing deep insights into user behavior, engagement patterns, and learning outcomes. Our multi-layered analytics approach combines Google Analytics 4, Mixpanel, custom event tracking, and real-time dashboards to deliver actionable intelligence for platform optimization.

## Table of Contents

1. [Analytics Architecture Overview](#analytics-architecture-overview)
2. [Google Analytics 4 Implementation](#google-analytics-4-implementation)
3. [Mixpanel Advanced Tracking](#mixpanel-advanced-tracking)
4. [Custom Event System](#custom-event-system)
5. [User Journey Mapping](#user-journey-mapping)
6. [Behavioral Cohort Analysis](#behavioral-cohort-analysis)
7. [Privacy & Compliance](#privacy-compliance)
8. [Performance Optimization](#performance-optimization)

## Analytics Architecture Overview

### Multi-Tier Analytics Strategy

```typescript
// analytics/config/analytics-architecture.ts
export const AnalyticsArchitecture = {
  layers: {
    collection: {
      googleAnalytics: 'Page views, sessions, demographics',
      mixpanel: 'User actions, feature adoption, retention',
      custom: 'Learning progress, assessment scores, engagement',
      segment: 'Data pipeline and routing'
    },
    processing: {
      realtime: 'Stream processing with Kinesis',
      batch: 'Daily aggregations with Spark',
      ml: 'Predictive analytics with SageMaker'
    },
    storage: {
      hot: 'Redis for real-time metrics',
      warm: 'PostgreSQL for recent data',
      cold: 'S3 for historical archives'
    },
    visualization: {
      dashboards: 'Grafana, Metabase, custom React',
      reports: 'Automated PDF generation',
      alerts: 'Slack, email, SMS notifications'
    }
  }
};
```

### Core Analytics Services

```typescript
// analytics/services/AnalyticsService.ts
import { GoogleAnalytics } from './providers/GoogleAnalytics';
import { MixpanelProvider } from './providers/MixpanelProvider';
import { CustomAnalytics } from './providers/CustomAnalytics';
import { SegmentAnalytics } from './providers/SegmentAnalytics';

export class AnalyticsService {
  private providers: Map<string, AnalyticsProvider>;
  private eventQueue: AnalyticsEvent[] = [];
  private userContext: UserContext;
  
  constructor() {
    this.providers = new Map([
      ['ga4', new GoogleAnalytics()],
      ['mixpanel', new MixpanelProvider()],
      ['custom', new CustomAnalytics()],
      ['segment', new SegmentAnalytics()]
    ]);
    
    this.initializeProviders();
    this.setupEventBatching();
  }
  
  private initializeProviders(): void {
    // Initialize each provider with configuration
    this.providers.forEach((provider, key) => {
      provider.initialize({
        apiKey: process.env[`${key.toUpperCase()}_API_KEY`],
        environment: process.env.NODE_ENV,
        userId: this.userContext?.userId,
        sessionId: this.generateSessionId(),
        enableDebug: process.env.NODE_ENV === 'development'
      });
    });
  }
  
  public track(event: string, properties?: Record<string, any>): void {
    const enrichedEvent = this.enrichEvent(event, properties);
    
    // Add to queue for batching
    this.eventQueue.push(enrichedEvent);
    
    // Send to providers based on event type
    this.routeEvent(enrichedEvent);
  }
  
  private enrichEvent(
    event: string, 
    properties?: Record<string, any>
  ): AnalyticsEvent {
    return {
      event,
      properties: {
        ...properties,
        timestamp: new Date().toISOString(),
        userId: this.userContext?.userId,
        sessionId: this.userContext?.sessionId,
        deviceId: this.getDeviceId(),
        platform: this.getPlatform(),
        appVersion: process.env.NEXT_PUBLIC_APP_VERSION,
        ...this.getContextualData()
      }
    };
  }
  
  private getContextualData(): Record<string, any> {
    return {
      url: window.location.href,
      path: window.location.pathname,
      referrer: document.referrer,
      userAgent: navigator.userAgent,
      screenResolution: `${screen.width}x${screen.height}`,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };
  }
}
```

## Google Analytics 4 Implementation

### GA4 Configuration

```typescript
// analytics/providers/GoogleAnalytics.ts
import { gtag } from './gtag';

export class GoogleAnalytics implements AnalyticsProvider {
  private measurementId: string;
  private config: GA4Config;
  
  initialize(config: ProviderConfig): void {
    this.measurementId = config.apiKey;
    
    // Load GA4 script
    this.loadScript();
    
    // Configure GA4
    gtag('config', this.measurementId, {
      page_path: window.location.pathname,
      debug_mode: config.enableDebug,
      user_id: config.userId,
      user_properties: {
        subscription_tier: this.getUserTier(),
        account_type: this.getAccountType()
      }
    });
    
    // Set up enhanced measurement
    this.setupEnhancedMeasurement();
  }
  
  private setupEnhancedMeasurement(): void {
    // Track scroll depth
    this.trackScrollDepth();
    
    // Track engagement time
    this.trackEngagementTime();
    
    // Track video interactions
    this.trackVideoEngagement();
    
    // Track file downloads
    this.trackFileDownloads();
    
    // Track outbound clicks
    this.trackOutboundClicks();
  }
  
  public trackPageView(path: string, title?: string): void {
    gtag('event', 'page_view', {
      page_path: path,
      page_title: title || document.title,
      page_location: window.location.href,
      send_to: this.measurementId
    });
  }
  
  public trackEvent(
    eventName: string, 
    parameters?: Record<string, any>
  ): void {
    // Map to GA4 recommended events when possible
    const ga4Event = this.mapToGA4Event(eventName);
    
    gtag('event', ga4Event.name, {
      ...ga4Event.parameters,
      ...parameters,
      send_to: this.measurementId
    });
  }
  
  private mapToGA4Event(eventName: string): GA4Event {
    const eventMap: Record<string, GA4Event> = {
      'course_started': {
        name: 'tutorial_begin',
        parameters: { tutorial_id: 'course_id' }
      },
      'course_completed': {
        name: 'tutorial_complete',
        parameters: { tutorial_id: 'course_id' }
      },
      'lesson_viewed': {
        name: 'view_item',
        parameters: { 
          item_id: 'lesson_id',
          item_category: 'lesson'
        }
      },
      'quiz_submitted': {
        name: 'post_score',
        parameters: {
          score: 'quiz_score',
          level: 'quiz_difficulty'
        }
      }
    };
    
    return eventMap[eventName] || {
      name: eventName,
      parameters: {}
    };
  }
  
  private trackScrollDepth(): void {
    let maxScroll = 0;
    const thresholds = [25, 50, 75, 90, 100];
    
    window.addEventListener('scroll', throttle(() => {
      const scrollPercent = Math.round(
        (window.scrollY + window.innerHeight) / 
        document.documentElement.scrollHeight * 100
      );
      
      thresholds.forEach(threshold => {
        if (scrollPercent >= threshold && maxScroll < threshold) {
          this.trackEvent('scroll', {
            percent_scrolled: threshold
          });
          maxScroll = threshold;
        }
      });
    }, 500));
  }
}
```

### Enhanced E-commerce Tracking

```typescript
// analytics/ecommerce/EcommerceTracking.ts
export class EcommerceTracking {
  private ga: GoogleAnalytics;
  
  trackPurchase(transaction: Transaction): void {
    // Track purchase event
    gtag('event', 'purchase', {
      transaction_id: transaction.id,
      value: transaction.total,
      currency: transaction.currency,
      tax: transaction.tax,
      shipping: transaction.shipping,
      items: transaction.items.map(item => ({
        item_id: item.id,
        item_name: item.name,
        item_category: item.category,
        item_category2: item.subcategory,
        item_variant: item.variant,
        price: item.price,
        quantity: item.quantity
      }))
    });
    
    // Track revenue by source
    this.trackRevenueSource(transaction);
  }
  
  trackAddToCart(item: CartItem): void {
    gtag('event', 'add_to_cart', {
      currency: 'USD',
      value: item.price,
      items: [{
        item_id: item.id,
        item_name: item.name,
        item_category: item.category,
        price: item.price,
        quantity: 1
      }]
    });
  }
  
  trackCheckoutProgress(step: number, option?: string): void {
    gtag('event', 'checkout_progress', {
      checkout_step: step,
      checkout_option: option,
      value: this.getCartValue(),
      currency: 'USD',
      items: this.getCartItems()
    });
  }
}
```

## Mixpanel Advanced Tracking

### User Profile Management

```typescript
// analytics/providers/MixpanelProvider.ts
import mixpanel from 'mixpanel-browser';

export class MixpanelProvider implements AnalyticsProvider {
  private projectToken: string;
  
  initialize(config: ProviderConfig): void {
    this.projectToken = config.apiKey;
    
    mixpanel.init(this.projectToken, {
      debug: config.enableDebug,
      track_pageview: true,
      persistence: 'localStorage',
      api_host: 'https://api-eu.mixpanel.com',
      loaded: () => {
        this.setupUserProfile(config.userId);
      }
    });
  }
  
  private setupUserProfile(userId?: string): void {
    if (userId) {
      // Identify user
      mixpanel.identify(userId);
      
      // Set user profile properties
      mixpanel.people.set({
        $email: this.getUserEmail(),
        $name: this.getUserName(),
        $created: this.getUserCreatedDate(),
        subscription_tier: this.getSubscriptionTier(),
        courses_enrolled: this.getEnrolledCourses(),
        last_active: new Date().toISOString()
      });
      
      // Track user properties over time
      mixpanel.people.set_once({
        'first_login': new Date().toISOString(),
        'initial_referrer': document.referrer
      });
    }
  }
  
  public trackEvent(
    eventName: string, 
    properties?: Record<string, any>
  ): void {
    // Add super properties
    const enhancedProperties = {
      ...properties,
      platform: 'web',
      version: process.env.NEXT_PUBLIC_APP_VERSION,
      environment: process.env.NODE_ENV
    };
    
    mixpanel.track(eventName, enhancedProperties);
    
    // Update user engagement metrics
    this.updateEngagementMetrics(eventName);
  }
  
  private updateEngagementMetrics(eventName: string): void {
    // Increment event counters
    mixpanel.people.increment({
      'total_events': 1,
      [`${eventName}_count`]: 1
    });
    
    // Track revenue events
    if (this.isRevenueEvent(eventName)) {
      mixpanel.people.track_charge(
        this.getEventRevenue(eventName)
      );
    }
    
    // Update last activity
    mixpanel.people.set({
      'last_activity': new Date().toISOString(),
      'last_event': eventName
    });
  }
}
```

### Funnel Analysis Implementation

```typescript
// analytics/funnels/FunnelTracking.ts
export class FunnelTracking {
  private mixpanel: MixpanelProvider;
  private funnels: Map<string, Funnel>;
  
  constructor() {
    this.funnels = new Map([
      ['onboarding', this.createOnboardingFunnel()],
      ['purchase', this.createPurchaseFunnel()],
      ['engagement', this.createEngagementFunnel()]
    ]);
  }
  
  private createOnboardingFunnel(): Funnel {
    return {
      name: 'User Onboarding',
      steps: [
        { name: 'signup_started', properties: {} },
        { name: 'email_verified', properties: {} },
        { name: 'profile_completed', properties: {} },
        { name: 'first_course_viewed', properties: {} },
        { name: 'first_lesson_started', properties: {} }
      ],
      timeout: 7 * 24 * 60 * 60 * 1000 // 7 days
    };
  }
  
  public trackFunnelStep(
    funnelName: string, 
    stepName: string,
    properties?: Record<string, any>
  ): void {
    const funnel = this.funnels.get(funnelName);
    if (!funnel) return;
    
    const stepIndex = funnel.steps.findIndex(
      s => s.name === stepName
    );
    
    this.mixpanel.trackEvent(`${funnelName}_${stepName}`, {
      ...properties,
      funnel_name: funnelName,
      funnel_step: stepIndex + 1,
      funnel_step_name: stepName
    });
    
    // Check for funnel completion
    if (stepIndex === funnel.steps.length - 1) {
      this.trackFunnelCompletion(funnelName);
    }
  }
  
  private trackFunnelCompletion(funnelName: string): void {
    const funnel = this.funnels.get(funnelName);
    
    this.mixpanel.trackEvent('funnel_completed', {
      funnel_name: funnelName,
      completion_time: this.calculateCompletionTime(funnelName),
      steps_completed: funnel.steps.length
    });
  }
}
```

## Custom Event System

### Event Schema Definition

```typescript
// analytics/events/EventSchema.ts
export interface AnalyticsEvent {
  category: EventCategory;
  action: string;
  label?: string;
  value?: number;
  metadata?: Record<string, any>;
  timestamp: string;
  userId?: string;
  sessionId: string;
}

export enum EventCategory {
  NAVIGATION = 'navigation',
  ENGAGEMENT = 'engagement',
  LEARNING = 'learning',
  SOCIAL = 'social',
  COMMERCE = 'commerce',
  SYSTEM = 'system'
}

export class EventSchemaValidator {
  private schemas: Map<string, EventSchema>;
  
  constructor() {
    this.loadSchemas();
  }
  
  private loadSchemas(): void {
    this.schemas = new Map([
      ['lesson_completed', {
        required: ['lesson_id', 'course_id', 'duration'],
        optional: ['quiz_score', 'attempts'],
        validators: {
          duration: (v: number) => v > 0 && v < 3600000,
          quiz_score: (v: number) => v >= 0 && v <= 100
        }
      }],
      ['video_watched', {
        required: ['video_id', 'duration', 'percentage'],
        optional: ['quality', 'playback_rate'],
        validators: {
          percentage: (v: number) => v >= 0 && v <= 100,
          playback_rate: (v: number) => [0.5, 0.75, 1, 1.25, 1.5, 2].includes(v)
        }
      }]
    ]);
  }
  
  public validate(
    eventName: string, 
    properties: Record<string, any>
  ): ValidationResult {
    const schema = this.schemas.get(eventName);
    if (!schema) {
      return { valid: true }; // No schema defined, allow event
    }
    
    // Check required fields
    for (const field of schema.required) {
      if (!(field in properties)) {
        return {
          valid: false,
          error: `Missing required field: ${field}`
        };
      }
    }
    
    // Validate field values
    for (const [field, validator] of Object.entries(schema.validators)) {
      if (field in properties && !validator(properties[field])) {
        return {
          valid: false,
          error: `Invalid value for field: ${field}`
        };
      }
    }
    
    return { valid: true };
  }
}
```

### Learning Analytics Events

```typescript
// analytics/events/LearningEvents.ts
export class LearningAnalytics {
  private analytics: AnalyticsService;
  
  trackLessonProgress(
    lessonId: string,
    progress: number,
    metadata?: Record<string, any>
  ): void {
    this.analytics.track('lesson_progress', {
      lesson_id: lessonId,
      progress_percentage: progress,
      time_spent: this.getTimeSpent(lessonId),
      interaction_count: this.getInteractionCount(lessonId),
      ...metadata
    });
    
    // Track milestone achievements
    if (progress >= 100) {
      this.trackLessonCompletion(lessonId);
    } else if (progress >= 50 && !this.hasTrackedMilestone(lessonId, 50)) {
      this.trackMilestone(lessonId, 50);
    }
  }
  
  trackQuizAttempt(
    quizId: string,
    score: number,
    answers: Answer[]
  ): void {
    const analytics = {
      quiz_id: quizId,
      score,
      percentage: (score / this.getMaxScore(quizId)) * 100,
      attempt_number: this.getAttemptNumber(quizId),
      time_taken: this.getQuizDuration(quizId),
      questions_answered: answers.length,
      correct_answers: answers.filter(a => a.correct).length,
      topic_performance: this.analyzeTopicPerformance(answers)
    };
    
    this.analytics.track('quiz_attempted', analytics);
    
    // Track knowledge gaps
    this.identifyKnowledgeGaps(answers);
  }
  
  private analyzeTopicPerformance(answers: Answer[]): TopicPerformance[] {
    const topicScores = new Map<string, number[]>();
    
    answers.forEach(answer => {
      const topic = answer.topic;
      if (!topicScores.has(topic)) {
        topicScores.set(topic, []);
      }
      topicScores.get(topic).push(answer.correct ? 1 : 0);
    });
    
    return Array.from(topicScores.entries()).map(([topic, scores]) => ({
      topic,
      accuracy: scores.reduce((a, b) => a + b, 0) / scores.length,
      questions: scores.length
    }));
  }
}
```

## User Journey Mapping

### Session Recording Integration

```typescript
// analytics/journey/SessionRecording.ts
export class SessionRecording {
  private recorder: any; // rrweb or similar
  private session: SessionData;
  
  startRecording(): void {
    this.session = {
      id: this.generateSessionId(),
      startTime: Date.now(),
      events: [],
      metadata: {
        userId: this.getCurrentUserId(),
        url: window.location.href,
        userAgent: navigator.userAgent
      }
    };
    
    // Initialize recording with privacy settings
    this.recorder = rrwebRecord({
      emit: (event) => {
        this.session.events.push(event);
        
        // Send batch every 30 seconds
        if (this.session.events.length >= 100) {
          this.sendBatch();
        }
      },
      maskTextClass: 'sensitive-data',
      maskInputOptions: {
        password: true,
        email: true,
        tel: true
      },
      slimDOMOptions: {
        script: false,
        comment: false,
        headFavicon: false,
        headMetaDescKeywords: false
      }
    });
  }
  
  private sendBatch(): void {
    const batch = {
      sessionId: this.session.id,
      events: this.session.events.splice(0, 100),
      timestamp: Date.now()
    };
    
    // Send to analytics backend
    fetch('/api/analytics/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(batch)
    });
  }
}
```

## Behavioral Cohort Analysis

### Cohort Definition Engine

```typescript
// analytics/cohorts/CohortEngine.ts
export class CohortEngine {
  private cohorts: Map<string, Cohort>;
  
  defineCohort(definition: CohortDefinition): void {
    const cohort = {
      id: definition.id,
      name: definition.name,
      criteria: definition.criteria,
      users: new Set<string>(),
      metrics: new Map<string, any>()
    };
    
    this.cohorts.set(definition.id, cohort);
    this.evaluateUsers(cohort);
  }
  
  private evaluateUsers(cohort: Cohort): void {
    // Query users matching criteria
    const query = this.buildQuery(cohort.criteria);
    const users = this.executeQuery(query);
    
    users.forEach(user => {
      if (this.matchesCriteria(user, cohort.criteria)) {
        cohort.users.add(user.id);
      }
    });
    
    // Calculate cohort metrics
    this.calculateCohortMetrics(cohort);
  }
  
  private calculateCohortMetrics(cohort: Cohort): void {
    const metrics = {
      size: cohort.users.size,
      retention: this.calculateRetention(cohort),
      ltv: this.calculateLTV(cohort),
      engagement: this.calculateEngagement(cohort),
      churn_risk: this.calculateChurnRisk(cohort)
    };
    
    cohort.metrics = new Map(Object.entries(metrics));
  }
  
  compareCohorts(cohortIds: string[]): CohortComparison {
    const cohorts = cohortIds.map(id => this.cohorts.get(id));
    
    return {
      cohorts: cohorts.map(c => ({
        id: c.id,
        name: c.name,
        size: c.users.size
      })),
      metrics: this.compareMetrics(cohorts),
      insights: this.generateInsights(cohorts)
    };
  }
}
```

## Privacy & Compliance

### GDPR & CCPA Compliance

```typescript
// analytics/privacy/PrivacyManager.ts
export class PrivacyManager {
  private consentStatus: ConsentStatus;
  private dataRetention: DataRetentionPolicy;
  
  async requestConsent(): Promise<ConsentResponse> {
    // Show consent banner
    const consent = await this.showConsentBanner();
    
    // Store consent preferences
    this.storeConsent({
      analytics: consent.analytics,
      marketing: consent.marketing,
      functional: consent.functional,
      timestamp: Date.now(),
      ipAddress: await this.getHashedIP()
    });
    
    // Configure analytics based on consent
    this.configureAnalytics(consent);
    
    return consent;
  }
  
  private configureAnalytics(consent: ConsentResponse): void {
    if (consent.analytics) {
      // Enable full analytics
      this.enableAnalytics(['ga4', 'mixpanel', 'custom']);
    } else {
      // Enable only essential analytics
      this.enableAnalytics(['custom'], {
        anonymize: true,
        limitedData: true
      });
    }
  }
  
  async handleDataRequest(
    requestType: 'access' | 'deletion' | 'portability',
    userId: string
  ): Promise<DataRequestResponse> {
    switch (requestType) {
      case 'access':
        return this.exportUserData(userId);
      case 'deletion':
        return this.deleteUserData(userId);
      case 'portability':
        return this.exportPortableData(userId);
    }
  }
  
  private async deleteUserData(userId: string): Promise<void> {
    // Delete from all analytics providers
    await Promise.all([
      this.deleteFromGA4(userId),
      this.deleteFromMixpanel(userId),
      this.deleteFromCustomAnalytics(userId)
    ]);
    
    // Log deletion for compliance
    await this.logDataDeletion({
      userId,
      timestamp: Date.now(),
      systems: ['ga4', 'mixpanel', 'custom'],
      status: 'completed'
    });
  }
}
```

## Performance Optimization

### Analytics Performance Monitoring

```typescript
// analytics/performance/PerformanceMonitor.ts
export class AnalyticsPerformanceMonitor {
  private metrics: PerformanceMetrics;
  private thresholds: PerformanceThresholds;
  
  monitorAnalyticsImpact(): void {
    // Measure script load time
    const scriptLoadTime = this.measureScriptLoad();
    
    // Monitor runtime performance
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name.includes('analytics')) {
          this.recordPerformance({
            name: entry.name,
            duration: entry.duration,
            timestamp: entry.startTime
          });
        }
      }
    });
    
    observer.observe({ entryTypes: ['measure', 'function'] });
  }
  
  optimizeEventBatching(): void {
    // Implement intelligent batching
    const batchConfig = {
      maxBatchSize: 50,
      maxWaitTime: 5000, // 5 seconds
      urgentEvents: ['purchase', 'signup', 'error'],
      compression: true
    };
    
    this.configureBatching(batchConfig);
  }
  
  private configureBatching(config: BatchConfig): void {
    // Set up event queue with smart batching
    const queue = new EventQueue({
      onBatch: (events) => this.sendBatch(events),
      maxSize: config.maxBatchSize,
      maxWait: config.maxWaitTime,
      priorityFilter: (event) => 
        config.urgentEvents.includes(event.name)
    });
  }
}
```

## Conclusion

This comprehensive user analytics implementation provides the 7P Education Platform with enterprise-grade tracking capabilities, enabling data-driven decision-making and continuous platform optimization. The multi-layered approach ensures complete visibility into user behavior while maintaining privacy compliance and optimal performance.

The implementation covers all critical aspects of modern analytics, from basic page tracking to advanced behavioral cohort analysis, providing actionable insights that drive user engagement and business growth.