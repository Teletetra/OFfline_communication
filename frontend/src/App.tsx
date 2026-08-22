// frontend/src/App.tsx
import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { useChatStore } from './store/chatStore';
import { SocketService } from './services/socketService';
import { BluetoothService } from './bluetooth/bluetoothService';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Chat from './pages/Chat';
import Settings from './pages/Settings';
import Profile from './pages/Profile';

// Components
import ProtectedRoute from './components/ProtectedRoute';
import LoadingScreen from './components/LoadingScreen';
import ErrorBoundary from './components/ErrorBoundary';
import OfflineIndicator from './components/OfflineIndicator';

const App: React.FC = () => {
  const { user, isLoading, checkAuth } = useAuthStore();
  const { initializeSocket, disconnectSocket } = useChatStore();
  const { initializeBluetooth } = BluetoothService;

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (user) {
      initializeSocket(user.id);
      initializeBluetooth();
      
      return () => {
        disconnectSocket();
      };
    }
  }, [user, initializeSocket, disconnectSocket, initializeBluetooth]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <ErrorBoundary>
      <Router>
        <div className="app-container">
          <OfflineIndicator />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/chat"
              element={
                <ProtectedRoute>
                  <Chat />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route path="/" element={<Navigate to="/chat" />} />
          </Routes>
        </div>
      </Router>
    </ErrorBoundary>
  );
};

export default App;