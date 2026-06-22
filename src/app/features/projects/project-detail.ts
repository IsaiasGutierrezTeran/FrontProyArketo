import { DatePipe, DecimalPipe } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Api, apiErrMsg } from '../../core/api';
import { Auth } from '../../core/auth/auth';
import { AssignableUser, Comment, DetectionJob, Member, Model3D, Plan, Project } from '../../core/models';

@Component({
  selector: 'app-project-detail',
  imports: [FormsModule, RouterLink, DatePipe, DecimalPipe],
  schemas: [CUSTOM_ELEMENTS_SCHEMA], // allow <model-viewer>
  styles: [`
    .tabs { display: flex; gap: 4px; margin: 14px 0; border-bottom: 1px solid var(--border); }
    .tabs button { background: none; border: none; color: var(--muted); padding: 10px 14px; cursor: pointer; font: inherit; border-bottom: 2px solid transparent; }
    .tabs button.on { color: var(--text); border-bottom-color: var(--primary); }
    model-viewer { width: 100%; height: 520px; border-radius: 16px; background: #11151c radial-gradient(120% 120% at 50% 0%, #1c2430, #0a0d12); }
    .plan2d { width: 100%; border-radius: 12px; background: #fff; display: block; }
    .plan-thumb { height: 48px; width: 64px; object-fit: cover; border-radius: 6px; border: 1px solid var(--border); display: block; background: #fff; }
  `],
  template: `
    <div class="page">
      <a routerLink="/projects" class="muted">← Proyectos</a>
      @if (project(); as p) {
        <div class="row spread" style="margin:8px 0 0">
          <h1 style="margin:0">{{ p.name }}</h1>
          <span class="badge" [class]="p.status">{{ p.status }}</span>
        </div>
        <p class="muted">{{ p.description }}</p>

        <div class="row wrap" style="margin-bottom:6px">
          <a class="btn ghost sm" [routerLink]="['/projects', id, 'budget']">Presupuesto</a>
          <a class="btn ghost sm" [routerLink]="['/projects', id, 'risk']">Riesgos</a>
          <a class="btn ghost sm" [routerLink]="['/projects', id, 'edit3d']">Editar 3D</a>
          <a class="btn ghost sm" [routerLink]="['/projects', id, 'versions']">Versiones</a>
          <a class="btn ghost sm" routerLink="/ai-design">Diseño IA</a>
        </div>

        <div class="tabs">
          <button [class.on]="tab()==='3d'" (click)="tab.set('3d')">Planos & 3D</button>
          <button [class.on]="tab()==='team'" (click)="tab.set('team')">Colaboración</button>
        </div>

        @if (tab() === '3d') {
          <!-- 3D model -->
          <div class="card" style="margin-bottom:16px">
            <h3>Modelo 3D actual</h3>
            @if (currentModel(); as m) {
              <!-- Plano 2D (PNG con JWT vía blob) -->
              <h4 style="margin:6px 0">Plano 2D</h4>
              @if (planPngUrl()) {
                <img class="plan2d" [src]="planPngUrl()" alt="Plano 2D del modelo">
              } @else if (planError()) {
                <div class="muted">{{ planError() }}</div>
              } @else {
                <div class="muted">Cargando plano…</div>
              }
              <div class="row wrap" style="margin-top:8px">
                <button class="btn ghost sm" [disabled]="pdfBusy()" (click)="downloadPdf(m)">{{ pdfBusy() ? 'Descargando…' : 'Descargar PDF' }}</button>
                <a class="btn ghost sm" [routerLink]="['/projects', id, 'edit3d']">Editar plano 2D</a>
              </div>

              <hr style="border:none; border-top:1px solid var(--border); margin:14px 0">

              <h4 style="margin:6px 0">Visor 3D</h4>
              @if (m.glb_url) { <model-viewer #mv [attr.src]="m.glb_url" camera-controls interaction-prompt="none" shadow-intensity="1" shadow-softness="0.7" environment-image="neutral" exposure="1.05" tone-mapping="neutral" camera-orbit="45deg 60deg auto" min-camera-orbit="auto 25deg auto" max-camera-orbit="auto 88deg auto" field-of-view="35deg" min-field-of-view="20deg" max-field-of-view="55deg" auto-rotate auto-rotate-delay="800" rotation-per-second="18deg" ar ar-modes="webxr scene-viewer quick-look"></model-viewer>
                <button class="btn ghost sm" style="margin-top:8px" (click)="resetCamera(mv)">Reiniciar vista</button> }
              <div class="muted" style="margin-top:8px">{{ m.element_count }} elementos · modelo {{ m.model_name || '—' }}
                · <a [attr.href]="m.glb_url" target="_blank">descargar .glb</a>
                · <a [routerLink]="['/projects', id, 'edit3d']">editar</a></div>
            } @else { <div class="muted">Sin modelo 3D. Sube un plano y genéralo, o importa un .glb.</div> }

            <!-- Importar modelo externo (CU8) -->
            <form class="row wrap" style="margin-top:12px; padding-top:12px; border-top:1px solid var(--border)" (ngSubmit)="importGlb()">
              <input type="file" (change)="pickGlb($event)" accept=".glb,.gltf">
              <button class="btn ghost sm" [disabled]="!glbFile || importing()">{{ importing() ? 'Importando…' : 'Importar .glb/.gltf' }}</button>
              @if (importError()) { <span class="alert" style="margin:0">{{ importError() }}</span> }
            </form>
          </div>

          <!-- Plans -->
          <div class="card">
            <div class="row spread"><h3 style="margin:0">Planos</h3></div>
            <form class="row wrap" style="margin:10px 0" (ngSubmit)="upload()">
              <input type="file" (change)="pick($event)" accept=".pdf,.jpg,.jpeg,.png,.csv">
              <button class="btn sm" [disabled]="!file || uploading()">{{ uploading() ? 'Subiendo…' : 'Subir plano' }}</button>
            </form>
            @if (error()) { <div class="alert">{{ error() }}</div> }
            <table>
              <tr><th>Vista</th><th>Archivo</th><th>Estado</th><th>Detector</th><th></th><th></th></tr>
              @for (pl of plans(); track pl.id) {
                <tr>
                  <td>
                    @if (pl.file_url) {
                      <a [attr.href]="pl.file_url" target="_blank" title="Ver plano">
                        @if (isImage(pl)) { <img [src]="pl.file_url" class="plan-thumb" alt="plano"> } @else { ver }
                      </a>
                    }
                  </td>
                  <td>
                    <div style="font-weight:500; word-break:break-all">{{ pl.filename || pl.original_format.toUpperCase() }}</div>
                    <div class="muted" style="font-size:.78rem">{{ pl.original_format.toUpperCase() }} · {{ (pl.size_bytes/1024) | number:'1.0-0' }} KB</div>
                  </td>
                  <td><span class="badge" [class]="pl.status">{{ pl.status }}</span></td>
                  <td><select [(ngModel)]="detectorByPlan[pl.id]" [ngModelOptions]="{standalone:true}">
                    <option value="gemini-vision">IA visión (color)</option>
                    <option value="maskrcnn">Mask R-CNN (B&N)</option>
                    <option value="mock">mock (demo)</option>
                  </select></td>
                  <td><button class="btn sm" [disabled]="running()===pl.id" (click)="runDetect(pl)">
                    {{ running()===pl.id ? 'Generando…' : 'Generar 3D' }}</button></td>
                  <td><button class="btn sm danger" [disabled]="deleting()===pl.id" (click)="deletePlan(pl)">
                    {{ deleting()===pl.id ? 'Eliminando…' : 'Eliminar' }}</button></td>
                </tr>
              }
              @if (!plans().length) { <tr><td colspan="6" class="muted">Sin planos.</td></tr> }
            </table>
          </div>
        }

        @if (tab() === 'team') {
          <div class="card" style="margin-bottom:16px">
            <h3>Colaboradores</h3>
            <p class="muted" style="margin-top:0">Elige un usuario de la lista e invítalo; recibirá la invitación y deberá aceptarla para colaborar.</p>
            <form class="row wrap" (ngSubmit)="invite()">
              @if (assignable().length) {
                <select class="input" style="width:auto; flex:1" name="user" [(ngModel)]="inviteUserId">
                  <option [ngValue]="null">— elige un usuario —</option>
                  @for (u of assignable(); track u.id) {
                    <option [ngValue]="u.id">{{ u.full_name || u.email }} · {{ u.role }}</option>
                  }
                </select>
              } @else {
                <span class="muted" style="flex:1; align-self:center">No hay usuarios disponibles para invitar.</span>
              }
              <select [(ngModel)]="inviteRole" name="role" style="width:auto">
                <option value="editor">editor</option><option value="viewer">lector</option>
              </select>
              <button class="btn sm" [disabled]="inviteUserId == null">Invitar</button>
            </form>
            @if (teamError()) { <div class="alert">{{ teamError() }}</div> }
            <table>
              @for (m of members(); track m.id) {
                <tr><td>{{ m.user_full_name || m.user_email }}</td>
                  <td><span class="badge">{{ m.role }}</span>
                    @if (m.status === 'pending') { <span class="badge" style="margin-left:6px; opacity:.85">pendiente</span> }</td>
                  <td style="text-align:right"><button class="btn sm danger" (click)="removeMember(m)">{{ m.status === 'pending' ? 'Cancelar' : 'Quitar' }}</button></td></tr>
              }
              @if (!members().length) { <tr><td class="muted">Aún sin colaboradores.</td></tr> }
            </table>
          </div>

          <div class="card">
            <h3>Comentarios</h3>
            @for (c of comments(); track c.id) {
              <div style="padding:8px 0; border-bottom:1px solid var(--border)">
                <div class="muted" style="font-size:.78rem">{{ c.author_email }} · {{ c.created_at | date:'short' }}</div>
                <div>{{ c.body }}</div>
              </div>
            }
            <form class="row" style="margin-top:12px" (ngSubmit)="comment()">
              <input class="input" placeholder="Escribe un comentario…" name="body" [(ngModel)]="commentBody">
              <button class="btn sm" [disabled]="!commentBody">Enviar</button>
            </form>
          </div>
        }
      } @else { <div class="spinner">Cargando…</div> }
    </div>
  `,
})
export class ProjectDetail implements OnInit, OnDestroy {
  private api = inject(Api);
  private route = inject(ActivatedRoute);
  auth = inject(Auth);

