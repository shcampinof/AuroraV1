# AURORA - Matriz de Reglas (Aurora/Celeste)

Fuentes analizadas:

- `frontend/src/utils/evaluateAuroraRules.ts`
- `frontend/src/utils/evaluateCelesteRules.ts`
- `frontend/src/pages/FormularioAtencion.jsx`
- `frontend/src/config/formRules.aurora.ts`
- `frontend/src/config/formRules.celeste.ts`

## 1. Reglas de visibilidad por bloque

| Flujo | Regla | Condicion | Efecto |
|---|---|---|---|
| Aurora (evaluador) | Base visible | Siempre | `bloque1`, `bloque2Aurora` |
| Aurora (evaluador) | Mostrar bloque 3 | No hay `lockRules` activas | Se agrega `bloque3` |
| Aurora (evaluador) | Mostrar bloque 4 | Obligatorios de `bloque3` completos | Se agrega `bloque4` |
| Aurora (evaluador) | Mostrar bloque 5 | Obligatorios de `bloque4` completos | Se agrega variante de bloque 5 |
| Aurora (evaluador) | Variante bloque 5 | `conditionalBlockVisibility.when = true` | Variante `bloque5UtilidadPublica` |
| Aurora (evaluador) | Variante por defecto | No se activa condicion de variante | `bloque5TramiteNormal` |
| Aurora (componente) | Render bloque 5A | `bloque4` visible y actuación incluye utilidad pública | Renderiza 5A |
| Aurora (componente) | Render bloque 5B | `bloque4` visible, no 5A y actuación diligenciada | Renderiza 5B |
| Celeste (evaluador) | Base visible | Siempre | `bloque1`, `bloque2Celeste`, `bloque3Celeste` |
| Celeste (evaluador) | Mostrar bloques 4 y 5 | Obligatorios de bloque 3 completos | Se agregan `bloque4Celeste`, `bloque5Celeste` |

## 2. Reglas de deshabilitacion

| Flujo | Fuente | Condicion | Campos/efecto |
|---|---|---|---|
| Aurora | `dependencyRules` | Q46 = No | Deshabilita Q47 y Q48 |
| Aurora | `dependencyRules` | En 5A y Q52 != "Niega utilidad pública" | Deshabilita Q53, Q54, Q55, Q56 |
| Aurora | `dependencyRules` | En 5A y Q52 = "Niega utilidad pública" | Habilita Q53 y Q54 |
| Aurora | `dependencyRules` | En 5A, Q52 = "Niega utilidad pública" y Q54 = Sí | Habilita Q55 y Q56 |
| Aurora | `dependencyRules` | En 5B y Q54 != Sí | Deshabilita Q55 y "Sentido de la decisión que resuelve la solicitud" |
| Aurora | `dependencyRules` | En 5B y Q54 = Sí | Habilita Q55 y "Sentido de la decisión que resuelve la solicitud" |
| Aurora | `FormularioAtencion` | Q34 distinto de Sí | Deshabilita Q35 |
| Aurora | `FormularioAtencion` | `cierreRegla1Bloque3` | Deshabilita Q38, Q39 y contribuye a bloqueo de bloque 5 |
| Aurora | `FormularioAtencion` | `cierreRegla1Bloque3` o `decisionUsuarioBloquea` | Deshabilita Q40 |
| Aurora | `FormularioAtencion` | `cierreRegla1Bloque3` o `decisionUsuarioBloquea` o actuación "Ninguna" | Deshabilita Q41 y Q42 |
| Aurora | `FormularioAtencion` | `bloquearBloque5` | Deshabilita la mayoría de campos de bloque 5 |
| Aurora | `FormularioAtencion` | 5A: no aplica negativa de utilidad pública | Deshabilita Q53 y Q54 |
| Aurora | `FormularioAtencion` | 5A: Q54 no es Sí | Deshabilita Q55 y Q56 |
| Aurora | `FormularioAtencion` | 5B: Q54 no es Sí | Deshabilita fecha de recurso y sentido que resuelve solicitud |
| Celeste | `FormularioAtencion` | "¿Se recurrió...?" no es Sí | Deshabilita preguntas 29 y 30 de bloque 5 |

## 3. Reglas de limpieza automatica

