import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import {
  MatTableModule,
  MatTable,
  MatTableDataSource,
} from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialogModule } from '@angular/material/dialog';
import { RouterModule } from '@angular/router';
import { StorageService } from '../../../core/services/storage.service';
import { Category } from '../../../core/models';
import { Subject } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { CategoryModalComponent } from './category-modal/category-modal.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { NotificationService } from '../../../shared/services/notification.service';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-category-editor',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatCardModule,
    MatInputModule,
    MatSlideToggleModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatTooltipModule,
    MatDialogModule,
    RouterModule,
  ],
  templateUrl: './category-editor.component.html',
  styleUrls: ['./category-editor.component.scss'],
})
export class CategoryEditorComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  dataSource: MatTableDataSource<Category>;
  displayedColumns: string[] = [
    'icon',
    'categoryName',
    'categoryId',
    'isVisible',
    'productCount',
    'actions',
  ];

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatTable) table!: MatTable<Category>;

  constructor(
    private storageService: StorageService,
    private dialog: MatDialog,
    private notificationService: NotificationService
  ) {
    this.dataSource = new MatTableDataSource<Category>([]);
  }

  ngOnInit(): void {
    this.loadCategories();
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;

    // Initialize ripple effects for custom buttons
    setTimeout(() => {
      this.initializeCustomRipples();
    });
  }

  private initializeCustomRipples() {
    const buttons = document.querySelectorAll('.custom-icon-btn');

    buttons.forEach((button: Element) => {
      if (!(button as HTMLElement).hasAttribute('data-ripple-initialized')) {
        button.setAttribute('data-ripple-initialized', 'true');

        button.addEventListener('click', (event: Event) => {
          const mouseEvent = event as MouseEvent;
          const rippleContainer = button.querySelector(
            '.icon-btn-ripple'
          ) as HTMLElement;
          if (!rippleContainer) return;

          // Remove existing ripples
          const existingRipples = rippleContainer.querySelectorAll(
            '.icon-btn-ripple-effect'
          );
          existingRipples.forEach((ripple) => ripple.remove());

          // Create new ripple
          const ripple = document.createElement('span');
          ripple.classList.add('icon-btn-ripple-effect');

          const rect = button.getBoundingClientRect();
          const size = Math.max(rect.width, rect.height);
          const x = mouseEvent.clientX - rect.left - size / 2;
          const y = mouseEvent.clientY - rect.top - size / 2;

          ripple.style.width = ripple.style.height = `${size}px`;
          ripple.style.left = `${x}px`;
          ripple.style.top = `${y}px`;

          rippleContainer.appendChild(ripple);

          // Remove ripple after animation completes
          setTimeout(() => {
            ripple.remove();
          }, 500);
        });
      }
    });
  }

  loadCategories(): void {
    const categories = this.storageService.categories();
    this.dataSource.data = categories;
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }

  // Method to remove all categories
  removeAllCategories(): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Delete All Categories',
        message:
          'Are you sure you want to delete all categories? \nThis action cannot be undone.',
        confirmText: 'Delete All',
        cancelText: 'Cancel',
        type: 'danger',
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.storageService.saveCategories([]);
        this.loadCategories();
        this.notificationService.success('All Categories deleted successfully');
      }
    });
  }

  // Method to toggle visibility for all categories
  toggleAllCategoriesVisibility(): void {
    const categories = this.dataSource.data;
    const allVisible = categories.every((cat) => cat.isVisible);
    const updatedCategories = categories.map((cat) => ({
      ...cat,
      isVisible: !allVisible,
    }));
    this.storageService.saveCategories(updatedCategories);
    this.loadCategories();
  }

  toggleCategoryVisibility(category: Category): void {
    const categories = this.dataSource.data;
    const updatedCategories = categories.map((cat) =>
      cat.categoryId === category.categoryId
        ? { ...cat, isVisible: !cat.isVisible }
        : cat
    );
    this.storageService.saveCategories(updatedCategories);
    this.loadCategories();
  }

  removeCategory(categoryId: string): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Delete Category',
        message:
          'Are you sure you want to delete this category? \nThis action cannot be undone.',
        confirmText: 'Delete',
        cancelText: 'Cancel',
        type: 'danger',
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        const categories = this.dataSource.data.filter(
          (cat) => cat.categoryId !== categoryId
        );
        this.storageService.saveCategories(categories);
        this.loadCategories();
        this.notificationService.success('Category deleted successfully');
      }
    });
  }

  getProductCount(category: Category): number {
    return category.productIds.length;
  }

  addCategory(): void {
    const dialogRef = this.dialog.open(CategoryModalComponent, {
      data: { category: undefined },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        const newCategory: Category = {
          ...result,
          categoryId: this.generateCategoryId(),
          productIds: [],
        };
        const categories = [...this.dataSource.data, newCategory];
        this.storageService.saveCategories(categories);
        this.loadCategories();
        this.notificationService.success('Category created successfully');
      }
    });
  }

  editCategory(category: Category): void {
    const dialogRef = this.dialog.open(CategoryModalComponent, {
      data: { category },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        const updatedCategory: Category = {
          ...category,
          ...result,
        };
        const categories = this.dataSource.data.map((cat) =>
          cat.categoryId === category.categoryId ? updatedCategory : cat
        );
        this.storageService.saveCategories(categories);
        this.loadCategories();
        this.notificationService.success('Category updated successfully');
      }
    });
  }

  private generateCategoryId(): string {
    const existingIds = this.dataSource.data.map((cat) => {
      const match = cat.categoryId.match(/\d+$/);
      return match ? parseInt(match[0], 10) : 0;
    });
    const nextId = Math.max(0, ...existingIds) + 1;
    return `cat_${nextId.toString().padStart(3, '0')}`;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
