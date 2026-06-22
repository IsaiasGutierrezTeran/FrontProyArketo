import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, map, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Role, User } from '../models';

interface LoginData { access: string; refresh: string; user: User; }

const ACCESS = 'arketo.access';
const REFRESH = 'arketo.refresh';
const USER = 'arketo.user';

@Injectable({ providedIn: 'root' })
export class Auth {
  private http = inject(HttpClient);
  private base = environment.apiBase;

  readonly user = signal<User | null>(this.readUser());
  readonly isAuthenticated = computed(() => !!this.user());

  get access(): string | null { return localStorage.getItem(ACCESS); }
  get refreshToken(): string | null { return localStorage.getItem(REFRESH); }

  login(email: string, password: string): Observable<User> {
    return this.http.post<{ data: LoginData }>(`${this.base}/auth/login`, { email, password })
      .pipe(map(r => r.data), tap(d => this.setSession(d)), map(d => d.user));
  }

  register(body: { email: string; password: string; full_name?: string; phone?: string }): Observable<User> {
    return this.http.post<{ data: User }>(`${this.base}/auth/register`, body).pipe(map(r => r.data));
  }

  refresh(): Observable<string> {
    return this.http.post<{ data: { access: string; refresh?: string } }>(
      `${this.base}/auth/refresh`, { refresh: this.refreshToken }
    ).pipe(
      map(r => r.data),
      tap(d => {
        localStorage.setItem(ACCESS, d.access);
        if (d.refresh) localStorage.setItem(REFRESH, d.refresh);
      }),
      map(d => d.access),
    );
  }

  /** Refresca el usuario en caché desde /auth/me (plan y rol actuales). */
  refreshUser(): void {
    this.http.get<{ data: User }>(`${this.base}/auth/me`).subscribe({
      next: r => { localStorage.setItem(USER, JSON.stringify(r.data)); this.user.set(r.data); },
      error: () => {},
    });
  }

  logout(): void {
    const refresh = this.refreshToken;
    if (refresh) this.http.post(`${this.base}/auth/logout`, { refresh }).subscribe({ error: () => {} });
    localStorage.removeItem(ACCESS);
    localStorage.removeItem(REFRESH);
    localStorage.removeItem(USER);
    this.user.set(null);
  }

  /** True for the given roles (superadmin always passes). */
  hasRole(...roles: Role[]): boolean {
    const u = this.user();
    return !!u && (u.role === 'superadmin' || roles.includes(u.role));
  }

  private setSession(d: LoginData): void {
    localStorage.setItem(ACCESS, d.access);
    localStorage.setItem(REFRESH, d.refresh);
    localStorage.setItem(USER, JSON.stringify(d.user));
    this.user.set(d.user);
  }

  private readUser(): User | null {
    const raw = localStorage.getItem(USER);
    return raw ? JSON.parse(raw) as User : null;
  }
}
