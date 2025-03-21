import { Injectable } from '@angular/core';
import { Observable, forkJoin, from, map } from 'rxjs';

export interface FileContent {
  file: File;
  content: string;
}

@Injectable({
  providedIn: 'root'
})
export class FileConverterService {

  constructor() { }
  
  /**
   * Reads multiple files and returns their contents
   */
  readFiles(files: File[]): Observable<FileContent[]> {
    const readers = files.map(file => this.readFile(file));
    return forkJoin(readers);
  }
  
  /**
   * Reads a single file and returns its content
   */
  private readFile(file: File): Observable<FileContent> {
    return new Observable(observer => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const content = e.target?.result as string;
        observer.next({ file, content });
        observer.complete();
      };
      
      reader.onerror = (e) => {
        observer.error(new Error(`Error reading file: ${file.name}`));
      };
      
      reader.readAsText(file);
    });
  }
  
  /**
   * Saves files to the user's device as a download
   */
  saveFiles(files: { name: string, content: string }[]): void {
    files.forEach(file => {
      const blob = new Blob([file.content], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      a.click();
      URL.revokeObjectURL(url);
    });
  }
}
