import { CUSTOM_ELEMENTS_SCHEMA, Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Api, apiErrMsg } from '../../core/api';
import { DesignRequest, Project } from '../../core/models';

interface TurnResult { status: string; project: number | null; model: { id: number; glb_url: string | null; element_count: number } | null; }
interface Turn { role: 'user' | 'ai'; text: string; result?: TurnResult; }

@Component({
  selector: 'app-ai-design',
  imports: [FormsModule, RouterLink],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  styles: [`
    .ai { display:flex; flex-direction:column; gap:14px; max-width:880px; margin:0 auto; }
    .feed { display:flex; flex-direction:column; gap:14px; min-height:120px; }
    .empty { text-align:center; color:var(--muted); padding:24px 0; }
    .chips { display:flex; gap:8px; flex-wrap:wrap; justify-content:center; margin-top:10px; }
    .chip { background:var(--surface-2); border:1px solid var(--border); color:var(--muted); border-radius:999px; padding:7px 12px; cursor:pointer; font-size:.85rem; }
    .chip:hover { color:var(--text); border-color:var(--primary); }
    .bubble { padding:11px 14px; border-radius:14px; max-width:88%; line-height:1.4; }
    .bubble.user { background:var(--primary); color:#fff; margin-left:auto; border-bottom-right-radius:4px; }
    .bubble.ai { background:var(--surface-2); border:1px solid var(--border); border-bottom-left-radius:4px; width:100%; max-width:100%; }
    .aitext { margin-bottom:6px; }
    .plan2d { width:100%; border-radius:12px; background:#fff; display:block; margin:8px 0; }
    model-viewer { width:100%; height:440px; border-radius:14px; background:#11151c radial-gradient(120% 120% at 50% 0%, #1c2430, #0a0d12); }

    /* Barra de prompt unificada (estilo Gemini/ChatGPT) */
    .bar { position:sticky; bottom:14px; background:var(--surface-2); border:1px solid var(--border);
           border-radius:22px; padding:8px 8px 8px 12px; box-shadow:0 8px 30px rgba(0,0,0,.35); }
    .bar.rec { border-color:var(--danger); }
    .attach { display:flex; align-items:center; gap:8px; font-size:.82rem; color:var(--muted); padding:2px 4px 8px; }
    .attach button { background:none; border:none; color:var(--muted); cursor:pointer; font-size:1rem; }
    .barrow { display:flex; align-items:center; gap:6px; }
    .barrow .field { flex:1 1 auto; min-width:0; }
    .barrow textarea { width:100%; display:block; background:none; border:none; color:var(--text); resize:none; font:inherit; outline:none;
                       max-height:160px; min-height:24px; padding:8px 4px; line-height:1.4; }
    .iconbtn { background:none; border:none; color:var(--muted); cursor:pointer; width:38px; height:38px; border-radius:50%;
               display:grid; place-items:center; flex:none; }
    .iconbtn:hover { background:var(--surface); color:var(--text); }
    .iconbtn.rec { color:var(--danger); background:rgba(255,80,90,.12); }
    .pill { flex:0 0 auto; width:auto; background:var(--surface); border:1px solid var(--border); color:var(--muted);
            border-radius:999px; padding:6px 10px; font-size:.8rem; outline:none; max-width:150px; }
    .send { background:var(--primary); color:#fff; }
    .send:hover { background:var(--primary-2); color:#fff; }
    .send:disabled { opacity:.45; cursor:default; }
    .below { display:flex; align-items:center; gap:8px; flex-wrap:wrap; color:var(--muted); font-size:.82rem; }
    .below select { background:var(--surface-2); border:1px solid var(--border); color:var(--text); border-radius:8px; padding:4px 8px; }
  `],
  template: `
    <div class="page ai">
      <div class="row spread" style="align-items:flex-start">
        <div>
          <h1 style="margin:0">Diseñar con IA</h1>
          <p class="muted" style="margin:.2rem 0 0">Escribe o dicta tu plano y la IA genera el 2D y 3D. También puedes preguntarle cosas; el historial se guarda.</p>
        </div>
        @if (feed().length) { <button class="btn ghost sm" (click)="newChat()">Nuevo chat</button> }
      </div>

      @if (error()) { <div class="alert">{{ error() }}</div> }

      <!-- Feed conversacional -->
      <div class="feed">
        @if (!feed().length) {
          <div class="empty">
            <div>Cuéntame qué quieres construir y lo diseño.</div>
            <div class="chips">
              @for (s of suggestions; track s) { <button class="chip" (click)="useSuggestion(s)">{{ s }}</button> }
            </div>
          </div>
        }
        @for (t of feed(); track $index) {
          @if (t.role === 'user') {
            <div class="bubble user">{{ t.text }}</div>
          } @else {
            <div class="bubble ai">
              <div class="aitext">{{ t.text }}</div>
              @if (t.result?.model; as m) {
                @if (planUrls()[m.id]) { <img class="plan2d" [src]="planUrls()[m.id]" alt="Plano 2D"> }
                @if (m.glb_url) {
                  <model-viewer [attr.src]="m.glb_url" camera-controls interaction-prompt="none" shadow-intensity="1" shadow-softness="0.7" environment-image="neutral" exposure="1.05" tone-mapping="neutral" camera-orbit="45deg 60deg auto" min-camera-orbit="auto 25deg auto" max-camera-orbit="auto 88deg auto" field-of-view="35deg" auto-rotate auto-rotate-delay="800" rotation-per-second="18deg" ar ar-modes="webxr scene-viewer quick-look"></model-viewer>
                }
                <div class="row wrap" style="margin-top:8px">
                  <button class="btn ghost sm" [disabled]="pdfBusy()" (click)="downloadPdf(m)">{{ pdfBusy() ? 'Descargando…' : 'Descargar PDF' }}</button>
                  @if (t.result!.project) { <a class="btn ghost sm" [routerLink]="['/projects', t.result!.project, 'edit3d']">Editar plano 2D</a> }
                  @if (t.result!.project) { <a class="btn ghost sm" [routerLink]="['/projects', t.result!.project]">Ver proyecto</a> }
                </div>
              }
            </div>
          }
        }
        @if (busy()) { <div class="bubble ai muted">Generando…</div> }
      </div>

      <!-- Barra unificada -->
      <div class="bar" [class.rec]="recording()">
        <div class="barrow">
          <div class="field">
            <textarea [(ngModel)]="prompt" name="prompt" rows="1" placeholder="Escribe tu plano…  (ej: casa de 8 × 6 con 3 dormitorios y garaje)" (keydown)="onKey($event)"></textarea>
          </div>
          <select class="pill" [(ngModel)]="provider" name="provider" title="Proveedor de IA">
            <option value="mock">Rápido</option>
            <option value="gemini">IA (Gemini)</option>
            <option value="aws">IA (AWS)</option>
          </select>
          <button class="iconbtn" [class.rec]="recording()" type="button" [title]="recording() ? 'Detener dictado' : 'Dictar por voz'" (click)="toggleRec()">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg>
          </button>
          <button class="iconbtn send" type="button" title="Enviar" [disabled]="busy() || !prompt.trim()" (click)="send()">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>
          </button>
        </div>
        @if (recording()) { <div class="attach">Escuchando… habla y se irá escribiendo. Toca el micrófono para detener.</div> }
      </div>

      <div class="below">
        <span>Guardar el 3D en:</span>
        <select [(ngModel)]="project" name="project">
          <option [ngValue]="null">— sin proyecto (solo vista previa) —</option>
          @for (p of projects(); track p.id) { <option [ngValue]="p.id">{{ p.name }}</option> }
        </select>
      </div>
    </div>
  `,
})
export class AiDesign implements OnInit, OnDestroy {
  private api = inject(Api);

