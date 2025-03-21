/**
 * Interface for tracking and displaying user actions in the activity log
 *
 * @property {string} type - The category of activity (import, export, error, etc.)
 * @property {string} message - Descriptive text about what happened
 * @property {Date} timestamp - When the activity occurred
 */
export interface ActivityLog {
  type:
    | 'import' // File import operations
    | 'export' // File export operations
    | 'error' // Error conditions
    | 'categories' // Category-specific operations
    | 'products' // Product-specific operations
    | 'currencies' // Currency settings operations
    | 'settings'; // General settings operations
  message: string;
  timestamp: Date;
}
