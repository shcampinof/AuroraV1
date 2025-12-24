import { useEffect, useState } from 'react';
import { getFormatos, getFormatoDownloadUrl } from '../services/api.js';

function CajaHerramientas() {
  const [formatos, setFormatos] = useState([]);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    async function cargar() {
      setCargando(true);
      try {
        const data = await getFormatos();
        setFormatos(data);
      } catch (e) {
        console.error(e);
        alert('Error cargando formatos');
      } finally {
        setCargando(false);
      }
    }
    cargar();
  }, []);

  return (
    <div className="card">
      <h2 className="center-title">Formatos para apoyar las solicitudes de atención jurídica</h2>

      {cargando && <p>Cargando...</p>}

      {!cargando && (
        <div className="tools-grid">
          {formatos.map((f) => (
            <div key={f.id} className="tool-card">
              <div className="tool-icon" aria-hidden="true">📄</div>
              <div className="tool-title">{f.titulo}</div>

              <a className="tool-download" href={getFormatoDownloadUrl(f.id)}>
                Descargar
              </a>
            </div>
          ))}

          {formatos.length === 0 && (
            <p style={{ gridColumn: '1 / -1', textAlign: 'center' }}>
              No hay formatos para mostrar.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default CajaHerramientas;
