import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Api } from '../../core/api';
import { Auth } from '../../core/auth/auth';
import { Subscription, SubscriptionPlan } from '../../core/models';

@Component({
  selector: 'app-billing',
  imports: [],
  styles: [`.plan.current { border-color: var(--primary); }`],
  template: `
    <div class="page">
      <h1>Suscripción</h1>
      @if (sub(); as s) {
        <div class="card" style="margin-bottom:16px">
          Plan actual: <strong>{{ s.plan_code || 'free' }}</strong>
          <span class="badge" [class]="s.status" style="margin-left:8px">{{ s.status }}</span>
          @if (s.status === 'active') {
            <button class="btn ghost sm right" (click)="cancel()">Cancelar</button>
          }
        </div>
      }
      @if (msg()) { <div class="alert ok">{{ msg() }}</div> }
      <div class="grid cols-3">
        @for (p of plans(); track p.id) {
          <div class="card plan" [class.current]="sub()?.plan_code === p.code">
            <div class="row spread"><h3 style="margin:0">{{ p.name }}</h3><strong>Bs {{ p.price }}/{{ p.interval === 'year' ? 'año' : 'mes' }}</strong></div>
            <ul class="muted" style="padding-left:18px">
              @for (f of p.features; track f) { <li>{{ f }}</li> }
            </ul>
            <button class="btn sm" style="width:100%; justify-content:center"
                    [disabled]="busy() || sub()?.plan_code === p.code" (click)="subscribe(p)">
              {{ sub()?.plan_code === p.code ? 'Tu plan' : 'Elegir' }}
            </button>
          </div>
        }
      </div>
    </div>
  `,
})
export class Billing implements OnInit {
  private api = inject(Api);
  private auth = inject(Auth);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  plans = signal<SubscriptionPlan[]>([]);
  sub = signal<Subscription | null>(null);
  busy = signal(false);
  msg = signal('');

  ngOnInit(): void {
    if (this.route.snapshot.queryParamMap.get('paid') === '1') this.msg.set('Pago aprobado. Plan activado.');
    this.api.page<SubscriptionPlan>('/billing/plans/').subscribe(r => this.plans.set(r.items));
    this.refreshSub();
  }

  private refreshSub(): void {
    this.api.get<Subscription>('/billing/subscription').subscribe(s => this.sub.set(s));
  }

  subscribe(p: SubscriptionPlan): void {
    // Plan de pago -> pantalla de checkout (pago). Plan gratis -> activación directa.
    if (Number(p.price) > 0) { this.router.navigate(['/billing/checkout', p.code]); return; }
    this.busy.set(true); this.msg.set('');
    this.api.post<Subscription>('/billing/subscribe', { plan: p.code }).subscribe({
      next: () => {
        this.busy.set(false);
        this.msg.set(`Plan ${p.name} activado.`);
        this.refreshSub();
        this.auth.refreshUser();
      },
      error: () => this.busy.set(false),
    });
  }

  cancel(): void {
    this.api.post<Subscription>('/billing/cancel', {}).subscribe(() => { this.msg.set('Suscripción cancelada.'); this.refreshSub(); this.auth.refreshUser(); });
  }
}
