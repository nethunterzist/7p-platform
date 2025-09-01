# CDN Performance Optimization - 7P Education Platform

## 📋 Özet

7P Education Platform'un CDN (Content Delivery Network) performance optimization stratejisi, global kullanıcı deneyimini optimize etmek için multi-tier caching, intelligent routing, ve advanced compression teknikleri kullanan kapsamlı bir yaklaşımdır. Bu dokümantasyon, Cloudflare, AWS CloudFront, ve diğer CDN providers ile entegrasyon stratejilerini detaylandırır.

## 🎯 Amaç ve Kapsam

Bu dokümantasyonun amaçları:
- Global CDN infrastructure design ve implementation
- Intelligent edge caching strategies geliştirmesi
- Dynamic content delivery optimization
- Image ve video optimization workflows
- Real-time performance monitoring ve analytics
- Geographic performance optimization
- Cost-effective bandwidth management
- Security-first CDN configuration
- Advanced compression ve minification strategies

## 🏗️ Mevcut Durum Analizi

### ✅ Aktif CDN Bileşenleri
- **Vercel Edge Network**: Automatic static asset caching
- **Next.js Image Optimization**: Built-in image processing
- **Browser Caching**: HTTP cache headers implementation
- **Supabase CDN**: Database asset delivery
- **Basic Compression**: Gzip compression for text assets

### ⚠️ Geliştirilmesi Gereken Alanlar
- Multi-CDN setup eksikliği (vendor lock-in riski)
- Advanced image optimization pipeline
- Video streaming optimization
- Dynamic content edge caching
- Geographic routing optimization
- Real-time invalidation strategies
- Performance monitoring dashboard

## 🔧 Teknik Detaylar

### 🌐 Multi-CDN Architecture Design

#### 1. CDN Provider Abstraction Layer
```typescript
// lib/cdn/provider-abstraction.ts
export interface CDNProvider {
  name: string
  priority: number
  regions: string[]
  capabilities: CDNCapability[]
  costPerGB: number
  purgeCache(urls: string[]): Promise<boolean>
  uploadAsset(file: File, path: string): Promise<string>
  getAnalytics(timeframe: string): Promise<CDNAnalytics>
}

export interface CDNCapability {
  type: 'image-optimization' | 'video-streaming' | 'edge-compute' | 'compression'
  supported: boolean
  config?: Record<string, any>
}

export interface CDNAnalytics {
  bandwidth: number
  requests: number
  cacheHitRate: number
  avgResponseTime: number
  errorRate: number
  topCountries: Array<{ country: string; requests: number }>
}

// CDN Provider implementations
class CloudflareProvider implements CDNProvider {
  name = 'Cloudflare'
  priority = 1
  regions = ['global']
  capabilities: CDNCapability[] = [
    { type: 'image-optimization', supported: true, config: { formats: ['webp', 'avif'] } },
    { type: 'video-streaming', supported: true },
    { type: 'edge-compute', supported: true },
    { type: 'compression', supported: true }
  ]
  costPerGB = 0.05

  private apiToken = process.env.CLOUDFLARE_API_TOKEN
  private zoneId = process.env.CLOUDFLARE_ZONE_ID

  async purgeCache(urls: string[]): Promise<boolean> {
    try {
      const response = await fetch(`https://api.cloudflare.com/client/v4/zones/${this.zoneId}/purge_cache`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ files: urls }),
      })

      const result = await response.json()
      return result.success
    } catch (error) {
      console.error('Cloudflare cache purge failed:', error)
      return false
    }
  }

  async uploadAsset(file: File, path: string): Promise<string> {
    const formData = new FormData()
    formData.append('file', file)
    
    try {
      const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/images/v1`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
        },
        body: formData,
      })

      const result = await response.json()
      return result.result?.variants?.[0] || ''
    } catch (error) {
      console.error('Cloudflare asset upload failed:', error)
      throw error
    }
  }

  async getAnalytics(timeframe: string): Promise<CDNAnalytics> {
    try {
      const response = await fetch(
        `https://api.cloudflare.com/client/v4/zones/${this.zoneId}/analytics/dashboard?since=${timeframe}`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
          },
        }
      )

      const result = await response.json()
      const data = result.result

      return {
        bandwidth: data.totals.bandwidth.all,
        requests: data.totals.requests.all,
        cacheHitRate: (data.totals.requests.cached / data.totals.requests.all) * 100,
        avgResponseTime: data.totals.response_time_avg,
        errorRate: (data.totals.requests.http_status[4] + data.totals.requests.http_status[5]) / data.totals.requests.all * 100,
        topCountries: data.totals.requests.country || []
      }
    } catch (error) {
      console.error('Cloudflare analytics fetch failed:', error)
      throw error
    }
  }
}

class AWSCloudFrontProvider implements CDNProvider {
  name = 'AWS CloudFront'
  priority = 2
  regions = ['us-east-1', 'eu-west-1', 'ap-southeast-1']
  capabilities: CDNCapability[] = [
    { type: 'image-optimization', supported: true },
    { type: 'video-streaming', supported: true },
    { type: 'edge-compute', supported: true },
    { type: 'compression', supported: true }
  ]
  costPerGB = 0.085

