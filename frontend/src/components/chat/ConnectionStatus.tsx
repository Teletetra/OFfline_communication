// frontend/src/components/chat/ConnectionStatus.tsx
import React from 'react';
import './ConnectionStatus.css';

interface ConnectionStatusProps {
  status: 'connected' | 'disconnected' | 'error';
  bluetoothMode: boolean;
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ status, bluetoothMode }) => {
  const getStatusInfo = () => {
    if (bluetoothMode) {
      return {
        icon: 'fa-bluetooth-b',
        text: 'Bluetooth Mode',
        color: 'blue',
        description: 'Connected via Bluetooth mesh network',
      };
    }

    switch (status) {
      case 'connected':
        return {
          icon: 'fa-wifi',
          text: 'Online',
          color: 'green',
          description: 'Connected to server',
        };
      case 'error':
        return {
          icon: 'fa-exclamation-triangle',
          text: 'Connection Error',
          color: 'red',
          description: 'Attempting to reconnect...',
        };
      default:
        return {
          icon: 'fa-wifi-slash',
          text: 'Offline',
          color: 'gray',
          description: 'Not connected to server',
        };
    }
  };

  const info = getStatusInfo();

  return (
    <div className={`connection-status status-${info.color}`}>
      <div className="status-indicator">
        <i className={`fas ${info.icon}`} />
        <span className="status-dot" />
      </div>
      <div className="status-text">
        <span className="status-label">{info.text}</span>
        <span className="status-description">{info.description}</span>
      </div>
    </div>
  );
};

export default ConnectionStatus;