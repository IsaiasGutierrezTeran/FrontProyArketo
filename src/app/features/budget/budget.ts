import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Api, apiErrMsg } from '../../core/api';
import { Auth } from '../../core/auth/auth';
import { Budget, Material, Model3D } from '../../core/models';
import { EstadoPipe } from '../../core/estado.pipe';

interface ItemRow { material: number | null; quantity: number; }

@Component({
  selector: 'app-budget',
  imports: [FormsModule, RouterLink, EstadoPipe],
  template: `
    <div class="page">
      <a [routerLink]="['/projects', id]" class="muted">← Volver al proyecto</a>
      <h1>Presupuesto de obra</h1>

      <!-- Estimación automática desde el modelo 3D (cómputo métrico) -->
      <div class="card" style="margin-bottom:14px">
        <div class="row spread">
          <div>
            <strong>Estimar desde el modelo 3D</strong>
            <div class="muted" style="font-size:.82rem">Calcula materiales y cantidades a partir de la geometría (muros, piso, aberturas) y crea un borrador en Bs.</div>
          </div>
          <button class="btn sm" [disabled]="!modelId() || estimating()" (click)="estimate()">
            {{ estimating() ? 'Estimando…' : 'Estimar' }}</button>
        </div>
        @if (!modelId()) { <div class="muted" style="font-size:.8rem; margin-top:6px">Genera primero el modelo 3D del proyecto para poder estimar.</div> }
      </div>

      <!-- New budget -->
      <form class="card" style="margin-bottom:18px" (ngSubmit)="create()">
        <h3>Nuevo presupuesto</h3>
        <table>
          <tr><th>Material</th><th style="width:120px">Cantidad</th><th></th></tr>
          @for (row of rows(); track $index) {
            <tr>
              <td>
                <select [(ngModel)]="row.material" [ngModelOptions]="{standalone:true}">
                  <option [ngValue]="null" disabled>Elegir material…</option>
                  @for (m of materials(); track m.id) {
                    <option [ngValue]="m.id">{{ m.name }} — Bs {{ m.unit_price }}/{{ m.unit }} ({{ m.block_quality }})</option>
                  }
                </select>
              </td>
              <td><input class="input" type="number" min="0" [(ngModel)]="row.quantity" [ngModelOptions]="{standalone:true}"></td>
              <td><button type="button" class="btn ghost sm" (click)="removeRow($index)">✕</button></td>
            </tr>
          }
        </table>
        <button type="button" class="btn ghost sm" style="margin-top:8px" (click)="addRow()">+ Añadir material</button>

        <div class="grid cols-2" style="margin-top:12px">
          <div><label>Mano de obra (nº personas)</label><input class="input" type="number" min="0" [(ngModel)]="labor_people" name="lp"></div>
          <div><label>Costo mano de obra</label><input class="input" type="number" min="0" [(ngModel)]="labor_cost" name="lc"></div>
        </div>

        @if (error()) { <div class="alert" style="margin-top:10px">{{ error() }}</div> }
        <button class="btn" style="margin-top:12px" [disabled]="saving() || !hasItems()">{{ saving() ? 'Calculando…' : 'Crear presupuesto' }}</button>
      </form>

      <!-- Existing budgets -->
      <h2>Presupuestos del proyecto</h2>
      @if (loading()) { <div class="spinner">Cargando…</div> }
      @for (b of budgets(); track b.id) {
        <div class="card" style="margin-bottom:14px">
          <div class="row spread">
            <strong>Presupuesto #{{ b.id }}</strong>
            <span class="badge" [class]="b.status">{{ b.status | estado }}</span>
          </div>
          <table style="margin:10px 0">
            <tr><th>Material</th><th>Cant.</th><th>P. unit.</th><th>Subtotal</th></tr>
            @for (it of b.items; track it.id) {
              <tr><td>{{ it.material_name }}</td><td>{{ it.quantity }}</td><td>Bs {{ it.unit_price_snapshot }}</td><td>Bs {{ it.subtotal }}</td></tr>
            }
          </table>
          <div class="muted">Materiales: Bs {{ b.materials_cost }} · Mano de obra ({{ b.labor_people }} pers.): Bs {{ b.labor_cost }}
            · <strong style="color:var(--text)">Total: {{ b.total }} {{ b.currency }}</strong></div>

          @if (b.review) {
            <div class="alert" [class.ok]="b.review.decision==='approved'" style="margin-top:10px">
              Revisión ({{ b.review.reviewer_email }}): <strong>{{ b.review.decision }}</strong>
              @if (b.review.comments) { — {{ b.review.comments }} }
            </div>
          }

          <div class="row" style="margin-top:12px">
            <button class="btn ghost sm" [disabled]="pdfBusy()===b.id" (click)="downloadPdf(b)">
              {{ pdfBusy()===b.id ? 'Descargando…' : 'Descargar PDF' }}</button>
            @if (b.status === 'draft' || b.status === 'observed') {
              <button class="btn sm" (click)="submit(b)">Enviar a revisión</button>
            }
            @if (auth.hasRole('ingeniero') && b.status === 'submitted') {
              <input class="input" style="width:auto; flex:1" placeholder="comentarios" [(ngModel)]="reviewComment[b.id]" [ngModelOptions]="{standalone:true}">
              <button class="btn sm" (click)="review(b, 'approved')">Aprobar</button>
              <button class="btn sm ghost" (click)="review(b, 'observed')">Observar</button>
              <button class="btn sm danger" (click)="review(b, 'rejected')">Rechazar</button>
            }
          </div>
        </div>
      }
      @if (!loading() && !budgets().length) { <div class="card muted">Sin presupuestos todavía.</div> }
    </div>
  `,
})
export class BudgetScreen implements OnInit {
  private api = inject(Api);
  private route = inject(ActivatedRoute);
  auth = inject(Auth);

