import path from 'path';
import fs from 'fs/promises';
import sharp from 'sharp';
import { randomUUID } from 'crypto';
import { MultipartFile } from '@fastify/multipart';

// Ensure uploads directory exists
const UPLOADS_DIR = path.join(process.cwd(), 'uploads', 'receipts');
const PUBLIC_URL = '/uploads/receipts';

async function ensureUploadDir() {
  try {
    await fs.mkdir(UPLOADS_DIR, { recursive: true });
  } catch (error) {
    console.error('Failed to create uploads directory:', error);
  }
}

ensureUploadDir();

// Allowed file types
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Validate uploaded file
 */
export function validateUploadedFile(file: MultipartFile): { valid: boolean; error?: string } {
  // Check mime type
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return {
      valid: false,
      error: 'Invalid file type. Only JPEG, PNG, WEBP, and HEIC images are allowed.',
    };
  }

  return { valid: true };
}

/**
 * Save uploaded file from Fastify multipart
 */
export async function saveUploadedFile(file: MultipartFile): Promise<{
  filename: string;
  path: string;
  originalName: string;
  mimeType: string;
  size: number;
}> {
  await ensureUploadDir();

  const ext = path.extname(file.filename);
  const filename = `receipt-${randomUUID()}${ext}`;
  const filePath = path.join(UPLOADS_DIR, filename);

  // Convert buffer to file
  const buffer = await file.toBuffer();
  
  // Check size
  if (buffer.length > MAX_FILE_SIZE) {
    throw new Error('File size exceeds 10MB limit');
  }

  await fs.writeFile(filePath, buffer);

  return {
    filename,
    path: filePath,
    originalName: file.filename,
    mimeType: file.mimetype,
    size: buffer.length,
  };
}

/**
 * Process uploaded image - create optimized and thumbnail versions
 */
export async function processUploadedImage(filePath: string): Promise<{
  optimizedPath: string;
  thumbnailPath: string;
  optimizedSize: number;
  thumbnailSize: number;
}> {
  const dir = path.dirname(filePath);
  const ext = path.extname(filePath);
  const basename = path.basename(filePath, ext);

  const optimizedPath = path.join(dir, `${basename}-optimized.jpg`);
  const thumbnailPath = path.join(dir, `${basename}-thumb.jpg`);

  try {
    // Create optimized version (max width 2000px, 85% quality)
    await sharp(filePath)
      .resize(2000, null, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: 85 })
      .toFile(optimizedPath);

    // Create thumbnail (max width 300px, 80% quality)
    await sharp(filePath)
      .resize(300, null, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: 80 })
      .toFile(thumbnailPath);

    const optimizedStats = await fs.stat(optimizedPath);
    const thumbnailStats = await fs.stat(thumbnailPath);

    return {
      optimizedPath,
      thumbnailPath,
      optimizedSize: optimizedStats.size,
      thumbnailSize: thumbnailStats.size,
    };
  } catch (error) {
    console.error('Failed to process image:', error);
    throw new Error('Image processing failed');
  }
}

/**
 * Get public URL for uploaded file
 */
export function getPublicUrl(filename: string): string {
  return `${PUBLIC_URL}/${filename}`;
}

/**
 * Delete uploaded files (original + optimized + thumbnail)
 */
export async function deleteUploadedFiles(filePath: string): Promise<void> {
  const dir = path.dirname(filePath);
  const ext = path.extname(filePath);
  const basename = path.basename(filePath, ext);

  const files = [
    filePath,
    path.join(dir, `${basename}-optimized.jpg`),
    path.join(dir, `${basename}-thumb.jpg`),
  ];

  for (const file of files) {
    try {
      await fs.unlink(file);
    } catch (error: any) {
      // Ignore if file doesn't exist
      if (error.code !== 'ENOENT') {
        console.error(`Failed to delete file ${file}:`, error);
      }
    }
  }
}

/**
 * Check if file exists
 */
export async function validateFile(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}
