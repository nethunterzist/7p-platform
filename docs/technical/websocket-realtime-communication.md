# WebSocket Real-time Communication for 7P Education Platform

## Executive Summary

This document provides a comprehensive implementation guide for WebSocket-based real-time communication in the 7P Education Platform. The solution covers bidirectional messaging, real-time collaboration, live notifications, video streaming integration, and scalable WebSocket architecture designed to support thousands of concurrent users across educational activities including live classes, collaborative learning, and instant messaging.

## Table of Contents

1. [WebSocket Architecture Overview](#websocket-architecture-overview)
2. [Real-time Features Implementation](#real-time-features-implementation)
3. [Authentication & Authorization](#authentication--authorization)
4. [Message Broadcasting System](#message-broadcasting-system)
5. [Live Classroom Integration](#live-classroom-integration)
6. [Collaborative Learning Features](#collaborative-learning-features)
7. [Notification System](#notification-system)
8. [Performance Optimization](#performance-optimization)
9. [Error Handling & Resilience](#error-handling--resilience)
10. [Security Implementation](#security-implementation)
11. [Monitoring & Analytics](#monitoring--analytics)
12. [Testing Strategy](#testing-strategy)

## WebSocket Architecture Overview

### Core WebSocket Server Implementation

```javascript
// src/websocket/WebSocketServer.js
const WebSocket = require('ws');
const http = require('http');
const url = require('url');
const jwt = require('jsonwebtoken');
const Redis = require('ioredis');

class WebSocketServer {
    constructor(options = {}) {
        this.port = options.port || 8080;
        this.server = null;
        this.wss = null;
        this.connections = new Map(); // userId -> Set of WebSocket connections
        this.rooms = new Map(); // roomId -> Set of connections
        this.redis = new Redis(process.env.REDIS_URL);
        this.redisSubscriber = new Redis(process.env.REDIS_URL);
        this.messageHandlers = new Map();
        this.middlewares = [];
        
        this.setupMessageHandlers();
        this.setupRedisSubscriptions();
    }

    async start() {
        this.server = http.createServer();
        
        this.wss = new WebSocket.Server({
            server: this.server,
            verifyClient: this.verifyClient.bind(this),
            clientTracking: true,
            maxPayload: 1024 * 1024, // 1MB max message size
            perMessageDeflate: {
                zlibDeflateOptions: {
                    level: 3, // Compression level
                    chunkSize: 1024
                }
            }
        });

        this.wss.on('connection', this.handleConnection.bind(this));
        this.wss.on('error', this.handleServerError.bind(this));

        return new Promise((resolve, reject) => {
            this.server.listen(this.port, (error) => {
                if (error) {
                    reject(error);
                } else {
                    console.log(`🔌 WebSocket Server listening on port ${this.port}`);
                    resolve();
                }
            });
        });
    }

    async verifyClient(info) {
        try {
            const query = url.parse(info.req.url, true).query;
            const token = query.token;

            if (!token) {
                return false;
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            info.req.user = decoded;
            return true;
        } catch (error) {
            console.error('WebSocket authentication failed:', error.message);
            return false;
        }
    }

    handleConnection(ws, request) {
        const user = request.user;
        const connectionId = this.generateConnectionId();
        
        console.log(`👋 New WebSocket connection: ${user.sub} (${connectionId})`);

        // Store connection metadata
        ws.userId = user.sub;
        ws.userRole = user.role;
        ws.connectionId = connectionId;
        ws.joinedRooms = new Set();
        ws.isAlive = true;
        ws.lastHeartbeat = Date.now();

        // Add to user connections
        if (!this.connections.has(user.sub)) {
            this.connections.set(user.sub, new Set());
        }
        this.connections.get(user.sub).add(ws);

        // Setup connection event handlers
        ws.on('message', (data) => this.handleMessage(ws, data));
        ws.on('close', () => this.handleDisconnection(ws));
        ws.on('error', (error) => this.handleConnectionError(ws, error));
        ws.on('pong', () => {
            ws.isAlive = true;
            ws.lastHeartbeat = Date.now();
        });

        // Apply middlewares
        this.middlewares.forEach(middleware => middleware(ws, request));

        // Send welcome message
        this.sendToConnection(ws, {
            type: 'connection:established',
            data: {
                connectionId,
                serverTime: new Date().toISOString(),
                features: ['messaging', 'rooms', 'live-class', 'collaboration']
            }
        });

        // Publish user online status
        this.publishUserStatus(user.sub, 'online');
    }

    async handleMessage(ws, data) {
        try {
            const message = JSON.parse(data);
            
            // Validate message structure
            if (!message.type || !message.data) {
                throw new Error('Invalid message format');
            }

            // Rate limiting check
            if (!this.checkRateLimit(ws, message.type)) {
                return this.sendError(ws, 'Rate limit exceeded', 'RATE_LIMIT');
            }

            console.log(`📨 Received message: ${message.type} from ${ws.userId}`);

            const handler = this.messageHandlers.get(message.type);
            if (handler) {
                await handler(ws, message.data, message.meta || {});
            } else {
                this.sendError(ws, `Unknown message type: ${message.type}`, 'UNKNOWN_MESSAGE_TYPE');
            }
        } catch (error) {
            console.error('Message handling error:', error);
            this.sendError(ws, error.message, 'MESSAGE_ERROR');
        }
    }

    handleDisconnection(ws) {
        console.log(`👋 WebSocket disconnected: ${ws.userId} (${ws.connectionId})`);

        // Remove from user connections
        const userConnections = this.connections.get(ws.userId);
        if (userConnections) {
            userConnections.delete(ws);
            if (userConnections.size === 0) {
                this.connections.delete(ws.userId);
                // Publish user offline status if no more connections
                this.publishUserStatus(ws.userId, 'offline');
            }
        }

        // Leave all joined rooms
        ws.joinedRooms.forEach(roomId => {
            this.leaveRoom(ws, roomId);
        });

        // Clean up any user-specific data
        this.cleanupUserData(ws.userId);
    }

    handleConnectionError(ws, error) {
        console.error(`WebSocket connection error: ${ws.userId}`, error);
        
        // Send error to client if connection is still open
        if (ws.readyState === WebSocket.OPEN) {
            this.sendError(ws, 'Connection error occurred', 'CONNECTION_ERROR');
        }
    }

    handleServerError(error) {
        console.error('WebSocket server error:', error);
        
        // Implement server recovery logic if needed
        if (error.code === 'EADDRINUSE') {
            console.error(`Port ${this.port} is already in use`);
            process.exit(1);
        }
    }

    setupMessageHandlers() {
        // Room management
        this.messageHandlers.set('room:join', this.handleJoinRoom.bind(this));
        this.messageHandlers.set('room:leave', this.handleLeaveRoom.bind(this));
        this.messageHandlers.set('room:message', this.handleRoomMessage.bind(this));

        // Direct messaging
        this.messageHandlers.set('message:send', this.handleDirectMessage.bind(this));
        this.messageHandlers.set('message:typing', this.handleTyping.bind(this));

        // Live classroom
        this.messageHandlers.set('class:join', this.handleJoinClass.bind(this));
        this.messageHandlers.set('class:raise-hand', this.handleRaiseHand.bind(this));
        this.messageHandlers.set('class:chat', this.handleClassChat.bind(this));
        this.messageHandlers.set('class:screen-share', this.handleScreenShare.bind(this));

        // Collaboration
        this.messageHandlers.set('collab:document-edit', this.handleDocumentEdit.bind(this));
        this.messageHandlers.set('collab:cursor-move', this.handleCursorMove.bind(this));
        this.messageHandlers.set('collab:selection', this.handleSelection.bind(this));

        // System messages
        this.messageHandlers.set('ping', this.handlePing.bind(this));
        this.messageHandlers.set('heartbeat', this.handleHeartbeat.bind(this));
    }

    // Room Management Methods
    async handleJoinRoom(ws, data) {
        const { roomId, roomType = 'general' } = data;
        
        if (!roomId) {
            return this.sendError(ws, 'Room ID is required', 'INVALID_ROOM_ID');
        }

        // Validate room access permissions
        if (!await this.validateRoomAccess(ws.userId, roomId, roomType)) {
            return this.sendError(ws, 'Access denied to room', 'ROOM_ACCESS_DENIED');
        }

        this.joinRoom(ws, roomId, roomType);
        
        // Get room info and participants
        const roomInfo = await this.getRoomInfo(roomId);
        
        this.sendToConnection(ws, {
            type: 'room:joined',
            data: {
                roomId,
                roomType,
                participants: roomInfo.participants,
                metadata: roomInfo.metadata
            }
        });

        // Notify other participants
        this.broadcastToRoom(roomId, {
            type: 'room:user-joined',
            data: {
                userId: ws.userId,
                userRole: ws.userRole,
                timestamp: new Date().toISOString()
            }
        }, ws);
    }

    async handleLeaveRoom(ws, data) {
        const { roomId } = data;
        
        if (ws.joinedRooms.has(roomId)) {
            this.leaveRoom(ws, roomId);
            
            this.sendToConnection(ws, {
                type: 'room:left',
                data: { roomId }
            });

            // Notify other participants
            this.broadcastToRoom(roomId, {
                type: 'room:user-left',
                data: {
                    userId: ws.userId,
                    timestamp: new Date().toISOString()
                }
            });
        }
    }

    async handleRoomMessage(ws, data) {
        const { roomId, message, messageType = 'text', metadata = {} } = data;
        
        if (!ws.joinedRooms.has(roomId)) {
            return this.sendError(ws, 'Not in room', 'NOT_IN_ROOM');
        }

        // Validate and sanitize message
        const sanitizedMessage = this.sanitizeMessage(message, messageType);
        
        const messageData = {
            type: 'room:message',
            data: {
                messageId: this.generateMessageId(),
                roomId,
                senderId: ws.userId,
                senderRole: ws.userRole,
                message: sanitizedMessage,
                messageType,
                metadata,
                timestamp: new Date().toISOString()
            }
        };

        // Store message in database/cache
        await this.storeMessage(messageData.data);
        
        // Broadcast to room
        this.broadcastToRoom(roomId, messageData);
    }

    // Direct Messaging
    async handleDirectMessage(ws, data) {
        const { recipientId, message, messageType = 'text' } = data;
        
        // Validate recipient exists and is accessible
        if (!await this.validateMessageRecipient(ws.userId, recipientId)) {
            return this.sendError(ws, 'Invalid recipient', 'INVALID_RECIPIENT');
        }

        const sanitizedMessage = this.sanitizeMessage(message, messageType);
        
        const messageData = {
            type: 'message:received',
            data: {
                messageId: this.generateMessageId(),
                senderId: ws.userId,
                recipientId,
                message: sanitizedMessage,
                messageType,
                timestamp: new Date().toISOString()
            }
        };

        // Store message
        await this.storeDirectMessage(messageData.data);
        
        // Send to recipient
        this.sendToUser(recipientId, messageData);
        
        // Send delivery confirmation to sender
        this.sendToConnection(ws, {
            type: 'message:sent',
            data: {
                messageId: messageData.data.messageId,
                recipientId,
                timestamp: messageData.data.timestamp
            }
        });
    }

    async handleTyping(ws, data) {
        const { roomId, recipientId, isTyping } = data;
        
        const typingData = {
            type: 'typing:status',
            data: {
                userId: ws.userId,
                isTyping,
                timestamp: new Date().toISOString()
            }
        };

        if (roomId && ws.joinedRooms.has(roomId)) {
            this.broadcastToRoom(roomId, typingData, ws);
        } else if (recipientId) {
            this.sendToUser(recipientId, typingData);
        }
    }

    // Utility Methods
    joinRoom(ws, roomId, roomType = 'general') {
        ws.joinedRooms.add(roomId);
        
        if (!this.rooms.has(roomId)) {
            this.rooms.set(roomId, new Set());
        }
        this.rooms.get(roomId).add(ws);

        console.log(`👥 User ${ws.userId} joined room ${roomId}`);
    }

    leaveRoom(ws, roomId) {
        ws.joinedRooms.delete(roomId);
        
        const room = this.rooms.get(roomId);
        if (room) {
            room.delete(ws);
            if (room.size === 0) {
                this.rooms.delete(roomId);
            }
        }

        console.log(`👤 User ${ws.userId} left room ${roomId}`);
    }

    sendToConnection(ws, data) {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(data));
        }
    }

    sendToUser(userId, data) {
        const userConnections = this.connections.get(userId);
        if (userConnections) {
            userConnections.forEach(ws => this.sendToConnection(ws, data));
        }
    }

    broadcastToRoom(roomId, data, excludeWs = null) {
        const room = this.rooms.get(roomId);
        if (room) {
            room.forEach(ws => {
                if (ws !== excludeWs) {
                    this.sendToConnection(ws, data);
                }
            });
        }
    }

    sendError(ws, message, code) {
        this.sendToConnection(ws, {
            type: 'error',
            data: {
                message,
                code,
                timestamp: new Date().toISOString()
            }
        });
    }

    // Utility methods
    generateConnectionId() {
        return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    generateMessageId() {
        return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    sanitizeMessage(message, type) {
        // Implement message sanitization based on type
        if (type === 'text') {
            return message.replace(/[<>]/g, ''); // Basic XSS prevention
        }
        return message;
    }
}

module.exports = WebSocketServer;
```

### Advanced Room Management System

```javascript
// src/websocket/RoomManager.js
class RoomManager {
    constructor(webSocketServer) {
        this.wss = webSocketServer;
        this.redis = webSocketServer.redis;
        this.rooms = new Map(); // In-memory room cache
        this.roomTypes = {
            COURSE_DISCUSSION: 'course_discussion',
            LIVE_CLASS: 'live_class',
            STUDY_GROUP: 'study_group',
            DIRECT_MESSAGE: 'direct_message',
            COLLABORATION: 'collaboration'
        };
    }

    async createRoom(options) {
        const {
            roomId,
            roomType,
            ownerId,
            courseId,
            maxParticipants = 1000,
            isPublic = false,
            metadata = {}
        } = options;

        const room = {
            id: roomId,
            type: roomType,
            ownerId,
            courseId,
            maxParticipants,
            isPublic,
            metadata,
            participants: new Set(),
            createdAt: new Date(),
            lastActivity: new Date()
        };

        // Store room in Redis for persistence
        await this.redis.hset(`room:${roomId}`, {
            type: roomType,
            ownerId,
            courseId: courseId || '',
            maxParticipants,
            isPublic: isPublic ? '1' : '0',
            metadata: JSON.stringify(metadata),
            createdAt: room.createdAt.toISOString()
        });

        this.rooms.set(roomId, room);
        
        console.log(`🏠 Room created: ${roomId} (${roomType})`);
        return room;
    }

    async getRoomInfo(roomId) {
        let room = this.rooms.get(roomId);
        
        if (!room) {
            // Load from Redis
            const roomData = await this.redis.hgetall(`room:${roomId}`);
            if (roomData.type) {
                room = {
                    id: roomId,
                    type: roomData.type,
                    ownerId: roomData.ownerId,
                    courseId: roomData.courseId,
                    maxParticipants: parseInt(roomData.maxParticipants),
                    isPublic: roomData.isPublic === '1',
                    metadata: JSON.parse(roomData.metadata || '{}'),
                    participants: new Set(),
                    createdAt: new Date(roomData.createdAt),
                    lastActivity: new Date()
                };
                this.rooms.set(roomId, room);
            }
        }

        if (!room) return null;

        return {
            id: room.id,
            type: room.type,
            ownerId: room.ownerId,
            courseId: room.courseId,
            participantCount: room.participants.size,
            maxParticipants: room.maxParticipants,
            isPublic: room.isPublic,
            metadata: room.metadata,
            participants: Array.from(room.participants),
            createdAt: room.createdAt,
            lastActivity: room.lastActivity
        };
    }

    async validateRoomAccess(userId, roomId, userRole = 'STUDENT') {
        const room = await this.getRoomInfo(roomId);
        
        if (!room) return false;

        // Room owner always has access
        if (room.ownerId === userId) return true;

        // Admin users have access to all rooms
        if (userRole === 'ADMIN') return true;

        // Public rooms are accessible to everyone
        if (room.isPublic) return true;

        // Course-specific room access
        if (room.courseId) {
            return await this.validateCourseAccess(userId, room.courseId);
        }

        // Default: no access
        return false;
    }

    async validateCourseAccess(userId, courseId) {
        // Check if user is enrolled in the course
        const enrollment = await this.redis.get(`enrollment:${userId}:${courseId}`);
        return !!enrollment;
    }

    addParticipant(roomId, userId) {
        const room = this.rooms.get(roomId);
        if (room && room.participants.size < room.maxParticipants) {
            room.participants.add(userId);
            room.lastActivity = new Date();
            
            // Update Redis
            this.redis.sadd(`room:${roomId}:participants`, userId);
            this.redis.hset(`room:${roomId}`, 'lastActivity', room.lastActivity.toISOString());
            
            return true;
        }
        return false;
    }

    removeParticipant(roomId, userId) {
        const room = this.rooms.get(roomId);
        if (room) {
            room.participants.delete(userId);
            room.lastActivity = new Date();
            
            // Update Redis
            this.redis.srem(`room:${roomId}:participants`, userId);
            this.redis.hset(`room:${roomId}`, 'lastActivity', room.lastActivity.toISOString());
            
            // Clean up empty rooms
            if (room.participants.size === 0) {
                this.scheduleRoomCleanup(roomId);
            }
        }
    }

    scheduleRoomCleanup(roomId) {
        // Schedule room cleanup after 30 minutes of inactivity
        setTimeout(async () => {
            const room = this.rooms.get(roomId);
            if (room && room.participants.size === 0) {
                await this.deleteRoom(roomId);
            }
        }, 30 * 60 * 1000);
    }

    async deleteRoom(roomId) {
        this.rooms.delete(roomId);
        await this.redis.del(`room:${roomId}`);
        await this.redis.del(`room:${roomId}:participants`);
        await this.redis.del(`room:${roomId}:messages`);
        
        console.log(`🗑️  Room deleted: ${roomId}`);
    }

    // Room-specific features
    async enableFeature(roomId, feature, options = {}) {
        const room = this.rooms.get(roomId);
        if (!room) return false;

        room.metadata.features = room.metadata.features || {};
        room.metadata.features[feature] = {
            enabled: true,
            options,
            enabledAt: new Date().toISOString()
        };

        await this.redis.hset(`room:${roomId}`, 'metadata', JSON.stringify(room.metadata));
        
        // Notify room participants
        this.wss.broadcastToRoom(roomId, {
            type: 'room:feature-enabled',
            data: { feature, options }
        });

        return true;
    }

    async getRoomAnalytics(roomId, timeframe = '24h') {
        const room = await this.getRoomInfo(roomId);
        if (!room) return null;

        const analytics = {
            roomId,
            participantCount: room.participantCount,
            messageCount: await this.getMessageCount(roomId, timeframe),
            activeHours: await this.getActiveHours(roomId, timeframe),
            topParticipants: await this.getTopParticipants(roomId, timeframe),
            engagementScore: 0
        };

        // Calculate engagement score
        analytics.engagementScore = this.calculateEngagementScore(analytics);

        return analytics;
    }

    calculateEngagementScore(analytics) {
        const messageWeight = Math.min(analytics.messageCount / 100, 1) * 40;
        const participantWeight = Math.min(analytics.participantCount / 50, 1) * 30;
        const activeHoursWeight = Math.min(analytics.activeHours / 8, 1) * 30;

        return Math.round(messageWeight + participantWeight + activeHoursWeight);
    }

    async getMessageCount(roomId, timeframe) {
        const key = `room:${roomId}:messages:count`;
        return parseInt(await this.redis.get(key) || '0');
    }

    async getActiveHours(roomId, timeframe) {
        // Implementation would track active hours based on participant activity
        return 0;
    }

    async getTopParticipants(roomId, timeframe) {
        // Implementation would return most active participants
        return [];
    }
}

module.exports = RoomManager;
```

## Real-time Features Implementation

### Live Classroom System

```javascript
// src/websocket/LiveClassroom.js
class LiveClassroomManager {
    constructor(webSocketServer) {
        this.wss = webSocketServer;
        this.redis = webSocketServer.redis;
        this.activeSessions = new Map();
        this.participantStates = new Map(); // Track participant states (hand raised, etc.)
    }

    async handleJoinClass(ws, data) {
        const { classId, courseId, role = 'student' } = data;
        
        // Validate class access
        if (!await this.validateClassAccess(ws.userId, classId, courseId, role)) {
            return this.wss.sendError(ws, 'Access denied to class', 'CLASS_ACCESS_DENIED');
        }

        // Join the class room
        this.wss.joinRoom(ws, `class:${classId}`, 'live_class');
        
        // Initialize participant state
        const participantState = {
            userId: ws.userId,
            role,
            handRaised: false,
            isScreenSharing: false,
            isMuted: true,
            cameraEnabled: false,
            joinedAt: new Date().toISOString()
        };

        this.participantStates.set(`${classId}:${ws.userId}`, participantState);

        // Get class information
        const classInfo = await this.getClassInfo(classId);
        
        this.wss.sendToConnection(ws, {
            type: 'class:joined',
            data: {
                classId,
                classInfo,
                participants: await this.getClassParticipants(classId),
                yourState: participantState
            }
        });

        // Notify other participants
        this.wss.broadcastToRoom(`class:${classId}`, {
            type: 'class:participant-joined',
            data: participantState
        }, ws);

        console.log(`🎓 User ${ws.userId} joined class ${classId} as ${role}`);
    }

    async handleRaiseHand(ws, data) {
        const { classId, isRaised } = data;
        const stateKey = `${classId}:${ws.userId}`;
        const participantState = this.participantStates.get(stateKey);
        
        if (!participantState) {
            return this.wss.sendError(ws, 'Not in class', 'NOT_IN_CLASS');
        }

        participantState.handRaised = isRaised;
        participantState.handRaisedAt = isRaised ? new Date().toISOString() : null;

        // Update state in Redis for persistence
        await this.redis.hset(`class:${classId}:participants`, ws.userId, JSON.stringify(participantState));

        // Notify instructor and other participants
        this.wss.broadcastToRoom(`class:${classId}`, {
            type: 'class:hand-status-changed',
            data: {
                userId: ws.userId,
                handRaised: isRaised,
                timestamp: new Date().toISOString()
            }
        });

        // Send confirmation to user
        this.wss.sendToConnection(ws, {
            type: 'class:hand-status-updated',
            data: { handRaised: isRaised }
        });
    }

    async handleClassChat(ws, data) {
        const { classId, message, isPrivate = false, recipientId } = data;
        
        if (!this.wss.rooms.has(`class:${classId}`) || !ws.joinedRooms.has(`class:${classId}`)) {
            return this.wss.sendError(ws, 'Not in class', 'NOT_IN_CLASS');
        }

        const sanitizedMessage = this.wss.sanitizeMessage(message, 'text');
        const participantState = this.participantStates.get(`${classId}:${ws.userId}`);
        
        const messageData = {
            type: 'class:chat-message',
            data: {
                messageId: this.wss.generateMessageId(),
                classId,
                senderId: ws.userId,
                senderRole: participantState?.role || 'student',
                message: sanitizedMessage,
                isPrivate,
                recipientId,
                timestamp: new Date().toISOString()
            }
        };

        // Store message
        await this.storeClassMessage(messageData.data);

        // Send message
        if (isPrivate && recipientId) {
            // Send to specific recipient
            this.wss.sendToUser(recipientId, messageData);
            // Send confirmation to sender
            this.wss.sendToConnection(ws, {
                type: 'class:message-sent',
                data: { messageId: messageData.data.messageId }
            });
        } else {
            // Broadcast to entire class
            this.wss.broadcastToRoom(`class:${classId}`, messageData);
        }
    }

    async handleScreenShare(ws, data) {
        const { classId, isSharing, streamId } = data;
        const stateKey = `${classId}:${ws.userId}`;
        const participantState = this.participantStates.get(stateKey);
        
        if (!participantState) {
            return this.wss.sendError(ws, 'Not in class', 'NOT_IN_CLASS');
        }

        // Only instructors or designated students can share screen
        if (participantState.role === 'student' && !await this.canStudentShare(classId, ws.userId)) {
            return this.wss.sendError(ws, 'Screen sharing not allowed', 'SCREEN_SHARE_DENIED');
        }

        participantState.isScreenSharing = isSharing;
        participantState.streamId = isSharing ? streamId : null;

        // Update Redis state
        await this.redis.hset(`class:${classId}:participants`, ws.userId, JSON.stringify(participantState));

        // Notify all participants
        this.wss.broadcastToRoom(`class:${classId}`, {
            type: 'class:screen-share-status',
            data: {
                userId: ws.userId,
                isSharing,
                streamId: isSharing ? streamId : null,
                timestamp: new Date().toISOString()
            }
        });
    }

    async handleBreakoutRooms(ws, data) {
        const { classId, action, breakoutRoomId, participants } = data;
        const participantState = this.participantStates.get(`${classId}:${ws.userId}`);
        
        // Only instructors can manage breakout rooms
        if (participantState?.role !== 'instructor') {
            return this.wss.sendError(ws, 'Instructor access required', 'INSUFFICIENT_PERMISSIONS');
        }

        switch (action) {
            case 'create':
                await this.createBreakoutRoom(classId, breakoutRoomId, participants);
                break;
            case 'assign':
                await this.assignToBreakoutRoom(classId, breakoutRoomId, participants);
                break;
            case 'close':
                await this.closeBreakoutRoom(classId, breakoutRoomId);
                break;
        }
    }

    async createBreakoutRoom(classId, breakoutRoomId, participants) {
        const roomId = `breakout:${classId}:${breakoutRoomId}`;
        
        // Create the breakout room
        await this.wss.roomManager.createRoom({
            roomId,
            roomType: 'breakout_room',
            ownerId: classId, // Parent class as owner
            courseId: null,
            maxParticipants: participants.length + 2,
            isPublic: false,
            metadata: {
                parentClassId: classId,
                breakoutId: breakoutRoomId,
                assignedParticipants: participants
            }
        });

        // Notify assigned participants
        participants.forEach(userId => {
            this.wss.sendToUser(userId, {
                type: 'class:breakout-room-assigned',
                data: {
                    classId,
                    breakoutRoomId: roomId,
                    message: 'You have been assigned to a breakout room'
                }
            });
        });

        console.log(`🏠 Breakout room created: ${roomId}`);
    }

    async getClassInfo(classId) {
        const classData = await this.redis.hgetall(`class:${classId}`);
        return {
            id: classId,
            title: classData.title,
            startTime: classData.startTime,
            duration: parseInt(classData.duration),
            instructorId: classData.instructorId,
            courseId: classData.courseId,
            status: classData.status || 'active'
        };
    }

    async getClassParticipants(classId) {
        const participants = [];
        const participantData = await this.redis.hgetall(`class:${classId}:participants`);
        
        for (const [userId, stateStr] of Object.entries(participantData)) {
            try {
                const state = JSON.parse(stateStr);
                participants.push(state);
            } catch (error) {
                console.warn(`Invalid participant state for ${userId}:`, error);
            }
        }
        
        return participants;
    }

    async validateClassAccess(userId, classId, courseId, role) {
        // Check if user is enrolled in the course
        if (role === 'student') {
            const enrollment = await this.redis.get(`enrollment:${userId}:${courseId}`);
            return !!enrollment;
        }

        // Check if user is instructor of the course
        if (role === 'instructor') {
            const isInstructor = await this.redis.get(`instructor:${userId}:${courseId}`);
            return !!isInstructor;
        }

        return false;
    }

    async storeClassMessage(messageData) {
        const key = `class:${messageData.classId}:messages`;
        await this.redis.lpush(key, JSON.stringify(messageData));
        await this.redis.ltrim(key, 0, 999); // Keep last 1000 messages
        await this.redis.expire(key, 7 * 24 * 3600); // Expire after 1 week
    }

    async canStudentShare(classId, userId) {
        // Check if instructor has allowed this student to share
        const allowed = await this.redis.sismember(`class:${classId}:allowed_sharers`, userId);
        return allowed === 1;
    }

    // Cleanup when user leaves class
    handleLeaveClass(ws, classId) {
        const stateKey = `${classId}:${ws.userId}`;
        const participantState = this.participantStates.get(stateKey);
        
        if (participantState) {
            // Clean up participant state
            this.participantStates.delete(stateKey);
            this.redis.hdel(`class:${classId}:participants`, ws.userId);
            
            // Notify other participants
            this.wss.broadcastToRoom(`class:${classId}`, {
                type: 'class:participant-left',
                data: {
                    userId: ws.userId,
                    role: participantState.role,
                    timestamp: new Date().toISOString()
                }
            });
        }
    }
}

module.exports = LiveClassroomManager;
```

### Collaborative Document Editing

```javascript
// src/websocket/CollaborativeEditor.js
const { diff_match_patch } = require('diff-match-patch');

class CollaborativeEditor {
    constructor(webSocketServer) {
        this.wss = webSocketServer;
        this.redis = webSocketServer.redis;
        this.documents = new Map(); // documentId -> document state
        this.userCursors = new Map(); // documentId -> Map(userId -> cursor position)
        this.operationHistory = new Map(); // documentId -> array of operations
        this.dmp = new diff_match_patch();
    }

    async handleDocumentEdit(ws, data) {
        const { documentId, operation, revision, userId: clientUserId } = data;
        
        // Use WebSocket user ID if not provided
        const userId = clientUserId || ws.userId;
        
        // Validate document access
        if (!await this.validateDocumentAccess(userId, documentId)) {
            return this.wss.sendError(ws, 'Document access denied', 'DOCUMENT_ACCESS_DENIED');
        }

        try {
            const result = await this.applyOperation(documentId, operation, revision, userId);
            
            if (result.success) {
                // Broadcast operation to other collaborators
                this.broadcastOperation(documentId, result.transformedOperation, userId);
                
                // Send acknowledgment to sender
                this.wss.sendToConnection(ws, {
                    type: 'collab:operation-ack',
                    data: {
                        documentId,
                        operationId: operation.id,
                        newRevision: result.newRevision,
                        success: true
                    }
                });
            } else {
                // Send failure response
                this.wss.sendToConnection(ws, {
                    type: 'collab:operation-ack',
                    data: {
                        documentId,
                        operationId: operation.id,
                        success: false,
                        error: result.error,
                        currentRevision: result.currentRevision
                    }
                });
            }
        } catch (error) {
            console.error('Document edit error:', error);
            this.wss.sendError(ws, 'Failed to apply edit', 'EDIT_FAILED');
        }
    }

    async applyOperation(documentId, operation, clientRevision, userId) {
        // Get or create document
        let document = await this.getDocument(documentId);
        if (!document) {
            document = await this.createDocument(documentId);
        }

        // Check revision compatibility
        if (clientRevision !== document.revision) {
            return {
                success: false,
                error: 'Revision mismatch',
                currentRevision: document.revision
            };
        }

        // Apply operation based on type
        let transformedOperation = operation;
        let newContent = document.content;

        switch (operation.type) {
            case 'insert':
                newContent = this.applyInsert(document.content, operation);
                break;
            case 'delete':
                newContent = this.applyDelete(document.content, operation);
                break;
            case 'retain':
                // No content change for retain operations
                break;
            case 'replace':
                newContent = this.applyReplace(document.content, operation);
                break;
            default:
                return {
                    success: false,
                    error: 'Unknown operation type'
                };
        }

        // Update document
        document.content = newContent;
        document.revision++;
        document.lastModified = new Date().toISOString();
        document.lastModifiedBy = userId;

        // Store operation in history
        const operationRecord = {
            id: this.generateOperationId(),
            type: operation.type,
            operation: transformedOperation,
            userId,
            timestamp: new Date().toISOString(),
            revision: document.revision
        };

        if (!this.operationHistory.has(documentId)) {
            this.operationHistory.set(documentId, []);
        }
        this.operationHistory.get(documentId).push(operationRecord);

        // Save to Redis
        await this.saveDocument(document);
        await this.saveOperation(documentId, operationRecord);

        return {
            success: true,
            transformedOperation: operationRecord,
            newRevision: document.revision
        };
    }

    applyInsert(content, operation) {
        const { position, text } = operation;
        return content.slice(0, position) + text + content.slice(position);
    }

    applyDelete(content, operation) {
        const { position, length } = operation;
        return content.slice(0, position) + content.slice(position + length);
    }

    applyReplace(content, operation) {
        const { position, length, text } = operation;
        return content.slice(0, position) + text + content.slice(position + length);
    }

    broadcastOperation(documentId, operation, excludeUserId) {
        const roomId = `document:${documentId}`;
        const room = this.wss.rooms.get(roomId);
        
        if (room) {
            room.forEach(ws => {
                if (ws.userId !== excludeUserId) {
                    this.wss.sendToConnection(ws, {
                        type: 'collab:operation',
                        data: {
                            documentId,
                            operation,
                            timestamp: new Date().toISOString()
                        }
                    });
                }
            });
        }
    }

    async handleCursorMove(ws, data) {
        const { documentId, position, selection } = data;
        const userId = ws.userId;
        
        // Update cursor position
        if (!this.userCursors.has(documentId)) {
            this.userCursors.set(documentId, new Map());
        }
        
        this.userCursors.get(documentId).set(userId, {
            position,
            selection,
            timestamp: Date.now()
        });

        // Broadcast cursor position to other collaborators
        const roomId = `document:${documentId}`;
        this.wss.broadcastToRoom(roomId, {
            type: 'collab:cursor-moved',
            data: {
                documentId,
                userId,
                position,
                selection,
                timestamp: new Date().toISOString()
            }
        }, ws);
    }

    async handleSelection(ws, data) {
        const { documentId, startPosition, endPosition, text } = data;
        const userId = ws.userId;
        
        // Broadcast selection to other collaborators
        const roomId = `document:${documentId}`;
        this.wss.broadcastToRoom(roomId, {
            type: 'collab:selection-changed',
            data: {
                documentId,
                userId,
                startPosition,
                endPosition,
                text,
                timestamp: new Date().toISOString()
            }
        }, ws);
    }

    async getDocument(documentId) {
        let document = this.documents.get(documentId);
        
        if (!document) {
            // Load from Redis
            const documentData = await this.redis.hgetall(`document:${documentId}`);
            if (documentData.id) {
                document = {
                    id: documentData.id,
                    content: documentData.content,
                    revision: parseInt(documentData.revision),
                    createdAt: documentData.createdAt,
                    lastModified: documentData.lastModified,
                    lastModifiedBy: documentData.lastModifiedBy,
                    collaborators: new Set(JSON.parse(documentData.collaborators || '[]'))
                };
                this.documents.set(documentId, document);
            }
        }
        
        return document;
    }

    async createDocument(documentId, initialContent = '') {
        const document = {
            id: documentId,
            content: initialContent,
            revision: 0,
            createdAt: new Date().toISOString(),
            lastModified: new Date().toISOString(),
            lastModifiedBy: null,
            collaborators: new Set()
        };
        
        this.documents.set(documentId, document);
        await this.saveDocument(document);
        
        return document;
    }

    async saveDocument(document) {
        await this.redis.hset(`document:${document.id}`, {
            id: document.id,
            content: document.content,
            revision: document.revision,
            createdAt: document.createdAt,
            lastModified: document.lastModified,
            lastModifiedBy: document.lastModifiedBy || '',
            collaborators: JSON.stringify(Array.from(document.collaborators))
        });
    }

    async saveOperation(documentId, operation) {
        const key = `document:${documentId}:operations`;
        await this.redis.lpush(key, JSON.stringify(operation));
        await this.redis.ltrim(key, 0, 999); // Keep last 1000 operations
    }

    async validateDocumentAccess(userId, documentId) {
        // Check if user has access to the document
        // This could be based on course enrollment, document sharing settings, etc.
        const hasAccess = await this.redis.sismember(`document:${documentId}:collaborators`, userId);
        return hasAccess === 1;
    }

    async addCollaborator(documentId, userId) {
        const document = await this.getDocument(documentId);
        if (document) {
            document.collaborators.add(userId);
            await this.redis.sadd(`document:${documentId}:collaborators`, userId);
            await this.saveDocument(document);
        }
    }

    async removeCollaborator(documentId, userId) {
        const document = await this.getDocument(documentId);
        if (document) {
            document.collaborators.delete(userId);
            await this.redis.srem(`document:${documentId}:collaborators`, userId);
            await this.saveDocument(document);
        }
        
        // Remove cursor position
        const cursors = this.userCursors.get(documentId);
        if (cursors) {
            cursors.delete(userId);
        }
    }

    generateOperationId() {
        return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Document synchronization utilities
    async getDocumentHistory(documentId, fromRevision = 0, limit = 100) {
        const operations = this.operationHistory.get(documentId) || [];
        return operations
            .filter(op => op.revision > fromRevision)
            .slice(0, limit);
    }

    async resyncDocument(ws, documentId) {
        const document = await this.getDocument(documentId);
        if (!document) {
            return this.wss.sendError(ws, 'Document not found', 'DOCUMENT_NOT_FOUND');
        }

        // Send full document state
        this.wss.sendToConnection(ws, {
            type: 'collab:document-sync',
            data: {
                documentId,
                content: document.content,
                revision: document.revision,
                lastModified: document.lastModified,
                collaborators: Array.from(document.collaborators)
            }
        });

        // Send current cursor positions
        const cursors = this.userCursors.get(documentId);
        if (cursors) {
            cursors.forEach((cursor, userId) => {
                this.wss.sendToConnection(ws, {
                    type: 'collab:cursor-moved',
                    data: {
                        documentId,
                        userId,
                        position: cursor.position,
                        selection: cursor.selection
                    }
                });
            });
        }
    }
}

module.exports = CollaborativeEditor;
```

## Performance Optimization

### Connection Pool Management

```javascript
// src/websocket/ConnectionPool.js
class ConnectionPoolManager {
    constructor(webSocketServer) {
        this.wss = webSocketServer;
        this.pools = new Map(); // poolId -> connection pool
        this.connectionMetrics = new Map();
        this.loadBalancer = new ConnectionLoadBalancer();
        this.heartbeatInterval = null;
        
        this.startHeartbeatCheck();
        this.startMetricsCollection();
    }

    startHeartbeatCheck() {
        this.heartbeatInterval = setInterval(() => {
            this.wss.wss.clients.forEach(ws => {
                if (!ws.isAlive) {
                    console.log(`💔 Terminating inactive connection: ${ws.userId}`);
                    ws.terminate();
                    return;
                }

                ws.isAlive = false;
                ws.ping();
            });
        }, 30000); // Check every 30 seconds
    }

    startMetricsCollection() {
        setInterval(() => {
            this.collectConnectionMetrics();
        }, 60000); // Collect every minute
    }

    collectConnectionMetrics() {
        const metrics = {
            timestamp: new Date().toISOString(),
            totalConnections: this.wss.wss.clients.size,
            activeConnections: Array.from(this.wss.wss.clients).filter(ws => ws.isAlive).length,
            roomCount: this.wss.rooms.size,
            messagesSentLastMinute: this.getMessageCount(),
            memoryUsage: process.memoryUsage(),
            userDistribution: this.getUserDistribution()
        };

        this.connectionMetrics.set(Date.now(), metrics);
        
        // Keep only last hour of metrics
        const oneHourAgo = Date.now() - (60 * 60 * 1000);
        for (const [timestamp] of this.connectionMetrics) {
            if (timestamp < oneHourAgo) {
                this.connectionMetrics.delete(timestamp);
            }
        }

        // Log if high connection count
        if (metrics.totalConnections > 1000) {
            console.log(`📊 High connection count: ${metrics.totalConnections}`);
        }
    }

    getUserDistribution() {
        const distribution = { students: 0, teachers: 0, admins: 0, guests: 0 };
        
        this.wss.wss.clients.forEach(ws => {
            const role = ws.userRole || 'guest';
            distribution[role + 's'] = (distribution[role + 's'] || 0) + 1;
        });
        
        return distribution;
    }

    getMessageCount() {
        // This would be implemented with message counting
        return 0;
    }

    // Connection optimization
    optimizeConnection(ws) {
        // Set TCP_NODELAY for lower latency
        if (ws._socket) {
            ws._socket.setNoDelay(true);
            ws._socket.setKeepAlive(true, 60000);
        }

        // Compression for large messages
        if (ws.extensions && ws.extensions['permessage-deflate']) {
            ws.extensions['permessage-deflate'].threshold = 1024;
        }
    }

    // Auto-scaling based on load
    async checkAutoScale() {
        const currentLoad = this.getCurrentLoad();
        
        if (currentLoad > 0.8) {
            await this.scaleUp();
        } else if (currentLoad < 0.3) {
            await this.scaleDown();
        }
    }

    getCurrentLoad() {
        const metrics = Array.from(this.connectionMetrics.values()).pop();
        if (!metrics) return 0;

        const connectionLoad = metrics.totalConnections / 10000; // Max 10k connections
        const memoryLoad = metrics.memoryUsage.heapUsed / (1024 * 1024 * 1024); // 1GB max
        
        return Math.max(connectionLoad, memoryLoad);
    }

    async scaleUp() {
        console.log('📈 Scaling up WebSocket server...');
        // Implementation would trigger additional server instances
    }

    async scaleDown() {
        console.log('📉 Scaling down WebSocket server...');
        // Implementation would reduce server instances
    }

    getConnectionStats() {
        const latestMetrics = Array.from(this.connectionMetrics.values()).pop();
        
        return {
            current: latestMetrics,
            history: Array.from(this.connectionMetrics.values()).slice(-60), // Last hour
            summary: {
                peakConnections: Math.max(...Array.from(this.connectionMetrics.values()).map(m => m.totalConnections)),
                averageConnections: this.calculateAverage('totalConnections'),
                uptimeHours: Math.round((Date.now() - this.wss.startTime) / (1000 * 60 * 60))
            }
        };
    }

    calculateAverage(field) {
        const values = Array.from(this.connectionMetrics.values()).map(m => m[field]);
        return values.length > 0 ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0;
    }

    // Cleanup
    cleanup() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
        }
    }
}

class ConnectionLoadBalancer {
    constructor() {
        this.servers = [];
        this.strategy = 'round-robin';
        this.currentIndex = 0;
    }

    addServer(server) {
        this.servers.push(server);
    }

    selectServer(userId) {
        if (this.servers.length === 0) return null;
        if (this.servers.length === 1) return this.servers[0];

        switch (this.strategy) {
            case 'round-robin':
                return this.roundRobin();
            case 'least-connections':
                return this.leastConnections();
            case 'user-hash':
                return this.userHash(userId);
            default:
                return this.roundRobin();
        }
    }

    roundRobin() {
        const server = this.servers[this.currentIndex];
        this.currentIndex = (this.currentIndex + 1) % this.servers.length;
        return server;
    }

    leastConnections() {
        return this.servers.reduce((least, current) => 
            current.connections < least.connections ? current : least
        );
    }

    userHash(userId) {
        const hash = this.hashString(userId);
        const index = hash % this.servers.length;
        return this.servers[index];
    }

    hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash);
    }
}

module.exports = { ConnectionPoolManager, ConnectionLoadBalancer };
```

## Security Implementation

### WebSocket Security Manager

```javascript
// src/websocket/SecurityManager.js
const rateLimit = require('ws-rate-limit');
const validator = require('validator');

class WebSocketSecurityManager {
    constructor(webSocketServer) {
        this.wss = webSocketServer;
        this.rateLimiters = new Map();
        this.suspiciousActivity = new Map();
        this.bannedIPs = new Set();
        this.securityRules = this.loadSecurityRules();
        
        this.setupRateLimiting();
        this.startSecurityMonitoring();
    }

    loadSecurityRules() {
        return {
            maxMessageSize: 64 * 1024, // 64KB
            maxMessagesPerMinute: 60,
            maxRoomsPerUser: 10,
            suspiciousActivityThreshold: 5,
            maxFailedAuthAttempts: 3,
            messageValidation: {
                maxLength: 10000,
                allowedTypes: ['text', 'json', 'binary'],
                forbiddenPatterns: [
                    /<script/i,
                    /javascript:/i,
                    /vbscript:/i,
                    /onload=/i,
                    /onerror=/i
                ]
            }
        };
    }

    setupRateLimiting() {
        this.wss.wss.on('connection', (ws) => {
            const limiter = rateLimit(ws, {
                maxMessages: this.securityRules.maxMessagesPerMinute,
                per: 60000, // 1 minute
                onLimitReached: (ws) => {
                    this.handleRateLimitExceeded(ws);
                }
            });

            this.rateLimiters.set(ws.connectionId, limiter);
        });
    }

    startSecurityMonitoring() {
        setInterval(() => {
            this.analyzeSuspiciousActivity();
            this.cleanupExpiredBans();
            this.updateThreatIntelligence();
        }, 5 * 60 * 1000); // Every 5 minutes
    }

    validateMessage(ws, messageData, rawMessage) {
        const validationResult = {
            valid: true,
            violations: [],
            severity: 'low'
        };

        try {
            // Size validation
            if (rawMessage.length > this.securityRules.maxMessageSize) {
                validationResult.valid = false;
                validationResult.violations.push('MESSAGE_TOO_LARGE');
                validationResult.severity = 'medium';
            }

            // Structure validation
            if (!messageData.type || typeof messageData.type !== 'string') {
                validationResult.valid = false;
                validationResult.violations.push('INVALID_MESSAGE_STRUCTURE');
            }

            // Content validation
            if (messageData.data && typeof messageData.data === 'string') {
                const content = messageData.data;
                
                // Length check
                if (content.length > this.securityRules.messageValidation.maxLength) {
                    validationResult.valid = false;
                    validationResult.violations.push('CONTENT_TOO_LONG');
                }

                // Pattern validation
                for (const pattern of this.securityRules.messageValidation.forbiddenPatterns) {
                    if (pattern.test(content)) {
                        validationResult.valid = false;
                        validationResult.violations.push('FORBIDDEN_CONTENT');
                        validationResult.severity = 'high';
                        break;
                    }
                }

                // XSS validation
                if (this.containsXSS(content)) {
                    validationResult.valid = false;
                    validationResult.violations.push('XSS_ATTEMPT');
                    validationResult.severity = 'critical';
                }
            }

            // Rate limiting validation
            if (!this.checkUserRateLimit(ws.userId, messageData.type)) {
                validationResult.valid = false;
                validationResult.violations.push('RATE_LIMIT_EXCEEDED');
                validationResult.severity = 'medium';
            }

            return validationResult;
        } catch (error) {
            console.error('Message validation error:', error);
            return {
                valid: false,
                violations: ['VALIDATION_ERROR'],
                severity: 'high'
            };
        }
    }

    containsXSS(content) {
        const xssPatterns = [
            /<script[^>]*>[\s\S]*?<\/script>/gi,
            /<iframe[^>]*>[\s\S]*?<\/iframe>/gi,
            /javascript:/gi,
            /vbscript:/gi,
            /onload\s*=/gi,
            /onerror\s*=/gi,
            /onclick\s*=/gi,
            /onmouseover\s*=/gi,
            /<img[^>]*src\s*=\s*['"]*javascript:/gi
        ];

        return xssPatterns.some(pattern => pattern.test(content));
    }

    checkUserRateLimit(userId, messageType) {
        const key = `${userId}:${messageType}`;
        const now = Date.now();
        const windowStart = now - 60000; // 1 minute window

        if (!this.userMessageCounts) {
            this.userMessageCounts = new Map();
        }

        if (!this.userMessageCounts.has(key)) {
            this.userMessageCounts.set(key, []);
        }

        const messages = this.userMessageCounts.get(key);
        
        // Remove old messages
        const recentMessages = messages.filter(timestamp => timestamp > windowStart);
        this.userMessageCounts.set(key, recentMessages);

        // Check if limit exceeded
        if (recentMessages.length >= this.securityRules.maxMessagesPerMinute) {
            return false;
        }

        // Add current message
        recentMessages.push(now);
        return true;
    }

    handleSecurityViolation(ws, violations, severity) {
        const userId = ws.userId;
        const userIP = this.getUserIP(ws);

        console.warn(`🚨 Security violation: ${userId} (${userIP}) - ${violations.join(', ')}`);

        // Record suspicious activity
        this.recordSuspiciousActivity(userId, userIP, violations, severity);

        // Take action based on severity
        switch (severity) {
            case 'critical':
                this.banUser(userId, userIP, '1h');
                this.terminateConnection(ws, 'CRITICAL_SECURITY_VIOLATION');
                break;
            case 'high':
                this.suspendUser(userId, '30m');
                this.wss.sendError(ws, 'Security violation detected', 'SECURITY_VIOLATION');
                break;
            case 'medium':
                this.warnUser(ws, violations);
                break;
            case 'low':
                // Just log for now
                break;
        }

        // Update threat intelligence
        this.updateThreatIntelligence(userId, userIP, violations);
    }

    recordSuspiciousActivity(userId, userIP, violations, severity) {
        const key = `${userId}:${userIP}`;
        
        if (!this.suspiciousActivity.has(key)) {
            this.suspiciousActivity.set(key, {
                count: 0,
                violations: [],
                firstSeen: Date.now(),
                lastSeen: Date.now()
            });
        }

        const activity = this.suspiciousActivity.get(key);
        activity.count++;
        activity.violations.push(...violations);
        activity.lastSeen = Date.now();
        activity.severity = this.escalateSeverity(activity.severity, severity);
    }

    escalateSeverity(currentSeverity, newSeverity) {
        const severityLevels = { low: 1, medium: 2, high: 3, critical: 4 };
        const current = severityLevels[currentSeverity] || 0;
        const new_ = severityLevels[newSeverity] || 0;
        
        const escalated = Math.max(current, new_);
        return Object.keys(severityLevels)[escalated - 1] || 'low';
    }

    banUser(userId, userIP, duration) {
        const banExpiry = this.parseDuration(duration);
        
        this.bannedIPs.add(userIP);
        
        // Store ban in Redis
        this.wss.redis.setex(`ban:user:${userId}`, banExpiry, JSON.stringify({
            userId,
            userIP,
            bannedAt: new Date().toISOString(),
            duration,
            reason: 'security_violation'
        }));

        this.wss.redis.setex(`ban:ip:${userIP}`, banExpiry, 'banned');

        console.log(`🔒 User banned: ${userId} (${userIP}) for ${duration}`);
    }

    suspendUser(userId, duration) {
        const suspensionExpiry = this.parseDuration(duration);
        
        this.wss.redis.setex(`suspend:user:${userId}`, suspensionExpiry, JSON.stringify({
            userId,
            suspendedAt: new Date().toISOString(),
            duration,
            reason: 'security_violation'
        }));

        console.log(`⏸️  User suspended: ${userId} for ${duration}`);
    }

    warnUser(ws, violations) {
        this.wss.sendToConnection(ws, {
            type: 'security:warning',
            data: {
                message: 'Security policy violation detected',
                violations: violations,
                timestamp: new Date().toISOString()
            }
        });
    }

    terminateConnection(ws, reason) {
        this.wss.sendToConnection(ws, {
            type: 'connection:terminated',
            data: {
                reason,
                timestamp: new Date().toISOString()
            }
        });

        setTimeout(() => {
            ws.terminate();
        }, 1000);
    }

    async isUserBanned(userId, userIP) {
        const userBan = await this.wss.redis.get(`ban:user:${userId}`);
        const ipBan = await this.wss.redis.get(`ban:ip:${userIP}`);
        
        return !!(userBan || ipBan);
    }

    async isUserSuspended(userId) {
        const suspension = await this.wss.redis.get(`suspend:user:${userId}`);
        return !!suspension;
    }

    parseDuration(duration) {
        const matches = duration.match(/^(\d+)([smhd])$/);
        if (!matches) return 3600; // Default 1 hour

        const value = parseInt(matches[1]);
        const unit = matches[2];

        switch (unit) {
            case 's': return value;
            case 'm': return value * 60;
            case 'h': return value * 3600;
            case 'd': return value * 86400;
            default: return 3600;
        }
    }

    getUserIP(ws) {
        return ws.upgradeReq?.connection?.remoteAddress || 
               ws._socket?.remoteAddress || 
               'unknown';
    }

    analyzeSuspiciousActivity() {
        for (const [key, activity] of this.suspiciousActivity.entries()) {
            if (activity.count >= this.securityRules.suspiciousActivityThreshold) {
                const [userId, userIP] = key.split(':');
                this.handleSuspiciousUser(userId, userIP, activity);
            }
        }
    }

    handleSuspiciousUser(userId, userIP, activity) {
        console.warn(`🕵️ Suspicious user detected: ${userId} (${userIP}) - ${activity.count} violations`);
        
        // Escalate based on activity pattern
        if (activity.count >= 10) {
            this.banUser(userId, userIP, '1d');
        } else if (activity.count >= 5) {
            this.suspendUser(userId, '1h');
        }
    }

    cleanupExpiredBans() {
        // Cleanup logic for expired bans and suspensions
        // This would typically be handled by Redis expiry
    }

    updateThreatIntelligence() {
        // Update threat intelligence based on observed patterns
        // This could involve machine learning or rule updates
    }

    handleRateLimitExceeded(ws) {
        this.handleSecurityViolation(ws, ['RATE_LIMIT_EXCEEDED'], 'medium');
    }

    // Middleware for validating connections
    securityMiddleware() {
        return async (ws, request) => {
            const userIP = this.getUserIP(ws);
            const userId = ws.userId;

            // Check if IP or user is banned
            if (await this.isUserBanned(userId, userIP)) {
                ws.close(1008, 'User banned');
                return;
            }

            // Check if user is suspended
            if (await this.isUserSuspended(userId)) {
                ws.close(1008, 'User suspended');
                return;
            }

            // Apply security optimizations
            this.wss.connectionPool.optimizeConnection(ws);
        };
    }

    getSecurityReport() {
        const report = {
            timestamp: new Date().toISOString(),
            bannedIPs: this.bannedIPs.size,
            suspiciousUsers: this.suspiciousActivity.size,
            totalViolations: Array.from(this.suspiciousActivity.values())
                .reduce((total, activity) => total + activity.count, 0),
            topViolations: this.getTopViolations(),
            securityRules: this.securityRules
        };

        return report;
    }

    getTopViolations() {
        const violationCounts = {};
        
        for (const activity of this.suspiciousActivity.values()) {
            for (const violation of activity.violations) {
                violationCounts[violation] = (violationCounts[violation] || 0) + 1;
            }
        }

        return Object.entries(violationCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10);
    }
}

module.exports = WebSocketSecurityManager;
```

This comprehensive WebSocket real-time communication system provides enterprise-grade real-time features for the 7P Education Platform, including live classrooms, collaborative editing, secure messaging, performance optimization, and robust security measures designed to handle thousands of concurrent users in educational environments.