  id!: number;
  materials = signal<Material[]>([]);
  budgets = signal<Budget[]>([]);
  rows = signal<ItemRow[]>([{ material: null, quantity: 1 }]);
  labor_people = 0;
  labor_cost = 0;
  reviewComment: Record<number, string> = {};
  loading = signal(true);
  saving = signal(false);
  error = signal('');
  pdfBusy = signal<number | null>(null);
  modelId = signal<number | null>(null);   // modelo 3D actual del proyecto (para estimar)
  estimating = signal(false);

  estimate(): void {
    const mid = this.modelId();
    if (!mid) return;
    this.estimating.set(true); this.error.set('');
    this.api.post<Budget>('/budgets/estimate/', { model3d: mid }).subscribe({
      next: b => { this.budgets.update(l => [b, ...l]); this.estimating.set(false); },
      error: e => { this.error.set(apiErrMsg(e, 'No se pudo estimar.')); this.estimating.set(false); },
    });
  }

  downloadPdf(b: Budget): void {
    this.pdfBusy.set(b.id);
    this.api.blob(`/budgets/${b.id}/export.pdf/`).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url; link.download = `presupuesto-${b.id}.pdf`; link.click();
        URL.revokeObjectURL(url);
        this.pdfBusy.set(null);
      },
      error: e => { this.error.set(apiErrMsg(e, 'No se pudo descargar el PDF.')); this.pdfBusy.set(null); },
    });
  }

  ngOnInit(): void {
    this.id = Number(this.route.snapshot.paramMap.get('id'));
    this.api.page<Material>('/materials/', { page_size: 100 }).subscribe(r => this.materials.set(r.items));
    // Modelo 3D actual del proyecto, para habilitar la estimación.
    this.api.page<Model3D>('/models3d/', { project: this.id }).subscribe({
      next: r => { const cur = r.items.find(m => m.is_current) || r.items[0]; this.modelId.set(cur?.id ?? null); },
      error: () => {},
    });
    this.load();
  }

  load(): void {
    this.api.page<Budget>('/budgets/', { project: this.id }).subscribe({
      next: r => { this.budgets.set(r.items); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  addRow(): void { this.rows.update(r => [...r, { material: null, quantity: 1 }]); }
  removeRow(i: number): void { this.rows.update(r => r.filter((_, idx) => idx !== i)); }
  hasItems(): boolean { return this.rows().some(r => r.material && r.quantity > 0); }

  create(): void {
    this.saving.set(true); this.error.set('');
    const items = this.rows().filter(r => r.material && r.quantity > 0)
      .map(r => ({ material: r.material, quantity: r.quantity }));
    this.api.post<Budget>('/budgets/', {
      project: this.id, labor_people: this.labor_people, labor_cost: this.labor_cost, items,
    }).subscribe({
      next: b => {
        this.budgets.update(l => [b, ...l]);
        this.rows.set([{ material: null, quantity: 1 }]);
        this.labor_people = 0; this.labor_cost = 0;
        this.saving.set(false);
      },
      error: e => { this.error.set(typeof e.detail === 'string' ? e.detail : 'No se pudo crear.'); this.saving.set(false); },
    });
  }

  submit(b: Budget): void {
    this.api.post<Budget>(`/budgets/${b.id}/submit/`, {}).subscribe(updated => this.replace(updated));
  }

  review(b: Budget, decision: 'approved' | 'observed' | 'rejected'): void {
    this.api.post<Budget>(`/budgets/${b.id}/review/`, { decision, comments: this.reviewComment[b.id] || '' })
      .subscribe(updated => this.replace(updated));
  }

  private replace(b: Budget): void {
    this.budgets.update(l => l.map(x => x.id === b.id ? b : x));
  }
}
