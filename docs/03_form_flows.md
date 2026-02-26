# AURORA - Flujos de Formulario (Implementacion Actual)

## 1. Punto de entrada

Componente principal: `frontend/src/pages/FormularioAtencion.jsx`.

Secuencia base:

1. El usuario consulta por documento.
2. Frontend llama `getPplByDocumento` (`GET /api/ppl/:documento`).
3. El registro se guarda en estado local (`registro`).
4. Se calcula el flujo con `computeFlow(registro)`:
   - si `Situación Jurídica` contiene `condenad` -> Aurora.
   - si contiene `sindicad` -> Celeste.
   - en otro caso -> `null`.

## 2. Reglas de visibilidad por bloque

## 2.1 Aurora (`evaluateAuroraRules`)

Fuente: `evaluateAuroraRules.ts` + `formRules.aurora.ts`.

- Base visible: `bloque1`, `bloque2Aurora`.
- Si no hay lock, se agrega `bloque3`.
- Si obligatorios de `bloque3` estan completos, se agrega `bloque4`.
- Si obligatorios de `bloque4` estan completos, se agrega bloque 5 activo.
- Variante de bloque 5:
  - `bloque5UtilidadPublica` cuando se cumple regla condicional (`q40` en flujo utilidad publica).
  - en otro caso `bloque5TramiteNormal` (default).

Lock activo en Aurora:

- `lock_por_actuacion_40_sindicada`: si `q40` contiene "Ninguna porque la persona está sindicada".
- Efecto en visibilidad: no se agrega `bloque3`; quedan visibles solo `bloque1` y `bloque2Aurora`.

## 2.2 Aurora (render en `FormularioAtencion.jsx`)

Adicional a `visibleBlocks`:

- Bloque 5 se renderiza si hay variante visible o si `bloque4` esta visible y `Actuación a adelantar` tiene valor.
- `show5A`: requiere `bloque4` visible y actuación de utilidad pública.
- `show5B`: requiere `bloque4` visible, no `show5A` y actuación diligenciada.

## 2.3 Celeste (`evaluateCelesteRules`)

Fuente: `evaluateCelesteRules.ts` + `formRules.celeste.ts`.

- Siempre visibles: `bloque1`, `bloque2Celeste`, `bloque3Celeste`.
- Si obligatorios de bloque 3 estan completos, se agregan `bloque4Celeste` y `bloque5Celeste`.
- `locked` siempre es `false` en el evaluador actual.
- `jumpToAurora` siempre es `false` en el evaluador actual.

## 3. Reglas de deshabilitacion

## 3.1 Aurora (evaluador)

`evaluateAuroraRules` calcula `disabledFields` desde `dependencyRules`:

- Q46 = No -> deshabilita Q47 y Q48.
- En 5A, Q52 != "Niega utilidad pública" -> deshabilita Q53, Q54, Q55, Q56.
- En 5A, Q52 = "Niega utilidad pública" -> habilita Q53, Q54.
- En 5A, Q52 = "Niega utilidad pública" y Q54 = Sí -> habilita Q55, Q56.
- En 5B, Q54 != Sí -> deshabilita Q55 y "Sentido de la decisión que resuelve la solicitud".
- En 5B, Q54 = Sí -> habilita esos mismos dos campos.

## 3.2 Aurora (componente)

Reglas de UI adicionales:

- Q35 se deshabilita si Q34 no es equivalente a "Sí".
- En bloque 4:
  - Q38 y Q39 se deshabilitan cuando aplica `cierreRegla1Bloque3`.
  - Q40 se deshabilita por `cierreRegla1Bloque3` o `decisionUsuarioBloquea`.
  - Q41 y Q42 se deshabilitan por `cierreRegla1Bloque3`, `decisionUsuarioBloquea` o actuación que inicia por "Ninguna".
- En bloque 5 (`bloquearBloque5`):
  - gran parte del bloque se deshabilita cuando hay cierre por bloque 3, decisión de usuario bloqueante o actuación "Ninguna".
