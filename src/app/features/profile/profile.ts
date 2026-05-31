import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Api } from '../../core/api';
import { Auth } from '../../core/auth/auth';
import { User } from '../../core/models';

@Component({
  selector: 'app-profile',
  imports: [FormsModule],
  template: `
    <div class="page" style="max-width:560px">
      <h1>Mi perfil</h1>
      @if (ok()) { <div class="alert ok">Perfil actualizado.</div> }
      @if (error()) { <div class="alert">{{ error() }}</div> }
      <form class="card" (ngSubmit)="save()">
        <label>Email</label>
        <input class="input" [value]="email" disabled>
        <label>Rol</label>
        <input class="input" [value]="role" disabled>
        <label>Nombre completo</label>
        <input class="input" name="full_name" [(ngModel)]="full_name">
        <label>Teléfono</label>
        <input class="input" name="phone" [(ngModel)]="phone">
        <button class="btn" style="margin-top:14px" [disabled]="saving()">{{ saving() ? 'Guardando…' : 'Guardar' }}</button>
      </form>
    </div>
  `,
})
export class Profile implements OnInit {
  private api = inject(Api);
  private auth = inject(Auth);

  email = ''; role = ''; full_name = ''; phone = '';
  saving = signal(false); ok = signal(false); error = signal('');

  ngOnInit(): void {
    this.api.get<User>('/auth/me').subscribe(u => {
      this.email = u.email; this.role = u.role; this.full_name = u.full_name; this.phone = u.phone;
    });
  }

  save(): void {
    this.saving.set(true); this.ok.set(false); this.error.set('');
    this.api.patch<User>('/auth/me', { full_name: this.full_name, phone: this.phone }).subscribe({
      next: u => { this.auth.user.set(u); this.ok.set(true); this.saving.set(false); },
      error: e => { this.error.set(e.detail || 'No se pudo guardar.'); this.saving.set(false); },
    });
  }
}