  async purgeCache(urls: string[]): Promise<boolean> {
    // AWS SDK implementation for CloudFront invalidation
    try {
      const { CloudFront } = await import('@aws-sdk/client-cloudfront')
      const cloudfront = new CloudFront({
        region: 'us-east-1',
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        },
      })

      await cloudfront.createInvalidation({
        DistributionId: process.env.CLOUDFRONT_DISTRIBUTION_ID,
        InvalidationBatch: {
          Paths: {
            Quantity: urls.length,
            Items: urls.map(url => url.replace(/^https?:\/\/[^\/]+/, '')),
          },
          CallerReference: Date.now().toString(),
        },
      })

      return true
    } catch (error) {
      console.error('CloudFront invalidation failed:', error)
      return false
    }
  }

  async uploadAsset(file: File, path: string): Promise<string> {
    const { S3 } = await import('@aws-sdk/client-s3')
    const s3 = new S3({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    })

    const buffer = await file.arrayBuffer()
    
    try {
      await s3.putObject({
        Bucket: process.env.AWS_S3_BUCKET,
        Key: path,
        Body: new Uint8Array(buffer),
        ContentType: file.type,
        CacheControl: 'public, max-age=31536000', // 1 year
      })

      return `https://${process.env.CLOUDFRONT_DOMAIN}/${path}`
    } catch (error) {
      console.error('S3 upload failed:', error)
      throw error
    }
  }

  async getAnalytics(timeframe: string): Promise<CDNAnalytics> {
    // Implementation using CloudWatch metrics
    const { CloudWatch } = await import('@aws-sdk/client-cloudwatch')
    const cloudwatch = new CloudWatch({
      region: 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    })

    const endTime = new Date()
    const startTime = new Date(endTime.getTime() - (24 * 60 * 60 * 1000)) // 24 hours ago

    try {
      const [requests, bytes] = await Promise.all([
        cloudwatch.getMetricStatistics({
          Namespace: 'AWS/CloudFront',
          MetricName: 'Requests',
          Dimensions: [
            {
              Name: 'DistributionId',
              Value: process.env.CLOUDFRONT_DISTRIBUTION_ID!,
            },
          ],
          StartTime: startTime,
          EndTime: endTime,
          Period: 3600, // 1 hour
          Statistics: ['Sum'],
        }),
        cloudwatch.getMetricStatistics({
          Namespace: 'AWS/CloudFront',
          MetricName: 'BytesDownloaded',
          Dimensions: [
            {
              Name: 'DistributionId',
              Value: process.env.CLOUDFRONT_DISTRIBUTION_ID!,
            },
          ],
          StartTime: startTime,
          EndTime: endTime,
          Period: 3600,
          Statistics: ['Sum'],
        }),
      ])

      const totalRequests = requests.Datapoints?.reduce((sum, point) => sum + (point.Sum || 0), 0) || 0
      const totalBytes = bytes.Datapoints?.reduce((sum, point) => sum + (point.Sum || 0), 0) || 0

      return {
        bandwidth: totalBytes,
        requests: totalRequests,
        cacheHitRate: 85, // Approximate from CloudFront logs
        avgResponseTime: 45, // Approximate
        errorRate: 0.5, // Approximate
        topCountries: [], // Would need additional log analysis
      }
    } catch (error) {
      console.error('CloudFront analytics fetch failed:', error)
      throw error
    }
  }
}

// CDN Management System
class CDNManager {
  private providers: CDNProvider[] = [
    new CloudflareProvider(),
    new AWSCloudFrontProvider(),
  ]

  private activeProvider: CDNProvider
  
  constructor() {
    // Select provider based on priority and availability
    this.activeProvider = this.providers.sort((a, b) => a.priority - b.priority)[0]
  }

  async uploadAsset(file: File, path: string, options?: {
    provider?: string
    fallback?: boolean
  }): Promise<string> {
    const provider = options?.provider 
      ? this.providers.find(p => p.name === options.provider) || this.activeProvider
      : this.activeProvider

    try {
      return await provider.uploadAsset(file, path)
    } catch (error) {
      if (options?.fallback && this.providers.length > 1) {
        const fallbackProvider = this.providers.find(p => p !== provider)!
        console.warn(`Falling back to ${fallbackProvider.name} for asset upload`)
        return await fallbackProvider.uploadAsset(file, path)
      }
      throw error
    }
  }

  async purgeCache(urls: string[]): Promise<boolean> {
    const results = await Promise.allSettled(
      this.providers.map(provider => provider.purgeCache(urls))
    )

    return results.some(result => result.status === 'fulfilled' && result.value)
  }

  async getAggregatedAnalytics(timeframe: string): Promise<CDNAnalytics> {
    const analyticsResults = await Promise.allSettled(
      this.providers.map(provider => provider.getAnalytics(timeframe))
    )

    const validResults = analyticsResults
      .filter((result): result is PromiseFulfilledResult<CDNAnalytics> => 
        result.status === 'fulfilled'
      )
      .map(result => result.value)

    if (validResults.length === 0) {
      throw new Error('Failed to fetch analytics from any provider')
    }

    // Aggregate metrics from all providers
    return validResults.reduce((aggregate, current) => ({
      bandwidth: aggregate.bandwidth + current.bandwidth,
      requests: aggregate.requests + current.requests,
      cacheHitRate: (aggregate.cacheHitRate + current.cacheHitRate) / validResults.length,
      avgResponseTime: (aggregate.avgResponseTime + current.avgResponseTime) / validResults.length,
      errorRate: (aggregate.errorRate + current.errorRate) / validResults.length,
      topCountries: this.mergeCountryData(aggregate.topCountries, current.topCountries),
    }))
  }

