import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { Pagination } from './models';

/** Standard success envelope: { success, data, meta }. */
interface Envelope<T> { success: boolean; data: T; meta?: { pagination?: Pagination }; }

/** Normalized error surfaced to components: error.code / error.detail. */
export interface ApiError { code: string; detail: any; status: number; }

export interface Page<T> { items: T[]; pagination?: Pagination; }

@Injectable({ providedIn: 'root' })
export class Api {
  private http = inject(HttpClient);
  private base = environment.apiBase;

  private params(query?: Record<string, any>): HttpParams {
    let p = new HttpParams();
    if (query) for (const k of Object.keys(query)) {
      if (query[k] !== null && query[k] !== undefined) p = p.set(k, String(query[k]));
    }
    return p;
  }

  private fail = (err: HttpErrorResponse) => {
    const body = err.error;
    const apiErr: ApiError = body?.error
      ? { code: body.error.code, detail: body.error.detail, status: err.status }
      : { code: 'network_error', detail: err.message, status: err.status };
    return throwError(() => apiErr);
  };

  get<T>(path: string, query?: Record<string, any>): Observable<T> {
    return this.http.get<Envelope<T>>(this.base + path, { params: this.params(query) })
      .pipe(map(r => r.data), catchError(this.fail));
  }

  /** For paginated list endpoints: returns { items, pagination }. */
  page<T>(path: string, query?: Record<string, any>): Observable<Page<T>> {
    return this.http.get<Envelope<T[]>>(this.base + path, { params: this.params(query) })
      .pipe(map(r => ({ items: r.data, pagination: r.meta?.pagination })), catchError(this.fail));
  }

  post<T>(path: string, body: any): Observable<T> {
    return this.http.post<Envelope<T>>(this.base + path, body).pipe(map(r => r.data), catchError(this.fail));
  }

  patch<T>(path: string, body: any): Observable<T> {
    return this.http.patch<Envelope<T>>(this.base + path, body).pipe(map(r => r.data), catchError(this.fail));
  }

  delete<T>(path: string): Observable<T> {
    return this.http.delete<Envelope<T>>(this.base + path).pipe(map(r => r?.data), catchError(this.fail));
  }

  /** Multipart upload (plans, GLB import). */
  postForm<T>(path: string, form: FormData): Observable<T> {
    return this.http.post<Envelope<T>>(this.base + path, form).pipe(map(r => r.data), catchError(this.fail));
  }
}

/** Extrae un mensaje legible de un ApiError (detail puede ser string, {campo:[msgs]} u objeto). */
export function apiErrMsg(e: any, fallback = 'Ocurrió un error.'): string {
  const d = e?.detail ?? e;
  if (typeof d === 'string') return d;
  if (d && typeof d === 'object') {
    const first: any = Object.values(d)[0];
    if (Array.isArray(first)) return String(first[0]);
    if (typeof first === 'string') return first;
    try { return JSON.stringify(d); } catch { return fallback; }
  }
  return fallback;
}
