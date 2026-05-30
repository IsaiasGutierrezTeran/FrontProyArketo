import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Auth } from '../core/auth/auth';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  styles: [`
    .layout { display: grid; grid-template-columns: 248px 1fr; min-height: 100vh; }
    .side {
      position: sticky; top: 0; height: 100vh; display: flex; flex-direction: column;
      background: linear-gradient(180deg, var(--surface), var(--bg));
      border-right: 1px solid var(--border); padding: 18px 14px;
    }
    .brand { display: flex; align-items: center; gap: 9px; font-size: 1.25rem; font-weight: 800; padding: 6px 10px 20px; letter-spacing: -.02em; }
    .logo { width: 30px; height: 30px; border-radius: 8px; display: grid; place-items: center; color: #fff; font-weight: 800;
      background: linear-gradient(140deg, var(--primary-2), var(--primary-d)); box-shadow: 0 4px 12px rgba(63,111,224,.4); }
    .brand span { color: var(--primary-2); }
    .nav-label { font-size: .68rem; text-transform: uppercase; letter-spacing: .08em; color: var(--faint); padding: 6px 12px; }
    nav { display: flex; flex-direction: column; gap: 2px; }
    nav a { display: flex; align-items: center; gap: 10px; color: var(--muted); padding: 9px 12px; border-radius: 9px; font-weight: 500; position: relative; }
    nav a:hover { background: var(--surface-2); color: var(--text); }
    nav a.active { background: var(--primary-soft); color: var(--primary-2); }
    nav a.active::before { content: ""; position: absolute; left: -14px; top: 8px; bottom: 8px; width: 3px; border-radius: 0 3px 3px 0; background: var(--primary); }
    nav a .ic { width: 18px; text-align: center; }
    .me { margin-top: auto; border-top: 1px solid var(--border); padding-top: 14px; display: flex; align-items: center; gap: 10px; }
    .avatar { width: 38px; height: 38px; border-radius: 50%; display: grid; place-items: center; font-weight: 700; color: #fff; flex: none;
      background: linear-gradient(140deg, #6d7cff, #b06dff); }
    .me .name { font-weight: 600; font-size: .88rem; line-height: 1.2; }
    .main { overflow: auto; min-width: 0; }
    @media (max-width: 720px) {
      .layout { grid-template-columns: 1fr; }
      .side { position: static; height: auto; flex-direction: row; align-items: center; overflow-x: auto; padding: 10px; }
      .brand { padding: 6px 10px; } .nav-label, .me { display: none; }
      nav { flex-direction: row; }
    }
  `],
  template: `
    <div class="layout">
      <aside class="side">
        <div class="brand"><div class="logo">A</div>Ar<span>keto</span></div>
        <div class="nav-label">General</div>
        <nav>
          <a routerLink="/dashboard" routerLinkActive="active"><span class="ic">▦</span> Dashboard</a>
          <a routerLink="/projects" routerLinkActive="active"><span class="ic">▤</span> Proyectos</a>
          <a routerLink="/ai-design" routerLinkActive="active"><span class="ic">✦</span> Diseño IA</a>
        </nav>
        <div class="nav-label">Cuenta</div>
        <nav>
          <a routerLink="/billing" routerLinkActive="active"><span class="ic">◈</span> Suscripción</a>
          <a routerLink="/profile" routerLinkActive="active"><span class="ic">☺</span> Perfil</a>
          @if (auth.hasRole('superadmin')) {
            <a routerLink="/admin/users" routerLinkActive="active"><span class="ic">⛨</span> Usuarios</a>
            <a routerLink="/admin/materials" routerLinkActive="active"><span class="ic">▥</span> Materiales</a>
          }
        </nav>
        <div class="me">
          <div class="avatar">{{ initials() }}</div>
          <div style="min-width:0; flex:1">
            <div class="name" style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap">{{ auth.user()?.full_name || auth.user()?.email }}</div>
            <div class="faint" style="font-size:.74rem; text-transform:capitalize">{{ auth.user()?.role }}</div>
          </div>
          <button class="btn ghost sm" (click)="logout()" title="Cerrar sesión">⎋</button>
        </div>
      </aside>
      <main class="main"><router-outlet /></main>
    </div>
  `,
})
export class Shell {
  auth = inject(Auth);
  private router = inject(Router);

  initials = computed(() => {
    const u = this.auth.user();
    const base = (u?.full_name || u?.email || '?').trim();
    const parts = base.split(/[\s@.]+/).filter(Boolean);
    return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || base[0]?.toUpperCase() || '?';
  });

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
