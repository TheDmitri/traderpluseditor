import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { compressObject, decompressObject } from '../utils/zip.utils';

export interface Statistics {
  createdFileSets: number;
  exportedFiles: number;
  lastUpdated: number;
}

@Injectable({
  providedIn: 'root'
})
export class StatisticsService {
  private readonly STORAGE_KEY = 'traderplus_statistics';
  private readonly COMPRESSION_ENABLED = true;
  
  private statisticsSubject = new BehaviorSubject<Statistics>(this.getDefaultStatistics());
  
  constructor() {
    this.loadStatistics();
  }

  private getDefaultStatistics(): Statistics {
    return {
      createdFileSets: 0,
      exportedFiles: 0,
      lastUpdated: Date.now()
    };
  }

  private async loadStatistics(): Promise<void> {
    try {
      const storedData = localStorage.getItem(this.STORAGE_KEY);
      if (!storedData) {
        return;
      }
      
      // Check if data is compressed (starts with 'UEs' which is part of the ZIP file signature in base64)
      if (this.COMPRESSION_ENABLED && storedData.startsWith('UEs')) {
        // This appears to be compressed data
        try {
          const decompressedData = await decompressObject<Statistics>(storedData);
          this.statisticsSubject.next(decompressedData);
        } catch (error) {
          console.error('Error decompressing statistics:', error);
          // Fallback to treating as uncompressed
          const parsedStats = JSON.parse(storedData) as Statistics;
          this.statisticsSubject.next(parsedStats);
          
          // Migrate to compressed format
          this.saveStatistics(parsedStats);
        }
      } else {
        // Treat as uncompressed data
        const parsedStats = JSON.parse(storedData) as Statistics;
        this.statisticsSubject.next(parsedStats);
        
        // Migrate to compressed format if compression is enabled
        if (this.COMPRESSION_ENABLED) {
          this.saveStatistics(parsedStats);
        }
      }
    } catch (error) {
      console.error('Error loading statistics from localStorage', error);
      // If there's an error, use default values
      this.statisticsSubject.next(this.getDefaultStatistics());
    }
  }

  private async saveStatistics(statistics: Statistics): Promise<void> {
    try {
      if (this.COMPRESSION_ENABLED) {
        // Compress the statistics object
        const compressedData = await compressObject(statistics);
        localStorage.setItem(this.STORAGE_KEY, compressedData);
      } else {
        // Fallback to uncompressed if needed
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(statistics));
      }
    } catch (error) {
      console.error('Error saving statistics to localStorage', error);
    }
  }

  getStatistics(): Observable<Statistics> {
    return this.statisticsSubject.asObservable();
  }

  getCurrentStatistics(): Statistics {
    return this.statisticsSubject.getValue();
  }

  incrementFileSetCount(): void {
    const currentStats = this.statisticsSubject.getValue();
    const updatedStats: Statistics = {
      ...currentStats,
      createdFileSets: currentStats.createdFileSets + 1,
      lastUpdated: Date.now()
    };
    
    this.statisticsSubject.next(updatedStats);
    this.saveStatistics(updatedStats);
  }

  incrementExportedFilesCount(count: number = 1): void {
    const currentStats = this.statisticsSubject.getValue();
    const updatedStats: Statistics = {
      ...currentStats,
      exportedFiles: currentStats.exportedFiles + count,
      lastUpdated: Date.now()
    };
    
    this.statisticsSubject.next(updatedStats);
    this.saveStatistics(updatedStats);
  }

  /**
   * Resets all statistics to zero
   */
  resetStatistics(): void {
    const resetStats: Statistics = {
      createdFileSets: 0,
      exportedFiles: 0,
      lastUpdated: Date.now()
    };
    
    this.statisticsSubject.next(resetStats);
    this.saveStatistics(resetStats);
  }
}
