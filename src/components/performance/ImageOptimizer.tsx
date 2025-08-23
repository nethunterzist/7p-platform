'use client';

import Image from 'next/image';
import { useState, useRef, useEffect } from 'react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  sizes?: string;
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
  quality?: number;
  loading?: 'lazy' | 'eager';
}

// Optimized image component with WebP, AVIF support and progressive loading
export function OptimizedImage({
  src,
  alt,
  width,
  height,
  className = '',
  priority = false,
  sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
  placeholder = 'blur',
  blurDataURL,
  quality = 85,
  loading = 'lazy',
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Generate low-quality placeholder if not provided
  const defaultBlurDataURL = blurDataURL || `data:image/svg+xml;base64,${Buffer.from(
    `<svg width="${width || 400}" height="${height || 300}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#f3f4f6"/>
      <text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="#9ca3af" font-size="14">
        Loading...
      </text>
    </svg>`
  ).toString('base64')}`;

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        priority={priority}
        sizes={sizes}
        placeholder={placeholder}
        blurDataURL={placeholder === 'blur' ? defaultBlurDataURL : undefined}
        quality={quality}
        loading={loading}
        className={`transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
        style={{
          objectFit: 'cover',
        }}
      />
      
      {/* Loading placeholder */}
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 bg-gray-100 animate-pulse flex items-center justify-center">
          <div className="text-gray-400 text-sm">Yükleniyor...</div>
        </div>
      )}
      
      {/* Error fallback */}
      {hasError && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
          <div className="text-gray-400 text-sm">Resim yüklenemedi</div>
        </div>
      )}
    </div>
  );
}

// Lazy loading image with intersection observer
export function LazyImage({
  src,
  alt,
  width,
  height,
  className = '',
  threshold = 0.1,
  rootMargin = '50px',
  ...props
}: OptimizedImageProps & {
  threshold?: number;
  rootMargin?: string;
}) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      {
        threshold,
        rootMargin,
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  return (
    <div ref={imgRef} className={`relative ${className}`} style={{ width, height }}>
      {isVisible ? (
        <OptimizedImage
          src={src}
          alt={alt}
          width={width}
          height={height}
          className="w-full h-full"
          loading="lazy"
          onLoad={() => setIsLoaded(true)}
          {...props}
        />
      ) : (
        <div 
          className="w-full h-full bg-gray-100 animate-pulse flex items-center justify-center"
          style={{ width, height }}
        >
          <div className="text-gray-400 text-sm">Yükleniyor...</div>
        </div>
      )}
    </div>
  );
}

// Progressive image enhancement component
export function ProgressiveImage({
  src,
  alt,
  lowQualitySrc,
  width,
  height,
  className = '',
  ...props
}: OptimizedImageProps & {
  lowQualitySrc?: string;
}) {
  const [isHighQualityLoaded, setIsHighQualityLoaded] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(lowQualitySrc || src);

  useEffect(() => {
    if (lowQualitySrc) {
      // Preload high quality image
      const img = new window.Image();
      img.onload = () => {
        setCurrentSrc(src);
        setIsHighQualityLoaded(true);
      };
      img.src = src;
    }
  }, [src, lowQualitySrc]);

  return (
    <OptimizedImage
      src={currentSrc}
      alt={alt}
      width={width}
      height={height}
      className={`transition-all duration-500 ${
        isHighQualityLoaded ? 'filter-none' : 'filter blur-sm'
      } ${className}`}
      {...props}
    />
  );
}

// Image gallery with optimized loading
export function OptimizedImageGallery({
  images,
  className = '',
}: {
  images: Array<{
    src: string;
    alt: string;
    width?: number;
    height?: number;
  }>;
  className?: string;
}) {
  const [visibleImages, setVisibleImages] = useState(3); // Load first 3 images

  const loadMoreImages = () => {
    setVisibleImages(prev => Math.min(prev + 3, images.length));
  };

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ${className}`}>
      {images.slice(0, visibleImages).map((image, index) => (
        <LazyImage
          key={index}
          src={image.src}
          alt={image.alt}
          width={image.width || 400}
          height={image.height || 300}
          className="rounded-lg shadow-md"
          priority={index < 2} // Priority for first 2 images
        />
      ))}
      
      {visibleImages < images.length && (
        <button
          onClick={loadMoreImages}
          className="col-span-full mt-4 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Daha Fazla Göster ({images.length - visibleImages} kalan)
        </button>
      )}
    </div>
  );
}