  private mergeCountryData(
    existing: Array<{ country: string; requests: number }>,
    incoming: Array<{ country: string; requests: number }>
  ): Array<{ country: string; requests: number }> {
    const merged = new Map<string, number>()
    
    existing.forEach(({ country, requests }) => {
      merged.set(country, requests)
    })
    
    incoming.forEach(({ country, requests }) => {
      merged.set(country, (merged.get(country) || 0) + requests)
    })
    
    return Array.from(merged.entries())
      .map(([country, requests]) => ({ country, requests }))
      .sort((a, b) => b.requests - a.requests)
      .slice(0, 10)
  }
}

export const cdnManager = new CDNManager()
```

#### 2. Advanced Image Optimization
```typescript
// lib/cdn/image-optimization.ts
import sharp from 'sharp'
import { cdnManager } from './provider-abstraction'

export interface ImageOptimizationOptions {
  width?: number
  height?: number
  quality?: number
  format?: 'webp' | 'avif' | 'jpeg' | 'png'
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside'
  position?: string
  background?: string
  blur?: number
  sharpen?: boolean
  grayscale?: boolean
  progressive?: boolean
}

export interface ResponsiveImageSet {
  sources: Array<{
    srcset: string
    sizes: string
    type: string
  }>
  fallback: {
    src: string
    alt: string
  }
}

class ImageOptimizationService {
  private readonly supportedFormats = ['webp', 'avif', 'jpeg', 'png']
  private readonly defaultSizes = [320, 640, 768, 1024, 1280, 1920]

  async optimizeImage(
    inputBuffer: Buffer,
    options: ImageOptimizationOptions = {}
  ): Promise<Buffer> {
    const {
      width,
      height,
      quality = 85,
      format = 'webp',
      fit = 'cover',
      position = 'center',
      background = '#ffffff',
      blur,
      sharpen = false,
      grayscale = false,
      progressive = true,
    } = options

    let processor = sharp(inputBuffer)

    // Resize if dimensions specified
    if (width || height) {
      processor = processor.resize(width, height, {
        fit,
        position,
        background,
      })
    }

    // Apply filters
    if (blur) {
      processor = processor.blur(blur)
    }

    if (sharpen) {
      processor = processor.sharpen()
    }

    if (grayscale) {
      processor = processor.grayscale()
    }

    // Format-specific optimization
    switch (format) {
      case 'webp':
        processor = processor.webp({
          quality,
          progressive,
          effort: 6, // Maximum compression effort
        })
        break

      case 'avif':
        processor = processor.avif({
          quality,
          effort: 6,
        })
        break

      case 'jpeg':
        processor = processor.jpeg({
          quality,
          progressive,
          mozjpeg: true, // Use mozjpeg for better compression
        })
        break

      case 'png':
        processor = processor.png({
          progressive,
          compressionLevel: 9,
          palette: true, // Use palette-based PNG if possible
        })
        break
    }

    return await processor.toBuffer()
  }

  async generateResponsiveImageSet(
    originalBuffer: Buffer,
    baseName: string,
    options: Partial<ImageOptimizationOptions> = {}
  ): Promise<ResponsiveImageSet> {
    const formats = ['avif', 'webp', 'jpeg'] as const
    const sources: ResponsiveImageSet['sources'] = []

    for (const format of formats) {
      const srcsetEntries: string[] = []

      for (const size of this.defaultSizes) {
        try {
          const optimizedBuffer = await this.optimizeImage(originalBuffer, {
            ...options,
            width: size,
            format,
          })

          // Create file with format and size in name
          const fileName = `${baseName}-${size}w.${format}`
          const file = new File([optimizedBuffer], fileName, {
            type: `image/${format}`
          })

          const url = await cdnManager.uploadAsset(file, `images/${fileName}`)
          srcsetEntries.push(`${url} ${size}w`)
        } catch (error) {
          console.error(`Failed to generate ${format} at ${size}w:`, error)
        }
      }

      if (srcsetEntries.length > 0) {
        sources.push({
          srcset: srcsetEntries.join(', '),
          sizes: '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw',
          type: `image/${format}`,
        })
      }
    }

    // Generate fallback image
    const fallbackBuffer = await this.optimizeImage(originalBuffer, {
      ...options,
      width: 1024,
      format: 'jpeg',
    })

    const fallbackFile = new File([fallbackBuffer], `${baseName}-fallback.jpg`, {
      type: 'image/jpeg'
    })
    const fallbackUrl = await cdnManager.uploadAsset(fallbackFile, `images/${baseName}-fallback.jpg`)

    return {
      sources,
      fallback: {
        src: fallbackUrl,
        alt: baseName.replace(/-/g, ' '),
      },
    }
  }

  async processImageUpload(
    file: File,
    options: {
      generateResponsive?: boolean
      customSizes?: number[]
      preserveOriginal?: boolean
    } = {}
  ): Promise<{
    original?: string
    optimized: string
    responsive?: ResponsiveImageSet
  }> {
    const buffer = Buffer.from(await file.arrayBuffer())
    const baseName = file.name.replace(/\.[^/.]+$/, '')
    const timestamp = Date.now()
    const uniqueName = `${baseName}-${timestamp}`

    const results: any = {}

    // Upload original if requested
    if (options.preserveOriginal) {
      results.original = await cdnManager.uploadAsset(file, `originals/${file.name}`)
    }

    // Generate optimized version
    const optimizedBuffer = await this.optimizeImage(buffer, {
      quality: 85,
      format: 'webp',
      sharpen: true,
    })

    const optimizedFile = new File([optimizedBuffer], `${uniqueName}.webp`, {
      type: 'image/webp'
    })
    results.optimized = await cdnManager.uploadAsset(optimizedFile, `images/${uniqueName}.webp`)

    // Generate responsive set if requested
    if (options.generateResponsive) {
      results.responsive = await this.generateResponsiveImageSet(
        buffer,
        uniqueName,
        { quality: 85 }
      )
    }

    return results
  }

