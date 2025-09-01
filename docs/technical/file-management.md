# File Management System - 7P Education Platform

## 📋 Özet

7P Education Platform'un file management sistemi, eğitim içeriklerinin güvenli ve verimli şekilde yönetilmesi için tasarlanmış kapsamlı bir altyapıdır. Bu dokümantasyon, upload/download workflows, security implementations, CDN integration ve media processing strategies'in detaylı analizini sunar.

## 🎯 Amaç ve Kapsam

Bu dokümantasyonun kapsamı:
- Secure file upload ve download mechanisms
- Multi-format media processing ve optimization
- CDN integration ve global content distribution
- File versioning ve backup strategies
- Access control ve permission management
- Storage optimization ve lifecycle management
- Security scanning ve malware detection
- Performance monitoring ve analytics

## 🏗️ Mevcut Durum Analizi

### ✅ Mevcut File Management Özellikleri
- **Basic Upload Support**: Form-based file upload capability
- **Static File Serving**: Next.js static file handling
- **User Avatar Management**: Profile picture upload/display
- **Course Media Support**: Video ve document uploads
- **File Type Validation**: Basic MIME type checking

### ⚠️ Geliştirilmesi Gereken Alanlar
- Advanced security scanning ve malware detection
- Automated media processing ve optimization
- Progressive file upload with resumability
- Advanced access control mechanisms
- File versioning ve audit trails
- Automated backup ve disaster recovery
- Advanced analytics ve usage tracking

## 🔧 Teknik Detaylar

### 📁 File Management Architecture

#### Core File Service Configuration
```typescript
// src/lib/files/config.ts
export interface FileConfig {
  storage: {
    provider: 'supabase' | 's3' | 'cloudinary' | 'local'
    bucket: string
    region?: string
    endpoint?: string
  }
  upload: {
    maxFileSize: number
    allowedTypes: string[]
    chunkSize: number
    enableResumable: boolean
  }
  processing: {
    enableImageOptimization: boolean
    enableVideoTranscoding: boolean
    enableThumbnailGeneration: boolean
    imageFormats: string[]
    videoFormats: string[]
  }
  security: {
    enableVirusScanning: boolean
    enableContentValidation: boolean
    quarantineDuration: number
    allowedOrigins: string[]
  }
  cdn: {
    provider: 'cloudflare' | 'aws' | 'vercel'
    domain: string
    enableGeoLocation: boolean
    cacheTTL: number
  }
}

export const fileConfig: FileConfig = {
  storage: {
    provider: 'supabase',
    bucket: process.env.SUPABASE_STORAGE_BUCKET || '7p-education-files',
    region: 'eu-west-1'
  },
  upload: {
    maxFileSize: 100 * 1024 * 1024, // 100MB
    allowedTypes: [
      'image/jpeg', 'image/png', 'image/webp', 'image/gif',
      'video/mp4', 'video/webm', 'video/mov',
      'audio/mp3', 'audio/wav', 'audio/aac',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain', 'text/markdown'
    ],
    chunkSize: 8 * 1024 * 1024, // 8MB chunks
    enableResumable: true
  },
  processing: {
    enableImageOptimization: true,
    enableVideoTranscoding: true,
    enableThumbnailGeneration: true,
    imageFormats: ['webp', 'avif', 'jpeg'],
    videoFormats: ['mp4', 'webm']
  },
  security: {
    enableVirusScanning: process.env.NODE_ENV === 'production',
    enableContentValidation: true,
    quarantineDuration: 24 * 60 * 60 * 1000, // 24 hours
    allowedOrigins: [
      process.env.NEXT_PUBLIC_APP_URL!,
      'http://localhost:3000'
    ]
  },
  cdn: {
    provider: 'vercel',
    domain: process.env.NEXT_PUBLIC_CDN_DOMAIN || '',
    enableGeoLocation: true,
    cacheTTL: 31536000 // 1 year
  }
}

// File type definitions
export interface FileMetadata {
  id: string
  filename: string
  originalName: string
  mimeType: string
  size: number
  path: string
  url: string
  cdnUrl?: string
  thumbnailUrl?: string
  uploaderId: string
  visibility: 'public' | 'private' | 'restricted'
  tags: string[]
  metadata: Record<string, any>
  uploadedAt: Date
  lastAccessedAt?: Date
  expiresAt?: Date
  versions: FileVersion[]
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed'
  securityStatus: 'clean' | 'scanning' | 'quarantined' | 'blocked'
}

export interface FileVersion {
  id: string
  version: number
  path: string
  url: string
  size: number
  createdAt: Date
  changes?: string
}
```

