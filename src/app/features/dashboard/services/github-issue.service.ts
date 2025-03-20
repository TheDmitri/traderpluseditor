import { Injectable } from '@angular/core';
import { environment } from '../../../../environments/environment';

export interface IssueRequest {
  type: 'bug' | 'enhancement';
  title: string;
  description: string;
  attachments: File[];
}

@Injectable({
  providedIn: 'root'
})
export class GithubIssueService {
  private repoOwner = 'TheDmitri';
  private repoName = 'traderpluseditor';
  
  constructor() { }

  /**
   * Generate a URL to create a GitHub issue with prefilled information
   * @param issueRequest The issue data to use for prefill
   * @returns URL to create a GitHub issue
   */
  generateIssueUrl(issueRequest: IssueRequest): string {
    // Base URL for creating a new issue
    const baseUrl = `https://github.com/${this.repoOwner}/${this.repoName}/issues/new`;
    
    // Format the body with system information
    const body = this.formatIssueBody(issueRequest.description, issueRequest.type);
    
    // Create URL parameters for prefilling
    const params = new URLSearchParams({
      title: issueRequest.title,
      body: body,
      labels: issueRequest.type, // 'bug' or 'enhancement'
      // This parameter helps GitHub recognize this is structured content
      template: 'custom_template.md'
    });
    
    return `${baseUrl}?${params.toString()}`;
  }
  
  /**
   * Format the issue body with markdown and system information
   * @param description User provided description
   * @param type Type of the issue ('bug' or 'enhancement')
   * @returns Formatted issue body with system info
   */
  private formatIssueBody(description: string, type: 'bug' | 'enhancement'): string {
    const issueType = type === 'bug' ? 'Bug Report' : 'Feature Request';
    
    // Create structured content with clear headings for better preview
    let formattedBody = `# ${issueType}\n\n`;
    
    // Add the description as is - it already has the necessary sections
    formattedBody += `${description}\n\n`;
    
    // Add system info
    formattedBody += '## System Information\nDO NOT REMOVE!\n';
    formattedBody += `- **Browser**: ${navigator.userAgent}\n`;
    formattedBody += `- **Platform**: ${navigator.platform}\n`;
    formattedBody += `- **App Version**: ${environment.version || 'Unknown'}\n\n`;
    
    // Add note about attachments if not already included
    if (!description.includes('## Screenshots') && !description.includes('## Attachments')) {
      formattedBody += '## Attachments\n';
      formattedBody += '_Please drag and drop any screenshots or files here._\n\n';
    }
    
    return formattedBody;
  }
  
  /**
   * Process image files to data URLs
   * @param file Image file to process
   * @returns Promise with data URL
   */
  processImageFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Failed to read file as data URL'));
        }
      };
      
      reader.onerror = () => {
        reject(reader.error);
      };
      
      reader.readAsDataURL(file);
    });
  }
}
