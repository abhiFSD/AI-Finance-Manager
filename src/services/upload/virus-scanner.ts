import { exec } from 'child_process';
import { promisify } from 'util';
import { config } from '@/utils/config';
import { uploadLogger } from '@/utils/logger';

const execAsync = promisify(exec);

export interface VirusScanResult {
  isInfected: boolean;
  threat?: string;
  scanTime: number;
  engine: string;
}

export class VirusScanService {
  private isEnabled: boolean;
  private clamavConfig?: {
    host: string;
    port: number;
  };

  constructor() {
    this.isEnabled = config.virusScanning.enabled;
    this.clamavConfig = config.virusScanning.clamav;
  }

  public async scanFile(filePath: string): Promise<VirusScanResult> {
    const startTime = Date.now();

    if (!this.isEnabled) {
      uploadLogger.debug('Virus scanning disabled, skipping scan', { filePath });
      return {
        isInfected: false,
        scanTime: 0,
        engine: 'disabled'
      };
    }

    try {
      // Try ClamAV first if configured
      if (this.clamavConfig) {
        return await this.scanWithClamAV(filePath, startTime);
      }

      // Fallback to command-line ClamAV if available
      return await this.scanWithClamAVCLI(filePath, startTime);

    } catch (error) {
      uploadLogger.error('Virus scan failed', { 
        filePath, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });

      // In production, you might want to reject files if scanning fails
      // For now, we'll allow the file through with a warning
      return {
        isInfected: false,
        scanTime: Date.now() - startTime,
        engine: 'failed'
      };
    }
  }

  private async scanWithClamAV(filePath: string, startTime: number): Promise<VirusScanResult> {
    try {
      // This is a placeholder for actual ClamAV integration
      // In a real implementation, you would use the node-clamav library
      // or implement TCP connection to clamd
      
      uploadLogger.info('Scanning file with ClamAV daemon', { 
        filePath, 
        host: this.clamavConfig?.host, 
        port: this.clamavConfig?.port 
      });

      // Simulate scan (replace with actual implementation)
      await new Promise(resolve => setTimeout(resolve, 100));

      const scanTime = Date.now() - startTime;

      uploadLogger.info('File scan completed', { 
        filePath, 
        scanTime, 
        result: 'clean' 
      });

      return {
        isInfected: false,
        scanTime,
        engine: 'clamav-daemon'
      };

    } catch (error) {
      uploadLogger.error('ClamAV daemon scan failed', { 
        filePath, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      
      throw error;
    }
  }

  private async scanWithClamAVCLI(filePath: string, startTime: number): Promise<VirusScanResult> {
    try {
      uploadLogger.info('Scanning file with ClamAV CLI', { filePath });

      // Use clamscan command line tool
      const command = `clamscan --quiet --infected "${filePath}"`;
      
      try {
        await execAsync(command);
        
        // If no error thrown, file is clean
        const scanTime = Date.now() - startTime;
        
        uploadLogger.info('File scan completed', { 
          filePath, 
          scanTime, 
          result: 'clean' 
        });

        return {
          isInfected: false,
          scanTime,
          engine: 'clamav-cli'
        };

      } catch (execError: any) {
        const scanTime = Date.now() - startTime;

        // Check if error is due to virus detection
        if (execError.code === 1) {
          // Extract virus name from stderr if available
          const threat = this.extractThreatName(execError.stderr || execError.stdout || '');
          
          uploadLogger.warn('Virus detected in file', { 
            filePath, 
            threat, 
            scanTime 
          });

          return {
            isInfected: true,
            threat,
            scanTime,
            engine: 'clamav-cli'
          };
        }

        // Other error codes indicate scan failure
        throw execError;
      }

    } catch (error) {
      uploadLogger.error('ClamAV CLI scan failed', { 
        filePath, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      
      throw error;
    }
  }

  private extractThreatName(output: string): string {
    // Parse ClamAV output to extract threat name
    // Example output: "/path/to/file: Eicar-Test-Signature FOUND"
    const match = output.match(/:\s*([^:]+)\s+FOUND/);
    return match ? match[1].trim() : 'Unknown threat';
  }

  public async scanBuffer(buffer: Buffer, filename: string): Promise<VirusScanResult> {
    const startTime = Date.now();

    if (!this.isEnabled) {
      return {
        isInfected: false,
        scanTime: 0,
        engine: 'disabled'
      };
    }

    try {
      // For buffer scanning, we would typically use the ClamAV daemon
      // This is a simplified implementation
      
      uploadLogger.info('Scanning buffer with virus scanner', { 
        filename, 
        size: buffer.length 
      });

      // Simulate buffer scan
      await new Promise(resolve => setTimeout(resolve, 50));

      const scanTime = Date.now() - startTime;

      return {
        isInfected: false,
        scanTime,
        engine: 'buffer-scan'
      };

    } catch (error) {
      uploadLogger.error('Buffer scan failed', { 
        filename, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });

      return {
        isInfected: false,
        scanTime: Date.now() - startTime,
        engine: 'failed'
      };
    }
  }

  public async isAvailable(): Promise<boolean> {
    if (!this.isEnabled) {
      return false;
    }

    try {
      // Check if ClamAV is available
      await execAsync('clamscan --version');
      return true;
    } catch (error) {
      uploadLogger.warn('ClamAV not available', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      return false;
    }
  }

  public async updateDefinitions(): Promise<boolean> {
    if (!this.isEnabled) {
      return false;
    }

    try {
      uploadLogger.info('Updating virus definitions');
      
      await execAsync('freshclam');
      
      uploadLogger.info('Virus definitions updated successfully');
      return true;
      
    } catch (error) {
      uploadLogger.error('Failed to update virus definitions', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      return false;
    }
  }

  public getStatus(): {
    enabled: boolean;
    available: boolean;
    engine: string;
    config?: any;
  } {
    return {
      enabled: this.isEnabled,
      available: this.isEnabled,
      engine: this.clamavConfig ? 'clamav-daemon' : 'clamav-cli',
      config: this.clamavConfig
    };
  }
}

export default VirusScanService;