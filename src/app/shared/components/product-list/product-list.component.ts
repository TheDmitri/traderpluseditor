import { CommonModule } from '@angular/common';
import {
  Component,
  OnInit,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  SimpleChanges,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { Product } from '../../../core/models';
import { StorageService } from '../../../core/services/storage.service';

export interface ProductWithCategories extends Product {
  categories?: string[];
}

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
  ],
  templateUrl: './product-list.component.html',
  styleUrls: ['./product-list.component.scss'],
})
export class ProductListComponent implements OnInit {
  @Input() products: Product[] = [];
  @Input() showActions = true;
  @Output() productRemoved = new EventEmitter<string>();
  @Output() productEdited = new EventEmitter<Product>();

  dataSource: MatTableDataSource<ProductWithCategories>;
  displayedColumns: string[] = [
    'className',
    'categories',
    'maxStock',
    'buyPrice',
    'sellPrice',
  ];

  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(private storageService: StorageService) {
    this.dataSource = new MatTableDataSource<ProductWithCategories>([]);
  }

  ngOnInit(): void {
    if (this.showActions) {
      this.displayedColumns.push('actions');
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['products']) {
      const productsWithCategories = this.addCategoryInfo(this.products);
      this.dataSource.data = productsWithCategories;
    }
  }

  private addCategoryInfo(products: Product[]): ProductWithCategories[] {
    const categories = this.storageService.categories();

    return products.map((product) => {
      const productCategories = categories
        .filter((category) => category.productIds.includes(product.productId))
        .map((category) => category.categoryName);

      return {
        ...product,
        categories: productCategories,
      };
    });
  }

  ngAfterViewInit(): void {
    this.dataSource.sort = this.sort;
    this.dataSource.paginator = this.paginator;
  }

  applyFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }
}
