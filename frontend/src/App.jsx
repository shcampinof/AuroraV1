import { useState } from 'react';

import Header from './components/Header.jsx';
import Sidebar from './components/Sidebar.jsx';

import Home from './pages/Home.jsx';
import RegistrosAsignados from './pages/RegistrosAsignados.jsx';

import FormularioEntrevistaCondenados from './pages/FormularioEntrevistaCondenados.jsx';
import FormularioEntrevistaSindicados from './pages/FormularioEntrevistaSindicados.jsx';

import AsignacionDefensores from './pages/AsignacionDefensores.jsx';
import ConsultaAsignacion from './pages/ConsultaAsignacion.jsx';


import CajaHerramientas from './pages/CajaHerramientas.jsx';
import ManualInteractivo from './pages/ManualInteractivo.jsx';

import { getPplByDocumento } from './services/api.js';


function App() {
  // 'inicio' | 'formulario' | 'registros' | 'herramientas' | 'manual'
  const [vistaActual, setVistaActual] = useState('inicio');

  const [numeroSeleccionado, setNumeroSeleccionado] = useState(null);
  const [tipoSeleccionado, setTipoSeleccionado] = useState(null); // 'condenado' | 'sindicado' | null

  const cambiarVista = (vista) => setVistaActual(vista);

  async function abrirFormularioPorDocumento(numeroIdentificacion) {
    const doc = String(numeroIdentificacion || '').trim();
    if (!doc) return;

    try {
      const data = await getPplByDocumento(doc);
      // backend: { tipo: 'sindicado'|'condenado', registro: {...} }
      const tipo = data?.tipo ?? null;

      setNumeroSeleccionado(doc);
      setTipoSeleccionado(tipo || 'condenado'); // fallback razonable en mock
      setVistaActual('formulario');
    } catch (err) {
      console.error(err);
      alert('No se encontró el usuario con ese número');
    }
  }

  // Compatible con dos formas:
  // - onSelectRegistro("1111")
  // - onSelectRegistro({ numeroIdentificacion: "1111", tipoPpl: "sindicado" })
  const manejarSeleccionRegistro = (payload) => {
    if (typeof payload === 'string' || typeof payload === 'number') {
      abrirFormularioPorDocumento(payload);
      return;
    }

    const doc = payload?.numeroIdentificacion;
    const tipo = payload?.tipoPpl;

    if (doc && tipo) {
      setNumeroSeleccionado(String(doc));
      setTipoSeleccionado(tipo);
      setVistaActual('formulario');
      return;
    }

    // si viene incompleto, se resuelve consultando backend
    if (doc) abrirFormularioPorDocumento(doc);
  };

  let contenido = null;

  if (vistaActual === 'inicio') {
    contenido = <Home />;
  }

  if (vistaActual === 'formulario') {
    if (tipoSeleccionado === 'sindicado') {
      contenido = <FormularioEntrevistaSindicados numeroInicial={numeroSeleccionado} />;
    } else {
      // default: condenado
      contenido = <FormularioEntrevistaCondenados numeroInicial={numeroSeleccionado} />;
    }
  }

  if (vistaActual === 'registros') {
    // Se puede pasar una prop opcional para abrir el formulario desde aquí
    contenido = (
      <RegistrosAsignados
        onSelectRegistro={manejarSeleccionRegistro}
      />
    );
  }

  if (vistaActual === 'asignacion') contenido = <AsignacionDefensores />;

  if (vistaActual === 'consultaAsignacion') {
  contenido = <ConsultaAsignacion />;
}

  if (vistaActual === 'herramientas') {
    contenido = <CajaHerramientas />;
  }

  if (vistaActual === 'manual') {
    contenido = <ManualInteractivo />;
  }

  return (
    <div className="app-container">
      <Header />
      <div className="main-layout">
        <Sidebar vistaActual={vistaActual} onChangeView={cambiarVista} />
        <main className="content-area">{contenido}</main>
      </div>
    </div>
  );
}

export default App;
