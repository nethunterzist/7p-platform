/**
 * React Hooks Testing for Messaging System
 * Tests all custom hooks in useMessaging.ts
 */

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  useConversations,
  useConversationSearch,
  useMessages,
  useTypingIndicators,
  useMessageSearch,
  useUnreadCount,
  useFileUpload,
  useMessagingError
} from '@/lib/useMessaging';
import * as messaging from '@/lib/messaging';
import * as messagingUtils from '@/lib/messaging-utils';
import { testConversationsWithMetadata, testMessagesWithStatus, testFiles } from '../fixtures/test-data';

// Mock the messaging functions
jest.mock('@/lib/messaging');
jest.mock('@/lib/messaging-utils');

const mockMessaging = messaging as jest.Mocked<typeof messaging>;
const mockMessagingUtils = messagingUtils as jest.Mocked<typeof messagingUtils>;

describe('useConversations Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should load conversations on mount', async () => {
    mockMessaging.getUserConversations.mockResolvedValue(testConversationsWithMetadata);

    const { result } = renderHook(() => useConversations());

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.conversations).toEqual(testConversationsWithMetadata);
    expect(result.current.error).toBeNull();
    expect(mockMessaging.getUserConversations).toHaveBeenCalledTimes(1);
  });

  test('should handle loading error', async () => {
    const errorMessage = 'Failed to load conversations';
    mockMessaging.getUserConversations.mockRejectedValue(new Error(errorMessage));
    mockMessagingUtils.handleMessagingError.mockReturnValue(errorMessage);

    const { result } = renderHook(() => useConversations());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe(errorMessage);
    expect(result.current.conversations).toEqual([]);
  });

  test('should refresh conversations manually', async () => {
    mockMessaging.getUserConversations.mockResolvedValue(testConversationsWithMetadata);

    const { result } = renderHook(() => useConversations());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.refresh();
    });

    expect(result.current.loading).toBe(true);
    expect(mockMessaging.getUserConversations).toHaveBeenCalledTimes(2);
  });

  test('should create new conversation', async () => {
    const newConversation = testConversationsWithMetadata[0];
    mockMessaging.createConversation.mockResolvedValue(newConversation);
    mockMessaging.getUserConversations.mockResolvedValue([...testConversationsWithMetadata, newConversation]);

    const { result } = renderHook(() => useConversations());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    let createdConversation: any;
    await act(async () => {
      createdConversation = await result.current.createConversation('instructor-id', 'New Conversation');
    });

    expect(createdConversation).toEqual(newConversation);
    expect(mockMessaging.createConversation).toHaveBeenCalledWith('instructor-id', 'New Conversation');
    expect(mockMessaging.getUserConversations).toHaveBeenCalledTimes(2); // Initial load + refresh after create
  });

  test('should archive conversation', async () => {
    mockMessaging.getUserConversations.mockResolvedValue(testConversationsWithMetadata);
    mockMessaging.updateConversationArchiveStatus.mockResolvedValue();

    const { result } = renderHook(() => useConversations());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.archiveConversation('conv-1', true);
    });

    expect(mockMessaging.updateConversationArchiveStatus).toHaveBeenCalledWith('conv-1', true);
    expect(mockMessaging.getUserConversations).toHaveBeenCalledTimes(2); // Initial load + refresh after archive
  });

  test('should mute conversation', async () => {
    mockMessaging.getUserConversations.mockResolvedValue(testConversationsWithMetadata);
    mockMessaging.updateConversationMuteStatus.mockResolvedValue();

    const { result } = renderHook(() => useConversations());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.muteConversation('conv-1', true);
    });

    expect(mockMessaging.updateConversationMuteStatus).toHaveBeenCalledWith('conv-1', true);
    expect(mockMessaging.getUserConversations).toHaveBeenCalledTimes(2);
  });

  test('should auto-refresh when enabled', async () => {
    mockMessaging.getUserConversations.mockResolvedValue(testConversationsWithMetadata);

    const { result } = renderHook(() =>
      useConversations({
        autoRefresh: true,
        refreshInterval: 100 // Short interval for testing
      })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Wait for auto-refresh
    await waitFor(() => {
      expect(mockMessaging.getUserConversations).toHaveBeenCalledTimes(2);
    }, { timeout: 200 });
  });

  test('should apply filters', async () => {
    const filters = { archived: false, has_unread: true };
    mockMessaging.getUserConversations.mockResolvedValue(testConversationsWithMetadata);

    renderHook(() => useConversations({ filters }));

    await waitFor(() => {
      expect(mockMessaging.getUserConversations).toHaveBeenCalledWith(filters);
    });
  });
});

