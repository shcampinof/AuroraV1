# AURORA - Estrategia de Pruebas

## 1. Estado actual verificable

## 1.1 Frontend

- Runner: Vitest (`frontend/package.json` -> script `test`).
- Lint: ESLint (`npm run lint`).
- Build check: `npm run build`.
- Tests presentes:
  - `frontend/src/utils/evaluateAuroraRules.test.ts`
  - `frontend/src/utils/__tests__/evaluateAuroraRules.aurora.spec.ts`

Cobertura actual de tests observada:

- Validacion de progresion Bloque 3 -> Bloque 4 en reglas Aurora.
- Casos con campos obligatorios completos e incompletos.
- Caso de uso con IDs estables de campos.

## 1.2 Backend

- Script `test` actual: imprime `No backend tests configured`.
- No se encontraron archivos de prueba backend en este repositorio.

## 2. Objetivo de estrategia (alineado al codigo actual)

- Validar reglas de formulario por flujo (Aurora/Celeste).
- Validar contratos de API usados por frontend.
- Reducir riesgo en persistencia CSV (lectura/escritura y actuacion nueva).

## 3. Propuesta incremental (pendiente de implementar)

## 3.1 Nivel unitario

- Frontend:
  - ampliar pruebas de `evaluateAuroraRules`.
  - crear pruebas para `evaluateCelesteRules`.
- Backend:
  - pruebas de `consolidado.repo.js`:
    - `computeTipo`
    - normalizacion de headers
    - `updateByDocumento`
    - `createActuacionByDocumento`

## 3.2 Nivel integracion

- Pruebas de rutas Express con fixtures CSV controlados:
  - `GET/PUT /api/ppl/:documento`
  - `GET/POST /api/ppl/:documento/actuaciones`
  - `GET /api/defensores` y `?source=condenados`

## 3.3 Nivel UI (flujo critico)

- Buscar PPL -> editar -> guardar -> verificar persistencia.
- Crear nueva actuacion -> diligenciar -> guardar -> verificar historial.

## 4. Criterios minimos de calidad sugeridos

- Ejecutar en CI:
  - `frontend: npm run lint && npm run test && npm run build`
  - `backend: TODO` (definir runner y suite)
- Definir un baseline de cobertura para utilidades de reglas.

## 5. TODO de testing

- TODO: definir stack de pruebas backend (ejemplo: Vitest/Jest + supertest).
- TODO: definir estrategia de fixtures CSV por escenario funcional.
- TODO: definir pipeline CI y umbrales de calidad (coverage, lint, build).
