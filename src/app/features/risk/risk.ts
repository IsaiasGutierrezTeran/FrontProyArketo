import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Api, apiErrMsg } from '../../core/api';
import { Model3D, RiskAnalysis } from '../../core/models';

@Component({
  selector: 'app-risk',
  imports: [FormsModule, RouterLink, DatePipe],
  template: `
    <div class="page">
      <a [routerLink]="['/projects', id]" class="muted">← Volver al proyecto</a>
      <h1>Riesgos estructurales</h1>

      <div class="card" style="margin-bottom:18px">
        @if (models().length) {
          <div class="row wrap">
            <div style="flex:1">
              <label>Modelo 3D a analizar</label>
              <select [(ngModel)]="selected" [ngModelOptions]="{standalone:true}">
                @for (m of models(); track m.id) {
                  <option [ngValue]="m.id">Modelo #{{ m.id }} ({{ m.element_count }} elementos){{ m.is_current ? ' · actual' : '' }}</option>
                }
              </select>
            </div>
            <button class="btn" style="align-self:flex-end" [disabled]="analyzing() || !selected" (click)="analyze()">
              {{ analyzing() ? 'Analizando…' : 'Analizar riesgos (IA)' }}
            </button>
          </div>
          @if (error()) { <div class="alert" style="margin-top:10px">{{ error() }}</div> }
        } @else {
          <div class="muted">Este proyecto no tiene modelos 3D. Genera uno primero desde el plano.</div>
        }
      </div>

      @if (loading()) { <div class="spinner">Cargando…</div> }
      @for (a of analyses(); track a.id) {
        <div class="card" style="margin-bottom:14px">
          <div class="row spread">
            <strong>Análisis #{{ a.id }} · modelo {{ a.model3d }}</strong>
            <span class="muted">{{ a.provider }} · {{ a.created_at | date:'short' }}</span>
          </div>
          <p>{{ a.summary }}</p>
          <button class="btn ghost sm" [disabled]="pdfBusy()===a.id" (click)="downloadReport(a)">
            {{ pdfBusy()===a.id ? 'Descargando…' : 'Descargar reporte PDF' }}</button>
          @if (a.findings.length) {
            @for (f of a.findings; track f.id) {
              <div style="border-left:3px solid var(--border); padding:8px 12px; margin:8px 0">
                <div class="row spread">
                  <strong>{{ f.category }}</strong>
                  <span class="badge" [class]="f.severity">{{ f.severity }}</span>
                </div>
                <div>{{ f.description }}</div>
                @if (f.suggestion) { <div class="muted" style="margin-top:4px">{{ f.suggestion }}</div> }
              </div>
            }
          } @else { <div class="muted">Sin observaciones.</div> }
        </div>
      }
      @if (!loading() && !analyses().length) { <div class="card muted">Aún no se han ejecutado análisis.</div> }
    </div>
  `,
})
export class Risk implements OnInit {
  private api = inject(Api);
  private route = inject(ActivatedRoute);

  id!: number;
  models = signal<Model3D[]>([]);
  analyses = signal<RiskAnalysis[]>([]);
  selected: number | null = null;
  loading = signal(true);
  analyzing = signal(false);
  error = signal('');
  pdfBusy = signal<number | null>(null);
  private modelIds = new Set<number>();

  downloadReport(a: RiskAnalysis): void {
    this.pdfBusy.set(a.id);
    this.api.blob(`/risk/analyses/${a.id}/report.pdf/`).subscribe({
      next: b => {
        const url = URL.createObjectURL(b);
        const link = document.createElement('a');
        link.href = url; link.download = `riesgos-${a.id}.pdf`; link.click();
        URL.revokeObjectURL(url);
        this.pdfBusy.set(null);
      },
      error: e => { this.error.set(apiErrMsg(e, 'No se pudo descargar el PDF.')); this.pdfBusy.set(null); },
    });
  }

  ngOnInit(): void {
    this.id = Number(this.route.snapshot.paramMap.get('id'));
    this.api.page<Model3D>('/models3d/', { project: this.id }).subscribe(r => {
      this.models.set(r.items);
      this.modelIds = new Set(r.items.map(m => m.id));
      this.selected = r.items.find(m => m.is_current)?.id ?? r.items[0]?.id ?? null;
      this.loadAnalyses();
    });
  }

  private loadAnalyses(): void {
    this.api.page<RiskAnalysis>('/risk/analyses/', { page_size: 100 }).subscribe({
      next: r => { this.analyses.set(r.items.filter(a => this.modelIds.has(a.model3d))); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  analyze(): void {
    if (!this.selected) return;
    this.analyzing.set(true); this.error.set('');
    this.api.post<RiskAnalysis>('/risk/analyze', { model3d: this.selected }).subscribe({
      next: a => { this.analyses.update(l => [a, ...l]); this.analyzing.set(false); },
      error: e => { this.error.set(e.detail || 'No se pudo analizar.'); this.analyzing.set(false); },
    });
  }
}
