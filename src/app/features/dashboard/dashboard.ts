import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Api } from '../../core/api';
import { DashboardSummary } from '../../core/models';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink],
  styles: [`
    .stat { text-align: center; }
    .stat .n { font-size: 2rem; font-weight: 700; }
  `],
  template: `
    <div class="page">
      <h1>Dashboard</h1>
      @if (loading()) { <div class="spinner">Cargando…</div> }
      @else if (data(); as d) {
        <div class="grid cols-3" style="margin-bottom:18px">
          <div class="card stat"><div class="n">{{ d.total }}</div><div class="muted">Proyectos</div></div>
          <div class="card stat"><div class="n" style="color:var(--success)">{{ d.by_status['active'] || 0 }}</div><div class="muted">Activos</div></div>
          <div class="card stat"><div class="n" style="color:var(--muted)">{{ d.by_status['draft'] || 0 }}</div><div class="muted">Borradores</div></div>
        </div>
        <div class="row spread" style="margin-bottom:10px">
          <h2 style="margin:0">Recientes</h2>
          <a class="btn sm" routerLink="/projects">Ver todos</a>
        </div>
        @if (d.recent.length) {
          <div class="grid cols-2">
            @for (p of d.recent; track p.id) {
              <a class="card" [routerLink]="['/projects', p.id]">
                <div class="row spread">
                  <strong>{{ p.name }}</strong>
                  <span class="badge" [class]="p.status">{{ p.status }}</span>
                </div>
                <div class="muted" style="margin-top:6px">{{ p.description || 'Sin descripción' }}</div>
              </a>
            }
          </div>
        } @else { <div class="card muted">Aún no tienes proyectos. <a routerLink="/projects">Crea el primero</a>.</div> }
      }
    </div>
  `,
})
export class Dashboard implements OnInit {
  private api = inject(Api);
  data = signal<DashboardSummary | null>(null);
  loading = signal(true);

  ngOnInit(): void {
    this.api.get<DashboardSummary>('/projects/dashboard/').subscribe({
      next: d => { this.data.set(d); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }
}
