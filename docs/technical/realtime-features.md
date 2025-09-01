# Real-time Features Architecture - 7P Education Platform

## 📋 Özet

7P Education Platform'un real-time features mimarisi, modern web teknolojilerini kullanarak öğrenciler ve eğitmenler arasında anlık etkileşim imkanı sunar. Bu dokümantasyon, WebSocket connections, Server-Sent Events, real-time messaging, live notifications ve collaborative features'ın kapsamlı teknik analizini sunar.

## 🎯 Amaç ve Kapsam

Bu dokümantasyonun hedefleri:
- WebSocket ve SSE (Server-Sent Events) implementation strategies
- Real-time messaging system architecture
- Live notifications ve alert mechanisms
- Collaborative learning features design
- Real-time progress tracking implementation
- Live streaming ve webinar integration
- Performance optimization ve scalability considerations
- Connection management ve fallback strategies

## 🏗️ Mevcut Durum Analizi

### ⚠️ Geliştirilmesi Gereken Real-time Features
- **WebSocket Integration**: Bidirectional communication for live interactions
- **Server-Sent Events**: Unidirectional server-to-client messaging
- **Real-time Messaging**: Chat systems for course discussions
- **Live Notifications**: Instant alerts for important events
- **Progress Broadcasting**: Real-time course progress updates
- **Collaborative Tools**: Shared whiteboards, live polls
- **Live Streaming**: Webinar ve live course capabilities
- **Presence Indicators**: Online status ve activity tracking

### ✅ Foundation Elements Already Available
- **Next.js 15 Architecture**: Support for real-time features
- **Supabase Integration**: Real-time database capabilities
- **Authentication System**: User management for real-time sessions
- **Modern Frontend**: React 19 with concurrent features

## 🔧 Teknik Detaylar

### 🔄 Real-time Architecture Overview

#### Core Real-time Infrastructure
```typescript
// src/lib/realtime/config.ts
export interface RealtimeConfig {
  websocket: {
    url: string
    reconnectInterval: number
    maxReconnectAttempts: number
    heartbeatInterval: number
  }
  sse: {
    endpoint: string
    retryInterval: number
    maxRetries: number
  }
  channels: {
    [key: string]: ChannelConfig
  }
}

export interface ChannelConfig {
  maxUsers: number
  requireAuth: boolean
  allowedRoles: string[]
  features: string[]
  rateLimit: {
    messages: number
    interval: number
  }
}

export const realtimeConfig: RealtimeConfig = {
  websocket: {
    url: process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'ws://localhost:3001',
    reconnectInterval: 1000,
    maxReconnectAttempts: 5,
    heartbeatInterval: 30000
  },
  sse: {
    endpoint: '/api/realtime/events',
    retryInterval: 3000,
    maxRetries: 10
  },
  channels: {
    'course': {
      maxUsers: 1000,
      requireAuth: true,
      allowedRoles: ['student', 'instructor', 'admin'],
      features: ['chat', 'reactions', 'polls'],
      rateLimit: {
        messages: 10,
        interval: 60000 // 1 minute
      }
    },
    'lesson': {
      maxUsers: 500,
      requireAuth: true,
      allowedRoles: ['student', 'instructor'],
      features: ['chat', 'questions', 'notes_sharing'],
      rateLimit: {
        messages: 15,
        interval: 60000
      }
    },
    'notifications': {
      maxUsers: 1,
      requireAuth: true,
      allowedRoles: ['student', 'instructor', 'admin'],
      features: ['alerts', 'updates'],
      rateLimit: {
        messages: 100,
        interval: 60000
      }
    }
  }
}
```

### 🔌 WebSocket Implementation

