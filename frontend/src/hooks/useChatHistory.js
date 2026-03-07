import { useState, useEffect, useRef } from 'react';
import { listChats, getChat, saveChat, updateChat } from '../lib/chatHistory.js';

function deriveName(messages, objective) {
  if (objective?.name) return objective.name.slice(0, 50).trim();
  const firstUser = messages.find((m) => m.role === 'user');
  const text = typeof firstUser?.content === 'string' ? firstUser.content : '';
  if (!text) return 'Untitled chat';
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.slice(0, 50).replace(/\s\S*$/, '').trim() || 'Untitled chat';
}

function stripImages(msgs) {
  return msgs.map(({ images: _images, ...rest }) => rest);
}

/**
 * Manages chat persistence (currentChatId, chatHistory, sessionKey).
 * `messages`, `model`, and `chatFigmaLinks` live in App.jsx to avoid a
 * circular dependency with buildContext.
 *
 * @param {object} params
 * @param {Array}    params.messages        - Current message list (from App)
 * @param {() => object} params.buildContext - Returns full context snapshot
 * @param {(chat: object) => void} params.onRestoreChat  - Called to restore state from a saved chat
 * @param {() => void}             params.onNewChat      - Called to reset messages/model/chatFigmaLinks
 */
export function useChatHistory({ messages, buildContext, onRestoreChat, onNewChat }) {
  const [currentChatId, setCurrentChatId] = useState(null);
  const [chatHistory, setChatHistory] = useState(() => listChats());
  const [sessionKey, setSessionKey] = useState(0);

  // Ref so the auto-save effect always uses the latest buildContext
  const buildContextRef = useRef(buildContext);
  useEffect(() => { buildContextRef.current = buildContext; });

  // Auto-save after every completed AI response
  useEffect(() => {
    const last = messages[messages.length - 1];
    if (!last || last.role !== 'assistant' || messages.length < 2) return;

    const now = new Date().toISOString();
    const context = buildContextRef.current();

    if (!currentChatId) {
      const id = crypto.randomUUID();
      const name = deriveName(messages, context.activeObjective);
      setCurrentChatId(id);
      saveChat({ id, name, createdAt: now, updatedAt: now, starred: false, messages: stripImages(messages), context });
    } else {
      updateChat(currentChatId, { updatedAt: now, messages: stripImages(messages), context });
    }
    setChatHistory(listChats());
  }, [messages]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleNewChat() {
    if (messages.length > 0 && !currentChatId) {
      const now = new Date().toISOString();
      const id = crypto.randomUUID();
      const context = buildContextRef.current();
      const name = deriveName(messages, context.activeObjective);
      saveChat({ id, name, createdAt: now, updatedAt: now, starred: false, messages: stripImages(messages), context });
      setChatHistory(listChats());
    }
    onNewChat?.();
    setCurrentChatId(null);
    setSessionKey((k) => k + 1);
  }

  function handleRestoreChat(chatId) {
    const chat = getChat(chatId);
    if (!chat) return;
    onRestoreChat?.(chat);
    setCurrentChatId(chatId);
    setSessionKey((k) => k + 1);
  }

  function handleRenameChat(id, name) {
    updateChat(id, { name });
    setChatHistory(listChats());
  }

  function handleStarChat(id) {
    const chat = getChat(id);
    if (!chat) return;
    updateChat(id, { starred: !chat.starred });
    setChatHistory(listChats());
  }

  return {
    currentChatId, setCurrentChatId,
    chatHistory, setChatHistory,
    sessionKey,
    handleNewChat,
    handleRestoreChat,
    handleRenameChat,
    handleStarChat,
  };
}
