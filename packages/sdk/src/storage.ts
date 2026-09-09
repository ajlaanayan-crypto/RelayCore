import { EnvironmentFlags } from '@/types/flag';

export interface SnapshotStorage {
  save(key: string, data: EnvironmentFlags): Promise<void>;
  load(key: string): Promise<EnvironmentFlags | null>;
}

export class EncryptedSnapshotCache implements SnapshotStorage {
  private memoryFallback: Map<string, string> = new Map();
  private secretKey: string;

  constructor(secretKey: string = 'nexusflag_default_secret_key') {
    this.secretKey = secretKey;
  }

  private encrypt(payload: string): string {
    let result = '';
    for (let i = 0; i < payload.length; i++) {
      const charCode = payload.charCodeAt(i) ^ this.secretKey.charCodeAt(i % this.secretKey.length);
      result += String.fromCharCode(charCode);
    }
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(result, 'binary').toString('base64');
    } else if (typeof btoa !== 'undefined') {
      return btoa(result);
    }
    return payload;
  }

  private decrypt(encoded: string): string {
    let raw = '';
    if (typeof Buffer !== 'undefined') {
      raw = Buffer.from(encoded, 'base64').toString('binary');
    } else if (typeof atob !== 'undefined') {
      raw = atob(encoded);
    } else {
      raw = encoded;
    }

    let result = '';
    for (let i = 0; i < raw.length; i++) {
      const charCode = raw.charCodeAt(i) ^ this.secretKey.charCodeAt(i % this.secretKey.length);
      result += String.fromCharCode(charCode);
    }
    return result;
  }

  async save(key: string, data: EnvironmentFlags): Promise<void> {
    try {
      const json = JSON.stringify(data);
      const encrypted = this.encrypt(json);

      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(`nexusflag_snap_${key}`, encrypted);
      } else {
        this.memoryFallback.set(`nexusflag_snap_${key}`, encrypted);
      }
    } catch (e) {
      console.warn('Failed to save snapshot:', e);
    }
  }

  async load(key: string): Promise<EnvironmentFlags | null> {
    try {
      let rawCipher: string | null = null;
      if (typeof window !== 'undefined' && window.localStorage) {
        rawCipher = window.localStorage.getItem(`nexusflag_snap_${key}`);
      } else {
        rawCipher = this.memoryFallback.get(`nexusflag_snap_${key}`) || null;
      }

      if (!rawCipher) return null;
      const decrypted = this.decrypt(rawCipher);
      return JSON.parse(decrypted) as EnvironmentFlags;
    } catch (e) {
      console.warn('Snapshot corrupted:', e);
      return null;
    }
  }
}
