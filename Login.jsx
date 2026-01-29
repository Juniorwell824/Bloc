<form className="login-form" onSubmit={handleLogin}>

  {/* 📧 Email */}
  <input
    type="email"
    placeholder="Correo electrónico"
    value={email}
    onChange={(e) => setEmail(e.target.value)}
    required
  />

  {/* 🔑 Contraseña */}
  <input
    type="password"
    placeholder="Contraseña"
    value={password}
    onChange={(e) => setPassword(e.target.value)}
    required
  />

  {/* 🔁 RESTABLECER CONTRASEÑA */}
  <button
    type="button"
    className="forgot-btn"
    onClick={resetPassword}
  >
    ¿Olvidaste tu contraseña?
  </button>

  {/* 🚀 LOGIN */}
  <button type="submit" className="btn-primary">
    Iniciar sesión
  </button>

</form>
