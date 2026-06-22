import { Routes } from '@angular/router';
import { authGuard, roleGuard } from './core/auth/guards';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./features/auth/login').then(m => m.Login) },
  { path: 'register', loadComponent: () => import('./features/auth/register').then(m => m.Register) },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./shell/shell').then(m => m.Shell),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', loadComponent: () => import('./features/dashboard/dashboard').then(m => m.Dashboard) },
      { path: 'projects', loadComponent: () => import('./features/projects/projects').then(m => m.Projects) },
      { path: 'projects/:id', loadComponent: () => import('./features/projects/project-detail').then(m => m.ProjectDetail) },
      { path: 'invitations', loadComponent: () => import('./features/invitations/invitations').then(m => m.Invitations) },
      { path: 'projects/:id/budget', loadComponent: () => import('./features/budget/budget').then(m => m.BudgetScreen) },
      { path: 'projects/:id/risk', loadComponent: () => import('./features/risk/risk').then(m => m.Risk) },
      { path: 'projects/:id/edit3d', loadComponent: () => import('./features/modeling/scene-editor').then(m => m.SceneEditor) },
      { path: 'projects/:id/versions', loadComponent: () => import('./features/versioning/versions').then(m => m.Versions) },
      {
        path: 'ai-design',
        canActivate: [roleGuard('arquitecto')],
        loadComponent: () => import('./features/ai-design/ai-design').then(m => m.AiDesign),
      },
      { path: 'profile', loadComponent: () => import('./features/profile/profile').then(m => m.Profile) },
      { path: 'billing', loadComponent: () => import('./features/billing/billing').then(m => m.Billing) },
      {
        path: 'admin/users',
        canActivate: [roleGuard('superadmin')],
        loadComponent: () => import('./features/admin/users').then(m => m.Users),
      },
      {
        path: 'admin/materials',
        canActivate: [roleGuard('superadmin')],
        loadComponent: () => import('./features/budget/materials').then(m => m.Materials),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