  // Image transformation for dynamic URLs
  getTransformUrl(
    originalUrl: string,
    transformations: ImageOptimizationOptions
  ): string {
    const url = new URL(originalUrl)
    const params = new URLSearchParams()

    if (transformations.width) params.set('w', transformations.width.toString())
    if (transformations.height) params.set('h', transformations.height.toString())
    if (transformations.quality) params.set('q', transformations.quality.toString())
    if (transformations.format) params.set('f', transformations.format)
    if (transformations.fit) params.set('fit', transformations.fit)
    if (transformations.blur) params.set('blur', transformations.blur.toString())
    if (transformations.grayscale) params.set('grayscale', 'true')

    // Cloudflare Image Resizing or similar transformation URLs
    return `${url.origin}/cdn-cgi/image/${params.toString()}${url.pathname}`
  }
}

export const imageOptimizer = new ImageOptimizationService()

// React component for responsive images
export function OptimizedImage({
  src,
  alt,
  width,
  height,
  className,
  priority = false,
  ...props
}: {
  src: string
  alt: string
  width?: number
  height?: number
  className?: string
  priority?: boolean
  [key: string]: any
}) {
  return (
    <picture className={className}>
      <source
        srcSet={imageOptimizer.getTransformUrl(src, { width, height, format: 'avif' })}
        type="image/avif"
      />
      <source
        srcSet={imageOptimizer.getTransformUrl(src, { width, height, format: 'webp' })}
        type="image/webp"
      />
      <img
        src={imageOptimizer.getTransformUrl(src, { width, height, format: 'jpeg' })}
        alt={alt}
        width={width}
        height={height}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        {...props}
      />
    </picture>
  )
}
```

#### 3. Video Streaming Optimization
```typescript
// lib/cdn/video-optimization.ts
import { cdnManager } from './provider-abstraction'

export interface VideoProcessingOptions {
  resolutions: Array<{
    width: number
    height: number
    bitrate: number
  }>
  format: 'mp4' | 'webm' | 'hls'
  quality: 'low' | 'medium' | 'high' | 'ultra'
  generateThumbnails?: boolean
  generatePreview?: boolean
  adaptiveBitrate?: boolean
}

export interface VideoDeliveryManifest {
  sources: Array<{
    src: string
    type: string
    resolution: string
    bitrate: number
  }>
  thumbnail?: string
  preview?: string
  duration: number
  hlsManifest?: string
}

class VideoOptimizationService {
  private readonly defaultResolutions = [
    { width: 426, height: 240, bitrate: 400 },   // 240p
    { width: 640, height: 360, bitrate: 800 },   // 360p
    { width: 854, height: 480, bitrate: 1200 },  // 480p
    { width: 1280, height: 720, bitrate: 2500 }, // 720p
    { width: 1920, height: 1080, bitrate: 4500 } // 1080p
  ]

  async processVideo(
    videoFile: File,
    options: VideoProcessingOptions
  ): Promise<VideoDeliveryManifest> {
    const videoBuffer = Buffer.from(await videoFile.arrayBuffer())
    const baseName = videoFile.name.replace(/\.[^/.]+$/, '')
    const timestamp = Date.now()
    const uniqueName = `${baseName}-${timestamp}`

    // Use FFmpeg for video processing
    const ffmpeg = (await import('fluent-ffmpeg')).default
    const sources: VideoDeliveryManifest['sources'] = []
    
    let duration = 0
    let thumbnail: string | undefined
    let preview: string | undefined

    try {
      // Get video metadata first
      duration = await this.getVideoDuration(videoBuffer)

      // Generate different resolutions
      for (const resolution of options.resolutions) {
        const outputPath = `videos/${uniqueName}-${resolution.height}p.mp4`
        
        try {
          const processedBuffer = await this.transcodeVideo(videoBuffer, {
            width: resolution.width,
            height: resolution.height,
            bitrate: resolution.bitrate,
            format: 'mp4'
          })

          const processedFile = new File(
            [processedBuffer], 
            `${uniqueName}-${resolution.height}p.mp4`,
            { type: 'video/mp4' }
          )

          const url = await cdnManager.uploadAsset(processedFile, outputPath)
          
          sources.push({
            src: url,
            type: 'video/mp4',
            resolution: `${resolution.width}x${resolution.height}`,
            bitrate: resolution.bitrate
          })
        } catch (error) {
          console.error(`Failed to process ${resolution.height}p:`, error)
        }
      }

      // Generate thumbnail at 5 second mark
      if (options.generateThumbnails) {
        try {
          const thumbnailBuffer = await this.generateVideoThumbnail(videoBuffer, 5)
          const thumbnailFile = new File([thumbnailBuffer], `${uniqueName}-thumb.jpg`, {
            type: 'image/jpeg'
          })
          thumbnail = await cdnManager.uploadAsset(thumbnailFile, `thumbnails/${uniqueName}-thumb.jpg`)
        } catch (error) {
          console.error('Thumbnail generation failed:', error)
        }
      }

      // Generate preview (first 10 seconds)
      if (options.generatePreview) {
        try {
          const previewBuffer = await this.generateVideoPreview(videoBuffer, 10)
          const previewFile = new File([previewBuffer], `${uniqueName}-preview.mp4`, {
            type: 'video/mp4'
          })
          preview = await cdnManager.uploadAsset(previewFile, `previews/${uniqueName}-preview.mp4`)
        } catch (error) {
          console.error('Preview generation failed:', error)
        }
      }

      // Generate HLS manifest if adaptive bitrate is enabled
      let hlsManifest: string | undefined
      if (options.adaptiveBitrate) {
        try {
          hlsManifest = await this.generateHLSManifest(sources, uniqueName)
        } catch (error) {
          console.error('HLS manifest generation failed:', error)
        }
      }

      return {
        sources: sources.sort((a, b) => a.bitrate - b.bitrate),
        thumbnail,
        preview,
        duration,
        hlsManifest
      }

    } catch (error) {
      console.error('Video processing failed:', error)
      throw error
    }
  }

