import { Routes } from '@angular/router';
import { DashboardComponent } from './features/dashboard/components/dashboard.component';
import { FileManagementComponent } from './features/file-management/components/file-management.component';
import { CategoryEditorComponent } from './features/category-editor/components/category-editor.component';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'file-management', component: FileManagementComponent },
  { path: 'categories', component: CategoryEditorComponent },
  // Placeholder routes for future components
  { path: 'products', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'currencies', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'settings', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: '**', redirectTo: 'dashboard' }
];
