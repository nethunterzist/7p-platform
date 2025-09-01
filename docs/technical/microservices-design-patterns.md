# Microservices Design Patterns for 7P Education Platform

## Executive Summary

This document outlines the comprehensive microservices design patterns and architecture for the 7P Education Platform, focusing on scalable, resilient, and maintainable service-oriented architecture. The design implements industry-standard patterns including service discovery, circuit breakers, event-driven communication, and distributed data management to support educational workflows at enterprise scale.

## Table of Contents

1. [Microservices Architecture Overview](#microservices-architecture-overview)
2. [Service Decomposition Strategy](#service-decomposition-strategy)
3. [Communication Patterns](#communication-patterns)
4. [Data Management Patterns](#data-management-patterns)
5. [Service Discovery & Registration](#service-discovery--registration)
6. [Resilience Patterns](#resilience-patterns)
7. [Security Patterns](#security-patterns)
8. [Deployment Patterns](#deployment-patterns)
9. [Monitoring & Observability](#monitoring--observability)
10. [Event-Driven Architecture](#event-driven-architecture)
11. [API Gateway Pattern](#api-gateway-pattern)
12. [Testing Strategies](#testing-strategies)

## Microservices Architecture Overview

### Core Architecture Principles

The 7P Education Platform follows a domain-driven microservices architecture with clear service boundaries and responsibilities:

```javascript
// src/services/ServiceArchitecture.js
class ServiceArchitecture {
    constructor() {
        this.services = {
            // Core Education Services
            userService: {
                domain: 'user-management',
                responsibilities: ['authentication', 'user-profiles', 'preferences'],
                port: 3001,
                database: 'postgresql',
                dependencies: ['notification-service']
            },
            
            courseService: {
                domain: 'content-management',
                responsibilities: ['courses', 'lessons', 'curricula'],
                port: 3002,
                database: 'mongodb',
                dependencies: ['user-service', 'media-service']
            },
            
            assessmentService: {
                domain: 'evaluation',
                responsibilities: ['tests', 'quizzes', 'grading', 'feedback'],
                port: 3003,
                database: 'postgresql',
                dependencies: ['user-service', 'course-service']
            },
            
            progressService: {
                domain: 'analytics',
                responsibilities: ['learning-progress', 'completion-tracking', 'statistics'],
                port: 3004,
                database: 'mongodb',
                dependencies: ['user-service', 'course-service', 'assessment-service']
            },
            
            notificationService: {
                domain: 'communication',
                responsibilities: ['email', 'sms', 'push-notifications', 'alerts'],
                port: 3005,
                database: 'redis',
                dependencies: []
            },
            
            mediaService: {
                domain: 'content-delivery',
                responsibilities: ['file-upload', 'video-streaming', 'cdn-management'],
                port: 3006,
                database: 'mongodb',
                dependencies: ['user-service']
            },
            
            paymentService: {
                domain: 'financial',
                responsibilities: ['payments', 'subscriptions', 'billing', 'refunds'],
                port: 3007,
                database: 'postgresql',
                dependencies: ['user-service', 'notification-service']
            },
            
            analyticsService: {
                domain: 'intelligence',
                responsibilities: ['reporting', 'insights', 'recommendations', 'ml-models'],
                port: 3008,
                database: 'mongodb',
                dependencies: ['user-service', 'course-service', 'progress-service']
            }
        };
        
        this.crossCuttingConcerns = {
            apiGateway: { port: 3000, responsibilities: ['routing', 'authentication', 'rate-limiting'] },
            configService: { port: 3009, responsibilities: ['configuration-management', 'feature-flags'] },
            logService: { port: 3010, responsibilities: ['centralized-logging', 'audit-trails'] },
            healthService: { port: 3011, responsibilities: ['health-monitoring', 'service-discovery'] }
        };
    }

    getServiceMap() {
        return {
            services: this.services,
            crossCuttingConcerns: this.crossCuttingConcerns,
            totalServices: Object.keys(this.services).length,
            architecture: 'domain-driven-microservices'
        };
    }

    validateArchitecture() {
        const validationResults = {
            cyclicDependencies: this.detectCyclicDependencies(),
            serviceIsolation: this.validateServiceIsolation(),
            databasePerService: this.validateDatabasePerService(),
            communicationPatterns: this.validateCommunicationPatterns()
        };

        return validationResults;
    }

    detectCyclicDependencies() {
        const visited = new Set();
        const recursionStack = new Set();
        const cycles = [];

        const hasCycle = (service, path = []) => {
            if (recursionStack.has(service)) {
                cycles.push([...path, service]);
                return true;
            }

            if (visited.has(service)) return false;

            visited.add(service);
            recursionStack.add(service);

            const dependencies = this.services[service]?.dependencies || [];
            for (const dep of dependencies) {
                const depName = dep.replace('-service', 'Service');
                if (this.services[depName] && hasCycle(depName, [...path, service])) {
                    return true;
                }
            }

            recursionStack.delete(service);
            return false;
        };

        for (const service of Object.keys(this.services)) {
            if (!visited.has(service)) {
                hasCycle(service);
            }
        }

        return { hasCycles: cycles.length > 0, cycles };
    }

    validateServiceIsolation() {
        const violations = [];
        
        for (const [serviceName, config] of Object.entries(this.services)) {
            // Check for shared databases (except allowed cases)
            const shareDatabase = Object.entries(this.services)
                .filter(([name, cfg]) => name !== serviceName && cfg.database === config.database)
                .map(([name]) => name);

            if (shareDatabase.length > 0 && config.database !== 'redis') {
                violations.push({
                    service: serviceName,
                    violation: 'shared-database',
                    details: `Shares ${config.database} with ${shareDatabase.join(', ')}`
                });
            }

            // Check for excessive dependencies
            if (config.dependencies.length > 3) {
                violations.push({
                    service: serviceName,
                    violation: 'excessive-dependencies',
                    details: `Has ${config.dependencies.length} dependencies`
                });
            }
        }

        return violations;
    }

    validateDatabasePerService() {
        const databaseUsage = {};
        
        for (const [service, config] of Object.entries(this.services)) {
            if (!databaseUsage[config.database]) {
                databaseUsage[config.database] = [];
            }
            databaseUsage[config.database].push(service);
        }

        return {
            databaseDistribution: databaseUsage,
            violations: Object.entries(databaseUsage)
                .filter(([db, services]) => services.length > 1 && db !== 'redis')
                .map(([db, services]) => ({ database: db, services }))
        };
    }
}

module.exports = new ServiceArchitecture();
```

### Service Mesh Architecture

```javascript
// src/infrastructure/ServiceMesh.js
const consul = require('consul');
const axios = require('axios');

class ServiceMesh {
    constructor() {
        this.consul = consul({
            host: process.env.CONSUL_HOST || 'localhost',
            port: process.env.CONSUL_PORT || 8500,
            secure: process.env.CONSUL_SECURE === 'true'
        });
        
        this.services = new Map();
        this.healthChecks = new Map();
        this.loadBalancer = new LoadBalancer();
        this.circuitBreaker = new CircuitBreakerManager();
    }

    async registerService(serviceConfig) {
        const {
            name,
            version,
            port,
            health,
            tags = [],
            meta = {}
        } = serviceConfig;

        const serviceId = `${name}-${version}-${process.env.HOSTNAME || 'localhost'}`;
        
        try {
            await this.consul.agent.service.register({
                id: serviceId,
                name,
                tags: [...tags, `version-${version}`],
                port,
                check: {
                    http: `http://localhost:${port}${health}`,
                    interval: '10s',
                    timeout: '5s',
                    deregister_critical_service_after: '1m'
                },
                meta: {
                    ...meta,
                    version,
                    startTime: new Date().toISOString()
                }
            });

            this.services.set(serviceId, {
                name,
                version,
                port,
                health,
                status: 'registered',
                registeredAt: new Date()
            });

            console.log(`✅ Service registered: ${serviceId}`);
            return serviceId;
        } catch (error) {
            console.error(`❌ Service registration failed: ${error.message}`);
            throw error;
        }
    }

    async discoverServices(serviceName, options = {}) {
        const { version, healthy = true, tag } = options;

        try {
            const services = await this.consul.health.service({
                service: serviceName,
                passing: healthy
            });

            let filteredServices = services[0] || [];

            // Filter by version if specified
            if (version) {
                filteredServices = filteredServices.filter(service => 
                    service.Service.Meta?.version === version
                );
            }

            // Filter by tag if specified
            if (tag) {
                filteredServices = filteredServices.filter(service =>
                    service.Service.Tags?.includes(tag)
                );
            }

            return filteredServices.map(service => ({
                id: service.Service.ID,
                name: service.Service.Service,
                address: service.Service.Address,
                port: service.Service.Port,
                version: service.Service.Meta?.version,
                tags: service.Service.Tags,
                health: service.Checks.every(check => check.Status === 'passing')
            }));
        } catch (error) {
            console.error(`❌ Service discovery failed for ${serviceName}: ${error.message}`);
            return [];
        }
    }

    async callService(serviceName, path, options = {}) {
        const {
            method = 'GET',
            data,
            timeout = 5000,
            retries = 3,
            version
        } = options;

        const circuitBreaker = this.circuitBreaker.getBreaker(serviceName);
        
        return circuitBreaker.execute(async () => {
            const services = await this.discoverServices(serviceName, { version, healthy: true });
            
            if (services.length === 0) {
                throw new Error(`No healthy instances of ${serviceName} found`);
            }

            const service = this.loadBalancer.selectService(services);
            const url = `http://${service.address}:${service.port}${path}`;

            const response = await axios({
                method,
                url,
                data,
                timeout,
                headers: {
                    'X-Service-Name': process.env.SERVICE_NAME || 'api-gateway',
                    'X-Request-ID': this.generateRequestId(),
                    'Content-Type': 'application/json'
                }
            });

            return response.data;
        });
    }

    generateRequestId() {
        return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    async deregisterService(serviceId) {
        try {
            await this.consul.agent.service.deregister(serviceId);
            this.services.delete(serviceId);
            console.log(`🚫 Service deregistered: ${serviceId}`);
        } catch (error) {
            console.error(`❌ Service deregistration failed: ${error.message}`);
        }
    }

    async getServiceHealth() {
        const health = {};
        
        for (const [serviceId, config] of this.services.entries()) {
            try {
                const services = await this.discoverServices(config.name);
                const service = services.find(s => s.id === serviceId);
                
                health[serviceId] = {
                    status: service ? 'healthy' : 'unhealthy',
                    lastCheck: new Date(),
                    instances: services.length
                };
            } catch (error) {
                health[serviceId] = {
                    status: 'error',
                    error: error.message,
                    lastCheck: new Date()
                };
            }
        }

        return health;
    }
}

class LoadBalancer {
    constructor() {
        this.strategy = process.env.LOAD_BALANCER_STRATEGY || 'round-robin';
        this.counters = new Map();
    }

    selectService(services) {
        if (services.length === 1) return services[0];

        switch (this.strategy) {
            case 'round-robin':
                return this.roundRobin(services);
            case 'random':
                return this.random(services);
            case 'least-connections':
                return this.leastConnections(services);
            default:
                return this.roundRobin(services);
        }
    }

    roundRobin(services) {
        const key = services.map(s => s.id).sort().join(',');
        const counter = this.counters.get(key) || 0;
        const selected = services[counter % services.length];
        
        this.counters.set(key, counter + 1);
        return selected;
    }

    random(services) {
        const index = Math.floor(Math.random() * services.length);
        return services[index];
    }

    leastConnections(services) {
        // Simplified implementation - in production, track actual connections
        return services.reduce((least, current) => 
            (current.connections || 0) < (least.connections || 0) ? current : least
        );
    }
}

module.exports = ServiceMesh;
```

## Service Decomposition Strategy

### Domain-Driven Service Boundaries

```javascript
// src/domain/DomainModel.js
class DomainModel {
    constructor() {
        this.domains = {
            'user-management': {
                entities: ['User', 'Profile', 'Authentication', 'Preferences'],
                aggregates: ['UserAccount', 'UserSession'],
                repositories: ['UserRepository', 'AuthRepository'],
                services: ['AuthenticationService', 'ProfileService'],
                events: ['UserRegistered', 'UserLoggedIn', 'ProfileUpdated'],
                bounded_context: 'User and identity management'
            },

            'content-management': {
                entities: ['Course', 'Lesson', 'Module', 'Content', 'Curriculum'],
                aggregates: ['CourseStructure', 'LearningPath'],
                repositories: ['CourseRepository', 'ContentRepository'],
                services: ['CourseService', 'ContentService'],
                events: ['CourseCreated', 'LessonCompleted', 'ContentUpdated'],
                bounded_context: 'Educational content and curriculum'
            },

            'evaluation': {
                entities: ['Assessment', 'Question', 'Answer', 'Grade', 'Feedback'],
                aggregates: ['TestSession', 'GradingResult'],
                repositories: ['AssessmentRepository', 'GradeRepository'],
                services: ['AssessmentService', 'GradingService'],
                events: ['AssessmentStarted', 'AssessmentCompleted', 'GradeAssigned'],
                bounded_context: 'Testing and evaluation system'
            },

            'analytics': {
                entities: ['Progress', 'Statistics', 'Report', 'Insight'],
                aggregates: ['LearningProgress', 'PerformanceMetrics'],
                repositories: ['ProgressRepository', 'ReportRepository'],
                services: ['AnalyticsService', 'ReportingService'],
                events: ['ProgressUpdated', 'ReportGenerated', 'InsightCreated'],
                bounded_context: 'Learning analytics and progress tracking'
            },

            'communication': {
                entities: ['Notification', 'Message', 'Alert', 'Template'],
                aggregates: ['NotificationCampaign', 'MessageThread'],
                repositories: ['NotificationRepository', 'MessageRepository'],
                services: ['NotificationService', 'MessageService'],
                events: ['NotificationSent', 'MessageDelivered', 'AlertTriggered'],
                bounded_context: 'Communication and messaging'
            }
        };
    }

    getServiceBoundaries() {
        const boundaries = {};
        
        for (const [domain, config] of Object.entries(this.domains)) {
            boundaries[domain] = {
                responsibilities: config.bounded_context,
                entities: config.entities.length,
                complexity: this.calculateDomainComplexity(config),
                coupling: this.calculateDomainCoupling(domain),
                cohesion: this.calculateDomainCohesion(config)
            };
        }

        return boundaries;
    }

    calculateDomainComplexity(domain) {
        const entityWeight = domain.entities.length * 0.3;
        const aggregateWeight = domain.aggregates.length * 0.4;
        const serviceWeight = domain.services.length * 0.2;
        const eventWeight = domain.events.length * 0.1;

        return entityWeight + aggregateWeight + serviceWeight + eventWeight;
    }

    calculateDomainCoupling(domainName) {
        const domain = this.domains[domainName];
        const sharedConcepts = [];

        // Check for shared entities or concepts across domains
        for (const [otherDomain, otherConfig] of Object.entries(this.domains)) {
            if (otherDomain !== domainName) {
                const sharedEntities = domain.entities.filter(entity => 
                    otherConfig.entities.includes(entity)
                );
                sharedConcepts.push(...sharedEntities);
            }
        }

        return sharedConcepts.length / domain.entities.length;
    }

    calculateDomainCohesion(domain) {
        // High cohesion: related entities and services
        const relatedPairs = this.findRelatedPairs(domain);
        const totalPossiblePairs = domain.entities.length * (domain.entities.length - 1) / 2;
        
        return totalPossiblePairs > 0 ? relatedPairs / totalPossiblePairs : 1;
    }

    findRelatedPairs(domain) {
        // Simplified heuristic - in practice, use domain expertise
        const relatedWords = ['User', 'Course', 'Assessment', 'Progress', 'Notification'];
        let relatedPairs = 0;

        for (let i = 0; i < domain.entities.length; i++) {
            for (let j = i + 1; j < domain.entities.length; j++) {
                const entity1 = domain.entities[i];
                const entity2 = domain.entities[j];
                
                // Check if entities share common domain concepts
                const hasRelation = relatedWords.some(word => 
                    entity1.includes(word) && entity2.includes(word)
                );
                
                if (hasRelation) relatedPairs++;
            }
        }

        return relatedPairs;
    }

    validateDecomposition() {
        const validation = {
            domainAnalysis: this.getServiceBoundaries(),
            recommendations: [],
            violations: []
        };

        for (const [domain, analysis] of Object.entries(validation.domainAnalysis)) {
            // High complexity warning
            if (analysis.complexity > 10) {
                validation.recommendations.push({
                    domain,
                    type: 'split-recommendation',
                    message: `Consider splitting ${domain} - complexity score: ${analysis.complexity}`
                });
            }

            // High coupling warning
            if (analysis.coupling > 0.3) {
                validation.violations.push({
                    domain,
                    type: 'high-coupling',
                    message: `High coupling detected: ${analysis.coupling.toFixed(2)}`
                });
            }

            // Low cohesion warning
            if (analysis.cohesion < 0.6) {
                validation.violations.push({
                    domain,
                    type: 'low-cohesion',
                    message: `Low cohesion detected: ${analysis.cohesion.toFixed(2)}`
                });
            }
        }

        return validation;
    }
}

module.exports = new DomainModel();
```

## Communication Patterns

### Synchronous Communication (REST API)

```javascript
// src/communication/RESTClient.js
const axios = require('axios');
const CircuitBreaker = require('./CircuitBreaker');

class RESTClient {
    constructor(baseURL, options = {}) {
        this.baseURL = baseURL;
        this.timeout = options.timeout || 5000;
        this.retries = options.retries || 3;
        this.circuitBreaker = new CircuitBreaker(options.circuitBreaker);
        
        this.client = axios.create({
            baseURL,
            timeout: this.timeout,
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'education-platform-service/1.0'
            }
        });

        this.setupInterceptors();
    }

    setupInterceptors() {
        // Request interceptor
        this.client.interceptors.request.use(
            (config) => {
                config.headers['X-Request-ID'] = this.generateRequestId();
                config.headers['X-Timestamp'] = new Date().toISOString();
                config.metadata = { startTime: Date.now() };
                
                console.log(`📤 Outgoing request: ${config.method?.toUpperCase()} ${config.url}`);
                return config;
            },
            (error) => {
                console.error('📤❌ Request interceptor error:', error);
                return Promise.reject(error);
            }
        );

        // Response interceptor
        this.client.interceptors.response.use(
            (response) => {
                const duration = Date.now() - response.config.metadata.startTime;
                console.log(`📥 Response received: ${response.status} in ${duration}ms`);
                
                return response;
            },
            async (error) => {
                const duration = error.config?.metadata ? 
                    Date.now() - error.config.metadata.startTime : 0;
                
                console.error(`📥❌ Response error: ${error.response?.status || 'NETWORK_ERROR'} in ${duration}ms`);
                
                // Retry logic for specific errors
                if (this.shouldRetry(error) && !error.config._retryCount) {
                    return this.retryRequest(error);
                }
                
                return Promise.reject(error);
            }
        );
    }

    async get(path, config = {}) {
        return this.circuitBreaker.execute(async () => {
            const response = await this.client.get(path, config);
            return response.data;
        });
    }

    async post(path, data, config = {}) {
        return this.circuitBreaker.execute(async () => {
            const response = await this.client.post(path, data, config);
            return response.data;
        });
    }

    async put(path, data, config = {}) {
        return this.circuitBreaker.execute(async () => {
            const response = await this.client.put(path, data, config);
            return response.data;
        });
    }

    async delete(path, config = {}) {
        return this.circuitBreaker.execute(async () => {
            const response = await this.client.delete(path, config);
            return response.data;
        });
    }

    shouldRetry(error) {
        const retryableErrors = [
            'ECONNRESET',
            'ENOTFOUND',
            'ECONNREFUSED',
            'ETIMEDOUT'
        ];

        const retryableStatusCodes = [408, 429, 502, 503, 504];

        return (
            error.code && retryableErrors.includes(error.code) ||
            error.response?.status && retryableStatusCodes.includes(error.response.status)
        );
    }

    async retryRequest(error) {
        const config = error.config;
        config._retryCount = config._retryCount || 0;

        if (config._retryCount >= this.retries) {
            return Promise.reject(error);
        }

        config._retryCount++;
        const delay = Math.min(1000 * Math.pow(2, config._retryCount - 1), 10000);

        console.log(`🔄 Retrying request ${config._retryCount}/${this.retries} after ${delay}ms`);

        await new Promise(resolve => setTimeout(resolve, delay));
        return this.client(config);
    }

    generateRequestId() {
        return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}

// Service-specific REST clients
class UserServiceClient extends RESTClient {
    constructor(baseURL) {
        super(baseURL, {
            timeout: 3000,
            retries: 3,
            circuitBreaker: {
                errorThresholdPercentage: 50,
                resetTimeout: 30000
            }
        });
    }

    async getUser(userId) {
        return this.get(`/users/${userId}`);
    }

    async createUser(userData) {
        return this.post('/users', userData);
    }

    async updateUser(userId, updates) {
        return this.put(`/users/${userId}`, updates);
    }

    async authenticateUser(credentials) {
        return this.post('/auth/login', credentials);
    }

    async getUserProgress(userId) {
        return this.get(`/users/${userId}/progress`);
    }
}

class CourseServiceClient extends RESTClient {
    constructor(baseURL) {
        super(baseURL, {
            timeout: 5000,
            retries: 2,
            circuitBreaker: {
                errorThresholdPercentage: 40,
                resetTimeout: 60000
            }
        });
    }

    async getCourse(courseId) {
        return this.get(`/courses/${courseId}`);
    }

    async getCourses(filters = {}) {
        return this.get('/courses', { params: filters });
    }

    async createCourse(courseData) {
        return this.post('/courses', courseData);
    }

    async enrollStudent(courseId, userId) {
        return this.post(`/courses/${courseId}/enroll`, { userId });
    }

    async getCourseLessons(courseId) {
        return this.get(`/courses/${courseId}/lessons`);
    }
}

module.exports = {
    RESTClient,
    UserServiceClient,
    CourseServiceClient
};
```

### Asynchronous Communication (Event-Driven)

```javascript
// src/communication/EventBus.js
const EventEmitter = require('events');
const amqp = require('amqplib');
const redis = require('redis');

class EventBus extends EventEmitter {
    constructor(config = {}) {
        super();
        this.config = {
            rabbitmq: {
                url: config.rabbitmqUrl || process.env.RABBITMQ_URL || 'amqp://localhost',
                exchange: config.exchange || 'education-platform',
                exchangeType: 'topic'
            },
            redis: {
                host: config.redisHost || process.env.REDIS_HOST || 'localhost',
                port: config.redisPort || process.env.REDIS_PORT || 6379
            }
        };

        this.connection = null;
        this.channel = null;
        this.redisClient = null;
        this.subscribers = new Map();
        this.eventHandlers = new Map();
    }

    async initialize() {
        try {
            // Initialize RabbitMQ
            await this.initializeRabbitMQ();
            
            // Initialize Redis for event sourcing
            await this.initializeRedis();
            
            console.log('✅ Event Bus initialized successfully');
        } catch (error) {
            console.error('❌ Event Bus initialization failed:', error);
            throw error;
        }
    }

    async initializeRabbitMQ() {
        this.connection = await amqp.connect(this.config.rabbitmq.url);
        this.channel = await this.connection.createChannel();
        
        await this.channel.assertExchange(
            this.config.rabbitmq.exchange,
            this.config.rabbitmq.exchangeType,
            { durable: true }
        );

        // Handle connection errors
        this.connection.on('error', (error) => {
            console.error('RabbitMQ connection error:', error);
        });

        this.connection.on('close', () => {
            console.log('RabbitMQ connection closed');
            // Implement reconnection logic
            setTimeout(() => this.initializeRabbitMQ(), 5000);
        });
    }

    async initializeRedis() {
        this.redisClient = redis.createClient(this.config.redis);
        
        this.redisClient.on('error', (error) => {
            console.error('Redis client error:', error);
        });

        await this.redisClient.connect();
    }

    async publish(eventType, eventData, options = {}) {
        const event = {
            id: this.generateEventId(),
            type: eventType,
            data: eventData,
            timestamp: new Date().toISOString(),
            version: options.version || '1.0',
            source: options.source || process.env.SERVICE_NAME || 'unknown',
            correlationId: options.correlationId || this.generateCorrelationId(),
            metadata: options.metadata || {}
        };

        try {
            // Store event for event sourcing
            await this.storeEvent(event);
            
            // Publish to RabbitMQ
            await this.channel.publish(
                this.config.rabbitmq.exchange,
                eventType,
                Buffer.from(JSON.stringify(event)),
                {
                    persistent: true,
                    messageId: event.id,
                    timestamp: Date.now(),
                    headers: {
                        correlationId: event.correlationId,
                        source: event.source,
                        version: event.version
                    }
                }
            );

            // Emit locally
            this.emit(eventType, event);

            console.log(`📢 Event published: ${eventType} (${event.id})`);
            return event.id;
        } catch (error) {
            console.error(`❌ Failed to publish event ${eventType}:`, error);
            throw error;
        }
    }

    async subscribe(eventPattern, handler, options = {}) {
        const queueName = options.queueName || `${process.env.SERVICE_NAME || 'service'}-${eventPattern}`;
        const queueOptions = {
            durable: true,
            exclusive: false,
            autoDelete: false
        };

        try {
            // Assert queue
            await this.channel.assertQueue(queueName, queueOptions);
            
            // Bind queue to exchange with pattern
            await this.channel.bindQueue(queueName, this.config.rabbitmq.exchange, eventPattern);

            // Set up consumer
            await this.channel.consume(queueName, async (message) => {
                if (message) {
                    try {
                        const event = JSON.parse(message.content.toString());
                        
                        console.log(`📨 Event received: ${event.type} (${event.id})`);
                        
                        // Call handler with retry logic
                        await this.handleEventWithRetry(handler, event, message);
                        
                        // Acknowledge message
                        this.channel.ack(message);
                    } catch (error) {
                        console.error(`❌ Error processing event:`, error);
                        
                        // Reject and requeue message
                        this.channel.nack(message, false, !error.permanent);
                    }
                }
            }, {
                noAck: false,
                prefetch: options.prefetch || 10
            });

            this.subscribers.set(eventPattern, { queueName, handler, options });
            console.log(`🔗 Subscribed to: ${eventPattern}`);
        } catch (error) {
            console.error(`❌ Failed to subscribe to ${eventPattern}:`, error);
            throw error;
        }
    }

    async handleEventWithRetry(handler, event, message) {
        const maxRetries = 3;
        const retryCount = (message.properties.headers['x-retry-count'] || 0);

        try {
            await handler(event);
        } catch (error) {
            if (retryCount < maxRetries) {
                // Retry with exponential backoff
                const delay = Math.min(1000 * Math.pow(2, retryCount), 30000);
                
                setTimeout(async () => {
                    try {
                        const retryMessage = {
                            ...message,
                            properties: {
                                ...message.properties,
                                headers: {
                                    ...message.properties.headers,
                                    'x-retry-count': retryCount + 1
                                }
                            }
                        };

                        await this.channel.publish(
                            this.config.rabbitmq.exchange,
                            event.type,
                            message.content,
                            retryMessage.properties
                        );
                    } catch (retryError) {
                        console.error('Failed to retry message:', retryError);
                    }
                }, delay);
            } else {
                // Send to dead letter queue
                await this.sendToDeadLetterQueue(event, error);
                error.permanent = true;
            }
            
            throw error;
        }
    }

    async storeEvent(event) {
        try {
            const key = `event:${event.id}`;
            const streamKey = `events:${event.type}`;
            
            // Store individual event
            await this.redisClient.hSet(key, {
                id: event.id,
                type: event.type,
                data: JSON.stringify(event.data),
                timestamp: event.timestamp,
                source: event.source
            });

            // Add to event stream
            await this.redisClient.xAdd(streamKey, '*', {
                eventId: event.id,
                eventData: JSON.stringify(event)
            });

            // Set expiration (optional)
            await this.redisClient.expire(key, 7 * 24 * 3600); // 7 days
        } catch (error) {
            console.error('Failed to store event:', error);
            // Don't throw - event storage shouldn't block event publishing
        }
    }

    async getEventHistory(eventType, options = {}) {
        const streamKey = `events:${eventType}`;
        const count = options.count || 100;
        const start = options.start || '-';
        const end = options.end || '+';

        try {
            const events = await this.redisClient.xRange(streamKey, start, end, {
                COUNT: count
            });

            return events.map(([id, fields]) => ({
                streamId: id,
                ...JSON.parse(fields.eventData)
            }));
        } catch (error) {
            console.error('Failed to get event history:', error);
            return [];
        }
    }

    async sendToDeadLetterQueue(event, error) {
        const deadLetterQueue = 'failed-events';
        
        try {
            await this.channel.assertQueue(deadLetterQueue, { durable: true });
            
            const failedEvent = {
                ...event,
                error: {
                    message: error.message,
                    stack: error.stack,
                    timestamp: new Date().toISOString()
                }
            };

            await this.channel.sendToQueue(
                deadLetterQueue,
                Buffer.from(JSON.stringify(failedEvent)),
                { persistent: true }
            );

            console.log(`💀 Event sent to dead letter queue: ${event.id}`);
        } catch (dlqError) {
            console.error('Failed to send to dead letter queue:', dlqError);
        }
    }

    generateEventId() {
        return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    generateCorrelationId() {
        return `corr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    async close() {
        try {
            if (this.channel) await this.channel.close();
            if (this.connection) await this.connection.close();
            if (this.redisClient) await this.redisClient.quit();
            console.log('🔌 Event Bus closed');
        } catch (error) {
            console.error('Error closing Event Bus:', error);
        }
    }
}

// Event definitions for 7P Education Platform
class EducationPlatformEvents {
    static get USER_EVENTS() {
        return {
            USER_REGISTERED: 'user.registered',
            USER_LOGGED_IN: 'user.logged_in',
            USER_PROFILE_UPDATED: 'user.profile_updated',
            USER_DEACTIVATED: 'user.deactivated'
        };
    }

    static get COURSE_EVENTS() {
        return {
            COURSE_CREATED: 'course.created',
            COURSE_PUBLISHED: 'course.published',
            COURSE_UPDATED: 'course.updated',
            STUDENT_ENROLLED: 'course.student_enrolled',
            LESSON_COMPLETED: 'course.lesson_completed'
        };
    }

    static get ASSESSMENT_EVENTS() {
        return {
            ASSESSMENT_STARTED: 'assessment.started',
            ASSESSMENT_COMPLETED: 'assessment.completed',
            ASSESSMENT_GRADED: 'assessment.graded',
            FEEDBACK_PROVIDED: 'assessment.feedback_provided'
        };
    }

    static get NOTIFICATION_EVENTS() {
        return {
            NOTIFICATION_SENT: 'notification.sent',
            EMAIL_DELIVERED: 'notification.email_delivered',
            SMS_SENT: 'notification.sms_sent',
            PUSH_NOTIFICATION_SENT: 'notification.push_sent'
        };
    }
}

module.exports = { EventBus, EducationPlatformEvents };
```

## Data Management Patterns

### Database Per Service Pattern

```javascript
// src/data/DatabaseManager.js
const mongoose = require('mongoose');
const { Pool } = require('pg');
const redis = require('redis');

class DatabaseManager {
    constructor() {
        this.connections = new Map();
        this.healthChecks = new Map();
        this.connectionConfigs = this.loadConnectionConfigs();
    }

    loadConnectionConfigs() {
        return {
            'user-service': {
                type: 'postgresql',
                config: {
                    host: process.env.USER_DB_HOST || 'localhost',
                    port: process.env.USER_DB_PORT || 5432,
                    database: process.env.USER_DB_NAME || 'users_db',
                    user: process.env.USER_DB_USER || 'postgres',
                    password: process.env.USER_DB_PASSWORD || 'password',
                    max: 20,
                    idleTimeoutMillis: 30000,
                    connectionTimeoutMillis: 2000,
                }
            },

            'course-service': {
                type: 'mongodb',
                config: {
                    url: process.env.COURSE_DB_URL || 'mongodb://localhost:27017/courses_db',
                    options: {
                        useNewUrlParser: true,
                        useUnifiedTopology: true,
                        maxPoolSize: 10,
                        serverSelectionTimeoutMS: 5000,
                        socketTimeoutMS: 45000,
                    }
                }
            },

            'assessment-service': {
                type: 'postgresql',
                config: {
                    host: process.env.ASSESSMENT_DB_HOST || 'localhost',
                    port: process.env.ASSESSMENT_DB_PORT || 5432,
                    database: process.env.ASSESSMENT_DB_NAME || 'assessments_db',
                    user: process.env.ASSESSMENT_DB_USER || 'postgres',
                    password: process.env.ASSESSMENT_DB_PASSWORD || 'password',
                    max: 15,
                    idleTimeoutMillis: 30000,
                    connectionTimeoutMillis: 2000,
                }
            },

            'progress-service': {
                type: 'mongodb',
                config: {
                    url: process.env.PROGRESS_DB_URL || 'mongodb://localhost:27017/progress_db',
                    options: {
                        useNewUrlParser: true,
                        useUnifiedTopology: true,
                        maxPoolSize: 10,
                        serverSelectionTimeoutMS: 5000,
                        socketTimeoutMS: 45000,
                    }
                }
            },

            'notification-service': {
                type: 'redis',
                config: {
                    host: process.env.NOTIFICATION_REDIS_HOST || 'localhost',
                    port: process.env.NOTIFICATION_REDIS_PORT || 6379,
                    password: process.env.NOTIFICATION_REDIS_PASSWORD,
                    db: 0
                }
            },

            'media-service': {
                type: 'mongodb',
                config: {
                    url: process.env.MEDIA_DB_URL || 'mongodb://localhost:27017/media_db',
                    options: {
                        useNewUrlParser: true,
                        useUnifiedTopology: true,
                        maxPoolSize: 15,
                        serverSelectionTimeoutMS: 5000,
                        socketTimeoutMillis: 45000,
                    }
                }
            }
        };
    }

    async initializeConnections() {
        const promises = [];

        for (const [serviceName, config] of Object.entries(this.connectionConfigs)) {
            promises.push(this.initializeConnection(serviceName, config));
        }

        try {
            await Promise.all(promises);
            console.log('✅ All database connections initialized');
        } catch (error) {
            console.error('❌ Database initialization failed:', error);
            throw error;
        }
    }

    async initializeConnection(serviceName, config) {
        try {
            let connection;

            switch (config.type) {
                case 'postgresql':
                    connection = await this.createPostgreSQLConnection(config.config);
                    break;
                case 'mongodb':
                    connection = await this.createMongoDBConnection(config.config);
                    break;
                case 'redis':
                    connection = await this.createRedisConnection(config.config);
                    break;
                default:
                    throw new Error(`Unsupported database type: ${config.type}`);
            }

            this.connections.set(serviceName, {
                connection,
                type: config.type,
                config: config.config,
                healthCheck: this.createHealthCheck(connection, config.type)
            });

            console.log(`✅ ${serviceName} database connected (${config.type})`);
        } catch (error) {
            console.error(`❌ Failed to connect ${serviceName} database:`, error);
            throw error;
        }
    }

    async createPostgreSQLConnection(config) {
        const pool = new Pool(config);

        // Test connection
        const client = await pool.connect();
        await client.query('SELECT NOW()');
        client.release();

        pool.on('error', (err) => {
            console.error('PostgreSQL pool error:', err);
        });

        return pool;
    }

    async createMongoDBConnection(config) {
        const connection = await mongoose.createConnection(config.url, config.options);

        connection.on('error', (error) => {
            console.error('MongoDB connection error:', error);
        });

        connection.on('disconnected', () => {
            console.log('MongoDB disconnected');
        });

        return connection;
    }

    async createRedisConnection(config) {
        const client = redis.createClient(config);

        client.on('error', (error) => {
            console.error('Redis connection error:', error);
        });

        await client.connect();
        return client;
    }

    createHealthCheck(connection, type) {
        return async () => {
            try {
                switch (type) {
                    case 'postgresql':
                        const client = await connection.connect();
                        await client.query('SELECT 1');
                        client.release();
                        return { status: 'healthy' };

                    case 'mongodb':
                        const state = connection.readyState;
                        if (state !== 1) throw new Error(`Connection state: ${state}`);
                        return { status: 'healthy', readyState: state };

                    case 'redis':
                        await connection.ping();
                        return { status: 'healthy' };

                    default:
                        throw new Error(`Unknown database type: ${type}`);
                }
            } catch (error) {
                return { status: 'unhealthy', error: error.message };
            }
        };
    }

    getConnection(serviceName) {
        return this.connections.get(serviceName)?.connection;
    }

    async performHealthCheck(serviceName = null) {
        if (serviceName) {
            const serviceConnection = this.connections.get(serviceName);
            if (!serviceConnection) {
                return { status: 'not-found', message: `Service ${serviceName} not found` };
            }
            
            return await serviceConnection.healthCheck();
        }

        // Check all connections
        const results = {};
        for (const [name, connectionInfo] of this.connections.entries()) {
            results[name] = await connectionInfo.healthCheck();
        }
        
        return results;
    }

    async closeAllConnections() {
        const promises = [];

        for (const [serviceName, connectionInfo] of this.connections.entries()) {
            promises.push(this.closeConnection(serviceName, connectionInfo));
        }

        await Promise.all(promises);
        this.connections.clear();
        console.log('🔌 All database connections closed');
    }

    async closeConnection(serviceName, connectionInfo) {
        try {
            switch (connectionInfo.type) {
                case 'postgresql':
                    await connectionInfo.connection.end();
                    break;
                case 'mongodb':
                    await connectionInfo.connection.close();
                    break;
                case 'redis':
                    await connectionInfo.connection.quit();
                    break;
            }
            console.log(`🔌 ${serviceName} database connection closed`);
        } catch (error) {
            console.error(`Error closing ${serviceName} connection:`, error);
        }
    }
}

module.exports = new DatabaseManager();
```

### Saga Pattern for Distributed Transactions

```javascript
// src/patterns/SagaOrchestrator.js
const { EventBus } = require('../communication/EventBus');

class SagaOrchestrator {
    constructor() {
        this.eventBus = new EventBus();
        this.activeSagas = new Map();
        this.sagaDefinitions = new Map();
        this.compensationHandlers = new Map();
        
        this.initializeSagas();
    }

    initializeSagas() {
        // Course Enrollment Saga
        this.defineSaga('course-enrollment', [
            { service: 'payment-service', action: 'charge-payment', compensation: 'refund-payment' },
            { service: 'user-service', action: 'update-user-courses', compensation: 'remove-user-course' },
            { service: 'course-service', action: 'enroll-student', compensation: 'unenroll-student' },
            { service: 'notification-service', action: 'send-enrollment-notification', compensation: 'send-cancellation-notification' }
        ]);

        // User Registration Saga
        this.defineSaga('user-registration', [
            { service: 'user-service', action: 'create-user-account', compensation: 'delete-user-account' },
            { service: 'notification-service', action: 'send-welcome-email', compensation: 'send-cancellation-email' },
            { service: 'analytics-service', action: 'track-user-registration', compensation: 'remove-user-analytics' }
        ]);

        // Course Creation Saga
        this.defineSaga('course-creation', [
            { service: 'course-service', action: 'create-course', compensation: 'delete-course' },
            { service: 'media-service', action: 'process-course-media', compensation: 'delete-course-media' },
            { service: 'search-service', action: 'index-course', compensation: 'remove-course-index' },
            { service: 'notification-service', action: 'notify-admins', compensation: null }
        ]);
    }

    defineSaga(sagaName, steps) {
        this.sagaDefinitions.set(sagaName, {
            name: sagaName,
            steps,
            totalSteps: steps.length
        });

        console.log(`📋 Saga defined: ${sagaName} with ${steps.length} steps`);
    }

    async startSaga(sagaName, sagaData, options = {}) {
        const sagaDefinition = this.sagaDefinitions.get(sagaName);
        if (!sagaDefinition) {
            throw new Error(`Saga ${sagaName} not found`);
        }

        const sagaId = this.generateSagaId();
        const saga = {
            id: sagaId,
            name: sagaName,
            data: sagaData,
            steps: sagaDefinition.steps,
            currentStep: 0,
            completedSteps: [],
            status: 'running',
            startedAt: new Date(),
            lastActivity: new Date(),
            correlationId: options.correlationId || this.generateCorrelationId(),
            compensations: []
        };

        this.activeSagas.set(sagaId, saga);
        
        console.log(`🚀 Saga started: ${sagaName} (${sagaId})`);
        
        // Execute first step
        await this.executeNextStep(sagaId);
        
        return sagaId;
    }

    async executeNextStep(sagaId) {
        const saga = this.activeSagas.get(sagaId);
        if (!saga || saga.status !== 'running') {
            return;
        }

        if (saga.currentStep >= saga.steps.length) {
            await this.completeSaga(sagaId);
            return;
        }

        const step = saga.steps[saga.currentStep];
        
        try {
            console.log(`📤 Executing step ${saga.currentStep + 1}/${saga.steps.length}: ${step.service}/${step.action}`);
            
            await this.eventBus.publish(`${step.service}.${step.action}`, {
                sagaId,
                sagaName: saga.name,
                stepIndex: saga.currentStep,
                data: saga.data
            }, {
                correlationId: saga.correlationId,
                source: 'saga-orchestrator'
            });

            // Wait for step completion or timeout
            await this.waitForStepCompletion(sagaId, step, 30000); // 30 second timeout

        } catch (error) {
            console.error(`❌ Saga step failed: ${step.service}/${step.action}`, error);
            await this.compensateSaga(sagaId, error);
        }
    }

    async waitForStepCompletion(sagaId, step, timeout) {
        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                this.eventBus.removeListener(successEvent, successHandler);
                this.eventBus.removeListener(failureEvent, failureHandler);
                reject(new Error(`Step timeout: ${step.service}/${step.action}`));
            }, timeout);

            const successEvent = `${step.service}.${step.action}.success`;
            const failureEvent = `${step.service}.${step.action}.failure`;

            const successHandler = (event) => {
                if (event.data.sagaId === sagaId) {
                    clearTimeout(timeoutId);
                    this.eventBus.removeListener(successEvent, successHandler);
                    this.eventBus.removeListener(failureEvent, failureHandler);
                    this.onStepSuccess(sagaId, event.data);
                    resolve();
                }
            };

            const failureHandler = (event) => {
                if (event.data.sagaId === sagaId) {
                    clearTimeout(timeoutId);
                    this.eventBus.removeListener(successEvent, successHandler);
                    this.eventBus.removeListener(failureEvent, failureHandler);
                    reject(new Error(event.data.error || 'Step failed'));
                }
            };

            this.eventBus.on(successEvent, successHandler);
            this.eventBus.on(failureEvent, failureHandler);
        });
    }

    async onStepSuccess(sagaId, stepResult) {
        const saga = this.activeSagas.get(sagaId);
        if (!saga) return;

        const step = saga.steps[saga.currentStep];
        
        saga.completedSteps.push({
            stepIndex: saga.currentStep,
            service: step.service,
            action: step.action,
            completedAt: new Date(),
            result: stepResult
        });

        // Add compensation if available
        if (step.compensation) {
            saga.compensations.unshift({
                service: step.service,
                action: step.compensation,
                originalData: stepResult
            });
        }

        saga.currentStep++;
        saga.lastActivity = new Date();
        
        // Execute next step
        await this.executeNextStep(sagaId);
    }

    async compensateSaga(sagaId, error) {
        const saga = this.activeSagas.get(sagaId);
        if (!saga) return;

        saga.status = 'compensating';
        saga.error = error.message;
        
        console.log(`🔄 Starting compensation for saga: ${saga.name} (${sagaId})`);

        for (const compensation of saga.compensations) {
            try {
                console.log(`🔙 Compensating: ${compensation.service}/${compensation.action}`);
                
                await this.eventBus.publish(`${compensation.service}.${compensation.action}`, {
                    sagaId,
                    sagaName: saga.name,
                    originalData: compensation.originalData,
                    compensationReason: error.message
                }, {
                    correlationId: saga.correlationId,
                    source: 'saga-orchestrator'
                });

                // Wait for compensation completion
                await this.waitForCompensationCompletion(compensation, 15000); // 15 second timeout
                
            } catch (compensationError) {
                console.error(`❌ Compensation failed: ${compensation.service}/${compensation.action}`, compensationError);
                // Log compensation failure but continue with other compensations
            }
        }

        saga.status = 'failed';
        saga.completedAt = new Date();
        
        // Publish saga failure event
        await this.eventBus.publish('saga.failed', {
            sagaId,
            sagaName: saga.name,
            error: error.message,
            compensationsExecuted: saga.compensations.length
        });

        console.log(`❌ Saga failed and compensated: ${saga.name} (${sagaId})`);
    }

    async waitForCompensationCompletion(compensation, timeout) {
        return new Promise((resolve) => {
            const timeoutId = setTimeout(() => {
                resolve(); // Don't reject compensation timeouts
            }, timeout);

            const successEvent = `${compensation.service}.${compensation.action}.success`;
            
            const successHandler = (event) => {
                clearTimeout(timeoutId);
                this.eventBus.removeListener(successEvent, successHandler);
                resolve();
            };

            this.eventBus.on(successEvent, successHandler);
        });
    }

    async completeSaga(sagaId) {
        const saga = this.activeSagas.get(sagaId);
        if (!saga) return;

        saga.status = 'completed';
        saga.completedAt = new Date();
        
        // Publish saga completion event
        await this.eventBus.publish('saga.completed', {
            sagaId,
            sagaName: saga.name,
            stepsCompleted: saga.completedSteps.length,
            duration: saga.completedAt - saga.startedAt
        });

        console.log(`✅ Saga completed: ${saga.name} (${sagaId})`);
        
        // Clean up saga after some time
        setTimeout(() => {
            this.activeSagas.delete(sagaId);
        }, 5 * 60 * 1000); // Keep for 5 minutes for debugging
    }

    getSagaStatus(sagaId) {
        const saga = this.activeSagas.get(sagaId);
        if (!saga) {
            return { status: 'not-found' };
        }

        return {
            id: saga.id,
            name: saga.name,
            status: saga.status,
            currentStep: saga.currentStep,
            totalSteps: saga.steps.length,
            completedSteps: saga.completedSteps.length,
            startedAt: saga.startedAt,
            lastActivity: saga.lastActivity,
            error: saga.error
        };
    }

    getAllActiveSagas() {
        const sagas = [];
        
        for (const [sagaId, saga] of this.activeSagas.entries()) {
            sagas.push(this.getSagaStatus(sagaId));
        }
        
        return sagas;
    }

    generateSagaId() {
        return `saga_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    generateCorrelationId() {
        return `corr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}

module.exports = SagaOrchestrator;
```

## Resilience Patterns

### Circuit Breaker Pattern

```javascript
// src/patterns/CircuitBreaker.js
class CircuitBreaker {
    constructor(options = {}) {
        this.name = options.name || 'CircuitBreaker';
        this.failureThreshold = options.failureThreshold || 5;
        this.recoveryTimeout = options.recoveryTimeout || 60000; // 1 minute
        this.monitoringPeriod = options.monitoringPeriod || 10000; // 10 seconds
        this.expectedErrorPercentage = options.expectedErrorPercentage || 50;
        
        this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
        this.failureCount = 0;
        this.lastFailureTime = null;
        this.nextAttemptTime = null;
        this.stats = {
            totalRequests: 0,
            failedRequests: 0,
            successfulRequests: 0,
            rejectedRequests: 0
        };

        // Reset stats periodically
        setInterval(() => this.resetStats(), this.monitoringPeriod);
    }

    async execute(operation) {
        if (this.state === 'OPEN') {
            if (Date.now() < this.nextAttemptTime) {
                this.stats.rejectedRequests++;
                throw new Error(`Circuit breaker ${this.name} is OPEN`);
            } else {
                this.state = 'HALF_OPEN';
                console.log(`🔄 Circuit breaker ${this.name} moved to HALF_OPEN`);
            }
        }

        this.stats.totalRequests++;

        try {
            const result = await this.callWithTimeout(operation);
            this.onSuccess();
            return result;
        } catch (error) {
            this.onFailure(error);
            throw error;
        }
    }

    async callWithTimeout(operation) {
        const timeout = 5000; // 5 seconds default timeout
        
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                reject(new Error('Operation timeout'));
            }, timeout);

            Promise.resolve(operation())
                .then(result => {
                    clearTimeout(timer);
                    resolve(result);
                })
                .catch(error => {
                    clearTimeout(timer);
                    reject(error);
                });
        });
    }

    onSuccess() {
        this.stats.successfulRequests++;
        
        if (this.state === 'HALF_OPEN') {
            this.state = 'CLOSED';
            this.failureCount = 0;
            console.log(`✅ Circuit breaker ${this.name} moved to CLOSED`);
        }
    }

    onFailure(error) {
        this.stats.failedRequests++;
        this.failureCount++;
        this.lastFailureTime = Date.now();

        if (this.shouldTrip()) {
            this.state = 'OPEN';
            this.nextAttemptTime = Date.now() + this.recoveryTimeout;
            console.log(`❌ Circuit breaker ${this.name} moved to OPEN due to: ${error.message}`);
        }
    }

    shouldTrip() {
        if (this.state === 'HALF_OPEN') {
            return true; // Any failure in half-open state trips the breaker
        }

        if (this.failureCount >= this.failureThreshold) {
            return true;
        }

        // Check error percentage
        if (this.stats.totalRequests >= 10) {
            const errorPercentage = (this.stats.failedRequests / this.stats.totalRequests) * 100;
            return errorPercentage >= this.expectedErrorPercentage;
        }

        return false;
    }

    getState() {
        return {
            name: this.name,
            state: this.state,
            failureCount: this.failureCount,
            stats: { ...this.stats },
            nextAttemptTime: this.nextAttemptTime,
            lastFailureTime: this.lastFailureTime
        };
    }

    resetStats() {
        this.stats = {
            totalRequests: 0,
            failedRequests: 0,
            successfulRequests: 0,
            rejectedRequests: 0
        };
    }

    forceOpen() {
        this.state = 'OPEN';
        this.nextAttemptTime = Date.now() + this.recoveryTimeout;
        console.log(`🔒 Circuit breaker ${this.name} forced to OPEN`);
    }

    forceClosed() {
        this.state = 'CLOSED';
        this.failureCount = 0;
        this.nextAttemptTime = null;
        console.log(`🔓 Circuit breaker ${this.name} forced to CLOSED`);
    }
}

class CircuitBreakerManager {
    constructor() {
        this.breakers = new Map();
    }

    getBreaker(name, options = {}) {
        if (!this.breakers.has(name)) {
            this.breakers.set(name, new CircuitBreaker({
                name,
                ...options
            }));
        }
        return this.breakers.get(name);
    }

    getAllBreakers() {
        const breakerStates = {};
        for (const [name, breaker] of this.breakers.entries()) {
            breakerStates[name] = breaker.getState();
        }
        return breakerStates;
    }

    getHealthStatus() {
        const breakers = this.getAllBreakers();
        const totalBreakers = Object.keys(breakers).length;
        const openBreakers = Object.values(breakers).filter(b => b.state === 'OPEN').length;
        const healthyBreakers = totalBreakers - openBreakers;

        return {
            totalBreakers,
            healthyBreakers,
            openBreakers,
            healthPercentage: totalBreakers > 0 ? (healthyBreakers / totalBreakers) * 100 : 100,
            breakers
        };
    }
}

module.exports = { CircuitBreaker, CircuitBreakerManager };
```

### Retry Pattern with Exponential Backoff

```javascript
// src/patterns/RetryHandler.js
class RetryHandler {
    constructor(options = {}) {
        this.maxRetries = options.maxRetries || 3;
        this.baseDelay = options.baseDelay || 1000;
        this.maxDelay = options.maxDelay || 30000;
        this.backoffMultiplier = options.backoffMultiplier || 2;
        this.jitter = options.jitter !== false; // Enable jitter by default
        this.retryCondition = options.retryCondition || this.defaultRetryCondition;
    }

    async execute(operation, context = {}) {
        let lastError;
        
        for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
            try {
                const result = await operation();
                
                if (attempt > 0) {
                    console.log(`✅ Operation succeeded on attempt ${attempt + 1}`);
                }
                
                return result;
            } catch (error) {
                lastError = error;
                
                // Check if we should retry this error
                if (!this.retryCondition(error, attempt, context)) {
                    console.log(`🚫 Error not retryable: ${error.message}`);
                    throw error;
                }

                // Don't wait after the last attempt
                if (attempt === this.maxRetries) {
                    break;
                }

                const delay = this.calculateDelay(attempt);
                console.log(`🔄 Attempt ${attempt + 1} failed, retrying in ${delay}ms: ${error.message}`);
                
                await this.sleep(delay);
            }
        }

        console.error(`❌ Operation failed after ${this.maxRetries + 1} attempts`);
        throw lastError;
    }

    calculateDelay(attempt) {
        let delay = this.baseDelay * Math.pow(this.backoffMultiplier, attempt);
        delay = Math.min(delay, this.maxDelay);
        
        if (this.jitter) {
            // Add random jitter up to 25% of the delay
            const jitterRange = delay * 0.25;
            delay += Math.random() * jitterRange - jitterRange / 2;
        }
        
        return Math.round(delay);
    }

    defaultRetryCondition(error, attempt, context) {
        // Retry on network errors
        const networkErrors = ['ECONNRESET', 'ENOTFOUND', 'ECONNREFUSED', 'ETIMEDOUT', 'EAI_AGAIN'];
        if (error.code && networkErrors.includes(error.code)) {
            return true;
        }

        // Retry on HTTP 5xx errors and 429 (rate limit)
        if (error.response?.status) {
            const status = error.response.status;
            if (status >= 500 || status === 429) {
                return true;
            }
        }

        // Don't retry on authentication/authorization errors
        if (error.response?.status === 401 || error.response?.status === 403) {
            return false;
        }

        // Retry on timeout errors
        if (error.message && error.message.toLowerCase().includes('timeout')) {
            return true;
        }

        return false;
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Specialized retry handlers for different scenarios
class DatabaseRetryHandler extends RetryHandler {
    constructor(options = {}) {
        super({
            maxRetries: 5,
            baseDelay: 500,
            maxDelay: 10000,
            retryCondition: (error) => {
                // Retry on connection errors
                const retryableErrors = [
                    'ECONNRESET',
                    'ECONNREFUSED',
                    'ETIMEDOUT',
                    'ER_LOCK_WAIT_TIMEOUT',
                    'ER_LOCK_DEADLOCK'
                ];
                
                return retryableErrors.some(code => 
                    error.code === code || error.message.includes(code)
                );
            },
            ...options
        });
    }
}

class HTTPRetryHandler extends RetryHandler {
    constructor(options = {}) {
        super({
            maxRetries: 3,
            baseDelay: 1000,
            maxDelay: 15000,
            retryCondition: (error) => {
                // Retry on network errors and 5xx responses
                if (error.code) {
                    const networkErrors = ['ECONNRESET', 'ENOTFOUND', 'ECONNREFUSED', 'ETIMEDOUT'];
                    if (networkErrors.includes(error.code)) return true;
                }

                if (error.response?.status) {
                    const status = error.response.status;
                    return status >= 500 || status === 429 || status === 408;
                }

                return false;
            },
            ...options
        });
    }
}

class MessageQueueRetryHandler extends RetryHandler {
    constructor(options = {}) {
        super({
            maxRetries: 10,
            baseDelay: 2000,
            maxDelay: 60000,
            backoffMultiplier: 1.5,
            retryCondition: (error) => {
                // Retry on temporary failures
                const retryableErrors = [
                    'ECONNREFUSED',
                    'ENOTFOUND',
                    'ETIMEDOUT',
                    'Connection failed',
                    'Channel closed'
                ];
                
                return retryableErrors.some(msg => 
                    error.message.includes(msg) || error.code === msg
                );
            },
            ...options
        });
    }
}

module.exports = {
    RetryHandler,
    DatabaseRetryHandler,
    HTTPRetryHandler,
    MessageQueueRetryHandler
};
```

## Security Patterns

### JWT Token Service with Microservice Security

```javascript
// src/security/MicroserviceJWTService.js
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const NodeRSA = require('node-rsa');

class MicroserviceJWTService {
    constructor() {
        this.publicKey = this.loadPublicKey();
        this.privateKey = this.loadPrivateKey();
        this.issuer = process.env.JWT_ISSUER || 'education-platform';
        this.audience = process.env.JWT_AUDIENCE || 'microservices';
        this.accessTokenExpiry = '15m';
        this.refreshTokenExpiry = '7d';
        this.serviceTokenExpiry = '1h';
    }

    loadPrivateKey() {
        const privateKeyPath = process.env.JWT_PRIVATE_KEY_PATH;
        const privateKeyEnv = process.env.JWT_PRIVATE_KEY;
        
        if (privateKeyPath) {
            return require('fs').readFileSync(privateKeyPath, 'utf8');
        } else if (privateKeyEnv) {
            return privateKeyEnv.replace(/\\n/g, '\n');
        }
        
        // Generate key pair for development
        if (process.env.NODE_ENV !== 'production') {
            const key = new NodeRSA({ b: 2048 });
            return key.exportKey('private');
        }
        
        throw new Error('JWT private key not configured');
    }

    loadPublicKey() {
        const publicKeyPath = process.env.JWT_PUBLIC_KEY_PATH;
        const publicKeyEnv = process.env.JWT_PUBLIC_KEY;
        
        if (publicKeyPath) {
            return require('fs').readFileSync(publicKeyPath, 'utf8');
        } else if (publicKeyEnv) {
            return publicKeyEnv.replace(/\\n/g, '\n');
        }
        
        // Extract public key from private key for development
        if (process.env.NODE_ENV !== 'production') {
            const key = new NodeRSA(this.privateKey);
            return key.exportKey('public');
        }
        
        throw new Error('JWT public key not configured');
    }

    generateAccessToken(payload, options = {}) {
        const tokenPayload = {
            sub: payload.userId,
            email: payload.email,
            role: payload.role,
            permissions: payload.permissions || [],
            scope: payload.scope || ['read', 'write'],
            type: 'access',
            ...options.additionalClaims
        };

        return jwt.sign(tokenPayload, this.privateKey, {
            algorithm: 'RS256',
            expiresIn: options.expiresIn || this.accessTokenExpiry,
            issuer: this.issuer,
            audience: this.audience,
            jwtid: this.generateJTI()
        });
    }

    generateRefreshToken(userId, options = {}) {
        const tokenPayload = {
            sub: userId,
            type: 'refresh',
            scope: ['refresh']
        };

        return jwt.sign(tokenPayload, this.privateKey, {
            algorithm: 'RS256',
            expiresIn: options.expiresIn || this.refreshTokenExpiry,
            issuer: this.issuer,
            audience: this.audience,
            jwtid: this.generateJTI()
        });
    }

    generateServiceToken(serviceName, permissions = [], options = {}) {
        const tokenPayload = {
            sub: serviceName,
            type: 'service',
            service: serviceName,
            permissions,
            scope: options.scope || ['service-to-service']
        };

        return jwt.sign(tokenPayload, this.privateKey, {
            algorithm: 'RS256',
            expiresIn: options.expiresIn || this.serviceTokenExpiry,
            issuer: this.issuer,
            audience: this.audience,
            jwtid: this.generateJTI()
        });
    }

    verifyToken(token, options = {}) {
        try {
            const decoded = jwt.verify(token, this.publicKey, {
                algorithms: ['RS256'],
                issuer: this.issuer,
                audience: this.audience,
                ...options
            });

            return {
                valid: true,
                decoded,
                expired: false
            };
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                return {
                    valid: false,
                    decoded: null,
                    expired: true,
                    error: 'Token expired'
                };
            }

            return {
                valid: false,
                decoded: null,
                expired: false,
                error: error.message
            };
        }
    }

    decodeTokenWithoutVerification(token) {
        try {
            return jwt.decode(token, { complete: true });
        } catch (error) {
            return null;
        }
    }

    extractTokenFromHeader(authHeader) {
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return null;
        }
        return authHeader.substring(7);
    }

    generateJTI() {
        return crypto.randomBytes(16).toString('hex');
    }

    // Middleware for token validation
    authenticateToken(options = {}) {
        return (req, res, next) => {
            const token = this.extractTokenFromHeader(req.headers.authorization);
            
            if (!token) {
                return res.status(401).json({
                    error: 'Authentication required',
                    message: 'No token provided'
                });
            }

            const verification = this.verifyToken(token, options);
            
            if (!verification.valid) {
                const status = verification.expired ? 401 : 403;
                return res.status(status).json({
                    error: verification.expired ? 'Token expired' : 'Invalid token',
                    message: verification.error
                });
            }

            req.user = verification.decoded;
            req.token = token;
            next();
        };
    }

    // Middleware for role-based authorization
    authorize(requiredRoles = [], requiredPermissions = []) {
        return (req, res, next) => {
            if (!req.user) {
                return res.status(401).json({
                    error: 'Authentication required'
                });
            }

            // Check roles
            if (requiredRoles.length > 0) {
                if (!requiredRoles.includes(req.user.role)) {
                    return res.status(403).json({
                        error: 'Insufficient privileges',
                        message: `Required role: ${requiredRoles.join(' or ')}`
                    });
                }
            }

            // Check permissions
            if (requiredPermissions.length > 0) {
                const userPermissions = req.user.permissions || [];
                const hasPermission = requiredPermissions.every(permission =>
                    userPermissions.includes(permission)
                );

                if (!hasPermission) {
                    return res.status(403).json({
                        error: 'Insufficient permissions',
                        message: `Required permissions: ${requiredPermissions.join(', ')}`
                    });
                }
            }

            next();
        };
    }

    // Service-to-service authentication middleware
    authenticateService(allowedServices = []) {
        return (req, res, next) => {
            const token = this.extractTokenFromHeader(req.headers.authorization);
            
            if (!token) {
                return res.status(401).json({
                    error: 'Service authentication required'
                });
            }

            const verification = this.verifyToken(token);
            
            if (!verification.valid || verification.decoded.type !== 'service') {
                return res.status(403).json({
                    error: 'Invalid service token'
                });
            }

            if (allowedServices.length > 0 && !allowedServices.includes(verification.decoded.service)) {
                return res.status(403).json({
                    error: 'Service not authorized',
                    message: `Service ${verification.decoded.service} not in allowed list`
                });
            }

            req.service = verification.decoded;
            req.token = token;
            next();
        };
    }
}

module.exports = new MicroserviceJWTService();
```

## API Gateway Pattern

### Comprehensive API Gateway Implementation

```javascript
// src/gateway/APIGateway.js
const express = require('express');
const httpProxy = require('http-proxy-middleware');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const ServiceMesh = require('../infrastructure/ServiceMesh');
const MicroserviceJWTService = require('../security/MicroserviceJWTService');

class APIGateway {
    constructor() {
        this.app = express();
        this.serviceMesh = new ServiceMesh();
        this.routes = new Map();
        this.middlewares = new Map();
        
        this.setupGlobalMiddleware();
        this.setupServiceRoutes();
        this.setupHealthChecks();
    }

    setupGlobalMiddleware() {
        // Security headers
        this.app.use(helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    styleSrc: ["'self'", "'unsafe-inline'"],
                    scriptSrc: ["'self'"],
                    imgSrc: ["'self'", "data:", "https:"],
                }
            }
        }));

        // CORS
        this.app.use(cors({
            origin: this.getAllowedOrigins(),
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
        }));

        // Compression
        this.app.use(compression());

        // Body parsing
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

        // Rate limiting
        this.app.use(this.createGlobalRateLimit());

        // Request logging
        this.app.use(this.logRequests());
    }

    setupServiceRoutes() {
        const services = [
            {
                name: 'user-service',
                path: '/api/users',
                target: 'http://localhost:3001',
                auth: true,
                rateLimit: { windowMs: 15 * 60 * 1000, max: 1000 }
            },
            {
                name: 'course-service',
                path: '/api/courses',
                target: 'http://localhost:3002',
                auth: true,
                rateLimit: { windowMs: 15 * 60 * 1000, max: 500 }
            },
            {
                name: 'assessment-service',
                path: '/api/assessments',
                target: 'http://localhost:3003',
                auth: true,
                rateLimit: { windowMs: 15 * 60 * 1000, max: 200 }
            },
            {
                name: 'progress-service',
                path: '/api/progress',
                target: 'http://localhost:3004',
                auth: true,
                rateLimit: { windowMs: 15 * 60 * 1000, max: 300 }
            },
            {
                name: 'notification-service',
                path: '/api/notifications',
                target: 'http://localhost:3005',
                auth: true,
                rateLimit: { windowMs: 15 * 60 * 1000, max: 100 }
            },
            {
                name: 'media-service',
                path: '/api/media',
                target: 'http://localhost:3006',
                auth: true,
                rateLimit: { windowMs: 15 * 60 * 1000, max: 50 }
            },
            {
                name: 'payment-service',
                path: '/api/payments',
                target: 'http://localhost:3007',
                auth: true,
                rateLimit: { windowMs: 15 * 60 * 1000, max: 50 }
            },
            {
                name: 'analytics-service',
                path: '/api/analytics',
                target: 'http://localhost:3008',
                auth: true,
                rateLimit: { windowMs: 15 * 60 * 1000, max: 200 }
            }
        ];

        for (const service of services) {
            this.registerServiceRoute(service);
        }
    }

    registerServiceRoute(serviceConfig) {
        const middlewares = [];

        // Add rate limiting
        if (serviceConfig.rateLimit) {
            middlewares.push(this.createServiceRateLimit(serviceConfig));
        }

        // Add authentication
        if (serviceConfig.auth) {
            middlewares.push(MicroserviceJWTService.authenticateToken());
        }

        // Add request transformation
        middlewares.push(this.transformRequest(serviceConfig));

        // Create proxy
        const proxy = this.createServiceProxy(serviceConfig);
        
        this.app.use(serviceConfig.path, ...middlewares, proxy);
        
        this.routes.set(serviceConfig.name, {
            path: serviceConfig.path,
            target: serviceConfig.target,
            middlewares: middlewares.length
        });

        console.log(`🔗 Route registered: ${serviceConfig.path} -> ${serviceConfig.target}`);
    }

    createServiceProxy(serviceConfig) {
        return httpProxy({
            target: serviceConfig.target,
            changeOrigin: true,
            pathRewrite: (path) => {
                // Remove the service prefix from the path
                return path.replace(serviceConfig.path, '');
            },
            onProxyReq: (proxyReq, req, res) => {
                // Add service identification headers
                proxyReq.setHeader('X-Gateway-Service', serviceConfig.name);
                proxyReq.setHeader('X-Request-ID', req.requestId);
                proxyReq.setHeader('X-Forwarded-For', req.ip);
                
                // Forward user context
                if (req.user) {
                    proxyReq.setHeader('X-User-ID', req.user.sub);
                    proxyReq.setHeader('X-User-Role', req.user.role);
                    proxyReq.setHeader('X-User-Permissions', JSON.stringify(req.user.permissions || []));
                }
            },
            onProxyRes: (proxyRes, req, res) => {
                // Add gateway headers to response
                proxyRes.headers['X-Gateway-Service'] = serviceConfig.name;
                proxyRes.headers['X-Response-Time'] = Date.now() - req.startTime;
            },
            onError: (err, req, res) => {
                console.error(`Proxy error for ${serviceConfig.name}:`, err.message);
                
                res.status(502).json({
                    error: 'Service unavailable',
                    message: `${serviceConfig.name} is currently unavailable`,
                    requestId: req.requestId
                });
            }
        });
    }

    createGlobalRateLimit() {
        return rateLimit({
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 5000, // Global limit
            message: {
                error: 'Too many requests',
                message: 'Global rate limit exceeded'
            },
            standardHeaders: true,
            legacyHeaders: false
        });
    }

    createServiceRateLimit(serviceConfig) {
        return rateLimit({
            ...serviceConfig.rateLimit,
            message: {
                error: 'Too many requests',
                message: `Rate limit exceeded for ${serviceConfig.name}`
            },
            keyGenerator: (req) => {
                // Use user ID if authenticated, otherwise IP
                return req.user ? `user:${req.user.sub}` : `ip:${req.ip}`;
            }
        });
    }

    transformRequest(serviceConfig) {
        return (req, res, next) => {
            // Add request metadata
            req.requestId = this.generateRequestId();
            req.startTime = Date.now();
            
            // Add service context
            req.targetService = serviceConfig.name;
            
            next();
        };
    }

    logRequests() {
        return (req, res, next) => {
            const start = Date.now();
            
            res.on('finish', () => {
                const duration = Date.now() - start;
                console.log(`${req.method} ${req.path} ${res.statusCode} - ${duration}ms`);
            });
            
            next();
        };
    }

    setupHealthChecks() {
        // Gateway health check
        this.app.get('/health', async (req, res) => {
            const health = {
                status: 'healthy',
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                version: process.env.npm_package_version || '1.0.0',
                services: {}
            };

            // Check all registered services
            for (const [serviceName] of this.routes) {
                try {
                    const serviceHealth = await this.checkServiceHealth(serviceName);
                    health.services[serviceName] = serviceHealth;
                } catch (error) {
                    health.services[serviceName] = {
                        status: 'unhealthy',
                        error: error.message
                    };
                    health.status = 'degraded';
                }
            }

            const statusCode = health.status === 'healthy' ? 200 : 503;
            res.status(statusCode).json(health);
        });

        // Individual service health checks
        this.app.get('/health/:service', async (req, res) => {
            const serviceName = req.params.service;
            
            try {
                const health = await this.checkServiceHealth(serviceName);
                res.json(health);
            } catch (error) {
                res.status(503).json({
                    status: 'unhealthy',
                    service: serviceName,
                    error: error.message
                });
            }
        });

        // Gateway metrics
        this.app.get('/metrics', (req, res) => {
            res.json({
                routes: Object.fromEntries(this.routes),
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                cpu: process.cpuUsage()
            });
        });
    }

    async checkServiceHealth(serviceName) {
        // Implementation would check actual service health
        // This is a simplified version
        return {
            status: 'healthy',
            lastCheck: new Date().toISOString()
        };
    }

    getAllowedOrigins() {
        const origins = process.env.ALLOWED_ORIGINS?.split(',') || [];
        
        if (process.env.NODE_ENV === 'development') {
            origins.push('http://localhost:3000', 'http://localhost:3001');
        }
        
        return origins;
    }

    generateRequestId() {
        return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    async start(port = process.env.PORT || 3000) {
        const server = this.app.listen(port, () => {
            console.log(`🚪 API Gateway running on port ${port}`);
            console.log(`📊 Environment: ${process.env.NODE_ENV}`);
            console.log(`🛡️ Security: Enhanced`);
            console.log(`🔗 Routes: ${this.routes.size} services registered`);
        });

        // Graceful shutdown
        process.on('SIGTERM', () => {
            console.log('🛑 SIGTERM received, shutting down gracefully');
            server.close(() => {
                console.log('🔌 API Gateway stopped');
                process.exit(0);
            });
        });

        return server;
    }
}

module.exports = APIGateway;
```

This comprehensive microservices design patterns documentation provides a complete foundation for the 7P Education Platform's service-oriented architecture. The implementation covers all essential patterns including service discovery, circuit breakers, event-driven communication, saga patterns, and comprehensive security measures to ensure scalable, resilient, and maintainable microservices at enterprise scale.