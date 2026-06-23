import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Api, apiErrMsg } from '../../core/api';
import { Auth } from '../../core/auth/auth';
import { SubscriptionPlan } from '../../core/models';

/** Pantalla de pago (checkout) para activar un plan. Pago de demostración. */
@Component({
  selector: 'app-checkout',
  imports: [FormsModule, RouterLink],
  styles: [`
    .cc { background: linear-gradient(135deg, #3f6fe0, #6d4bff); color:#fff; border-radius:14px; padding:18px; margin-bottom:16px; }
    .cc .num { font-size:1.4rem; letter-spacing:2px; margin:14px 0 10px; font-variant-numeric: tabular-nums; }
    .cc .row { display:flex; justify-content:space-between; font-size:.8rem; opacity:.9; }
  `],
  template: `
    <div class="page" style="max-width:540px">
      <a routerLink="/billing" class="muted">← Volver a planes</a>
      <h1>Pago</h1>
      @if (plan(); as p) {
        <div class="card" style="margin-bottom:16px">
          <div class="row spread"><strong>Plan {{ p.name }}</strong><strong>Bs {{ p.price }}/mes</strong></div>
        </div>

        <!-- Tarjeta visual -->
        <div class="cc">
          <div style="font-size:.8rem; opacity:.9">Tarjeta</div>
          <div class="num">{{ card || '•••• •••• •••• ••••' }}</div>
          <div class="row"><span>{{ name || 'NOMBRE APELLIDO' }}</span><span>{{ exp || 'MM/AA' }}</span></div>
        </div>

        <form class="card" (ngSubmit)="pay()">
          <label>Número de tarjeta</label>
          <input class="input" [(ngModel)]="card" name="card" placeholder="4242 4242 4242 4242" maxlength="19" inputmode="numeric">
          <div class="grid cols-2" style="margin-top:10px">
            <div><label>Vencimiento</label><input class="input" [(ngModel)]="exp" name="exp" placeholder="MM/AA" maxlength="5"></div>
            <div><label>CVC</label><input class="input" [(ngModel)]="cvc" name="cvc" placeholder="123" maxlength="4" inputmode="numeric"></div>
          </div>
          <label style="margin-top:10px">Nombre en la tarjeta</label>
          <input class="input" [(ngModel)]="name" name="name" placeholder="NOMBRE APELLIDO">

          @if (error()) { <div class="alert" style="margin-top:10px">{{ error() }}</div> }
          <button class="btn" style="width:100%; justify-content:center; margin-top:14px" [disabled]="busy()">
            {{ busy() ? 'Procesando pago…' : 'Pagar Bs ' + p.price }}
          </button>
          <div class="muted" style="font-size:.78rem; margin-top:10px; text-align:center">
            Pago de demostración — no se cobra dinero real. Tarjeta de prueba: 4242 4242 4242 4242.
          </div>
        </form>
      } @else { <div class="spinner">Cargando…</div> }
    </div>
  `,
})
export class Checkout implements OnInit {
  private api = inject(Api);
  private auth = inject(Auth);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  code = '';
  plan = signal<SubscriptionPlan | null>(null);
  card = '4242 4242 4242 4242';
  exp = '12/30';
  cvc = '123';
  name = '';
  busy = signal(false);
  error = signal('');

  ngOnInit(): void {
    this.code = this.route.snapshot.paramMap.get('code') || '';
    this.api.page<SubscriptionPlan>('/billing/plans/').subscribe(r => {
      this.plan.set(r.items.find(p => p.code === this.code) || null);
    });
  }

  private valid(): boolean {
    return this.card.replace(/\s/g, '').length >= 13 && /^\d{2}\/\d{2}$/.test(this.exp) && this.cvc.length >= 3;
  }

  pay(): void {
    if (!this.valid()) { this.error.set('Revisa los datos de la tarjeta (usa 4242 4242 4242 4242, MM/AA, CVC).'); return; }
    this.busy.set(true); this.error.set('');
    // Simula el procesamiento del pago y luego activa el plan en el backend.
    setTimeout(() => {
      this.api.post<{ checkout_url?: string }>('/billing/subscribe', { plan: this.code }).subscribe({
        next: s => {
          // Si Stripe está activo, el backend devuelve su checkout_url -> redirigir allí.
          if (s?.checkout_url) { window.location.href = s.checkout_url; return; }
          this.auth.refreshUser();
          this.router.navigate(['/billing'], { queryParams: { paid: '1' } });
        },
        error: e => { this.error.set(apiErrMsg(e, 'No se pudo procesar el pago.')); this.busy.set(false); },
      });
    }, 1600);
  }
}
