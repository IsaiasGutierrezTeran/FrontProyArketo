import { CUSTOM_ELEMENTS_SCHEMA, Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Api, apiErrMsg } from '../../core/api';
import { DesignRequest, Model3D, Project } from '../../core/models';
import { EstadoPipe } from '../../core/estado.pipe';

@Component({
  selector: 'app-ai-design',
  imports: [FormsModule, RouterLink, EstadoPipe],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  styles: [`
    .tabs { display:flex; gap:4px; margin:14px 0; border-bottom:1px solid var(--border); }
    .tabs button { background:none; border:none; color:var(--muted); padding:10px 14px; cursor:pointer; font:inherit; border-bottom:2px solid transparent; }
    .tabs button.on { color:var(--text); border-bottom-color:var(--primary); }
    model-viewer { width:100%; height:520px; border-radius:16px; background:#11151c radial-gradient(120% 120% at 50% 0%, #1c2430, #0a0d12); }
    .msg { padding:8px 12px; border-radius:8px; margin:6px 0; max-width:80%; }
    .msg.user { background:var(--primary); color:#fff; margin-left:auto; }
    .msg.assistant { background:var(--surface-2); }
    .plan2d { width:100%; border-radius:12px; background:#fff; display:block; }
  `],
  template: `
    <div class="page">
      <h1>Diseñar con IA</h1>
      <p class="muted">Genera un plano y su modelo 3D desde una descripción, un audio o conversando.</p>

      <div class="row wrap" style="margin-bottom:8px">
        <div style="flex:1">
          <label>Proyecto destino (opcional, para guardar el modelo 3D)</label>
          <select [(ngModel)]="project" [ngModelOptions]="{standalone:true}">
            <option [ngValue]="null">— sin proyecto (solo vista previa) —</option>
            @for (p of projects(); track p.id) { <option [ngValue]="p.id">{{ p.name }}</option> }
          </select>
        </div>
        <div>
          <label>Proveedor</label>
          <select [(ngModel)]="provider" [ngModelOptions]="{standalone:true}">
            <option value="mock">mock</option><option value="gemini">gemini</option><option value="aws">aws (Claude)</option>
          </select>
        </div>
      </div>

      <div class="tabs">
        <button [class.on]="mode()==='text'" (click)="mode.set('text')">Texto</button>
        <button [class.on]="mode()==='audio'" (click)="mode.set('audio')">Audio</button>
        <button [class.on]="mode()==='assistant'" (click)="mode.set('assistant')">Asistente</button>
      </div>

      @if (error()) { <div class="alert">{{ error() }}</div> }

      @if (mode() === 'text') {
        <form class="card" (ngSubmit)="generateText()">
          <label>Describe el plano (incluye medidas, p. ej. "casa de 6 x 4 metros")</label>
          <textarea class="input" rows="3" [(ngModel)]="prompt" name="prompt"></textarea>
          <button class="btn" style="margin-top:10px" [disabled]="busy() || !prompt.trim()">{{ busy() ? 'Generando…' : 'Generar' }}</button>
        </form>
      }

      @if (mode() === 'audio') {
        <form class="card" (ngSubmit)="generateAudio()">
          <label>Sube un audio con la descripción</label>
          <input type="file" accept="audio/*" (change)="pick($event)">
          <button class="btn sm" style="margin-top:10px" [disabled]="busy() || !file">{{ busy() ? 'Transcribiendo…' : 'Generar desde audio' }}</button>
        </form>
      }

      @if (mode() === 'assistant') {
        <div class="card">
          <div style="min-height:120px; margin-bottom:10px">
            @for (m of chat(); track $index) {
              <div class="msg" [class]="m.role">{{ m.content }}</div>
            }
            @if (!chat().length) { <div class="muted">Escribe para empezar la conversación.</div> }
          </div>
          <form class="row" (ngSubmit)="sendAssistant()">
            <input class="input" placeholder="Mensaje…" [(ngModel)]="message" name="message">
            <button class="btn sm" [disabled]="busy() || !message">Enviar</button>
          </form>
        </div>
      }

      <!-- Result -->
      @if (result(); as r) {
        <div class="card" style="margin-top:16px">
          <div class="row spread"><h3 style="margin:0">Resultado</h3><span class="badge" [class]="r.status">{{ r.status | estado }}</span></div>
          @if (r.transcript) { <p class="muted">Transcripción: "{{ r.transcript }}"</p> }

          <!-- Plano 2D (PNG con JWT vía blob) -->
          @if (r.model; as m) {
            <h4 style="margin:14px 0 6px">Plano 2D</h4>
            @if (planPngUrl()) {
              <img class="plan2d" [src]="planPngUrl()" alt="Plano 2D del modelo">
            } @else if (planError()) {
              <div class="muted">{{ planError() }}</div>
            } @else {
              <div class="muted">Cargando plano…</div>
            }
            <div class="row wrap" style="margin-top:8px">
              <button class="btn ghost sm" [disabled]="pdfBusy()" (click)="downloadPdf(m)">{{ pdfBusy() ? 'Descargando…' : 'Descargar PDF' }}</button>
              @if (r.project) {
                <a class="btn ghost sm" [routerLink]="['/projects', r.project, 'edit3d']">Editar plano 2D</a>
              }
            </div>
            <hr style="border:none; border-top:1px solid var(--border); margin:14px 0">
          }

          @if (r.model?.glb_url) {
            <model-viewer [attr.src]="r.model!.glb_url" camera-controls interaction-prompt="none" shadow-intensity="1" shadow-softness="0.7" environment-image="neutral" exposure="1.05" tone-mapping="neutral" camera-orbit="45deg 60deg auto" min-camera-orbit="auto 25deg auto" max-camera-orbit="auto 88deg auto" field-of-view="35deg" min-field-of-view="20deg" max-field-of-view="55deg" auto-rotate auto-rotate-delay="800" rotation-per-second="18deg" ar ar-modes="webxr scene-viewer quick-look"></model-viewer>
            <div class="muted" style="margin-top:6px">{{ r.model!.element_count }} elementos
              · <a [attr.href]="r.model!.glb_url" target="_blank">descargar .glb</a>
              · <a [routerLink]="['/projects', r.project]">ver proyecto</a></div>
          } @else if (!project) {
            <div class="muted">Vista previa generada. Elige un proyecto destino para guardar el modelo 3D.</div>
          }
        </div>
      }
    </div>
  `,
})
export class AiDesign implements OnInit, OnDestroy {
  private api = inject(Api);

