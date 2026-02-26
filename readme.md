# AuroraV1

Aplicacion web para la gestion de atencion juridica de personas privadas de la libertad (PPL), con enfoque en:

- Consulta y seguimiento de casos.
- Formulario de atencion juridica (flujos Aurora/Celeste).
- Asignacion y reasignacion de defensores.
- Consulta y descarga de formatos de apoyo.

## 1. Vision general de arquitectura

El proyecto esta dividido en dos aplicaciones:

- `frontend/`: cliente web React + Vite.
- `backend/`: API REST en Node.js + Express.

La arquitectura sigue un flujo simple y directo:

1. El frontend renderiza vistas y captura acciones del usuario.
2. El frontend llama endpoints HTTP del backend (`/api/...`).
3. El backend procesa reglas basicas y consulta repositorios.
4. La persistencia se realiza en archivos CSV (no base de datos SQL/NoSQL).
5. El backend responde JSON y el frontend actualiza la interfaz.

## 2. Estructura del repositorio

```text
AuroraV1/
  backend/
    data/
      Datosconsolidados.csv
      defensores.csv
      formatos.mock.js
    db/
      consolidado.repo.js
      defensores.repo.js
    routes/
      ppl.js
      defensores.js
      formatos.js
    index.js
  frontend/
    public/
    src/
      components/
      config/
      pages/
      services/
      utils/
    index.html
    vite.config.js
  readme.md
```

## 3. Frontend en detalle

Stack principal:

- React 19
- Vite
- Fetch nativo para llamadas HTTP

Puntos clave:

- Navegacion por hash (sin `react-router`), con vistas principales:
  - `inicio`
  - `formulario`
  - `registros`
  - `asignacion`
  - `herramientas`
  - `manual`
- Cliente API centralizado en `frontend/src/services/api.js`.
- Reglas de formulario separadas por flujo:
  - Aurora (condenados)
  - Celeste (sindicados)

Paginas relevantes:

- `FormularioAtencion.jsx`: consulta por documento, edicion, guardado y reglas de avance/cierre.
- `RegistrosAsignados.jsx`: listado general con filtros y estado derivado.
- `AsignacionDefensores.jsx`: asignacion/reasignacion de casos.
- `CajaHerramientas.jsx`: listado y descarga de formatos.

## 4. Backend en detalle

Stack principal:

- Node.js (CommonJS)
- Express 5
- csv-parse

Comportamiento general:

- Expone API bajo prefijo `/api`.
- Habilita CORS y parseo JSON.
- Define endpoint de salud (`/api/health`).
- Organiza endpoints por modulo en `routes/`.

Rutas:

- `routes/ppl.js`: listado, consulta por documento y actualizacion de registro.
- `routes/defensores.js`: consulta de defensores desde CSV o deducidos del consolidado.
- `routes/formatos.js`: listado mock de formatos y descarga de archivos por id.

## 5. API (contratos principales)

Base URL local por defecto:

```text
http://localhost:4000/api
```

### Salud

- `GET /api/health`
  - Respuesta esperada: `{ ok: true, message: "..." }`

### PPL

- `GET /api/ppl`
  - Opcional: `?tipo=condenado|sindicado`
  - Respuesta: `{ tipo, columns, rows }`

- `GET /api/ppl/condenados`
  - Respuesta: `{ rows }`
  - Usa un mapeo de columnas del consolidado para la tabla de asignacion.

- `GET /api/ppl/:documento`
  - Respuesta: `{ tipo, registro }`
  - `404` si no existe.

- `PUT /api/ppl/:documento`
  - Body: `payload` o `{ data: payload }`
  - Respuesta: `{ tipo, registro }`
  - Persiste cambios en `Datosconsolidados.csv`.

### Defensores

- `GET /api/defensores`
  - Respuesta: `{ defensores }` desde `defensores.csv`.

- `GET /api/defensores?source=condenados`
  - Respuesta: `{ defensores }` deduplicados desde el consolidado de condenados.

### Formatos

- `GET /api/formatos`
  - Respuesta: arreglo de formatos mock.

- `GET /api/formatos/:id/download`
  - Descarga archivo esperado en `backend/public/formatos/`.
  - Si no existe el archivo, retorna error 500 con detalle.

## 6. Capa de datos (CSV)

Archivos de datos:

- `backend/data/Datosconsolidados.csv`: fuente principal de casos PPL.
- `backend/data/defensores.csv`: lista auxiliar de defensores.

Repositorio principal (`consolidado.repo.js`):

- Carga CSV en memoria (cache) al primer acceso.
- Normaliza encabezados para tolerar variaciones y acentos.
- Busca por documento y calcula tipo de flujo (`condenado` o `sindicado`).
- En actualizaciones:
  - agrega columnas faltantes necesarias para negocio,
  - aplica patch de campos permitidos,
  - reescribe el CSV completo en disco.

Nota operativa:

- Este enfoque es simple para entornos controlados o modo mock.
- Para alta concurrencia, historicos robustos y trazabilidad, se recomienda migrar a base de datos transaccional.

## 7. Flujo funcional end-to-end (ejemplo real)

Caso: guardar entrevista de un PPL.

1. Usuario abre formulario y consulta por documento.
2. Frontend hace `GET /api/ppl/:documento`.
3. Backend lee del consolidado y devuelve `registro`.
4. Usuario modifica campos y presiona guardar.
5. Frontend hace `PUT /api/ppl/:documento` con los datos.
6. Backend actualiza fila correspondiente en CSV.
7. Frontend muestra confirmacion y refresca historial/estado.

## 8. Requisitos

- Node.js 18 o superior
- npm

## 9. Configuracion de entorno

### Frontend

Crear `frontend/.env`:

```env
VITE_API_BASE_URL=http://localhost:4000/api
```

Si no se define, el frontend usa ese mismo valor como fallback.

### Backend

Opcional:

```env
PORT=4000
```

## 10. Ejecucion local

### Backend

```bash
cd backend
npm install
npm run dev
```

Verificacion:

```text
http://localhost:4000/api/health
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## 11. Calidad y pruebas

Actualmente los comandos de calidad estan en frontend:

```bash
cd frontend
npm run lint
npm run test
npm run build
```

En backend no hay suite de pruebas automatizadas configurada por defecto.

## 12. Consideraciones conocidas

- Existen campos y encabezados con variantes de codificacion en algunos datasets, y el codigo incluye normalizaciones para reducir fallos.
- El modulo de formatos usa una lista mock (`formatos.mock.js`) y depende de archivos fisicos para descarga real.
- La persistencia CSV sobrescribe el archivo completo en cada actualizacion.

## 13. Siguientes mejoras recomendadas

1. Migrar persistencia CSV a base de datos (PostgreSQL o similar).
2. Agregar autenticacion/autorizacion por roles.
3. Incorporar auditoria de cambios (quien, que, cuando).
4. Agregar pruebas backend (unitarias e integracion).
5. Versionar formalmente el contrato API (OpenAPI/Swagger).
