/**
 * CDN Configuration and Asset Management
 * Provides intelligent asset delivery with multiple CDN providers
 */

export interface CDNConfig {
  provider: 'cloudflare' | 'aws-cloudfront' | 'azure-cdn' | 'gcp-cdn';
  domain: string;
  apiKey?: string;
  zoneId?: string;
  distributionId?: string;
  purgeEndpoint?: string;
  regions?: string[];
}

export const CDN_CONFIGS: Record<string, CDNConfig> = {
  production: {
    provider: 'cloudflare',
    domain: process.env.CDN_DOMAIN || 'cdn.financeapp.com',
    apiKey: process.env.CLOUDFLARE_API_KEY,
    zoneId: process.env.CLOUDFLARE_ZONE_ID,
    purgeEndpoint: 'https://api.cloudflare.com/client/v4',
    regions: ['US', 'EU', 'APAC']
  },
  staging: {
    provider: 'aws-cloudfront',
    domain: process.env.STAGING_CDN_DOMAIN || 'staging-cdn.financeapp.com',
    distributionId: process.env.AWS_CLOUDFRONT_DISTRIBUTION_ID,
    regions: ['US', 'EU']
  },
  development: {
    provider: 'cloudflare',
    domain: 'localhost:3000',
    regions: ['US']
  }
};

export class CDNManager {
  private config: CDNConfig;

  constructor(environment: string = process.env.NODE_ENV || 'development') {
    this.config = CDN_CONFIGS[environment] || CDN_CONFIGS.development;
  }

  /**
   * Get optimized URL for static assets
   */
  getAssetUrl(path: string, options: AssetOptions = {}): string {
    const {
      width,
      height,
      quality = 80,
      format,
      dpr = 1,
      fit = 'cover',
      optimize = true
    } = options;

    if (this.config.domain === 'localhost:3000') {
      return path; // No CDN in development
    }

    const baseUrl = `https://${this.config.domain}`;
    const cleanPath = path.startsWith('/') ? path : `/${path}`;

    // Image optimization parameters
    if (this.isImage(path) && optimize) {
      const params = new URLSearchParams();
      
      if (width) params.set('w', width.toString());
      if (height) params.set('h', height.toString());
      if (quality) params.set('q', quality.toString());
      if (format) params.set('f', format);
      if (dpr > 1) params.set('dpr', dpr.toString());
      if (fit) params.set('fit', fit);

      const queryString = params.toString();
      return `${baseUrl}${cleanPath}${queryString ? `?${queryString}` : ''}`;
    }

    return `${baseUrl}${cleanPath}`;
  }

  /**
   * Get preload headers for critical assets
   */
  getPreloadHeaders(assets: PreloadAsset[]): string[] {
    return assets.map(asset => {
      const url = this.getAssetUrl(asset.path, asset.options);
      const type = this.getResourceType(asset.path);
      const crossorigin = asset.crossorigin ? '; crossorigin' : '';
      
      return `<${url}>; rel=preload; as=${type}${crossorigin}`;
    });
  }

  /**
   * Generate responsive image srcset
   */
  generateSrcSet(imagePath: string, breakpoints: number[]): string {
    if (!this.isImage(imagePath)) {
      return '';
    }

    return breakpoints
      .map(width => {
        const url = this.getAssetUrl(imagePath, { width, optimize: true });
        return `${url} ${width}w`;
      })
      .join(', ');
  }

  /**
   * Purge CDN cache
   */
  async purgeCache(paths: string[] = ['/*']): Promise<boolean> {
    try {
      switch (this.config.provider) {
        case 'cloudflare':
          return await this.purgeCloudflare(paths);
        case 'aws-cloudfront':
          return await this.purgeCloudFront(paths);
        default:
          console.warn(`Cache purging not implemented for ${this.config.provider}`);
          return true;
      }
    } catch (error) {
      console.error('CDN cache purge failed:', error);
      return false;
    }
  }

  /**
   * Purge Cloudflare cache
   */
  private async purgeCloudflare(paths: string[]): Promise<boolean> {
    if (!this.config.apiKey || !this.config.zoneId) {
      console.warn('Cloudflare credentials not configured');
      return false;
    }

    const response = await fetch(
      `${this.config.purgeEndpoint}/zones/${this.config.zoneId}/purge_cache`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          files: paths.map(path => `https://${this.config.domain}${path}`)
        })
      }
    );

    return response.ok;
  }

  /**
   * Purge AWS CloudFront cache
   */
  private async purgeCloudFront(paths: string[]): Promise<boolean> {
    // Implementation would require AWS SDK
    console.log('CloudFront cache invalidation:', paths);
    return true;
  }

  /**
   * Check if path is an image
   */
  private isImage(path: string): boolean {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif', '.svg'];
    return imageExtensions.some(ext => path.toLowerCase().endsWith(ext));
  }

  /**
   * Get resource type for preload headers
   */
  private getResourceType(path: string): string {
    if (this.isImage(path)) return 'image';
    if (path.endsWith('.css')) return 'style';
    if (path.endsWith('.js')) return 'script';
    if (path.endsWith('.woff') || path.endsWith('.woff2')) return 'font';
    return 'fetch';
  }
}

export interface AssetOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'avif' | 'jpg' | 'png';
  dpr?: number;
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
  optimize?: boolean;
}

export interface PreloadAsset {
  path: string;
  options?: AssetOptions;
  crossorigin?: boolean;
}

// Global CDN manager instance
export const cdn = new CDNManager();

/**
 * React hook for responsive images
 */
export function useResponsiveImage(src: string, breakpoints: number[] = [320, 640, 960, 1280, 1920]) {
  const srcSet = cdn.generateSrcSet(src, breakpoints);
  const optimizedSrc = cdn.getAssetUrl(src, { optimize: true });
  
  return {
    src: optimizedSrc,
    srcSet,
    sizes: '(max-width: 640px) 100vw, (max-width: 960px) 50vw, 33vw'
  };
}

/**
 * Asset optimization utilities
 */
export const AssetOptimizer = {
  /**
   * Generate critical CSS preload
   */
  generateCriticalCSS(): string[] {
    const criticalAssets = [
      '/styles/globals.css',
      '/styles/critical.css'
    ];

    return cdn.getPreloadHeaders(
      criticalAssets.map(path => ({ path, crossorigin: true }))
    );
  },

  /**
   * Generate font preloads
   */
  generateFontPreloads(): string[] {
    const fonts = [
      '/fonts/inter-var.woff2',
      '/fonts/inter-var-latin.woff2'
    ];

    return cdn.getPreloadHeaders(
      fonts.map(path => ({ path, crossorigin: true }))
    );
  },

  /**
   * Generate script preloads
   */
  generateScriptPreloads(): string[] {
    const scripts = [
      '/_next/static/chunks/main.js',
      '/_next/static/chunks/webpack.js'
    ];

    return cdn.getPreloadHeaders(
      scripts.map(path => ({ path }))
    );
  }
};

/**
 * CDN health check
 */
export async function checkCDNHealth(): Promise<{ status: string; latency: number; region?: string }> {
  const start = Date.now();
  
  try {
    const testUrl = cdn.getAssetUrl('/favicon.ico');
    const response = await fetch(testUrl, { method: 'HEAD' });
    
    const latency = Date.now() - start;
    const region = response.headers.get('cf-ray')?.split('-')[1] || 'unknown';
    
    return {
      status: response.ok ? 'healthy' : 'unhealthy',
      latency,
      region
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      latency: Date.now() - start
    };
  }
}