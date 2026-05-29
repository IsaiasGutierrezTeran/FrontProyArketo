export const environment = {
  production: false,
  // Django backend — the only API the frontend talks to.
  // Apuntando al backend desplegado en AWS (EC2 + Caddy HTTPS) para probar local
  // contra el server real antes de desplegar el front en Vercel.
  // Para volver a backend local: 'http://localhost:8000/api'
  apiBase: 'https://3-95-35-172.sslip.io/api',
};
