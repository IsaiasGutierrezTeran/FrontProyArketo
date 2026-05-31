import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Auth } from '../../core/auth/auth';
import { ApiError } from '../../core/api';

@Component({
  selector: 'app-register',
  imports: [FormsModule, RouterLink],
  styles: [`
    .wrap { min-height: 100vh; display: grid; place-items: center; padding: 20px;
      background: radial-gradient(900px 500px at 50% -10%, rgba(91,140,255,.18), transparent 60%); }
    .box { width: 400px; padding: 28px; }
    .logo { width: 46px; height: 46px; border-radius: 12px; display: grid; place-items: center; margin: 0 auto 12px;
      color: #fff; font-weight: 800; font-size: 1.4rem; background: linear-gradient(140deg, var(--primary-2), var(--primary-d)); box-shadow: 0 8px 22px rgba(63,111,224,.45); }
    .brand { font-size: 1.6rem; font-weight: 800; text-align: center; letter-spacing: -.02em; }
    .brand span { color: var(--primary-2); }
  `],
  template: `
    <div class="wrap">
      <form class="card box" (ngSubmit)="submit()">
        <div class="logo">A</div>
        <div class="brand">Ar<span>keto</span></div>
        <p class="muted" style="text-align:center; margin-top:2px">Crea tu cuenta</p>
        @if (error()) { <div class="alert">{{ error() }}</div> }
        @if (ok()) { <div class="alert ok">Cuenta creada. Redirigiendo al login…</div> }
        <label>Nombre completo</label>
        <input class="input" name="full_name" [(ngModel)]="full_name">
        <label>Email</label>
        <input class="input" type="email" name="email" [(ngModel)]="email" required>
        <label>Teléfono (opcional)</label>
        <input class="input" name="phone" [(ngModel)]="phone">
        <label>Contraseña</label>
        <input class="input" type="password" name="password" [(ngModel)]="password" required>
        <button class="btn" style="width:100%; margin-top:16px; justify-content:center" [disabled]="loading()">
          {{ loading() ? 'Creando…' : 'Registrarme' }}
        </button>
        <p class="muted" style="text-align:center; margin-bottom:0">
          ¿Ya tienes cuenta? <a routerLink="/login">Inicia sesión</a>
        </p>
      </form>
    </div>
  `,
})
export class Register {
  private auth = inject(Auth);
  private router = inject(Router);

  full_name = '';
  email = '';
  phone = '';
  password = '';
  loading = signal(false);
  error = signal('');
  ok = signal(false);

  submit(): void {
    this.error.set('');
    this.loading.set(true);
    this.auth.register({ email: this.email, password: this.password, full_name: this.full_name, phone: this.phone }).subscribe({
      next: () => {
        this.ok.set(true);
        setTimeout(() => this.router.navigate(['/login']), 900);
      },
      error: (e: ApiError) => {
        const d = e.detail;
        this.error.set(typeof d === 'string' ? d : (d?.email?.[0] || d?.password?.[0] || 'No se pudo registrar.'));
        this.loading.set(false);
      },
    });
  }
}
