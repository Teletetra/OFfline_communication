// frontend-web/src/components/chat/ChatSidebar.tsx
import React, { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { useAuthStore } from '../../store/authStore';
import './ChatSidebar.css';

interface ChatSidebarProps {
  conversations: any[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({
  conversations,
  activeConversationId,
  onSelectConversation,
}) => {
  const { user } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'unread' | 'online'>('all');

  const filteredConversations = useMemo(() => {
    return conversations.filter(conversation => {
      const otherUserId = conversation.participant1Id === user?.id
        ? conversation.participant2Id
        : conversation.participant1Id;
      
      const otherUser = conversation.participant1Id === user?.id
        ? conversation.participant2
        : conversation.participant1;

      const matchesSearch = otherUser?.username
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

      const matchesFilter = 
        filter === 'all' ||
        (filter === 'unread' && conversation.unreadCount > 0) ||
        (filter === 'online' && otherUser?.isOnline);

      return matchesSearch && matchesFilter;
    }).sort((a, b) => {
      const aTime = a.lastMessage?.createdAt || a.updatedAt;
      const bTime = b.lastMessage?.createdAt || b.updatedAt;
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    });
  }, [conversations, user, searchTerm, filter]);

  return (
    <div className="chat-sidebar">
      <div className="search-container">
        <i className="fas fa-search" />
        <input
          type="text"
          placeholder="Search conversations..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="filter-tabs">
        <button
          className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All
        </button>
        <button
          className={`filter-tab ${filter === 'unread' ? 'active' : ''}`}
          onClick={() => setFilter('unread')}
        >
          Unread
        </button>
        <button
          className={`filter-tab ${filter === 'online' ? 'active' : ''}`}
          onClick={() => setFilter('online')}
        >
          Online
        </button>
      </div>

      <div className="conversation-list">
        {filteredConversations.length === 0 ? (
          <div className="no-conversations">
            <i className="fas fa-comments" />
            <p>No conversations found</p>
          </div>
        ) : (
          filteredConversations.map(conversation => {
            const otherUser = conversation.participant1Id === user?.id
              ? conversation.participant2
              : conversation.participant1;
            
            const isActive = conversation.id === activeConversationId;
            
            return (
              <div
                key={conversation.id}
                className={`conversation-item ${isActive ? 'active' : ''}`}
                onClick={() => onSelectConversation(conversation.id)}
              >
                <div className="avatar-wrapper">
                  <img
                    src={otherUser?.avatarUrl || '/default-avatar.png'}
                    alt={otherUser?.username}
                    className="conversation-avatar"
                  />
                  {otherUser?.isOnline && (
                    <span className="online-indicator" />
                  )}
                </div>

                <div className="conversation-info">
                  <div className="conversation-header">
                    <span className="conversation-name">
                      {otherUser?.username || 'Unknown User'}
                    </span>
                    {conversation.lastMessage && (
                      <span className="conversation-time">
                        {format(
                          new Date(conversation.lastMessage.createdAt),
                          'HH:mm'
                        )}
                      </span>
                    )}
                  </div>

                  <div className="conversation-preview">
                    {conversation.lastMessage ? (
                      <>
                        <span className="last-message">
                          {conversation.lastMessage.senderId === user?.id && (
                            <i className="fas fa-check" />
                          )}
                          {conversation.lastMessage.type === 'image'
                            ? '📷 Image'
                            : conversation.lastMessage.type === 'voice'
                            ? '🎤 Voice message'
                            : conversation.lastMessage.content}
                        </span>
                        {conversation.unreadCount > 0 && (
                          <span className="unread-badge">
                            {conversation.unreadCount}
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="no-messages">No messages yet</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ChatSidebar;