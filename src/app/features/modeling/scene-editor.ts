import { CUSTOM_ELEMENTS_SCHEMA, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Api } from '../../core/api';
import { Model3D } from '../../core/models';

interface Pt { x: number; y: number; }
interface Wall { id?: string; start: Pt; end: Pt; thickness: number; height: number; }
interface Opening { id?: string; position: Pt; width: number; height: number; sill_height?: number; }

/**
 * HU-7 — Editar arquitectura (simulación 3D).
 * Edita la geometría (muros, puertas, ventanas) del modelo actual y la persiste
 * con PATCH /models3d/{id}/scene/, que regenera el GLB en el backend.
 */
@Component({
  selector: 'app-scene-editor',
  imports: [FormsModule, RouterLink],
  schemas: [CUSTOM_ELEMENTS_SCHEMA], // allow <model-viewer>
  styles: [`
    model-viewer { width: 100%; height: 360px; background: #0b0e13; border-radius: 8px; }
    table { width: 100%; } td input { width: 70px; }
    .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    @media (max-width: 860px) { .grid2 { grid-template-columns: 1fr; } }
  `],
  template: `
    <div class="page">
      <a [routerLink]="['/projects', id]" class="muted">← Volver al proyecto</a>
      <h1 style="margin:6px 0">Editar arquitectura 3D</h1>

      @if (model(); as m) {
        <div class="grid2">
          <div class="card">
            <h3>Vista previa</h3>
            @if (m.glb_url) { <model-viewer [attr.src]="m.glb_url" camera-controls auto-rotate></model-viewer> }
            <div class="muted" style="margin-top:8px">{{ m.element_count }} elementos · unidad {{ m.unit }}</div>
          </div>

          <div class="card">
            <div class="row spread">
              <h3 style="margin:0">Geometría</h3>
              <button class="btn" [disabled]="saving()" (click)="save()">{{ saving() ? 'Guardando…' : 'Guardar y regenerar' }}</button>
            </div>
            @if (error()) { <div class="alert">{{ error() }}</div> }
            @if (saved()) { <div class="ok">Modelo regenerado.</div> }

            <h4>Muros <button class="btn ghost sm" (click)="addWall()">+ añadir</button></h4>
            <table>
              <tr><th>x1</th><th>y1</th><th>x2</th><th>y2</th><th>grosor</th><th>alto</th><th></th></tr>
              @for (w of walls(); track $index) {
                <tr>
                  <td><input type="number" step="0.1" [(ngModel)]="w.start.x" [ngModelOptions]="{standalone:true}"></td>
                  <td><input type="number" step="0.1" [(ngModel)]="w.start.y" [ngModelOptions]="{standalone:true}"></td>
                  <td><input type="number" step="0.1" [(ngModel)]="w.end.x" [ngModelOptions]="{standalone:true}"></td>
                  <td><input type="number" step="0.1" [(ngModel)]="w.end.y" [ngModelOptions]="{standalone:true}"></td>
                  <td><input type="number" step="0.05" [(ngModel)]="w.thickness" [ngModelOptions]="{standalone:true}"></td>
                  <td><input type="number" step="0.1" [(ngModel)]="w.height" [ngModelOptions]="{standalone:true}"></td>
                  <td><button class="btn sm danger" (click)="walls.set(remove(walls(), $index))">✕</button></td>
                </tr>
              }
              @if (!walls().length) { <tr><td colspan="7" class="muted">Sin muros.</td></tr> }
            </table>

            <h4 style="margin-top:14px">Puertas <button class="btn ghost sm" (click)="addDoor()">+ añadir</button></h4>
            <table>
              <tr><th>x</th><th>y</th><th>ancho</th><th>alto</th><th></th></tr>
              @for (d of doors(); track $index) {
                <tr>
                  <td><input type="number" step="0.1" [(ngModel)]="d.position.x" [ngModelOptions]="{standalone:true}"></td>
                  <td><input type="number" step="0.1" [(ngModel)]="d.position.y" [ngModelOptions]="{standalone:true}"></td>
                  <td><input type="number" step="0.1" [(ngModel)]="d.width" [ngModelOptions]="{standalone:true}"></td>
                  <td><input type="number" step="0.1" [(ngModel)]="d.height" [ngModelOptions]="{standalone:true}"></td>
                  <td><button class="btn sm danger" (click)="doors.set(remove(doors(), $index))">✕</button></td>
                </tr>
              }
              @if (!doors().length) { <tr><td colspan="5" class="muted">Sin puertas.</td></tr> }
            </table>

            <h4 style="margin-top:14px">Ventanas <button class="btn ghost sm" (click)="addWindow()">+ añadir</button></h4>
            <table>
              <tr><th>x</th><th>y</th><th>ancho</th><th>alto</th><th>antepecho</th><th></th></tr>
              @for (v of windows(); track $index) {
                <tr>
                  <td><input type="number" step="0.1" [(ngModel)]="v.position.x" [ngModelOptions]="{standalone:true}"></td>
                  <td><input type="number" step="0.1" [(ngModel)]="v.position.y" [ngModelOptions]="{standalone:true}"></td>
                  <td><input type="number" step="0.1" [(ngModel)]="v.width" [ngModelOptions]="{standalone:true}"></td>
                  <td><input type="number" step="0.1" [(ngModel)]="v.height" [ngModelOptions]="{standalone:true}"></td>
                  <td><input type="number" step="0.1" [(ngModel)]="v.sill_height" [ngModelOptions]="{standalone:true}"></td>
                  <td><button class="btn sm danger" (click)="windows.set(remove(windows(), $index))">✕</button></td>
                </tr>
              }
              @if (!windows().length) { <tr><td colspan="6" class="muted">Sin ventanas.</td></tr> }
            </table>
          </div>
        </div>
      } @else if (loadError()) {
        <div class="alert">{{ loadError() }}</div>
      } @else { <div class="spinner">Cargando…</div> }
    </div>
  `,
})
export class SceneEditor implements OnInit {
  private api = inject(Api);
  private route = inject(ActivatedRoute);