describe('useConversationSearch Hook', () => {
  test('should filter conversations by search query', () => {
    const mockFilteredConversations = testConversationsWithMetadata.slice(0, 1);
    const mockGroupedConversations = { today: mockFilteredConversations };

    mockMessagingUtils.filterConversations.mockReturnValue(mockFilteredConversations);
    mockMessagingUtils.groupConversationsByDate.mockReturnValue(mockGroupedConversations);

    const { result } = renderHook(() => 
      useConversationSearch(testConversationsWithMetadata)
    );

    act(() => {
      result.current.setSearchQuery('math');
    });

    expect(result.current.searchQuery).toBe('math');
    expect(mockMessagingUtils.filterConversations).toHaveBeenCalledWith(testConversationsWithMetadata, 'math');
    expect(result.current.filteredConversations).toEqual(mockFilteredConversations);
    expect(result.current.groupedConversations).toEqual(mockGroupedConversations);
    expect(result.current.hasResults).toBe(true);
    expect(result.current.resultCount).toBe(1);
  });

  test('should show all conversations when search is empty', () => {
    mockMessagingUtils.groupConversationsByDate.mockReturnValue({ today: testConversationsWithMetadata });

    const { result } = renderHook(() => 
      useConversationSearch(testConversationsWithMetadata)
    );

    expect(result.current.filteredConversations).toEqual(testConversationsWithMetadata);
    expect(result.current.hasResults).toBe(true);
    expect(result.current.resultCount).toBe(testConversationsWithMetadata.length);
  });
});

