import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Api } from '../../core/api';
import { Project } from '../../core/models';

@Component({
  selector: 'app-projects',
  imports: [FormsModule, RouterLink],
  template: `
    <div class="page">
      <div class="row spread" style="margin-bottom:16px">
        <h1 style="margin:0">Proyectos</h1>
        <button class="btn" (click)="creating.set(!creating())">+ Nuevo proyecto</button>
      </div>

      @if (creating()) {
        <form class="card" style="margin-bottom:16px" (ngSubmit)="create()">
          <label>Nombre</label>
          <input class="input" name="name" [(ngModel)]="name" required>
          <label>Descripción</label>
          <textarea class="input" name="desc" [(ngModel)]="description" rows="2"></textarea>
          <div class="row" style="margin-top:12px">
            <button class="btn" [disabled]="!name || saving()">{{ saving() ? 'Guardando…' : 'Crear' }}</button>
            <button class="btn ghost" type="button" (click)="creating.set(false)">Cancelar</button>
          </div>
        </form>
      }

      @if (error()) { <div class="alert">{{ error() }}</div> }
      @if (loading()) { <div class="spinner">Cargando…</div> }
      @else if (projects().length) {
        <div class="grid cols-2">
          @for (p of projects(); track p.id) {
            <a class="card" [routerLink]="['/projects', p.id]">
              <div class="row spread">
                <strong>{{ p.name }}</strong>
                <span class="badge" [class]="p.status">{{ p.status }}</span>
              </div>
              <div class="muted" style="margin-top:6px">{{ p.description || 'Sin descripción' }}</div>
              <div class="muted" style="font-size:.75rem; margin-top:8px">{{ p.owner_email }}</div>
            </a>
          }
        </div>
      } @else { <div class="card muted">No hay proyectos todavía.</div> }
    </div>
  `,
})
export class Projects implements OnInit {
  private api = inject(Api);
  projects = signal<Project[]>([]);
  loading = signal(true);
  creating = signal(false);
  saving = signal(false);
  error = signal('');
  name = '';
  description = '';

  ngOnInit(): void { this.load(); }

  load(): void {
    this.api.page<Project>('/projects/').subscribe({
      next: r => { this.projects.set(r.items); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  create(): void {
    this.saving.set(true);
    this.error.set('');
    this.api.post<Project>('/projects/', { name: this.name, description: this.description }).subscribe({
      next: p => {
        this.projects.update(list => [p, ...list]);
        this.creating.set(false);
        this.saving.set(false);
        this.name = ''; this.description = '';
      },
      error: e => { this.error.set(e.detail || 'No se pudo crear.'); this.saving.set(false); },
    });
  }
}
