import { useEffect, useState } from 'react';
import { getPplByDocumento, updatePpl } from '../services/api.js';
import FormularioEntrevistaCondenados from './FormularioEntrevistaCondenados.jsx';
import FormularioEntrevistaSindicados from './FormularioEntrevistaSindicados.jsx';
import { pickActiveCase } from '../utils/entrevistaEstado.js';

function FormularioEntrevista({ numeroInicial }) {
  const [numeroBusqueda, setNumeroBusqueda] = useState(numeroInicial || '');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  const [tipo, setTipo] = useState(null);
  const [registro, setRegistro] = useState(null);
  const [activeCaseId, setActiveCaseId] = useState('');
  const [caseBusy, setCaseBusy] = useState(false);
  const [caseError, setCaseError] = useState('');
  const [guardadoOk, setGuardadoOk] = useState(false);

  useEffect(() => {
    if (numeroInicial) {
      buscarRegistro(numeroInicial);
    }
  }, [numeroInicial]);

  async function buscarRegistro(numero) {
    const doc = String(numero || '').trim();
    if (!doc) {
      setError('Ingrese un numero de identificacion.');
      return;
    }

    setCargando(true);
    setError('');
    setCaseError('');
    setGuardadoOk(false);

    try {
      const data = await getPplByDocumento(doc);
      setNumeroBusqueda(doc);
      setTipo(data?.tipo ?? null);
      const reg = data?.registro ?? null;
      const active = pickActiveCase(reg);
      const nextId = String(reg?.activeCaseId || active?.caseId || '').trim();
      setActiveCaseId(nextId);
      setRegistro(reg ? { ...reg, activeCaseId: nextId } : null);
    } catch (err) {
      console.error(err);
      setError('No se encontro el usuario con ese numero.');
      setTipo(null);
      setRegistro(null);
      setActiveCaseId('');
    } finally {
      setCargando(false);
    }
  }

  function handleConsultarOtro() {
    setTipo(null);
    setRegistro(null);
    setNumeroBusqueda('');
    setError('');
    setCaseError('');
    setGuardadoOk(false);
    setActiveCaseId('');
  }

  const casosOrdenados = (() => {
    const casos = Array.isArray(registro?.casos) ? registro.casos : [];
    return [...casos].sort((a, b) => String(a?.createdAt || '').localeCompare(String(b?.createdAt || '')));
  })();

  const casoActivo = (() => {
    const casos = casosOrdenados;
    if (!casos.length) return null;
    const id = String(activeCaseId || registro?.activeCaseId || '').trim();
    if (id) {
      const hit = casos.find((c) => String(c?.caseId) === id);
      if (hit) return hit;
    }
    return casos[casos.length - 1];
  })();

  function handleSelectCaso(id) {
    const next = String(id || '').trim();
    setActiveCaseId(next);
    setRegistro((prev) => (prev ? { ...prev, activeCaseId: next } : prev));
  }

  function buildBaseCaseData(nextTipo, currentData) {
    const t = String(nextTipo || '').trim().toLowerCase();
    const data = currentData && typeof currentData === 'object' ? currentData : {};

    const baseKeys =
      t === 'sindicado'
        ? [
            'numeroIdentificacion',
            'nombre',
            'tipoIdentificacion',
            'genero',
            'edad',
            'departamento',
            'municipio',
            'cdt',
            'autoridadJudicial',
            'delitos',
            'tipoPpl',
          ]
        : [
            'numeroIdentificacion',
            'Title',
            'Nombre usuario',
            'Establecimiento',
            'Departamento del lugar de reclusión',
            'Departamento del lugar de reclusiÃ³n',
            'Municipio del lugar de reclusión',
            'Municipio del lugar de reclusiÃ³n',
            'Autoridad a cargo',
            'Proceso',
            'Delitos',
            'Situación jurídica ',
            'SituaciÃ³n jurÃ­dica ',
            'tipoPpl',
          ];

    const out = {};
    baseKeys.forEach((k) => {
      if (data?.[k] !== undefined && data?.[k] !== null) out[k] = data[k];
    });

    if (!out.numeroIdentificacion) out.numeroIdentificacion = data.numeroIdentificacion || data.Title || '';
    if (t === 'sindicado' && !out.nombre) out.nombre = data.nombre || data.nombreUsuario || '';
    if (t === 'condenado' && out['Nombre usuario'] == null) out['Nombre usuario'] = data['Nombre usuario'] || '';
    return out;
  }

  async function crearNuevoCaso() {
    if (!registro) return;
    const doc = String(numeroBusqueda || '').trim();
    if (!doc) return;

    setCaseBusy(true);
    setCaseError('');
    try {
      const nextCaseId = `${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
      const baseData = buildBaseCaseData(tipo, casoActivo?.data || {});
      const res = await updatePpl(doc, { caseId: nextCaseId, data: baseData });

      const reg = res?.registro ?? registro;
      setRegistro(reg ? { ...reg, activeCaseId: nextCaseId } : null);
      setActiveCaseId(nextCaseId);
    } catch (e) {
      console.error(e);
      setCaseError('Error creando un nuevo caso.');
    } finally {
      setCaseBusy(false);
    }
  }

  const formProps = {
    numeroInicial: numeroBusqueda,
    caseIdInicial: String(activeCaseId || registro?.activeCaseId || '').trim(),
    caseDataInicial: casoActivo?.data || null,
    mostrarBuscador: false,
    mostrarBotonConsultarOtro: guardadoOk,
    onGuardarExitoso: () => setGuardadoOk(true),
    onConsultarOtro: handleConsultarOtro,
  };

  return (
    <>
      <div className="card">
        <h2>Buscar Usuario</h2>

        <div className="search-row">
          <div className="form-field">
            <label>Numero de Identificacion</label>
            <input
              type="text"
              placeholder="Ingrese Documento"
              value={numeroBusqueda}
              onChange={(e) => setNumeroBusqueda(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  buscarRegistro(numeroBusqueda);
                }
              }}
            />
          </div>
          <button
            className="primary-button primary-button--search"
            type="button"
            onClick={() => buscarRegistro(numeroBusqueda)}
          >
            CONSULTAR PPL
          </button>
        </div>

        {cargando && <p>Cargando informacion...</p>}
        {error && <p className="hint-text">{error}</p>}

        {!cargando && registro && (
          <div className="filter-panel" style={{ marginTop: '1rem' }}>
            <h3 className="filter-title">Historial de casos</h3>

            {caseError && <p className="hint-text">{caseError}</p>}

            <div className="search-row">
              <div className="form-field" style={{ minWidth: 320, marginBottom: 0 }}>
                <label>Caso</label>
                <select
                  value={String(activeCaseId || registro?.activeCaseId || '')}
                  onChange={(e) => handleSelectCaso(e.target.value)}
                >
                  {casosOrdenados.map((c) => {
                    const short = String(c.caseId || '').slice(-6);
                    const created = String(c.createdAt || '').replace('T', ' ').slice(0, 16) || '-';
                    return (
                      <option key={c.caseId} value={c.caseId}>
                        {created} — {short}
                      </option>
                    );
                  })}
                </select>
              </div>

              <button className="primary-button primary-button--search" type="button" onClick={crearNuevoCaso} disabled={caseBusy}>
                {caseBusy ? 'Creando...' : 'Crear nuevo caso'}
              </button>
            </div>
          </div>
        )}
      </div>

      {!cargando && registro && tipo === 'condenado' && (
        <FormularioEntrevistaCondenados key={formProps.caseIdInicial || 'case'} {...formProps} />
      )}

      {!cargando && registro && tipo === 'sindicado' && (
        <FormularioEntrevistaSindicados key={formProps.caseIdInicial || 'case'} {...formProps} />
      )}

      {!cargando && registro && tipo !== 'condenado' && tipo !== 'sindicado' && (
        <div className="card" style={{ marginTop: '1rem' }}>
          <p className="hint-text">
            Tipo de PPL no valido. Verifique el dato devuelto por la API.
          </p>
        </div>
      )}
    </>
  );
}

export default FormularioEntrevista;
