/**
 * Represents a saved set of converted files stored in localStorage
 */
export interface SavedFileSet {
  id: string;           // Unique identifier for the file set
  name: string;         // User-friendly name
  source: string;       // Source format (e.g., 'traderplus', 'expansion', 'jones')
  createdAt: number;    // Timestamp when it was saved
  fileCount: number;    // Number of files in the set
  totalSize: number;    // Total size in bytes (uncompressed size)
  files: {
    [path: string]: string;  // Path -> content mapping
  };
  compressed?: boolean;  // Whether the files are compressed
  compressedSize?: number; // Size after compression in bytes
}
