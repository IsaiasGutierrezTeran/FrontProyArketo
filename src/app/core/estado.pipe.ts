import { Pipe, PipeTransform } from '@angular/core';

/** Traduce códigos de estado/severidad del backend a español para mostrarlos. */
const MAP: Record<string, string> = {
  // Proyecto
  draft: 'Borrador', active: 'Activo', archived: 'Archivado',
  // Presupuesto / revisión
  submitted: 'Enviado', approved: 'Aprobado', observed: 'Observado', rejected: 'Rechazado',
  // Suscripción
  canceled: 'Cancelada', cancelled: 'Cancelada', incomplete: 'Pendiente de pago', past_due: 'Vencida',
  // Invitaciones / membresía
  pending: 'Pendiente', accepted: 'Aceptada',
  // Procesos (IA, detección, planos)
  completed: 'Completado', processing: 'Procesando', error: 'Error', failed: 'Falló',
  uploaded: 'Subido', processed: 'Procesado', valid: 'Válido', invalid: 'Inválido',
  generado: 'Generado', generated: 'Generado',
  // Severidad de riesgos
  high: 'Alta', medium: 'Media', low: 'Baja', critical: 'Crítica',
};

@Pipe({ name: 'estado', standalone: true })
export class EstadoPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    if (!value) return '';
    return MAP[value.toLowerCase()] ?? value;
  }
}