  private async transcodeVideo(
    inputBuffer: Buffer,
    options: {
      width: number
      height: number
      bitrate: number
      format: string
    }
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const ffmpeg = require('fluent-ffmpeg')
      const chunks: Buffer[] = []

      ffmpeg()
        .input(inputBuffer)
        .videoCodec('libx264')
        .audioCodec('aac')
        .size(`${options.width}x${options.height}`)
        .videoBitrate(options.bitrate)
        .audioBitrate('128k')
        .format('mp4')
        .outputOptions([
          '-preset fast',
          '-crf 23',
          '-movflags +faststart', // Enable progressive download
          '-profile:v main',
          '-level 4.0'
        ])
        .on('error', reject)
        .on('end', () => {
          resolve(Buffer.concat(chunks))
        })
        .writeToStream(
          require('stream').Writable({
            write(chunk: any, encoding: any, callback: any) {
              chunks.push(chunk)
              callback()
            }
          })
        )
    })
  }

  private async getVideoDuration(videoBuffer: Buffer): Promise<number> {
    return new Promise((resolve, reject) => {
      const ffmpeg = require('fluent-ffmpeg')
      
      ffmpeg.ffprobe(videoBuffer, (err: any, metadata: any) => {
        if (err) {
          reject(err)
          return
        }
        
        const duration = metadata.format.duration || 0
        resolve(Math.round(duration))
      })
    })
  }

  private async generateVideoThumbnail(videoBuffer: Buffer, timeSeconds: number): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const ffmpeg = require('fluent-ffmpeg')
      const chunks: Buffer[] = []

      ffmpeg()
        .input(videoBuffer)
        .seekInput(timeSeconds)
        .frames(1)
        .format('image2')
        .size('1280x720')
        .outputOptions(['-vf', 'scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:-1:-1:black'])
        .on('error', reject)
        .on('end', () => {
          resolve(Buffer.concat(chunks))
        })
        .writeToStream(
          require('stream').Writable({
            write(chunk: any, encoding: any, callback: any) {
              chunks.push(chunk)
              callback()
            }
          })
        )
    })
  }

  private async generateVideoPreview(videoBuffer: Buffer, durationSeconds: number): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const ffmpeg = require('fluent-ffmpeg')
      const chunks: Buffer[] = []

      ffmpeg()
        .input(videoBuffer)
        .duration(durationSeconds)
        .videoCodec('libx264')
        .audioCodec('aac')
        .size('854x480')
        .videoBitrate(1000)
        .audioBitrate('96k')
        .format('mp4')
        .outputOptions([
          '-preset ultrafast',
          '-crf 28',
          '-movflags +faststart'
        ])
        .on('error', reject)
        .on('end', () => {
          resolve(Buffer.concat(chunks))
        })
        .writeToStream(
          require('stream').Writable({
            write(chunk: any, encoding: any, callback: any) {
              chunks.push(chunk)
              callback()
            }
          })
        )
    })
  }

  private async generateHLSManifest(
    sources: VideoDeliveryManifest['sources'],
    baseName: string
  ): Promise<string> {
    const manifestContent = sources.map(source => {
      const resolution = source.resolution.split('x')
      return `#EXT-X-STREAM-INF:BANDWIDTH=${source.bitrate * 1000},RESOLUTION=${source.resolution}\n${source.src}`
    }).join('\n')

    const fullManifest = `#EXTM3U
#EXT-X-VERSION:3
${manifestContent}`

    const manifestFile = new File([fullManifest], `${baseName}.m3u8`, {
      type: 'application/x-mpegURL'
    })

    return await cdnManager.uploadAsset(manifestFile, `manifests/${baseName}.m3u8`)
  }

  // Adaptive video player component integration
  getVideoPlayerConfig(manifest: VideoDeliveryManifest): any {
    return {
      sources: manifest.sources,
      poster: manifest.thumbnail,
      preload: 'metadata',
      controls: true,
      responsive: true,
      fluid: true,
      plugins: {
        qualitySelector: {
          default: 'auto'
        },
        chromecast: {},
        airplay: {}
      }
    }
  }
}

export const videoOptimizer = new VideoOptimizationService()
```

#### 4. Geographic Performance Optimization
```typescript
// lib/cdn/geo-optimization.ts
interface GeographicConfig {
  region: string
  cdnEndpoint: string
  compressionLevel: number
  cacheRules: CacheRule[]
  routingRules: RoutingRule[]
}

interface CacheRule {
  pathPattern: string
  ttl: number
  staleWhileRevalidate?: number
}

interface RoutingRule {
  condition: string
  action: 'redirect' | 'rewrite' | 'block'
  target?: string
}