  projects = signal<Project[]>([]);
  project: number | null = null;
  provider = 'mock';                   // Rápido por defecto (fiable). IA real opcional (con fallback).
  prompt = '';
  feed = signal<Turn[]>([]);
  planUrls = signal<Record<number, string>>({});
  busy = signal(false);
  error = signal('');
  pdfBusy = signal(false);
  recording = signal(false);
  assistantId: number | null = null;   // hilo de conversación del asistente

  suggestions = [
    'Casa de 8 × 6 m con 3 dormitorios, 2 baños, sala, comedor y cocina',
    'Departamento de 60 m² con 2 dormitorios',
    'Casa de 10 × 8 con garaje doble y lavandería',
  ];

  private objectUrls: string[] = [];
  private sr: any;            // SpeechRecognition (dictado por voz del navegador)
  private basePrompt = '';
  private readonly STORE = 'arketo.aidesign';

  ngOnInit(): void {
    this.api.page<Project>('/projects/', { page_size: 100 }).subscribe(r => this.projects.set(r.items));
    this.restore();
  }

  ngOnDestroy(): void {
    this.objectUrls.forEach(u => URL.revokeObjectURL(u));
    try { this.sr?.stop(); } catch { /* noop */ }
  }

  useSuggestion(s: string): void { this.prompt = s; this.send(); }