#### WebSocket Connection Manager
```typescript
// src/lib/realtime/websocket-manager.ts
import { EventEmitter } from 'events'
import { realtimeConfig } from './config'
import { createAuditLog } from '../audit/logger'
import { validateUser } from '../auth/validation'

export interface WebSocketMessage {
  type: string
  channel: string
  data: any
  timestamp: number
  userId?: string
  messageId: string
}

export interface ConnectionOptions {
  userId: string
  token: string
  channels: string[]
  metadata?: Record<string, any>
}

export class WebSocketManager extends EventEmitter {
  private ws: WebSocket | null = null
  private isConnected = false
  private reconnectAttempts = 0
  private heartbeatInterval: NodeJS.Timeout | null = null
  private messageQueue: WebSocketMessage[] = []
  private subscribedChannels = new Set<string>()
  
  constructor(
    private options: ConnectionOptions
  ) {
    super()
    this.connect()
  }

  async connect(): Promise<void> {
    try {
      // Validate user authentication
      const isValid = await validateUser(this.options.token)
      if (!isValid) {
        throw new Error('Invalid authentication token')
      }

      const wsUrl = new URL(realtimeConfig.websocket.url)
      wsUrl.searchParams.set('token', this.options.token)
      wsUrl.searchParams.set('userId', this.options.userId)

      this.ws = new WebSocket(wsUrl.toString())

      this.ws.onopen = () => {
        this.isConnected = true
        this.reconnectAttempts = 0
        this.emit('connected')
        
        // Start heartbeat
        this.startHeartbeat()
        
        // Subscribe to channels
        this.options.channels.forEach(channel => {
          this.subscribe(channel)
        })

        // Process queued messages
        this.processMessageQueue()

        this.logEvent('WEBSOCKET_CONNECTED')
      }

      this.ws.onmessage = (event) => {
        this.handleMessage(JSON.parse(event.data))
      }

      this.ws.onclose = (event) => {
        this.isConnected = false
        this.stopHeartbeat()
        this.emit('disconnected', event.reason)
        
        this.logEvent('WEBSOCKET_DISCONNECTED', { 
          reason: event.reason, 
          code: event.code 
        })

        // Attempt reconnection
        if (this.reconnectAttempts < realtimeConfig.websocket.maxReconnectAttempts) {
          this.scheduleReconnect()
        } else {
          this.emit('reconnect_failed')
          this.logEvent('WEBSOCKET_RECONNECT_FAILED')
        }
      }

      this.ws.onerror = (error) => {
        this.emit('error', error)
        this.logEvent('WEBSOCKET_ERROR', { error: error.toString() })
      }

    } catch (error) {
      this.emit('error', error)
      this.logEvent('WEBSOCKET_CONNECTION_FAILED', { error: (error as Error).message })
    }
  }

  private scheduleReconnect(): void {
    this.reconnectAttempts++
    const delay = Math.min(
      realtimeConfig.websocket.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1),
      30000 // Max 30 seconds
    )

    setTimeout(() => {
      this.connect()
    }, delay)
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
        this.send({
          type: 'heartbeat',
          channel: 'system',
          data: { timestamp: Date.now() },
          timestamp: Date.now(),
          messageId: this.generateMessageId()
        })
      }
    }, realtimeConfig.websocket.heartbeatInterval)
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
  }

  subscribe(channel: string): void {
    if (this.subscribedChannels.has(channel)) {
      return
    }

    const message: WebSocketMessage = {
      type: 'subscribe',
      channel,
      data: { userId: this.options.userId },
      timestamp: Date.now(),
      messageId: this.generateMessageId()
    }

    if (this.isConnected) {
      this.send(message)
    } else {
      this.messageQueue.push(message)
    }

    this.subscribedChannels.add(channel)
  }

  unsubscribe(channel: string): void {
    if (!this.subscribedChannels.has(channel)) {
      return
    }

    const message: WebSocketMessage = {
      type: 'unsubscribe',
      channel,
      data: { userId: this.options.userId },
      timestamp: Date.now(),
      messageId: this.generateMessageId()
    }

    this.send(message)
    this.subscribedChannels.delete(channel)
  }

  sendMessage(channel: string, type: string, data: any): void {
    const message: WebSocketMessage = {
      type,
      channel,
      data,
      timestamp: Date.now(),
      userId: this.options.userId,
      messageId: this.generateMessageId()
    }

    if (this.isConnected) {
      this.send(message)
    } else {
      this.messageQueue.push(message)
    }
  }

  private send(message: WebSocketMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    } else {
      this.messageQueue.push(message)
    }
  }

  private handleMessage(message: WebSocketMessage): void {
    switch (message.type) {
      case 'message':
        this.emit('message', message)
        break
      
      case 'user_joined':
        this.emit('user_joined', message.data)
        break
      
      case 'user_left':
        this.emit('user_left', message.data)
        break
      
      case 'notification':
        this.emit('notification', message.data)
        break
      
      case 'error':
        this.emit('error', new Error(message.data.message))
        break
      
      case 'heartbeat_ack':
        // Heartbeat acknowledged
        break
      
      default:
        this.emit('unknown_message', message)
    }
  }

  private processMessageQueue(): void {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift()!
      this.send(message)
    }
  }

  private generateMessageId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  private async logEvent(action: string, details?: any): Promise<void> {
    try {
      await createAuditLog({
        action,
        userId: this.options.userId,
        details: {
          channels: Array.from(this.subscribedChannels),
          ...details
        },
        category: 'realtime'
      })
    } catch (error) {
      console.error('Failed to log realtime event:', error)
    }
  }

  disconnect(): void {
    this.stopHeartbeat()
    
    if (this.ws) {
      this.ws.close(1000, 'Client disconnecting')
      this.ws = null
    }
    
    this.isConnected = false
    this.subscribedChannels.clear()
    this.messageQueue = []
  }

  getConnectionStatus(): {
    connected: boolean
    channels: string[]
    reconnectAttempts: number
    queuedMessages: number
  } {
    return {
      connected: this.isConnected,
      channels: Array.from(this.subscribedChannels),
      reconnectAttempts: this.reconnectAttempts,
      queuedMessages: this.messageQueue.length
    }
  }
}
```

