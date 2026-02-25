# AuroraV1

Aplicacion web para gestion de atencion juridica de personas privadas de la libertad.

## Estructura

```text
AuroraV1/
  frontend/
  backend/
```

## Requisitos

- Node.js 18+
- npm

## Desarrollo local

### Backend

```bash
cd backend
npm install
npm run dev
```

API de salud:

```text
http://localhost:4000/api/health
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Variable de entorno (frontend)

Crear `frontend/.env`:

```env
VITE_API_BASE_URL=http://localhost:4000/api
```

## Calidad y pruebas (frontend)

```bash
cd frontend
npm run lint
npm run test
npm run build
```
