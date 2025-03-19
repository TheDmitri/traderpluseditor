import { Routes } from '@angular/router';

// Feature components
import { DashboardComponent } from './features/dashboard/components/dashboard.component';
import { FileManagementComponent } from './features/file-management/components/file-management.component';
import { CategoryEditorComponent } from './features/category-editor/components/category-editor.component';
import { ProductEditorComponent } from './features/product-editor/components/product-editor.component';
import { CurrencyEditorComponent } from './features/currency-editor/components/currency-editor.component';
import { GeneralSettingsEditorComponent } from './features/general-settings-editor/components/general-settings-editor.component';
import { FileConverterComponent } from './features/file-converter/components/file-converter.component';
import { StorageManagerComponent } from './shared/components/storage-manager/storage-manager.component';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'categories', component: CategoryEditorComponent },
  { path: 'products', component: ProductEditorComponent },
  { path: 'currencies', component: CurrencyEditorComponent },
  { path: 'settings', component: GeneralSettingsEditorComponent },
  { path: 'file-management', component: FileManagementComponent },
  { path: 'converter', component: FileConverterComponent },
  { path: 'storage-manager', component: StorageManagerComponent },
  { path: '**', redirectTo: 'dashboard' }
];
