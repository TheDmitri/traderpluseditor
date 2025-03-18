/**
 * Utility functions for working with ZIP files using JSZip library
 */
import JSZip from 'jszip';

/**
 * File structure for nested directory system
 */
export interface FileEntry {
  path: string;      // Full path including filename with directories separated by '/'
  content: string;   // File content as string
}

/**
 * Creates a ZIP file from a list of files with directory structure
 */
export async function createStructuredZip(files: FileEntry[]): Promise<Blob> {
  // Create a new JSZip instance
  const zip = new JSZip();
  
  // Add each file to the appropriate path in the zip
  files.forEach(file => {
    // Add the file to the zip at the specified path
    zip.file(file.path, file.content);
  });
  
  // Generate the ZIP file as a blob
  return await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: {
      level: 6 // Medium compression level
    }
  });
}

/**
 * Downloads a blob as a file
 */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Creates a ZIP file from a flat list of files
 */
export async function createZipFromFiles(files: { name: string, content: string }[]): Promise<Blob> {
  const zip = new JSZip();
  
  // Add each file to the zip
  files.forEach(file => {
    zip.file(file.name, file.content);
  });
  
  // Generate the ZIP file as a blob
  return await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: {
      level: 6
    }
  });
}

/**
 * Downloads a zip file
 */
export function downloadZip(zipBlob: Blob, fileName: string): void {
  downloadBlob(zipBlob, fileName);
}