class GeographicOptimizationService {
  private readonly regionConfigs: GeographicConfig[] = [
    {
      region: 'tr', // Turkey
      cdnEndpoint: 'https://tr-cdn.7peducation.com',
      compressionLevel: 9,
      cacheRules: [
        { pathPattern: '/api/courses*', ttl: 1800, staleWhileRevalidate: 300 },
        { pathPattern: '/images/*', ttl: 86400 },
        { pathPattern: '/videos/*', ttl: 604800 }, // 1 week
      ],
      routingRules: [
        {
          condition: 'country == "TR"',
          action: 'rewrite',
          target: '/tr{uri}'
        }
      ]
    },
    {
      region: 'eu', // Europe
      cdnEndpoint: 'https://eu-cdn.7peducation.com',
      compressionLevel: 8,
      cacheRules: [
        { pathPattern: '/api/courses*', ttl: 3600, staleWhileRevalidate: 600 },
        { pathPattern: '/images/*', ttl: 172800 }, // 2 days
        { pathPattern: '/videos/*', ttl: 604800 },
      ],
      routingRules: []
    },
    {
      region: 'us', // United States
      cdnEndpoint: 'https://us-cdn.7peducation.com',
      compressionLevel: 7,
      cacheRules: [
        { pathPattern: '/api/courses*', ttl: 3600 },
        { pathPattern: '/images/*', ttl: 259200 }, // 3 days
        { pathPattern: '/videos/*', ttl: 1209600 }, // 2 weeks
      ],
      routingRules: []
    }
  ]

  async getOptimalEndpoint(
    clientIP: string,
    userAgent: string
  ): Promise<GeographicConfig> {
    try {
      // Use IP geolocation service
      const geoData = await this.getGeolocationData(clientIP)
      const countryCode = geoData.country?.toLowerCase()
      
      // Connection quality assessment
      const connectionQuality = this.assessConnectionQuality(userAgent, geoData)
      
      // Find optimal configuration
      let config = this.regionConfigs.find(config => 
        config.region === countryCode
      )
      
      if (!config) {
        // Find closest region based on geography
        config = this.findClosestRegion(geoData.continent)
      }
      
      // Adjust configuration based on connection quality
      return this.adjustConfigForConnection(config, connectionQuality)
      
    } catch (error) {
      console.error('Geographic optimization failed:', error)
      // Fallback to default configuration
      return this.regionConfigs[0]
    }
  }

  private async getGeolocationData(ip: string): Promise<any> {
    try {
      // Use Cloudflare's CF-IPCountry header if available
      const response = await fetch(`https://ipapi.co/${ip}/json/`)
      return await response.json()
    } catch (error) {
      console.error('Geolocation lookup failed:', error)
      return { country: 'US', continent: 'NA' }
    }
  }

  private assessConnectionQuality(userAgent: string, geoData: any): 'low' | 'medium' | 'high' {
    // Assess based on various factors
    let score = 50 // Base score
    
    // Mobile devices typically have slower connections
    if (userAgent.includes('Mobile')) score -= 20
    
    // Developed countries typically have better infrastructure
    const developedCountries = ['US', 'CA', 'GB', 'DE', 'FR', 'JP', 'KR', 'AU']
    if (developedCountries.includes(geoData.country)) score += 20
    
    // Urban areas typically have better connections
    if (geoData.city && geoData.population > 1000000) score += 10
    
    if (score >= 70) return 'high'
    if (score >= 40) return 'medium'
    return 'low'
  }

  private findClosestRegion(continent: string): GeographicConfig {
    const continentMapping: Record<string, string> = {
      'NA': 'us', // North America
      'SA': 'us', // South America
      'EU': 'eu', // Europe
      'AS': 'eu', // Asia (closer to EU endpoint)
      'AF': 'eu', // Africa
      'OC': 'us', // Oceania
    }
    
    const regionCode = continentMapping[continent] || 'us'
    return this.regionConfigs.find(config => config.region === regionCode) || this.regionConfigs[0]
  }

  private adjustConfigForConnection(
    baseConfig: GeographicConfig,
    connectionQuality: 'low' | 'medium' | 'high'
  ): GeographicConfig {
    const adjustedConfig = { ...baseConfig }
    
    switch (connectionQuality) {
      case 'low':
        // Increase compression, reduce cache TTL for faster updates
        adjustedConfig.compressionLevel = Math.min(adjustedConfig.compressionLevel + 2, 9)
        adjustedConfig.cacheRules = baseConfig.cacheRules.map(rule => ({
          ...rule,
          ttl: Math.max(rule.ttl * 0.5, 300) // Reduce TTL but minimum 5 minutes
        }))
        break
        
      case 'high':
        // Reduce compression for faster processing, increase cache TTL
        adjustedConfig.compressionLevel = Math.max(adjustedConfig.compressionLevel - 1, 1)
        adjustedConfig.cacheRules = baseConfig.cacheRules.map(rule => ({
          ...rule,
          ttl: rule.ttl * 1.5 // Increase TTL
        }))
        break
    }
    
    return adjustedConfig
  }