#### Advanced Upload Service
```typescript
// src/lib/files/upload-service.ts
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { fileConfig } from './config'
import { validateFile, processFile, scanFile } from './processors'
import { createAuditLog } from '../audit/logger'

export interface UploadOptions {
  visibility?: 'public' | 'private' | 'restricted'
  folder?: string
  tags?: string[]
  metadata?: Record<string, any>
  generateThumbnail?: boolean
  enableProcessing?: boolean
  onProgress?: (progress: number) => void
  onError?: (error: Error) => void
}

export interface UploadResult {
  fileId: string
  url: string
  cdnUrl?: string
  thumbnailUrl?: string
  processingId?: string
}

export class FileUploadService {
  private supabase = createClientComponentClient()
  private uploadQueue = new Map<string, AbortController>()

  async uploadFile(
    file: File,
    userId: string,
    options: UploadOptions = {}
  ): Promise<UploadResult> {
    const uploadId = this.generateUploadId()
    
    try {
      // Validate file
      const validation = await validateFile(file)
      if (!validation.valid) {
        throw new Error(`File validation failed: ${validation.errors.join(', ')}`)
      }

      // Create abort controller for cancellation
      const abortController = new AbortController()
      this.uploadQueue.set(uploadId, abortController)

      // Generate file metadata
      const metadata = await this.generateFileMetadata(file, userId, options)

      // Security scanning (if enabled)
      if (fileConfig.security.enableVirusScanning) {
        const scanResult = await scanFile(file)
        if (!scanResult.clean) {
          await this.quarantineFile(metadata.id, scanResult.threats)
          throw new Error('File failed security scan')
        }
      }

      // Upload file with resumable capability
      let uploadResult: UploadResult

      if (file.size > fileConfig.upload.chunkSize && fileConfig.upload.enableResumable) {
        uploadResult = await this.resumableUpload(file, metadata, options, abortController)
      } else {
        uploadResult = await this.directUpload(file, metadata, options, abortController)
      }

      // Start background processing
      if (options.enableProcessing !== false) {
        await this.scheduleProcessing(metadata.id, file.type)
      }

      // Create file record in database
      await this.createFileRecord(metadata, uploadResult)

      // Audit log
      await createAuditLog({
        action: 'FILE_UPLOADED',
        userId,
        details: {
          fileId: metadata.id,
          filename: metadata.originalName,
          size: metadata.size,
          type: metadata.mimeType
        },
        category: 'file_management'
      })

      this.uploadQueue.delete(uploadId)
      return uploadResult

    } catch (error) {
      this.uploadQueue.delete(uploadId)
      
      await createAuditLog({
        action: 'FILE_UPLOAD_FAILED',
        userId,
        details: {
          filename: file.name,
          size: file.size,
          error: (error as Error).message
        },
        category: 'file_management',
        severity: 'high'
      })

      throw error
    }
  }

  private async resumableUpload(
    file: File,
    metadata: FileMetadata,
    options: UploadOptions,
    abortController: AbortController
  ): Promise<UploadResult> {
    const chunks = Math.ceil(file.size / fileConfig.upload.chunkSize)
    let uploadedBytes = 0

    // Check for existing partial upload
    const existingUpload = await this.checkExistingUpload(metadata.id)
    if (existingUpload) {
      uploadedBytes = existingUpload.uploadedBytes
    }

    for (let chunkIndex = Math.floor(uploadedBytes / fileConfig.upload.chunkSize); chunkIndex < chunks; chunkIndex++) {
      if (abortController.signal.aborted) {
        throw new Error('Upload cancelled')
      }

      const start = chunkIndex * fileConfig.upload.chunkSize
      const end = Math.min(start + fileConfig.upload.chunkSize, file.size)
      const chunk = file.slice(start, end)

      await this.uploadChunk(metadata.id, chunk, chunkIndex, chunks)
      
      uploadedBytes += chunk.size
      const progress = (uploadedBytes / file.size) * 100
      options.onProgress?.(progress)
    }

    // Finalize upload
    return await this.finalizeUpload(metadata.id)
  }

  private async directUpload(
    file: File,
    metadata: FileMetadata,
    options: UploadOptions,
    abortController: AbortController
  ): Promise<UploadResult> {
    const filePath = this.generateFilePath(metadata)

    const { data, error } = await this.supabase.storage
      .from(fileConfig.storage.bucket)
      .upload(filePath, file, {
        cacheControl: `public, max-age=${fileConfig.cdn.cacheTTL}`,
        upsert: false,
        metadata: {
          uploaderId: metadata.uploaderId,
          originalName: metadata.originalName,
          ...metadata.metadata
        }
      })

    if (error) {
      throw new Error(`Upload failed: ${error.message}`)
    }

    const { data: { publicUrl } } = this.supabase.storage
      .from(fileConfig.storage.bucket)
      .getPublicUrl(data.path)

    return {
      fileId: metadata.id,
      url: publicUrl,
      cdnUrl: this.generateCDNUrl(data.path)
    }
  }

  private async uploadChunk(
    uploadId: string,
    chunk: Blob,
    chunkIndex: number,
    totalChunks: number
  ): Promise<void> {
    const formData = new FormData()
    formData.append('chunk', chunk)
    formData.append('chunkIndex', chunkIndex.toString())
    formData.append('totalChunks', totalChunks.toString())
    formData.append('uploadId', uploadId)

    const response = await fetch('/api/files/upload-chunk', {
      method: 'POST',
      body: formData
    })

    if (!response.ok) {
      throw new Error(`Chunk upload failed: ${response.statusText}`)
    }
  }

  private async generateFileMetadata(
    file: File,
    userId: string,
    options: UploadOptions
  ): Promise<FileMetadata> {
    const fileId = this.generateFileId()
    const extension = this.getFileExtension(file.name)
    const filename = `${fileId}${extension}`

    return {
      id: fileId,
      filename,
      originalName: file.name,
      mimeType: file.type,
      size: file.size,
      path: '',
      url: '',
      uploaderId: userId,
      visibility: options.visibility || 'private',
      tags: options.tags || [],
      metadata: {
        lastModified: file.lastModified,
        ...options.metadata
      },
      uploadedAt: new Date(),
      versions: [],
      processingStatus: 'pending',
      securityStatus: 'clean'
    }
  }

  private generateFilePath(metadata: FileMetadata): string {
    const date = new Date()
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    
    return `uploads/${year}/${month}/${day}/${metadata.uploaderId}/${metadata.filename}`
  }

  private generateCDNUrl(path: string): string {
    if (!fileConfig.cdn.domain) return ''
    return `https://${fileConfig.cdn.domain}/${path}`
  }

  private generateUploadId(): string {
    return `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private generateFileId(): string {
    return `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private getFileExtension(filename: string): string {
    return filename.substring(filename.lastIndexOf('.'))
  }

  async cancelUpload(uploadId: string): Promise<void> {
    const abortController = this.uploadQueue.get(uploadId)
    if (abortController) {
      abortController.abort()
      this.uploadQueue.delete(uploadId)
    }
  }

  async deleteFile(fileId: string, userId: string): Promise<void> {
    try {
      // Get file metadata
      const file = await this.getFileMetadata(fileId)
      if (!file) {
        throw new Error('File not found')
      }

      // Check permissions
      if (file.uploaderId !== userId) {
        // Check if user has admin permissions
        const hasPermission = await this.checkDeletePermission(userId, fileId)
        if (!hasPermission) {
          throw new Error('Permission denied')
        }
      }

      // Delete from storage
      const { error } = await this.supabase.storage
        .from(fileConfig.storage.bucket)
        .remove([file.path])

      if (error) {
        throw new Error(`Failed to delete file: ${error.message}`)
      }

      // Delete file record
      await this.deleteFileRecord(fileId)

      await createAuditLog({
        action: 'FILE_DELETED',
        userId,
        details: {
          fileId,
          filename: file.originalName,
          size: file.size
        },
        category: 'file_management'
      })

    } catch (error) {
      await createAuditLog({
        action: 'FILE_DELETE_FAILED',
        userId,
        details: {
          fileId,
          error: (error as Error).message
        },
        category: 'file_management',
        severity: 'high'
      })

      throw error
    }
  }
}
```

### 🎨 Media Processing Pipeline

#### Image and Video Processing
```typescript
// src/lib/files/processors/media-processor.ts
import sharp from 'sharp'
import ffmpeg from 'fluent-ffmpeg'
import { fileConfig } from '../config'

