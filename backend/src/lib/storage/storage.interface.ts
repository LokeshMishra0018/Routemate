import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { getEnv } from '../../config/env.js';

export interface StorageUploadResult {
  storageKey: string;
  size: number;
  mimeType: string;
}

export interface StorageProvider {
  uploadPrivateFile(buffer: Buffer, mimeType: string, originalFilename: string): Promise<StorageUploadResult>;
  getPrivateFileBuffer(storageKey: string): Promise<{ buffer: Buffer; mimeType: string } | null>;
  deletePrivateFile(storageKey: string): Promise<boolean>;
}

export class LocalStorageProvider implements StorageProvider {
  private baseDir: string;
  private metadataMap: Map<string, { mimeType: string }> = new Map();

  constructor() {
    const env = getEnv();
    this.baseDir = path.resolve(process.cwd(), env.STORAGE_LOCAL_DIR);
  }

  private async ensureDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.baseDir, { recursive: true });
    } catch {
      // ignore if exists
    }
  }

  async uploadPrivateFile(buffer: Buffer, mimeType: string, originalFilename: string): Promise<StorageUploadResult> {
    await this.ensureDirectory();
    const ext = path.extname(originalFilename) || '.bin';
    const storageKey = `doc_${crypto.randomUUID()}${ext}`;
    const filePath = path.join(this.baseDir, storageKey);

    await fs.writeFile(filePath, buffer);
    this.metadataMap.set(storageKey, { mimeType });

    return {
      storageKey,
      size: buffer.length,
      mimeType,
    };
  }

  async getPrivateFileBuffer(storageKey: string): Promise<{ buffer: Buffer; mimeType: string } | null> {
    const filePath = path.join(this.baseDir, storageKey);
    try {
      const buffer = await fs.readFile(filePath);
      const meta = this.metadataMap.get(storageKey);
      return {
        buffer,
        mimeType: meta?.mimeType || 'application/octet-stream',
      };
    } catch {
      return null;
    }
  }

  async deletePrivateFile(storageKey: string): Promise<boolean> {
    const filePath = path.join(this.baseDir, storageKey);
    try {
      await fs.unlink(filePath);
      this.metadataMap.delete(storageKey);
      return true;
    } catch {
      return false;
    }
  }
}

let storageProviderInstance: StorageProvider | null = null;

export function getStorageProvider(): StorageProvider {
  if (!storageProviderInstance) {
    storageProviderInstance = new LocalStorageProvider();
  }
  return storageProviderInstance;
}

export function setStorageProvider(provider: StorageProvider): void {
  storageProviderInstance = provider;
}
