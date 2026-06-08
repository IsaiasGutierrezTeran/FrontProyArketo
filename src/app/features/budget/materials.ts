import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Api } from '../../core/api';
import { Material } from '../../core/models';

interface Category { id: number; name: string; }

/**
 * HU-11 — Gestionar materiales y calidad de bloques (ABM, solo superadmin).
 * CRUD de categorías y materiales (con calidad de bloque) que alimentan el
 * presupuesto (HU-12).
 */
@Component({
  selector: 'app-materials',
  imports: [FormsModule],
  styles: [`
    .grid2 { display:grid; grid-template-columns: 320px 1fr; gap:16px; align-items:start; }
    @media (max-width: 900px) { .grid2 { grid-template-columns: 1fr; } }
    td input, td select { width: 100%; }
  `],
  template: `
    <div class="page">
      <h1 style="margin:6px 0">Materiales y calidad de bloques</h1>
      <p class="muted">Catálogo que alimenta los presupuestos. Solo administradores.</p>
      @if (error()) { <div class="alert">{{ error() }}</div> }

      <div class="grid2">
        <!-- Categorías -->
        <div class="card">
          <h3>Categorías</h3>
          <form class="row" (ngSubmit)="addCategory()">
            <input class="input" placeholder="Nueva categoría" name="cat" [(ngModel)]="newCategory">
            <button class="btn sm" [disabled]="!newCategory">+</button>
          </form>
          <table style="margin-top:8px">
            @for (c of categories(); track c.id) {
              <tr><td>{{ c.name }}</td>
                <td style="text-align:right"><button class="btn sm danger" (click)="deleteCategory(c)">✕</button></td></tr>
            }
            @if (!categories().length) { <tr><td class="muted">Sin categorías.</td></tr> }
          </table>
        </div>

        <!-- Materiales -->
        <div class="card">
          <h3>Materiales</h3>
          <table>
            <tr><th>Categoría</th><th>Nombre</th><th>Unidad</th><th>Precio</th><th>Calidad</th><th>Activo</th><th></th></tr>
            <tr>
              <td><select [(ngModel)]="draft.category" [ngModelOptions]="{standalone:true}">
                <option [ngValue]="null" disabled>—</option>
                @for (c of categories(); track c.id) { <option [ngValue]="c.id">{{ c.name }}</option> }
              </select></td>
              <td><input [(ngModel)]="draft.name" [ngModelOptions]="{standalone:true}" placeholder="Cemento"></td>
              <td><input [(ngModel)]="draft.unit" [ngModelOptions]="{standalone:true}" placeholder="saco"></td>
              <td><input type="number" step="0.01" [(ngModel)]="draft.unit_price" [ngModelOptions]="{standalone:true}"></td>
              <td><select [(ngModel)]="draft.block_quality" [ngModelOptions]="{standalone:true}">
                <option value="low">Baja</option><option value="standard">Estándar</option><option value="high">Alta</option>
              </select></td>
              <td></td>
              <td><button class="btn sm" [disabled]="!draft.category || !draft.name" (click)="addMaterial()">Crear</button></td>
            </tr>
            @for (m of materials(); track m.id) {
              <tr>
                <td>{{ m.category_name }}</td>
                <td><input [(ngModel)]="m.name" [ngModelOptions]="{standalone:true}"></td>
                <td><input [(ngModel)]="m.unit" [ngModelOptions]="{standalone:true}"></td>
                <td><input type="number" step="0.01" [(ngModel)]="m.unit_price" [ngModelOptions]="{standalone:true}"></td>
                <td><select [(ngModel)]="m.block_quality" [ngModelOptions]="{standalone:true}">
                  <option value="low">Baja</option><option value="standard">Estándar</option><option value="high">Alta</option>
                </select></td>
                <td style="text-align:center"><input type="checkbox" [(ngModel)]="m.is_active" [ngModelOptions]="{standalone:true}"></td>
                <td style="white-space:nowrap">
                  <button class="btn sm" (click)="saveMaterial(m)">Guardar</button>
                  <button class="btn sm danger" (click)="deleteMaterial(m)">✕</button>
                </td>
              </tr>
            }
            @if (!materials().length) { <tr><td colspan="7" class="muted">Sin materiales.</td></tr> }
          </table>
        </div>
      </div>
    </div>
  `,
})
export class Materials implements OnInit {
  private api = inject(Api);

  categories = signal<Category[]>([]);
  materials = signal<Material[]>([]);
  newCategory = '';
  error = signal('');
  draft: any = { category: null, name: '', unit: '', unit_price: 0, block_quality: 'standard' };

  ngOnInit(): void {
    this.api.page<Category>('/material-categories/', { page_size: 100 }).subscribe(r => this.categories.set(r.items));
    this.api.page<Material>('/materials/', { page_size: 100 }).subscribe(r => this.materials.set(r.items));
  }

  addCategory(): void {
    this.error.set('');
    this.api.post<Category>('/material-categories/', { name: this.newCategory }).subscribe({
      next: c => { this.categories.update(l => [...l, c]); this.newCategory = ''; },
      error: e => this.error.set(e.detail?.name?.[0] || e.detail || 'No se pudo crear la categoría.'),
    });
  }

  deleteCategory(c: Category): void {
    this.api.delete(`/material-categories/${c.id}/`).subscribe({
      next: () => this.categories.update(l => l.filter(x => x.id !== c.id)),
      error: e => this.error.set(e.detail || 'No se pudo borrar (¿tiene materiales?).'),
    });
  }

  addMaterial(): void {
    this.error.set('');
    this.api.post<Material>('/materials/', { ...this.draft }).subscribe({
      next: m => {
        this.materials.update(l => [...l, m]);
        this.draft = { category: null, name: '', unit: '', unit_price: 0, block_quality: 'standard' };
      },
      error: e => this.error.set(e.detail || 'No se pudo crear el material.'),
    });
  }

  saveMaterial(m: Material): void {
    this.error.set('');
    this.api.patch<Material>(`/materials/${m.id}/`, {
      name: m.name, unit: m.unit, unit_price: m.unit_price,
      block_quality: m.block_quality, is_active: m.is_active,
    }).subscribe({ next: () => {}, error: e => this.error.set(e.detail || 'No se pudo guardar.') });
  }

  deleteMaterial(m: Material): void {
    this.api.delete(`/materials/${m.id}/`).subscribe({
      next: () => this.materials.update(l => l.filter(x => x.id !== m.id)),
      error: e => this.error.set(e.detail || 'No se pudo borrar.'),
    });
  }
}
