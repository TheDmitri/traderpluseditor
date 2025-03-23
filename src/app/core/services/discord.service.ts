import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';

export interface DiscordServerData {
  approximate_member_count: number;
  approximate_presence_count: number;
}

interface CachedDiscordData extends DiscordServerData {
  timestamp: number;
}

@Injectable({
  providedIn: 'root'
})
export class DiscordService {
  private readonly DISCORD_API_URL = 'https://discord.com/api/v10/invites/2wShfqqgGA?with_counts=true';
  private readonly CACHE_KEY = 'discord_server_data';
  private readonly DEFAULT_MEMBER_COUNT = 4058;
  private readonly DEFAULT_PRESENCE_COUNT = 1636;

  constructor(private http: HttpClient) {}

  /**
   * Gets Discord server data, using cache when valid
   */
  getServerData(): Observable<DiscordServerData> {
    const cachedData = this.getCachedData();
    
    // If we have cached data and it's from today, return it
    if (cachedData && this.isCacheValid(cachedData.timestamp)) {
      return of({
        approximate_member_count: cachedData.approximate_member_count,
        approximate_presence_count: cachedData.approximate_presence_count
      });
    }
    
    // Otherwise fetch fresh data
    return this.fetchServerData();
  }

  /**
   * Fetches fresh data from Discord API
   */
  private fetchServerData(): Observable<DiscordServerData> {
    return this.http.get<any>(this.DISCORD_API_URL).pipe(
      map(response => ({
        approximate_member_count: response.approximate_member_count,
        approximate_presence_count: response.approximate_presence_count
      })),
      tap(data => this.cacheData(data)),
      catchError(error => {
        console.error('Error fetching Discord server data', error);
        // Return cached values on error if available
        const cachedData = this.getCachedData();
        if (cachedData) {
          return of({
            approximate_member_count: cachedData.approximate_member_count,
            approximate_presence_count: cachedData.approximate_presence_count
          });
        }
        // If no cached data, return default values
        return of({
          approximate_member_count: this.DEFAULT_MEMBER_COUNT,
          approximate_presence_count: this.DEFAULT_PRESENCE_COUNT
        });
      })
    );
  }

  /**
   * Retrieves cached Discord data from localStorage
   */
  private getCachedData(): CachedDiscordData | null {
    const storedData = localStorage.getItem(this.CACHE_KEY);
    return storedData ? JSON.parse(storedData) : null;
  }

  /**
   * Caches Discord data with current timestamp
   */
  private cacheData(data: DiscordServerData): void {
    const cachedData: CachedDiscordData = {
      ...data,
      timestamp: Date.now()
    };
    localStorage.setItem(this.CACHE_KEY, JSON.stringify(cachedData));
  }

  /**
   * Checks if cached data is from the current day
   */
  private isCacheValid(timestamp: number): boolean {
    const cachedDate = new Date(timestamp);
    const currentDate = new Date();
    
    // Check if the cached data is from the same day
    return cachedDate.getDate() === currentDate.getDate() &&
           cachedDate.getMonth() === currentDate.getMonth() &&
           cachedDate.getFullYear() === currentDate.getFullYear();
  }
}
