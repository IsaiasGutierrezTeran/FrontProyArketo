import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Auth } from '../../core/auth/auth';
import { ApiError } from '../../core/api';

interface QuickUser { label: string; email: string; password: string; initial: string; }

@Component({
  selector: 'app-login',
  imports: [FormsModule, RouterLink],
  styles: [`
    .wrap { min-height: 100vh; display: grid; place-items: center; padding: 20px;
      background: radial-gradient(900px 500px at 50% -10%, rgba(91,140,255,.18), transparent 60%); }
    .box { width: 400px; padding: 28px; }
    .logo { width: 46px; height: 46px; border-radius: 12px; display: grid; place-items: center; margin: 0 auto 12px;
      color: #fff; font-weight: 800; font-size: 1.4rem; background: linear-gradient(140deg, var(--primary-2), var(--primary-d)); box-shadow: 0 8px 22px rgba(63,111,224,.45); }
    .brand { font-size: 1.6rem; font-weight: 800; text-align: center; letter-spacing: -.02em; }
    .brand span { color: var(--primary-2); }
    .sub { text-align: center; margin-top: 2px; }
    .qa { width: 400px; margin-top: 14px; padding: 18px; }
    .qa-head { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
    .qa-head .t { font-size: .78rem; font-weight: 700; letter-spacing: .06em; color: var(--muted); }
    .qa-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .qa-btn { display: flex; align-items: center; gap: 9px; background: var(--surface-2); border: 1px solid var(--border);
      color: var(--text); border-radius: 10px; padding: 8px 10px; cursor: pointer; font: inherit; text-align: left; transition: border-color .12s, background .12s; }
    .qa-btn:hover { border-color: var(--primary); background: var(--surface-3); }
    .qa-av { width: 30px; height: 30px; border-radius: 50%; display: grid; place-items: center; flex: none;
      color: #fff; font-weight: 700; font-size: .85rem; background: linear-gradient(140deg, var(--primary-2), var(--primary-d)); }
    .qa-btn small { color: var(--muted); display: block; font-size: .7rem; }
  `],
  template: `
    <div class="wrap">
      <div>
        <form class="card box" (ngSubmit)="submit()">
          <div class="logo">A</div>
          <div class="brand">Ar<span>keto</span></div>
          <p class="muted sub">Inteligencia espacial para tus obras</p>
          @if (error()) { <div class="alert" style="margin-top:8px">{{ error() }}</div> }
          <label>Email</label>
          <input class="input" type="email" name="email" [(ngModel)]="email" required autocomplete="email" placeholder="tu@correo.com">
          <label>Contraseña</label>
          <input class="input" type="password" name="password" [(ngModel)]="password" required autocomplete="current-password" placeholder="••••••••">
          <button class="btn block" style="margin-top:18px" [disabled]="loading()">
            {{ loading() ? 'Entrando…' : 'Entrar' }}
          </button>
          <p class="muted" style="text-align:center; margin:14px 0 0">
            ¿No tienes cuenta? <a routerLink="/register">Regístrate</a>
          </p>
        </form>

        <div class="card qa">
          <div class="qa-head"><span class="t">ACCESO RÁPIDO</span><span class="badge active">DEMO</span></div>
          <div class="qa-grid">
            @for (u of quick; track u.email) {
              <button type="button" class="qa-btn" (click)="pick(u)">
                <span class="qa-av">{{ u.initial }}</span>
                <span>{{ u.label }}<small>{{ u.email }}</small></span>
              </button>
            }
          </div>
          <p class="muted" style="font-size:.78rem; margin:10px 0 0">Elige un perfil para autocompletar, luego pulsa Entrar.</p>
        </div>
      </div>
    </div>
  `,
})
export class Login {
  private auth = inject(Auth);
  private router = inject(Router);

  email = '';
  password = '';
  loading = signal(false);
  error = signal('');

  readonly quick: QuickUser[] = [
    { label: 'Administrador', email: 'admin@arketo.dev', password: 'Admin12345', initial: 'A' },
    { label: 'Cliente', email: 'cliente@arketo.dev', password: 'Demo12345', initial: 'C' },
    { label: 'Arquitecto', email: 'arquitecto@arketo.dev', password: 'Demo12345', initial: 'Q' },
    { label: 'Ingeniero', email: 'ingeniero@arketo.dev', password: 'Demo12345', initial: 'I' },
    { label: 'Arq. Carla', email: 'carla@arketo.dev', password: 'Demo12345', initial: 'C' },
    { label: 'Ing. Sofía', email: 'sofia@arketo.dev', password: 'Demo12345', initial: 'S' },
  ];

  pick(u: QuickUser): void {
    this.email = u.email;
    this.password = u.password;
    this.error.set('');
  }

  submit(): void {
    this.error.set('');
    this.loading.set(true);
    this.auth.login(this.email, this.password).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: (e: ApiError) => {
        this.error.set(e.code === 'unauthorized' ? 'Credenciales inválidas.' : (e.detail || 'Error al iniciar sesión.'));
        this.loading.set(false);
      },
    });
  }
}
