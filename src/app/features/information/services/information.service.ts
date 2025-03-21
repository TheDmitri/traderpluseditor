import { Injectable } from '@angular/core';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class InformationService {
  private appVersion = environment.version;

  constructor() {}

  getAppVersion(): string {
    return this.appVersion;
  }

  // Business logic for handling external URLs could be added here
  openExternalLink(url: string): void {
    window.open(url, '_blank');
  }

  // Could be extended with methods to check for updates, etc.
  checkForUpdates(): Promise<boolean> {
    // Simulated check - would be implemented with real API call
    return Promise.resolve(false);
  }
}