- En 5A:
  - Q53 y Q54 dependen de `habilitarNegativaUtilidadPublica`.
  - Q55 depende además de que Q54 sea Sí.
  - Q56 depende de que Q54 sea Sí.
- En 5B:
  - "Fecha de recurso..." y "Sentido de la decisión que resuelve la solicitud" dependen de que Q49/Q54 ("Se presenta recurso") sea Sí.

## 3.3 Celeste (componente)

- En bloque 5 Celeste, las preguntas 29 y 30 se deshabilitan si "¿Se recurrió en caso de decisión negativa?" no es equivalente a Sí.

## 4. Reglas de limpieza automatica

Aplicadas en `FormularioAtencion.jsx` mediante `useEffect`:

- Si Q34 no habilita Q35, se limpian ambas variantes de clave de Q35 (`KEY_Q35_LEGACY` y `KEY_Q35_UTF8`).
- Si no aplica "Niega utilidad pública", se limpian:
  - `Motivo de la decisión negativa`
  - `Se presenta recurso`
  - `Fecha de recurso en caso desfavorable`
- En Celeste, si no hay recurso (`habilitarCelesteRecurso = false`), se limpian:
  - `Fecha de presentación del recurso`
  - `SENTIDO DE LA DECISIÓN QUE RESUELVE RECURSO`

## 5. Reglas de cierre de caso

## 5.1 Cierre en `formRules.aurora.ts` (`isCasoCerrado`)

Se considera cerrado si ocurre cualquiera de estas condiciones:

- Q30-Q33 diligenciadas y todas negativas (`No`, `No aplica`, `No cumple`).
- Q39 con decisión que no inicia con "Sí".
- Q40 contiene "ninguna".
- Q44 = No o Q45 = No.
- Q54 = No.
- Q56 diligenciada.

## 5.2 Cierre en `FormularioAtencion.jsx` (`casoCerrado`)

El componente recalcula cierre con su propia lógica:

- `cierrePorDecisionFinalBloque5`:
  - cierre seleccionado en pregunta de imposibilidad (trámite o utilidad pública), o
  - en utilidad pública, Q52 diligenciada.
- decisión de usuario bloqueante.
- actuación que inicia por "Ninguna".
- regla 30-33 negativas (`cierreRegla1Bloque3`).
- utilidad pública:
  - Q44 = No o Q45 = No, o
  - `Se presenta recurso` = No, o
  - `Sentido de la decisión que resuelve recurso` diligenciado.
- trámite normal:
  - `Se presenta recurso` = No, o
  - `Sentido de la decisión que resuelve la solicitud` diligenciado.

Persistencia automática de cierre:

- Si `auroraActivo` y `cierrePorDecisionFinalBloque5`, se intenta guardar automáticamente con `Estado del caso = Cerrado`.

## 6. Reglas que afectan estado del trámite

## 6.1 Estado derivado Aurora (`evaluateAuroraRules`)

`derivedStatus` usa `derivedStatusRules` de `formRules.aurora.ts`:

- `Caso cerrado`
- `Analizar el caso`
- `Entrevistar al usuario`
- `Presentar solicitud`
- `Pendiente decisión`

El orden de evaluación es el definido en el arreglo (primera coincidencia).

## 6.2 Escritura de estado en formulario

En `FormularioAtencion.jsx`:

- Se sincroniza `Estado del caso` entre `Activo` y `Cerrado` según `casoCerrado`.
- En Aurora, se sincroniza `Estado del trámite` con `auroraRuleState.derivedStatus`.

## 6.3 Estado en Celeste

- `evaluateCelesteRules` no devuelve estado derivado.
- `formRules.celeste.ts` tiene `deriveStatusCeleste`, pero `FormularioAtencion.jsx` no lo usa para escribir `Estado del trámite`.

## 7. Salto Celeste -> Aurora

- Existe flujo en `FormularioAtencion.jsx` (`handleSaltoCelesteAAurora`) para guardar y forzar navegación a Aurora.
- En la implementación actual no se dispara, porque `evaluateCelesteRules` retorna `jumpToAurora: false` y `jumpPayload: undefined`.
