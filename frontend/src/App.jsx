import { useState } from 'react';
import Header from './components/Header.jsx';
import Sidebar from './components/Sidebar.jsx';

import Home from './pages/Home.jsx';
import RegistrosAsignados from './pages/RegistrosAsignados.jsx';
import FormularioEntrevista from './pages/FormularioEntrevista.jsx';
import CajaHerramientas from './pages/CajaHerramientas.jsx';
import ManualInteractivo from './pages/ManualInteractivo.jsx';

function App() {
  // 'inicio' | 'formulario' | 'registros' | 'herramientas' | 'manual'
  const [vistaActual, setVistaActual] = useState('inicio');
  const [numeroSeleccionado, setNumeroSeleccionado] = useState(null);

  const cambiarVista = (vista) => setVistaActual(vista);

  const manejarSeleccionRegistro = (numeroIdentificacion) => {
    setNumeroSeleccionado(numeroIdentificacion);
    setVistaActual('formulario');
  };

  let contenido = null;
  if (vistaActual === 'inicio') contenido = <Home />;
  if (vistaActual === 'formulario') contenido = <FormularioEntrevista numeroInicial={numeroSeleccionado} />;
  if (vistaActual === 'registros') contenido = <RegistrosAsignados onSelectRegistro={manejarSeleccionRegistro} />;
  if (vistaActual === 'herramientas') contenido = <CajaHerramientas />;
  if (vistaActual === 'manual') contenido = <ManualInteractivo />;

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
