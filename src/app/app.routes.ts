import { Routes } from '@angular/router';
import { DashboardComponent } from './features/dashboard/components/dashboard.component';
import { FileManagementComponent } from './features/file-management/components/file-management.component';
import { CategoryEditorComponent } from './features/category-editor/components/category-editor.component';
import { ProductEditorComponent } from './features/product-editor/components/product-editor.component';
import { CurrencyEditorComponent } from './features/currency-editor/components/currency-editor.component';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'file-management', component: FileManagementComponent },
  { path: 'categories', component: CategoryEditorComponent },
  { path: 'products', component: ProductEditorComponent },
  { path: 'currencies', component: CurrencyEditorComponent },
  // Placeholder routes for future components
  { path: 'currencies', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'settings', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: '**', redirectTo: 'dashboard' }
];