export interface ProcessingOptions {
  generateThumbnail?: boolean
  optimizeImages?: boolean
  transcodeVideo?: boolean
  extractMetadata?: boolean
}

export interface ProcessingResult {
  processed: boolean
  originalUrl: string
  optimizedUrl?: string
  thumbnailUrl?: string
  metadata: MediaMetadata
  formats: ProcessedFormat[]
}

export interface MediaMetadata {
  width?: number
  height?: number
  duration?: number
  bitrate?: number
  codec?: string
  colorSpace?: string
  hasAlpha?: boolean
}

export interface ProcessedFormat {
  format: string
  url: string
  size: number
  quality: string
}

export class MediaProcessor {
  async processImage(
    filePath: string,
    options: ProcessingOptions = {}
  ): Promise<ProcessingResult> {
    try {
      const image = sharp(filePath)
      const metadata = await image.metadata()

      const result: ProcessingResult = {
        processed: false,
        originalUrl: filePath,
        metadata: {
          width: metadata.width,
          height: metadata.height,
          colorSpace: metadata.space,
          hasAlpha: metadata.hasAlpha
        },
        formats: []
      }

      if (options.optimizeImages && fileConfig.processing.enableImageOptimization) {
        const formats = fileConfig.processing.imageFormats

        for (const format of formats) {
          const optimized = await this.optimizeImage(image, format, metadata)
          if (optimized) {
            result.formats.push(optimized)
            if (format === 'webp' && !result.optimizedUrl) {
              result.optimizedUrl = optimized.url
            }
          }
        }

        result.processed = true
      }

      if (options.generateThumbnail) {
        result.thumbnailUrl = await this.generateImageThumbnail(image)
      }

      return result

    } catch (error) {
      throw new Error(`Image processing failed: ${(error as Error).message}`)
    }
  }

