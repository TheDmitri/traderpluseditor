/**
 * Represents a node in the file explorer tree
 */
export interface FileNode {
  name: string; // Name of the file or directory
  type: 'file' | 'folder'; // Type of node
  path: string; // Full path from root
  children?: FileNode[]; // Child nodes for directories
  content?: string; // File content if it's a file
  size?: number; // Size of the file in bytes
  expanded?: boolean; // UI state - whether the folder is expanded
}