#### React WebSocket Hook
```typescript
// src/hooks/useWebSocket.ts
'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { WebSocketManager, WebSocketMessage, ConnectionOptions } from '@/lib/realtime/websocket-manager'
import { useAuth } from './useAuth'

export interface UseWebSocketOptions {
  channels: string[]
  autoConnect?: boolean
  onMessage?: (message: WebSocketMessage) => void
  onConnect?: () => void
  onDisconnect?: () => void
  onError?: (error: Error) => void
}

export interface WebSocketState {
  connected: boolean
  connecting: boolean
  error: Error | null
  reconnectAttempts: number
}

export function useWebSocket(options: UseWebSocketOptions) {
  const { user, getToken } = useAuth()
  const [state, setState] = useState<WebSocketState>({
    connected: false,
    connecting: false,
    error: null,
    reconnectAttempts: 0
  })
  
  const wsManager = useRef<WebSocketManager | null>(null)
  const messageHandlers = useRef<Map<string, (data: any) => void>>(new Map())

  const connect = useCallback(async () => {
    if (!user || wsManager.current) return

    try {
      setState(prev => ({ ...prev, connecting: true, error: null }))

      const token = await getToken()
      if (!token) throw new Error('No authentication token available')

      const connectionOptions: ConnectionOptions = {
        userId: user.id,
        token,
        channels: options.channels,
        metadata: {
          userRole: user.role,
          connectedAt: new Date().toISOString()
        }
      }

      wsManager.current = new WebSocketManager(connectionOptions)

      wsManager.current.on('connected', () => {
        setState(prev => ({ 
          ...prev, 
          connected: true, 
          connecting: false, 
          reconnectAttempts: 0 
        }))
        options.onConnect?.()
      })

      wsManager.current.on('disconnected', () => {
        setState(prev => ({ ...prev, connected: false, connecting: false }))
        options.onDisconnect?.()
      })

      wsManager.current.on('error', (error: Error) => {
        setState(prev => ({ 
          ...prev, 
          error, 
          connecting: false,
          connected: false 
        }))
        options.onError?.(error)
      })

      wsManager.current.on('message', (message: WebSocketMessage) => {
        options.onMessage?.(message)
        
        // Call specific message handlers
        const handler = messageHandlers.current.get(message.type)
        if (handler) {
          handler(message.data)
        }
      })

      wsManager.current.on('reconnect_failed', () => {
        setState(prev => ({ 
          ...prev, 
          error: new Error('Failed to reconnect after multiple attempts'),
          connecting: false,
          connected: false
        }))
      })

    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error as Error, 
        connecting: false 
      }))
    }
  }, [user, options, getToken])

  const disconnect = useCallback(() => {
    if (wsManager.current) {
      wsManager.current.disconnect()
      wsManager.current = null
    }
    setState({
      connected: false,
      connecting: false,
      error: null,
      reconnectAttempts: 0
    })
  }, [])

  const sendMessage = useCallback((channel: string, type: string, data: any) => {
    if (wsManager.current && state.connected) {
      wsManager.current.sendMessage(channel, type, data)
    }
  }, [state.connected])

  const subscribe = useCallback((channel: string) => {
    if (wsManager.current) {
      wsManager.current.subscribe(channel)
    }
  }, [])

  const unsubscribe = useCallback((channel: string) => {
    if (wsManager.current) {
      wsManager.current.unsubscribe(channel)
    }
  }, [])

  const onMessage = useCallback((type: string, handler: (data: any) => void) => {
    messageHandlers.current.set(type, handler)
    
    return () => {
      messageHandlers.current.delete(type)
    }
  }, [])

  // Auto-connect
  useEffect(() => {
    if (options.autoConnect !== false && user) {
      connect()
    }

    return () => {
      disconnect()
    }
  }, [user, connect, disconnect, options.autoConnect])

  return {
    ...state,
    connect,
    disconnect,
    sendMessage,
    subscribe,
    unsubscribe,
    onMessage
  }
}
```

