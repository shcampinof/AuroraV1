function ManualInteractivo() {
  const videoUrl = '/AuroraInstructivo.mp4';

  return (
    <div className="card">
      <h2>Manual Interactivo</h2>

      <video controls src={'/AuroraInstructivo.mp4'} style={{ width: '100%', borderRadius: '8px' }}>
        Tu navegador no soporta la reproducción de video.
      </video>
    </div>
  );
}

export default ManualInteractivo;