  // Generate edge worker script for Cloudflare
  generateEdgeWorkerScript(): string {
    return `
      addEventListener('fetch', event => {
        event.respondWith(handleRequest(event.request))
      })

      async function handleRequest(request) {
        const url = new URL(request.url)
        const clientIP = request.headers.get('CF-Connecting-IP')
        const country = request.headers.get('CF-IPCountry')
        const userAgent = request.headers.get('User-Agent')

        // Geographic routing
        if (country === 'TR') {
          url.hostname = 'tr-cdn.7peducation.com'
        } else if (['DE', 'FR', 'GB', 'IT', 'ES'].includes(country)) {
          url.hostname = 'eu-cdn.7peducation.com'
        } else {
          url.hostname = 'us-cdn.7peducation.com'
        }

        // Apply compression based on connection quality
        const compressionLevel = getCompressionLevel(country, userAgent)
        
        const response = await fetch(url.toString(), {
          ...request,
          headers: {
            ...request.headers,
            'Accept-Encoding': \`gzip, deflate, br;q=\${compressionLevel/10}\`
          }
        })

        // Add performance headers
        const newResponse = new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: {
            ...response.headers,
            'X-Served-By': url.hostname,
            'X-Cache-Region': getRegionFromHostname(url.hostname),
            'Vary': 'Accept-Encoding, CF-IPCountry'
          }
        })

        return newResponse
      }

      function getCompressionLevel(country, userAgent) {
        let level = 6 // Default
        
        if (['TR'].includes(country)) level = 9
        else if (['DE', 'FR', 'GB'].includes(country)) level = 8
        else if (['US', 'CA'].includes(country)) level = 7
        
        if (userAgent.includes('Mobile')) level = Math.min(level + 1, 9)
        
        return level
      }

      function getRegionFromHostname(hostname) {
        if (hostname.includes('tr-cdn')) return 'turkey'
        if (hostname.includes('eu-cdn')) return 'europe'
        return 'americas'
      }
    `
  }
}

export const geoOptimizer = new GeographicOptimizationService()
```

### 🔧 Advanced CDN Features

#### 5. Real-time Performance Monitoring
```typescript
// lib/cdn/monitoring.ts
interface PerformanceMetrics {
  timestamp: number
  region: string
  responseTime: number
  bandwidth: number
  cacheHitRate: number
  errorRate: number
  throughput: number
}

class CDNPerformanceMonitor {
  private metrics: PerformanceMetrics[] = []
  private alertThresholds = {
    responseTime: 1000, // ms
    errorRate: 5, // percentage
    cacheHitRate: 85, // minimum percentage
  }

  async collectMetrics(): Promise<void> {
    try {
      const aggregated = await cdnManager.getAggregatedAnalytics('1h')
      
      const currentMetrics: PerformanceMetrics = {
        timestamp: Date.now(),
        region: 'global',
        responseTime: aggregated.avgResponseTime,
        bandwidth: aggregated.bandwidth,
        cacheHitRate: aggregated.cacheHitRate,
        errorRate: aggregated.errorRate,
        throughput: aggregated.requests / 3600, // requests per second
      }

      this.metrics.push(currentMetrics)
      
      // Keep only last 24 hours of metrics
      const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000)
      this.metrics = this.metrics.filter(m => m.timestamp > oneDayAgo)

      // Check for alerts
      await this.checkAlerts(currentMetrics)
      
    } catch (error) {
      console.error('Metrics collection failed:', error)
    }
  }

  private async checkAlerts(metrics: PerformanceMetrics): Promise<void> {
    const alerts: string[] = []

    if (metrics.responseTime > this.alertThresholds.responseTime) {
      alerts.push(`High response time: ${metrics.responseTime}ms`)
    }

    if (metrics.errorRate > this.alertThresholds.errorRate) {
      alerts.push(`High error rate: ${metrics.errorRate}%`)
    }

    if (metrics.cacheHitRate < this.alertThresholds.cacheHitRate) {
      alerts.push(`Low cache hit rate: ${metrics.cacheHitRate}%`)
    }

    if (alerts.length > 0) {
      await this.sendAlert(alerts, metrics)
    }
  }

  private async sendAlert(alerts: string[], metrics: PerformanceMetrics): Promise<void> {
    const alertMessage = {
      title: 'CDN Performance Alert',
      alerts,
      metrics,
      timestamp: new Date().toISOString(),
    }

    // Send to monitoring service (Slack, Discord, etc.)
    try {
      await fetch(process.env.ALERT_WEBHOOK_URL!, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(alertMessage),
      })
    } catch (error) {
      console.error('Alert sending failed:', error)
    }
  }

  getPerformanceReport(): {
    current: PerformanceMetrics | null
    averages: Partial<PerformanceMetrics>
    trends: Record<string, 'improving' | 'degrading' | 'stable'>
  } {
    if (this.metrics.length === 0) {
      return { current: null, averages: {}, trends: {} }
    }

    const current = this.metrics[this.metrics.length - 1]
    const averages = this.calculateAverages()
    const trends = this.calculateTrends()

    return { current, averages, trends }
  }

  private calculateAverages(): Partial<PerformanceMetrics> {
    if (this.metrics.length === 0) return {}

    const sums = this.metrics.reduce(
      (acc, metric) => ({
        responseTime: acc.responseTime + metric.responseTime,
        bandwidth: acc.bandwidth + metric.bandwidth,
        cacheHitRate: acc.cacheHitRate + metric.cacheHitRate,
        errorRate: acc.errorRate + metric.errorRate,
        throughput: acc.throughput + metric.throughput,
      }),
      { responseTime: 0, bandwidth: 0, cacheHitRate: 0, errorRate: 0, throughput: 0 }
    )

    const count = this.metrics.length
    return {
      responseTime: sums.responseTime / count,
      bandwidth: sums.bandwidth / count,
      cacheHitRate: sums.cacheHitRate / count,
      errorRate: sums.errorRate / count,
      throughput: sums.throughput / count,
    }
  }

  private calculateTrends(): Record<string, 'improving' | 'degrading' | 'stable'> {
    if (this.metrics.length < 10) return {}

    const recent = this.metrics.slice(-5)
    const older = this.metrics.slice(-10, -5)

    const recentAvg = {
      responseTime: recent.reduce((sum, m) => sum + m.responseTime, 0) / recent.length,
      cacheHitRate: recent.reduce((sum, m) => sum + m.cacheHitRate, 0) / recent.length,
      errorRate: recent.reduce((sum, m) => sum + m.errorRate, 0) / recent.length,
    }

    const olderAvg = {
      responseTime: older.reduce((sum, m) => sum + m.responseTime, 0) / older.length,
      cacheHitRate: older.reduce((sum, m) => sum + m.cacheHitRate, 0) / older.length,
      errorRate: older.reduce((sum, m) => sum + m.errorRate, 0) / older.length,
    }

    const getTrend = (recent: number, older: number, lowerIsBetter = false): 'improving' | 'degrading' | 'stable' => {
      const threshold = 0.05 // 5% change threshold
      const change = (recent - older) / older

      if (Math.abs(change) < threshold) return 'stable'
      
      return lowerIsBetter 
        ? (change < 0 ? 'improving' : 'degrading')
        : (change > 0 ? 'improving' : 'degrading')
    }

    return {
      responseTime: getTrend(recentAvg.responseTime, olderAvg.responseTime, true),
      cacheHitRate: getTrend(recentAvg.cacheHitRate, olderAvg.cacheHitRate),
      errorRate: getTrend(recentAvg.errorRate, olderAvg.errorRate, true),
    }
  }
}