### 📡 Server-Sent Events Implementation

#### SSE Event Stream Manager
```typescript
// src/lib/realtime/sse-manager.ts
export interface SSEEvent {
  id?: string
  event?: string
  data: any
  retry?: number
}

export class SSEManager {
  private eventSource: EventSource | null = null
  private listeners = new Map<string, Set<(data: any) => void>>()
  private reconnectAttempts = 0
  private maxReconnectAttempts = 10
  private reconnectDelay = 1000

  constructor(
    private endpoint: string,
    private options: {
      userId: string
      token: string
      channels?: string[]
    }
  ) {}

  connect(): void {
    try {
      const url = new URL(this.endpoint, window.location.origin)
      url.searchParams.set('token', this.options.token)
      url.searchParams.set('userId', this.options.userId)
      
      if (this.options.channels) {
        url.searchParams.set('channels', this.options.channels.join(','))
      }

      this.eventSource = new EventSource(url.toString())

      this.eventSource.onopen = () => {
        this.reconnectAttempts = 0
        this.emit('connected')
      }

      this.eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data)
        this.emit('message', data)
      }

      this.eventSource.onerror = () => {
        this.eventSource?.close()
        this.scheduleReconnect()
      }

      // Listen for specific event types
      this.eventSource.addEventListener('notification', (event) => {
        const data = JSON.parse(event.data)
        this.emit('notification', data)
      })

      this.eventSource.addEventListener('user_activity', (event) => {
        const data = JSON.parse(event.data)
        this.emit('user_activity', data)
      })

      this.eventSource.addEventListener('course_update', (event) => {
        const data = JSON.parse(event.data)
        this.emit('course_update', data)
      })

    } catch (error) {
      console.error('SSE connection failed:', error)
      this.scheduleReconnect()
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.emit('max_reconnects_exceeded')
      return
    }

    this.reconnectAttempts++
    const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), 30000)

    setTimeout(() => {
      this.connect()
    }, delay)
  }

  addEventListener(event: string, listener: (data: any) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(listener)
  }

  removeEventListener(event: string, listener: (data: any) => void): void {
    const eventListeners = this.listeners.get(event)
    if (eventListeners) {
      eventListeners.delete(listener)
    }
  }

  private emit(event: string, data?: any): void {
    const eventListeners = this.listeners.get(event)
    if (eventListeners) {
      eventListeners.forEach(listener => listener(data))
    }
  }

  disconnect(): void {
    if (this.eventSource) {
      this.eventSource.close()
      this.eventSource = null
    }
    this.listeners.clear()
  }
}

// React hook for SSE
export function useSSE(
  endpoint: string,
  options: {
    userId: string
    token: string
    channels?: string[]
    autoConnect?: boolean
  }
) {
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const sseManager = useRef<SSEManager | null>(null)

  useEffect(() => {
    if (options.autoConnect !== false) {
      sseManager.current = new SSEManager(endpoint, options)
      
      sseManager.current.addEventListener('connected', () => {
        setConnected(true)
        setError(null)
      })

      sseManager.current.addEventListener('error', (error) => {
        setError(error)
        setConnected(false)
      })

      sseManager.current.connect()
    }

    return () => {
      if (sseManager.current) {
        sseManager.current.disconnect()
      }
    }
  }, [endpoint, options])

  const addEventListener = useCallback((event: string, listener: (data: any) => void) => {
    if (sseManager.current) {
      sseManager.current.addEventListener(event, listener)
    }
  }, [])

  const removeEventListener = useCallback((event: string, listener: (data: any) => void) => {
    if (sseManager.current) {
      sseManager.current.removeEventListener(event, listener)
    }
  }, [])

  return {
    connected,
    error,
    addEventListener,
    removeEventListener
  }
}
```

