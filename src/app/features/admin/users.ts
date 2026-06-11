import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Api } from '../../core/api';
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

      <div class="card">
        <table>
          <tr><th>Email</th><th>Nombre</th><th>Rol</th><th>Activo</th></tr>
          @for (u of users(); track u.id) {
            <tr><td>{{ u.email }}</td><td>{{ u.full_name }}</td>
              <td><span class="badge">{{ u.role }}</span></td>
              <td>{{ u.is_active ? '✓' : '—' }}</td></tr>
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
  f = { email: '', full_name: '', password: '', role: 'cliente' };

  ngOnInit(): void { this.load(); }

  load(): void { this.api.page<User>('/users/').subscribe(r => this.users.set(r.items)); }

  create(): void {
    this.saving.set(true); this.error.set('');
    this.api.post<User>('/users/', this.f).subscribe({
      next: u => { this.users.update(l => [u, ...l]); this.creating.set(false); this.saving.set(false); this.f = { email: '', full_name: '', password: '', role: 'cliente' }; },
      error: e => { this.error.set(typeof e.detail === 'string' ? e.detail : JSON.stringify(e.detail)); this.saving.set(false); },
    });
  }
}
