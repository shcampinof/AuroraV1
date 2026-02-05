function Home() {
  return (
    <div className="card">
      <div className="home-logo-placeholder">
        <img
          src="/LogoAurora.png"
          alt="Logo AURORA"
          className="home-logo"
        />
      </div>

      <h2 className="home-title">Bienvenido</h2>

      <p className="home-text">
        Aurora es la herramienta institucional para la gestión de atención jurídica de personas privadas de la
        libertad.
      </p>
      <p className="home-text">Use el menú lateral para navegar dentro del sitio.</p>
    </div>
  );
}

export default Home;