### 💬 Real-time Messaging System

#### Chat System Implementation
```typescript
// src/components/realtime/ChatSystem.tsx
'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useWebSocket } from '@/hooks/useWebSocket'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { formatDistanceToNow } from 'date-fns'
import { tr } from 'date-fns/locale'

export interface Message {
  id: string
  userId: string
  userName: string
  userAvatar?: string
  content: string
  timestamp: number
  type: 'text' | 'system' | 'file' | 'reaction'
  edited?: boolean
  editedAt?: number
  replyTo?: string
  reactions?: Array<{
    emoji: string
    count: number
    users: string[]
  }>
}

interface ChatSystemProps {
  channelId: string
  channelName: string
  allowedFeatures?: string[]
  maxHeight?: string
}

export function ChatSystem({ 
  channelId, 
  channelName, 
  allowedFeatures = ['text', 'reactions'],
  maxHeight = '400px'
}: ChatSystemProps) {
  const { user } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set())
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set())
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout>()

  const { 
    connected, 
    sendMessage, 
    onMessage 
  } = useWebSocket({
    channels: [channelId],
    autoConnect: true,
    onConnect: () => {
      // Request recent messages
      sendMessage(channelId, 'request_history', { limit: 50 })
    }
  })

  // Message handlers
  useEffect(() => {
    const unsubscribeMessage = onMessage('chat_message', (data: Message) => {
      setMessages(prev => {
        // Avoid duplicates
        if (prev.some(msg => msg.id === data.id)) {
          return prev
        }
        return [...prev, data].sort((a, b) => a.timestamp - b.timestamp)
      })
      scrollToBottom()
    })

    const unsubscribeHistory = onMessage('chat_history', (data: { messages: Message[] }) => {
      setMessages(data.messages.sort((a, b) => a.timestamp - b.timestamp))
      scrollToBottom()
    })

    const unsubscribeTyping = onMessage('user_typing', (data: { userId: string, isTyping: boolean }) => {
      if (data.userId !== user?.id) {
        setTypingUsers(prev => {
          const newSet = new Set(prev)
          if (data.isTyping) {
            newSet.add(data.userId)
          } else {
            newSet.delete(data.userId)
          }
          return newSet
        })
      }
    })

    const unsubscribePresence = onMessage('user_presence', (data: { userId: string, online: boolean }) => {
      setOnlineUsers(prev => {
        const newSet = new Set(prev)
        if (data.online) {
          newSet.add(data.userId)
        } else {
          newSet.delete(data.userId)
        }
        return newSet
      })
    })

    const unsubscribeReaction = onMessage('message_reaction', (data: { 
      messageId: string, 
      emoji: string, 
      userId: string, 
      action: 'add' | 'remove' 
    }) => {
      setMessages(prev => prev.map(msg => {
        if (msg.id === data.messageId) {
          const reactions = msg.reactions || []
          const existingReaction = reactions.find(r => r.emoji === data.emoji)
          
          if (existingReaction) {
            if (data.action === 'add' && !existingReaction.users.includes(data.userId)) {
              existingReaction.users.push(data.userId)
              existingReaction.count++
            } else if (data.action === 'remove') {
              existingReaction.users = existingReaction.users.filter(u => u !== data.userId)
              existingReaction.count--
            }
          } else if (data.action === 'add') {
            reactions.push({
              emoji: data.emoji,
              count: 1,
              users: [data.userId]
            })
          }

          return {
            ...msg,
            reactions: reactions.filter(r => r.count > 0)
          }
        }
        return msg
      }))
    })

    return () => {
      unsubscribeMessage()
      unsubscribeHistory()
      unsubscribeTyping()
      unsubscribePresence()
      unsubscribeReaction()
    }
  }, [onMessage, user?.id])

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      if (scrollAreaRef.current) {
        const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]')
        if (scrollContainer) {
          scrollContainer.scrollTop = scrollContainer.scrollHeight
        }
      }
    }, 100)
  }, [])

  const handleSendMessage = useCallback(async () => {
    if (!newMessage.trim() || !connected || !user) return

    const messageId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const message: Message = {
      id: messageId,
      userId: user.id,
      userName: user.name || user.email,
      userAvatar: user.avatar_url,
      content: newMessage.trim(),
      timestamp: Date.now(),
      type: 'text'
    }

    // Optimistically add message
    setMessages(prev => [...prev, message])
    setNewMessage('')
    
    // Send to server
    sendMessage(channelId, 'chat_message', message)
    
    // Stop typing indicator
    handleTypingStop()
    
    scrollToBottom()
  }, [newMessage, connected, user, channelId, sendMessage])

  const handleTypingStart = useCallback(() => {
    if (!isTyping && connected && user) {
      setIsTyping(true)
      sendMessage(channelId, 'typing_start', { userId: user.id })
    }

    // Reset typing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    typingTimeoutRef.current = setTimeout(() => {
      handleTypingStop()
    }, 3000)
  }, [isTyping, connected, user, channelId, sendMessage])

  const handleTypingStop = useCallback(() => {
    if (isTyping && connected && user) {
      setIsTyping(false)
      sendMessage(channelId, 'typing_stop', { userId: user.id })
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
  }, [isTyping, connected, user, channelId, sendMessage])

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }, [handleSendMessage])

  const addReaction = useCallback((messageId: string, emoji: string) => {
    if (connected && user && allowedFeatures.includes('reactions')) {
      sendMessage(channelId, 'add_reaction', {
        messageId,
        emoji,
        userId: user.id
      })
    }
  }, [connected, user, channelId, sendMessage, allowedFeatures])

  const formatMessageTime = (timestamp: number) => {
    return formatDistanceToNow(new Date(timestamp), { 
      addSuffix: true, 
      locale: tr 
    })
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-500">
        Please login to join the chat
      </div>
    )
  }

  return (
    <div className="flex flex-col border rounded-lg bg-white">
      {/* Chat Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div>
          <h3 className="font-semibold">{channelName}</h3>
          <p className="text-sm text-gray-500">
            {onlineUsers.size} online
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-sm text-gray-500">
            {connected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea ref={scrollAreaRef} style={{ height: maxHeight }} className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <div key={message.id} className="flex items-start space-x-3">
              <Avatar className="w-8 h-8">
                <AvatarImage src={message.userAvatar} />
                <AvatarFallback>
                  {message.userName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-sm">{message.userName}</span>
                  <span className="text-xs text-gray-500">
                    {formatMessageTime(message.timestamp)}
                  </span>
                  {message.edited && (
                    <span className="text-xs text-gray-400">(edited)</span>
                  )}
                </div>
                
                <div className="mt-1">
                  <p className="text-sm break-words">{message.content}</p>
                  
                  {/* Reactions */}
                  {message.reactions && message.reactions.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {message.reactions.map((reaction) => (
                        <button
                          key={reaction.emoji}
                          onClick={() => addReaction(message.id, reaction.emoji)}
                          className="flex items-center space-x-1 px-2 py-1 text-xs bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
                        >
                          <span>{reaction.emoji}</span>
                          <span>{reaction.count}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          
          {/* Typing indicator */}
          {typingUsers.size > 0 && (
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <div className="flex space-x-1">
                <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" />
                <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
              </div>
              <span>
                {Array.from(typingUsers).slice(0, 3).join(', ')} 
                {typingUsers.size === 1 ? ' is typing...' : ' are typing...'}
              </span>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Message Input */}
      <div className="p-4 border-t">
        <div className="flex space-x-2">
          <Input
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value)
              if (e.target.value.length > 0) {
                handleTypingStart()
              } else {
                handleTypingStop()
              }
            }}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            disabled={!connected}
            className="flex-1"
          />
          <Button 
            onClick={handleSendMessage} 
            disabled={!connected || !newMessage.trim()}
          >
            Send
          </Button>
        </div>
      </div>
    </div>
  )
}
```