  id!: number;
  model = signal<Model3D | null>(null);
  walls = signal<Wall[]>([]);
  doors = signal<Opening[]>([]);
  windows = signal<Opening[]>([]);
  saving = signal(false);
  saved = signal(false);
  error = signal('');
  loadError = signal('');

  ngOnInit(): void {
    this.id = Number(this.route.snapshot.paramMap.get('id'));
    this.api.page<Model3D>('/models3d/', { project: this.id }).subscribe(r => {
      const m = r.items.find(x => x.is_current) || r.items[0] || null;
      if (!m) { this.loadError.set('Este proyecto aún no tiene un modelo 3D que editar.'); return; }
      this.model.set(m);
      const s = m.scene_json || {};
      this.walls.set((s.walls || []).map((w: any) => ({
        id: w.id, start: { x: +(w.start?.x ?? 0), y: +(w.start?.y ?? 0) },
        end: { x: +(w.end?.x ?? 0), y: +(w.end?.y ?? 0) },
        thickness: +(w.thickness ?? 0.15), height: +(w.height ?? 2.7),
      })));
      this.doors.set((s.doors || []).map((d: any) => ({
        id: d.id, position: { x: +(d.position?.x ?? 0), y: +(d.position?.y ?? 0) },
        width: +(d.width ?? 0.9), height: +(d.height ?? 2.1),
      })));
      this.windows.set((s.windows || []).map((v: any) => ({
        id: v.id, position: { x: +(v.position?.x ?? 0), y: +(v.position?.y ?? 0) },
        width: +(v.width ?? 1.0), height: +(v.height ?? 1.1), sill_height: +(v.sill_height ?? 0.9),
      })));
    });
  }

  remove<T>(list: T[], i: number): T[] { return list.filter((_, idx) => idx !== i); }
  addWall(): void { this.walls.set([...this.walls(), { start: { x: 0, y: 0 }, end: { x: 3, y: 0 }, thickness: 0.15, height: 2.7 }]); }
  addDoor(): void { this.doors.set([...this.doors(), { position: { x: 1, y: 0 }, width: 0.9, height: 2.1 }]); }
  addWindow(): void { this.windows.set([...this.windows(), { position: { x: 1, y: 0 }, width: 1.0, height: 1.1, sill_height: 0.9 }]); }

  save(): void {
    const m = this.model();
    if (!m) return;
    this.saving.set(true); this.error.set(''); this.saved.set(false);
    const scene = { ...(m.scene_json || {}), walls: this.walls(), doors: this.doors(), windows: this.windows() };
    this.api.patch<Model3D>(`/models3d/${m.id}/scene/`, { scene }).subscribe({
      next: updated => { this.model.set(updated); this.saving.set(false); this.saved.set(true); },
      error: e => { this.error.set(e.detail?.scene || e.detail || 'No se pudo guardar la escena.'); this.saving.set(false); },
    });
  }
}
