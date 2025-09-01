# Background Job Processing for 7P Education Platform

## Executive Summary

This document outlines the comprehensive background job processing system for the 7P Education Platform, designed to handle asynchronous operations including email notifications, video processing, report generation, data analytics, course content processing, and system maintenance tasks. The implementation uses modern job queue systems with robust failure handling, monitoring, and scalability features to support educational workflows at enterprise scale.

## Table of Contents

1. [Job Processing Architecture](#job-processing-architecture)
2. [Queue Management System](#queue-management-system)
3. [Job Types & Workflows](#job-types--workflows)
4. [Worker Management](#worker-management)
5. [Error Handling & Retry Logic](#error-handling--retry-logic)
6. [Scheduling System](#scheduling-system)
7. [Monitoring & Analytics](#monitoring--analytics)
8. [Performance Optimization](#performance-optimization)
9. [Security & Compliance](#security--compliance)
10. [Deployment Strategies](#deployment-strategies)
11. [Testing & Quality Assurance](#testing--quality-assurance)
12. [Scaling & Load Management](#scaling--load-management)

## Job Processing Architecture

### Core Job Processing Framework

```javascript
// src/jobs/JobProcessor.js
const Bull = require('bull');
const IORedis = require('ioredis');
const cron = require('node-cron');

class JobProcessor {
    constructor() {
        this.redis = new IORedis(process.env.REDIS_URL);
        this.queues = new Map();
        this.workers = new Map();
        this.scheduledJobs = new Map();
        this.jobStats = {
            processed: 0,
            failed: 0,
            active: 0,
            waiting: 0
        };
        
        this.initializeQueues();
        this.setupEventListeners();
        this.startMetricsCollection();
    }

    initializeQueues() {
        const queueConfigs = {
            // High Priority Queues
            'email-notifications': {
                concurrency: 10,
                priority: 'high',
                defaultJobOptions: {
                    removeOnComplete: 100,
                    removeOnFail: 50,
                    attempts: 3,
                    backoff: {
                        type: 'exponential',
                        delay: 2000
                    }
                }
            },
            'critical-alerts': {
                concurrency: 5,
                priority: 'critical',
                defaultJobOptions: {
                    removeOnComplete: 200,
                    removeOnFail: 100,
                    attempts: 5,
                    backoff: {
                        type: 'exponential',
                        delay: 1000
                    }
                }
            },

            // Medium Priority Queues
            'video-processing': {
                concurrency: 3,
                priority: 'medium',
                defaultJobOptions: {
                    removeOnComplete: 50,
                    removeOnFail: 25,
                    attempts: 2,
                    timeout: 30 * 60 * 1000, // 30 minutes
                    backoff: {
                        type: 'fixed',
                        delay: 60000
                    }
                }
            },
            'report-generation': {
                concurrency: 5,
                priority: 'medium',
                defaultJobOptions: {
                    removeOnComplete: 25,
                    removeOnFail: 10,
                    attempts: 2,
                    timeout: 10 * 60 * 1000, // 10 minutes
                    backoff: {
                        type: 'exponential',
                        delay: 5000
                    }
                }
            },
            'content-processing': {
                concurrency: 8,
                priority: 'medium',
                defaultJobOptions: {
                    removeOnComplete: 75,
                    removeOnFail: 25,
                    attempts: 3,
                    timeout: 15 * 60 * 1000, // 15 minutes
                    backoff: {
                        type: 'exponential',
                        delay: 3000
                    }
                }
            },

            // Low Priority Queues
            'analytics-processing': {
                concurrency: 4,
                priority: 'low',
                defaultJobOptions: {
                    removeOnComplete: 20,
                    removeOnFail: 10,
                    attempts: 2,
                    timeout: 20 * 60 * 1000, // 20 minutes
                    backoff: {
                        type: 'fixed',
                        delay: 30000
                    }
                }
            },
            'maintenance-tasks': {
                concurrency: 2,
                priority: 'low',
                defaultJobOptions: {
                    removeOnComplete: 10,
                    removeOnFail: 5,
                    attempts: 1,
                    timeout: 60 * 60 * 1000, // 1 hour
                }
            },
            'data-export': {
                concurrency: 2,
                priority: 'low',
                defaultJobOptions: {
                    removeOnComplete: 15,
                    removeOnFail: 8,
                    attempts: 2,
                    timeout: 45 * 60 * 1000, // 45 minutes
                }
            }
        };

        for (const [queueName, config] of Object.entries(queueConfigs)) {
            const queue = new Bull(queueName, {
                redis: {
                    host: process.env.REDIS_HOST,
                    port: process.env.REDIS_PORT,
                    password: process.env.REDIS_PASSWORD
                },
                defaultJobOptions: config.defaultJobOptions
            });

            queue.concurrency = config.concurrency;
            queue.priority = config.priority;
            
            this.queues.set(queueName, queue);
            console.log(`✅ Queue initialized: ${queueName} (concurrency: ${config.concurrency})`);
        }
    }

    setupEventListeners() {
        for (const [queueName, queue] of this.queues) {
            queue.on('ready', () => {
                console.log(`📡 Queue ready: ${queueName}`);
            });

            queue.on('error', (error) => {
                console.error(`❌ Queue error in ${queueName}:`, error);
                this.handleQueueError(queueName, error);
            });

            queue.on('waiting', (jobId) => {
                this.jobStats.waiting++;
                console.log(`⏳ Job waiting: ${jobId} in ${queueName}`);
            });

            queue.on('active', (job, jobPromise) => {
                this.jobStats.active++;
                console.log(`🔄 Job started: ${job.id} in ${queueName}`);
                
                // Setup job timeout handling
                jobPromise.cancel = () => {
                    console.log(`⏰ Job timeout: ${job.id}`);
                    job.moveToFailed({ message: 'Job timeout' });
                };
            });

            queue.on('completed', (job, result) => {
                this.jobStats.processed++;
                this.jobStats.active--;
                console.log(`✅ Job completed: ${job.id} in ${queueName}`);
                this.updateJobMetrics(queueName, 'completed', job);
            });

            queue.on('failed', (job, error) => {
                this.jobStats.failed++;
                this.jobStats.active--;
                console.error(`❌ Job failed: ${job.id} in ${queueName}`, error.message);
                this.handleJobFailure(queueName, job, error);
            });

            queue.on('stalled', (job) => {
                console.warn(`⚠️ Job stalled: ${job.id} in ${queueName}`);
                this.handleStalledJob(queueName, job);
            });
        }
    }

    // Add job to queue
    async addJob(queueName, jobType, data, options = {}) {
        const queue = this.queues.get(queueName);
        if (!queue) {
            throw new Error(`Queue ${queueName} not found`);
        }

        const jobOptions = {
            ...queue.defaultJobOptions,
            ...options,
            jobId: options.jobId || this.generateJobId(jobType),
            priority: this.getPriority(options.priority || queue.priority)
        };

        const job = await queue.add(jobType, data, jobOptions);
        
        console.log(`📤 Job added: ${job.id} (${jobType}) to ${queueName}`);
        
        // Store job metadata
        await this.storeJobMetadata(job.id, {
            queueName,
            jobType,
            createdAt: new Date().toISOString(),
            createdBy: options.userId || 'system'
        });

        return job;
    }

    // Batch job processing
    async addBulkJobs(queueName, jobs) {
        const queue = this.queues.get(queueName);
        if (!queue) {
            throw new Error(`Queue ${queueName} not found`);
        }

        const formattedJobs = jobs.map(job => ({
            name: job.type,
            data: job.data,
            opts: {
                ...queue.defaultJobOptions,
                ...job.options,
                jobId: job.options?.jobId || this.generateJobId(job.type),
                priority: this.getPriority(job.options?.priority || queue.priority)
            }
        }));

        const addedJobs = await queue.addBulk(formattedJobs);
        
        console.log(`📦 Bulk jobs added: ${addedJobs.length} jobs to ${queueName}`);
        return addedJobs;
    }

    // Schedule recurring jobs
    scheduleJob(cronExpression, queueName, jobType, data, options = {}) {
        const jobId = `scheduled_${jobType}_${Date.now()}`;
        
        const task = cron.schedule(cronExpression, async () => {
            try {
                await this.addJob(queueName, jobType, data, {
                    ...options,
                    jobId: `${jobId}_${Date.now()}`
                });
            } catch (error) {
                console.error(`Failed to add scheduled job ${jobType}:`, error);
            }
        }, {
            scheduled: false,
            timezone: options.timezone || 'UTC'
        });

        this.scheduledJobs.set(jobId, {
            task,
            queueName,
            jobType,
            cronExpression,
            data,
            options
        });

        task.start();
        console.log(`⏰ Scheduled job: ${jobType} (${cronExpression})`);
        return jobId;
    }

    // Worker registration and management
    registerWorker(queueName, processor) {
        const queue = this.queues.get(queueName);
        if (!queue) {
            throw new Error(`Queue ${queueName} not found`);
        }

        const workerProcessor = this.createWorkerProcessor(queueName, processor);
        queue.process(queue.concurrency, workerProcessor);
        
        this.workers.set(queueName, {
            processor: workerProcessor,
            queue,
            startedAt: new Date().toISOString(),
            jobsProcessed: 0
        });

        console.log(`👷 Worker registered for queue: ${queueName}`);
    }

    createWorkerProcessor(queueName, processor) {
        return async (job) => {
            const startTime = Date.now();
            
            try {
                // Update job progress
                await job.progress(0);
                
                // Execute processor
                const result = await processor(job, {
                    updateProgress: (progress) => job.progress(progress),
                    log: (message) => job.log(message)
                });

                const duration = Date.now() - startTime;
                await job.progress(100);
                
                // Update worker stats
                const worker = this.workers.get(queueName);
                if (worker) {
                    worker.jobsProcessed++;
                }

                console.log(`✅ Job processed: ${job.id} in ${duration}ms`);
                return result;
                
            } catch (error) {
                const duration = Date.now() - startTime;
                console.error(`❌ Job processing failed: ${job.id} after ${duration}ms`, error);
                
                // Enhanced error logging
                await job.log(`Error: ${error.message}`);
                await job.log(`Stack: ${error.stack}`);
                
                throw error;
            }
        };
    }

    // Utility methods
    generateJobId(jobType) {
        return `${jobType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    getPriority(priorityLevel) {
        const priorities = {
            critical: 1,
            high: 2,
            medium: 3,
            low: 4
        };
        return priorities[priorityLevel] || 3;
    }

    async storeJobMetadata(jobId, metadata) {
        await this.redis.hset(`job:${jobId}:metadata`, metadata);
        await this.redis.expire(`job:${jobId}:metadata`, 30 * 24 * 3600); // 30 days
    }

    // Queue management
    async pauseQueue(queueName) {
        const queue = this.queues.get(queueName);
        if (queue) {
            await queue.pause();
            console.log(`⏸️  Queue paused: ${queueName}`);
        }
    }

    async resumeQueue(queueName) {
        const queue = this.queues.get(queueName);
        if (queue) {
            await queue.resume();
            console.log(`▶️  Queue resumed: ${queueName}`);
        }
    }

    async clearQueue(queueName, status = 'waiting') {
        const queue = this.queues.get(queueName);
        if (queue) {
            await queue.clean(0, status);
            console.log(`🧹 Queue cleared: ${queueName} (${status})`);
        }
    }

    // Metrics and monitoring
    startMetricsCollection() {
        setInterval(async () => {
            await this.updateQueueMetrics();
        }, 30000); // Update every 30 seconds
    }

    async updateQueueMetrics() {
        for (const [queueName, queue] of this.queues) {
            const waiting = await queue.getWaiting();
            const active = await queue.getActive();
            const completed = await queue.getCompleted();
            const failed = await queue.getFailed();

            const metrics = {
                queueName,
                waiting: waiting.length,
                active: active.length,
                completed: completed.length,
                failed: failed.length,
                timestamp: new Date().toISOString()
            };

            await this.redis.lpush(`metrics:queue:${queueName}`, JSON.stringify(metrics));
            await this.redis.ltrim(`metrics:queue:${queueName}`, 0, 99); // Keep last 100 metrics
        }
    }

    updateJobMetrics(queueName, status, job) {
        // Implementation would update job-specific metrics
        const duration = Date.now() - job.processedOn;
        
        this.redis.hincrby(`stats:queue:${queueName}`, status, 1);
        this.redis.hincrby(`stats:queue:${queueName}`, 'total_duration', duration);
    }

    handleQueueError(queueName, error) {
        // Implementation would handle queue-level errors
        console.error(`Queue ${queueName} error:`, error);
        
        // Restart queue if needed
        setTimeout(() => {
            this.restartQueue(queueName);
        }, 5000);
    }

    async restartQueue(queueName) {
        const queue = this.queues.get(queueName);
        if (queue) {
            await queue.close();
            // Reinitialize queue logic here
            console.log(`🔄 Queue restarted: ${queueName}`);
        }
    }

    handleJobFailure(queueName, job, error) {
        // Store failure details for analysis
        this.redis.lpush(`failures:${queueName}`, JSON.stringify({
            jobId: job.id,
            jobType: job.name,
            error: error.message,
            stack: error.stack,
            failedAt: new Date().toISOString(),
            attemptsMade: job.attemptsMade,
            data: job.data
        }));
    }

    handleStalledJob(queueName, job) {
        // Handle stalled jobs
        console.warn(`Handling stalled job: ${job.id} in ${queueName}`);
        
        // Could implement custom stalled job recovery logic here
    }

    // Health check
    async getHealthStatus() {
        const health = {
            status: 'healthy',
            queues: {},
            workers: this.workers.size,
            scheduledJobs: this.scheduledJobs.size,
            totalStats: { ...this.jobStats }
        };

        for (const [queueName, queue] of this.queues) {
            try {
                const waiting = await queue.getWaiting();
                const active = await queue.getActive();
                const completed = await queue.getCompleted();
                const failed = await queue.getFailed();

                health.queues[queueName] = {
                    waiting: waiting.length,
                    active: active.length,
                    completed: completed.length,
                    failed: failed.length,
                    paused: await queue.isPaused()
                };
            } catch (error) {
                health.queues[queueName] = {
                    status: 'error',
                    error: error.message
                };
                health.status = 'degraded';
            }
        }

        return health;
    }

    // Graceful shutdown
    async shutdown() {
        console.log('🛑 Starting graceful shutdown...');

        // Stop scheduled jobs
        for (const [jobId, scheduledJob] of this.scheduledJobs) {
            scheduledJob.task.stop();
        }

        // Close all queues
        const closePromises = Array.from(this.queues.values()).map(queue => 
            queue.close()
        );

        await Promise.all(closePromises);
        await this.redis.disconnect();

        console.log('✅ Graceful shutdown completed');
    }
}

module.exports = JobProcessor;
```

### Job Queue Dashboard & Management

```javascript
// src/jobs/JobDashboard.js
const Arena = require('bull-arena');
const express = require('express');

class JobDashboard {
    constructor(jobProcessor) {
        this.jobProcessor = jobProcessor;
        this.app = express();
        this.setupDashboard();
        this.setupAPI();
    }

    setupDashboard() {
        // Convert Bull queues to Arena format
        const queues = Array.from(this.jobProcessor.queues.entries()).map(([name, queue]) => ({
            name,
            hostId: 'Job Processor',
            type: 'bull',
            redis: {
                host: process.env.REDIS_HOST,
                port: process.env.REDIS_PORT,
                password: process.env.REDIS_PASSWORD
            }
        }));

        const arenaConfig = Arena({
            queues,
            basePath: '/admin/queues',
            disableListen: true
        }, {
            port: 4567
        });

        this.app.use('/admin/queues', arenaConfig);
    }

    setupAPI() {
        // Queue statistics API
        this.app.get('/api/queues/stats', async (req, res) => {
            try {
                const stats = await this.getQueueStatistics();
                res.json(stats);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        // Job management API
        this.app.post('/api/queues/:queueName/jobs', async (req, res) => {
            try {
                const { queueName } = req.params;
                const { jobType, data, options } = req.body;
                
                const job = await this.jobProcessor.addJob(queueName, jobType, data, options);
                res.json({ jobId: job.id, status: 'added' });
            } catch (error) {
                res.status(400).json({ error: error.message });
            }
        });

        // Queue management API
        this.app.post('/api/queues/:queueName/pause', async (req, res) => {
            try {
                const { queueName } = req.params;
                await this.jobProcessor.pauseQueue(queueName);
                res.json({ status: 'paused' });
            } catch (error) {
                res.status(400).json({ error: error.message });
            }
        });

        this.app.post('/api/queues/:queueName/resume', async (req, res) => {
            try {
                const { queueName } = req.params;
                await this.jobProcessor.resumeQueue(queueName);
                res.json({ status: 'resumed' });
            } catch (error) {
                res.status(400).json({ error: error.message });
            }
        });

        // Health check API
        this.app.get('/api/health', async (req, res) => {
            const health = await this.jobProcessor.getHealthStatus();
            const statusCode = health.status === 'healthy' ? 200 : 503;
            res.status(statusCode).json(health);
        });

        // Job retry API
        this.app.post('/api/jobs/:jobId/retry', async (req, res) => {
            try {
                const { jobId } = req.params;
                await this.retryJob(jobId);
                res.json({ status: 'retried' });
            } catch (error) {
                res.status(400).json({ error: error.message });
            }
        });
    }

    async getQueueStatistics() {
        const stats = {
            overview: { ...this.jobProcessor.jobStats },
            queues: {},
            workers: {},
            scheduledJobs: this.jobProcessor.scheduledJobs.size
        };

        for (const [queueName, queue] of this.jobProcessor.queues) {
            const waiting = await queue.getWaiting();
            const active = await queue.getActive();
            const completed = await queue.getCompleted();
            const failed = await queue.getFailed();

            stats.queues[queueName] = {
                waiting: waiting.length,
                active: active.length,
                completed: completed.length,
                failed: failed.length,
                paused: await queue.isPaused(),
                concurrency: queue.concurrency,
                priority: queue.priority
            };

            // Get recent job performance
            const recentMetrics = await this.getRecentMetrics(queueName);
            stats.queues[queueName].performance = recentMetrics;
        }

        for (const [queueName, worker] of this.jobProcessor.workers) {
            stats.workers[queueName] = {
                startedAt: worker.startedAt,
                jobsProcessed: worker.jobsProcessed,
                status: 'active'
            };
        }

        return stats;
    }

    async getRecentMetrics(queueName) {
        const metricsKey = `metrics:queue:${queueName}`;
        const recentMetrics = await this.jobProcessor.redis.lrange(metricsKey, 0, 9);
        
        return recentMetrics.map(metric => JSON.parse(metric));
    }

    async retryJob(jobId) {
        // Find the job across all queues and retry it
        for (const [queueName, queue] of this.jobProcessor.queues) {
            const job = await queue.getJob(jobId);
            if (job) {
                await job.retry();
                return;
            }
        }
        throw new Error(`Job ${jobId} not found`);
    }

    start(port = 3001) {
        this.server = this.app.listen(port, () => {
            console.log(`📊 Job Dashboard running on http://localhost:${port}/admin/queues`);
        });
        return this.server;
    }

    stop() {
        if (this.server) {
            this.server.close();
        }
    }
}

module.exports = JobDashboard;
```

## Job Types & Workflows

### Email Notification Jobs

```javascript
// src/jobs/workers/EmailNotificationWorker.js
const nodemailer = require('nodemailer');
const { EmailTemplate } = require('../../services/EmailTemplateService');

class EmailNotificationWorker {
    constructor() {
        this.transporter = this.createTransporter();
        this.templateService = new EmailTemplate();
    }

    createTransporter() {
        return nodemailer.createTransporter({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT,
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASSWORD
            },
            pool: true,
            maxConnections: 5,
            maxMessages: 100
        });
    }

    async processEmailJob(job, { updateProgress, log }) {
        const { emailType, recipientId, templateData, options = {} } = job.data;

        try {
            await updateProgress(10);
            await log(`Processing ${emailType} email for recipient ${recipientId}`);

            // Get recipient information
            const recipient = await this.getRecipient(recipientId);
            if (!recipient) {
                throw new Error(`Recipient ${recipientId} not found`);
            }

            await updateProgress(25);

            // Generate email content
            const emailContent = await this.templateService.render(emailType, {
                ...templateData,
                recipient
            });

            await updateProgress(50);

            // Prepare email options
            const mailOptions = {
                from: process.env.SMTP_FROM || 'noreply@7peducation.com',
                to: recipient.email,
                subject: emailContent.subject,
                html: emailContent.html,
                text: emailContent.text,
                ...options
            };

            // Add attachments if specified
            if (options.attachments) {
                mailOptions.attachments = await this.processAttachments(options.attachments);
            }

            await updateProgress(75);

            // Send email
            const result = await this.transporter.sendMail(mailOptions);
            
            await updateProgress(90);
            await log(`Email sent successfully: ${result.messageId}`);

            // Track email delivery
            await this.trackEmailDelivery(recipientId, emailType, result);

            await updateProgress(100);

            return {
                messageId: result.messageId,
                recipient: recipient.email,
                emailType,
                sentAt: new Date().toISOString()
            };

        } catch (error) {
            await log(`Email processing failed: ${error.message}`);
            throw error;
        }
    }

    async getRecipient(recipientId) {
        // Implementation would fetch recipient from database
        const { UserService } = require('../../services/UserService');
        return await UserService.findById(recipientId);
    }

    async processAttachments(attachments) {
        const processedAttachments = [];

        for (const attachment of attachments) {
            if (attachment.type === 'url') {
                // Download file from URL
                const response = await fetch(attachment.url);
                const buffer = await response.buffer();
                
                processedAttachments.push({
                    filename: attachment.filename,
                    content: buffer,
                    contentType: attachment.contentType
                });
            } else if (attachment.type === 'base64') {
                processedAttachments.push({
                    filename: attachment.filename,
                    content: Buffer.from(attachment.data, 'base64'),
                    contentType: attachment.contentType
                });
            }
        }

        return processedAttachments;
    }

    async trackEmailDelivery(recipientId, emailType, result) {
        const { AnalyticsService } = require('../../services/AnalyticsService');
        
        await AnalyticsService.trackEvent('email_sent', {
            recipientId,
            emailType,
            messageId: result.messageId,
            timestamp: new Date().toISOString()
        });
    }

    // Batch email processing
    async processBulkEmailJob(job, { updateProgress, log }) {
        const { emailType, recipients, templateData, options = {} } = job.data;
        const batchSize = options.batchSize || 50;
        const results = [];
        let processed = 0;

        await log(`Starting bulk email processing: ${recipients.length} recipients`);

        for (let i = 0; i < recipients.length; i += batchSize) {
            const batch = recipients.slice(i, i + batchSize);
            const batchPromises = batch.map(async (recipient) => {
                try {
                    const emailContent = await this.templateService.render(emailType, {
                        ...templateData,
                        recipient
                    });

                    const result = await this.transporter.sendMail({
                        from: process.env.SMTP_FROM,
                        to: recipient.email,
                        subject: emailContent.subject,
                        html: emailContent.html,
                        text: emailContent.text,
                        ...options
                    });

                    return { success: true, recipient: recipient.email, messageId: result.messageId };
                } catch (error) {
                    return { success: false, recipient: recipient.email, error: error.message };
                }
            });

            const batchResults = await Promise.allSettled(batchPromises);
            results.push(...batchResults.map(result => result.value));

            processed += batch.length;
            const progress = Math.round((processed / recipients.length) * 100);
            await updateProgress(progress);
            await log(`Processed ${processed}/${recipients.length} emails`);

            // Rate limiting delay
            if (i + batchSize < recipients.length) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        const successful = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;

        await log(`Bulk email completed: ${successful} sent, ${failed} failed`);

        return {
            total: recipients.length,
            successful,
            failed,
            results: results.slice(0, 100) // Return first 100 results to avoid large payloads
        };
    }
}

module.exports = EmailNotificationWorker;
```

### Video Processing Jobs

```javascript
// src/jobs/workers/VideoProcessingWorker.js
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');
const AWS = require('aws-sdk');

class VideoProcessingWorker {
    constructor() {
        this.s3 = new AWS.S3({
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            region: process.env.AWS_REGION
        });
        this.cloudfront = new AWS.CloudFront({
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
        });
    }

    async processVideoJob(job, { updateProgress, log }) {
        const { 
            videoUrl, 
            courseId, 
            lessonId, 
            quality = ['720p', '480p', '360p'],
            generateThumbnails = true,
            extractAudio = false
        } = job.data;

        const tempDir = path.join(__dirname, '../../../temp', job.id);
        const outputDir = path.join(tempDir, 'output');

        try {
            // Create temp directories
            await fs.promises.mkdir(tempDir, { recursive: true });
            await fs.promises.mkdir(outputDir, { recursive: true });

            await updateProgress(5);
            await log('Downloading source video...');

            // Download video
            const inputPath = await this.downloadVideo(videoUrl, tempDir);
            
            await updateProgress(15);
            await log('Analyzing video properties...');

            // Get video metadata
            const metadata = await this.getVideoMetadata(inputPath);
            await log(`Video duration: ${metadata.duration}s, resolution: ${metadata.width}x${metadata.height}`);

            const results = {
                originalMetadata: metadata,
                qualities: {},
                thumbnails: [],
                audioUrl: null
            };

            let currentProgress = 15;
            const totalTasks = quality.length + (generateThumbnails ? 1 : 0) + (extractAudio ? 1 : 0);
            const progressPerTask = 70 / totalTasks; // 70% for processing tasks

            // Process different quality versions
            for (const qualityLevel of quality) {
                await log(`Processing ${qualityLevel} quality...`);
                
                const outputPath = path.join(outputDir, `video_${qualityLevel}.mp4`);
                await this.convertVideo(inputPath, outputPath, qualityLevel);
                
                // Upload to S3
                const s3Key = `courses/${courseId}/lessons/${lessonId}/video_${qualityLevel}.mp4`;
                const videoUrl = await this.uploadToS3(outputPath, s3Key);
                
                results.qualities[qualityLevel] = {
                    url: videoUrl,
                    resolution: this.getResolution(qualityLevel),
                    fileSize: await this.getFileSize(outputPath)
                };

                currentProgress += progressPerTask;
                await updateProgress(Math.round(currentProgress));
                await log(`${qualityLevel} quality completed`);
            }

            // Generate thumbnails
            if (generateThumbnails) {
                await log('Generating video thumbnails...');
                
                const thumbnailPaths = await this.generateThumbnails(inputPath, outputDir, 5);
                
                for (let i = 0; i < thumbnailPaths.length; i++) {
                    const s3Key = `courses/${courseId}/lessons/${lessonId}/thumbnail_${i}.jpg`;
                    const thumbnailUrl = await this.uploadToS3(thumbnailPaths[i], s3Key);
                    results.thumbnails.push({
                        url: thumbnailUrl,
                        timestamp: Math.round((metadata.duration / thumbnailPaths.length) * i)
                    });
                }

                currentProgress += progressPerTask;
                await updateProgress(Math.round(currentProgress));
                await log('Thumbnails generated');
            }

            // Extract audio (for accessibility/offline use)
            if (extractAudio) {
                await log('Extracting audio track...');
                
                const audioPath = path.join(outputDir, 'audio.mp3');
                await this.extractAudio(inputPath, audioPath);
                
                const s3Key = `courses/${courseId}/lessons/${lessonId}/audio.mp3`;
                results.audioUrl = await this.uploadToS3(audioPath, s3Key);

                currentProgress += progressPerTask;
                await updateProgress(Math.round(currentProgress));
                await log('Audio extraction completed');
            }

            await updateProgress(90);
            await log('Updating database...');

            // Update lesson with video URLs
            await this.updateLessonMedia(lessonId, results);

            // Invalidate CloudFront cache if needed
            if (process.env.CLOUDFRONT_DISTRIBUTION_ID) {
                await this.invalidateCloudFront(courseId, lessonId);
            }

            await updateProgress(95);

            // Cleanup temp files
            await this.cleanup(tempDir);

            await updateProgress(100);
            await log('Video processing completed successfully');

            return results;

        } catch (error) {
            await log(`Video processing failed: ${error.message}`);
            
            // Cleanup on failure
            try {
                await this.cleanup(tempDir);
            } catch (cleanupError) {
                console.error('Cleanup failed:', cleanupError);
            }
            
            throw error;
        }
    }

    async downloadVideo(url, tempDir) {
        const filename = 'source_video.mp4';
        const outputPath = path.join(tempDir, filename);
        
        return new Promise((resolve, reject) => {
            const file = fs.createWriteStream(outputPath);
            
            require('https').get(url, (response) => {
                response.pipe(file);
                
                file.on('finish', () => {
                    file.close();
                    resolve(outputPath);
                });
                
                file.on('error', (error) => {
                    fs.unlink(outputPath, () => {});
                    reject(error);
                });
            }).on('error', reject);
        });
    }

    getVideoMetadata(inputPath) {
        return new Promise((resolve, reject) => {
            ffmpeg.ffprobe(inputPath, (error, metadata) => {
                if (error) {
                    reject(error);
                } else {
                    const videoStream = metadata.streams.find(stream => stream.codec_type === 'video');
                    resolve({
                        duration: metadata.format.duration,
                        width: videoStream.width,
                        height: videoStream.height,
                        bitrate: metadata.format.bit_rate,
                        size: metadata.format.size
                    });
                }
            });
        });
    }

    convertVideo(inputPath, outputPath, quality) {
        return new Promise((resolve, reject) => {
            const resolution = this.getResolution(quality);
            const bitrate = this.getBitrate(quality);

            ffmpeg(inputPath)
                .videoCodec('libx264')
                .audioCodec('aac')
                .videoBitrate(bitrate)
                .size(resolution)
                .outputOptions([
                    '-preset medium',
                    '-profile:v main',
                    '-level 3.1',
                    '-movflags +faststart'
                ])
                .output(outputPath)
                .on('end', resolve)
                .on('error', reject)
                .run();
        });
    }

    generateThumbnails(inputPath, outputDir, count) {
        return new Promise((resolve, reject) => {
            const thumbnails = [];
            
            ffmpeg(inputPath)
                .screenshots({
                    timestamps: Array.from({ length: count }, (_, i) => `${(100 / count) * i}%`),
                    filename: 'thumbnail_%i.jpg',
                    folder: outputDir,
                    size: '320x240'
                })
                .on('end', () => {
                    for (let i = 1; i <= count; i++) {
                        thumbnails.push(path.join(outputDir, `thumbnail_${i}.jpg`));
                    }
                    resolve(thumbnails);
                })
                .on('error', reject);
        });
    }

    extractAudio(inputPath, outputPath) {
        return new Promise((resolve, reject) => {
            ffmpeg(inputPath)
                .audioCodec('mp3')
                .audioBitrate(128)
                .output(outputPath)
                .on('end', resolve)
                .on('error', reject)
                .run();
        });
    }

    async uploadToS3(filePath, s3Key) {
        const fileContent = fs.readFileSync(filePath);
        const contentType = this.getContentType(filePath);

        const params = {
            Bucket: process.env.AWS_S3_BUCKET,
            Key: s3Key,
            Body: fileContent,
            ContentType: contentType,
            ACL: 'public-read'
        };

        const result = await this.s3.upload(params).promise();
        return result.Location;
    }

    async updateLessonMedia(lessonId, results) {
        const { LessonService } = require('../../services/LessonService');
        
        await LessonService.updateMedia(lessonId, {
            videoQualities: results.qualities,
            thumbnails: results.thumbnails,
            audioUrl: results.audioUrl,
            processedAt: new Date().toISOString()
        });
    }

    async invalidateCloudFront(courseId, lessonId) {
        const paths = [
            `/courses/${courseId}/lessons/${lessonId}/*`
        ];

        const params = {
            DistributionId: process.env.CLOUDFRONT_DISTRIBUTION_ID,
            InvalidationBatch: {
                CallerReference: `video-processing-${Date.now()}`,
                Paths: {
                    Quantity: paths.length,
                    Items: paths
                }
            }
        };

        await this.cloudfront.createInvalidation(params).promise();
    }

    async cleanup(tempDir) {
        await fs.promises.rmdir(tempDir, { recursive: true });
    }

    getResolution(quality) {
        const resolutions = {
            '1080p': '1920x1080',
            '720p': '1280x720',
            '480p': '854x480',
            '360p': '640x360',
            '240p': '426x240'
        };
        return resolutions[quality] || '1280x720';
    }

    getBitrate(quality) {
        const bitrates = {
            '1080p': '5000k',
            '720p': '2500k',
            '480p': '1000k',
            '360p': '750k',
            '240p': '400k'
        };
        return bitrates[quality] || '2500k';
    }

    getContentType(filePath) {
        const ext = path.extname(filePath).toLowerCase();
        const contentTypes = {
            '.mp4': 'video/mp4',
            '.mp3': 'audio/mpeg',
            '.jpg': 'image/jpeg',
            '.png': 'image/png'
        };
        return contentTypes[ext] || 'application/octet-stream';
    }

    async getFileSize(filePath) {
        const stats = await fs.promises.stat(filePath);
        return stats.size;
    }
}

module.exports = VideoProcessingWorker;
```

### Analytics & Report Generation

```javascript
// src/jobs/workers/AnalyticsWorker.js
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

class AnalyticsWorker {
    constructor() {
        this.analyticsService = require('../../services/AnalyticsService');
        this.reportCache = new Map();
    }

    async processAnalyticsJob(job, { updateProgress, log }) {
        const { 
            reportType, 
            parameters, 
            userId, 
            format = 'pdf',
            schedule = null 
        } = job.data;

        try {
            await updateProgress(10);
            await log(`Starting ${reportType} analytics generation...`);

            // Validate parameters
            this.validateReportParameters(reportType, parameters);

            await updateProgress(20);

            // Check cache for recent reports
            const cacheKey = this.generateCacheKey(reportType, parameters);
            const cachedReport = this.reportCache.get(cacheKey);
            
            if (cachedReport && this.isCacheValid(cachedReport, 30)) {
                await log('Using cached report data');
                await updateProgress(80);
            } else {
                await log('Generating fresh analytics data...');
                
                // Generate analytics data based on type
                const analyticsData = await this.generateAnalyticsData(reportType, parameters, updateProgress, log);
                
                // Cache the data
                this.reportCache.set(cacheKey, {
                    data: analyticsData,
                    generatedAt: new Date()
                });
                
                await updateProgress(70);
            }

            const reportData = cachedReport?.data || this.reportCache.get(cacheKey).data;

            await log(`Formatting report as ${format}...`);
            
            // Generate report in requested format
            const report = await this.formatReport(reportData, format, reportType, parameters);

            await updateProgress(90);

            // Store report and notify user
            const reportUrl = await this.storeReport(report, userId, reportType, format);
            await this.notifyUserReportReady(userId, reportType, reportUrl);

            await updateProgress(100);
            await log('Analytics report generation completed');

            return {
                reportUrl,
                reportType,
                format,
                generatedAt: new Date().toISOString(),
                recordCount: reportData.totalRecords,
                userId
            };

        } catch (error) {
            await log(`Analytics processing failed: ${error.message}`);
            throw error;
        }
    }

    async generateAnalyticsData(reportType, parameters, updateProgress, log) {
        switch (reportType) {
            case 'course-performance':
                return await this.generateCoursePerformanceData(parameters, updateProgress, log);
            case 'student-progress':
                return await this.generateStudentProgressData(parameters, updateProgress, log);
            case 'engagement-metrics':
                return await this.generateEngagementMetrics(parameters, updateProgress, log);
            case 'financial-summary':
                return await this.generateFinancialSummary(parameters, updateProgress, log);
            case 'instructor-analytics':
                return await this.generateInstructorAnalytics(parameters, updateProgress, log);
            default:
                throw new Error(`Unknown report type: ${reportType}`);
        }
    }

    async generateCoursePerformanceData(parameters, updateProgress, log) {
        const { courseIds, startDate, endDate, includeDetails = false } = parameters;
        
        await log('Fetching course enrollment data...');
        const enrollmentData = await this.analyticsService.getCourseEnrollments(courseIds, startDate, endDate);
        
        await updateProgress(35);
        await log('Calculating completion rates...');
        const completionData = await this.analyticsService.getCompletionRates(courseIds, startDate, endDate);
        
        await updateProgress(45);
        await log('Analyzing engagement metrics...');
        const engagementData = await this.analyticsService.getEngagementMetrics(courseIds, startDate, endDate);
        
        await updateProgress(55);
        await log('Fetching revenue data...');
        const revenueData = await this.analyticsService.getRevenueData(courseIds, startDate, endDate);
        
        await updateProgress(65);

        const courseData = courseIds.map(courseId => {
            const enrollment = enrollmentData.find(e => e.courseId === courseId) || {};
            const completion = completionData.find(c => c.courseId === courseId) || {};
            const engagement = engagementData.find(e => e.courseId === courseId) || {};
            const revenue = revenueData.find(r => r.courseId === courseId) || {};

            return {
                courseId,
                courseName: enrollment.courseName,
                totalEnrollments: enrollment.totalEnrollments || 0,
                activeStudents: enrollment.activeStudents || 0,
                completionRate: completion.completionRate || 0,
                averageProgress: completion.averageProgress || 0,
                averageTimeSpent: engagement.averageTimeSpent || 0,
                engagementScore: engagement.engagementScore || 0,
                totalRevenue: revenue.totalRevenue || 0,
                averageRating: engagement.averageRating || 0,
                ...(includeDetails && {
                    monthlyEnrollments: enrollment.monthlyBreakdown || [],
                    lessonCompletionRates: completion.lessonBreakdown || [],
                    engagementTrends: engagement.trends || []
                })
            };
        });

        return {
            reportType: 'course-performance',
            generatedAt: new Date().toISOString(),
            parameters,
            summary: {
                totalCourses: courseData.length,
                totalEnrollments: courseData.reduce((sum, c) => sum + c.totalEnrollments, 0),
                averageCompletionRate: courseData.reduce((sum, c) => sum + c.completionRate, 0) / courseData.length,
                totalRevenue: courseData.reduce((sum, c) => sum + c.totalRevenue, 0)
            },
            courses: courseData,
            totalRecords: courseData.length
        };
    }

    async generateStudentProgressData(parameters, updateProgress, log) {
        const { studentIds, courseId, startDate, endDate } = parameters;
        
        await log('Fetching student progress data...');
        const progressData = await this.analyticsService.getStudentProgress(studentIds, courseId, startDate, endDate);
        
        await updateProgress(40);
        await log('Calculating learning analytics...');
        const learningData = await this.analyticsService.getLearningAnalytics(studentIds, courseId, startDate, endDate);
        
        await updateProgress(60);

        const studentData = studentIds.map(studentId => {
            const progress = progressData.find(p => p.studentId === studentId) || {};
            const learning = learningData.find(l => l.studentId === studentId) || {};

            return {
                studentId,
                studentName: progress.studentName,
                enrollmentDate: progress.enrollmentDate,
                completionPercentage: progress.completionPercentage || 0,
                lessonsCompleted: progress.lessonsCompleted || 0,
                totalLessons: progress.totalLessons || 0,
                timeSpent: progress.timeSpent || 0,
                lastActivity: progress.lastActivity,
                averageScore: learning.averageScore || 0,
                streakDays: learning.streakDays || 0,
                badgesEarned: learning.badgesEarned || 0,
                certificateEarned: progress.certificateEarned || false,
                learningPath: learning.learningPath || []
            };
        });

        return {
            reportType: 'student-progress',
            generatedAt: new Date().toISOString(),
            parameters,
            summary: {
                totalStudents: studentData.length,
                averageCompletion: studentData.reduce((sum, s) => sum + s.completionPercentage, 0) / studentData.length,
                averageScore: studentData.reduce((sum, s) => sum + s.averageScore, 0) / studentData.length,
                certificatesEarned: studentData.filter(s => s.certificateEarned).length
            },
            students: studentData,
            totalRecords: studentData.length
        };
    }

    async formatReport(data, format, reportType, parameters) {
        switch (format.toLowerCase()) {
            case 'pdf':
                return await this.generatePDFReport(data, reportType);
            case 'excel':
                return await this.generateExcelReport(data, reportType);
            case 'json':
                return Buffer.from(JSON.stringify(data, null, 2));
            case 'csv':
                return await this.generateCSVReport(data, reportType);
            default:
                throw new Error(`Unsupported format: ${format}`);
        }
    }

    async generatePDFReport(data, reportType) {
        const doc = new PDFDocument();
        const buffers = [];

        doc.on('data', buffers.push.bind(buffers));
        
        // Header
        doc.fontSize(20).text(`${this.formatReportTitle(reportType)} Report`, 50, 50);
        doc.fontSize(12).text(`Generated: ${new Date().toLocaleString()}`, 50, 80);
        doc.text(`Report Period: ${data.parameters?.startDate || 'N/A'} - ${data.parameters?.endDate || 'N/A'}`, 50, 100);

        let yPosition = 140;

        // Summary section
        if (data.summary) {
            doc.fontSize(16).text('Summary', 50, yPosition);
            yPosition += 30;

            Object.entries(data.summary).forEach(([key, value]) => {
                doc.fontSize(10).text(`${this.formatLabel(key)}: ${this.formatValue(value)}`, 70, yPosition);
                yPosition += 15;
            });
            yPosition += 20;
        }

        // Data section
        if (reportType === 'course-performance' && data.courses) {
            doc.fontSize(16).text('Course Details', 50, yPosition);
            yPosition += 30;

            data.courses.forEach((course, index) => {
                if (yPosition > 700) {
                    doc.addPage();
                    yPosition = 50;
                }

                doc.fontSize(12).text(`${index + 1}. ${course.courseName}`, 70, yPosition);
                yPosition += 20;

                const metrics = [
                    ['Enrollments', course.totalEnrollments],
                    ['Completion Rate', `${(course.completionRate * 100).toFixed(1)}%`],
                    ['Avg Rating', course.averageRating.toFixed(1)],
                    ['Revenue', `$${course.totalRevenue.toLocaleString()}`]
                ];

                metrics.forEach(([label, value]) => {
                    doc.fontSize(10).text(`  ${label}: ${value}`, 90, yPosition);
                    yPosition += 15;
                });
                yPosition += 10;
            });
        }

        doc.end();

        return new Promise((resolve) => {
            doc.on('end', () => {
                resolve(Buffer.concat(buffers));
            });
        });
    }

    async generateExcelReport(data, reportType) {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Report');

        // Set headers based on report type
        if (reportType === 'course-performance') {
            worksheet.columns = [
                { header: 'Course Name', key: 'courseName', width: 30 },
                { header: 'Total Enrollments', key: 'totalEnrollments', width: 15 },
                { header: 'Active Students', key: 'activeStudents', width: 15 },
                { header: 'Completion Rate', key: 'completionRate', width: 15 },
                { header: 'Avg Progress', key: 'averageProgress', width: 15 },
                { header: 'Time Spent (hrs)', key: 'averageTimeSpent', width: 15 },
                { header: 'Rating', key: 'averageRating', width: 10 },
                { header: 'Revenue', key: 'totalRevenue', width: 15 }
            ];

            // Add data rows
            data.courses.forEach(course => {
                worksheet.addRow({
                    ...course,
                    completionRate: (course.completionRate * 100).toFixed(1) + '%',
                    averageProgress: (course.averageProgress * 100).toFixed(1) + '%',
                    averageTimeSpent: (course.averageTimeSpent / 3600).toFixed(1),
                    totalRevenue: course.totalRevenue.toLocaleString()
                });
            });
        }

        // Style the worksheet
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE0E0E0' }
        };

        const buffer = await workbook.xlsx.writeBuffer();
        return buffer;
    }

    async generateCSVReport(data, reportType) {
        let csv = '';
        
        if (reportType === 'course-performance') {
            // Headers
            csv += 'Course Name,Total Enrollments,Active Students,Completion Rate,Avg Progress,Time Spent (hrs),Rating,Revenue\n';
            
            // Data rows
            data.courses.forEach(course => {
                csv += `"${course.courseName}",${course.totalEnrollments},${course.activeStudents},`;
                csv += `${(course.completionRate * 100).toFixed(1)}%,${(course.averageProgress * 100).toFixed(1)}%,`;
                csv += `${(course.averageTimeSpent / 3600).toFixed(1)},${course.averageRating.toFixed(1)},`;
                csv += `$${course.totalRevenue.toLocaleString()}\n`;
            });
        }

        return Buffer.from(csv);
    }

    async storeReport(reportBuffer, userId, reportType, format) {
        const filename = `${reportType}-${Date.now()}.${format.toLowerCase()}`;
        const reportPath = path.join(__dirname, '../../../reports', filename);
        
        // Ensure reports directory exists
        await fs.promises.mkdir(path.dirname(reportPath), { recursive: true });
        
        // Write report file
        await fs.promises.writeFile(reportPath, reportBuffer);

        // Upload to S3 or store URL
        // const reportUrl = await this.uploadReportToStorage(reportPath, filename);
        const reportUrl = `/api/reports/download/${filename}`;

        // Store report metadata in database
        await this.storeReportMetadata({
            userId,
            reportType,
            filename,
            format,
            url: reportUrl,
            size: reportBuffer.length,
            generatedAt: new Date()
        });

        return reportUrl;
    }

    async notifyUserReportReady(userId, reportType, reportUrl) {
        const { JobProcessor } = require('../JobProcessor');
        const jobProcessor = new JobProcessor();

        await jobProcessor.addJob('email-notifications', 'report-ready', {
            recipientId: userId,
            reportType,
            reportUrl,
            templateData: {
                reportType: this.formatReportTitle(reportType),
                downloadUrl: reportUrl
            }
        });
    }

    generateCacheKey(reportType, parameters) {
        return `${reportType}_${JSON.stringify(parameters)}`;
    }

    isCacheValid(cachedData, maxAgeMinutes) {
        const ageMinutes = (Date.now() - cachedData.generatedAt.getTime()) / (1000 * 60);
        return ageMinutes < maxAgeMinutes;
    }

    validateReportParameters(reportType, parameters) {
        const requiredParams = {
            'course-performance': ['courseIds'],
            'student-progress': ['studentIds'],
            'engagement-metrics': ['startDate', 'endDate'],
            'financial-summary': ['startDate', 'endDate'],
            'instructor-analytics': ['instructorId']
        };

        const required = requiredParams[reportType] || [];
        for (const param of required) {
            if (!parameters[param]) {
                throw new Error(`Missing required parameter: ${param}`);
            }
        }
    }

    formatReportTitle(reportType) {
        return reportType.split('-').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    }

    formatLabel(key) {
        return key.replace(/([A-Z])/g, ' $1')
                 .replace(/^./, str => str.toUpperCase())
                 .trim();
    }

    formatValue(value) {
        if (typeof value === 'number') {
            if (value > 1000000) {
                return `${(value / 1000000).toFixed(1)}M`;
            } else if (value > 1000) {
                return `${(value / 1000).toFixed(1)}K`;
            }
            return value.toLocaleString();
        }
        return value;
    }

    async storeReportMetadata(metadata) {
        const { ReportService } = require('../../services/ReportService');
        await ReportService.create(metadata);
    }
}

module.exports = AnalyticsWorker;
```

## Worker Management & Scaling

### Dynamic Worker Scaling System

```javascript
// src/jobs/WorkerManager.js
const cluster = require('cluster');
const os = require('os');

class WorkerManager {
    constructor(jobProcessor) {
        this.jobProcessor = jobProcessor;
        this.workers = new Map();
        this.maxWorkers = process.env.MAX_WORKERS || os.cpus().length;
        this.minWorkers = process.env.MIN_WORKERS || 2;
        this.scalingMetrics = {
            lastScaleCheck: Date.now(),
            scaleCheckInterval: 60000, // 1 minute
            scaleUpThreshold: 0.8,      // 80% queue capacity
            scaleDownThreshold: 0.3,    // 30% queue capacity
            cooldownPeriod: 300000      // 5 minutes
        };

        this.startWorkerMonitoring();
    }

    async startWorkers() {
        console.log('🚀 Starting worker processes...');
        
        for (let i = 0; i < this.minWorkers; i++) {
            await this.spawnWorker(`worker-${i}`);
        }

        // Register all job processors
        this.registerJobProcessors();
        
        console.log(`✅ Started ${this.workers.size} worker processes`);
    }

    async spawnWorker(workerId) {
        const worker = cluster.fork({
            WORKER_ID: workerId,
            WORKER_TYPE: 'job-processor'
        });

        worker.on('message', (message) => {
            this.handleWorkerMessage(workerId, message);
        });

        worker.on('exit', (code, signal) => {
            console.log(`💀 Worker ${workerId} died (${signal || code})`);
            this.workers.delete(workerId);
            
            // Respawn worker if not intentional shutdown
            if (code !== 0 && !worker.exitedAfterDisconnect) {
                console.log(`🔄 Respawning worker ${workerId}...`);
                setTimeout(() => this.spawnWorker(workerId), 5000);
            }
        });

        worker.on('error', (error) => {
            console.error(`❌ Worker ${workerId} error:`, error);
        });

        this.workers.set(workerId, {
            worker,
            pid: worker.process.pid,
            startedAt: new Date(),
            jobsProcessed: 0,
            status: 'active',
            currentJobs: new Set(),
            metrics: {
                cpuUsage: 0,
                memoryUsage: 0,
                avgResponseTime: 0
            }
        });

        console.log(`👷 Worker spawned: ${workerId} (PID: ${worker.process.pid})`);
        return worker;
    }

    registerJobProcessors() {
        // Email notifications
        this.jobProcessor.registerWorker('email-notifications', async (job, helpers) => {
            const { EmailNotificationWorker } = require('./workers/EmailNotificationWorker');
            const worker = new EmailNotificationWorker();
            
            if (job.name === 'bulk-email') {
                return await worker.processBulkEmailJob(job, helpers);
            } else {
                return await worker.processEmailJob(job, helpers);
            }
        });

        // Video processing
        this.jobProcessor.registerWorker('video-processing', async (job, helpers) => {
            const { VideoProcessingWorker } = require('./workers/VideoProcessingWorker');
            const worker = new VideoProcessingWorker();
            return await worker.processVideoJob(job, helpers);
        });

        // Analytics and reports
        this.jobProcessor.registerWorker('analytics-processing', async (job, helpers) => {
            const { AnalyticsWorker } = require('./workers/AnalyticsWorker');
            const worker = new AnalyticsWorker();
            return await worker.processAnalyticsJob(job, helpers);
        });

        // Content processing
        this.jobProcessor.registerWorker('content-processing', async (job, helpers) => {
            return await this.processContentJob(job, helpers);
        });

        // Maintenance tasks
        this.jobProcessor.registerWorker('maintenance-tasks', async (job, helpers) => {
            return await this.processMaintenanceJob(job, helpers);
        });

        console.log('📋 Job processors registered');
    }

    async processContentJob(job, helpers) {
        const { type, data } = job.data;
        const { updateProgress, log } = helpers;

        switch (type) {
            case 'process-course-content':
                return await this.processCourseContent(data, updateProgress, log);
            case 'generate-transcripts':
                return await this.generateTranscripts(data, updateProgress, log);
            case 'optimize-images':
                return await this.optimizeImages(data, updateProgress, log);
            default:
                throw new Error(`Unknown content processing type: ${type}`);
        }
    }

    async processMaintenanceJob(job, helpers) {
        const { type, data } = job.data;
        const { updateProgress, log } = helpers;

        switch (type) {
            case 'cleanup-temp-files':
                return await this.cleanupTempFiles(data, updateProgress, log);
            case 'update-search-index':
                return await this.updateSearchIndex(data, updateProgress, log);
            case 'backup-database':
                return await this.backupDatabase(data, updateProgress, log);
            case 'send-digest-emails':
                return await this.sendDigestEmails(data, updateProgress, log);
            default:
                throw new Error(`Unknown maintenance type: ${type}`);
        }
    }

    startWorkerMonitoring() {
        setInterval(() => {
            this.collectWorkerMetrics();
            this.checkScaling();
        }, this.scalingMetrics.scaleCheckInterval);

        // Health check interval
        setInterval(() => {
            this.performHealthCheck();
        }, 30000); // Every 30 seconds
    }

    async collectWorkerMetrics() {
        for (const [workerId, workerInfo] of this.workers) {
            try {
                // Send metrics request to worker
                workerInfo.worker.send({ type: 'request-metrics' });
                
                // Update job count from queue info
                const queueStats = await this.jobProcessor.getHealthStatus();
                // Logic to map jobs to workers would go here
                
            } catch (error) {
                console.error(`Failed to collect metrics for worker ${workerId}:`, error);
            }
        }
    }

    async checkScaling() {
        const now = Date.now();
        if (now - this.scalingMetrics.lastScaleCheck < this.scalingMetrics.cooldownPeriod) {
            return; // Still in cooldown period
        }

        const queueStats = await this.jobProcessor.getHealthStatus();
        const totalLoad = this.calculateTotalLoad(queueStats);
        
        if (totalLoad > this.scalingMetrics.scaleUpThreshold && this.workers.size < this.maxWorkers) {
            await this.scaleUp();
            this.scalingMetrics.lastScaleCheck = now;
        } else if (totalLoad < this.scalingMetrics.scaleDownThreshold && this.workers.size > this.minWorkers) {
            await this.scaleDown();
            this.scalingMetrics.lastScaleCheck = now;
        }
    }

    calculateTotalLoad(queueStats) {
        let totalJobs = 0;
        let totalCapacity = 0;

        Object.values(queueStats.queues).forEach(queue => {
            totalJobs += queue.waiting + queue.active;
            // Estimate capacity based on queue concurrency settings
            totalCapacity += 100; // Simplified - would use actual queue configs
        });

        return totalCapacity > 0 ? totalJobs / totalCapacity : 0;
    }

    async scaleUp() {
        const newWorkerId = `worker-${Date.now()}`;
        console.log(`📈 Scaling up: Adding worker ${newWorkerId}`);
        
        await this.spawnWorker(newWorkerId);
        
        // Register processors for new worker
        this.registerJobProcessors();
        
        console.log(`✅ Scaled up to ${this.workers.size} workers`);
    }

    async scaleDown() {
        // Find least busy worker
        let leastBusyWorker = null;
        let minJobs = Infinity;

        for (const [workerId, workerInfo] of this.workers) {
            if (workerInfo.currentJobs.size < minJobs) {
                minJobs = workerInfo.currentJobs.size;
                leastBusyWorker = { id: workerId, info: workerInfo };
            }
        }

        if (leastBusyWorker && minJobs === 0) {
            console.log(`📉 Scaling down: Removing worker ${leastBusyWorker.id}`);
            
            // Gracefully disconnect worker
            leastBusyWorker.info.worker.disconnect();
            
            setTimeout(() => {
                if (!leastBusyWorker.info.worker.isDead()) {
                    leastBusyWorker.info.worker.kill();
                }
            }, 5000);
            
            console.log(`✅ Scaled down to ${this.workers.size - 1} workers`);
        }
    }

    handleWorkerMessage(workerId, message) {
        const workerInfo = this.workers.get(workerId);
        if (!workerInfo) return;

        switch (message.type) {
            case 'job-started':
                workerInfo.currentJobs.add(message.jobId);
                break;
                
            case 'job-completed':
                workerInfo.currentJobs.delete(message.jobId);
                workerInfo.jobsProcessed++;
                break;
                
            case 'job-failed':
                workerInfo.currentJobs.delete(message.jobId);
                break;
                
            case 'metrics':
                workerInfo.metrics = { ...workerInfo.metrics, ...message.data };
                break;
                
            case 'health-check':
                workerInfo.lastHealthCheck = new Date();
                workerInfo.status = message.status || 'active';
                break;
        }
    }

    async performHealthCheck() {
        const unhealthyWorkers = [];
        
        for (const [workerId, workerInfo] of this.workers) {
            // Send health check request
            workerInfo.worker.send({ type: 'health-check-request' });
            
            // Check if worker is responsive
            const lastHealthCheck = workerInfo.lastHealthCheck;
            if (lastHealthCheck && Date.now() - lastHealthCheck.getTime() > 60000) {
                unhealthyWorkers.push(workerId);
            }
        }

        // Restart unhealthy workers
        for (const workerId of unhealthyWorkers) {
            console.warn(`🏥 Restarting unhealthy worker: ${workerId}`);
            await this.restartWorker(workerId);
        }
    }

    async restartWorker(workerId) {
        const workerInfo = this.workers.get(workerId);
        if (workerInfo) {
            // Kill existing worker
            workerInfo.worker.kill();
            this.workers.delete(workerId);
            
            // Spawn new worker
            setTimeout(() => this.spawnWorker(workerId), 2000);
        }
    }

    getWorkerStats() {
        const stats = {
            totalWorkers: this.workers.size,
            activeWorkers: 0,
            totalJobsProcessed: 0,
            workers: {}
        };

        for (const [workerId, workerInfo] of this.workers) {
            if (workerInfo.status === 'active') {
                stats.activeWorkers++;
            }
            
            stats.totalJobsProcessed += workerInfo.jobsProcessed;
            
            stats.workers[workerId] = {
                pid: workerInfo.pid,
                status: workerInfo.status,
                startedAt: workerInfo.startedAt,
                jobsProcessed: workerInfo.jobsProcessed,
                currentJobs: workerInfo.currentJobs.size,
                metrics: workerInfo.metrics
            };
        }

        return stats;
    }

    async shutdown() {
        console.log('🛑 Shutting down workers...');
        
        const shutdownPromises = [];
        
        for (const [workerId, workerInfo] of this.workers) {
            const promise = new Promise((resolve) => {
                workerInfo.worker.on('exit', resolve);
                workerInfo.worker.disconnect();
                
                setTimeout(() => {
                    if (!workerInfo.worker.isDead()) {
                        workerInfo.worker.kill();
                    }
                    resolve();
                }, 10000);
            });
            
            shutdownPromises.push(promise);
        }

        await Promise.all(shutdownPromises);
        console.log('✅ All workers shut down');
    }

    // Content processing methods (simplified implementations)
    async processCourseContent(data, updateProgress, log) {
        // Implementation would process course content
        await log('Processing course content...');
        await updateProgress(100);
        return { processed: true };
    }

    async generateTranscripts(data, updateProgress, log) {
        // Implementation would generate video transcripts
        await log('Generating video transcripts...');
        await updateProgress(100);
        return { transcriptsGenerated: true };
    }

    async optimizeImages(data, updateProgress, log) {
        // Implementation would optimize image files
        await log('Optimizing images...');
        await updateProgress(100);
        return { imagesOptimized: true };
    }

    async cleanupTempFiles(data, updateProgress, log) {
        // Implementation would clean up temporary files
        await log('Cleaning up temporary files...');
        await updateProgress(100);
        return { filesDeleted: 0 };
    }

    async updateSearchIndex(data, updateProgress, log) {
        // Implementation would update search indexes
        await log('Updating search index...');
        await updateProgress(100);
        return { indexUpdated: true };
    }

    async backupDatabase(data, updateProgress, log) {
        // Implementation would backup database
        await log('Backing up database...');
        await updateProgress(100);
        return { backupCompleted: true };
    }

    async sendDigestEmails(data, updateProgress, log) {
        // Implementation would send digest emails
        await log('Sending digest emails...');
        await updateProgress(100);
        return { emailsSent: 0 };
    }
}

module.exports = WorkerManager;
```

This comprehensive background job processing system provides enterprise-grade asynchronous processing capabilities for the 7P Education Platform, handling everything from email notifications and video processing to analytics generation and system maintenance tasks. The implementation includes robust error handling, intelligent scaling, comprehensive monitoring, and production-ready features designed to support educational workflows at scale.