describe('useMessages Hook', () => {
  const conversationId = 'conv-1';
  const options = { conversationId, autoMarkAsRead: true, enableRealTime: true };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should load messages on mount', async () => {
    mockMessaging.getConversationMessages.mockResolvedValue(testMessagesWithStatus);

    const { result } = renderHook(() => useMessages(options));

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.messages).toEqual(testMessagesWithStatus);
    expect(result.current.error).toBeNull();
    expect(mockMessaging.getConversationMessages).toHaveBeenCalledWith(conversationId, {
      limit: 50,
      offset: 0
    });
  });

  test('should auto-mark unread messages as read', async () => {
    const unreadMessages = testMessagesWithStatus.map(msg => ({ ...msg, is_read: false }));
    mockMessaging.getConversationMessages.mockResolvedValue(unreadMessages);
    mockMessaging.markMessageAsRead.mockResolvedValue();

    const { result } = renderHook(() => useMessages(options));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Should mark all messages as read
    expect(mockMessaging.markMessageAsRead).toHaveBeenCalledTimes(unreadMessages.length);
    unreadMessages.forEach(msg => {
      expect(mockMessaging.markMessageAsRead).toHaveBeenCalledWith(msg.id);
    });
  });

  test('should send message with file attachment', async () => {
    const newMessage = testMessagesWithStatus[0];
    mockMessaging.getConversationMessages.mockResolvedValue(testMessagesWithStatus);
    mockMessaging.sendMessage.mockResolvedValue(newMessage);
    mockMessaging.uploadMessageAttachment.mockResolvedValue({} as any);

    const { result } = renderHook(() => useMessages(options));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const messageOptions = { content: 'Test message with file' };
    const file = testFiles.text;

    await act(async () => {
      await result.current.sendMessage(messageOptions, file);
    });

    expect(mockMessaging.sendMessage).toHaveBeenCalledWith(conversationId, messageOptions);
    expect(mockMessaging.uploadMessageAttachment).toHaveBeenCalledWith(newMessage.id, file);
  });

  test('should load more messages with pagination', async () => {
    const firstBatch = testMessagesWithStatus.slice(0, 2);
    const secondBatch = testMessagesWithStatus.slice(2, 4);

    mockMessaging.getConversationMessages
      .mockResolvedValueOnce(firstBatch)
      .mockResolvedValueOnce(secondBatch);

    const { result } = renderHook(() => useMessages({ ...options, initialLimit: 2 }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.messages).toEqual(firstBatch);
    expect(result.current.hasMore).toBe(true);

    await act(async () => {
      await result.current.loadMore();
    });

    expect(result.current.messages).toEqual([...firstBatch, ...secondBatch]);
    expect(mockMessaging.getConversationMessages).toHaveBeenCalledTimes(2);
  });

  test('should edit message', async () => {
    mockMessaging.getConversationMessages.mockResolvedValue(testMessagesWithStatus);
    mockMessaging.editMessage.mockResolvedValue({} as any);

    const { result } = renderHook(() => useMessages(options));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.editMessage('msg-1', 'Edited content');
    });

    expect(mockMessaging.editMessage).toHaveBeenCalledWith('msg-1', 'Edited content');
  });

  test('should delete message', async () => {
    mockMessaging.getConversationMessages.mockResolvedValue(testMessagesWithStatus);
    mockMessaging.deleteMessage.mockResolvedValue();

    const { result } = renderHook(() => useMessages(options));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.deleteMessage('msg-1');
    });

    expect(mockMessaging.deleteMessage).toHaveBeenCalledWith('msg-1');
  });

  test('should mark all messages as read', async () => {
    mockMessaging.getConversationMessages.mockResolvedValue(testMessagesWithStatus);
    mockMessaging.markConversationAsRead.mockResolvedValue(5);

    const { result } = renderHook(() => useMessages(options));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.markAllAsRead();
    });

    expect(mockMessaging.markConversationAsRead).toHaveBeenCalledWith(conversationId);
  });

  test('should handle real-time message updates', async () => {
    mockMessaging.getConversationMessages.mockResolvedValue(testMessagesWithStatus);
    mockMessaging.subscribeToUserMessages.mockImplementation((callback) => {
      // Simulate real-time message
      setTimeout(() => {
        callback({
          id: 'new-msg',
          conversation_id: conversationId,
          sender_id: 'user-1',
          content: 'New real-time message',
          message_type: 'text',
          created_at: new Date().toISOString()
        } as any);
      }, 100);

      return jest.fn(); // Unsubscribe function
    });

    const { result } = renderHook(() => useMessages(options));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockMessaging.subscribeToUserMessages).toHaveBeenCalled();

    // Wait for real-time update to trigger refresh
    await waitFor(() => {
      expect(mockMessaging.getConversationMessages).toHaveBeenCalledTimes(2);
    });
  });
});

