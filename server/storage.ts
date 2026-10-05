import { mkdir, writeFile, readFile, unlink } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
export interface DocumentStorage { put(bytes: Buffer): Promise<string>; get(key: string): Promise<Buffer>; remove(key: string): Promise<void> }
const root = path.resolve(process.env.STORAGE_PATH || '.storage');
function safePath(key: string) { if (!/^[a-f0-9-]{36}$/.test(key)) throw new Error('Invalid document key'); return path.join(root, key); }
export const storage: DocumentStorage = {
  async put(bytes) { if (process.env.STORAGE_PROVIDER && process.env.STORAGE_PROVIDER !== 'local') throw new Error('Configure an object storage adapter before using this provider'); await mkdir(root, { recursive: true }); const key = randomUUID(); await writeFile(safePath(key), bytes, { mode: 0o600 }); return key; },
  get: key => readFile(safePath(key)),
  remove: key => unlink(safePath(key)),
};
