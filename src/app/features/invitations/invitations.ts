import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { Api, apiErrMsg } from '../../core/api';
import { Invitation } from '../../core/models';

@Component({
  selector: 'app-invitations',
  imports: [DatePipe],
  template: `
    <div class="page">
      <h1>Invitaciones</h1>
      <p class="muted">Proyectos a los que te invitaron a colaborar. Acepta para ver y editar.</p>
      @if (error()) { <div class="alert">{{ error() }}</div> }
      @if (loading()) {
        <div class="spinner">Cargando…</div>
      } @else if (!invites().length) {
        <div class="card muted">No tienes invitaciones pendientes.</div>
      } @else {
        <div class="card">
          @for (inv of invites(); track inv.id) {
            <div class="row spread" style="padding:12px 0; border-bottom:1px solid var(--border)">
              <div style="min-width:0">
                <div style="font-weight:600">{{ inv.project_name }}</div>
                <div class="muted" style="font-size:.8rem">
                  Te invitó {{ inv.invited_by_email || inv.owner_email }} · rol {{ inv.role }} · {{ inv.created_at | date:'short' }}
                </div>
              </div>
              <div class="row" style="gap:6px; flex:none">
                <button class="btn sm" [disabled]="busy() === inv.id" (click)="accept(inv)">Aceptar</button>
                <button class="btn sm ghost" [disabled]="busy() === inv.id" (click)="decline(inv)">Rechazar</button>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class Invitations implements OnInit {
  private api = inject(Api);
  invites = signal<Invitation[]>([]);
  loading = signal(true);
  busy = signal<number | null>(null);
  error = signal('');

  ngOnInit(): void { this.load(); }

  private load(): void {
    this.loading.set(true);
    this.api.get<Invitation[]>('/invitations/').subscribe({
      next: i => { this.invites.set(i); this.loading.set(false); },
      error: e => { this.error.set(apiErrMsg(e)); this.loading.set(false); },
    });
  }

  accept(inv: Invitation): void {
    this.busy.set(inv.id); this.error.set('');
    this.api.post(`/invitations/${inv.id}/accept/`, {}).subscribe({
      next: () => { this.invites.update(l => l.filter(x => x.id !== inv.id)); this.busy.set(null); },
      error: e => { this.error.set(apiErrMsg(e, 'No se pudo aceptar.')); this.busy.set(null); },
    });
  }

  decline(inv: Invitation): void {
    this.busy.set(inv.id); this.error.set('');
    this.api.post(`/invitations/${inv.id}/decline/`, {}).subscribe({
      next: () => { this.invites.update(l => l.filter(x => x.id !== inv.id)); this.busy.set(null); },
      error: e => { this.error.set(apiErrMsg(e, 'No se pudo rechazar.')); this.busy.set(null); },
    });
  }
}
