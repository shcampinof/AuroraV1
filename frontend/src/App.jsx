import { useState } from 'react';

import Header from './components/Header.jsx';
import Sidebar from './components/Sidebar.jsx';

import Home from './pages/Home.jsx';
import RegistrosAsignados from './pages/RegistrosAsignados.jsx';
import FormularioEntrevista from './pages/FormularioEntrevista.jsx';
import AsignacionDefensores from './pages/AsignacionDefensores.jsx';
import CajaHerramientas from './pages/CajaHerramientas.jsx';
import ManualInteractivo from './pages/ManualInteractivo.jsx';

function App() {
  const [vistaActual, setVistaActual] = useState('inicio');
  const [numeroSeleccionado, setNumeroSeleccionado] = useState(null);

  const cambiarVista = (vista) => setVistaActual(vista);

  function abrirFormularioPorDocumento(numeroIdentificacion) {
    const doc = String(numeroIdentificacion || '').trim();
    if (!doc) return;

    setNumeroSeleccionado(doc);
    setVistaActual('formulario');
  }

  const manejarSeleccionRegistro = (payload) => {
    if (typeof payload === 'string' || typeof payload === 'number') {
      abrirFormularioPorDocumento(payload);
      return;
    }

    const doc = payload?.numeroIdentificacion;
    if (doc) abrirFormularioPorDocumento(doc);
  };

  let contenido = null;

  if (vistaActual === 'inicio') {
    contenido = <Home />;
  }

  if (vistaActual === 'formulario') {
    contenido = <FormularioEntrevista numeroInicial={numeroSeleccionado} />;
  }

  if (vistaActual === 'registros') {
    contenido = <RegistrosAsignados onSelectRegistro={manejarSeleccionRegistro} />;
  }

  if (vistaActual === 'asignacion') contenido = <AsignacionDefensores />;

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