### 🔔 Real-time Notifications

#### Notification System
```typescript
// src/lib/realtime/notifications.ts
export interface Notification {
  id: string
  userId: string
  type: 'info' | 'success' | 'warning' | 'error' | 'course_update' | 'payment' | 'message'
  title: string
  message: string
  data?: any
  read: boolean
  createdAt: number
  expiresAt?: number
  actions?: Array<{
    label: string
    action: string
    style?: 'primary' | 'secondary' | 'danger'
  }>
}

export class NotificationManager {
  private notifications = new Map<string, Notification>()
  private listeners = new Set<(notification: Notification) => void>()
  private unreadCount = 0

  addNotification(notification: Notification): void {
    this.notifications.set(notification.id, notification)
    
    if (!notification.read) {
      this.unreadCount++
    }

    this.listeners.forEach(listener => listener(notification))

    // Auto-expire if specified
    if (notification.expiresAt) {
      setTimeout(() => {
        this.removeNotification(notification.id)
      }, notification.expiresAt - Date.now())
    }
  }

  markAsRead(notificationId: string): void {
    const notification = this.notifications.get(notificationId)
    if (notification && !notification.read) {
      notification.read = true
      this.unreadCount = Math.max(0, this.unreadCount - 1)
      this.listeners.forEach(listener => listener(notification))
    }
  }

  removeNotification(notificationId: string): void {
    const notification = this.notifications.get(notificationId)
    if (notification) {
      if (!notification.read) {
        this.unreadCount = Math.max(0, this.unreadCount - 1)
      }
      this.notifications.delete(notificationId)
    }
  }

  getNotifications(): Notification[] {
    return Array.from(this.notifications.values())
      .sort((a, b) => b.createdAt - a.createdAt)
  }

  getUnreadCount(): number {
    return this.unreadCount
  }

  subscribe(listener: (notification: Notification) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  clear(): void {
    this.notifications.clear()
    this.unreadCount = 0
  }
}

// React hook for notifications
export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const manager = useRef(new NotificationManager())

  useEffect(() => {
    const unsubscribe = manager.current.subscribe(() => {
      setNotifications(manager.current.getNotifications())
      setUnreadCount(manager.current.getUnreadCount())
    })

    return unsubscribe
  }, [])

  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'createdAt'>) => {
    const fullNotification: Notification = {
      ...notification,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: Date.now()
    }
    manager.current.addNotification(fullNotification)
  }, [])

  const markAsRead = useCallback((id: string) => {
    manager.current.markAsRead(id)
  }, [])

  const removeNotification = useCallback((id: string) => {
    manager.current.removeNotification(id)
  }, [])

  const clearAll = useCallback(() => {
    manager.current.clear()
    setNotifications([])
    setUnreadCount(0)
  }, [])

  return {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    removeNotification,
    clearAll
  }
}
```