  id!: number;
  tab = signal<'3d' | 'team'>('3d');
  project = signal<Project | null>(null);
  plans = signal<Plan[]>([]);
  models = signal<Model3D[]>([]);
  members = signal<Member[]>([]);
  comments = signal<Comment[]>([]);
  // Usuarios que el dueño puede invitar (el backend ya excluye al dueño y a los ya invitados).
  assignable = signal<AssignableUser[]>([]);

  currentModel = signal<Model3D | null>(null);
  detectorByPlan: Record<number, string> = {};

  // Plano 2D (PNG cargado como blob por requerir JWT) + descarga PDF.
  planPngUrl = signal<string | null>(null);
  planError = signal('');
  pdfBusy = signal(false);

  file: File | null = null;
  uploading = signal(false);
  running = signal<number | null>(null);
  deleting = signal<number | null>(null);
  error = signal('');
  glbFile: File | null = null;
  importing = signal(false);
  importError = signal('');
  inviteUserId: number | null = null; inviteRole = 'editor'; teamError = signal('');
  commentBody = '';

  ngOnInit(): void {
    this.id = Number(this.route.snapshot.paramMap.get('id'));
    this.api.get<Project>(`/projects/${this.id}/`).subscribe(p => this.project.set(p));
    this.loadPlans();
    this.loadModels();
    this.loadTeam();
    this.api.page<Comment>('/comments/', { project: this.id }).subscribe(r => this.comments.set(r.items));
  }

