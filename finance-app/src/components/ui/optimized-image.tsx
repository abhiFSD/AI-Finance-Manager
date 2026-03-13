'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image, { ImageProps } from 'next/image';
import { cn } from '@/lib/utils';
import { useResponsiveImage } from '@/lib/cdn';

interface OptimizedImageProps extends Omit<ImageProps, 'src' | 'srcSet' | 'sizes'> {
  src: string;
  alt: string;
  lazy?: boolean;
  placeholderDataUrl?: string;
  aspectRatio?: number;
  breakpoints?: number[];
  onLoad?: () => void;
  onError?: () => void;
  className?: string;
  fallbackSrc?: string;
  enableWebP?: boolean;
  enableAVIF?: boolean;
}

/**
 * Highly optimized image component with lazy loading, responsive sizing,
 * and modern format support (WebP, AVIF)
 */
export function OptimizedImage({
  src,
  alt,
  lazy = true,
  placeholderDataUrl,
  aspectRatio,
  breakpoints = [320, 640, 960, 1280, 1920],
  onLoad,
  onError,
  className,
  fallbackSrc,
  enableWebP = true,
  enableAVIF = true,
  priority = false,
  fill = false,
  ...props
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(!lazy || priority);
  const imgRef = useRef<HTMLDivElement>(null);
  
  const { src: optimizedSrc, srcSet, sizes } = useResponsiveImage(src, breakpoints);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!lazy || priority || isInView) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '50px', // Load images 50px before they come into view
        threshold: 0
      }
    );

    const currentRef = imgRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [lazy, priority, isInView]);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  const imageWrapperClass = cn(
    'relative overflow-hidden',
    {
      'bg-gray-200 animate-pulse': !isLoaded && !hasError,
      'bg-gray-100': hasError,
    },
    className
  );

  const shouldRender = isInView || priority;

  return (
    <div
      ref={imgRef}
      className={imageWrapperClass}
      style={{
        aspectRatio: aspectRatio ? `${aspectRatio}` : undefined,
      }}
    >
      {/* Placeholder while loading */}
      {!isLoaded && !hasError && placeholderDataUrl && (
        <Image
          src={placeholderDataUrl}
          alt=""
          fill={fill}
          className="blur-sm transition-opacity duration-300"
          {...props}
        />
      )}

      {/* Main image */}
      {shouldRender && !hasError && (
        <picture>
          {/* AVIF format for modern browsers */}
          {enableAVIF && (
            <source
              srcSet={srcSet.replace(/\.(jpg|jpeg|png)/g, '.avif')}
              sizes={sizes}
              type="image/avif"
            />
          )}
          
          {/* WebP format for better compression */}
          {enableWebP && (
            <source
              srcSet={srcSet.replace(/\.(jpg|jpeg|png)/g, '.webp')}
              sizes={sizes}
              type="image/webp"
            />
          )}
          
          {/* Fallback to original format */}
          <Image
            src={optimizedSrc}
            alt={alt}
            fill={fill}
            sizes={sizes}
            priority={priority}
            onLoad={handleLoad}
            onError={handleError}
            className={cn(
              'transition-opacity duration-300',
              {
                'opacity-0': !isLoaded,
                'opacity-100': isLoaded,
              }
            )}
            {...props}
          />
        </picture>
      )}

      {/* Error fallback */}
      {hasError && fallbackSrc && (
        <Image
          src={fallbackSrc}
          alt={alt}
          fill={fill}
          className="opacity-50"
          {...props}
        />
      )}

      {/* Error state without fallback */}
      {hasError && !fallbackSrc && (
        <div className="flex items-center justify-center h-full bg-gray-100 text-gray-400 text-sm">
          Failed to load image
        </div>
      )}

      {/* Loading indicator */}
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}

/**
 * Specialized image component for avatars with automatic fallback
 */
export function OptimizedAvatar({
  src,
  alt,
  size = 40,
  className,
  fallback,
  ...props
}: {
  src?: string;
  alt: string;
  size?: number;
  className?: string;
  fallback?: string;
} & Partial<OptimizedImageProps>) {
  const [hasError, setHasError] = useState(false);

  const avatarFallback = fallback || alt.charAt(0).toUpperCase();

  if (!src || hasError) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-full bg-gray-200 text-gray-600 font-medium',
          className
        )}
        style={{ width: size, height: size, fontSize: size * 0.4 }}
      >
        {avatarFallback}
      </div>
    );
  }

  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={cn('rounded-full', className)}
      onError={() => setHasError(true)}
      breakpoints={[size * 1, size * 2, size * 3]} // Generate appropriate sizes for avatar
      {...props}
    />
  );
}

/**
 * Gallery image with zoom functionality
 */
export function OptimizedGalleryImage({
  src,
  alt,
  thumbnailSrc,
  onZoom,
  className,
  ...props
}: OptimizedImageProps & {
  thumbnailSrc?: string;
  onZoom?: () => void;
}) {
  const [isZoomed, setIsZoomed] = useState(false);

  const handleClick = () => {
    setIsZoomed(!isZoomed);
    onZoom?.();
  };

  return (
    <div className={cn('relative cursor-pointer group', className)} onClick={handleClick}>
      <OptimizedImage
        src={thumbnailSrc || src}
        alt={alt}
        className="transition-transform duration-200 group-hover:scale-105"
        {...props}
      />
      
      {/* Zoom overlay */}
      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity duration-200 flex items-center justify-center">
        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-2 bg-white rounded-full">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
          </svg>
        </div>
      </div>
    </div>
  );
}

/**
 * Hero image with multiple focal points for different screen sizes
 */
export function OptimizedHeroImage({
  src,
  alt,
  mobileFocalPoint = 'center center',
  desktopFocalPoint = 'center center',
  className,
  ...props
}: OptimizedImageProps & {
  mobileFocalPoint?: string;
  desktopFocalPoint?: string;
}) {
  return (
    <div className={cn('relative w-full h-full', className)}>
      {/* Mobile version */}
      <OptimizedImage
        src={src}
        alt={alt}
        fill
        className="object-cover md:hidden"
        style={{ objectPosition: mobileFocalPoint }}
        breakpoints={[640]}
        {...props}
      />
      
      {/* Desktop version */}
      <OptimizedImage
        src={src}
        alt={alt}
        fill
        className="object-cover hidden md:block"
        style={{ objectPosition: desktopFocalPoint }}
        breakpoints={[960, 1280, 1920]}
        {...props}
      />
    </div>
  );
}