## 💡 Öneriler ve Best Practices

### 🚀 Performance Optimization

#### Connection Pooling ve Resource Management
```typescript
// src/lib/realtime/connection-pool.ts
export class ConnectionPool {
  private static instance: ConnectionPool
  private connections = new Map<string, WebSocketManager>()
  private maxConnections = 10

  static getInstance(): ConnectionPool {
    if (!ConnectionPool.instance) {
      ConnectionPool.instance = new ConnectionPool()
    }
    return ConnectionPool.instance
  }

  getConnection(userId: string, channels: string[]): WebSocketManager {
    const key = `${userId}-${channels.sort().join(',')}`
    
    if (this.connections.has(key)) {
      return this.connections.get(key)!
    }

    if (this.connections.size >= this.maxConnections) {
      // Remove least recently used connection
      const oldestKey = this.connections.keys().next().value
      const oldestConnection = this.connections.get(oldestKey)!
      oldestConnection.disconnect()
      this.connections.delete(oldestKey)
    }

    // Create new connection would go here
    // Implementation depends on your specific requirements
    return null as any // Placeholder
  }
}
```

### 🔧 Error Handling ve Resilience
```typescript
// src/lib/realtime/resilience.ts
export class RealtimeResilience {
  static async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    let lastError: Error

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error as Error
        
        if (attempt === maxRetries) {
          throw lastError
        }

        await new Promise(resolve => setTimeout(resolve, delay * attempt))
      }
    }

    throw lastError!
  }

  static createCircuitBreaker(
    failureThreshold: number = 5,
    resetTimeout: number = 60000
  ) {
    let failures = 0
    let lastFailTime = 0
    let state: 'closed' | 'open' | 'half-open' = 'closed'

    return {
      async execute<T>(operation: () => Promise<T>): Promise<T> {
        if (state === 'open') {
          if (Date.now() - lastFailTime > resetTimeout) {
            state = 'half-open'
          } else {
            throw new Error('Circuit breaker is open')
          }
        }

        try {
          const result = await operation()
          
          if (state === 'half-open') {
            state = 'closed'
            failures = 0
          }
          
          return result
        } catch (error) {
          failures++
          lastFailTime = Date.now()
          
          if (failures >= failureThreshold) {
            state = 'open'
          }
          
          throw error
        }
      }
    }
  }
}
```