describe('useTypingIndicators Hook', () => {
  const conversationId = 'conv-1';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should start and stop typing indicators', async () => {
    mockMessagingUtils.updateTypingIndicator.mockResolvedValue();

    const { result } = renderHook(() => useTypingIndicators(conversationId));

    await act(async () => {
      await result.current.startTyping();
    });

    expect(mockMessagingUtils.updateTypingIndicator).toHaveBeenCalledWith(conversationId, true);

    await act(async () => {
      await result.current.stopTyping();
    });

    expect(mockMessagingUtils.updateTypingIndicator).toHaveBeenCalledWith(conversationId, false);
  });

  test('should auto-stop typing after timeout', async () => {
    jest.useFakeTimers();
    mockMessagingUtils.updateTypingIndicator.mockResolvedValue();

    const { result } = renderHook(() => useTypingIndicators(conversationId));

    await act(async () => {
      await result.current.startTyping();
    });

    expect(mockMessagingUtils.updateTypingIndicator).toHaveBeenCalledWith(conversationId, true);

    // Fast-forward time
    act(() => {
      jest.advanceTimersByTime(3000);
    });

    await waitFor(() => {
      expect(mockMessagingUtils.updateTypingIndicator).toHaveBeenCalledWith(conversationId, false);
    });

    jest.useRealTimers();
  });

  test('should subscribe to typing indicators from other users', async () => {
    const mockTypingData = {
      user_id: 'other-user',
      full_name: 'Other User',
      is_typing: true,
      last_typed_at: new Date().toISOString()
    };

    mockMessagingUtils.subscribeToTypingIndicators.mockImplementation((_, callback) => {
      setTimeout(() => callback(mockTypingData), 100);
      return jest.fn();
    });

    const { result } = renderHook(() => useTypingIndicators(conversationId));

    await waitFor(() => {
      expect(result.current.typingUsers).toHaveLength(1);
    });

    expect(result.current.typingUsers[0]).toEqual({
      userId: 'other-user',
      fullName: 'Other User',
      isTyping: true
    });
    expect(result.current.typingText).toBe('Other User yazıyor...');
    expect(result.current.isAnyoneTyping).toBe(true);
  });

  test('should handle multiple users typing', async () => {
    const mockTypingData1 = {
      user_id: 'user-1',
      full_name: 'User One',
      is_typing: true,
      last_typed_at: new Date().toISOString()
    };

    const mockTypingData2 = {
      user_id: 'user-2',
      full_name: 'User Two',
      is_typing: true,
      last_typed_at: new Date().toISOString()
    };

    mockMessagingUtils.subscribeToTypingIndicators.mockImplementation((_, callback) => {
      setTimeout(() => {
        callback(mockTypingData1);
        callback(mockTypingData2);
      }, 100);
      return jest.fn();
    });

    const { result } = renderHook(() => useTypingIndicators(conversationId));

    await waitFor(() => {
      expect(result.current.typingUsers).toHaveLength(2);
    });

    expect(result.current.typingText).toBe('2 kişi yazıyor...');
    expect(result.current.isAnyoneTyping).toBe(true);
  });
});

describe('useMessageSearch Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should search messages with debouncing', async () => {
    jest.useFakeTimers();
    mockMessaging.searchMessages.mockResolvedValue(testMessagesWithStatus);

    const { result } = renderHook(() => useMessageSearch());

    act(() => {
      result.current.setQuery('test query');
    });

    expect(result.current.query).toBe('test query');
    expect(mockMessaging.searchMessages).not.toHaveBeenCalled();

    // Fast-forward debounce time
    act(() => {
      jest.advanceTimersByTime(500);
    });

    await waitFor(() => {
      expect(mockMessaging.searchMessages).toHaveBeenCalledWith('test query');
    });

    expect(result.current.results).toEqual(testMessagesWithStatus);
    expect(result.current.hasResults).toBe(true);

    jest.useRealTimers();
  });

  test('should clear search results', () => {
    const { result } = renderHook(() => useMessageSearch());

    act(() => {
      result.current.setQuery('test');
    });

    act(() => {
      result.current.clearSearch();
    });

    expect(result.current.query).toBe('');
    expect(result.current.results).toEqual([]);
    expect(result.current.hasResults).toBe(false);
  });

  test('should handle search errors', async () => {
    jest.useFakeTimers();
    const errorMessage = 'Search failed';
    mockMessaging.searchMessages.mockRejectedValue(new Error(errorMessage));
    mockMessagingUtils.handleMessagingError.mockReturnValue(errorMessage);

    const { result } = renderHook(() => useMessageSearch());

    act(() => {
      result.current.setQuery('test query');
    });

    act(() => {
      jest.advanceTimersByTime(500);
    });

    await waitFor(() => {
      expect(result.current.error).toBe(errorMessage);
    });

    jest.useRealTimers();
  });
});

