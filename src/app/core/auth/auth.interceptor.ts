import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { Auth } from './auth';

const AUTH_PATHS = ['/auth/login', '/auth/register', '/auth/refresh'];

/** Adds the Bearer token; on a 401 it refreshes once and retries the request. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(Auth);
  const isAuthCall = AUTH_PATHS.some(p => req.url.includes(p));
  const token = auth.access;

  const authed = token && !isAuthCall
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authed).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401 && !isAuthCall && auth.refreshToken) {
        return auth.refresh().pipe(
          switchMap(fresh => next(req.clone({ setHeaders: { Authorization: `Bearer ${fresh}` } }))),
          catchError(e => { auth.logout(); return throwError(() => e); }),
        );
      }
      return throwError(() => err);
    }),
  );
};
