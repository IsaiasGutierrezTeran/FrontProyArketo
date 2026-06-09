import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Api } from '../../core/api';
import { ProjectVersion } from '../../core/models';

/**
 * HU-15 — Versionar proyecto (tipo Git).
 * Historial de versiones + commit + restaurar + diff entre dos versiones.
 */
@Component({
  selector: 'app-versions',
  imports: [FormsModule, RouterLink, DatePipe],
  styles: [`
    .ver { display:flex; align-items:center; gap:12px; padding:10px 0; border-bottom:1px solid var(--border); }
    .vn { width:42px; height:42px; border-radius:9px; display:grid; place-items:center; font-weight:800;
          background: var(--primary-soft); color: var(--primary-2); flex:none; }
    .diff { font-family: ui-monospace, monospace; font-size:.85rem; }
    .chg-added { color:#3fb950; } .chg-removed { color:#f85149; } .chg-modified { color:#d29922; } .chg-unchanged { color: var(--faint); }
  `],
  template: `
    <div class="page">
      <a [routerLink]="['/projects', id]" class="muted">← Volver al proyecto</a>
      <h1 style="margin:6px 0">Versiones del proyecto</h1>

      <div class="card" style="margin-bottom:16px">
        <h3>Guardar versión (commit)</h3>
        <form class="row" (ngSubmit)="commit()">
          <input class="input" placeholder="Mensaje del commit (ej. 'planta baja terminada')" name="msg" [(ngModel)]="message">
          <button class="btn" [disabled]="committing()">{{ committing() ? 'Guardando…' : 'Commit' }}</button>
        </form>
        @if (error()) { <div class="alert">{{ error() }}</div> }
      </div>

      <div class="card" style="margin-bottom:16px">
        <h3>Historial</h3>
        @for (v of versions(); track v.id) {
          <div class="ver">
            <div class="vn">v{{ v.version_number }}</div>
            <div style="flex:1; min-width:0">
              <div style="font-weight:600">{{ v.message || '(sin mensaje)' }}</div>
              <div class="muted" style="font-size:.78rem">{{ v.author_email }} · {{ v.created_at | date:'short' }}</div>
            </div>
            <button class="btn ghost sm" (click)="restore(v)" [disabled]="restoring()===v.id">
              {{ restoring()===v.id ? 'Restaurando…' : 'Restaurar' }}</button>
          </div>
        }
        @if (!versions().length) { <div class="muted">Aún no hay versiones. Haz tu primer commit.</div> }
      </div>

      @if (versions().length >= 2) {
        <div class="card">
          <h3>Comparar versiones (diff)</h3>
          <div class="row wrap">
            <label>Base
              <select [(ngModel)]="fromId" style="width:auto">
                @for (v of versions(); track v.id) { <option [value]="v.id">v{{ v.version_number }}</option> }
              </select>
            </label>
            <label>Destino
              <select [(ngModel)]="toId" style="width:auto">
                @for (v of versions(); track v.id) { <option [value]="v.id">v{{ v.version_number }}</option> }
              </select>
            </label>
            <button class="btn sm" [disabled]="!fromId || !toId" (click)="runDiff()">Comparar</button>
          </div>
          @if (diff(); as d) {
            <div class="diff" style="margin-top:12px">
              <div class="muted">v{{ d.from_version }} → v{{ d.to_version }}</div>
              <h4>Modelos 3D</h4>
              @for (m of d.models; track m.model_id) {
                <div [class]="'chg-' + m.change">· modelo #{{ m.model_id }}: {{ m.change }}
                  @if (m.from_counts && m.to_counts) {
                    (muros {{ m.from_counts.walls }}→{{ m.to_counts.walls }}, puertas {{ m.from_counts.doors }}→{{ m.to_counts.doors }}, ventanas {{ m.from_counts.windows }}→{{ m.to_counts.windows }})
                  }
                </div>
              }
              @if (!d.models.length) { <div class="muted">Sin modelos.</div> }
              <h4>Presupuestos</h4>
              @for (b of d.budgets; track b.budget_id) {
                <div [class]="'chg-' + b.change">· presupuesto #{{ b.budget_id }}: {{ b.change }}
                  (total {{ b.from_total ?? '—' }}→{{ b.to_total ?? '—' }}, estado {{ b.from_status ?? '—' }}→{{ b.to_status ?? '—' }})</div>
              }
              @if (!d.budgets.length) { <div class="muted">Sin presupuestos.</div> }
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class Versions implements OnInit {
  private api = inject(Api);
  private route = inject(ActivatedRoute);

  id!: number;
  versions = signal<ProjectVersion[]>([]);
  message = '';
  committing = signal(false);
  restoring = signal<number | null>(null);
  error = signal('');
  fromId: number | null = null;
  toId: number | null = null;
  diff = signal<any | null>(null);

  ngOnInit(): void {
    this.id = Number(this.route.snapshot.paramMap.get('id'));
    this.load();
  }

  private load(): void {
    this.api.page<ProjectVersion>('/versions/', { project: this.id }).subscribe(r => {
      this.versions.set(r.items);
      if (r.items.length >= 2) { this.toId = r.items[0].id; this.fromId = r.items[1].id; }
    });
  }

  commit(): void {
    this.committing.set(true); this.error.set('');
    this.api.post<ProjectVersion>('/versions/commit/', { project: this.id, message: this.message }).subscribe({
      next: v => { this.versions.update(l => [v, ...l]); this.message = ''; this.committing.set(false); },
      error: e => { this.error.set(e.detail || 'No se pudo guardar la versión.'); this.committing.set(false); },
    });
  }

  restore(v: ProjectVersion): void {
    this.restoring.set(v.id); this.error.set('');
    this.api.post<ProjectVersion>(`/versions/${v.id}/restore/`, {}).subscribe({
      next: () => this.restoring.set(null),
      error: e => { this.error.set(e.detail || 'No se pudo restaurar.'); this.restoring.set(null); },
    });
  }

  runDiff(): void {
    this.diff.set(null);
    this.api.get<any>('/versions/diff/', { from: this.fromId, to: this.toId }).subscribe({
      next: d => this.diff.set(d),
      error: e => this.error.set(e.detail || 'No se pudo comparar.'),
    });
  }
}