  private async optimizeImage(
    image: sharp.Sharp,
    format: string,
    metadata: sharp.Metadata
  ): Promise<ProcessedFormat | null> {
    try {
      let pipeline = image.clone()

      // Apply optimizations based on format
      switch (format) {
        case 'webp':
          pipeline = pipeline.webp({ 
            quality: 85, 
            effort: 6,
            nearLossless: metadata.channels === 4 // Preserve transparency
          })
          break
        
        case 'avif':
          pipeline = pipeline.avif({ 
            quality: 80, 
            effort: 6 
          })
          break
        
        case 'jpeg':
          pipeline = pipeline.jpeg({ 
            quality: 90,
            progressive: true,
            mozjpeg: true
          })
          break
        
        default:
          return null
      }

      // Resize if too large
      if (metadata.width && metadata.width > 2048) {
        pipeline = pipeline.resize(2048, null, {
          withoutEnlargement: true,
          fit: 'inside'
        })
      }

      const buffer = await pipeline.toBuffer()
      const outputPath = this.generateOptimizedPath(format)
      
      // Upload optimized version
      const uploadResult = await this.uploadBuffer(buffer, outputPath, `image/${format}`)

      return {
        format,
        url: uploadResult.url,
        size: buffer.length,
        quality: '85%'
      }

    } catch (error) {
      console.error(`Failed to optimize image to ${format}:`, error)
      return null
    }
  }

  private async generateImageThumbnail(image: sharp.Sharp): Promise<string> {
    const thumbnail = await image
      .clone()
      .resize(300, 300, {
        fit: 'cover',
        position: 'centre'
      })
      .webp({ quality: 80 })
      .toBuffer()

    const thumbnailPath = this.generateThumbnailPath()
    const uploadResult = await this.uploadBuffer(thumbnail, thumbnailPath, 'image/webp')
    
    return uploadResult.url
  }

  async processVideo(
    filePath: string,
    options: ProcessingOptions = {}
  ): Promise<ProcessingResult> {
    return new Promise((resolve, reject) => {
      const result: ProcessingResult = {
        processed: false,
        originalUrl: filePath,
        metadata: {},
        formats: []
      }

      ffmpeg(filePath)
        .ffprobe((err, metadata) => {
          if (err) {
            reject(new Error(`Video analysis failed: ${err.message}`))
            return
          }

          const videoStream = metadata.streams.find(s => s.codec_type === 'video')
          if (videoStream) {
            result.metadata = {
              width: videoStream.width,
              height: videoStream.height,
              duration: parseFloat(metadata.format.duration || '0'),
              bitrate: parseInt(metadata.format.bit_rate || '0'),
              codec: videoStream.codec_name
            }
          }

          const processingPromises: Promise<void>[] = []

          if (options.transcodeVideo && fileConfig.processing.enableVideoTranscoding) {
            // Transcode to different formats
            for (const format of fileConfig.processing.videoFormats) {
              processingPromises.push(this.transcodeVideo(filePath, format, result))
            }
          }

          if (options.generateThumbnail) {
            processingPromises.push(this.generateVideoThumbnail(filePath, result))
          }

          Promise.all(processingPromises)
            .then(() => {
              result.processed = processingPromises.length > 0
              resolve(result)
            })
            .catch(reject)
        })
    })
  }