describe('useUnreadCount Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should load unread count on mount', async () => {
    mockMessaging.getTotalUnreadCount.mockResolvedValue(5);

    const { result } = renderHook(() => useUnreadCount());

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.unreadCount).toBe(5);
    expect(result.current.error).toBeNull();
  });

  test('should refresh unread count', async () => {
    mockMessaging.getTotalUnreadCount.mockResolvedValue(3);

    const { result } = renderHook(() => useUnreadCount());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.refresh();
    });

    expect(mockMessaging.getTotalUnreadCount).toHaveBeenCalledTimes(2);
  });

  test('should update on real-time message updates', async () => {
    mockMessaging.getTotalUnreadCount.mockResolvedValue(5);
    mockMessaging.subscribeToUserMessages.mockImplementation((callback) => {
      setTimeout(() => callback({} as any), 100);
      return jest.fn();
    });

    const { result } = renderHook(() => useUnreadCount());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Wait for real-time update to trigger refresh
    await waitFor(() => {
      expect(mockMessaging.getTotalUnreadCount).toHaveBeenCalledTimes(2);
    });
  });
});

describe('useFileUpload Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should upload file successfully', async () => {
    const mockAttachment = { id: 'att-1', filename: 'test.txt' };
    mockMessaging.uploadMessageAttachment.mockResolvedValue(mockAttachment as any);

    const { result } = renderHook(() => useFileUpload());

    let uploadResult: any;
    await act(async () => {
      uploadResult = await result.current.uploadFile('msg-1', testFiles.text);
    });

    expect(uploadResult).toEqual(mockAttachment);
    expect(result.current.uploading).toBe(false);
    expect(result.current.progress).toBe(100);
    expect(result.current.error).toBeNull();
  });

  test('should handle upload errors', async () => {
    const errorMessage = 'Upload failed';
    mockMessaging.uploadMessageAttachment.mockRejectedValue(new Error(errorMessage));
    mockMessagingUtils.handleMessagingError.mockReturnValue(errorMessage);

    const { result } = renderHook(() => useFileUpload());

    await act(async () => {
      try {
        await result.current.uploadFile('msg-1', testFiles.text);
      } catch (error) {
        // Expected to throw
      }
    });

    expect(result.current.uploading).toBe(false);
    expect(result.current.progress).toBe(0);
    expect(result.current.error).toBe(errorMessage);
  });

  test('should reset upload state', () => {
    const { result } = renderHook(() => useFileUpload());

    act(() => {
      result.current.resetUploadState();
    });

    expect(result.current.uploading).toBe(false);
    expect(result.current.progress).toBe(0);
    expect(result.current.error).toBeNull();
  });
});

describe('useMessagingError Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should handle and auto-clear errors', async () => {
    jest.useFakeTimers();
    const errorMessage = 'Test error';
    mockMessagingUtils.handleMessagingError.mockReturnValue(errorMessage);

    const { result } = renderHook(() => useMessagingError());

    act(() => {
      result.current.handleError(new Error('Original error'), 'test context');
    });

    expect(result.current.error).toBe(errorMessage);
    expect(result.current.hasError).toBe(true);

    // Fast-forward auto-clear time
    act(() => {
      jest.advanceTimersByTime(5000);
    });

    await waitFor(() => {
      expect(result.current.error).toBeNull();
    });

    expect(result.current.hasError).toBe(false);

    jest.useRealTimers();
  });

  test('should clear error manually', () => {
    const errorMessage = 'Test error';
    mockMessagingUtils.handleMessagingError.mockReturnValue(errorMessage);

    const { result } = renderHook(() => useMessagingError());

    act(() => {
      result.current.handleError(new Error('Original error'), 'test context');
    });

    expect(result.current.error).toBe(errorMessage);

    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBeNull();
    expect(result.current.hasError).toBe(false);
  });
});