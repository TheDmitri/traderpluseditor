import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { ActivityLog } from '../models/activity-log.model';

@Injectable({
  providedIn: 'root',
})
export class ActivityLogService {
  private readonly MAX_LOG_ENTRIES = 10;
  private activityLogSubject = new BehaviorSubject<ActivityLog[]>([]);

  /**
   * Logs an activity for display in the recent activity section
   * Keeps a limited history of the most recent operations
   *
   * @param {ActivityLog['type']} type - The type of activity being logged
   * @param {string} message - A descriptive message about the activity
   */
  logActivity(type: ActivityLog['type'], message: string): void {
    const currentLogs = this.activityLogSubject.value;
    const newLogs = [
      {
        type,
        message,
        timestamp: new Date(),
      },
      ...currentLogs,
    ].slice(0, this.MAX_LOG_ENTRIES);

    this.activityLogSubject.next(newLogs);
  }

  /**
   * Returns the appropriate Material icon name for each activity type
   * Used to visually distinguish different types of activities in the log
   *
   * @param {string} type - The type of activity
   * @returns {string} The name of the Material icon to display
   */
  getActivityIcon(type: string): string {
    switch (type) {
      case 'import':
        return 'file_upload';
      case 'export':
        return 'file_download';
      case 'error':
        return 'error';
      case 'categories':
        return 'category';
      case 'products':
        return 'inventory_2';
      case 'currencies':
        return 'payments';
      case 'settings':
        return 'settings';
      default:
        return 'circle';
    }
  }

  /**
   * Gets the current activity log as an observable
   * @returns Observable of ActivityLog array
   */
  getActivityLog(): Observable<ActivityLog[]> {
    return this.activityLogSubject.asObservable();
  }

  /**
   * Gets the current activity log as a snapshot array
   * @returns Current ActivityLog array
   */
  getActivityLogSnapshot(): ActivityLog[] {
    return this.activityLogSubject.value;
  }
}