  private async transcodeVideo(
    inputPath: string,
    format: string,
    result: ProcessingResult
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const outputPath = this.generateTranscodedPath(format)
      
      let command = ffmpeg(inputPath)

      // Format-specific settings
      switch (format) {
        case 'mp4':
          command = command
            .videoCodec('libx264')
            .audioCodec('aac')
            .outputOptions([
              '-preset medium',
              '-crf 23',
              '-movflags +faststart'
            ])
          break
        
        case 'webm':
          command = command
            .videoCodec('libvpx-vp9')
            .audioCodec('libvorbis')
            .outputOptions([
              '-crf 30',
              '-b:v 0'
            ])
          break
      }

      command
        .output(outputPath)
        .on('end', async () => {
          try {
            const stats = await this.getFileStats(outputPath)
            const uploadResult = await this.uploadFile(outputPath, `video/${format}`)
            
            result.formats.push({
              format,
              url: uploadResult.url,
              size: stats.size,
              quality: 'optimized'
            })

            if (format === 'mp4' && !result.optimizedUrl) {
              result.optimizedUrl = uploadResult.url
            }

            resolve()
          } catch (error) {
            reject(error)
          }
        })
        .on('error', reject)
        .run()
    })
  }

  private async generateVideoThumbnail(
    inputPath: string,
    result: ProcessingResult
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const thumbnailPath = this.generateThumbnailPath('jpg')
      
      ffmpeg(inputPath)
        .screenshots({
          timestamps: ['50%'],
          filename: thumbnailPath,
          size: '400x300'
        })
        .on('end', async () => {
          try {
            const uploadResult = await this.uploadFile(thumbnailPath, 'image/jpeg')
            result.thumbnailUrl = uploadResult.url
            resolve()
          } catch (error) {
            reject(error)
          }
        })
        .on('error', reject)
    })
  }
}
```

### 🔒 Advanced Security Implementation

#### File Security Scanner
```typescript
// src/lib/files/security/scanner.ts
import { createHash } from 'crypto'
import { fileConfig } from '../config'

export interface SecurityScanResult {
  clean: boolean
  threats: SecurityThreat[]
  hash: string
  scanDuration: number
}

export interface SecurityThreat {
  type: 'virus' | 'malware' | 'suspicious' | 'blocked_extension'
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  details?: any
}

export class FileSecurityScanner {
  private static readonly BLOCKED_EXTENSIONS = [
    '.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js',
    '.jar', '.msi', '.dll', '.sys', '.app', '.deb', '.rpm'
  ]

  private static readonly SUSPICIOUS_PATTERNS = [
    /eval\s*\(/gi,
    /document\.write/gi,
    /innerHTML/gi,
    /<script[^>]*>/gi,
    /javascript:/gi,
    /vbscript:/gi,
    /onload\s*=/gi,
    /onerror\s*=/gi
  ]

  async scanFile(file: File): Promise<SecurityScanResult> {
    const startTime = Date.now()
    const threats: SecurityThreat[] = []

    try {
      // Generate file hash
      const hash = await this.generateFileHash(file)

      // Check against known malicious hashes
      const hashThreat = await this.checkMaliciousHash(hash)
      if (hashThreat) {
        threats.push(hashThreat)
      }

      // Extension validation
      const extensionThreat = this.checkFileExtension(file.name)
      if (extensionThreat) {
        threats.push(extensionThreat)
      }

      // MIME type validation
      const mimeTypeThreat = this.validateMimeType(file.type, file.name)
      if (mimeTypeThreat) {
        threats.push(mimeTypeThreat)
      }

      // Content analysis for text-based files
      if (this.isTextFile(file.type)) {
        const contentThreats = await this.scanFileContent(file)
        threats.push(...contentThreats)
      }

      // Binary analysis for executable files
      if (this.isBinaryFile(file.type)) {
        const binaryThreats = await this.scanBinaryFile(file)
        threats.push(...binaryThreats)
      }

      // Check file size anomalies
      const sizeThreat = this.checkFileSizeAnomaly(file)
      if (sizeThreat) {
        threats.push(sizeThreat)
      }

      const scanDuration = Date.now() - startTime
      const clean = threats.length === 0 || threats.every(t => t.severity === 'low')

      return {
        clean,
        threats,
        hash,
        scanDuration
      }

    } catch (error) {
      return {
        clean: false,
        threats: [{
          type: 'suspicious',
          severity: 'high',
          description: 'File scanning failed',
          details: { error: (error as Error).message }
        }],
        hash: '',
        scanDuration: Date.now() - startTime
      }
    }
  }

  private async generateFileHash(file: File): Promise<string> {
    const buffer = await file.arrayBuffer()
    const hash = createHash('sha256')
    hash.update(new Uint8Array(buffer))
    return hash.digest('hex')
  }

  private async checkMaliciousHash(hash: string): Promise<SecurityThreat | null> {
    try {
      // Check against local blacklist or external API
      const response = await fetch('/api/security/check-hash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hash })
      })

      if (response.ok) {
        const result = await response.json()
        if (result.malicious) {
          return {
            type: 'virus',
            severity: 'critical',
            description: 'File matches known malicious hash',
            details: result
          }
        }
      }
    } catch (error) {
      console.warn('Hash check failed:', error)
    }

    return null
  }

  private checkFileExtension(filename: string): SecurityThreat | null {
    const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'))
    
    if (FileSecurityScanner.BLOCKED_EXTENSIONS.includes(extension)) {
      return {
        type: 'blocked_extension',
        severity: 'high',
        description: `File extension '${extension}' is not allowed`,
        details: { extension }
      }
    }

    return null
  }