## 📊 Implementation Roadmap

### Phase 1: Core Real-time Infrastructure (3 weeks)
- [ ] WebSocket connection management implementation
- [ ] Server-Sent Events integration
- [ ] Basic messaging system deployment
- [ ] Real-time notifications framework

### Phase 2: Advanced Features (3 weeks)
- [ ] Collaborative tools implementation
- [ ] Live streaming integration
- [ ] Advanced presence indicators
- [ ] Performance optimization

### Phase 3: Scalability & Monitoring (2 weeks)
- [ ] Connection pooling optimization
- [ ] Real-time analytics integration
- [ ] Error handling enhancement
- [ ] Load testing ve optimization

## 🔗 İlgili Dosyalar

- [Frontend Architecture](frontend-architecture.md) - Real-time UI integration
- [Backend API Design](backend-api-design.md) - Real-time API endpoints
- [Database Schema](database-schema.md) - Real-time data structures
- [Performance Monitoring](../devops/performance-monitoring.md) - Real-time performance tracking
- [User Analytics](../analytics/user-analytics.md) - Real-time user behavior

## 📚 Kaynaklar

### 📖 Real-time Technologies
- [WebSocket API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API)
- [Server-Sent Events Guide](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)
- [Socket.IO Documentation](https://socket.io/docs/)

### 🛠️ Implementation Libraries
- [ws WebSocket Library](https://github.com/websockets/ws)
- [EventSource Polyfill](https://github.com/Yaffle/EventSource)
- [React Query](https://tanstack.com/query/latest) - For real-time data sync

### 🚀 Performance & Scaling
- [WebSocket Scaling Patterns](https://blog.pusher.com/websockets-from-scratch/)
- [Real-time Architecture Best Practices](https://socket.io/docs/v4/performance-tuning/)

---

*Son güncelleme: ${new Date().toLocaleDateString('tr-TR')}*
*Doküman versiyonu: 1.0.0*
*İnceleme durumu: ✅ Tamamlandı*