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

/**
 * Compresses a string using JSZip's DEFLATE algorithm
 * Returns a base64 encoded compressed string
 */
export async function compressString(input: string): Promise<string> {
  const zip = new JSZip();
  zip.file('data', input);
  
  const blob = await zip.generateAsync({
    type: 'base64',
    compression: 'DEFLATE',
    compressionOptions: {
      level: 9 // Maximum compression level
    }
  });
  
  return blob;
}

/**
 * Decompresses a base64 encoded compressed string
 * Returns the original string
 */
export async function decompressString(compressedBase64: string): Promise<string> {
  try {
    const zip = new JSZip();
    await zip.loadAsync(compressedBase64, { base64: true });
    
    const file = zip.file('data');
    if (!file) {
      throw new Error('No data file found in compressed content');
    }
    
    return await file.async('string');
  } catch (error) {
    console.error('Error decompressing string:', error);
    throw error;
  }
}

/**
 * Compresses an object by stringifying it and then compressing the string
 * Returns a base64 encoded compressed string
 */
export async function compressObject(obj: any): Promise<string> {
  const jsonString = JSON.stringify(obj);
  return await compressString(jsonString);
}

/**
 * Decompresses a base64 encoded compressed string and parses it as JSON
 * Returns the original object
 */
export async function decompressObject<T>(compressedBase64: string): Promise<T> {
  const jsonString = await decompressString(compressedBase64);
  return JSON.parse(jsonString) as T;
}