  projects = signal<Project[]>([]);
  mode = signal<'text' | 'audio' | 'assistant'>('text');
  project: number | null = null;
  provider = 'mock';
  prompt = '';
  message = '';
  file: File | null = null;
  result = signal<DesignRequest | null>(null);
  chat = signal<{ role: string; content: string }[]>([]);
  assistantRequestId: number | null = null;
  busy = signal(false);
  error = signal('');

  // Plano 2D (PNG cargado como blob por requerir JWT) + descarga PDF.
  planPngUrl = signal<string | null>(null);
  planError = signal('');
  pdfBusy = signal(false);

  ngOnInit(): void {
    this.api.page<Project>('/projects/', { page_size: 100 }).subscribe(r => this.projects.set(r.items));
  }

  ngOnDestroy(): void { this.revokePng(); }

  /** Revoca el object URL del PNG para no fugar memoria. */
  private revokePng(): void {
    const u = this.planPngUrl();
    if (u) URL.revokeObjectURL(u);
    this.planPngUrl.set(null);
  }

  /** Carga el plano 2D del modelo como blob -> object URL para el <img>. */
  private loadPlanPng(model: Model3D | null): void {
    this.revokePng(); this.planError.set('');
    if (!model) return;
    this.api.blob(`/models3d/${model.id}/plan.png/`).subscribe({
      next: b => this.planPngUrl.set(URL.createObjectURL(b)),
      error: e => this.planError.set(apiErrMsg(e, 'No se pudo cargar el plano.')),
    });
  }

  /** Descarga el plano en PDF (blob con JWT -> object URL + a.download). */
  downloadPdf(model: Model3D): void {
    this.pdfBusy.set(true);
    this.api.blob(`/models3d/${model.id}/plan.pdf/`).subscribe({
      next: b => {
        const url = URL.createObjectURL(b);
        const a = document.createElement('a');
        a.href = url; a.download = `plano-modelo-${model.id}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        this.pdfBusy.set(false);
      },
      error: e => { this.error.set(apiErrMsg(e, 'No se pudo descargar el PDF.')); this.pdfBusy.set(false); },
    });
  }

  pick(e: Event): void { this.file = (e.target as HTMLInputElement).files?.[0] || null; }

  generateText(): void {
    this.busy.set(true); this.error.set('');
    this.api.post<DesignRequest>('/ai-design/text', { prompt: this.prompt.trim(), project: this.project, provider: this.provider }).subscribe({
      next: r => { this.result.set(r); this.loadPlanPng(r.model); this.busy.set(false); },
      error: e => { this.error.set(e.detail || 'No se pudo generar.'); this.busy.set(false); },
    });
  }

  generateAudio(): void {
    if (!this.file) return;
    this.busy.set(true); this.error.set('');
    const fd = new FormData();
    fd.append('audio', this.file);
    if (this.project) fd.append('project', String(this.project));
    fd.append('provider', this.provider);
    this.api.postForm<DesignRequest>('/ai-design/audio', fd).subscribe({
      next: r => { this.result.set(r); this.loadPlanPng(r.model); this.busy.set(false); },
      error: e => { this.error.set(e.detail || 'No se pudo procesar el audio.'); this.busy.set(false); },
    });
  }

  sendAssistant(): void {
    const text = this.message;
    this.chat.update(c => [...c, { role: 'user', content: text }]);
    this.message = '';
    this.busy.set(true);
    this.api.post<DesignRequest>('/ai-design/assistant', {
      message: text, request: this.assistantRequestId, project: this.project, provider: this.provider,
    }).subscribe({
      next: r => {
        this.assistantRequestId = r.id;
        this.chat.set((r.result?.messages || []) as { role: string; content: string }[]);
        this.busy.set(false);
      },
      error: e => { this.error.set(e.detail || 'Error en el asistente.'); this.busy.set(false); },
    });
  }
}
