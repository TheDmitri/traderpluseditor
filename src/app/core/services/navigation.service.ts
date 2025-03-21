// Angular imports
import { Injectable, signal } from '@angular/core';

// App imports
import { StorageService } from './storage.service';

/**
 * Storage key for sidebar state
 */
export enum NavigationStorageKey {
  SIDEBAR_STATE = 'traderplus_sidebar_expanded'
}

@Injectable({
  providedIn: 'root'
})
export class NavigationService {
  private expandedState = signal<boolean>(true);

  constructor(private storageService: StorageService) {
    this.loadSidebarState();
  }

  private loadSidebarState(): void {
    const savedState = localStorage.getItem(NavigationStorageKey.SIDEBAR_STATE);
    if (savedState !== null) {
      this.expandedState.set(savedState === 'true');
    }
  }

  private saveSidebarState(): void {
    localStorage.setItem(NavigationStorageKey.SIDEBAR_STATE, String(this.expandedState()));
  }

  isExpanded(): boolean {
    return this.expandedState();
  }

  toggleSidebar(): void {
    this.expandedState.update(state => !state);
    this.saveSidebarState();
  }
}