export const cdnMonitor = new CDNPerformanceMonitor()

// Set up periodic monitoring
if (typeof window === 'undefined') {
  setInterval(() => {
    cdnMonitor.collectMetrics()
  }, 5 * 60 * 1000) // Every 5 minutes
}
```

## 💡 Öneriler ve Best Practices

### 🚀 Performance Optimization Tips
- **Multi-CDN Strategy**: Vendor lock-in'den kaçınmak için multiple CDN providers kullanın
- **Edge Computing**: Cloudflare Workers veya AWS Lambda@Edge ile dynamic content optimization
- **Intelligent Routing**: User location ve connection quality'ye göre optimal endpoint selection
- **Progressive Enhancement**: Modern format support detection ile fallback strategies

### 🔍 Monitoring ve Analytics
- **Real-time Alerts**: Critical performance degradation için immediate notification system
- **Cost Optimization**: Bandwidth usage tracking ve cost-per-GB optimization
- **User Experience Metrics**: Core Web Vitals integration ile performance tracking
- **A/B Testing**: Farklı CDN strategies'in performance comparison

### 🔒 Security ve Reliability
- **DDoS Protection**: CDN-level attack mitigation
- **SSL/TLS Optimization**: Modern cipher suites ve HTTP/3 support
- **Content Integrity**: Subresource Integrity (SRI) implementation
- **Failover Strategies**: Multi-CDN redundancy ile high availability

## 📊 Implementation Roadmap

### Phase 1: CDN Foundation (2 weeks)
- [ ] Multi-CDN provider setup
- [ ] Basic image optimization pipeline
- [ ] Geographic routing implementation
- [ ] Performance monitoring setup

### Phase 2: Advanced Optimization (2 weeks)
- [ ] Video streaming optimization
- [ ] Dynamic content edge caching
- [ ] Real-time invalidation system
- [ ] Advanced compression strategies

### Phase 3: Intelligence & Automation (1 week)
- [ ] AI-powered optimization
- [ ] Predictive caching strategies
- [ ] Automated failover systems
- [ ] Advanced analytics dashboard

### Phase 4: Scale & Cost Optimization (1 week)
- [ ] Cost optimization algorithms
- [ ] Performance benchmarking
- [ ] Security enhancement
- [ ] Documentation ve training

## 🔗 İlgili Dosyalar

- [Caching Strategy](./caching-strategy.md) - Application-level caching strategies
- [Image Optimization](../devops/asset-optimization.md) - Image processing workflows
- [Performance Monitoring](../analytics/performance-monitoring.md) - Performance tracking
- [Security Configuration](../security/cdn-security.md) - CDN security hardening
- [Cost Management](../devops/cost-optimization.md) - Infrastructure cost tracking
- [Video Streaming](./streaming-implementation.md) - Video delivery optimization

## 📚 Kaynaklar

### 📖 CDN Technologies
- [Cloudflare Documentation](https://developers.cloudflare.com/)
- [AWS CloudFront Guide](https://docs.aws.amazon.com/cloudfront/)
- [CDN Best Practices](https://developers.google.com/web/fundamentals/performance/optimizing-content-efficiency/http-caching)

### 🛠️ Optimization Tools
- [Image Optimization with Sharp](https://sharp.pixelplumbing.com/)
- [Video Processing with FFmpeg](https://ffmpeg.org/documentation.html)
- [Performance Testing Tools](https://web.dev/performance/)

### 📊 Analytics & Monitoring
- [Core Web Vitals](https://web.dev/vitals/)
- [CDN Performance Metrics](https://blog.cloudflare.com/tag/performance/)
- [Real User Monitoring](https://developers.google.com/web/tools/chrome-user-experience-report)

---

*Son güncelleme: ${new Date().toLocaleDateString('tr-TR')}*
*Doküman versiyonu: 1.0.0*
*İnceleme durumu: ✅ Tamamlandı*