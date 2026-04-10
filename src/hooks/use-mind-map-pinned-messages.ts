'use client';

import { useCallback } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { useUser, useFirestore } from '@/firebase';
import { PinnedMessage, ChatMessage } from '@/types/chat';
import { useToast } from '@/hooks/use-toast';

interface UseMindMapPinnedMessagesOptions {
  mindMapId?: string;
  pinnedMessages: PinnedMessage[];
  onPinsUpdate?: (pins: PinnedMessage[]) => void;
}

export function useMindMapPinnedMessages({
  mindMapId,
  pinnedMessages = [],
  onPinsUpdate,
}: UseMindMapPinnedMessagesOptions) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const persistPins = useCallback(async (updatedPins: PinnedMessage[]) => {
    if (!user || !firestore || !mindMapId) return;

    try {
      const mapRef = doc(firestore, 'users', user.uid, 'mindmaps', mindMapId);
      await updateDoc(mapRef, {
        pinnedMessages: updatedPins,
      });
      
      if (onPinsUpdate) {
        onPinsUpdate(updatedPins);
      }
    } catch (error) {
      console.error('Failed to persist pinned messages:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to save',
        description: 'Could not save the pinned message. Please try again.',
      });
    }
  }, [user, firestore, mindMapId, onPinsUpdate, toast]);

  const addPinnedMessage = useCallback(async (
    questionMessage: ChatMessage,
    responseMessage?: ChatMessage,
    sessionId?: string
  ) => {
    if (!questionMessage || questionMessage.type !== 'text') return;

    const newPin: PinnedMessage = {
      id: `pin-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      sessionId: sessionId || '',
      createdAt: Date.now(),
      question: {
        messageId: questionMessage.id,
        role: 'user',
        content: questionMessage.content,
        timestamp: questionMessage.timestamp,
      },
    };

    if (responseMessage && responseMessage.type === 'text') {
      newPin.response = {
        messageId: responseMessage.id,
        role: 'ai',
        content: responseMessage.content,
        timestamp: responseMessage.timestamp,
      };
    }

    const updatedPins = [...pinnedMessages, newPin];
    await persistPins(updatedPins);
    
    toast({
      title: responseMessage ? 'Q&A pinned' : 'Question pinned',
      description: responseMessage 
        ? 'The conversation has been saved to your pins.' 
        : 'The question has been saved to your pins.',
    });

    return newPin;
  }, [pinnedMessages, persistPins, toast]);

  const addSoloPinnedMessage = useCallback(async (
    message: ChatMessage,
    sessionId?: string
  ) => {
    if (!message || message.type !== 'text') return;

    const newPin: PinnedMessage = {
      id: `pin-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      sessionId: sessionId || '',
      createdAt: Date.now(),
      soloMessage: {
        messageId: message.id,
        role: 'ai',
        content: message.content,
        timestamp: message.timestamp,
      },
    };

    const updatedPins = [...pinnedMessages, newPin];
    await persistPins(updatedPins);
    
    toast({
      title: 'Message pinned',
      description: 'This message has been saved to your pins.',
    });

    return newPin;
  }, [pinnedMessages, persistPins, toast]);

  const removePinnedMessage = useCallback(async (pinId: string) => {
    const updatedPins = pinnedMessages.filter(pin => pin.id !== pinId);
    await persistPins(updatedPins);
    
    toast({
      title: 'Removed from pins',
      description: 'The message has been removed from your pins.',
    });
  }, [pinnedMessages, persistPins, toast]);

  const getPinnedMessagesCount = useCallback(() => {
    return pinnedMessages.length;
  }, [pinnedMessages]);

  const searchPinnedMessages = useCallback((query: string): PinnedMessage[] => {
    if (!query.trim()) return pinnedMessages;
    
    const lowerQuery = query.toLowerCase();
    return pinnedMessages.filter(pin => {
      const questionMatch = pin.question.content.toLowerCase().includes(lowerQuery);
      const responseMatch = pin.response?.content.toLowerCase().includes(lowerQuery);
      const soloMatch = pin.soloMessage?.content.toLowerCase().includes(lowerQuery);
      return questionMatch || responseMatch || soloMatch;
    });
  }, [pinnedMessages]);

  return {
    pinnedMessages,
    addPinnedMessage,
    addSoloPinnedMessage,
    removePinnedMessage,
    getPinnedMessagesCount,
    searchPinnedMessages,
  };
}
