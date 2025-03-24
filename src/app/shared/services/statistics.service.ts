import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

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

  private loadStatistics(): void {
    try {
      const storedData = localStorage.getItem(this.STORAGE_KEY);
      if (storedData) {
        const statistics: Statistics = JSON.parse(storedData);
        this.statisticsSubject.next(statistics);
      }
    } catch (error) {
      console.error('Error loading statistics from localStorage', error);
      // If there's an error, use default values
      this.statisticsSubject.next(this.getDefaultStatistics());
    }
  }

  private saveStatistics(statistics: Statistics): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(statistics));
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