  onKey(e: KeyboardEvent): void {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.send(); }
  }

  send(): void {
    if (this.busy()) return;
    const p = this.prompt.trim();
    if (!p) return;
    this.prompt = '';
    this.pushTurn({ role: 'user', text: p });
    this.busy.set(true); this.error.set('');
    if (this.looksLikeDesign(p)) {
      this.api.post<DesignRequest>('/ai-design/text', { prompt: p, project: this.project, provider: this.provider }).subscribe({
        next: r => this.onResult(r),
        error: e => this.onErr(e),
      });
    } else {
      // Pregunta / charla: el asistente responde (NO genera un plano).
      this.api.post<DesignRequest>('/ai-design/assistant', { message: p, request: this.assistantId, project: this.project, provider: this.provider }).subscribe({
        next: r => {
          this.assistantId = r.id;
          const msgs = (r.result?.messages || []) as { role: string; content: string }[];
          const reply = [...msgs].reverse().find(m => m.role === 'assistant')?.content
            || 'Dime medidas y ambientes (ej. "casa de 8 × 6 con 3 dormitorios") y te genero el plano.';
          const note = (r.provider || '').includes('->mock') ? 'Aviso: la IA externa no estaba disponible, te responde el asistente Rápido. ' : '';
          this.pushTurn({ role: 'ai', text: note + reply });
          this.busy.set(false);
        },
        error: e => this.onErr(e),
      });
    }
  }

  /** ¿El mensaje pide diseñar un plano (genera) o es una pregunta (responde)? */
  private looksLikeDesign(p: string): boolean {
    const t = p.toLowerCase();
    if (/\d+\s*(x|por|×|m\b|m2|m²|metros)/.test(t)) return true;
    return /\b(casa|plano|departamento|dise[nñ]|gener|construye|dormitor|habitaci|cuarto|rec[aá]mara|ba[nñ]o|cocina|sala|comedor|garaje|garage|ambiente|vivienda|lavander)/.test(t);
  }

  private pushTurn(t: Turn): void { this.feed.update(f => [...f, t]); this.persist(); }

  newChat(): void {
    this.feed.set([]);
    this.assistantId = null;
    try { localStorage.removeItem(this.STORE); } catch { /* noop */ }
    this.api.put('/ai-design/conversation', { turns: [] }).subscribe({ next: () => {}, error: () => {} });
  }

  private persist(): void {
    const turns = this.feed();
    // 1) caché local (rápida)  2) base de datos del servidor (AWS) para que persista
    try { localStorage.setItem(this.STORE, JSON.stringify({ assistantId: this.assistantId, turns })); }
    catch { /* almacenamiento no disponible */ }
    this.api.put('/ai-design/conversation', { turns }).subscribe({ next: () => {}, error: () => {} });
  }

  /** Carga el historial: primero del servidor (BD); si falla, del navegador. */
  private restore(): void {
    this.api.get<{ turns: Turn[] }>('/ai-design/conversation').subscribe({
      next: r => {
        const turns = (r?.turns || []) as Turn[];
        if (turns.length) { this.feed.set(turns); turns.forEach(t => { if (t.result?.model) this.loadPlanPng(t.result.model); }); }
        else this.restoreLocal();
      },
      error: () => this.restoreLocal(),
    });
  }

  private restoreLocal(): void {
    try {
      const raw = localStorage.getItem(this.STORE);
      if (!raw) return;
      const data = JSON.parse(raw) as { assistantId?: number | null; turns?: Turn[] };
      this.assistantId = data.assistantId ?? null;
      const turns = data.turns || [];
      this.feed.set(turns);
      turns.forEach(t => { if (t.result?.model) this.loadPlanPng(t.result.model); });
    } catch { /* historial corrupto: ignorar */ }
  }

  private onResult(r: DesignRequest): void {
    this.busy.set(false);
    const result: TurnResult = {
      status: r.status, project: r.project,
      model: r.model ? { id: r.model.id, glb_url: r.model.glb_url, element_count: r.model.element_count } : null,
    };
    this.pushTurn({ role: 'ai', text: this.explain(r), result });
    if (r.model) this.loadPlanPng(r.model);
  }

  private onErr(e: { detail?: unknown }): void {
    this.busy.set(false);
    this.error.set(typeof e.detail === 'string' ? e.detail : 'No se pudo generar el diseño.');
  }

  /** Mensaje del asistente: explica lo generado y guía los siguientes ajustes. */
  private explain(r: DesignRequest): string {
    if (r.status !== 'completed') {
      return 'No pude generar el plano. Intenta describirlo con medidas, p. ej. "casa de 8 × 6 con 3 dormitorios".';
    }
    const rooms = (r.result?.scene?.rooms?.length as number) ?? 0;
    const parts = [rooms ? `Listo: generé tu plano con ${rooms} ambientes.` : 'Listo: generé tu plano.'];
    if ((r.provider || '').includes('->mock')) parts.unshift('Aviso: la IA externa no estaba disponible, usé el generador Rápido.');
    if (!r.project) parts.push('Es una vista previa — elige abajo un proyecto destino para guardar el modelo 3D.');
    parts.push('Pídeme cambios: medidas (ej. "hazla de 10 × 8"), nº de dormitorios/baños, o agregar garaje, cocina o lavandería.');
    return parts.join(' ');
  }

  private loadPlanPng(model: { id: number }): void {
    this.api.blob(`/models3d/${model.id}/plan.png/`).subscribe({
      next: b => {
        const u = URL.createObjectURL(b);
        this.objectUrls.push(u);
        this.planUrls.update(m => ({ ...m, [model.id]: u }));
      },
      error: () => { /* el plano es opcional */ },
    });
  }

  downloadPdf(model: { id: number }): void {
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

  /** Dictado por voz REAL del navegador: escribe en el cuadro lo que dices. */
  toggleRec(): void {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      this.error.set('Tu navegador no soporta dictado por voz (usa Chrome). Escribe el plano en el cuadro.');
      return;
    }
    if (this.recording()) { try { this.sr?.stop(); } catch { /* noop */ } return; }
    const sr = new SR();
    this.sr = sr;
    sr.lang = 'es-ES';
    sr.continuous = true;
    sr.interimResults = true;
    this.basePrompt = this.prompt.trim() ? this.prompt.trim() + ' ' : '';
    sr.onresult = (ev: any) => {
      let text = '';
      for (let i = 0; i < ev.results.length; i++) text += ev.results[i][0].transcript;
      this.prompt = (this.basePrompt + text).replace(/\s+/g, ' ').trim();
    };
    sr.onerror = () => { this.recording.set(false); this.error.set('No se pudo usar el dictado. Revisa el permiso del micrófono.'); };
    sr.onend = () => this.recording.set(false);
    try { sr.start(); this.recording.set(true); this.error.set(''); }
    catch { this.recording.set(false); }
  }
}
