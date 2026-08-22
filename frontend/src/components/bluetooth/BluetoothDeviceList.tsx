// frontend/src/components/bluetooth/BluetoothDeviceList.tsx
import React, { useState, useEffect } from 'react';
import { bluetoothService } from '../../bluetooth/bluetoothService';
import './BluetoothDeviceList.css';

const BluetoothDeviceList: React.FC = () => {
  const [devices, setDevices] = useState<any[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleDeviceFound = (device: any) => {
      setDevices(prev => [...prev, device]);
    };

    const handleDeviceConnected = (device: any) => {
      setDevices(prev => 
        prev.map(d => d.id === device.id ? { ...d, connected: true } : d)
      );
    };

    const handleDeviceDisconnected = (device: any) => {
      setDevices(prev => 
        prev.map(d => d.id === device.id ? { ...d, connected: false } : d)
      );
    };

    bluetoothService.on('device-found', handleDeviceFound);
    bluetoothService.on('device-connected', handleDeviceConnected);
    bluetoothService.on('device-disconnected', handleDeviceDisconnected);

    return () => {
      bluetoothService.removeListener('device-found', handleDeviceFound);
      bluetoothService.removeListener('device-connected', handleDeviceConnected);
      bluetoothService.removeListener('device-disconnected', handleDeviceDisconnected);
    };
  }, []);

  const handleScan = async () => {
    setIsScanning(true);
    setError(null);
    
    try {
      await bluetoothService.scanForDevices();
    } catch (err) {
      setError('Failed to scan for Bluetooth devices');
      console.error(err);
    } finally {
      setIsScanning(false);
    }
  };

  const handleConnect = async (deviceId: string) => {
    try {
      await bluetoothService.connectToDevice(deviceId);
    } catch (err) {
      setError('Failed to connect to device');
      console.error(err);
    }
  };

  const handleDisconnect = async (deviceId: string) => {
    try {
      await bluetoothService.disconnectDevice(deviceId);
    } catch (err) {
      setError('Failed to disconnect from device');
      console.error(err);
    }
  };

  if (!bluetoothService.isBluetoothAvailable()) {
    return (
      <div className="bluetooth-devices">
        <div className="bluetooth-unavailable">
          <i className="fas fa-bluetooth-b" />
          <p>Bluetooth is not available on this device</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bluetooth-devices">
      <div className="bluetooth-header">
        <h3>Bluetooth Devices</h3>
        <button
          className="scan-button"
          onClick={handleScan}
          disabled={isScanning}
        >
          <i className={`fas fa-search ${isScanning ? 'fa-spin' : ''}`} />
          {isScanning ? 'Scanning...' : 'Scan'}
        </button>
      </div>

      {error && (
        <div className="error-message">
          <i className="fas fa-exclamation-circle" />
          <span>{error}</span>
        </div>
      )}

      <div className="device-list">
        {devices.length === 0 ? (
          <div className="no-devices">
            <p>No devices found</p>
            <span>Click scan to search for nearby devices</span>
          </div>
        ) : (
          devices.map(device => (
            <div key={device.id} className="device-item">
              <div className="device-info">
                <i className="fas fa-mobile-alt" />
                <div>
                  <span className="device-name">{device.name}</span>
                  <span className="device-status">
                    {device.connected ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
              </div>
              <button
                className={`connect-button ${device.connected ? 'connected' : ''}`}
                onClick={() => device.connected 
                  ? handleDisconnect(device.id) 
                  : handleConnect(device.id)
                }
              >
                {device.connected ? 'Disconnect' : 'Connect'}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default BluetoothDeviceList;