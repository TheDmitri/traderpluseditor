import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { animate, state, style, transition, trigger } from '@angular/animations';
import { environment } from '../../../../environments/environment';

export type SectionId = 'getting-started' | 'external-resources' | 'about';

@Component({
  selector: 'app-help-panel',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule
  ],
  templateUrl: './help-panel.component.html',
  styleUrls: ['./help-panel.component.scss'],
  animations: [
    trigger('expandCollapse', [
      state('collapsed', style({
        height: '0',
        overflow: 'hidden',
        opacity: '0',
        padding: '0 24px'
      })),
      state('expanded', style({
        height: '*',
        opacity: '1',
        padding: '0 24px 24px 24px'
      })),
      transition('collapsed <=> expanded', animate('225ms cubic-bezier(0.4, 0, 0.2, 1)'))
    ])
  ]
})
export class HelpPanelComponent {
  // Track which section is currently expanded
  expandedSection: SectionId | null = 'getting-started';
  appVersion = environment.version;
  
  constructor(
    public dialogRef: MatDialogRef<HelpPanelComponent>
  ) {}

  closePanel(): void {
    this.dialogRef.close();
  }
  
  // Toggle section expand/collapse
  toggleSection(section: SectionId): void {
    this.expandedSection = this.expandedSection === section ? null : section;
  }
  
  // Check if a section is expanded
  isSectionExpanded(section: SectionId): boolean {
    return this.expandedSection === section;
  }
}
