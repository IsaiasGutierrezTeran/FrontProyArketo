export const environment = {
  production: true,
  // Build de producción (Vercel) → apunta al backend desplegado en AWS
  // (EC2 + Caddy HTTPS sslip.io). Cuando tengas dominio propio para la API,
  // cámbialo aquí (p.ej. 'https://api.arketo.app/api').
  apiBase: 'https://3-95-35-172.sslip.io/api',
};
