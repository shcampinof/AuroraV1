# AuroraV1

AuroraV1 es una aplicación web (React + Express) orientada al apoyo de la gestión de atención jurídica.

## Estructura del repositorio
```
AuroraV1/
  frontend/
  backend/
```

## Requisitos técnicos
- Node.js 18 o superior
- npm

## Ejecución en ambiente de desarrollo

### Backend
1. Ubicarse en la carpeta `backend/`.
2. Instalar dependencias.
3. Ejecutar el servidor.

```bash
cd backend
npm install
npm run dev
# Alternativa:
# npm start
```

Verificación:
- `http://localhost:4000/api/health`

### Frontend
1. Ubicarse en la carpeta `frontend/`.
2. Instalar dependencias.
3. Ejecutar la aplicación.

```bash
cd frontend
npm install
npm run dev
# Alternativa (Create React App):
# npm start
```

## Configuración de conexión con la API
- Opción por variable de entorno (Vite): crear `frontend/.env`
```
VITE_API_BASE_URL=http://localhost:4000/api
```

- Opción por proxy (Create React App): agregar en `frontend/package.json`
```json
"proxy": "http://localhost:4000"
```

## Formatos descargables
Los archivos disponibles para descarga deben ubicarse en:
```
backend/public/formatos/
```

## Control de versiones (Git)
Elementos que no se deben versionar:
- `node_modules/`
- archivos `.env`
- carpetas de compilación (`dist/`, `build/`)
- archivos de log (`*.log`)
