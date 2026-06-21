import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Api, apiErrMsg } from '../../core/api';
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
        <h3 style="margin-top:0">Datos personales</h3>
        @if (avatarUrl()) {
          <img [src]="avatarUrl()" alt="avatar" style="width:84px;height:84px;border-radius:50%;object-fit:cover;margin-bottom:10px">
        }
        <label>Foto de perfil</label>
        <input type="file" accept="image/*" (change)="pickAvatar($event)">
        <label>Email</label>
        <input class="input" name="email" type="email" [(ngModel)]="email">
        <label>Rol</label>
        <input class="input" [value]="role" disabled>
        <label>Nombre completo</label>
        <input class="input" name="full_name" [(ngModel)]="full_name">
        <label>Teléfono</label>
        <input class="input" name="phone" [(ngModel)]="phone">
        <button class="btn" style="margin-top:14px" [disabled]="saving()">{{ saving() ? 'Guardando…' : 'Guardar cambios' }}</button>
      </form>

      <form class="card" style="margin-top:16px" (ngSubmit)="changePassword()">
        <h3 style="margin-top:0">Cambiar contraseña</h3>
        @if (pwOk()) { <div class="alert ok">Contraseña actualizada.</div> }
        @if (pwError()) { <div class="alert">{{ pwError() }}</div> }
        <label>Contraseña actual</label>
        <input class="input" type="password" name="cur" [(ngModel)]="currentPassword">
        <label>Nueva contraseña</label>
        <input class="input" type="password" name="new" [(ngModel)]="newPassword">
        <button class="btn" style="margin-top:14px" [disabled]="pwSaving() || !currentPassword || !newPassword">
          {{ pwSaving() ? 'Actualizando…' : 'Actualizar contraseña' }}</button>
      </form>
    </div>
  `,
})
export class Profile implements OnInit {
  private api = inject(Api);
  private auth = inject(Auth);

  email = ''; role = ''; full_name = ''; phone = '';
  avatarUrl = signal<string | null>(null);
  avatarFile: File | null = null;
  saving = signal(false); ok = signal(false); error = signal('');

  currentPassword = ''; newPassword = '';
  pwSaving = signal(false); pwOk = signal(false); pwError = signal('');

  ngOnInit(): void {
    this.api.get<User>('/auth/me').subscribe(u => {
      this.email = u.email; this.role = u.role; this.full_name = u.full_name;
      this.phone = u.phone; this.avatarUrl.set(u.avatar);
    });
  }

  pickAvatar(e: Event): void {
    this.avatarFile = (e.target as HTMLInputElement).files?.[0] || null;
  }

  save(): void {
    this.saving.set(true); this.ok.set(false); this.error.set('');
    const fd = new FormData();
    fd.append('full_name', this.full_name);
    fd.append('phone', this.phone ?? '');
    fd.append('email', this.email);
    if (this.avatarFile) fd.append('avatar', this.avatarFile);
    this.api.patchForm<User>('/auth/me', fd).subscribe({
      next: u => {
        this.auth.user.set(u); this.avatarUrl.set(u.avatar); this.avatarFile = null;
        this.ok.set(true); this.saving.set(false);
      },
      error: e => { this.error.set(apiErrMsg(e, 'No se pudo guardar.')); this.saving.set(false); },
    });
  }

  changePassword(): void {
    this.pwSaving.set(true); this.pwOk.set(false); this.pwError.set('');
    this.api.post('/auth/change-password', {
      current_password: this.currentPassword, new_password: this.newPassword,
    }).subscribe({
      next: () => {
        this.currentPassword = ''; this.newPassword = '';
        this.pwOk.set(true); this.pwSaving.set(false);
      },
      error: e => { this.pwError.set(apiErrMsg(e, 'No se pudo cambiar la contraseña.')); this.pwSaving.set(false); },
    });
  }
}
