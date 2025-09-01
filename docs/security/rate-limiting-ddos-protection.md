# Rate Limiting & DDoS Protection Guide

## Table of Contents
1. [Overview](#overview)
2. [Rate Limiting Fundamentals](#rate-limiting-fundamentals)
3. [DDoS Attack Types](#ddos-attack-types)
4. [Implementation Strategies](#implementation-strategies)
5. [Rate Limiting Algorithms](#rate-limiting-algorithms)
6. [DDoS Protection Layers](#ddos-protection-layers)
7. [Implementation Examples](#implementation-examples)
8. [Monitoring and Detection](#monitoring-and-detection)
9. [Incident Response](#incident-response)
10. [Configuration Guidelines](#configuration-guidelines)

## Overview

Rate limiting and DDoS protection are critical security measures for the 7P Education Platform. This guide provides comprehensive strategies for implementing robust protection against various types of attacks while maintaining optimal user experience for legitimate users.

### Key Objectives
- **Availability Protection**: Maintain service availability during attack scenarios
- **Resource Conservation**: Prevent resource exhaustion from malicious traffic
- **User Experience**: Minimize impact on legitimate users
- **Cost Management**: Control infrastructure costs during traffic spikes
- **Compliance**: Meet security standards and regulatory requirements

### Protection Scope
```
┌─────────────────────────────────────────────────┐
│                   CDN Layer                     │
├─────────────────────────────────────────────────┤
│               Load Balancer                     │
├─────────────────────────────────────────────────┤
│            Application Layer                    │
├─────────────────────────────────────────────────┤
│              Database Layer                     │
└─────────────────────────────────────────────────┘
```

## Rate Limiting Fundamentals

### What is Rate Limiting?

Rate limiting controls the number of requests a client can make within a specific time window. It's the first line of defense against abuse and ensures fair resource usage.

### Core Concepts

#### 1. Time Windows
- **Fixed Window**: Exact time periods (e.g., per minute)
- **Sliding Window**: Rolling time periods
- **Token Bucket**: Burst tolerance with sustained rate limits

#### 2. Granularity Levels
```javascript
// IP-based limiting
{
  "ip": "192.168.1.1",
  "requests": 100,
  "window": "1m"
}

// User-based limiting
{
  "userId": "user123",
  "requests": 1000,
  "window": "1h"
}

// API endpoint limiting
{
  "endpoint": "/api/courses",
  "requests": 500,
  "window": "5m"
}
```

#### 3. Response Strategies
- **Reject**: Return 429 Too Many Requests
- **Delay**: Queue requests with delays
- **Degrade**: Serve cached or simplified responses

### Rate Limiting Benefits

1. **DDoS Mitigation**: Reduces impact of volumetric attacks
2. **Resource Protection**: Prevents server overload
3. **Fair Usage**: Ensures equitable resource distribution
4. **Cost Control**: Manages cloud infrastructure costs
5. **Quality of Service**: Maintains performance for legitimate users

## DDoS Attack Types

### Volume-Based Attacks

#### 1. UDP Floods
```
Attack Pattern:
Source → Target (UDP packets)
High volume, low complexity
Bandwidth consumption focus
```

**Characteristics:**
- High packet per second (PPS) rates
- Bandwidth saturation
- Protocol exploitation
- Difficult to filter

#### 2. ICMP Floods
```
Attack Pattern:
Multiple Sources → Target (ICMP)
Ping flood variations
Network layer attack
```

**Impact:**
- Network congestion
- Router/firewall overload
- Legitimate traffic disruption

### Protocol Attacks

#### 1. SYN Floods
```
Attack Flow:
1. Attacker → SYN packets → Server
2. Server → SYN-ACK → Attacker
3. Attacker ignores ACK (connection left open)
4. Server connection table exhaustion
```

**Implementation Detection:**
```javascript
// SYN flood detection
const synConnections = new Map();

function detectSynFlood(clientIP, connectionState) {
  const key = clientIP;
  const connections = synConnections.get(key) || [];
  
  if (connectionState === 'SYN_RECEIVED') {
    connections.push(Date.now());
    synConnections.set(key, connections);
    
    // Check for threshold breach
    const recentConnections = connections.filter(
      timestamp => Date.now() - timestamp < 60000 // 1 minute
    );
    
    if (recentConnections.length > 50) {
      return { threat: true, type: 'SYN_FLOOD' };
    }
  }
  
  return { threat: false };
}
```

#### 2. Slowloris Attacks
```
Attack Pattern:
1. Open multiple connections
2. Send partial HTTP requests
3. Keep connections alive
4. Exhaust connection pool
```

### Application Layer Attacks

#### 1. HTTP Floods
```
Attack Characteristics:
- High request rates to specific endpoints
- Often targeting resource-intensive operations
- Can appear as legitimate traffic
- Difficult to distinguish from normal usage
```

#### 2. Slow POST Attacks
```javascript
// Slow POST detection middleware
function detectSlowPost(req, res, next) {
  const startTime = Date.now();
  let bytesReceived = 0;
  
  req.on('data', (chunk) => {
    bytesReceived += chunk.length;
    const elapsed = Date.now() - startTime;
    const rate = bytesReceived / elapsed; // bytes per ms
    
    if (rate < 10 && elapsed > 30000) { // Less than 10 bytes/ms for 30s
      req.connection.destroy();
      return;
    }
  });
  
  next();
}
```

## Implementation Strategies

### Multi-Layer Defense Architecture

```
┌─────────────────────────────────────────────────┐
│ CDN/WAF Layer (Cloudflare/AWS Shield)          │
│ • Global rate limiting                          │
│ • DDoS scrubbing                               │
│ • Geographic filtering                          │
└─────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────┐
│ Network Layer (Load Balancer)                  │
│ • Connection limiting                           │
│ • IP reputation filtering                       │
│ • Health checks                                │
└─────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────┐
│ Application Layer (Express.js/Node.js)         │
│ • API rate limiting                            │
│ • User-based limiting                          │
│ • Endpoint-specific limits                     │
└─────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────┐
│ Database Layer (MongoDB/PostgreSQL)            │
│ • Query rate limiting                          │
│ • Connection pooling                           │
│ • Resource monitoring                          │
└─────────────────────────────────────────────────┘
```

### Implementation Framework

#### 1. Redis-Based Rate Limiting

```javascript
const redis = require('redis');
const client = redis.createClient();

class RedisRateLimiter {
  constructor(options = {}) {
    this.windowSize = options.windowSize || 60; // seconds
    this.maxRequests = options.maxRequests || 100;
    this.keyPrefix = options.keyPrefix || 'rate_limit:';
  }

  async checkLimit(identifier) {
    const key = `${this.keyPrefix}${identifier}`;
    const now = Date.now();
    const windowStart = now - (this.windowSize * 1000);

    // Use Redis pipeline for atomic operations
    const pipeline = client.pipeline();
    
    // Remove old entries
    pipeline.zremrangebyscore(key, '-inf', windowStart);
    
    // Count current requests
    pipeline.zcard(key);
    
    // Add current request
    pipeline.zadd(key, now, `${now}-${Math.random()}`);
    
    // Set expiration
    pipeline.expire(key, this.windowSize);
    
    const results = await pipeline.exec();
    const currentCount = results[1][1];
    
    return {
      allowed: currentCount < this.maxRequests,
      count: currentCount,
      remaining: Math.max(0, this.maxRequests - currentCount),
      resetTime: windowStart + (this.windowSize * 1000)
    };
  }
}

// Usage example
const rateLimiter = new RedisRateLimiter({
  windowSize: 60, // 1 minute
  maxRequests: 100
});

async function rateLimitMiddleware(req, res, next) {
  const identifier = req.ip || req.connection.remoteAddress;
  const result = await rateLimiter.checkLimit(identifier);
  
  // Set rate limit headers
  res.set({
    'X-RateLimit-Limit': rateLimiter.maxRequests,
    'X-RateLimit-Remaining': result.remaining,
    'X-RateLimit-Reset': Math.ceil(result.resetTime / 1000)
  });
  
  if (!result.allowed) {
    return res.status(429).json({
      error: 'Too Many Requests',
      retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000)
    });
  }
  
  next();
}
```

#### 2. Token Bucket Implementation

```javascript
class TokenBucket {
  constructor(capacity, refillRate, refillPeriod = 1000) {
    this.capacity = capacity;
    this.tokens = capacity;
    this.refillRate = refillRate;
    this.refillPeriod = refillPeriod;
    this.lastRefill = Date.now();
  }

  consume(tokens = 1) {
    this.refill();
    
    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      return true;
    }
    
    return false;
  }

  refill() {
    const now = Date.now();
    const timePassed = now - this.lastRefill;
    const tokensToAdd = Math.floor(timePassed / this.refillPeriod) * this.refillRate;
    
    this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }

  getAvailableTokens() {
    this.refill();
    return this.tokens;
  }
}

// Distributed token bucket using Redis
class DistributedTokenBucket {
  constructor(redis, key, capacity, refillRate, refillPeriod = 1000) {
    this.redis = redis;
    this.key = key;
    this.capacity = capacity;
    this.refillRate = refillRate;
    this.refillPeriod = refillPeriod;
  }

  async consume(tokens = 1) {
    const lua = `
      local key = KEYS[1]
      local capacity = tonumber(ARGV[1])
      local refillRate = tonumber(ARGV[2])
      local refillPeriod = tonumber(ARGV[3])
      local tokensRequested = tonumber(ARGV[4])
      local now = tonumber(ARGV[5])
      
      local bucket = redis.call('HMGET', key, 'tokens', 'lastRefill')
      local tokens = tonumber(bucket[1]) or capacity
      local lastRefill = tonumber(bucket[2]) or now
      
      -- Calculate refill
      local timePassed = now - lastRefill
      local tokensToAdd = math.floor(timePassed / refillPeriod) * refillRate
      tokens = math.min(capacity, tokens + tokensToAdd)
      
      -- Check if enough tokens
      if tokens >= tokensRequested then
        tokens = tokens - tokensRequested
        redis.call('HMSET', key, 'tokens', tokens, 'lastRefill', now)
        redis.call('EXPIRE', key, 3600) -- 1 hour expiry
        return {1, tokens}
      else
        redis.call('HMSET', key, 'tokens', tokens, 'lastRefill', now)
        redis.call('EXPIRE', key, 3600)
        return {0, tokens}
      end
    `;

    const result = await this.redis.eval(
      lua, 1, this.key,
      this.capacity, this.refillRate, this.refillPeriod, tokens, Date.now()
    );

    return {
      allowed: result[0] === 1,
      remainingTokens: result[1]
    };
  }
}
```

## Rate Limiting Algorithms

### 1. Fixed Window Counter

```javascript
class FixedWindowLimiter {
  constructor(limit, windowSize) {
    this.limit = limit;
    this.windowSize = windowSize; // in milliseconds
    this.windows = new Map();
  }

  isAllowed(key) {
    const now = Date.now();
    const windowStart = Math.floor(now / this.windowSize) * this.windowSize;
    const windowKey = `${key}:${windowStart}`;

    const currentCount = this.windows.get(windowKey) || 0;
    
    if (currentCount >= this.limit) {
      return false;
    }

    this.windows.set(windowKey, currentCount + 1);
    
    // Cleanup old windows
    setTimeout(() => {
      this.windows.delete(windowKey);
    }, this.windowSize);

    return true;
  }
}
```

### 2. Sliding Window Log

```javascript
class SlidingWindowLog {
  constructor(limit, windowSize) {
    this.limit = limit;
    this.windowSize = windowSize;
    this.logs = new Map();
  }

  isAllowed(key) {
    const now = Date.now();
    const windowStart = now - this.windowSize;
    
    if (!this.logs.has(key)) {
      this.logs.set(key, []);
    }

    const requestLog = this.logs.get(key);
    
    // Remove old requests
    while (requestLog.length > 0 && requestLog[0] <= windowStart) {
      requestLog.shift();
    }

    if (requestLog.length >= this.limit) {
      return false;
    }

    requestLog.push(now);
    return true;
  }
}
```

### 3. Sliding Window Counter

```javascript
class SlidingWindowCounter {
  constructor(limit, windowSize) {
    this.limit = limit;
    this.windowSize = windowSize;
    this.windows = new Map();
  }

  isAllowed(key) {
    const now = Date.now();
    const currentWindow = Math.floor(now / this.windowSize);
    const previousWindow = currentWindow - 1;
    
    const currentKey = `${key}:${currentWindow}`;
    const previousKey = `${key}:${previousWindow}`;
    
    const currentCount = this.windows.get(currentKey) || 0;
    const previousCount = this.windows.get(previousKey) || 0;
    
    // Calculate sliding window count
    const elapsedTime = now % this.windowSize;
    const weightedPrevious = previousCount * (1 - elapsedTime / this.windowSize);
    const totalCount = currentCount + weightedPrevious;
    
    if (totalCount >= this.limit) {
      return false;
    }
    
    this.windows.set(currentKey, currentCount + 1);
    
    // Cleanup old windows
    setTimeout(() => {
      this.windows.delete(currentKey);
      this.windows.delete(previousKey);
    }, this.windowSize * 2);
    
    return true;
  }
}
```

## DDoS Protection Layers

### Layer 1: CDN and WAF Protection

#### Cloudflare Integration
```javascript
// Cloudflare rate limiting configuration
const cloudflareRules = {
  // Basic rate limiting
  rateLimiting: {
    threshold: 100, // requests per period
    period: 60, // seconds
    action: 'block', // or 'challenge'
    duration: 300 // block duration in seconds
  },
  
  // DDoS protection settings
  ddosProtection: {
    sensitivity: 'high',
    httpRequestLimitPerMinute: 1000,
    httpErrorRateThreshold: 50 // percentage
  },
  
  // Bot management
  botManagement: {
    enabled: true,
    action: 'challenge', // challenge suspicious bots
    whitelistBots: ['googlebot', 'bingbot']
  }
};

// WAF custom rules
const wafRules = [
  {
    name: 'Block suspicious patterns',
    expression: '(http.request.uri.path contains "admin") and (rate(5m) > 10)',
    action: 'block'
  },
  {
    name: 'Rate limit API endpoints',
    expression: '(http.request.uri.path matches "^/api/") and (rate(1m) > 60)',
    action: 'challenge'
  }
];
```

#### AWS Shield Advanced Integration
```javascript
const AWS = require('aws-sdk');
const shield = new AWS.Shield({ region: 'us-east-1' });

class AWSShieldProtection {
  async enableProtection(resourceArn) {
    const params = {
      ResourceArn: resourceArn,
      Name: '7P-Education-Protection'
    };
    
    try {
      const result = await shield.createProtection(params).promise();
      console.log('Protection enabled:', result.ProtectionId);
      return result.ProtectionId;
    } catch (error) {
      console.error('Failed to enable protection:', error);
      throw error;
    }
  }

  async createEmergencyContact(email, phone) {
    const params = {
      EmergencyContactList: [
        {
          EmailAddress: email,
          PhoneNumber: phone,
          ContactNotes: '7P Education Platform Emergency Contact'
        }
      ]
    };
    
    return await shield.associateDRTRole(params).promise();
  }
}
```

### Layer 2: Application-Level Protection

#### Express.js DDoS Middleware
```javascript
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const helmet = require('helmet');

// Basic rate limiting
const basicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false
});

// API rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  keyGenerator: (req) => {
    // Use user ID for authenticated requests, IP for anonymous
    return req.user?.id || req.ip;
  },
  skip: (req) => {
    // Skip rate limiting for internal requests
    return req.ip === '127.0.0.1' || req.ip === '::1';
  }
});

// Slow down repeated requests
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000,
  delayAfter: 50,
  delayMs: 500,
  maxDelayMs: 20000
});

// Advanced DDoS protection middleware
function ddosProtection(options = {}) {
  const {
    maxConnections = 100,
    maxConnectionsPerIP = 10,
    suspiciousThreshold = 50,
    banDuration = 300000 // 5 minutes
  } = options;
  
  const connections = new Map();
  const bannedIPs = new Map();
  const suspiciousActivity = new Map();
  
  return (req, res, next) => {
    const clientIP = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    
    // Check if IP is banned
    if (bannedIPs.has(clientIP)) {
      const banTime = bannedIPs.get(clientIP);
      if (now - banTime < banDuration) {
        return res.status(429).json({ error: 'IP temporarily banned' });
      } else {
        bannedIPs.delete(clientIP);
      }
    }
    
    // Track connections per IP
    const ipConnections = connections.get(clientIP) || 0;
    if (ipConnections >= maxConnectionsPerIP) {
      // Mark as suspicious
      const suspiciousCount = suspiciousActivity.get(clientIP) || 0;
      suspiciousActivity.set(clientIP, suspiciousCount + 1);
      
      if (suspiciousCount >= suspiciousThreshold) {
        bannedIPs.set(clientIP, now);
        console.log(`Banned IP ${clientIP} for suspicious activity`);
      }
      
      return res.status(429).json({ error: 'Too many connections' });
    }
    
    connections.set(clientIP, ipConnections + 1);
    
    // Cleanup on response end
    res.on('finish', () => {
      const currentConnections = connections.get(clientIP) || 0;
      if (currentConnections > 1) {
        connections.set(clientIP, currentConnections - 1);
      } else {
        connections.delete(clientIP);
      }
    });
    
    next();
  };
}

// Usage
app.use(helmet());
app.use(basicLimiter);
app.use('/api/', apiLimiter);
app.use(speedLimiter);
app.use(ddosProtection({
  maxConnectionsPerIP: 20,
  suspiciousThreshold: 100
}));
```

### Layer 3: Database Protection

#### MongoDB Rate Limiting
```javascript
class MongoRateLimiter {
  constructor(db, options = {}) {
    this.db = db;
    this.collection = db.collection('rate_limits');
    this.defaultLimit = options.defaultLimit || 1000;
    this.windowSize = options.windowSize || 3600; // 1 hour
  }

  async checkLimit(userId, operation, customLimit = null) {
    const limit = customLimit || this.defaultLimit;
    const now = new Date();
    const windowStart = new Date(now.getTime() - (this.windowSize * 1000));
    
    const key = `${userId}:${operation}`;
    
    try {
      // Count recent operations
      const count = await this.collection.countDocuments({
        key: key,
        timestamp: { $gte: windowStart }
      });
      
      if (count >= limit) {
        return { allowed: false, count, limit };
      }
      
      // Record this operation
      await this.collection.insertOne({
        key: key,
        timestamp: now,
        userId: userId,
        operation: operation
      });
      
      // Cleanup old records (run periodically)
      if (Math.random() < 0.01) { // 1% chance
        await this.cleanup();
      }
      
      return { allowed: true, count: count + 1, limit };
    } catch (error) {
      console.error('Rate limiting error:', error);
      // Fail open - allow request if rate limiting fails
      return { allowed: true, count: 0, limit };
    }
  }

  async cleanup() {
    const cutoff = new Date(Date.now() - (this.windowSize * 2 * 1000));
    await this.collection.deleteMany({
      timestamp: { $lt: cutoff }
    });
  }
}

// Usage in API routes
async function rateLimitedOperation(req, res, next) {
  const userId = req.user?.id || req.ip;
  const operation = req.route.path;
  
  const result = await mongoRateLimiter.checkLimit(userId, operation);
  
  if (!result.allowed) {
    return res.status(429).json({
      error: 'Rate limit exceeded',
      limit: result.limit,
      count: result.count
    });
  }
  
  next();
}
```

## Monitoring and Detection

### Real-time Monitoring System

```javascript
const EventEmitter = require('events');

class DDoSMonitor extends EventEmitter {
  constructor(options = {}) {
    super();
    this.thresholds = {
      requestsPerSecond: options.rpsThreshold || 1000,
      errorRate: options.errorRateThreshold || 0.1,
      responseTime: options.responseTimeThreshold || 5000,
      connectionCount: options.connectionThreshold || 10000
    };
    
    this.metrics = {
      requests: 0,
      errors: 0,
      totalResponseTime: 0,
      connections: 0,
      lastReset: Date.now()
    };
    
    this.alerts = new Map();
    this.startMonitoring();
  }

  recordRequest(responseTime, isError = false) {
    this.metrics.requests++;
    this.metrics.totalResponseTime += responseTime;
    
    if (isError) {
      this.metrics.errors++;
    }
    
    this.checkThresholds();
  }

  recordConnection(type) {
    if (type === 'open') {
      this.metrics.connections++;
    } else if (type === 'close') {
      this.metrics.connections = Math.max(0, this.metrics.connections - 1);
    }
    
    this.checkThresholds();
  }

  checkThresholds() {
    const now = Date.now();
    const elapsed = (now - this.metrics.lastReset) / 1000; // seconds
    
    if (elapsed < 1) return; // Check at most once per second
    
    const rps = this.metrics.requests / elapsed;
    const errorRate = this.metrics.errors / this.metrics.requests;
    const avgResponseTime = this.metrics.totalResponseTime / this.metrics.requests;
    
    // Check RPS threshold
    if (rps > this.thresholds.requestsPerSecond) {
      this.emit('alert', {
        type: 'HIGH_RPS',
        value: rps,
        threshold: this.thresholds.requestsPerSecond,
        timestamp: now
      });
    }
    
    // Check error rate threshold
    if (errorRate > this.thresholds.errorRate) {
      this.emit('alert', {
        type: 'HIGH_ERROR_RATE',
        value: errorRate,
        threshold: this.thresholds.errorRate,
        timestamp: now
      });
    }
    
    // Check response time threshold
    if (avgResponseTime > this.thresholds.responseTime) {
      this.emit('alert', {
        type: 'HIGH_RESPONSE_TIME',
        value: avgResponseTime,
        threshold: this.thresholds.responseTime,
        timestamp: now
      });
    }
    
    // Check connection count
    if (this.metrics.connections > this.thresholds.connectionCount) {
      this.emit('alert', {
        type: 'HIGH_CONNECTION_COUNT',
        value: this.metrics.connections,
        threshold: this.thresholds.connectionCount,
        timestamp: now
      });
    }
  }

  startMonitoring() {
    setInterval(() => {
      this.resetMetrics();
    }, 60000); // Reset every minute
  }

  resetMetrics() {
    this.metrics = {
      requests: 0,
      errors: 0,
      totalResponseTime: 0,
      connections: this.metrics.connections, // Keep connection count
      lastReset: Date.now()
    };
  }
}

// Integration with Express.js
const monitor = new DDoSMonitor({
  rpsThreshold: 500,
  errorRateThreshold: 0.05,
  responseTimeThreshold: 3000
});

// Monitoring middleware
function monitoringMiddleware(req, res, next) {
  const startTime = Date.now();
  
  monitor.recordConnection('open');
  
  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    const isError = res.statusCode >= 400;
    
    monitor.recordRequest(responseTime, isError);
    monitor.recordConnection('close');
  });
  
  next();
}

// Alert handling
monitor.on('alert', (alert) => {
  console.log(`DDoS Alert: ${alert.type}`, alert);
  
  // Send to alerting system
  sendAlert(alert);
  
  // Trigger automatic mitigation if needed
  if (alert.type === 'HIGH_RPS' && alert.value > 2000) {
    triggerEmergencyMitigation();
  }
});
```

### Anomaly Detection

```javascript
class AnomalyDetector {
  constructor(options = {}) {
    this.baselineWindow = options.baselineWindow || 3600; // 1 hour
    this.detectionWindow = options.detectionWindow || 300; // 5 minutes
    this.threshold = options.threshold || 3; // 3 standard deviations
    this.baselines = new Map();
  }

  updateBaseline(metric, value) {
    const now = Date.now();
    const key = `${metric}:${Math.floor(now / (this.baselineWindow * 1000))}`;
    
    if (!this.baselines.has(key)) {
      this.baselines.set(key, []);
    }
    
    this.baselines.get(key).push(value);
  }

  detectAnomaly(metric, currentValue) {
    const now = Date.now();
    const windowKey = `${metric}:${Math.floor(now / (this.baselineWindow * 1000))}`;
    const baseline = this.baselines.get(windowKey) || [];
    
    if (baseline.length < 10) {
      // Not enough data for detection
      return { isAnomaly: false, confidence: 0 };
    }
    
    const mean = baseline.reduce((sum, val) => sum + val, 0) / baseline.length;
    const variance = baseline.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / baseline.length;
    const stdDev = Math.sqrt(variance);
    
    const zScore = Math.abs((currentValue - mean) / stdDev);
    const isAnomaly = zScore > this.threshold;
    
    return {
      isAnomaly,
      confidence: Math.min(zScore / this.threshold, 1),
      zScore,
      mean,
      stdDev,
      currentValue
    };
  }
}

// Usage
const anomalyDetector = new AnomalyDetector();

// Continuously update baselines
setInterval(() => {
  // Get current metrics
  const currentRPS = getCurrentRPS();
  const currentErrorRate = getCurrentErrorRate();
  const currentResponseTime = getCurrentResponseTime();
  
  // Update baselines
  anomalyDetector.updateBaseline('rps', currentRPS);
  anomalyDetector.updateBaseline('error_rate', currentErrorRate);
  anomalyDetector.updateBaseline('response_time', currentResponseTime);
  
  // Check for anomalies
  const rpsAnomaly = anomalyDetector.detectAnomaly('rps', currentRPS);
  if (rpsAnomaly.isAnomaly && rpsAnomaly.confidence > 0.8) {
    console.log('RPS anomaly detected:', rpsAnomaly);
  }
}, 5000); // Check every 5 seconds
```

## Incident Response

### Automated Response System

```javascript
class IncidentResponseSystem {
  constructor(options = {}) {
    this.escalationLevels = options.escalationLevels || [
      { threshold: 0.3, actions: ['log'] },
      { threshold: 0.6, actions: ['alert', 'rate_limit'] },
      { threshold: 0.8, actions: ['alert', 'block_ips', 'scale_up'] },
      { threshold: 0.9, actions: ['emergency_mode', 'notify_team'] }
    ];
    
    this.activeIncidents = new Map();
    this.responseActions = new Map();
    
    this.registerActions();
  }

  registerActions() {
    this.responseActions.set('log', this.logIncident.bind(this));
    this.responseActions.set('alert', this.sendAlert.bind(this));
    this.responseActions.set('rate_limit', this.enableStrictRateLimit.bind(this));
    this.responseActions.set('block_ips', this.blockSuspiciousIPs.bind(this));
    this.responseActions.set('scale_up', this.scaleUpResources.bind(this));
    this.responseActions.set('emergency_mode', this.enableEmergencyMode.bind(this));
    this.responseActions.set('notify_team', this.notifyResponseTeam.bind(this));
  }

  async handleIncident(incident) {
    const incidentId = `${incident.type}_${Date.now()}`;
    
    // Calculate severity
    const severity = this.calculateSeverity(incident);
    
    // Find appropriate escalation level
    const escalationLevel = this.escalationLevels.find(
      level => severity <= level.threshold
    ) || this.escalationLevels[this.escalationLevels.length - 1];
    
    // Store incident
    this.activeIncidents.set(incidentId, {
      ...incident,
      severity,
      escalationLevel,
      startTime: Date.now(),
      actions: []
    });
    
    // Execute response actions
    for (const actionName of escalationLevel.actions) {
      const action = this.responseActions.get(actionName);
      if (action) {
        try {
          await action(incident, severity);
          this.activeIncidents.get(incidentId).actions.push({
            name: actionName,
            timestamp: Date.now(),
            status: 'completed'
          });
        } catch (error) {
          console.error(`Failed to execute action ${actionName}:`, error);
          this.activeIncidents.get(incidentId).actions.push({
            name: actionName,
            timestamp: Date.now(),
            status: 'failed',
            error: error.message
          });
        }
      }
    }
    
    return incidentId;
  }

  calculateSeverity(incident) {
    let severity = 0;
    
    switch (incident.type) {
      case 'HIGH_RPS':
        severity = Math.min(incident.value / incident.threshold, 2);
        break;
      case 'HIGH_ERROR_RATE':
        severity = Math.min(incident.value / incident.threshold, 2);
        break;
      case 'DDoS_ATTACK':
        severity = 0.9; // Always high severity
        break;
      default:
        severity = 0.5;
    }
    
    return Math.min(severity, 1);
  }

  async logIncident(incident, severity) {
    console.log(`Incident logged: ${incident.type} (severity: ${severity})`);
    
    // Log to centralized logging system
    await this.sendToLoggingSystem({
      timestamp: new Date().toISOString(),
      type: 'security_incident',
      subtype: incident.type,
      severity,
      details: incident
    });
  }

  async sendAlert(incident, severity) {
    const alertMessage = {
      title: `Security Incident: ${incident.type}`,
      severity,
      description: `Detected ${incident.type} with value ${incident.value} exceeding threshold ${incident.threshold}`,
      timestamp: new Date().toISOString(),
      platform: '7P Education'
    };
    
    // Send to multiple channels
    await Promise.all([
      this.sendSlackAlert(alertMessage),
      this.sendEmailAlert(alertMessage),
      this.sendSMSAlert(alertMessage) // For critical incidents
    ]);
  }

  async enableStrictRateLimit(incident) {
    // Reduce rate limits by 50%
    const newLimits = {
      general: 50, // reduced from 100
      api: 500,    // reduced from 1000
      login: 5     // reduced from 10
    };
    
    await this.updateRateLimits(newLimits);
    console.log('Strict rate limiting enabled');
  }

  async blockSuspiciousIPs(incident) {
    // Identify suspicious IP patterns
    const suspiciousIPs = await this.identifySuspiciousIPs();
    
    for (const ip of suspiciousIPs) {
      await this.blockIP(ip, 3600); // Block for 1 hour
    }
    
    console.log(`Blocked ${suspiciousIPs.length} suspicious IPs`);
  }

  async scaleUpResources(incident) {
    // Auto-scaling logic
    const currentInstances = await this.getCurrentInstanceCount();
    const targetInstances = Math.min(currentInstances * 2, 10);
    
    await this.scaleToInstances(targetInstances);
    console.log(`Scaled up from ${currentInstances} to ${targetInstances} instances`);
  }

  async enableEmergencyMode(incident) {
    // Enable emergency response mode
    const emergencyConfig = {
      rateLimits: {
        general: 20,
        api: 100,
        login: 2
      },
      enableCaptcha: true,
      blockNewRegistrations: true,
      enableMaintenanceMode: false // Only for extreme cases
    };
    
    await this.applyEmergencyConfig(emergencyConfig);
    console.log('Emergency mode enabled');
  }

  async notifyResponseTeam(incident) {
    const responseTeam = [
      'security@7peducation.com',
      'devops@7peducation.com',
      'cto@7peducation.com'
    ];
    
    const message = {
      subject: `URGENT: Security Incident - ${incident.type}`,
      body: `A critical security incident has been detected on the 7P Education platform.
      
      Incident Type: ${incident.type}
      Severity: High
      Time: ${new Date().toISOString()}
      
      Immediate investigation required.`,
      recipients: responseTeam
    };
    
    await this.sendUrgentNotification(message);
  }
}
```

## Configuration Guidelines

### Production Configuration

```javascript
// production-rate-limits.js
module.exports = {
  // General rate limiting
  general: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // requests per window
    message: 'Too many requests, please try again later'
  },
  
  // API rate limiting
  api: {
    windowMs: 15 * 60 * 1000,
    max: 5000,
    keyGenerator: (req) => req.user?.id || req.ip,
    skip: (req) => req.user?.role === 'admin'
  },
  
  // Authentication endpoints
  auth: {
    windowMs: 15 * 60 * 1000,
    max: 50, // Stricter for auth endpoints
    skipSuccessfulRequests: true
  },
  
  // File upload endpoints
  upload: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 100,
    keyGenerator: (req) => req.user?.id || req.ip
  },
  
  // DDoS protection thresholds
  ddos: {
    maxConnections: 1000,
    maxConnectionsPerIP: 50,
    suspiciousThreshold: 100,
    banDuration: 600000 // 10 minutes
  },
  
  // Monitoring thresholds
  monitoring: {
    rpsThreshold: 2000,
    errorRateThreshold: 0.05,
    responseTimeThreshold: 5000,
    connectionThreshold: 5000
  }
};
```

### Environment-Specific Settings

```javascript
// config/rate-limits.js
const config = {
  development: {
    enabled: false, // Disable in development
    strictMode: false
  },
  
  staging: {
    enabled: true,
    general: { max: 10000 }, // Higher limits for testing
    monitoring: { rpsThreshold: 5000 }
  },
  
  production: {
    enabled: true,
    strictMode: true,
    // Use production settings from above
    ...require('./production-rate-limits')
  }
};

module.exports = config[process.env.NODE_ENV || 'development'];
```

This comprehensive guide provides the foundation for implementing robust rate limiting and DDoS protection for the 7P Education Platform. The multi-layered approach ensures protection against various attack vectors while maintaining optimal performance for legitimate users.