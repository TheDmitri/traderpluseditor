import { Routes } from '@angular/router';
import { DashboardComponent } from './features/dashboard/components/dashboard.component';
import { FileManagementComponent } from './features/file-management/components/file-management.component';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'file-management', component: FileManagementComponent },
  // Placeholder routes for future components
  { path: 'categories', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'products', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'currencies', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'settings', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: '**', redirectTo: 'dashboard' }
];
