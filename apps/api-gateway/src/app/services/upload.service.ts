import { Injectable, Logger, OnModuleInit, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import { v4 as uuidv4 } from 'uuid';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIMES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
];

interface UploadResult {
  url: string;
  path: string;
  size: number;
  contentType: string;
}

@Injectable()
export class UploadService implements OnModuleInit {
  private readonly logger = new Logger(UploadService.name);
  private bucket: any = null;
  private sharp: any = null;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    // Load sharp dynamically (native module)
    try {
      this.sharp = require('sharp');
    } catch (err) {
      this.logger.warn('Sharp not available — image optimization disabled');
    }

    const storageBucket = this.config.get<string>('FIREBASE_STORAGE_BUCKET');
    if (!storageBucket || storageBucket.includes('your-firebase')) {
      this.logger.warn('Firebase Storage not configured — uploads disabled');
      return;
    }

    try {
      // Firebase Admin should already be initialized by FirebasePushService
      if (!admin.apps.length) {
        const projectId = this.config.get<string>('FIREBASE_PROJECT_ID');
        const privateKey = this.config.get<string>('FIREBASE_PRIVATE_KEY');
        const clientEmail = this.config.get<string>('FIREBASE_CLIENT_EMAIL');

        admin.initializeApp({
          credential: admin.credential.cert({
            projectId,
            privateKey: privateKey?.replace(/\\n/g, '\n'),
            clientEmail,
          }),
          storageBucket,
        });
      }

      this.bucket = admin.storage().bucket(storageBucket);
      this.logger.log(`Firebase Storage connected: ${storageBucket}`);
    } catch (err) {
      this.logger.error('Firebase Storage init failed', err);
    }
  }

  /**
   * Upload an image file.
   * 1. Validates mime type and size
   * 2. Compresses and converts to WebP via Sharp
   * 3. Uploads to Firebase Storage with CDN cache headers
   * 4. Returns the public URL
   *
   * @param file - Multer file object
   * @param folder - Storage folder (e.g. 'events', 'theaters', 'users')
   */
  async uploadImage(
    file: Express.Multer.File,
    folder: string,
  ): Promise<UploadResult> {
    if (!this.bucket) {
      throw new BadRequestException('Servicio de almacenamiento no configurado');
    }

    // Validate
    if (!ALLOWED_MIMES.includes(file.mimetype)) {
      throw new BadRequestException(
        `Tipo de archivo no permitido. Permitidos: ${ALLOWED_MIMES.join(', ')}`,
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException('El archivo excede el limite de 10 MB');
    }

    // Optimize: compress + convert to WebP
    let buffer: Buffer;
    let contentType: string;

    if (this.sharp && file.mimetype !== 'image/gif') {
      buffer = await this.sharp(file.buffer)
        .webp({ quality: 80, effort: 4 })
        .resize({
          width: 1920,
          height: 1920,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .toBuffer();
      contentType = 'image/webp';
    } else {
      // GIFs stay as-is (sharp can handle but loses animation), or sharp unavailable
      buffer = file.buffer;
      contentType = file.mimetype;
    }

    // Generate unique path
    const ext = contentType === 'image/webp' ? 'webp' : file.mimetype.split('/')[1];
    const fileName = `${uuidv4()}.${ext}`;
    const filePath = `${folder}/${fileName}`;

    // Upload to Firebase Storage
    const fileRef = this.bucket.file(filePath);
    const token = uuidv4(); // public access token

    await fileRef.save(buffer, {
      metadata: {
        contentType,
        // CDN cache: cache for 1 year (immutable since filename is UUID)
        cacheControl: 'public, max-age=31536000, immutable',
        metadata: {
          firebaseStorageDownloadTokens: token,
        },
      },
    });

    // Build public URL
    const bucketName = this.bucket.name;
    const encodedPath = encodeURIComponent(filePath);
    const url = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodedPath}?alt=media&token=${token}`;

    this.logger.log(
      `Uploaded: ${filePath} (${(buffer.length / 1024).toFixed(1)} KB, ${contentType})`,
    );

    return {
      url,
      path: filePath,
      size: buffer.length,
      contentType,
    };
  }

  /**
   * Upload multiple images at once.
   */
  async uploadImages(
    files: Express.Multer.File[],
    folder: string,
  ): Promise<UploadResult[]> {
    return Promise.all(files.map((file) => this.uploadImage(file, folder)));
  }

  /**
   * Delete an image by its storage path.
   */
  async deleteImage(filePath: string): Promise<void> {
    if (!this.bucket) return;

    try {
      await this.bucket.file(filePath).delete();
      this.logger.log(`Deleted: ${filePath}`);
    } catch (err) {
      this.logger.warn(`Delete failed for ${filePath}`, err);
    }
  }
}