  /** Carga colaboradores (incluye invitaciones pendientes) y la lista de usuarios invitables. */
  private loadTeam(): void {
    this.api.get<Member[]>(`/projects/${this.id}/members/`).subscribe(m => this.members.set(m));
    this.api.get<AssignableUser[]>(`/projects/${this.id}/assignable/`)
      .subscribe({ next: u => this.assignable.set(u), error: () => this.assignable.set([]) });
  }

  private loadPlans(): void {
    this.api.page<Plan>('/plans/', { project: this.id }).subscribe(r => {
      this.plans.set(r.items);
      r.items.forEach(p => this.detectorByPlan[p.id] ??= 'maskrcnn');
    });
  }

  private loadModels(): void {
    this.api.page<Model3D>('/models3d/', { project: this.id }).subscribe(r => {
      this.models.set(r.items);
      const current = r.items.find(m => m.is_current) || r.items[0] || null;
      this.currentModel.set(current);
      this.loadPlanPng(current);
    });
  }

  /** Revoca el object URL del PNG para no fugar memoria. */
  private revokePng(): void {
    const u = this.planPngUrl();
    if (u) URL.revokeObjectURL(u);
    this.planPngUrl.set(null);
  }

  /** Carga el plano 2D del modelo actual como blob -> object URL para el <img>. */
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