  private validateMimeType(mimeType: string, filename: string): SecurityThreat | null {
    const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'))
    const expectedMimeTypes = this.getExpectedMimeTypes(extension)

    if (expectedMimeTypes.length > 0 && !expectedMimeTypes.includes(mimeType.toLowerCase())) {
      return {
        type: 'suspicious',
        severity: 'medium',
        description: 'MIME type does not match file extension',
        details: { 
          extension, 
          actualMimeType: mimeType, 
          expectedMimeTypes 
        }
      }
    }

    return null
  }

  private async scanFileContent(file: File): Promise<SecurityThreat[]> {
    const threats: SecurityThreat[] = []
    
    try {
      const content = await file.text()
      
      for (const pattern of FileSecurityScanner.SUSPICIOUS_PATTERNS) {
        if (pattern.test(content)) {
          threats.push({
            type: 'suspicious',
            severity: 'medium',
            description: 'File contains suspicious patterns',
            details: { pattern: pattern.source }
          })
        }
      }

      // Check for embedded scripts in documents
      if (file.type.includes('document') && /<script|javascript:|vbscript:/gi.test(content)) {
        threats.push({
          type: 'malware',
          severity: 'high',
          description: 'Document contains embedded scripts',
        })
      }

    } catch (error) {
      threats.push({
        type: 'suspicious',
        severity: 'low',
        description: 'Unable to scan file content',
        details: { error: (error as Error).message }
      })
    }

    return threats
  }

  private async scanBinaryFile(file: File): Promise<SecurityThreat[]> {
    const threats: SecurityThreat[] = []
    
    try {
      const buffer = await file.arrayBuffer()
      const bytes = new Uint8Array(buffer.slice(0, 1024)) // First 1KB

      // Check for PE header (Windows executables)
      if (bytes[0] === 0x4D && bytes[1] === 0x5A) {
        threats.push({
          type: 'suspicious',
          severity: 'high',
          description: 'File appears to be a Windows executable',
          details: { fileType: 'PE' }
        })
      }

      // Check for ELF header (Linux executables)
      if (bytes[0] === 0x7F && bytes[1] === 0x45 && bytes[2] === 0x4C && bytes[3] === 0x46) {
        threats.push({
          type: 'suspicious',
          severity: 'high',
          description: 'File appears to be a Linux executable',
          details: { fileType: 'ELF' }
        })
      }

    } catch (error) {
      threats.push({
        type: 'suspicious',
        severity: 'low',
        description: 'Unable to scan binary file',
        details: { error: (error as Error).message }
      })
    }

    return threats
  }

  private checkFileSizeAnomaly(file: File): SecurityThreat | null {
    // Check for suspicious file sizes
    if (file.size === 0) {
      return {
        type: 'suspicious',
        severity: 'low',
        description: 'File is empty',
      }
    }

    if (file.size > fileConfig.upload.maxFileSize) {
      return {
        type: 'blocked_extension',
        severity: 'medium',
        description: 'File exceeds maximum size limit',
        details: { size: file.size, limit: fileConfig.upload.maxFileSize }
      }
    }

    return null
  }

  private isTextFile(mimeType: string): boolean {
    return mimeType.startsWith('text/') || 
           mimeType.includes('json') || 
           mimeType.includes('xml') ||
           mimeType.includes('javascript')
  }

  private isBinaryFile(mimeType: string): boolean {
    return mimeType.includes('application/octet-stream') ||
           mimeType.includes('application/x-') ||
           !this.isTextFile(mimeType)
  }

  private getExpectedMimeTypes(extension: string): string[] {
    const mimeMap: Record<string, string[]> = {
      '.jpg': ['image/jpeg'],
      '.jpeg': ['image/jpeg'],
      '.png': ['image/png'],
      '.gif': ['image/gif'],
      '.webp': ['image/webp'],
      '.pdf': ['application/pdf'],
      '.doc': ['application/msword'],
      '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      '.txt': ['text/plain'],
      '.md': ['text/markdown', 'text/plain'],
      '.mp4': ['video/mp4'],
      '.webm': ['video/webm'],
      '.mov': ['video/quicktime'],
      '.mp3': ['audio/mpeg', 'audio/mp3'],
      '.wav': ['audio/wav', 'audio/wave'],
    }

    return mimeMap[extension] || []
  }
}
```

### 🗂️ File Management Components

#### Advanced File Upload Component
```typescript
// src/components/files/FileUploader.tsx
'use client'