| Flujo | Fuente | Condicion | Limpieza |
|---|---|---|---|
| Aurora | `FormularioAtencion` | Q34 no habilita Q35 | Limpia ambas claves de Q35 (`KEY_Q35_LEGACY`, `KEY_Q35_UTF8`) |
| Aurora | `FormularioAtencion` | No aplica "Niega utilidad pública" | Limpia: `Motivo de la decisión negativa`, `Se presenta recurso`, `Fecha de recurso en caso desfavorable` |
| Celeste | `FormularioAtencion` | "¿Se recurrió...?" no es Sí | Limpia: `Fecha de presentación del recurso`, `SENTIDO DE LA DECISIÓN QUE RESUELVE RECURSO` |

## 4. Reglas de cierre de caso

| Flujo | Fuente | Condicion | Efecto |
|---|---|---|---|
| Aurora | `formRules.aurora.ts` (`isCasoCerrado`) | Q30-Q33 completas y negativas | Caso cerrado |
| Aurora | `formRules.aurora.ts` (`isCasoCerrado`) | Q39 no permite continuar | Caso cerrado |
| Aurora | `formRules.aurora.ts` (`isCasoCerrado`) | Q40 contiene "ninguna" | Caso cerrado |
| Aurora | `formRules.aurora.ts` (`isCasoCerrado`) | Q44 = No o Q45 = No | Caso cerrado |
| Aurora | `formRules.aurora.ts` (`isCasoCerrado`) | Q54 = No | Caso cerrado |
| Aurora | `formRules.aurora.ts` (`isCasoCerrado`) | Q56 diligenciada | Caso cerrado |
| Aurora | `FormularioAtencion` (`casoCerrado`) | Regla 30-33 negativas (`cierreRegla1Bloque3`) | Caso cerrado |
| Aurora | `FormularioAtencion` (`casoCerrado`) | Decisión de usuario bloqueante | Caso cerrado |
| Aurora | `FormularioAtencion` (`casoCerrado`) | Actuación inicia por "Ninguna" | Caso cerrado |
| Aurora | `FormularioAtencion` (`casoCerrado`) | Utilidad pública: Q44/Q45 = No, o recurso = No, o sentido recurso diligenciado | Caso cerrado |
| Aurora | `FormularioAtencion` (`casoCerrado`) | Trámite normal: recurso = No, o sentido resuelve solicitud diligenciado | Caso cerrado |
| Aurora | `FormularioAtencion` (`cierrePorDecisionFinalBloque5`) | Selección de cierre por imposibilidad o (en utilidad pública) Q52 diligenciada | Dispara cierre final de bloque 5 |
| Aurora | `FormularioAtencion` (`useEffect`) | `cierrePorDecisionFinalBloque5` y estado no cerrado | Guarda automáticamente `Estado del caso = Cerrado` vía `updatePpl` |
| Celeste | `formRules.celeste.ts` | `closeCaseRules = []` y `isCaseClosedCeleste` retorna `false` | No hay cierre automático definido en evaluador |

## 5. Reglas que afectan estado del trámite

| Flujo | Fuente | Condicion | Resultado |
|---|---|---|---|
| Aurora | `derivedStatusRules` | `isCasoCerrado(record)` | `Caso cerrado` |
| Aurora | `derivedStatusRules` | Falta fecha de análisis o resumen | `Analizar el caso` |
| Aurora | `derivedStatusRules` | Análisis completo pero falta entrevista o actuación | `Entrevistar al usuario` |
| Aurora | `derivedStatusRules` | Base completa y falta radicación | `Presentar solicitud` |
| Aurora | `derivedStatusRules` | Radicación hecha y falta decisión | `Pendiente decisión` |
| Aurora | `evaluateAuroraRules` | Primera regla que coincide | Devuelve `derivedStatus` |
| Aurora | `FormularioAtencion` | `auroraActivo` y cambia `derivedStatus` | Escribe `Estado del trámite` en `registro` |
| Aurora | `FormularioAtencion` | `casoCerrado` cambia | Escribe `Estado del caso` (`Activo`/`Cerrado`) |
| Celeste | `evaluateCelesteRules` | Estado actual | No expone estado derivado; `locked=false`, `jumpToAurora=false` |
| Celeste | `formRules.celeste.ts` | `deriveStatusCeleste` (helper) | Existe (`En gestión`/`Pendiente de análisis`) pero no se usa en `FormularioAtencion.jsx` |