  ngOnDestroy(): void { this.revokePng(); }

  pick(e: Event): void { this.file = (e.target as HTMLInputElement).files?.[0] || null; }

  upload(): void {
    if (!this.file) return;
    this.uploading.set(true); this.error.set('');
    const fd = new FormData();
    fd.append('project', String(this.id));
    fd.append('file', this.file);
    this.api.postForm<Plan>('/plans/', fd).subscribe({
      next: p => { this.plans.update(l => [p, ...l]); this.detectorByPlan[p.id] = 'maskrcnn'; this.uploading.set(false); this.file = null; },
      error: e => { this.error.set(apiErrMsg(e, 'No se pudo subir.')); this.uploading.set(false); },
    });
  }

  runDetect(pl: Plan): void {
    this.running.set(pl.id); this.error.set('');
    this.api.post<DetectionJob>('/detection/run', { plan: pl.id, detector: this.detectorByPlan[pl.id] }).subscribe({
      next: () => { this.running.set(null); this.loadPlans(); this.loadModels(); },
      error: e => { this.error.set(e.detail || 'Falló la generación.'); this.running.set(null); },
    });
  }

  isImage(pl: Plan): boolean {
    return ['jpg', 'jpeg', 'png'].includes((pl.original_format || '').toLowerCase());
  }

  /** HU-6: reinicia la cámara del visor 3D a su posición inicial. */
  resetCamera(mv: any): void {
    if (!mv) return;
    mv.cameraOrbit = '45deg 60deg auto';
    mv.cameraTarget = 'auto auto auto';
    mv.fieldOfView = '35deg';
    mv.resetTurntableRotation?.();
    mv.jumpCameraToGoal?.();
  }

  deletePlan(pl: Plan): void {
    if (!confirm('¿Eliminar este plano? No se puede deshacer.')) return;
    this.deleting.set(pl.id); this.error.set('');
    this.api.delete(`/plans/${pl.id}/`).subscribe({
      next: () => { this.plans.update(l => l.filter(p => p.id !== pl.id)); this.deleting.set(null); },
      error: e => { this.error.set(apiErrMsg(e, 'No se pudo eliminar el plano.')); this.deleting.set(null); },
    });
  }

  pickGlb(e: Event): void { this.glbFile = (e.target as HTMLInputElement).files?.[0] || null; }

  importGlb(): void {
    if (!this.glbFile) return;
    this.importing.set(true); this.importError.set('');
    const fd = new FormData();
    fd.append('project', String(this.id));
    fd.append('file', this.glbFile);
    this.api.postForm<Model3D>('/models3d/import/', fd).subscribe({
      next: () => { this.importing.set(false); this.glbFile = null; this.loadModels(); },
      error: e => { this.importError.set(apiErrMsg(e, 'No se pudo importar.')); this.importing.set(false); },
    });
  }

  invite(): void {
    if (this.inviteUserId == null) return;
    this.teamError.set('');
    this.api.post<Member>(`/projects/${this.id}/members/`, { user: this.inviteUserId, role: this.inviteRole }).subscribe({
      next: () => { this.inviteUserId = null; this.loadTeam(); },
      error: e => this.teamError.set(apiErrMsg(e, 'No se pudo invitar.')),
    });
  }

  removeMember(m: Member): void {
    this.api.delete(`/projects/${this.id}/members/${m.id}/`).subscribe({
      next: () => this.loadTeam(),
      error: () => {},
    });
  }

  comment(): void {
    this.api.post<Comment>('/comments/', { project: this.id, body: this.commentBody }).subscribe({
      next: c => { this.comments.update(l => [...l, c]); this.commentBody = ''; },
      error: () => {},
    });
  }
}
