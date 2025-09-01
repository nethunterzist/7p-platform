# Node.js Express API Architecture for 7P Education Platform

## Executive Summary

This document outlines the comprehensive Node.js Express API architecture for the 7P Education Platform, designed to handle high-traffic educational applications with scalability, security, and maintainability as core principles. The architecture supports microservices patterns, implements advanced middleware systems, and ensures optimal performance for concurrent user loads exceeding 10,000 active sessions.

## Table of Contents

1. [API Architecture Overview](#api-architecture-overview)
2. [Express.js Framework Implementation](#expressjs-framework-implementation)
3. [Middleware Architecture](#middleware-architecture)
4. [Route Management System](#route-management-system)
5. [Authentication & Authorization](#authentication--authorization)
6. [Data Layer Integration](#data-layer-integration)
7. [Error Handling Framework](#error-handling-framework)
8. [Performance Optimization](#performance-optimization)
9. [Security Implementation](#security-implementation)
10. [Testing Strategy](#testing-strategy)
11. [Monitoring & Logging](#monitoring--logging)
12. [Deployment Architecture](#deployment-architecture)

## API Architecture Overview

### Core Architecture Principles

The 7P Education Platform API follows a layered architecture approach with clear separation of concerns:

```javascript
// src/app.js - Main Application Architecture
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

class APIServer {
    constructor() {
        this.app = express();
        this.server = null;
        this.initializeMiddleware();
        this.initializeRoutes();
        this.initializeErrorHandling();
    }

    initializeMiddleware() {
        // Security middleware
        this.app.use(helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    styleSrc: ["'self'", "'unsafe-inline'"],
                    scriptSrc: ["'self'"],
                    imgSrc: ["'self'", "data:", "https:"],
                }
            },
            hsts: {
                maxAge: 31536000,
                includeSubDomains: true,
                preload: true
            }
        }));

        // CORS configuration
        this.app.use(cors({
            origin: this.getAllowedOrigins(),
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
        }));

        // Compression and parsing
        this.app.use(compression({ level: 6 }));
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

        // Rate limiting
        this.app.use(this.configureRateLimit());
    }

    configureRateLimit() {
        return rateLimit({
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 1000, // limit each IP to 1000 requests per windowMs
            standardHeaders: true,
            legacyHeaders: false,
            handler: (req, res) => {
                res.status(429).json({
                    error: 'Too many requests',
                    message: 'Rate limit exceeded. Please try again later.',
                    retryAfter: Math.round(req.rateLimit.resetTime / 1000)
                });
            }
        });
    }

    getAllowedOrigins() {
        return process.env.NODE_ENV === 'production' 
            ? ['https://7peducation.com', 'https://api.7peducation.com']
            : ['http://localhost:3000', 'http://localhost:3001'];
    }

    async start(port = process.env.PORT || 3000) {
        this.server = this.app.listen(port, () => {
            console.log(`🚀 7P Education API Server running on port ${port}`);
            console.log(`📊 Environment: ${process.env.NODE_ENV}`);
            console.log(`🔒 Security: Enhanced`);
        });

        return this.server;
    }

    async stop() {
        if (this.server) {
            await new Promise(resolve => this.server.close(resolve));
            console.log('🛑 Server stopped gracefully');
        }
    }
}

module.exports = APIServer;
```

### Microservices Architecture Integration

```javascript
// src/services/ServiceRegistry.js
class ServiceRegistry {
    constructor() {
        this.services = new Map();
        this.healthCheckInterval = null;
        this.initializeServices();
    }

    initializeServices() {
        const services = [
            { name: 'user-service', url: process.env.USER_SERVICE_URL, health: '/health' },
            { name: 'course-service', url: process.env.COURSE_SERVICE_URL, health: '/health' },
            { name: 'assessment-service', url: process.env.ASSESSMENT_SERVICE_URL, health: '/health' },
            { name: 'notification-service', url: process.env.NOTIFICATION_SERVICE_URL, health: '/health' },
            { name: 'analytics-service', url: process.env.ANALYTICS_SERVICE_URL, health: '/health' }
        ];

        services.forEach(service => {
            this.services.set(service.name, {
                ...service,
                status: 'unknown',
                lastCheck: null,
                responseTime: null
            });
        });

        this.startHealthChecks();
    }

    async startHealthChecks() {
        this.healthCheckInterval = setInterval(async () => {
            for (const [name, service] of this.services.entries()) {
                await this.checkServiceHealth(name, service);
            }
        }, 30000); // Check every 30 seconds
    }

    async checkServiceHealth(name, service) {
        const startTime = Date.now();
        try {
            const response = await fetch(`${service.url}${service.health}`, {
                method: 'GET',
                timeout: 5000
            });

            const responseTime = Date.now() - startTime;
            const status = response.ok ? 'healthy' : 'unhealthy';

            this.services.set(name, {
                ...service,
                status,
                lastCheck: new Date(),
                responseTime
            });

            if (status === 'unhealthy') {
                console.warn(`⚠️ Service ${name} is unhealthy (${response.status})`);
            }
        } catch (error) {
            this.services.set(name, {
                ...service,
                status: 'down',
                lastCheck: new Date(),
                responseTime: Date.now() - startTime,
                error: error.message
            });

            console.error(`❌ Service ${name} is down: ${error.message}`);
        }
    }

    getService(name) {
        return this.services.get(name);
    }

    getAllServices() {
        return Object.fromEntries(this.services);
    }

    isServiceHealthy(name) {
        const service = this.services.get(name);
        return service && service.status === 'healthy';
    }
}

module.exports = new ServiceRegistry();
```

## Express.js Framework Implementation

### Advanced Server Configuration

```javascript
// src/config/server.js
const cluster = require('cluster');
const os = require('os');
const APIServer = require('../app');

class ClusterManager {
    constructor() {
        this.workers = new Map();
        this.maxWorkers = process.env.MAX_WORKERS || os.cpus().length;
    }

    start() {
        if (cluster.isMaster) {
            console.log(`🏭 Master process ${process.pid} started`);
            console.log(`📊 Starting ${this.maxWorkers} worker processes`);

            // Fork workers
            for (let i = 0; i < this.maxWorkers; i++) {
                this.forkWorker();
            }

            // Handle worker events
            cluster.on('exit', (worker, code, signal) => {
                console.log(`💀 Worker ${worker.process.pid} died (${signal || code})`);
                this.workers.delete(worker.id);
                
                if (!worker.exitedAfterDisconnect) {
                    console.log('🔄 Restarting worker...');
                    this.forkWorker();
                }
            });

            cluster.on('online', (worker) => {
                console.log(`✅ Worker ${worker.process.pid} online`);
            });

            // Graceful shutdown
            process.on('SIGTERM', () => this.gracefulShutdown());
            process.on('SIGINT', () => this.gracefulShutdown());

        } else {
            // Worker process
            const server = new APIServer();
            server.start().catch(console.error);

            process.on('message', (msg) => {
                if (msg === 'shutdown') {
                    server.stop().then(() => process.exit(0));
                }
            });
        }
    }

    forkWorker() {
        const worker = cluster.fork();
        this.workers.set(worker.id, {
            worker,
            startTime: new Date(),
            requests: 0
        });
        return worker;
    }

    async gracefulShutdown() {
        console.log('🛑 Graceful shutdown initiated');

        for (const [id, { worker }] of this.workers) {
            worker.send('shutdown');
            worker.disconnect();
        }

        setTimeout(() => {
            console.log('⏰ Force shutdown after timeout');
            process.exit(1);
        }, 10000);
    }
}

if (require.main === module) {
    const clusterManager = new ClusterManager();
    clusterManager.start();
}

module.exports = ClusterManager;
```

### Environment Configuration Management

```javascript
// src/config/environment.js
const path = require('path');
const fs = require('fs');

class EnvironmentConfig {
    constructor() {
        this.env = process.env.NODE_ENV || 'development';
        this.config = this.loadConfig();
        this.validateConfig();
    }

    loadConfig() {
        const configPath = path.join(__dirname, `../../config/${this.env}.json`);
        
        if (!fs.existsSync(configPath)) {
            throw new Error(`Configuration file not found: ${configPath}`);
        }

        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        
        // Override with environment variables
        return {
            ...config,
            port: process.env.PORT || config.port,
            database: {
                ...config.database,
                host: process.env.DB_HOST || config.database.host,
                port: process.env.DB_PORT || config.database.port,
                username: process.env.DB_USERNAME || config.database.username,
                password: process.env.DB_PASSWORD || config.database.password,
                database: process.env.DB_NAME || config.database.database
            },
            redis: {
                ...config.redis,
                host: process.env.REDIS_HOST || config.redis.host,
                port: process.env.REDIS_PORT || config.redis.port,
                password: process.env.REDIS_PASSWORD || config.redis.password
            },
            jwt: {
                ...config.jwt,
                secret: process.env.JWT_SECRET || config.jwt.secret,
                expiresIn: process.env.JWT_EXPIRES_IN || config.jwt.expiresIn
            }
        };
    }

    validateConfig() {
        const required = [
            'port',
            'database.host',
            'database.username',
            'database.password',
            'jwt.secret'
        ];

        for (const key of required) {
            if (!this.get(key)) {
                throw new Error(`Missing required configuration: ${key}`);
            }
        }

        // Environment-specific validations
        if (this.env === 'production') {
            this.validateProductionConfig();
        }
    }

    validateProductionConfig() {
        const productionRequirements = [
            'redis.host',
            'smtp.host',
            'aws.accessKeyId',
            'aws.secretAccessKey'
        ];

        for (const key of productionRequirements) {
            if (!this.get(key)) {
                console.warn(`⚠️ Missing production configuration: ${key}`);
            }
        }
    }

    get(key) {
        return key.split('.').reduce((obj, k) => obj && obj[k], this.config);
    }

    isDevelopment() {
        return this.env === 'development';
    }

    isProduction() {
        return this.env === 'production';
    }

    isTest() {
        return this.env === 'test';
    }
}

module.exports = new EnvironmentConfig();
```

## Middleware Architecture

### Authentication Middleware

```javascript
// src/middleware/auth.js
const jwt = require('jsonwebtoken');
const redis = require('../services/redis');
const User = require('../models/User');
const config = require('../config/environment');

class AuthenticationMiddleware {
    static async authenticate(req, res, next) {
        try {
            const token = AuthenticationMiddleware.extractToken(req);
            
            if (!token) {
                return res.status(401).json({
                    error: 'Authentication required',
                    message: 'No token provided'
                });
            }

            // Check token blacklist
            const isBlacklisted = await redis.get(`blacklist:${token}`);
            if (isBlacklisted) {
                return res.status(401).json({
                    error: 'Token invalid',
                    message: 'Token has been revoked'
                });
            }

            // Verify JWT token
            const decoded = jwt.verify(token, config.get('jwt.secret'));
            
            // Check if user still exists
            const user = await User.findById(decoded.userId);
            if (!user || !user.isActive) {
                return res.status(401).json({
                    error: 'User not found',
                    message: 'User account no longer exists or is inactive'
                });
            }

            // Check if password was changed after token was issued
            if (user.passwordChangedAt && decoded.iat < user.passwordChangedAt.getTime() / 1000) {
                return res.status(401).json({
                    error: 'Token expired',
                    message: 'Password was changed. Please log in again.'
                });
            }

            // Store user in request context
            req.user = user;
            req.token = token;
            
            next();
        } catch (error) {
            if (error.name === 'JsonWebTokenError') {
                return res.status(401).json({
                    error: 'Invalid token',
                    message: 'Token is malformed'
                });
            }
            
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({
                    error: 'Token expired',
                    message: 'Please log in again'
                });
            }

            console.error('Authentication error:', error);
            res.status(500).json({
                error: 'Internal server error',
                message: 'Authentication verification failed'
            });
        }
    }

    static extractToken(req) {
        const authHeader = req.headers.authorization;
        
        if (authHeader && authHeader.startsWith('Bearer ')) {
            return authHeader.substring(7);
        }
        
        // Check for token in cookies (for web app)
        if (req.cookies && req.cookies.token) {
            return req.cookies.token;
        }
        
        return null;
    }

    static authorize(...roles) {
        return (req, res, next) => {
            if (!req.user) {
                return res.status(401).json({
                    error: 'Authentication required',
                    message: 'Please log in to access this resource'
                });
            }

            if (roles.length && !roles.includes(req.user.role)) {
                return res.status(403).json({
                    error: 'Access denied',
                    message: `Required role: ${roles.join(' or ')}`
                });
            }

            next();
        };
    }

    static async revokeToken(token) {
        try {
            const decoded = jwt.decode(token);
            if (decoded && decoded.exp) {
                const ttl = decoded.exp - Math.floor(Date.now() / 1000);
                if (ttl > 0) {
                    await redis.setex(`blacklist:${token}`, ttl, 'revoked');
                }
            }
        } catch (error) {
            console.error('Token revocation error:', error);
        }
    }
}

module.exports = AuthenticationMiddleware;
```

### Request Validation Middleware

```javascript
// src/middleware/validation.js
const Joi = require('joi');
const sanitizeHtml = require('sanitize-html');

class ValidationMiddleware {
    static validate(schema, options = {}) {
        return (req, res, next) => {
            const { body = true, params = true, query = true } = options;
            const toValidate = {};

            if (body && req.body) toValidate.body = req.body;
            if (params && req.params) toValidate.params = req.params;
            if (query && req.query) toValidate.query = req.query;

            const { error, value } = schema.validate(toValidate, {
                abortEarly: false,
                stripUnknown: true,
                convert: true
            });

            if (error) {
                const errors = error.details.map(detail => ({
                    field: detail.path.join('.'),
                    message: detail.message,
                    value: detail.context.value
                }));

                return res.status(400).json({
                    error: 'Validation failed',
                    message: 'Request data is invalid',
                    details: errors
                });
            }

            // Update request with validated and sanitized data
            if (value.body) req.body = ValidationMiddleware.sanitizeInput(value.body);
            if (value.params) req.params = value.params;
            if (value.query) req.query = value.query;

            next();
        };
    }

    static sanitizeInput(input) {
        if (typeof input === 'string') {
            return sanitizeHtml(input, {
                allowedTags: [],
                allowedAttributes: {},
                disallowedTagsMode: 'discard'
            });
        }

        if (Array.isArray(input)) {
            return input.map(item => ValidationMiddleware.sanitizeInput(item));
        }

        if (input && typeof input === 'object') {
            const sanitized = {};
            for (const [key, value] of Object.entries(input)) {
                sanitized[key] = ValidationMiddleware.sanitizeInput(value);
            }
            return sanitized;
        }

        return input;
    }

    // Common validation schemas
    static get schemas() {
        return {
            user: {
                create: Joi.object({
                    body: Joi.object({
                        email: Joi.string().email().required(),
                        password: Joi.string().min(8).pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])')).required(),
                        firstName: Joi.string().min(2).max(50).required(),
                        lastName: Joi.string().min(2).max(50).required(),
                        role: Joi.string().valid('student', 'teacher', 'admin').default('student')
                    })
                }),
                
                update: Joi.object({
                    body: Joi.object({
                        firstName: Joi.string().min(2).max(50),
                        lastName: Joi.string().min(2).max(50),
                        phone: Joi.string().pattern(new RegExp('^[+]?[1-9][\d]{0,15}$')),
                        bio: Joi.string().max(500),
                        preferences: Joi.object({
                            language: Joi.string().valid('en', 'tr', 'es', 'fr'),
                            timezone: Joi.string(),
                            notifications: Joi.object({
                                email: Joi.boolean(),
                                push: Joi.boolean(),
                                sms: Joi.boolean()
                            })
                        })
                    }),
                    params: Joi.object({
                        userId: Joi.string().pattern(new RegExp('^[0-9a-fA-F]{24}$')).required()
                    })
                })
            },

            course: {
                create: Joi.object({
                    body: Joi.object({
                        title: Joi.string().min(3).max(200).required(),
                        description: Joi.string().min(10).max(2000).required(),
                        category: Joi.string().required(),
                        level: Joi.string().valid('beginner', 'intermediate', 'advanced').required(),
                        price: Joi.number().min(0).precision(2),
                        duration: Joi.number().min(1).required(),
                        tags: Joi.array().items(Joi.string().min(2).max(30)).max(10),
                        prerequisites: Joi.array().items(Joi.string()),
                        learningObjectives: Joi.array().items(Joi.string().min(5).max(200)).min(1).required()
                    })
                }),

                enroll: Joi.object({
                    params: Joi.object({
                        courseId: Joi.string().pattern(new RegExp('^[0-9a-fA-F]{24}$')).required()
                    }),
                    body: Joi.object({
                        paymentMethod: Joi.string().valid('credit_card', 'paypal', 'bank_transfer'),
                        couponCode: Joi.string().alphanum().min(4).max(20)
                    })
                })
            }
        };
    }
}

module.exports = ValidationMiddleware;
```

### Performance Monitoring Middleware

```javascript
// src/middleware/monitoring.js
const prometheus = require('prom-client');

class MonitoringMiddleware {
    constructor() {
        this.register = new prometheus.Registry();
        this.setupMetrics();
        this.register.setDefaultLabels({
            app: '7p-education-api'
        });
    }

    setupMetrics() {
        // HTTP request duration histogram
        this.httpRequestDuration = new prometheus.Histogram({
            name: 'http_request_duration_seconds',
            help: 'Duration of HTTP requests in seconds',
            labelNames: ['method', 'route', 'status'],
            buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5]
        });

        // HTTP request counter
        this.httpRequestTotal = new prometheus.Counter({
            name: 'http_requests_total',
            help: 'Total number of HTTP requests',
            labelNames: ['method', 'route', 'status']
        });

        // Active connections gauge
        this.activeConnections = new prometheus.Gauge({
            name: 'http_active_connections',
            help: 'Number of active HTTP connections'
        });

        // Database query duration
        this.dbQueryDuration = new prometheus.Histogram({
            name: 'database_query_duration_seconds',
            help: 'Duration of database queries',
            labelNames: ['operation', 'table'],
            buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2]
        });

        // Memory usage gauge
        this.memoryUsage = new prometheus.Gauge({
            name: 'nodejs_memory_usage_bytes',
            help: 'Memory usage in bytes',
            labelNames: ['type']
        });

        this.register.registerMetric(this.httpRequestDuration);
        this.register.registerMetric(this.httpRequestTotal);
        this.register.registerMetric(this.activeConnections);
        this.register.registerMetric(this.dbQueryDuration);
        this.register.registerMetric(this.memoryUsage);

        // Update memory metrics every 30 seconds
        setInterval(() => {
            const memUsage = process.memoryUsage();
            this.memoryUsage.set({ type: 'rss' }, memUsage.rss);
            this.memoryUsage.set({ type: 'heapUsed' }, memUsage.heapUsed);
            this.memoryUsage.set({ type: 'heapTotal' }, memUsage.heapTotal);
            this.memoryUsage.set({ type: 'external' }, memUsage.external);
        }, 30000);
    }

    requestMetrics() {
        return (req, res, next) => {
            const start = Date.now();
            
            this.activeConnections.inc();
            
            res.on('finish', () => {
                const duration = (Date.now() - start) / 1000;
                const route = req.route ? req.route.path : req.path;
                
                this.httpRequestDuration
                    .labels(req.method, route, res.statusCode.toString())
                    .observe(duration);
                
                this.httpRequestTotal
                    .labels(req.method, route, res.statusCode.toString())
                    .inc();
                
                this.activeConnections.dec();
            });
            
            next();
        };
    }

    databaseMetrics() {
        return {
            queryStart: (operation, table) => {
                const start = Date.now();
                return () => {
                    const duration = (Date.now() - start) / 1000;
                    this.dbQueryDuration.labels(operation, table).observe(duration);
                };
            }
        };
    }

    getMetrics() {
        return this.register.metrics();
    }
}

module.exports = new MonitoringMiddleware();
```

## Route Management System

### Dynamic Route Registration

```javascript
// src/routes/index.js
const express = require('express');
const fs = require('fs');
const path = require('path');

class RouteManager {
    constructor() {
        this.router = express.Router();
        this.routes = new Map();
        this.middlewareStack = [];
        this.loadRoutes();
    }

    loadRoutes() {
        const routesDir = __dirname;
        const routeFiles = fs.readdirSync(routesDir)
            .filter(file => file.endsWith('.js') && file !== 'index.js');

        routeFiles.forEach(file => {
            const routePath = path.join(routesDir, file);
            const routeModule = require(routePath);
            const routeName = path.basename(file, '.js');
            
            if (typeof routeModule === 'function') {
                this.registerRoute(routeName, routeModule);
            } else if (routeModule.router) {
                this.registerRoute(routeName, routeModule.router, routeModule.middleware);
            }
        });
    }

    registerRoute(name, routerOrFunction, middleware = []) {
        const basePath = `/${name}`;
        
        // Apply route-specific middleware
        if (middleware.length > 0) {
            this.router.use(basePath, ...middleware);
        }
        
        this.router.use(basePath, routerOrFunction);
        
        this.routes.set(name, {
            path: basePath,
            middleware: middleware.map(m => m.name || 'anonymous'),
            registeredAt: new Date()
        });
        
        console.log(`📍 Route registered: ${basePath}`);
    }

    addGlobalMiddleware(middleware) {
        this.middlewareStack.push(middleware);
        this.router.use(middleware);
    }

    getRouteInfo() {
        return {
            routes: Object.fromEntries(this.routes),
            globalMiddleware: this.middlewareStack.map(m => m.name || 'anonymous'),
            totalRoutes: this.routes.size
        };
    }

    getRouter() {
        return this.router;
    }
}

module.exports = new RouteManager();
```

### Advanced Route Definitions

```javascript
// src/routes/users.js
const express = require('express');
const rateLimit = require('express-rate-limit');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const UserController = require('../controllers/UserController');

const router = express.Router();

// Rate limiting for user operations
const userRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: {
        error: 'Too many requests',
        message: 'Please try again later'
    }
});

// User registration with validation
router.post('/register', 
    userRateLimit,
    validate(ValidationMiddleware.schemas.user.create),
    UserController.register
);

// User authentication
router.post('/login',
    userRateLimit,
    validate(Joi.object({
        body: Joi.object({
            email: Joi.string().email().required(),
            password: Joi.string().required(),
            rememberMe: Joi.boolean().default(false)
        })
    })),
    UserController.login
);

// Protected routes
router.use(authenticate); // All routes below require authentication

// User profile management
router.get('/profile', UserController.getProfile);
router.put('/profile', 
    validate(ValidationMiddleware.schemas.user.update),
    UserController.updateProfile
);

// Password management
router.post('/change-password',
    validate(Joi.object({
        body: Joi.object({
            currentPassword: Joi.string().required(),
            newPassword: Joi.string().min(8).pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])')).required(),
            confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required()
        })
    })),
    UserController.changePassword
);

// Admin routes
router.get('/all', 
    authorize('admin'),
    UserController.getAllUsers
);

router.put('/:userId',
    authorize('admin'),
    validate(ValidationMiddleware.schemas.user.update),
    UserController.updateUser
);

router.delete('/:userId',
    authorize('admin'),
    validate(Joi.object({
        params: Joi.object({
            userId: Joi.string().pattern(new RegExp('^[0-9a-fA-F]{24}$')).required()
        })
    })),
    UserController.deleteUser
);

// User preferences and settings
router.get('/preferences', UserController.getPreferences);
router.put('/preferences',
    validate(Joi.object({
        body: Joi.object({
            language: Joi.string().valid('en', 'tr', 'es', 'fr'),
            timezone: Joi.string(),
            notifications: Joi.object({
                email: Joi.boolean(),
                push: Joi.boolean(),
                sms: Joi.boolean()
            }),
            privacy: Joi.object({
                profileVisible: Joi.boolean(),
                showProgress: Joi.boolean(),
                allowMessages: Joi.boolean()
            })
        })
    })),
    UserController.updatePreferences
);

// User statistics and analytics
router.get('/statistics', UserController.getUserStatistics);
router.get('/progress', UserController.getUserProgress);
router.get('/achievements', UserController.getUserAchievements);

module.exports = { router, middleware: [userRateLimit] };
```

## Authentication & Authorization

### JWT Token Management

```javascript
// src/services/TokenService.js
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const redis = require('./redis');
const config = require('../config/environment');

class TokenService {
    constructor() {
        this.accessTokenExpiry = config.get('jwt.accessTokenExpiry') || '15m';
        this.refreshTokenExpiry = config.get('jwt.refreshTokenExpiry') || '7d';
        this.jwtSecret = config.get('jwt.secret');
        this.refreshSecret = config.get('jwt.refreshSecret') || this.jwtSecret + '_refresh';
    }

    generateAccessToken(payload) {
        return jwt.sign(payload, this.jwtSecret, {
            expiresIn: this.accessTokenExpiry,
            issuer: '7p-education',
            audience: 'api'
        });
    }

    generateRefreshToken(userId) {
        const payload = { userId, type: 'refresh' };
        return jwt.sign(payload, this.refreshSecret, {
            expiresIn: this.refreshTokenExpiry,
            issuer: '7p-education',
            audience: 'api'
        });
    }

    async generateTokenPair(user) {
        const payload = {
            userId: user._id,
            email: user.email,
            role: user.role,
            permissions: user.permissions || []
        };

        const accessToken = this.generateAccessToken(payload);
        const refreshToken = this.generateRefreshToken(user._id);

        // Store refresh token in Redis
        await redis.setex(
            `refresh_token:${user._id}`,
            this.parseExpiryToSeconds(this.refreshTokenExpiry),
            refreshToken
        );

        return { accessToken, refreshToken };
    }

    async refreshAccessToken(refreshToken) {
        try {
            const decoded = jwt.verify(refreshToken, this.refreshSecret);
            
            if (decoded.type !== 'refresh') {
                throw new Error('Invalid token type');
            }

            // Check if refresh token exists in Redis
            const storedToken = await redis.get(`refresh_token:${decoded.userId}`);
            if (storedToken !== refreshToken) {
                throw new Error('Refresh token not found or expired');
            }

            // Get updated user data
            const User = require('../models/User');
            const user = await User.findById(decoded.userId);
            
            if (!user || !user.isActive) {
                throw new Error('User not found or inactive');
            }

            // Generate new access token
            const payload = {
                userId: user._id,
                email: user.email,
                role: user.role,
                permissions: user.permissions || []
            };

            const accessToken = this.generateAccessToken(payload);

            return { accessToken };
        } catch (error) {
            throw new Error(`Token refresh failed: ${error.message}`);
        }
    }

    async revokeRefreshToken(userId) {
        await redis.del(`refresh_token:${userId}`);
    }

    async revokeAllUserTokens(userId) {
        // Revoke refresh token
        await this.revokeRefreshToken(userId);
        
        // Add user to token invalidation list
        const User = require('../models/User');
        await User.findByIdAndUpdate(userId, {
            tokenValidAfter: new Date()
        });
    }

    verifyAccessToken(token) {
        return jwt.verify(token, this.jwtSecret);
    }

    parseExpiryToSeconds(expiry) {
        const unit = expiry.slice(-1);
        const value = parseInt(expiry.slice(0, -1));
        
        switch (unit) {
            case 's': return value;
            case 'm': return value * 60;
            case 'h': return value * 3600;
            case 'd': return value * 86400;
            default: return 900; // 15 minutes default
        }
    }

    generatePasswordResetToken() {
        return crypto.randomBytes(32).toString('hex');
    }

    generateEmailVerificationToken() {
        return crypto.randomBytes(20).toString('hex');
    }
}

module.exports = new TokenService();
```

### Role-Based Access Control

```javascript
// src/services/AuthorizationService.js
class AuthorizationService {
    constructor() {
        this.permissions = {
            // User permissions
            'user.read': ['student', 'teacher', 'admin'],
            'user.update': ['student', 'teacher', 'admin'],
            'user.delete': ['admin'],
            
            // Course permissions
            'course.read': ['student', 'teacher', 'admin'],
            'course.create': ['teacher', 'admin'],
            'course.update': ['teacher', 'admin'],
            'course.delete': ['admin'],
            'course.publish': ['teacher', 'admin'],
            
            // Assessment permissions
            'assessment.read': ['student', 'teacher', 'admin'],
            'assessment.create': ['teacher', 'admin'],
            'assessment.update': ['teacher', 'admin'],
            'assessment.delete': ['teacher', 'admin'],
            'assessment.grade': ['teacher', 'admin'],
            
            // Analytics permissions
            'analytics.read': ['teacher', 'admin'],
            'analytics.export': ['admin'],
            
            // System permissions
            'system.manage': ['admin'],
            'system.monitor': ['admin']
        };

        this.roleHierarchy = {
            'admin': ['teacher', 'student'],
            'teacher': ['student'],
            'student': []
        };
    }

    hasPermission(userRole, permission, resourceOwnerId = null, userId = null) {
        // Check if user role has the permission
        if (!this.permissions[permission] || !this.permissions[permission].includes(userRole)) {
            return false;
        }

        // Resource ownership check
        if (resourceOwnerId && userId) {
            // Users can always access their own resources
            if (resourceOwnerId.toString() === userId.toString()) {
                return true;
            }

            // Check if user has higher role privileges
            return this.hasHigherRole(userRole, 'student');
        }

        return true;
    }

    hasRole(userRole, requiredRole) {
        if (userRole === requiredRole) {
            return true;
        }

        return this.roleHierarchy[userRole] && this.roleHierarchy[userRole].includes(requiredRole);
    }

    hasHigherRole(userRole, compareRole) {
        const hierarchy = ['student', 'teacher', 'admin'];
        const userIndex = hierarchy.indexOf(userRole);
        const compareIndex = hierarchy.indexOf(compareRole);
        
        return userIndex > compareIndex;
    }

    canAccessResource(user, resource, action = 'read') {
        const permission = `${resource}.${action}`;
        
        // Check basic permission
        if (!this.hasPermission(user.role, permission)) {
            return false;
        }

        // Additional resource-specific logic can be added here
        switch (resource) {
            case 'course':
                return this.canAccessCourse(user, action);
            case 'assessment':
                return this.canAccessAssessment(user, action);
            case 'user':
                return this.canAccessUser(user, action);
            default:
                return true;
        }
    }

    canAccessCourse(user, action) {
        switch (action) {
            case 'create':
            case 'update':
            case 'publish':
                return ['teacher', 'admin'].includes(user.role);
            case 'delete':
                return user.role === 'admin';
            case 'read':
                return true; // All authenticated users can read courses
            default:
                return false;
        }
    }

    canAccessAssessment(user, action) {
        switch (action) {
            case 'create':
            case 'update':
            case 'delete':
            case 'grade':
                return ['teacher', 'admin'].includes(user.role);
            case 'read':
                return true; // Students can read assessments they're enrolled in
            default:
                return false;
        }
    }

    canAccessUser(user, action) {
        switch (action) {
            case 'read':
            case 'update':
                return true; // Users can read/update their own profile
            case 'delete':
                return user.role === 'admin';
            default:
                return false;
        }
    }

    filterByPermissions(user, items, resourceType) {
        return items.filter(item => {
            // Basic permission check
            if (!this.canAccessResource(user, resourceType, 'read')) {
                return false;
            }

            // Resource ownership or enrollment check
            if (user.role === 'student') {
                switch (resourceType) {
                    case 'course':
                        return item.isPublished || item.enrollments.includes(user._id);
                    case 'assessment':
                        return item.course && user.enrolledCourses.includes(item.course._id);
                    default:
                        return item.createdBy.toString() === user._id.toString();
                }
            }

            return true;
        });
    }
}

module.exports = new AuthorizationService();
```

## Data Layer Integration

### Database Connection Management

```javascript
// src/services/database.js
const mongoose = require('mongoose');
const redis = require('redis');
const config = require('../config/environment');

class DatabaseService {
    constructor() {
        this.mongoose = null;
        this.redis = null;
        this.isConnected = false;
    }

    async connectMongoDB() {
        try {
            const options = {
                useNewUrlParser: true,
                useUnifiedTopology: true,
                maxPoolSize: 10,
                serverSelectionTimeoutMS: 5000,
                socketTimeoutMS: 45000,
                bufferMaxEntries: 0,
                retryWrites: true,
                w: 'majority'
            };

            this.mongoose = await mongoose.connect(config.get('database.url'), options);
            
            mongoose.connection.on('connected', () => {
                console.log('✅ MongoDB connected successfully');
                this.isConnected = true;
            });

            mongoose.connection.on('error', (error) => {
                console.error('❌ MongoDB connection error:', error);
                this.isConnected = false;
            });

            mongoose.connection.on('disconnected', () => {
                console.log('📡 MongoDB disconnected');
                this.isConnected = false;
            });

            // Graceful close on app termination
            process.on('SIGINT', () => {
                mongoose.connection.close(() => {
                    console.log('💤 MongoDB connection closed due to app termination');
                    process.exit(0);
                });
            });

            return this.mongoose;
        } catch (error) {
            console.error('❌ MongoDB connection failed:', error);
            throw error;
        }
    }

    async connectRedis() {
        try {
            this.redis = redis.createClient({
                host: config.get('redis.host'),
                port: config.get('redis.port'),
                password: config.get('redis.password'),
                db: config.get('redis.db') || 0,
                retry_strategy: (options) => {
                    if (options.error && options.error.code === 'ECONNREFUSED') {
                        console.error('❌ Redis server connection refused');
                        return new Error('Redis server connection refused');
                    }
                    if (options.total_retry_time > 1000 * 60 * 60) {
                        console.error('❌ Redis retry time exhausted');
                        return new Error('Redis retry time exhausted');
                    }
                    if (options.attempt > 10) {
                        console.error('❌ Redis max retry attempts reached');
                        return undefined;
                    }
                    return Math.min(options.attempt * 100, 3000);
                }
            });

            this.redis.on('connect', () => {
                console.log('✅ Redis connected successfully');
            });

            this.redis.on('error', (error) => {
                console.error('❌ Redis connection error:', error);
            });

            this.redis.on('ready', () => {
                console.log('🚀 Redis is ready');
            });

            await this.redis.connect();
            return this.redis;
        } catch (error) {
            console.error('❌ Redis connection failed:', error);
            throw error;
        }
    }

    async initialize() {
        console.log('🔄 Initializing database connections...');
        
        await Promise.all([
            this.connectMongoDB(),
            this.connectRedis()
        ]);

        console.log('✅ All database connections established');
        return true;
    }

    async healthCheck() {
        const health = {
            mongodb: false,
            redis: false,
            timestamp: new Date().toISOString()
        };

        // MongoDB health check
        try {
            const state = mongoose.connection.readyState;
            health.mongodb = state === 1; // 1 = connected
        } catch (error) {
            console.error('MongoDB health check failed:', error);
        }

        // Redis health check
        try {
            await this.redis.ping();
            health.redis = true;
        } catch (error) {
            console.error('Redis health check failed:', error);
        }

        return health;
    }

    getMongoConnection() {
        return this.mongoose;
    }

    getRedisConnection() {
        return this.redis;
    }
}

module.exports = new DatabaseService();
```

### Model Layer Implementation

```javascript
// src/models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    password: {
        type: String,
        required: true,
        minlength: 8,
        select: false // Don't include password in query results by default
    },
    firstName: {
        type: String,
        required: true,
        trim: true,
        minlength: 2,
        maxlength: 50
    },
    lastName: {
        type: String,
        required: true,
        trim: true,
        minlength: 2,
        maxlength: 50
    },
    role: {
        type: String,
        enum: ['student', 'teacher', 'admin'],
        default: 'student'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    isEmailVerified: {
        type: Boolean,
        default: false
    },
    emailVerificationToken: String,
    emailVerificationExpires: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    passwordChangedAt: Date,
    lastLoginAt: Date,
    loginAttempts: {
        type: Number,
        default: 0
    },
    lockUntil: Date,
    profile: {
        avatar: String,
        bio: {
            type: String,
            maxlength: 500
        },
        phone: {
            type: String,
            match: [/^[+]?[1-9][\d]{0,15}$/, 'Please enter a valid phone number']
        },
        dateOfBirth: Date,
        location: {
            country: String,
            city: String,
            timezone: String
        }
    },
    preferences: {
        language: {
            type: String,
            enum: ['en', 'tr', 'es', 'fr'],
            default: 'en'
        },
        notifications: {
            email: {
                type: Boolean,
                default: true
            },
            push: {
                type: Boolean,
                default: true
            },
            sms: {
                type: Boolean,
                default: false
            }
        },
        privacy: {
            profileVisible: {
                type: Boolean,
                default: true
            },
            showProgress: {
                type: Boolean,
                default: true
            },
            allowMessages: {
                type: Boolean,
                default: true
            }
        }
    },
    enrolledCourses: [{
        course: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Course'
        },
        enrolledAt: {
            type: Date,
            default: Date.now
        },
        progress: {
            type: Number,
            default: 0,
            min: 0,
            max: 100
        },
        completedLessons: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Lesson'
        }],
        status: {
            type: String,
            enum: ['active', 'completed', 'dropped'],
            default: 'active'
        }
    }],
    achievements: [{
        title: String,
        description: String,
        earnedAt: {
            type: Date,
            default: Date.now
        },
        badge: String
    }]
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ 'enrolledCourses.course': 1 });
userSchema.index({ createdAt: -1 });

// Virtual fields
userSchema.virtual('fullName').get(function() {
    return `${this.firstName} ${this.lastName}`;
});

userSchema.virtual('isLocked').get(function() {
    return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Pre-save middleware
userSchema.pre('save', async function(next) {
    // Hash password if modified
    if (this.isModified('password')) {
        this.password = await bcrypt.hash(this.password, 12);
        this.passwordChangedAt = new Date();
    }

    next();
});

// Methods
userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.createPasswordResetToken = function() {
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    this.passwordResetToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');
    
    this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
    
    return resetToken;
};

userSchema.methods.createEmailVerificationToken = function() {
    const verificationToken = crypto.randomBytes(20).toString('hex');
    
    this.emailVerificationToken = crypto
        .createHash('sha256')
        .update(verificationToken)
        .digest('hex');
    
    this.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
    
    return verificationToken;
};

userSchema.methods.incrementLoginAttempts = function() {
    // If we have a previous lock that has expired, restart at 1
    if (this.lockUntil && this.lockUntil < Date.now()) {
        return this.updateOne({
            $unset: {
                lockUntil: 1
            },
            $set: {
                loginAttempts: 1
            }
        });
    }
    
    const updates = { $inc: { loginAttempts: 1 } };
    
    // Lock account after 5 failed attempts for 2 hours
    if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
        updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 };
    }
    
    return this.updateOne(updates);
};

userSchema.methods.resetLoginAttempts = function() {
    return this.updateOne({
        $unset: {
            loginAttempts: 1,
            lockUntil: 1
        }
    });
};

// Static methods
userSchema.statics.findByEmail = function(email) {
    return this.findOne({ email: email.toLowerCase() });
};

userSchema.statics.findActiveUsers = function() {
    return this.find({ isActive: true });
};

module.exports = mongoose.model('User', userSchema);
```

## Error Handling Framework

### Centralized Error Handler

```javascript
// src/middleware/errorHandler.js
const config = require('../config/environment');

class ErrorHandler {
    static handle(error, req, res, next) {
        let err = { ...error };
        err.message = error.message;

        // Log error
        console.error('🚨 Error:', {
            message: err.message,
            stack: err.stack,
            url: req.originalUrl,
            method: req.method,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            user: req.user ? req.user._id : 'anonymous',
            timestamp: new Date().toISOString()
        });

        // Mongoose validation error
        if (err.name === 'ValidationError') {
            const message = Object.values(err.errors).map(val => val.message).join(', ');
            err = new AppError(message, 400);
        }

        // Mongoose duplicate key error
        if (err.code === 11000) {
            const field = Object.keys(err.keyValue)[0];
            const message = `${field} already exists`;
            err = new AppError(message, 400);
        }

        // Mongoose cast error
        if (err.name === 'CastError') {
            const message = `Invalid ${err.path}: ${err.value}`;
            err = new AppError(message, 400);
        }

        // JWT errors
        if (err.name === 'JsonWebTokenError') {
            const message = 'Invalid token. Please log in again.';
            err = new AppError(message, 401);
        }

        if (err.name === 'TokenExpiredError') {
            const message = 'Your token has expired. Please log in again.';
            err = new AppError(message, 401);
        }

        ErrorHandler.sendError(err, req, res);
    }

    static sendError(err, req, res) {
        const isDevelopment = config.isDevelopment();
        
        // API Error Response
        if (req.originalUrl.startsWith('/api')) {
            return ErrorHandler.sendAPIError(err, res, isDevelopment);
        }

        // Web Error Response
        return ErrorHandler.sendWebError(err, res, isDevelopment);
    }

    static sendAPIError(err, res, isDevelopment) {
        // Operational, trusted error: send message to client
        if (err.isOperational) {
            return res.status(err.statusCode).json({
                status: 'error',
                message: err.message,
                ...(isDevelopment && {
                    error: err,
                    stack: err.stack
                })
            });
        }

        // Programming or other unknown error: don't leak error details
        return res.status(500).json({
            status: 'error',
            message: 'Something went wrong!',
            ...(isDevelopment && {
                error: err,
                stack: err.stack
            })
        });
    }

    static sendWebError(err, res, isDevelopment) {
        const statusCode = err.statusCode || 500;
        const message = err.isOperational ? err.message : 'Something went wrong!';

        res.status(statusCode).render('error', {
            title: 'Error',
            message,
            statusCode,
            ...(isDevelopment && {
                error: err,
                stack: err.stack
            })
        });
    }

    static catchAsync(fn) {
        return (req, res, next) => {
            fn(req, res, next).catch(next);
        };
    }

    static notFound(req, res, next) {
        const message = `Route ${req.originalUrl} not found`;
        const err = new AppError(message, 404);
        next(err);
    }
}

class AppError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
        this.isOperational = true;

        Error.captureStackTrace(this, this.constructor);
    }
}

module.exports = { ErrorHandler, AppError };
```

## Performance Optimization

### Caching Strategy Implementation

```javascript
// src/services/CacheService.js
const redis = require('./database').getRedisConnection();
const config = require('../config/environment');

class CacheService {
    constructor() {
        this.defaultTTL = config.get('cache.defaultTTL') || 3600; // 1 hour
        this.keyPrefix = config.get('cache.keyPrefix') || '7p:';
    }

    generateKey(...parts) {
        return this.keyPrefix + parts.join(':');
    }

    async get(key) {
        try {
            const data = await redis.get(this.generateKey(key));
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Cache get error:', error);
            return null;
        }
    }

    async set(key, data, ttl = this.defaultTTL) {
        try {
            await redis.setex(
                this.generateKey(key),
                ttl,
                JSON.stringify(data)
            );
            return true;
        } catch (error) {
            console.error('Cache set error:', error);
            return false;
        }
    }

    async del(key) {
        try {
            await redis.del(this.generateKey(key));
            return true;
        } catch (error) {
            console.error('Cache delete error:', error);
            return false;
        }
    }

    async flush(pattern = '*') {
        try {
            const keys = await redis.keys(this.generateKey(pattern));
            if (keys.length > 0) {
                await redis.del(keys);
            }
            return true;
        } catch (error) {
            console.error('Cache flush error:', error);
            return false;
        }
    }

    // Cache with fallback to database
    async remember(key, ttl, callback) {
        const cached = await this.get(key);
        if (cached !== null) {
            return cached;
        }

        const data = await callback();
        if (data !== null && data !== undefined) {
            await this.set(key, data, ttl);
        }

        return data;
    }

    // Middleware for caching API responses
    middleware(options = {}) {
        return async (req, res, next) => {
            const { ttl = this.defaultTTL, keyGenerator } = options;
            
            // Skip caching for non-GET requests
            if (req.method !== 'GET') {
                return next();
            }

            // Generate cache key
            const key = keyGenerator 
                ? keyGenerator(req)
                : `api:${req.originalUrl}:${JSON.stringify(req.query)}`;

            // Try to get cached response
            const cached = await this.get(key);
            if (cached) {
                return res.json(cached);
            }

            // Override res.json to cache the response
            const originalJson = res.json;
            res.json = function(data) {
                // Cache successful responses
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    CacheService.prototype.set(key, data, ttl);
                }
                return originalJson.call(this, data);
            };

            next();
        };
    }

    // Cache tags for easier invalidation
    async tag(tags, key, data, ttl = this.defaultTTL) {
        // Set the main cache
        await this.set(key, data, ttl);

        // Add key to tag sets
        for (const tag of tags) {
            await redis.sadd(this.generateKey('tag', tag), this.generateKey(key));
        }
    }

    async invalidateTag(tag) {
        const keys = await redis.smembers(this.generateKey('tag', tag));
        if (keys.length > 0) {
            await redis.del(keys);
            await redis.del(this.generateKey('tag', tag));
        }
    }
}

module.exports = new CacheService();
```

### Database Query Optimization

```javascript
// src/services/QueryOptimizer.js
class QueryOptimizer {
    static optimizeUserQueries() {
        return {
            // Populate only necessary fields
            populateBasicInfo: {
                path: 'enrolledCourses.course',
                select: 'title slug thumbnail level duration'
            },

            // Efficient pagination
            paginate: (page = 1, limit = 20) => ({
                skip: (page - 1) * limit,
                limit: Math.min(limit, 100) // Cap at 100 items per page
            }),

            // Optimized user lookup
            findActiveUsersWithCourses: async (filters = {}) => {
                return User.aggregate([
                    { $match: { isActive: true, ...filters } },
                    {
                        $lookup: {
                            from: 'courses',
                            localField: 'enrolledCourses.course',
                            foreignField: '_id',
                            as: 'courseDetails'
                        }
                    },
                    {
                        $project: {
                            email: 1,
                            firstName: 1,
                            lastName: 1,
                            role: 1,
                            'enrolledCourses.progress': 1,
                            'courseDetails.title': 1,
                            'courseDetails.slug': 1
                        }
                    },
                    { $sort: { createdAt: -1 } }
                ]);
            }
        };
    }

    static optimizeCourseQueries() {
        return {
            // Efficient course search with aggregation
            searchCourses: async (searchTerm, filters = {}) => {
                const pipeline = [
                    {
                        $match: {
                            $or: [
                                { title: { $regex: searchTerm, $options: 'i' } },
                                { description: { $regex: searchTerm, $options: 'i' } },
                                { tags: { $in: [new RegExp(searchTerm, 'i')] } }
                            ],
                            isPublished: true,
                            ...filters
                        }
                    },
                    {
                        $lookup: {
                            from: 'users',
                            localField: 'instructor',
                            foreignField: '_id',
                            as: 'instructorDetails'
                        }
                    },
                    {
                        $addFields: {
                            averageRating: { $avg: '$reviews.rating' },
                            totalEnrollments: { $size: '$enrolledStudents' }
                        }
                    },
                    {
                        $project: {
                            title: 1,
                            slug: 1,
                            description: 1,
                            thumbnail: 1,
                            price: 1,
                            level: 1,
                            duration: 1,
                            averageRating: 1,
                            totalEnrollments: 1,
                            'instructorDetails.firstName': 1,
                            'instructorDetails.lastName': 1
                        }
                    },
                    { $sort: { averageRating: -1, totalEnrollments: -1 } }
                ];

                return Course.aggregate(pipeline);
            },

            // Optimized course analytics
            getCourseAnalytics: async (courseId) => {
                return Course.aggregate([
                    { $match: { _id: mongoose.Types.ObjectId(courseId) } },
                    {
                        $lookup: {
                            from: 'users',
                            localField: 'enrolledStudents',
                            foreignField: '_id',
                            as: 'students'
                        }
                    },
                    {
                        $addFields: {
                            totalStudents: { $size: '$enrolledStudents' },
                            averageProgress: { $avg: '$students.enrolledCourses.progress' },
                            completionRate: {
                                $divide: [
                                    {
                                        $size: {
                                            $filter: {
                                                input: '$students.enrolledCourses',
                                                cond: { $eq: ['$$this.status', 'completed'] }
                                            }
                                        }
                                    },
                                    { $size: '$enrolledStudents' }
                                ]
                            }
                        }
                    }
                ]);
            }
        };
    }

    static addQueryLogging(schema) {
        schema.pre(/^find/, function() {
            this.start = Date.now();
        });

        schema.post(/^find/, function() {
            if (Date.now() - this.start > 100) {
                console.warn(`🐌 Slow query detected: ${this.getQuery()} took ${Date.now() - this.start}ms`);
            }
        });
    }
}

module.exports = QueryOptimizer;
```

## Security Implementation

### Security Headers and OWASP Compliance

```javascript
// src/middleware/security.js
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const validator = require('validator');

class SecurityMiddleware {
    static setupSecurityHeaders() {
        return (req, res, next) => {
            // Security headers
            res.setHeader('X-Content-Type-Options', 'nosniff');
            res.setHeader('X-Frame-Options', 'DENY');
            res.setHeader('X-XSS-Protection', '1; mode=block');
            res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
            res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
            
            // Remove powered-by header
            res.removeHeader('X-Powered-By');
            
            next();
        };
    }

    static rateLimiters() {
        return {
            general: rateLimit({
                windowMs: 15 * 60 * 1000, // 15 minutes
                max: 1000,
                message: {
                    error: 'Too many requests',
                    message: 'Rate limit exceeded'
                },
                standardHeaders: true,
                legacyHeaders: false
            }),

            auth: rateLimit({
                windowMs: 15 * 60 * 1000, // 15 minutes
                max: 5, // 5 attempts per 15 minutes
                skipSuccessfulRequests: true,
                message: {
                    error: 'Too many authentication attempts',
                    message: 'Please try again later'
                }
            }),

            api: rateLimit({
                windowMs: 1 * 60 * 1000, // 1 minute
                max: 100,
                message: {
                    error: 'API rate limit exceeded',
                    message: 'Too many API requests'
                }
            })
        };
    }

    static inputSanitization() {
        return [
            mongoSanitize(), // Prevent NoSQL injection
            xss(), // Clean user input from malicious HTML
            hpp({ // Prevent HTTP Parameter Pollution
                whitelist: ['tags', 'categories', 'sort']
            })
        ];
    }

    static validateInput() {
        return (req, res, next) => {
            // Validate common input patterns
            const validateField = (value, field, validatorFunc, errorMsg) => {
                if (value && !validatorFunc(value)) {
                    throw new Error(`Invalid ${field}: ${errorMsg}`);
                }
            };

            try {
                if (req.body.email) {
                    validateField(req.body.email, 'email', validator.isEmail, 'Invalid email format');
                }

                if (req.body.url) {
                    validateField(req.body.url, 'URL', validator.isURL, 'Invalid URL format');
                }

                if (req.body.phone) {
                    validateField(req.body.phone, 'phone', validator.isMobilePhone, 'Invalid phone format');
                }

                // Validate ObjectIds
                if (req.params.id && !validator.isMongoId(req.params.id)) {
                    throw new Error('Invalid ID format');
                }

                next();
            } catch (error) {
                res.status(400).json({
                    error: 'Validation failed',
                    message: error.message
                });
            }
        };
    }

    static secureFileUpload() {
        return (req, res, next) => {
            if (!req.files) return next();

            const allowedMimeTypes = [
                'image/jpeg',
                'image/png',
                'image/gif',
                'image/webp',
                'application/pdf',
                'text/plain',
                'application/json'
            ];

            const maxFileSize = 5 * 1024 * 1024; // 5MB

            for (const file of Object.values(req.files)) {
                if (!allowedMimeTypes.includes(file.mimetype)) {
                    return res.status(400).json({
                        error: 'Invalid file type',
                        message: 'Only images, PDFs, and text files are allowed'
                    });
                }

                if (file.size > maxFileSize) {
                    return res.status(400).json({
                        error: 'File too large',
                        message: 'File size must be less than 5MB'
                    });
                }

                // Rename file to prevent directory traversal
                file.name = validator.escape(file.name);
            }

            next();
        };
    }

    static auditLog() {
        return (req, res, next) => {
            // Log sensitive operations
            const sensitiveOperations = [
                '/auth/login',
                '/auth/register',
                '/users',
                '/admin'
            ];

            if (sensitiveOperations.some(op => req.path.startsWith(op))) {
                console.log({
                    type: 'SECURITY_AUDIT',
                    timestamp: new Date().toISOString(),
                    method: req.method,
                    path: req.path,
                    ip: req.ip,
                    userAgent: req.get('User-Agent'),
                    user: req.user ? req.user._id : 'anonymous',
                    body: req.method === 'POST' ? this.sanitizeLogData(req.body) : undefined
                });
            }

            next();
        };
    }

    static sanitizeLogData(data) {
        const sanitized = { ...data };
        const sensitiveFields = ['password', 'token', 'secret', 'key'];
        
        sensitiveFields.forEach(field => {
            if (sanitized[field]) {
                sanitized[field] = '***REDACTED***';
            }
        });

        return sanitized;
    }
}

module.exports = SecurityMiddleware;
```

## Testing Strategy

### Comprehensive Test Suite

```javascript
// tests/integration/api.test.js
const request = require('supertest');
const mongoose = require('mongoose');
const APIServer = require('../../src/app');
const User = require('../../src/models/User');
const { connectTestDatabase, clearTestDatabase } = require('../helpers/database');

describe('7P Education API Integration Tests', () => {
    let app;
    let server;
    let authToken;
    let testUser;

    beforeAll(async () => {
        await connectTestDatabase();
        app = new APIServer();
        server = await app.start(0); // Use random port for testing
    });

    afterAll(async () => {
        await server.close();
        await mongoose.connection.close();
    });

    beforeEach(async () => {
        await clearTestDatabase();
        
        // Create test user
        testUser = await User.create({
            email: 'test@7peducation.com',
            password: 'TestPassword123!',
            firstName: 'Test',
            lastName: 'User',
            role: 'student'
        });

        // Get auth token
        const loginResponse = await request(server)
            .post('/api/auth/login')
            .send({
                email: 'test@7peducation.com',
                password: 'TestPassword123!'
            });

        authToken = loginResponse.body.token;
    });

    describe('Authentication Endpoints', () => {
        test('POST /api/auth/register should create new user', async () => {
            const userData = {
                email: 'newuser@7peducation.com',
                password: 'NewPassword123!',
                firstName: 'New',
                lastName: 'User'
            };

            const response = await request(server)
                .post('/api/auth/register')
                .send(userData)
                .expect(201);

            expect(response.body).toHaveProperty('token');
            expect(response.body.user.email).toBe(userData.email);
            expect(response.body.user).not.toHaveProperty('password');
        });

        test('POST /api/auth/login should authenticate user', async () => {
            const response = await request(server)
                .post('/api/auth/login')
                .send({
                    email: 'test@7peducation.com',
                    password: 'TestPassword123!'
                })
                .expect(200);

            expect(response.body).toHaveProperty('token');
            expect(response.body.user.email).toBe('test@7peducation.com');
        });

        test('POST /api/auth/login should fail with invalid credentials', async () => {
            await request(server)
                .post('/api/auth/login')
                .send({
                    email: 'test@7peducation.com',
                    password: 'wrongpassword'
                })
                .expect(401);
        });

        test('POST /api/auth/refresh should provide new access token', async () => {
            // First login to get refresh token
            const loginResponse = await request(server)
                .post('/api/auth/login')
                .send({
                    email: 'test@7peducation.com',
                    password: 'TestPassword123!'
                });

            const refreshToken = loginResponse.body.refreshToken;

            const response = await request(server)
                .post('/api/auth/refresh')
                .send({ refreshToken })
                .expect(200);

            expect(response.body).toHaveProperty('accessToken');
        });
    });

    describe('User Endpoints', () => {
        test('GET /api/users/profile should return user profile', async () => {
            const response = await request(server)
                .get('/api/users/profile')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.email).toBe('test@7peducation.com');
            expect(response.body).not.toHaveProperty('password');
        });

        test('PUT /api/users/profile should update user profile', async () => {
            const updateData = {
                firstName: 'Updated',
                lastName: 'Name',
                profile: {
                    bio: 'Updated bio'
                }
            };

            const response = await request(server)
                .put('/api/users/profile')
                .set('Authorization', `Bearer ${authToken}`)
                .send(updateData)
                .expect(200);

            expect(response.body.firstName).toBe('Updated');
            expect(response.body.profile.bio).toBe('Updated bio');
        });

        test('PUT /api/users/profile should validate input', async () => {
            await request(server)
                .put('/api/users/profile')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    firstName: 'A', // Too short
                    email: 'invalid-email'
                })
                .expect(400);
        });
    });

    describe('Authorization', () => {
        test('Should require authentication for protected routes', async () => {
            await request(server)
                .get('/api/users/profile')
                .expect(401);
        });

        test('Should require proper role for admin routes', async () => {
            await request(server)
                .get('/api/users/all')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(403);
        });

        test('Admin should access admin routes', async () => {
            // Create admin user
            const adminUser = await User.create({
                email: 'admin@7peducation.com',
                password: 'AdminPassword123!',
                firstName: 'Admin',
                lastName: 'User',
                role: 'admin'
            });

            const adminLoginResponse = await request(server)
                .post('/api/auth/login')
                .send({
                    email: 'admin@7peducation.com',
                    password: 'AdminPassword123!'
                });

            const adminToken = adminLoginResponse.body.token;

            await request(server)
                .get('/api/users/all')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);
        });
    });

    describe('Rate Limiting', () => {
        test('Should enforce rate limits', async () => {
            // Make multiple rapid requests
            const promises = Array(10).fill().map(() => 
                request(server)
                    .post('/api/auth/login')
                    .send({
                        email: 'test@7peducation.com',
                        password: 'wrongpassword'
                    })
            );

            const responses = await Promise.all(promises);
            const rateLimitedResponses = responses.filter(res => res.status === 429);
            
            expect(rateLimitedResponses.length).toBeGreaterThan(0);
        });
    });

    describe('Error Handling', () => {
        test('Should handle invalid JSON', async () => {
            const response = await request(server)
                .post('/api/users/profile')
                .set('Authorization', `Bearer ${authToken}`)
                .set('Content-Type', 'application/json')
                .send('invalid json')
                .expect(400);

            expect(response.body).toHaveProperty('error');
        });

        test('Should handle 404 for non-existent routes', async () => {
            await request(server)
                .get('/api/nonexistent')
                .expect(404);
        });
    });
});

// tests/unit/services/TokenService.test.js
const TokenService = require('../../src/services/TokenService');
const jwt = require('jsonwebtoken');

describe('TokenService', () => {
    const mockUser = {
        _id: '507f1f77bcf86cd799439011',
        email: 'test@7peducation.com',
        role: 'student',
        permissions: []
    };

    describe('generateAccessToken', () => {
        test('should generate valid JWT token', () => {
            const token = TokenService.generateAccessToken(mockUser);
            
            expect(typeof token).toBe('string');
            
            const decoded = jwt.decode(token);
            expect(decoded.userId).toBe(mockUser._id);
            expect(decoded.email).toBe(mockUser.email);
            expect(decoded.role).toBe(mockUser.role);
        });

        test('should include expiration time', () => {
            const token = TokenService.generateAccessToken(mockUser);
            const decoded = jwt.decode(token);
            
            expect(decoded).toHaveProperty('exp');
            expect(decoded.exp).toBeGreaterThan(Date.now() / 1000);
        });
    });

    describe('generateTokenPair', () => {
        test('should generate both access and refresh tokens', async () => {
            const { accessToken, refreshToken } = await TokenService.generateTokenPair(mockUser);
            
            expect(typeof accessToken).toBe('string');
            expect(typeof refreshToken).toBe('string');
            
            const accessDecoded = jwt.decode(accessToken);
            const refreshDecoded = jwt.decode(refreshToken);
            
            expect(accessDecoded.userId).toBe(mockUser._id);
            expect(refreshDecoded.userId).toBe(mockUser._id);
            expect(refreshDecoded.type).toBe('refresh');
        });
    });

    describe('verifyAccessToken', () => {
        test('should verify valid token', () => {
            const token = TokenService.generateAccessToken(mockUser);
            
            expect(() => {
                TokenService.verifyAccessToken(token);
            }).not.toThrow();
        });

        test('should reject invalid token', () => {
            expect(() => {
                TokenService.verifyAccessToken('invalid.token.here');
            }).toThrow();
        });
    });
});
```

## Monitoring & Logging

### Application Monitoring System

```javascript
// src/services/MonitoringService.js
const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const config = require('../config/environment');

class MonitoringService {
    constructor() {
        this.logger = this.createLogger();
        this.metrics = new Map();
        this.alerts = [];
        this.healthChecks = new Map();
    }

    createLogger() {
        const transports = [
            new winston.transports.Console({
                format: winston.format.combine(
                    winston.format.colorize(),
                    winston.format.simple()
                )
            })
        ];

        if (config.isProduction()) {
            transports.push(
                new DailyRotateFile({
                    filename: 'logs/application-%DATE%.log',
                    datePattern: 'YYYY-MM-DD',
                    maxSize: '20m',
                    maxFiles: '14d',
                    format: winston.format.combine(
                        winston.format.timestamp(),
                        winston.format.json()
                    )
                }),
                new DailyRotateFile({
                    filename: 'logs/error-%DATE%.log',
                    datePattern: 'YYYY-MM-DD',
                    level: 'error',
                    maxSize: '20m',
                    maxFiles: '30d',
                    format: winston.format.combine(
                        winston.format.timestamp(),
                        winston.format.json()
                    )
                })
            );
        }

        return winston.createLogger({
            level: config.get('logging.level') || 'info',
            transports
        });
    }

    logRequest(req, res, responseTime) {
        this.logger.info('HTTP Request', {
            method: req.method,
            url: req.originalUrl,
            status: res.statusCode,
            responseTime,
            userAgent: req.get('User-Agent'),
            ip: req.ip,
            user: req.user ? req.user._id : 'anonymous'
        });
    }

    logError(error, req = null) {
        this.logger.error('Application Error', {
            message: error.message,
            stack: error.stack,
            ...(req && {
                method: req.method,
                url: req.originalUrl,
                ip: req.ip,
                user: req.user ? req.user._id : 'anonymous'
            })
        });
    }

    recordMetric(name, value, tags = {}) {
        const key = `${name}:${JSON.stringify(tags)}`;
        const existing = this.metrics.get(key) || { count: 0, sum: 0, min: Infinity, max: -Infinity };
        
        existing.count++;
        existing.sum += value;
        existing.min = Math.min(existing.min, value);
        existing.max = Math.max(existing.max, value);
        existing.average = existing.sum / existing.count;
        existing.lastValue = value;
        existing.lastUpdated = new Date();
        
        this.metrics.set(key, existing);
    }

    getMetrics() {
        const result = {};
        for (const [key, value] of this.metrics.entries()) {
            result[key] = value;
        }
        return result;
    }

    async performHealthCheck() {
        const health = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            checks: {}
        };

        for (const [name, checkFn] of this.healthChecks.entries()) {
            try {
                const start = Date.now();
                const result = await checkFn();
                const responseTime = Date.now() - start;
                
                health.checks[name] = {
                    status: 'healthy',
                    responseTime,
                    ...result
                };
            } catch (error) {
                health.checks[name] = {
                    status: 'unhealthy',
                    error: error.message
                };
                health.status = 'unhealthy';
            }
        }

        return health;
    }

    registerHealthCheck(name, checkFn) {
        this.healthChecks.set(name, checkFn);
    }

    // Built-in health checks
    setupDefaultHealthChecks() {
        // Database connectivity
        this.registerHealthCheck('database', async () => {
            const mongoose = require('mongoose');
            const state = mongoose.connection.readyState;
            
            if (state !== 1) {
                throw new Error(`Database connection state: ${state}`);
            }
            
            return { connectionState: state };
        });

        // Redis connectivity
        this.registerHealthCheck('redis', async () => {
            const redis = require('./database').getRedisConnection();
            const start = Date.now();
            await redis.ping();
            const responseTime = Date.now() - start;
            
            return { responseTime };
        });

        // Memory usage
        this.registerHealthCheck('memory', () => {
            const usage = process.memoryUsage();
            const totalMB = usage.heapTotal / 1024 / 1024;
            const usedMB = usage.heapUsed / 1024 / 1024;
            const usagePercent = (usedMB / totalMB) * 100;
            
            if (usagePercent > 90) {
                throw new Error(`High memory usage: ${usagePercent.toFixed(2)}%`);
            }
            
            return {
                totalMB: Math.round(totalMB),
                usedMB: Math.round(usedMB),
                usagePercent: Math.round(usagePercent)
            };
        });
    }

    startMetricsCollection() {
        setInterval(() => {
            // Collect system metrics
            const memUsage = process.memoryUsage();
            this.recordMetric('system.memory.heap_used', memUsage.heapUsed);
            this.recordMetric('system.memory.heap_total', memUsage.heapTotal);
            this.recordMetric('system.memory.rss', memUsage.rss);

            // CPU usage (approximate)
            const cpuUsage = process.cpuUsage();
            this.recordMetric('system.cpu.user', cpuUsage.user);
            this.recordMetric('system.cpu.system', cpuUsage.system);
        }, 30000); // Every 30 seconds
    }
}

module.exports = new MonitoringService();
```

## Deployment Architecture

### Production Deployment Configuration

```javascript
// src/config/production.js
module.exports = {
    port: process.env.PORT || 3000,
    
    database: {
        url: process.env.DATABASE_URL,
        options: {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            maxPoolSize: 20,
            minPoolSize: 5,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            retryWrites: true,
            w: 'majority',
            readPreference: 'primary',
            readConcern: { level: 'majority' }
        }
    },

    redis: {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT,
        password: process.env.REDIS_PASSWORD,
        db: 0,
        maxRetriesPerRequest: 3,
        retryDelayOnFailover: 100,
        enableReadyCheck: false,
        lazyConnect: true
    },

    jwt: {
        secret: process.env.JWT_SECRET,
        accessTokenExpiry: '15m',
        refreshTokenExpiry: '7d',
        refreshSecret: process.env.JWT_REFRESH_SECRET
    },

    cache: {
        defaultTTL: 3600,
        keyPrefix: '7p:prod:'
    },

    logging: {
        level: 'info'
    },

    security: {
        rateLimits: {
            general: { windowMs: 15 * 60 * 1000, max: 1000 },
            auth: { windowMs: 15 * 60 * 1000, max: 5 },
            api: { windowMs: 1 * 60 * 1000, max: 100 }
        },
        cors: {
            origins: process.env.ALLOWED_ORIGINS?.split(',') || []
        }
    },

    monitoring: {
        metricsEnabled: true,
        healthCheckInterval: 30000,
        alertingEnabled: true
    }
};
```

This comprehensive Node.js Express API architecture provides a robust foundation for the 7P Education Platform with enterprise-grade features including advanced security, performance optimization, comprehensive monitoring, and production-ready deployment configuration.

The architecture supports microservices integration, implements sophisticated caching strategies, provides comprehensive error handling, and includes extensive testing frameworks to ensure reliability and maintainability at scale.