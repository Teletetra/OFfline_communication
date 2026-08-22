// frontend/src/pages/Chat.tsx
import React, { useEffect, useRef, useState } from 'react';
import { useChatStore } from '../store/chatStore';
import { useAuthStore } from '../store/authStore';
import { SocketService } from '../services/socketService';
import { bluetoothService } from '../bluetooth/bluetoothService';
import ChatSidebar from '../components/chat/ChatSidebar';
import ChatWindow from '../components/chat/ChatWindow';
import ChatHeader from '../components/chat/ChatHeader';
import MessageInput from '../components/chat/MessageInput';
import MessageList from '../components/chat/MessageList';
import OnlineUsersList from '../components/chat/OnlineUsersList';
import BluetoothDeviceList from '../components/bluetooth/BluetoothDeviceList';
import ConnectionStatus from '../components/chat/ConnectionStatus';
import './Chat.css';

const Chat: React.FC = () => {
  const { user } = useAuthStore();
  const {
    conversations,
    messages,
    activeConversationId,
    connectionStatus,
    bluetoothMode,
    loadConversations,
    loadMessages,
    sendMessage,
    setActiveConversation,
    markConversationAsRead,
  } = useChatStore();

  const [showBluetoothDevices, setShowBluetoothDevices] = useState(false);
  const [showOnlineUsers, setShowOnlineUsers] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (activeConversationId) {
      loadMessages(activeConversationId);
    }
  }, [activeConversationId, loadMessages]);

  const handleSendMessage = async (content: string) => {
    if (!activeConversationId || !content.trim()) return;

    const activeConversation = conversations.find(c => c.id === activeConversationId);
    if (!activeConversation) return;

    const receiverId = activeConversation.participant1Id === user?.id
      ? activeConversation.participant2Id
      : activeConversation.participant1Id;

    await sendMessage(receiverId, content);
  };

  const handleTyping = () => {
    if (!activeConversationId) return;

    const activeConversation = conversations.find(c => c.id === activeConversationId);
    if (!activeConversation) return;

    const receiverId = activeConversation.participant1Id === user?.id
      ? activeConversation.participant2Id
      : activeConversation.participant1Id;

    SocketService.sendTypingStart(receiverId);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      SocketService.sendTypingStop(receiverId);
    }, 1000);
  };

  return (
    <div className="chat-container">
      <div className="chat-layout">
        <aside className="chat-sidebar">
          <div className="sidebar-header">
            <h2>Chats</h2>
            <div className="sidebar-actions">
              <button
                className={`icon-button ${showOnlineUsers ? 'active' : ''}`}
                onClick={() => setShowOnlineUsers(!showOnlineUsers)}
                title="Online Users"
              >
                <i className="fas fa-users" />
              </button>
              <button
                className={`icon-button ${showBluetoothDevices ? 'active' : ''}`}
                onClick={() => setShowBluetoothDevices(!showBluetoothDevices)}
                title="Bluetooth Devices"
              >
                <i className="fas fa-bluetooth" />
              </button>
            </div>
          </div>

          <ConnectionStatus
            status={connectionStatus}
            bluetoothMode={bluetoothMode}
          />

          {showBluetoothDevices && <BluetoothDeviceList />}
          {showOnlineUsers && <OnlineUsersList />}
          
          {!showBluetoothDevices && !showOnlineUsers && (
            <ChatSidebar
              conversations={conversations}
              activeConversationId={activeConversationId}
              onSelectConversation={setActiveConversation}
            />
          )}
        </aside>

        <main className="chat-main">
          {activeConversationId ? (
            <>
              <ChatHeader
                conversation={conversations.find(c => c.id === activeConversationId)}
                connectionStatus={connectionStatus}
              />
              <MessageList
                messages={messages[activeConversationId] || []}
                currentUserId={user?.id || ''}
              />
              <MessageInput
                onSendMessage={handleSendMessage}
                onTyping={handleTyping}
                disabled={connectionStatus === 'disconnected' && !bluetoothMode}
              />
            </>
          ) : (
            <div className="no-conversation-selected">
              <div className="empty-state">
                <i className="fas fa-comments" />
                <h3>Select a conversation</h3>
                <p>Choose a chat from the sidebar or start a new conversation</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Chat;