import { Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect, lazy, Suspense } from 'react';
import { Toaster } from 'sonner';
import { getToken, getStoredUser, setSession, clearSession } from './lib/api';

import LandingPage from './pages/LandingPage';

/**
 * Cada panel se carga solo cuando el rol lo necesita.
 *
 * Antes los cinco paneles se importaban de forma estática, así que un
 * cuidador con un teléfono de gama media en zona rural descargaba el panel
 * del hospital entero (2.000+ líneas), Recharts y los módulos FURAG y
 * financieros que nunca va a abrir. Con señal intermitente eso es la
 * diferencia entre entrar y no entrar.
 */
const RegistroPage             = lazy(() => import('./pages/RegistroPage'));
const DashboardEPS             = lazy(() => import('./components/DashboardEPS'));
const DashboardCuidador        = lazy(() => import('./components/DashboardCuidador'));
const DashboardProfesional     = lazy(() => import('./components/DashboardProfesional'));
const DashboardSuperintendencia = lazy(() => import('./components/DashboardSuperintendencia'));
const DashboardPaciente        = lazy(() => import('./components/DashboardPaciente'));

/**
 * Pantalla de espera mientras llega el fragmento del panel. Es sobria a
 * propósito: aparece por menos de un segundo en buena red, y en mala red
 * lo importante es que diga algo, no que entretenga.
 */
function CargandoPanel() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="min-h-screen bg-ink-50 flex flex-col items-center justify-center gap-4 px-6"
    >
      <span
        aria-hidden="true"
        className="h-8 w-8 rounded-full border-2 border-brand-200 border-t-brand-700 animate-spin"
      />
      <p className="text-sm text-ink-500">Cargando tu panel…</p>
    </div>
  );
}

const PANELES = {
  SUPER: DashboardSuperintendencia,
  ADMIN: DashboardEPS,
  PROFESIONAL: DashboardProfesional,
  PACIENTE: DashboardPaciente,
  CUIDADOR: DashboardCuidador
};

function App() {
  // La sesión se resuelve en el primer render, no en un efecto: así no hay
  // un parpadeo en el que el usuario aparece deslogueado y vuelve.
  const [user, setUser] = useState(() => (getToken() ? getStoredUser() : null));

  useEffect(() => {
    // Sin token la sesión guardada no sirve: las rutas del panel
    // responderían 401. Se limpia lo que haya quedado.
    if (!getToken()) clearSession();
  }, []);

  const handleLogin = (userData, token) => {
    setUser(userData);
    setSession(token, userData);
  };

  const handleLogout = () => {
    setUser(null);
    clearSession();
  };

  // El cuidador es el rol por defecto: es el más numeroso del programa.
  const Panel = user ? (PANELES[user.role] || DashboardCuidador) : null;

  return (
    <>
      <Toaster position="top-center" richColors />

      <Suspense fallback={<CargandoPanel />}>
        <Routes>
          <Route
            path="/"
            element={!user ? <LandingPage onLoginSuccess={handleLogin} /> : <Navigate to="/dashboard" replace />}
          />

          <Route path="/registro" element={<RegistroPage />} />

          <Route
            path="/dashboard"
            element={Panel ? <Panel user={user} onLogout={handleLogout} /> : <Navigate to="/" replace />}
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </>
  );
}

export default App;
