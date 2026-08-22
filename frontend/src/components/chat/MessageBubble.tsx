// frontend/src/components/chat/MessageBubble.tsx
import React, { useState } from 'react';
import { format } from 'date-fns';
import './MessageBubble.css';

interface MessageBubbleProps {
  message: any;
  isOwnMessage: boolean;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isOwnMessage }) => {
  const [showDetails, setShowDetails] = useState(false);

  const getMessageIcon = () => {
    switch (message.type) {
      case 'image':
        return <i className="fas fa-image" />;
      case 'file':
        return <i className="fas fa-file" />;
      case 'voice':
        return <i className="fas fa-microphone" />;
      case 'video':
        return <i className="fas fa-video" />;
      default:
        return null;
    }
  };

  const getStatusIcon = () => {
    if (!isOwnMessage) return null;
    
    switch (message.status) {
      case 'sent':
        return <i className="fas fa-check" />;
      case 'delivered':
        return <i className="fas fa-check-double" />;
      case 'read':
        return <i className="fas fa-check-double read" />;
      case 'failed':
        return <i className="fas fa-exclamation-circle" />;
      default:
        return null;
    }
  };

  const getTransmissionIcon = () => {
    if (message.transmissionMode === 'bluetooth') {
      return <i className="fas fa-bluetooth-b" />;
    }
    return null;
  };

  return (
    <div
      className={`message-bubble ${isOwnMessage ? 'own-message' : 'other-message'}`}
      onClick={() => setShowDetails(!showDetails)}
    >
      <div className="message-content">
        {message.type === 'image' && message.fileUrl ? (
          <img
            src={message.fileUrl}
            alt="Message attachment"
            className="message-image"
            loading="lazy"
          />
        ) : (
          <div className="message-text">
            {getMessageIcon()}
            <span>{message.content}</span>
          </div>
        )}
      </div>
      
      <div className="message-meta">
        <span className="message-time">
          {format(new Date(message.createdAt), 'HH:mm')}
        </span>
        {getTransmissionIcon()}
        {getStatusIcon()}
      </div>

      {showDetails && (
        <div className="message-details">
          <div>Sent: {format(new Date(message.createdAt), 'dd/MM/yyyy HH:mm:ss')}</div>
          {message.readAt && (
            <div>Read: {format(new Date(message.readAt), 'dd/MM/yyyy HH:mm:ss')}</div>
          )}
          <div>Encrypted: {message.isEncrypted ? 'Yes' : 'No'}</div>
          <div>Mode: {message.transmissionMode}</div>
        </div>
      )}
    </div>
  );
};

export default MessageBubble;