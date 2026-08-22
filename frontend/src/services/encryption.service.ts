const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach((b) => { binary += String.fromCharCode(b); });
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

class EncryptionService {
  private key: CryptoKey | null = null;

  async initialize(secret?: string) {
    const material = secret || 'offline-chat-local-key';
    const digest = await crypto.subtle.digest('SHA-256', textEncoder.encode(material));
    this.key = await crypto.subtle.importKey('raw', digest, 'AES-GCM', false, ['encrypt', 'decrypt']);
  }

  async encryptMessage(message: string): Promise<string> {
    if (!this.key) await this.initialize();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, this.key!, textEncoder.encode(message));
    const payload = new Uint8Array(iv.length + encrypted.byteLength);
    payload.set(iv, 0);
    payload.set(new Uint8Array(encrypted), iv.length);
    return toBase64(payload);
  }

  async decryptMessage(payload: string): Promise<string> {
    if (!this.key) await this.initialize();
    const data = fromBase64(payload);
    const iv = data.slice(0, 12);
    const ciphertext = data.slice(12);
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, this.key!, ciphertext);
    return textDecoder.decode(decrypted);
  }
}

export const encryptionService = new EncryptionService();
