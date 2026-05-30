import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Role } from '../models';
import { Auth } from './auth';

export const authGuard: CanActivateFn = () => {
  const auth = inject(Auth);
  const router = inject(Router);
  if (auth.isAuthenticated()) return true;
  router.navigate(['/login']);
  return false;
};

/** Allow only the given roles (superadmin always allowed). */
export const roleGuard = (...roles: Role[]): CanActivateFn => () => {
  const auth = inject(Auth);
  const router = inject(Router);
  if (auth.hasRole(...roles)) return true;
  router.navigate(['/']);
  return false;
};
