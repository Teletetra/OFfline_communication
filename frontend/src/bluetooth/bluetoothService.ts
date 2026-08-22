// frontend/src/bluetooth/bluetoothService.ts
import { EventEmitter } from 'events';
import { useChatStore } from '../store/chatStore';
import { encryptionService } from '../services/encryptionService';

interface BluetoothDevice {
  id: string;
  name: string;
  device: any;
  connected: boolean;
}

class BluetoothService extends EventEmitter {
  private device: any = null;
  private server: any = null;
  private service: any = null;
  private characteristic: any = null;
  private connectedDevices: Map<string, BluetoothDevice> = new Map();
  private isScanning = false;
  private isInitialized = false;

  private SERVICE_UUID = '0000chat-0000-1000-8000-00805f9b34fb';
  private CHARACTERISTIC_UUID = '0000msg1-0000-1000-8000-00805f9b34fb';

  async initialize() {
    if (!('bluetooth' in navigator)) {
      console.warn('Web Bluetooth is not supported');
      return false;
    }

    try {
      // Request Bluetooth permissions
      const permission = await navigator.permissions.query({ name: 'bluetooth' as PermissionName });
      
      this.isInitialized = true;
      this.emit('initialized');
      return true;
    } catch (error) {
      console.error('Bluetooth initialization failed:', error);
      this.emit('error', error);
      return false;
    }
  }

  async startAdvertising() {
    if (!this.isInitialized) return;

    try {
      this.server = await this.device.gatt.connect();
      this.service = await this.server.getPrimaryService(this.SERVICE_UUID);
      this.characteristic = await this.service.getCharacteristic(this.CHARACTERISTIC_UUID);

      // Start advertising (Note: Web Bluetooth API doesn't support advertising)
      // This is a placeholder for native Bluetooth capabilities
      console.log('Bluetooth advertising started');
      this.emit('advertising-started');
    } catch (error) {
      console.error('Failed to start advertising:', error);
      this.emit('error', error);
    }
  }

  async scanForDevices(): Promise<BluetoothDevice[]> {
    if (!this.isInitialized || this.isScanning) return [];

    this.isScanning = true;
    this.emit('scan-started');

    try {
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [this.SERVICE_UUID] }],
        optionalServices: [this.SERVICE_UUID],
      });

      const bluetoothDevice: BluetoothDevice = {
        id: device.id,
        name: device.name || 'Unknown Device',
        device,
        connected: false,
      };

      this.connectedDevices.set(device.id, bluetoothDevice);
      this.isScanning = false;
      this.emit('device-found', bluetoothDevice);

      return [bluetoothDevice];
    } catch (error) {
      this.isScanning = false;
      if (error.name === 'NotFoundError') {
        console.log('No Bluetooth devices found');
      } else {
        console.error('Bluetooth scan error:', error);
      }
      this.emit('scan-finished', []);
      return [];
    }
  }

  async connectToDevice(deviceId: string) {
    const bluetoothDevice = this.connectedDevices.get(deviceId);
    if (!bluetoothDevice) throw new Error('Device not found');

    try {
      const server = await bluetoothDevice.device.gatt.connect();
      const service = await server.getPrimaryService(this.SERVICE_UUID);
      const characteristic = await service.getCharacteristic(this.CHARACTERISTIC_UUID);

      bluetoothDevice.connected = true;
      this.connectedDevices.set(deviceId, bluetoothDevice);
      
      this.emit('device-connected', bluetoothDevice);

      // Set up notification handler
      await characteristic.startNotifications();
      characteristic.addEventListener('characteristicvaluechanged', (event: any) => {
        this.handleIncomingMessage(event.target.value);
      });

      return bluetoothDevice;
    } catch (error) {
      console.error('Failed to connect to device:', error);
      this.emit('error', error);
      throw error;
    }
  }

  async sendMessageViaBluetooth(receiverId: string, message: string) {
    if (!this.characteristic) {
      throw new Error('Bluetooth not connected');
    }

    try {
      const encryptedMessage = await encryptionService.encryptMessage(message);
      const payload = {
        type: 'message',
        senderId: useChatStore.getState().currentUser?.id,
        receiverId,
        content: encryptedMessage,
        timestamp: Date.now(),
      };

      const encoder = new TextEncoder();
      const data = encoder.encode(JSON.stringify(payload));
      
      await this.characteristic.writeValue(data);
      
      this.emit('message-sent', payload);
      return true;
    } catch (error) {
      console.error('Failed to send message via Bluetooth:', error);
      this.emit('error', error);
      return false;
    }
  }

  private async handleIncomingMessage(value: DataView) {
    try {
      const decoder = new TextDecoder();
      const messageString = decoder.decode(value);
      const payload = JSON.parse(messageString);

      if (payload.type === 'message') {
        const decryptedContent = await encryptionService.decryptMessage(payload.content);
        
        useChatStore.getState().addOfflineMessage({
          id: `bt-${Date.now()}`,
          senderId: payload.senderId,
          receiverId: payload.receiverId,
          content: decryptedContent,
          createdAt: new Date(payload.timestamp),
          transmissionMode: 'bluetooth',
        });

        this.emit('message-received', {
          ...payload,
          content: decryptedContent,
        });
      }
    } catch (error) {
      console.error('Failed to process Bluetooth message:', error);
    }
  }

  async disconnectDevice(deviceId: string) {
    const bluetoothDevice = this.connectedDevices.get(deviceId);
    if (bluetoothDevice?.device.gatt.connected) {
      await bluetoothDevice.device.gatt.disconnect();
      bluetoothDevice.connected = false;
      this.connectedDevices.set(deviceId, bluetoothDevice);
      this.emit('device-disconnected', bluetoothDevice);
    }
  }

  async disconnectAll() {
    for (const [deviceId, device] of this.connectedDevices) {
      if (device.connected) {
        await this.disconnectDevice(deviceId);
      }
    }
  }

  getConnectedDevices(): BluetoothDevice[] {
    return Array.from(this.connectedDevices.values()).filter(d => d.connected);
  }

  isBluetoothAvailable(): boolean {
    return 'bluetooth' in navigator && this.isInitialized;
  }
}

export const bluetoothService = new BluetoothService();