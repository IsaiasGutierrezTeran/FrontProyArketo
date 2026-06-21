import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Api, apiErrMsg } from '../../core/api';
import { User } from '../../core/models';

@Component({
  selector: 'app-admin-users',
  imports: [FormsModule],
  template: `
    <div class="page">
      <div class="row spread" style="margin-bottom:14px">
        <h1 style="margin:0">Usuarios</h1>
        <button class="btn" (click)="creating.set(!creating())">+ Nuevo usuario</button>
      </div>

      @if (creating()) {
        <form class="card" style="margin-bottom:16px" (ngSubmit)="create()">
          <div class="grid cols-2">
            <div><label>Email</label><input class="input" name="email" [(ngModel)]="f.email"></div>
            <div><label>Nombre</label><input class="input" name="full_name" [(ngModel)]="f.full_name"></div>
            <div><label>Contraseña</label><input class="input" type="password" name="password" [(ngModel)]="f.password"></div>
            <div><label>Rol</label>
              <select [(ngModel)]="f.role" name="role">
                <option value="cliente">cliente</option><option value="arquitecto">arquitecto</option>
                <option value="ingeniero">ingeniero</option><option value="superadmin">superadmin</option>
              </select>
            </div>
          </div>
          @if (error()) { <div class="alert" style="margin-top:10px">{{ error() }}</div> }
          <button class="btn" style="margin-top:12px" [disabled]="saving()">{{ saving() ? 'Guardando…' : 'Crear' }}</button>
        </form>
      }

      @if (rowError()) { <div class="alert" style="margin-bottom:12px">{{ rowError() }}</div> }
      <div class="card">
        <table>
          <tr><th>Email</th><th>Nombre</th><th>Rol</th><th>Estado</th><th>Acciones</th></tr>
          @for (u of users(); track u.id) {
            <tr [style.opacity]="u.is_active ? 1 : 0.5">
              <td>{{ u.email }}</td><td>{{ u.full_name }}</td>
              <td>
                <select [ngModel]="u.role" (ngModelChange)="changeRole(u, $event)" [ngModelOptions]="{standalone:true}">
                  <option value="cliente">cliente</option><option value="arquitecto">arquitecto</option>
                  <option value="ingeniero">ingeniero</option><option value="superadmin">superadmin</option>
                </select>
              </td>
              <td>{{ u.is_active ? 'Activo' : 'De baja' }}</td>
              <td>
                @if (u.is_active) {
                  <button class="btn sm danger" [disabled]="busy()===u.id" (click)="deactivate(u)">Dar de baja</button>
                } @else {
                  <button class="btn sm" [disabled]="busy()===u.id" (click)="reactivate(u)">Reactivar</button>
                }
              </td>
            </tr>
          }
        </table>
      </div>
    </div>
  `,
})
export class Users implements OnInit {
  private api = inject(Api);
  users = signal<User[]>([]);
  creating = signal(false);
  saving = signal(false);
  error = signal('');
  rowError = signal('');
  busy = signal<number | null>(null);
  f = { email: '', full_name: '', password: '', role: 'cliente' };

  ngOnInit(): void { this.load(); }

  load(): void { this.api.page<User>('/users/').subscribe(r => this.users.set(r.items)); }

  private replace(u: User): void { this.users.update(l => l.map(x => x.id === u.id ? u : x)); }

  changeRole(u: User, role: string): void {
    this.busy.set(u.id); this.rowError.set('');
    this.api.patch<User>(`/users/${u.id}/`, { role }).subscribe({
      next: upd => { this.replace(upd); this.busy.set(null); },
      error: e => { this.rowError.set(apiErrMsg(e, 'No se pudo cambiar el rol.')); this.busy.set(null); this.load(); },
    });
  }

  deactivate(u: User): void {
    if (!confirm(`¿Dar de baja a ${u.email}? (se conserva el historial)`)) return;
    this.busy.set(u.id); this.rowError.set('');
    this.api.delete(`/users/${u.id}/`).subscribe({
      next: () => { this.replace({ ...u, is_active: false }); this.busy.set(null); },
      error: e => { this.rowError.set(apiErrMsg(e, 'No se pudo dar de baja.')); this.busy.set(null); },
    });
  }

  reactivate(u: User): void {
    this.busy.set(u.id); this.rowError.set('');
    this.api.post<User>(`/users/${u.id}/reactivate/`, {}).subscribe({
      next: upd => { this.replace(upd); this.busy.set(null); },
      error: e => { this.rowError.set(apiErrMsg(e, 'No se pudo reactivar.')); this.busy.set(null); },
    });
  }

  create(): void {
    this.saving.set(true); this.error.set('');
    this.api.post<User>('/users/', this.f).subscribe({
      next: u => { this.users.update(l => [u, ...l]); this.creating.set(false); this.saving.set(false); this.f = { email: '', full_name: '', password: '', role: 'cliente' }; },
      error: e => { this.error.set(typeof e.detail === 'string' ? e.detail : JSON.stringify(e.detail)); this.saving.set(false); },
    });
  }
}
