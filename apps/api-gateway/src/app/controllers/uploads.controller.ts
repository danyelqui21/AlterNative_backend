import {
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@lagunapp-backend/auth';
import { UploadService } from '../services/upload.service';
import { memoryStorage } from 'multer';

const storage = memoryStorage();

@ApiTags('Uploads')
@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadService: UploadService) {}

  /**
   * Upload a single image.
   * Query param `folder` specifies the storage folder (events, theaters, users, etc.)
   *
   * POST /api/uploads/image?folder=events
   * Body: multipart/form-data with field "file"
   */
  @Post('image')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage,
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @Query('folder') folder: string,
  ) {
    if (!file) {
      throw new BadRequestException('No se envio ningun archivo');
    }

    const validFolders = [
      'events',
      'theaters',
      'restaurants',
      'tours',
      'users',
      'artists',
      'blog',
      'clans',
      'general',
    ];

    const targetFolder = validFolders.includes(folder) ? folder : 'general';

    return this.uploadService.uploadImage(file, targetFolder);
  }

  /**
   * Upload multiple images (max 10).
   *
   * POST /api/uploads/images?folder=events
   * Body: multipart/form-data with field "files"
   */
  @Post('images')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      storage,
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async uploadImages(
    @UploadedFiles() files: Express.Multer.File[],
    @Query('folder') folder: string,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No se enviaron archivos');
    }

    const validFolders = [
      'events',
      'theaters',
      'restaurants',
      'tours',
      'users',
      'artists',
      'blog',
      'clans',
      'general',
    ];

    const targetFolder = validFolders.includes(folder) ? folder : 'general';

    return this.uploadService.uploadImages(files, targetFolder);
  }
}
