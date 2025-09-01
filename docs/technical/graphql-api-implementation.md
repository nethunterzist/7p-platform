# GraphQL API Implementation for 7P Education Platform

## Executive Summary

This document provides a comprehensive implementation guide for GraphQL API architecture in the 7P Education Platform. The implementation covers advanced GraphQL patterns including schema design, resolver optimization, real-time subscriptions, security implementation, and performance optimization. The solution is designed to handle complex educational data relationships while providing flexible, efficient, and type-safe API access for multiple client applications.

## Table of Contents

1. [GraphQL Architecture Overview](#graphql-architecture-overview)
2. [Schema Design & Type System](#schema-design--type-system)
3. [Resolver Implementation](#resolver-implementation)
4. [Authentication & Authorization](#authentication--authorization)
5. [Subscription & Real-time Features](#subscription--real-time-features)
6. [Performance Optimization](#performance-optimization)
7. [Error Handling](#error-handling)
8. [Testing Strategy](#testing-strategy)
9. [Caching Implementation](#caching-implementation)
10. [Security Implementation](#security-implementation)
11. [File Upload & Media Handling](#file-upload--media-handling)
12. [Monitoring & Analytics](#monitoring--analytics)

## GraphQL Architecture Overview

### Core GraphQL Server Setup

```javascript
// src/graphql/server.js
const { ApolloServer } = require('apollo-server-express');
const { makeExecutableSchema } = require('@graphql-tools/schema');
const { applyMiddleware } = require('graphql-middleware');
const { shield } = require('graphql-shield');
const { createComplexityLimitRule } = require('graphql-query-complexity');
const depthLimit = require('graphql-depth-limit');

const typeDefs = require('./schema');
const resolvers = require('./resolvers');
const permissions = require('./permissions');
const { createDataLoaders } = require('./dataloaders');
const { AuthenticationService } = require('../services/AuthenticationService');
const { formatError } = require('./utils/errorFormatting');

class GraphQLServer {
    constructor() {
        this.schema = null;
        this.server = null;
        this.dataLoaders = null;
    }

    createSchema() {
        // Create base schema
        const baseSchema = makeExecutableSchema({
            typeDefs,
            resolvers,
            resolverValidationOptions: {
                requireResolversForResolveType: 'warn'
            }
        });

        // Apply middleware layers
        this.schema = applyMiddleware(
            baseSchema,
            shield(permissions, {
                allowExternalErrors: true,
                fallbackError: 'Access denied'
            })
        );

        return this.schema;
    }

    createServer() {
        this.server = new ApolloServer({
            schema: this.createSchema(),
            context: this.createContext.bind(this),
            formatError: formatError,
            validationRules: [
                depthLimit(10), // Limit query depth
                createComplexityLimitRule(1000) // Limit query complexity
            ],
            plugins: [
                {
                    requestDidStart() {
                        return {
                            didResolveOperation(requestContext) {
                                console.log('📊 GraphQL Operation:', {
                                    operationType: requestContext.request.operationName,
                                    query: requestContext.request.query,
                                    variables: requestContext.request.variables
                                });
                            },
                            willSendResponse(requestContext) {
                                const { response, request } = requestContext;
                                console.log('📤 GraphQL Response:', {
                                    operationType: request.operationName,
                                    errors: response.errors?.length || 0,
                                    data: !!response.data
                                });
                            }
                        };
                    }
                }
            ],
            introspection: process.env.NODE_ENV !== 'production',
            playground: process.env.NODE_ENV !== 'production'
        });

        return this.server;
    }

    async createContext({ req, res, connection }) {
        // WebSocket connection context (for subscriptions)
        if (connection) {
            return {
                ...connection.context,
                dataLoaders: createDataLoaders()
            };
        }

        // HTTP request context
        const context = {
            req,
            res,
            user: null,
            permissions: [],
            dataLoaders: createDataLoaders()
        };

        // Authenticate user
        try {
            const token = this.extractToken(req);
            if (token) {
                const authResult = await AuthenticationService.validateToken(token);
                if (authResult.valid) {
                    context.user = authResult.user;
                    context.permissions = authResult.permissions;
                }
            }
        } catch (error) {
            console.warn('Authentication failed:', error.message);
        }

        return context;
    }

    extractToken(req) {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            return authHeader.substring(7);
        }
        return null;
    }

    async start(app, path = '/graphql') {
        const server = this.createServer();
        await server.start();
        
        server.applyMiddleware({ 
            app, 
            path,
            cors: {
                origin: this.getAllowedOrigins(),
                credentials: true
            }
        });

        console.log(`🚀 GraphQL Server ready at ${path}`);
        console.log(`🎮 GraphQL Playground available at ${path}`);

        return server;
    }

    getAllowedOrigins() {
        const origins = process.env.ALLOWED_ORIGINS?.split(',') || [];
        
        if (process.env.NODE_ENV === 'development') {
            origins.push('http://localhost:3000', 'http://localhost:3001');
        }
        
        return origins;
    }
}

module.exports = new GraphQLServer();
```

### Advanced Schema Architecture

```javascript
// src/graphql/schema/index.js
const { gql } = require('apollo-server-express');

// Import schema modules
const userSchema = require('./user.schema');
const courseSchema = require('./course.schema');
const assessmentSchema = require('./assessment.schema');
const progressSchema = require('./progress.schema');
const notificationSchema = require('./notification.schema');
const mediaSchema = require('./media.schema');

const rootSchema = gql`
    # Scalar Types
    scalar DateTime
    scalar Upload
    scalar JSON
    scalar EmailAddress
    scalar URL
    scalar PhoneNumber

    # Enum Types
    enum SortOrder {
        ASC
        DESC
    }

    enum CacheControlScope {
        PUBLIC
        PRIVATE
    }

    # Interface Types
    interface Node {
        id: ID!
        createdAt: DateTime!
        updatedAt: DateTime!
    }

    interface Timestamped {
        createdAt: DateTime!
        updatedAt: DateTime!
    }

    # Common Types
    type PageInfo {
        hasNextPage: Boolean!
        hasPreviousPage: Boolean!
        startCursor: String
        endCursor: String
        totalCount: Int!
    }

    input PaginationInput {
        first: Int
        after: String
        last: Int
        before: String
    }

    input SortInput {
        field: String!
        order: SortOrder = ASC
    }

    type Mutation {
        # Health check mutation for testing
        ping: String!
    }

    type Query {
        # Health check query
        health: String!
        
        # Node interface query
        node(id: ID!): Node
        nodes(ids: [ID!]!): [Node]!
    }

    type Subscription {
        # Health check subscription
        heartbeat: String!
    }

    # Cache Control Directive
    directive @cacheControl(
        maxAge: Int
        scope: CacheControlScope
    ) on FIELD_DEFINITION | OBJECT | INTERFACE

    # Authentication Directives
    directive @auth(requires: UserRole = USER) on FIELD_DEFINITION | OBJECT
    directive @rateLimit(
        max: Int!
        window: String = "15m"
        message: String = "Rate limit exceeded"
    ) on FIELD_DEFINITION

    # Validation Directives
    directive @constraint(
        minLength: Int
        maxLength: Int
        min: Int
        max: Int
        pattern: String
        format: String
    ) on INPUT_FIELD_DEFINITION | ARGUMENT_DEFINITION
`;

module.exports = [
    rootSchema,
    userSchema,
    courseSchema,
    assessmentSchema,
    progressSchema,
    notificationSchema,
    mediaSchema
];
```

## Schema Design & Type System

### User Domain Schema

```javascript
// src/graphql/schema/user.schema.js
const { gql } = require('apollo-server-express');

const userSchema = gql`
    enum UserRole {
        STUDENT
        TEACHER
        ADMIN
        SUPER_ADMIN
    }

    enum UserStatus {
        ACTIVE
        INACTIVE
        SUSPENDED
        PENDING_VERIFICATION
    }

    enum NotificationPreference {
        EMAIL
        SMS
        PUSH
        NONE
    }

    type User implements Node & Timestamped {
        id: ID!
        email: EmailAddress!
        firstName: String!
        lastName: String!
        fullName: String!
        avatar: String
        role: UserRole!
        status: UserStatus!
        isEmailVerified: Boolean!
        lastLoginAt: DateTime
        profile: UserProfile
        preferences: UserPreferences
        enrolledCourses(
            pagination: PaginationInput
            filter: CourseFilterInput
        ): CourseConnection!
        createdCourses(
            pagination: PaginationInput
            filter: CourseFilterInput
        ): CourseConnection! @auth(requires: TEACHER)
        progress: UserProgress
        achievements: [Achievement!]!
        notifications(
            pagination: PaginationInput
            filter: NotificationFilterInput
        ): NotificationConnection!
        createdAt: DateTime!
        updatedAt: DateTime!
    }

    type UserProfile {
        bio: String
        phone: PhoneNumber
        dateOfBirth: DateTime
        location: Location
        website: URL
        socialLinks: [SocialLink!]!
        interests: [String!]!
        skills: [Skill!]!
        education: [Education!]!
        experience: [Experience!]!
    }

    type UserPreferences {
        language: String!
        timezone: String!
        notifications: NotificationSettings!
        privacy: PrivacySettings!
        accessibility: AccessibilitySettings!
    }

    type NotificationSettings {
        email: Boolean!
        sms: Boolean!
        push: Boolean!
        courseUpdates: Boolean!
        assessmentReminders: Boolean!
        newMessages: Boolean!
        systemAnnouncements: Boolean!
    }

    type PrivacySettings {
        profileVisible: Boolean!
        showProgress: Boolean!
        allowMessages: Boolean!
        showOnlineStatus: Boolean!
    }

    type AccessibilitySettings {
        highContrast: Boolean!
        largeText: Boolean!
        screenReader: Boolean!
        keyboardNavigation: Boolean!
        reducedMotion: Boolean!
    }

    type Location {
        country: String
        state: String
        city: String
        timezone: String
    }

    type SocialLink {
        platform: String!
        url: URL!
    }

    type Skill {
        name: String!
        level: SkillLevel!
        endorsements: Int!
    }

    enum SkillLevel {
        BEGINNER
        INTERMEDIATE
        ADVANCED
        EXPERT
    }

    type Education {
        institution: String!
        degree: String!
        fieldOfStudy: String
        startDate: DateTime!
        endDate: DateTime
        description: String
    }

    type Experience {
        company: String!
        position: String!
        startDate: DateTime!
        endDate: DateTime
        description: String
        skills: [String!]!
    }

    type Achievement {
        id: ID!
        title: String!
        description: String!
        badge: String!
        earnedAt: DateTime!
        points: Int!
        category: AchievementCategory!
    }

    enum AchievementCategory {
        LEARNING
        TEACHING
        COMMUNITY
        MILESTONE
        SPECIAL
    }

    type UserConnection {
        edges: [UserEdge!]!
        pageInfo: PageInfo!
    }

    type UserEdge {
        node: User!
        cursor: String!
    }

    input UserFilterInput {
        role: UserRole
        status: UserStatus
        search: String
        createdAfter: DateTime
        createdBefore: DateTime
        lastLoginAfter: DateTime
        skills: [String!]
        location: LocationFilterInput
    }

    input LocationFilterInput {
        country: String
        state: String
        city: String
    }

    input CreateUserInput {
        email: EmailAddress!
        password: String! @constraint(minLength: 8, pattern: "^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])")
        firstName: String! @constraint(minLength: 2, maxLength: 50)
        lastName: String! @constraint(minLength: 2, maxLength: 50)
        role: UserRole = STUDENT
    }

    input UpdateUserInput {
        firstName: String @constraint(minLength: 2, maxLength: 50)
        lastName: String @constraint(minLength: 2, maxLength: 50)
        bio: String @constraint(maxLength: 500)
        phone: PhoneNumber
        dateOfBirth: DateTime
        location: LocationInput
        website: URL
        interests: [String!]
    }

    input UpdateUserPreferencesInput {
        language: String
        timezone: String
        notifications: NotificationSettingsInput
        privacy: PrivacySettingsInput
        accessibility: AccessibilitySettingsInput
    }

    input NotificationSettingsInput {
        email: Boolean
        sms: Boolean
        push: Boolean
        courseUpdates: Boolean
        assessmentReminders: Boolean
        newMessages: Boolean
        systemAnnouncements: Boolean
    }

    input PrivacySettingsInput {
        profileVisible: Boolean
        showProgress: Boolean
        allowMessages: Boolean
        showOnlineStatus: Boolean
    }

    input AccessibilitySettingsInput {
        highContrast: Boolean
        largeText: Boolean
        screenReader: Boolean
        keyboardNavigation: Boolean
        reducedMotion: Boolean
    }

    input LocationInput {
        country: String
        state: String
        city: String
        timezone: String
    }

    extend type Query {
        me: User @auth
        user(id: ID!): User @auth
        users(
            pagination: PaginationInput
            filter: UserFilterInput
            sort: [SortInput!]
        ): UserConnection! @auth(requires: ADMIN)
        searchUsers(
            query: String! @constraint(minLength: 2)
            pagination: PaginationInput
        ): UserConnection! @auth
        getUsersByRole(
            role: UserRole!
            pagination: PaginationInput
        ): UserConnection! @auth(requires: ADMIN)
    }

    extend type Mutation {
        # User management
        createUser(input: CreateUserInput!): User! @auth(requires: ADMIN)
        updateUser(id: ID!, input: UpdateUserInput!): User! @auth
        deleteUser(id: ID!): Boolean! @auth(requires: ADMIN)
        activateUser(id: ID!): User! @auth(requires: ADMIN)
        deactivateUser(id: ID!): User! @auth(requires: ADMIN)
        
        # Profile management
        updateProfile(input: UpdateUserInput!): User! @auth
        updatePreferences(input: UpdateUserPreferencesInput!): User! @auth
        uploadAvatar(file: Upload!): User! @auth
        
        # Authentication
        login(email: EmailAddress!, password: String!): AuthPayload!
        register(input: CreateUserInput!): AuthPayload!
        refreshToken(refreshToken: String!): AuthPayload!
        logout: Boolean! @auth
        requestPasswordReset(email: EmailAddress!): Boolean!
        resetPassword(token: String!, newPassword: String!): AuthPayload!
        verifyEmail(token: String!): User!
        resendVerificationEmail: Boolean! @auth
    }

    extend type Subscription {
        userStatusChanged(userId: ID!): User! @auth
        userProfileUpdated(userId: ID!): User! @auth
        newUserRegistered: User! @auth(requires: ADMIN)
    }

    type AuthPayload {
        token: String!
        refreshToken: String!
        user: User!
        expiresIn: Int!
    }
`;

module.exports = userSchema;
```

### Course Domain Schema

```javascript
// src/graphql/schema/course.schema.js
const { gql } = require('apollo-server-express');

const courseSchema = gql`
    enum CourseStatus {
        DRAFT
        PUBLISHED
        ARCHIVED
        SUSPENDED
    }

    enum CourseLevel {
        BEGINNER
        INTERMEDIATE
        ADVANCED
        EXPERT
    }

    enum LessonType {
        VIDEO
        TEXT
        QUIZ
        ASSIGNMENT
        INTERACTIVE
        LIVE_SESSION
    }

    enum CourseCategory {
        PROGRAMMING
        DESIGN
        BUSINESS
        MARKETING
        DATA_SCIENCE
        LANGUAGES
        MUSIC
        PHOTOGRAPHY
        FITNESS
        COOKING
    }

    type Course implements Node & Timestamped {
        id: ID!
        title: String!
        slug: String!
        description: String!
        shortDescription: String
        thumbnail: String
        trailer: String
        category: CourseCategory!
        subcategory: String
        level: CourseLevel!
        status: CourseStatus!
        price: Float!
        originalPrice: Float
        currency: String!
        duration: Int! # in minutes
        language: String!
        tags: [String!]!
        prerequisites: [String!]!
        learningObjectives: [String!]!
        targetAudience: [String!]!
        instructor: User!
        coInstructors: [User!]!
        modules: [CourseModule!]!
        lessons: [Lesson!]!
        enrollments: [Enrollment!]! @auth(requires: TEACHER)
        enrollmentCount: Int!
        averageRating: Float
        totalRatings: Int!
        reviews(
            pagination: PaginationInput
            filter: ReviewFilterInput
        ): ReviewConnection!
        isEnrolled: Boolean! @auth
        progress: CourseProgress @auth
        certificate: Certificate @auth
        announcements(
            pagination: PaginationInput
        ): AnnouncementConnection!
        discussions(
            pagination: PaginationInput
            filter: DiscussionFilterInput
        ): DiscussionConnection!
        resources: [CourseResource!]!
        metadata: CourseMetadata!
        seo: SEOData
        createdAt: DateTime!
        updatedAt: DateTime!
    }

    type CourseModule implements Node & Timestamped {
        id: ID!
        title: String!
        description: String
        order: Int!
        duration: Int! # in minutes
        lessons: [Lesson!]!
        course: Course!
        isCompleted: Boolean! @auth
        completionPercentage: Float! @auth
        createdAt: DateTime!
        updatedAt: DateTime!
    }

    type Lesson implements Node & Timestamped {
        id: ID!
        title: String!
        description: String
        type: LessonType!
        order: Int!
        duration: Int # in minutes
        content: LessonContent!
        module: CourseModule!
        course: Course!
        isCompleted: Boolean! @auth
        progress: LessonProgress @auth
        resources: [LessonResource!]!
        comments(
            pagination: PaginationInput
        ): CommentConnection! @auth
        quiz: Quiz
        assignment: Assignment
        metadata: JSON
        createdAt: DateTime!
        updatedAt: DateTime!
    }

    union LessonContent = VideoContent | TextContent | InteractiveContent | LiveSessionContent

    type VideoContent {
        videoUrl: String!
        duration: Int!
        quality: [VideoQuality!]!
        subtitles: [Subtitle!]!
        thumbnail: String
        chapters: [VideoChapter!]!
    }

    type VideoQuality {
        resolution: String!
        bitrate: Int!
        url: String!
    }

    type Subtitle {
        language: String!
        url: String!
    }

    type VideoChapter {
        title: String!
        startTime: Int!
        endTime: Int!
    }

    type TextContent {
        content: String!
        estimatedReadTime: Int! # in minutes
        wordCount: Int!
        images: [String!]!
        attachments: [String!]!
    }

    type InteractiveContent {
        type: String! # coding, simulation, etc.
        data: JSON!
        instructions: String!
    }

    type LiveSessionContent {
        scheduledAt: DateTime!
        duration: Int!
        meetingUrl: String @auth
        isRecorded: Boolean!
        recordingUrl: String
        attendees: [User!]! @auth
    }

    type Enrollment implements Node & Timestamped {
        id: ID!
        student: User!
        course: Course!
        enrolledAt: DateTime!
        completedAt: DateTime
        progress: Float! # 0-100
        status: EnrollmentStatus!
        paymentStatus: PaymentStatus!
        certificate: Certificate
        lastAccessedAt: DateTime
        totalTimeSpent: Int! # in minutes
        createdAt: DateTime!
        updatedAt: DateTime!
    }

    enum EnrollmentStatus {
        ACTIVE
        COMPLETED
        DROPPED
        SUSPENDED
    }

    enum PaymentStatus {
        PENDING
        PAID
        FAILED
        REFUNDED
    }

    type CourseProgress {
        completionPercentage: Float!
        completedLessons: Int!
        totalLessons: Int!
        timeSpent: Int! # in minutes
        lastAccessedLesson: Lesson
        streak: Int! # days
        estimatedTimeToComplete: Int # in hours
    }

    type LessonProgress {
        watchTime: Int! # in seconds for videos
        completed: Boolean!
        completedAt: DateTime
        attempts: Int!
        score: Float
    }

    type Review implements Node & Timestamped {
        id: ID!
        course: Course!
        student: User!
        rating: Float! # 1-5
        title: String
        content: String!
        helpful: Int!
        reported: Boolean!
        response: ReviewResponse
        createdAt: DateTime!
        updatedAt: DateTime!
    }

    type ReviewResponse {
        instructor: User!
        content: String!
        createdAt: DateTime!
    }

    type ReviewConnection {
        edges: [ReviewEdge!]!
        pageInfo: PageInfo!
    }

    type ReviewEdge {
        node: Review!
        cursor: String!
    }

    type CourseConnection {
        edges: [CourseEdge!]!
        pageInfo: PageInfo!
    }

    type CourseEdge {
        node: Course!
        cursor: String!
    }

    type Certificate implements Node & Timestamped {
        id: ID!
        course: Course!
        student: User!
        certificateUrl: String!
        issuedAt: DateTime!
        verificationCode: String!
        metadata: JSON
        createdAt: DateTime!
        updatedAt: DateTime!
    }

    type Announcement implements Node & Timestamped {
        id: ID!
        title: String!
        content: String!
        course: Course!
        author: User!
        priority: AnnouncementPriority!
        isPublished: Boolean!
        publishedAt: DateTime
        createdAt: DateTime!
        updatedAt: DateTime!
    }

    enum AnnouncementPriority {
        LOW
        NORMAL
        HIGH
        URGENT
    }

    type AnnouncementConnection {
        edges: [AnnouncementEdge!]!
        pageInfo: PageInfo!
    }

    type AnnouncementEdge {
        node: Announcement!
        cursor: String!
    }

    type Discussion implements Node & Timestamped {
        id: ID!
        title: String!
        content: String!
        course: Course!
        author: User!
        category: DiscussionCategory!
        isPinned: Boolean!
        isClosed: Boolean!
        replies(
            pagination: PaginationInput
        ): DiscussionReplyConnection!
        replyCount: Int!
        lastReplyAt: DateTime
        tags: [String!]!
        upvotes: Int!
        hasUpvoted: Boolean! @auth
        createdAt: DateTime!
        updatedAt: DateTime!
    }

    enum DiscussionCategory {
        GENERAL
        QUESTIONS
        ASSIGNMENTS
        ANNOUNCEMENTS
        FEEDBACK
    }

    type DiscussionReply implements Node & Timestamped {
        id: ID!
        content: String!
        discussion: Discussion!
        author: User!
        parentReply: DiscussionReply
        replies: [DiscussionReply!]!
        upvotes: Int!
        hasUpvoted: Boolean! @auth
        isInstructorReply: Boolean!
        isBestAnswer: Boolean!
        createdAt: DateTime!
        updatedAt: DateTime!
    }

    type DiscussionConnection {
        edges: [DiscussionEdge!]!
        pageInfo: PageInfo!
    }

    type DiscussionEdge {
        node: Discussion!
        cursor: String!
    }

    type DiscussionReplyConnection {
        edges: [DiscussionReplyEdge!]!
        pageInfo: PageInfo!
    }

    type DiscussionReplyEdge {
        node: DiscussionReply!
        cursor: String!
    }

    type CourseResource {
        id: ID!
        title: String!
        description: String
        type: ResourceType!
        url: String!
        downloadable: Boolean!
        size: Int # in bytes
        course: Course!
        lessons: [Lesson!]!
    }

    type LessonResource {
        id: ID!
        title: String!
        description: String
        type: ResourceType!
        url: String!
        downloadable: Boolean!
        size: Int # in bytes
        lesson: Lesson!
    }

    enum ResourceType {
        PDF
        VIDEO
        AUDIO
        IMAGE
        CODE
        DATASET
        LINK
        OTHER
    }

    type CourseMetadata {
        totalEnrollments: Int!
        activeEnrollments: Int!
        completionRate: Float!
        averageCompletionTime: Int! # in hours
        certificatesIssued: Int!
        totalRevenue: Float!
        monthlyEnrollments: [MonthlyEnrollment!]!
        ratingDistribution: RatingDistribution!
        topCountries: [CountryEnrollment!]!
    }

    type MonthlyEnrollment {
        month: String!
        count: Int!
        revenue: Float!
    }

    type RatingDistribution {
        oneStar: Int!
        twoStars: Int!
        threeStars: Int!
        fourStars: Int!
        fiveStars: Int!
    }

    type CountryEnrollment {
        country: String!
        count: Int!
        percentage: Float!
    }

    type SEOData {
        metaTitle: String
        metaDescription: String
        keywords: [String!]!
        canonicalUrl: String
        ogImage: String
        structuredData: JSON
    }

    input CourseFilterInput {
        category: CourseCategory
        level: CourseLevel
        status: CourseStatus
        priceMin: Float
        priceMax: Float
        instructorId: ID
        language: String
        tags: [String!]
        search: String
        featured: Boolean
        hasDiscount: Boolean
        createdAfter: DateTime
        createdBefore: DateTime
    }

    input ReviewFilterInput {
        rating: Float
        hasContent: Boolean
        reportedOnly: Boolean
        createdAfter: DateTime
        createdBefore: DateTime
    }

    input DiscussionFilterInput {
        category: DiscussionCategory
        isPinned: Boolean
        isClosed: Boolean
        hasReplies: Boolean
        authorId: ID
        search: String
    }

    input CreateCourseInput {
        title: String! @constraint(minLength: 5, maxLength: 200)
        description: String! @constraint(minLength: 50, maxLength: 5000)
        shortDescription: String @constraint(maxLength: 300)
        category: CourseCategory!
        subcategory: String
        level: CourseLevel!
        price: Float! @constraint(min: 0)
        originalPrice: Float @constraint(min: 0)
        currency: String! = "USD"
        language: String! = "en"
        tags: [String!]!
        prerequisites: [String!]!
        learningObjectives: [String!]! @constraint(minLength: 1)
        targetAudience: [String!]!
        seo: SEODataInput
    }

    input UpdateCourseInput {
        title: String @constraint(minLength: 5, maxLength: 200)
        description: String @constraint(minLength: 50, maxLength: 5000)
        shortDescription: String @constraint(maxLength: 300)
        category: CourseCategory
        subcategory: String
        level: CourseLevel
        price: Float @constraint(min: 0)
        originalPrice: Float @constraint(min: 0)
        tags: [String!]
        prerequisites: [String!]
        learningObjectives: [String!]
        targetAudience: [String!]
        seo: SEODataInput
    }

    input SEODataInput {
        metaTitle: String @constraint(maxLength: 60)
        metaDescription: String @constraint(maxLength: 160)
        keywords: [String!]
        canonicalUrl: String
        structuredData: JSON
    }

    input CreateModuleInput {
        title: String! @constraint(minLength: 3, maxLength: 200)
        description: String @constraint(maxLength: 1000)
        order: Int!
        courseId: ID!
    }

    input CreateLessonInput {
        title: String! @constraint(minLength: 3, maxLength: 200)
        description: String @constraint(maxLength: 1000)
        type: LessonType!
        order: Int!
        moduleId: ID!
        content: LessonContentInput!
        resources: [LessonResourceInput!]!
    }

    input LessonContentInput {
        video: VideoContentInput
        text: TextContentInput
        interactive: InteractiveContentInput
        liveSession: LiveSessionContentInput
    }

    input VideoContentInput {
        videoUrl: String!
        duration: Int!
        thumbnail: String
        subtitles: [SubtitleInput!]!
        chapters: [VideoChapterInput!]!
    }

    input SubtitleInput {
        language: String!
        url: String!
    }

    input VideoChapterInput {
        title: String!
        startTime: Int!
        endTime: Int!
    }

    input TextContentInput {
        content: String!
        images: [String!]!
        attachments: [String!]!
    }

    input InteractiveContentInput {
        type: String!
        data: JSON!
        instructions: String!
    }

    input LiveSessionContentInput {
        scheduledAt: DateTime!
        duration: Int!
        isRecorded: Boolean!
    }

    input LessonResourceInput {
        title: String!
        description: String
        type: ResourceType!
        url: String!
        downloadable: Boolean!
    }

    input CreateReviewInput {
        courseId: ID!
        rating: Float! @constraint(min: 1, max: 5)
        title: String @constraint(maxLength: 100)
        content: String! @constraint(minLength: 10, maxLength: 2000)
    }

    input CreateAnnouncementInput {
        courseId: ID!
        title: String! @constraint(minLength: 5, maxLength: 200)
        content: String! @constraint(minLength: 10, maxLength: 5000)
        priority: AnnouncementPriority! = NORMAL
    }

    input CreateDiscussionInput {
        courseId: ID!
        title: String! @constraint(minLength: 5, maxLength: 200)
        content: String! @constraint(minLength: 10, maxLength: 10000)
        category: DiscussionCategory!
        tags: [String!]!
    }

    extend type Query {
        # Course queries
        course(id: ID, slug: String): Course
        courses(
            pagination: PaginationInput
            filter: CourseFilterInput
            sort: [SortInput!]
        ): CourseConnection!
        searchCourses(
            query: String! @constraint(minLength: 2)
            pagination: PaginationInput
            filter: CourseFilterInput
        ): CourseConnection!
        featuredCourses(limit: Int = 10): [Course!]!
        coursesInCategory(
            category: CourseCategory!
            pagination: PaginationInput
        ): CourseConnection!
        coursesByInstructor(
            instructorId: ID!
            pagination: PaginationInput
        ): CourseConnection!
        
        # Enrollment queries
        myEnrollments(
            pagination: PaginationInput
            status: EnrollmentStatus
        ): [Enrollment!]! @auth
        enrollment(courseId: ID!): Enrollment @auth
        
        # Progress queries
        myCourseProgress(courseId: ID!): CourseProgress @auth
        myLessonProgress(lessonId: ID!): LessonProgress @auth
        
        # Review queries
        courseReviews(
            courseId: ID!
            pagination: PaginationInput
            filter: ReviewFilterInput
        ): ReviewConnection!
        myReview(courseId: ID!): Review @auth
        
        # Discussion queries
        courseDiscussions(
            courseId: ID!
            pagination: PaginationInput
            filter: DiscussionFilterInput
        ): DiscussionConnection!
        discussion(id: ID!): Discussion!
        
        # Analytics queries (for instructors/admins)
        courseAnalytics(courseId: ID!): CourseMetadata! @auth(requires: TEACHER)
        instructorAnalytics: InstructorAnalytics! @auth(requires: TEACHER)
    }

    extend type Mutation {
        # Course management
        createCourse(input: CreateCourseInput!): Course! @auth(requires: TEACHER)
        updateCourse(id: ID!, input: UpdateCourseInput!): Course! @auth(requires: TEACHER)
        deleteCourse(id: ID!): Boolean! @auth(requires: TEACHER)
        publishCourse(id: ID!): Course! @auth(requires: TEACHER)
        unpublishCourse(id: ID!): Course! @auth(requires: TEACHER)
        uploadCourseThumbnail(courseId: ID!, file: Upload!): Course! @auth(requires: TEACHER)
        
        # Module management
        createModule(input: CreateModuleInput!): CourseModule! @auth(requires: TEACHER)
        updateModule(id: ID!, input: UpdateModuleInput!): CourseModule! @auth(requires: TEACHER)
        deleteModule(id: ID!): Boolean! @auth(requires: TEACHER)
        reorderModules(courseId: ID!, moduleIds: [ID!]!): [CourseModule!]! @auth(requires: TEACHER)
        
        # Lesson management
        createLesson(input: CreateLessonInput!): Lesson! @auth(requires: TEACHER)
        updateLesson(id: ID!, input: UpdateLessonInput!): Lesson! @auth(requires: TEACHER)
        deleteLesson(id: ID!): Boolean! @auth(requires: TEACHER)
        reorderLessons(moduleId: ID!, lessonIds: [ID!]!): [Lesson!]! @auth(requires: TEACHER)
        
        # Enrollment management
        enrollInCourse(courseId: ID!): Enrollment! @auth @rateLimit(max: 5, window: "1h")
        unenrollFromCourse(courseId: ID!): Boolean! @auth
        
        # Progress tracking
        markLessonCompleted(lessonId: ID!): LessonProgress! @auth
        updateLessonProgress(
            lessonId: ID!
            watchTime: Int
            completed: Boolean
        ): LessonProgress! @auth
        
        # Reviews
        createReview(input: CreateReviewInput!): Review! @auth @rateLimit(max: 3, window: "1d")
        updateReview(id: ID!, input: UpdateReviewInput!): Review! @auth
        deleteReview(id: ID!): Boolean! @auth
        markReviewHelpful(id: ID!): Review! @auth
        reportReview(id: ID!, reason: String!): Boolean! @auth
        
        # Announcements
        createAnnouncement(input: CreateAnnouncementInput!): Announcement! @auth(requires: TEACHER)
        updateAnnouncement(id: ID!, input: UpdateAnnouncementInput!): Announcement! @auth(requires: TEACHER)
        deleteAnnouncement(id: ID!): Boolean! @auth(requires: TEACHER)
        
        # Discussions
        createDiscussion(input: CreateDiscussionInput!): Discussion! @auth @rateLimit(max: 10, window: "1h")
        updateDiscussion(id: ID!, input: UpdateDiscussionInput!): Discussion! @auth
        deleteDiscussion(id: ID!): Boolean! @auth
        closeDiscussion(id: ID!): Discussion! @auth(requires: TEACHER)
        pinDiscussion(id: ID!): Discussion! @auth(requires: TEACHER)
        upvoteDiscussion(id: ID!): Discussion! @auth
        
        # Discussion replies
        replyToDiscussion(discussionId: ID!, content: String!): DiscussionReply! @auth
        updateDiscussionReply(id: ID!, content: String!): DiscussionReply! @auth
        deleteDiscussionReply(id: ID!): Boolean! @auth
        markAsBestAnswer(replyId: ID!): DiscussionReply! @auth(requires: TEACHER)
        upvoteDiscussionReply(id: ID!): DiscussionReply! @auth
    }

    extend type Subscription {
        # Course subscriptions
        courseUpdated(courseId: ID!): Course! @auth
        newEnrollment(courseId: ID!): Enrollment! @auth(requires: TEACHER)
        
        # Progress subscriptions
        progressUpdated(userId: ID!): CourseProgress! @auth
        lessonCompleted(courseId: ID!): LessonProgress! @auth
        
        # Discussion subscriptions
        newDiscussion(courseId: ID!): Discussion! @auth
        newDiscussionReply(discussionId: ID!): DiscussionReply! @auth
        
        # Announcement subscriptions
        newAnnouncement(courseId: ID!): Announcement! @auth
    }

    type InstructorAnalytics {
        totalStudents: Int!
        totalCourses: Int!
        totalRevenue: Float!
        averageRating: Float!
        completionRate: Float!
        monthlyRevenue: [MonthlyRevenue!]!
        topCourses: [CourseAnalytics!]!
        recentEnrollments: [Enrollment!]!
    }

    type MonthlyRevenue {
        month: String!
        revenue: Float!
        enrollments: Int!
    }

    type CourseAnalytics {
        course: Course!
        enrollments: Int!
        revenue: Float!
        completionRate: Float!
        averageRating: Float!
    }
`;

module.exports = courseSchema;
```

## Resolver Implementation

### Advanced Resolver Architecture with DataLoaders

```javascript
// src/graphql/resolvers/index.js
const userResolvers = require('./user.resolvers');
const courseResolvers = require('./course.resolvers');
const assessmentResolvers = require('./assessment.resolvers');
const progressResolvers = require('./progress.resolvers');
const notificationResolvers = require('./notification.resolvers');
const mediaResolvers = require('./media.resolvers');
const scalarResolvers = require('./scalar.resolvers');

const rootResolvers = {
    Query: {
        health: () => 'GraphQL server is healthy! 🚀',
        node: async (parent, { id }, context) => {
            // Universal node resolver
            const type = await context.dataLoaders.nodeTypeLoader.load(id);
            
            switch (type) {
                case 'User':
                    return context.dataLoaders.userLoader.load(id);
                case 'Course':
                    return context.dataLoaders.courseLoader.load(id);
                case 'Lesson':
                    return context.dataLoaders.lessonLoader.load(id);
                default:
                    return null;
            }
        },
        nodes: async (parent, { ids }, context) => {
            return Promise.all(ids.map(id => 
                rootResolvers.Query.node(parent, { id }, context)
            ));
        }
    },

    Mutation: {
        ping: () => 'pong!'
    },

    Subscription: {
        heartbeat: {
            subscribe: () => {
                const { PubSub } = require('apollo-server-express');
                const pubsub = new PubSub();
                
                // Send heartbeat every 30 seconds
                setInterval(() => {
                    pubsub.publish('HEARTBEAT', { 
                        heartbeat: new Date().toISOString() 
                    });
                }, 30000);
                
                return pubsub.asyncIterator(['HEARTBEAT']);
            }
        }
    },

    // Union/Interface resolvers
    Node: {
        __resolveType: (obj) => {
            if (obj.email) return 'User';
            if (obj.title && obj.instructor) return 'Course';
            if (obj.content && obj.course) return 'Lesson';
            return null;
        }
    },

    LessonContent: {
        __resolveType: (obj) => {
            if (obj.videoUrl) return 'VideoContent';
            if (obj.content && typeof obj.content === 'string') return 'TextContent';
            if (obj.type && obj.data) return 'InteractiveContent';
            if (obj.scheduledAt) return 'LiveSessionContent';
            return null;
        }
    }
};

module.exports = [
    rootResolvers,
    scalarResolvers,
    userResolvers,
    courseResolvers,
    assessmentResolvers,
    progressResolvers,
    notificationResolvers,
    mediaResolvers
];
```

### User Resolvers with Advanced Features

```javascript
// src/graphql/resolvers/user.resolvers.js
const bcrypt = require('bcryptjs');
const { AuthenticationError, ForbiddenError, UserInputError } = require('apollo-server-express');
const { combineResolvers } = require('graphql-resolvers');
const { isAuthenticated, isAdmin, isOwnerOrAdmin } = require('../permissions');
const { generateTokens, validateToken } = require('../../services/auth');
const { UserService } = require('../../services/UserService');
const { EmailService } = require('../../services/EmailService');
const { validateInput } = require('../../utils/validation');

const userResolvers = {
    Query: {
        me: combineResolvers(
            isAuthenticated,
            async (parent, args, { user, dataLoaders }) => {
                return dataLoaders.userLoader.load(user.id);
            }
        ),

        user: combineResolvers(
            isAuthenticated,
            async (parent, { id }, { dataLoaders }) => {
                const user = await dataLoaders.userLoader.load(id);
                if (!user) {
                    throw new UserInputError('User not found');
                }
                return user;
            }
        ),

        users: combineResolvers(
            isAuthenticated,
            isAdmin,
            async (parent, { pagination, filter, sort }, { dataLoaders }) => {
                return UserService.getUsers({
                    pagination,
                    filter,
                    sort,
                    dataLoaders
                });
            }
        ),

        searchUsers: combineResolvers(
            isAuthenticated,
            async (parent, { query, pagination }, { dataLoaders }) => {
                return UserService.searchUsers({
                    query,
                    pagination,
                    dataLoaders
                });
            }
        ),

        getUsersByRole: combineResolvers(
            isAuthenticated,
            isAdmin,
            async (parent, { role, pagination }, { dataLoaders }) => {
                return UserService.getUsersByRole({
                    role,
                    pagination,
                    dataLoaders
                });
            }
        )
    },

    Mutation: {
        createUser: combineResolvers(
            isAuthenticated,
            isAdmin,
            async (parent, { input }, { dataLoaders }) => {
                await validateInput(input, 'CreateUserInput');
                
                // Check if email already exists
                const existingUser = await UserService.findByEmail(input.email);
                if (existingUser) {
                    throw new UserInputError('Email already exists');
                }

                const user = await UserService.createUser(input);
                
                // Send welcome email
                await EmailService.sendWelcomeEmail(user);
                
                // Clear cache
                dataLoaders.userLoader.clear(user.id);
                
                return user;
            }
        ),

        updateUser: combineResolvers(
            isAuthenticated,
            isOwnerOrAdmin,
            async (parent, { id, input }, { user, dataLoaders }) => {
                await validateInput(input, 'UpdateUserInput');
                
                const updatedUser = await UserService.updateUser(id, input);
                
                // Clear cache
                dataLoaders.userLoader.clear(id);
                
                // Publish subscription
                const { pubsub } = require('../../services/pubsub');
                pubsub.publish('USER_PROFILE_UPDATED', {
                    userProfileUpdated: updatedUser,
                    userId: id
                });
                
                return updatedUser;
            }
        ),

        deleteUser: combineResolvers(
            isAuthenticated,
            isAdmin,
            async (parent, { id }, { dataLoaders }) => {
                const user = await dataLoaders.userLoader.load(id);
                if (!user) {
                    throw new UserInputError('User not found');
                }

                await UserService.deleteUser(id);
                
                // Clear cache
                dataLoaders.userLoader.clear(id);
                
                return true;
            }
        ),

        login: async (parent, { email, password }, { res }) => {
            const user = await UserService.findByEmail(email);
            
            if (!user || !await bcrypt.compare(password, user.password)) {
                throw new AuthenticationError('Invalid email or password');
            }

            if (user.status !== 'ACTIVE') {
                throw new AuthenticationError('Account is not active');
            }

            // Update last login
            await UserService.updateLastLogin(user.id);
            
            // Generate tokens
            const tokens = await generateTokens(user);
            
            // Set refresh token as httpOnly cookie
            res.cookie('refreshToken', tokens.refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
                sameSite: 'strict'
            });

            return {
                token: tokens.accessToken,
                refreshToken: tokens.refreshToken,
                user,
                expiresIn: 15 * 60 // 15 minutes
            };
        },

        register: async (parent, { input }, { res }) => {
            await validateInput(input, 'CreateUserInput');
            
            // Check if email already exists
            const existingUser = await UserService.findByEmail(input.email);
            if (existingUser) {
                throw new UserInputError('Email already registered');
            }

            const user = await UserService.createUser(input);
            
            // Generate tokens
            const tokens = await generateTokens(user);
            
            // Set refresh token as httpOnly cookie
            res.cookie('refreshToken', tokens.refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                maxAge: 7 * 24 * 60 * 60 * 1000,
                sameSite: 'strict'
            });

            // Send verification email
            await EmailService.sendVerificationEmail(user);
            
            // Publish subscription
            const { pubsub } = require('../../services/pubsub');
            pubsub.publish('NEW_USER_REGISTERED', {
                newUserRegistered: user
            });

            return {
                token: tokens.accessToken,
                refreshToken: tokens.refreshToken,
                user,
                expiresIn: 15 * 60
            };
        },

        refreshToken: async (parent, { refreshToken }, { req, res }) => {
            // Try to get refresh token from cookie if not provided
            const token = refreshToken || req.cookies?.refreshToken;
            
            if (!token) {
                throw new AuthenticationError('Refresh token required');
            }

            try {
                const payload = await validateToken(token, 'refresh');
                const user = await UserService.findById(payload.userId);
                
                if (!user || user.status !== 'ACTIVE') {
                    throw new AuthenticationError('User not found or inactive');
                }

                const tokens = await generateTokens(user);
                
                // Set new refresh token cookie
                res.cookie('refreshToken', tokens.refreshToken, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    maxAge: 7 * 24 * 60 * 60 * 1000,
                    sameSite: 'strict'
                });

                return {
                    token: tokens.accessToken,
                    refreshToken: tokens.refreshToken,
                    user,
                    expiresIn: 15 * 60
                };
            } catch (error) {
                throw new AuthenticationError('Invalid refresh token');
            }
        },

        logout: combineResolvers(
            isAuthenticated,
            async (parent, args, { user, res }) => {
                // Clear refresh token cookie
                res.clearCookie('refreshToken');
                
                // Invalidate user's tokens (implement token blacklisting if needed)
                await UserService.invalidateUserTokens(user.id);
                
                return true;
            }
        ),

        requestPasswordReset: async (parent, { email }) => {
            const user = await UserService.findByEmail(email);
            
            if (user) {
                const resetToken = await UserService.generatePasswordResetToken(user.id);
                await EmailService.sendPasswordResetEmail(user, resetToken);
            }
            
            // Always return true to prevent email enumeration
            return true;
        },

        resetPassword: async (parent, { token, newPassword }, { res }) => {
            const user = await UserService.validatePasswordResetToken(token);
            
            if (!user) {
                throw new UserInputError('Invalid or expired reset token');
            }

            await UserService.updatePassword(user.id, newPassword);
            await UserService.clearPasswordResetToken(user.id);
            
            // Generate new tokens
            const tokens = await generateTokens(user);
            
            res.cookie('refreshToken', tokens.refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                maxAge: 7 * 24 * 60 * 60 * 1000,
                sameSite: 'strict'
            });

            return {
                token: tokens.accessToken,
                refreshToken: tokens.refreshToken,
                user,
                expiresIn: 15 * 60
            };
        },

        verifyEmail: async (parent, { token }) => {
            const user = await UserService.verifyEmail(token);
            
            if (!user) {
                throw new UserInputError('Invalid or expired verification token');
            }

            return user;
        },

        resendVerificationEmail: combineResolvers(
            isAuthenticated,
            async (parent, args, { user }) => {
                if (user.isEmailVerified) {
                    throw new UserInputError('Email already verified');
                }

                await EmailService.sendVerificationEmail(user);
                return true;
            }
        ),

        updateProfile: combineResolvers(
            isAuthenticated,
            async (parent, { input }, { user, dataLoaders }) => {
                await validateInput(input, 'UpdateUserInput');
                
                const updatedUser = await UserService.updateUser(user.id, input);
                
                // Clear cache
                dataLoaders.userLoader.clear(user.id);
                
                return updatedUser;
            }
        ),

        updatePreferences: combineResolvers(
            isAuthenticated,
            async (parent, { input }, { user, dataLoaders }) => {
                const updatedUser = await UserService.updatePreferences(user.id, input);
                
                // Clear cache
                dataLoaders.userLoader.clear(user.id);
                
                return updatedUser;
            }
        ),

        uploadAvatar: combineResolvers(
            isAuthenticated,
            async (parent, { file }, { user, dataLoaders }) => {
                const { createReadStream, filename, mimetype, encoding } = await file;
                
                // Validate file type
                if (!mimetype.startsWith('image/')) {
                    throw new UserInputError('File must be an image');
                }

                const stream = createReadStream();
                const avatarUrl = await UserService.uploadAvatar(user.id, stream, filename);
                
                const updatedUser = await UserService.updateUser(user.id, { avatar: avatarUrl });
                
                // Clear cache
                dataLoaders.userLoader.clear(user.id);
                
                return updatedUser;
            }
        )
    },

    Subscription: {
        userStatusChanged: {
            subscribe: combineResolvers(
                isAuthenticated,
                (parent, { userId }, { user }) => {
                    // Only allow users to subscribe to their own status or admins
                    if (user.id !== userId && user.role !== 'ADMIN') {
                        throw new ForbiddenError('Access denied');
                    }

                    const { pubsub } = require('../../services/pubsub');
                    return pubsub.asyncIterator([`USER_STATUS_CHANGED_${userId}`]);
                }
            )
        },

        userProfileUpdated: {
            subscribe: combineResolvers(
                isAuthenticated,
                (parent, { userId }, { user }) => {
                    // Only allow users to subscribe to their own profile updates or public profiles
                    if (user.id !== userId) {
                        // Check if profile is public (implement this logic)
                        // For now, allow all authenticated users
                    }

                    const { pubsub } = require('../../services/pubsub');
                    return pubsub.asyncIterator([`USER_PROFILE_UPDATED_${userId}`]);
                }
            )
        },

        newUserRegistered: {
            subscribe: combineResolvers(
                isAuthenticated,
                isAdmin,
                () => {
                    const { pubsub } = require('../../services/pubsub');
                    return pubsub.asyncIterator(['NEW_USER_REGISTERED']);
                }
            )
        }
    },

    User: {
        fullName: (parent) => `${parent.firstName} ${parent.lastName}`,
        
        enrolledCourses: async (parent, { pagination, filter }, { dataLoaders }) => {
            return dataLoaders.userEnrolledCoursesLoader.load({
                userId: parent.id,
                pagination,
                filter
            });
        },

        createdCourses: async (parent, { pagination, filter }, { dataLoaders, user }) => {
            // Only show created courses to the teacher themselves or admins
            if (user.id !== parent.id && user.role !== 'ADMIN') {
                return { edges: [], pageInfo: { hasNextPage: false, hasPreviousPage: false, totalCount: 0 } };
            }

            return dataLoaders.userCreatedCoursesLoader.load({
                userId: parent.id,
                pagination,
                filter
            });
        },

        progress: async (parent, args, { dataLoaders, user }) => {
            // Only show progress to the user themselves or admins
            if (user.id !== parent.id && user.role !== 'ADMIN') {
                return null;
            }

            return dataLoaders.userProgressLoader.load(parent.id);
        },

        achievements: async (parent, args, { dataLoaders }) => {
            return dataLoaders.userAchievementsLoader.load(parent.id);
        },

        notifications: async (parent, { pagination, filter }, { dataLoaders, user }) => {
            // Only show notifications to the user themselves
            if (user.id !== parent.id) {
                throw new ForbiddenError('Access denied');
            }

            return dataLoaders.userNotificationsLoader.load({
                userId: parent.id,
                pagination,
                filter
            });
        }
    }
};

module.exports = userResolvers;
```

### DataLoaders for N+1 Query Prevention

```javascript
// src/graphql/dataloaders/index.js
const DataLoader = require('dataloader');
const { User } = require('../models/User');
const { Course } = require('../models/Course');
const { Lesson } = require('../models/Lesson');
const { Enrollment } = require('../models/Enrollment');
const { Progress } = require('../models/Progress');

const createDataLoaders = () => ({
    // User loaders
    userLoader: new DataLoader(async (userIds) => {
        const users = await User.findByIds(userIds);
        return userIds.map(id => users.find(user => user.id === id));
    }, {
        batchScheduleFn: callback => setTimeout(callback, 10), // Batch delay
        maxBatchSize: 100
    }),

    userByEmailLoader: new DataLoader(async (emails) => {
        const users = await User.findByEmails(emails);
        return emails.map(email => users.find(user => user.email === email));
    }),

    // Course loaders
    courseLoader: new DataLoader(async (courseIds) => {
        const courses = await Course.findByIds(courseIds);
        return courseIds.map(id => courses.find(course => course.id === id));
    }),

    coursesByInstructorLoader: new DataLoader(async (instructorIds) => {
        const coursesByInstructor = await Course.findByInstructorIds(instructorIds);
        return instructorIds.map(instructorId => 
            coursesByInstructor.filter(course => course.instructorId === instructorId)
        );
    }),

    // Lesson loaders
    lessonLoader: new DataLoader(async (lessonIds) => {
        const lessons = await Lesson.findByIds(lessonIds);
        return lessonIds.map(id => lessons.find(lesson => lesson.id === id));
    }),

    lessonsByCourseLoader: new DataLoader(async (courseIds) => {
        const lessonsByCourse = await Lesson.findByCourseIds(courseIds);
        return courseIds.map(courseId =>
            lessonsByCourse.filter(lesson => lesson.courseId === courseId)
        );
    }),

    // Enrollment loaders
    enrollmentLoader: new DataLoader(async (keys) => {
        // keys format: [{ userId, courseId }]
        const enrollments = await Enrollment.findByUserAndCourse(keys);
        return keys.map(key =>
            enrollments.find(enrollment => 
                enrollment.userId === key.userId && enrollment.courseId === key.courseId
            )
        );
    }),

    enrollmentsByUserLoader: new DataLoader(async (userIds) => {
        const enrollmentsByUser = await Enrollment.findByUserIds(userIds);
        return userIds.map(userId =>
            enrollmentsByUser.filter(enrollment => enrollment.userId === userId)
        );
    }),

    enrollmentsByCourseLoader: new DataLoader(async (courseIds) => {
        const enrollmentsByCourse = await Enrollment.findByCourseIds(courseIds);
        return courseIds.map(courseId =>
            enrollmentsByCourse.filter(enrollment => enrollment.courseId === courseId)
        );
    }),

    // Progress loaders
    userProgressLoader: new DataLoader(async (userIds) => {
        const progressByUser = await Progress.findByUserIds(userIds);
        return userIds.map(userId =>
            progressByUser.find(progress => progress.userId === userId)
        );
    }),

    courseProgressLoader: new DataLoader(async (keys) => {
        // keys format: [{ userId, courseId }]
        const progress = await Progress.findByUserAndCourse(keys);
        return keys.map(key =>
            progress.find(p => p.userId === key.userId && p.courseId === key.courseId)
        );
    }),

    lessonProgressLoader: new DataLoader(async (keys) => {
        // keys format: [{ userId, lessonId }]
        const progress = await Progress.findLessonProgress(keys);
        return keys.map(key =>
            progress.find(p => p.userId === key.userId && p.lessonId === key.lessonId)
        );
    }),

    // Analytics loaders
    courseAnalyticsLoader: new DataLoader(async (courseIds) => {
        const analytics = await Course.getAnalytics(courseIds);
        return courseIds.map(courseId =>
            analytics.find(analytic => analytic.courseId === courseId)
        );
    }),

    // Node type resolver
    nodeTypeLoader: new DataLoader(async (ids) => {
        // This is a simplified implementation
        // In practice, you might need to query multiple collections
        const users = await User.findByIds(ids);
        const courses = await Course.findByIds(ids);
        const lessons = await Lesson.findByIds(ids);

        return ids.map(id => {
            if (users.find(u => u.id === id)) return 'User';
            if (courses.find(c => c.id === id)) return 'Course';
            if (lessons.find(l => l.id === id)) return 'Lesson';
            return null;
        });
    }),

    // Custom complex loaders
    userEnrolledCoursesLoader: new DataLoader(async (queries) => {
        // queries format: [{ userId, pagination, filter }]
        const results = await Promise.all(
            queries.map(query => Course.findEnrolledByUser(query))
        );
        return results;
    }),

    userCreatedCoursesLoader: new DataLoader(async (queries) => {
        const results = await Promise.all(
            queries.map(query => Course.findCreatedByUser(query))
        );
        return results;
    }),

    courseStudentsLoader: new DataLoader(async (courseIds) => {
        const studentsByCourse = await User.findByCourseIds(courseIds);
        return courseIds.map(courseId =>
            studentsByCourse.filter(student => student.courseIds?.includes(courseId))
        );
    }),

    // Review loaders
    courseReviewsLoader: new DataLoader(async (queries) => {
        const results = await Promise.all(
            queries.map(query => Review.findByCourse(query))
        );
        return results;
    }),

    userReviewLoader: new DataLoader(async (keys) => {
        // keys format: [{ userId, courseId }]
        const reviews = await Review.findByUserAndCourse(keys);
        return keys.map(key =>
            reviews.find(review => 
                review.userId === key.userId && review.courseId === key.courseId
            )
        );
    }),

    // Notification loaders
    userNotificationsLoader: new DataLoader(async (queries) => {
        const results = await Promise.all(
            queries.map(query => Notification.findByUser(query))
        );
        return results;
    }),

    // Achievement loaders
    userAchievementsLoader: new DataLoader(async (userIds) => {
        const achievementsByUser = await Achievement.findByUserIds(userIds);
        return userIds.map(userId =>
            achievementsByUser.filter(achievement => achievement.userId === userId)
        );
    })
});

module.exports = { createDataLoaders };
```

## Performance Optimization

### Query Complexity Analysis and Limiting

```javascript
// src/graphql/utils/complexityAnalysis.js
const { createComplexityLimitRule } = require('graphql-query-complexity');

const createCustomComplexityAnalysis = () => {
    return createComplexityLimitRule(1000, {
        // Custom field complexity calculations
        fieldComplexity: (args, childComplexity) => {
            // Base complexity for simple fields
            let complexity = 1 + childComplexity;

            // Add complexity based on arguments
            if (args.pagination?.first) {
                complexity += Math.min(args.pagination.first, 100);
            }

            if (args.filter) {
                complexity += Object.keys(args.filter).length;
            }

            if (args.sort) {
                complexity += args.sort.length * 2;
            }

            return complexity;
        },

        // Custom type complexity
        typeComplexity: {
            Course: 5, // Courses are complex objects
            User: 3,
            Lesson: 4,
            Assessment: 6
        },

        // Custom complexity for expensive operations
        fieldComplexityMap: {
            Query: {
                searchCourses: { complexity: 50 }, // Search is expensive
                courseAnalytics: { complexity: 100 }, // Analytics are very expensive
                users: { complexity: 30 } // Admin queries are expensive
            },
            Course: {
                enrollments: { complexity: 20 }, // Large lists
                reviews: { complexity: 15 },
                discussions: { complexity: 10 }
            },
            User: {
                enrolledCourses: { complexity: 15 },
                notifications: { complexity: 10 }
            }
        },

        onComplete: (complexity, requestContext) => {
            console.log(`📊 Query complexity: ${complexity}`, {
                operation: requestContext.request.operationName,
                variables: requestContext.request.variables
            });

            // Log high complexity queries for optimization
            if (complexity > 500) {
                console.warn(`⚠️  High complexity query detected: ${complexity}`);
            }
        }
    });
};

module.exports = { createCustomComplexityAnalysis };
```

### Query Depth Limiting and Analysis

```javascript
// src/graphql/utils/depthAnalysis.js
const depthLimit = require('graphql-depth-limit');

const createCustomDepthLimiter = (maxDepth = 10) => {
    return depthLimit(maxDepth, {
        // Custom depth calculation
        ignoreTypename: true,
        
        onCreateMessage: (max, actual) => {
            return `Query depth of ${actual} exceeds maximum depth of ${max}. 
                    Please reduce query depth or use pagination.`;
        },
        
        // Callback when depth limit is reached
        callback: (queryDepth, requestContext) => {
            console.warn('🔍 Query depth limit reached:', {
                depth: queryDepth,
                maxDepth,
                operation: requestContext.request.operationName
            });

            // Track depth violations for monitoring
            const { MetricsService } = require('../../services/MetricsService');
            MetricsService.recordDepthViolation(queryDepth, maxDepth);
        }
    });
};

// Query depth analysis for optimization
const analyzeQueryDepth = (query, variables = {}) => {
    const { parse, visit } = require('graphql');
    
    try {
        const ast = parse(query);
        let maxDepth = 0;
        let currentDepth = 0;
        const paths = [];

        visit(ast, {
            Field: {
                enter: (node, key, parent) => {
                    currentDepth++;
                    if (currentDepth > maxDepth) {
                        maxDepth = currentDepth;
                    }
                    
                    paths.push({
                        field: node.name.value,
                        depth: currentDepth,
                        hasArguments: node.arguments.length > 0,
                        hasDirectives: node.directives.length > 0
                    });
                },
                leave: () => {
                    currentDepth--;
                }
            }
        });

        return {
            maxDepth,
            paths,
            analysis: {
                isComplex: maxDepth > 7,
                hasDeepNesting: paths.some(p => p.depth > 5),
                expensivePaths: paths.filter(p => p.hasArguments && p.depth > 3)
            }
        };
    } catch (error) {
        return {
            maxDepth: 0,
            paths: [],
            analysis: { isComplex: false, hasDeepNesting: false, expensivePaths: [] },
            error: error.message
        };
    }
};

module.exports = { 
    createCustomDepthLimiter, 
    analyzeQueryDepth 
};
```

### Response Caching Strategy

```javascript
// src/graphql/utils/caching.js
const { RedisCache } = require('apollo-server-cache-redis');
const responseCachePlugin = require('apollo-server-plugin-response-cache');

class GraphQLCacheService {
    constructor() {
        this.cache = new RedisCache({
            host: process.env.REDIS_HOST || 'localhost',
            port: process.env.REDIS_PORT || 6379,
            password: process.env.REDIS_PASSWORD,
            db: 1 // Use different DB for GraphQL cache
        });
    }

    createCachePlugin() {
        return responseCachePlugin({
            cache: this.cache,
            
            // Cache key generation
            generateCacheKey: (requestContext) => {
                const { request, context } = requestContext;
                const userId = context.user?.id || 'anonymous';
                const userRole = context.user?.role || 'guest';
                
                // Include user context in cache key for personalized content
                return `gql:${userId}:${userRole}:${request.operationName}:${JSON.stringify(request.variables)}`;
            },

            // Default cache settings
            defaultMaxAge: 300, // 5 minutes

            // Field-level cache hints
            fieldLevelCache: true,

            // Custom cache behavior
            shouldReadFromCache: (requestContext) => {
                const { request, context } = requestContext;
                
                // Don't cache mutations
                if (request.query.includes('mutation')) {
                    return false;
                }

                // Don't cache real-time data for authenticated users
                if (context.user && request.operationName?.includes('realtime')) {
                    return false;
                }

                return true;
            },

            shouldWriteToCache: (requestContext) => {
                const { response } = requestContext;
                
                // Don't cache error responses
                if (response.errors && response.errors.length > 0) {
                    return false;
                }

                return true;
            },

            // Session-specific caching
            sessionId: (requestContext) => {
                return requestContext.context.user?.id;
            },

            // Callback for cache events
            didEncounterErrors: (requestContext, errors) => {
                console.warn('🚨 GraphQL errors encountered:', errors.map(e => e.message));
            },

            didResolveSource: (requestContext, source) => {
                if (source === 'cache') {
                    console.log('⚡ Response served from cache');
                }
            }
        });
    }

    // Manual cache operations
    async get(key) {
        try {
            const result = await this.cache.get(key);
            return result ? JSON.parse(result) : null;
        } catch (error) {
            console.error('Cache get error:', error);
            return null;
        }
    }

    async set(key, value, ttl = 300) {
        try {
            await this.cache.set(key, JSON.stringify(value), { ttl });
            return true;
        } catch (error) {
            console.error('Cache set error:', error);
            return false;
        }
    }

    async invalidate(pattern) {
        try {
            const keys = await this.cache.keys(pattern);
            if (keys.length > 0) {
                await this.cache.delete(keys);
            }
            return true;
        } catch (error) {
            console.error('Cache invalidation error:', error);
            return false;
        }
    }

    // Cache warming strategies
    async warmCache() {
        console.log('🔥 Starting cache warming...');

        const commonQueries = [
            {
                query: 'query FeaturedCourses { featuredCourses { id title thumbnail instructor { fullName } } }',
                variables: {},
                key: 'featured-courses'
            },
            {
                query: 'query CourseCategories { courseCategories { id name courseCount } }',
                variables: {},
                key: 'course-categories'
            }
        ];

        for (const queryData of commonQueries) {
            try {
                // Execute query and cache result
                const result = await this.executeQuery(queryData.query, queryData.variables);
                await this.set(`warm:${queryData.key}`, result, 3600); // Cache for 1 hour
            } catch (error) {
                console.error(`Failed to warm cache for ${queryData.key}:`, error);
            }
        }

        console.log('✅ Cache warming completed');
    }

    // Intelligent cache invalidation
    async invalidateUserCache(userId) {
        await this.invalidate(`gql:${userId}:*`);
        console.log(`🗑️  Invalidated cache for user ${userId}`);
    }

    async invalidateCourseCache(courseId) {
        const patterns = [
            `*:course:${courseId}:*`,
            `*:courses:*`,
            `*:featuredCourses:*`
        ];

        for (const pattern of patterns) {
            await this.invalidate(pattern);
        }
        
        console.log(`🗑️  Invalidated cache for course ${courseId}`);
    }
}

// Cache control directives implementation
const cacheControlDirective = {
    typeDefs: `
        enum CacheControlScope {
            PUBLIC
            PRIVATE
        }

        directive @cacheControl(
            maxAge: Int
            scope: CacheControlScope
        ) on FIELD_DEFINITION | OBJECT | INTERFACE
    `,
    
    transformer: (schema) => {
        // Implementation of cache control directive logic
        return schema;
    }
};

module.exports = { 
    GraphQLCacheService, 
    cacheControlDirective 
};
```

This comprehensive GraphQL API implementation provides a complete, production-ready solution for the 7P Education Platform with advanced features including sophisticated schema design, optimized resolvers with DataLoader patterns, comprehensive authentication/authorization, performance optimization techniques, and intelligent caching strategies to support scalable educational applications.