import React, { useState, useCallback, useRef } from 'react'
import { useDropzone } from 'react-dropzone'
import { FileUploadService, UploadOptions } from '@/lib/files/upload-service'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent } from '@/components/ui/card'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'
import { 
  Upload, 
  File as FileIcon, 
  Image as ImageIcon, 
  Video as VideoIcon,
  X,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react'

interface FileUploaderProps {
  onUploadComplete?: (files: UploadedFile[]) => void
  onUploadError?: (error: Error) => void
  options?: Partial<UploadOptions>
  maxFiles?: number
  accept?: Record<string, string[]>
  disabled?: boolean
}

interface UploadingFile {
  id: string
  file: File
  progress: number
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'error'
  error?: string
  result?: any
}

interface UploadedFile {
  id: string
  filename: string
  url: string
  thumbnailUrl?: string
  size: number
  type: string
}

export function FileUploader({
  onUploadComplete,
  onUploadError,
  options = {},
  maxFiles = 10,
  accept = {
    'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp'],
    'video/*': ['.mp4', '.webm', '.mov'],
    'application/pdf': ['.pdf']
  },
  disabled = false
}: FileUploaderProps) {
  const { user } = useAuth()
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([])
  const [completedFiles, setCompletedFiles] = useState<UploadedFile[]>([])
  const uploadService = useRef(new FileUploadService())

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!user) {
      toast.error('Please login to upload files')
      return
    }

    if (acceptedFiles.length + uploadingFiles.length + completedFiles.length > maxFiles) {
      toast.error(`Maximum ${maxFiles} files allowed`)
      return
    }

    const newUploading: UploadingFile[] = acceptedFiles.map(file => ({
      id: `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      file,
      progress: 0,
      status: 'pending'
    }))

    setUploadingFiles(prev => [...prev, ...newUploading])

    // Start uploads
    for (const uploadingFile of newUploading) {
      try {
        setUploadingFiles(prev => prev.map(f => 
          f.id === uploadingFile.id 
            ? { ...f, status: 'uploading' }
            : f
        ))

        const result = await uploadService.current.uploadFile(
          uploadingFile.file,
          user.id,
          {
            ...options,
            onProgress: (progress) => {
              setUploadingFiles(prev => prev.map(f => 
                f.id === uploadingFile.id 
                  ? { ...f, progress }
                  : f
              ))
            },
            onError: (error) => {
              setUploadingFiles(prev => prev.map(f => 
                f.id === uploadingFile.id 
                  ? { ...f, status: 'error', error: error.message }
                  : f
              ))
              onUploadError?.(error)
            }
          }
        )

        // Mark as processing
        setUploadingFiles(prev => prev.map(f => 
          f.id === uploadingFile.id 
            ? { ...f, status: 'processing', progress: 100 }
            : f
        ))

        // Wait for processing to complete (simulation)
        await new Promise(resolve => setTimeout(resolve, 2000))

        // Mark as completed
        const completedFile: UploadedFile = {
          id: result.fileId,
          filename: uploadingFile.file.name,
          url: result.url,
          thumbnailUrl: result.thumbnailUrl,
          size: uploadingFile.file.size,
          type: uploadingFile.file.type
        }

        setCompletedFiles(prev => [...prev, completedFile])
        setUploadingFiles(prev => prev.filter(f => f.id !== uploadingFile.id))

        toast.success(`${uploadingFile.file.name} uploaded successfully`)

      } catch (error) {
        setUploadingFiles(prev => prev.map(f => 
          f.id === uploadingFile.id 
            ? { ...f, status: 'error', error: (error as Error).message }
            : f
        ))
        
        toast.error(`Failed to upload ${uploadingFile.file.name}`)
        onUploadError?.(error as Error)
      }
    }

    // Trigger completion callback
    if (completedFiles.length > 0) {
      onUploadComplete?.(completedFiles)
    }

  }, [user, uploadingFiles, completedFiles, maxFiles, options, onUploadComplete, onUploadError])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxFiles,
    disabled: disabled || !user,
    multiple: maxFiles > 1
  })

  const removeFile = useCallback((fileId: string, type: 'uploading' | 'completed') => {
    if (type === 'uploading') {
      // Cancel upload if possible
      uploadService.current.cancelUpload(fileId)
      setUploadingFiles(prev => prev.filter(f => f.id !== fileId))
    } else {
      setCompletedFiles(prev => prev.filter(f => f.id !== fileId))
    }
  }, [])

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <ImageIcon className="w-4 h-4" />
    if (type.startsWith('video/')) return <VideoIcon className="w-4 h-4" />
    return <FileIcon className="w-4 h-4" />
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <Card>
        <CardContent className="p-6">
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
              ${isDragActive 
                ? 'border-primary bg-primary/5' 
                : 'border-gray-300 hover:border-gray-400'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            <input {...getInputProps()} />
            <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            
            {isDragActive ? (
              <p className="text-primary font-medium">Drop files here...</p>
            ) : (
              <div>
                <p className="text-gray-600 mb-2">
                  Drag & drop files here, or click to select files
                </p>
                <p className="text-sm text-gray-500">
                  Maximum {maxFiles} files, up to {formatFileSize(100 * 1024 * 1024)} each
                </p>
              </div>
            )}
            
            {!user && (
              <p className="text-red-500 text-sm mt-2">
                Please login to upload files
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Uploading Files */}
      {uploadingFiles.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="font-medium mb-3">Uploading...</h3>
            <div className="space-y-3">
              {uploadingFiles.map((file) => (
                <div key={file.id} className="flex items-center space-x-3">
                  {getFileIcon(file.file.type)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.file.name}</p>
                    <div className="flex items-center space-x-2">
                      <Progress value={file.progress} className="flex-1" />
                      <span className="text-xs text-gray-500">
                        {file.progress}%
                      </span>
                    </div>
                    {file.status === 'processing' && (
                      <p className="text-xs text-blue-600 flex items-center mt-1">
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        Processing...
                      </p>
                    )}
                    {file.error && (
                      <p className="text-xs text-red-600 mt-1">{file.error}</p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(file.id, 'uploading')}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Completed Files */}
      {completedFiles.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="font-medium mb-3">Uploaded Files</h3>
            <div className="space-y-3">
              {completedFiles.map((file) => (
                <div key={file.id} className="flex items-center space-x-3">
                  {file.thumbnailUrl ? (
                    <img 
                      src={file.thumbnailUrl} 
                      alt={file.filename}
                      className="w-10 h-10 object-cover rounded"
                    />
                  ) : (
                    getFileIcon(file.type)
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.filename}</p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(file.id, 'completed')}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
```

## 💡 Öneriler ve Best Practices

### 📊 File Analytics ve Monitoring
```typescript
// src/lib/files/analytics.ts
export interface FileAnalytics {
  totalFiles: number
  totalSize: number
  dailyUploads: number
  mostUsedTypes: Array<{ type: string; count: number }>
  averageFileSize: number
  uploadSuccessRate: number
  processingPerformance: {
    averageTime: number
    failureRate: number
  }
}

export class FileAnalyticsService {
  async getAnalytics(dateRange: { start: Date; end: Date }): Promise<FileAnalytics> {
    // Implementation to fetch and calculate file analytics
    return {
      totalFiles: 0,
      totalSize: 0,
      dailyUploads: 0,
      mostUsedTypes: [],
      averageFileSize: 0,
      uploadSuccessRate: 0,
      processingPerformance: {
        averageTime: 0,
        failureRate: 0
      }
    }
  }
}
```

### 🔄 Backup ve Recovery Strategy
```typescript
// src/lib/files/backup-service.ts
export class FileBackupService {
  async createBackup(fileIds: string[]): Promise<string> {
    // Create incremental backup of specified files
    // Return backup ID for tracking
    return 'backup_id'
  }

  async restoreFromBackup(backupId: string, targetPath?: string): Promise<void> {
    // Restore files from backup
  }

  async scheduleAutomaticBackup(schedule: string): Promise<void> {
    // Schedule regular backups using cron-like syntax
  }
}
```

## 📊 Implementation Roadmap

### Phase 1: Core Enhancement (2 weeks)
- [ ] Advanced security scanning implementation
- [ ] Resumable upload functionality
- [ ] Media processing pipeline optimization
- [ ] File versioning system

### Phase 2: Advanced Features (3 weeks)
- [ ] CDN integration optimization
- [ ] Advanced access control
- [ ] File analytics dashboard
- [ ] Automated backup system

### Phase 3: Performance & Monitoring (1 week)
- [ ] Upload performance optimization
- [ ] Monitoring dashboard
- [ ] Error tracking enhancement
- [ ] Documentation updates

## 🔗 İlgili Dosyalar

- [CDN Performance](cdn-performance.md) - Content delivery optimization
- [Security Audit](../security/security-audit.md) - File security review
- [Database Schema](database-schema.md) - File metadata structures
- [Backend API Design](backend-api-design.md) - File API endpoints
- [Error Handling](error-handling.md) - File error management

## 📚 Kaynaklar

### 📖 File Management Documentation
- [Supabase Storage](https://supabase.com/docs/guides/storage)
- [Sharp Image Processing](https://sharp.pixelplumbing.com/)
- [FFmpeg Documentation](https://ffmpeg.org/documentation.html)

### 🔒 Security Resources
- [File Upload Security](https://owasp.org/www-community/vulnerabilities/Unrestricted_File_Upload)
- [MIME Type Detection](https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types)

### 🚀 Performance Tools
- [Web Performance APIs](https://developer.mozilla.org/en-US/docs/Web/API/Performance_API)
- [File API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/File_API)

---

*Son güncelleme: ${new Date().toLocaleDateString('tr-TR')}*
*Doküman versiyonu: 1.0.0*
*İnceleme durumu: ✅ Tamamlandı*