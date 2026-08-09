import { Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react'; 
import { Toaster } from 'sonner'; 

// Importación de Páginas
import LandingPage from './pages/LandingPage';
import RegistroPage from './pages/RegistroPage';

// Importación de Paneles (Dashboards)
import DashboardEPS from './components/DashboardEPS';
import DashboardCuidador from './components/DashboardCuidador';
import DashboardProfesional from './components/DashboardProfesional'; 
import DashboardSuperintendencia from './components/DashboardSuperintendencia'; 
// 👇 1. NUEVO: Importamos el panel del paciente 👇
import DashboardPaciente from './components/DashboardPaciente'; 


function App() {
  const [user, setUser] = useState(null);

  // --- PERSISTENCIA DE SESIÓN ---
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  return (
    <>
      {/* Componente de notificaciones global */}
      <Toaster position="top-center" richColors />

      <Routes>
        {/* RUTA 1: Landing Page (Inicio) */}
        <Route 
          path="/" 
          element={!user ? <LandingPage onLoginSuccess={handleLogin} /> : <Navigate to="/dashboard" />} 
        />
        
        {/* RUTA 2: Registro (Pública) */}
        <Route 
          path="/registro" 
          element={<RegistroPage />} 
        />

        {/* RUTA 3: Dashboard (Protegida) */}
        <Route 
          path="/dashboard" 
          element={
            user ? (
              // 1. Si es SUPERINTENDENCIA
              user.role === 'SUPER' ? (
                <DashboardSuperintendencia user={user} onLogout={handleLogout} />
              ) 
              // 2. Si es EPS (ADMIN)
              : user.role === 'ADMIN' ? (
                <DashboardEPS user={user} onLogout={handleLogout} />
              ) 
              // 3. Si es MÉDICO/ENFERMERO
              : user.role === 'PROFESIONAL' ? (
                <DashboardProfesional user={user} onLogout={handleLogout} />
              ) 
              // 👇 4. NUEVO: Si es PACIENTE 👇
              : user.role === 'PACIENTE' ? (
                <DashboardPaciente user={user} onLogout={handleLogout} />
              )
              // 5. Si es CUIDADOR (Default)
              : (
                <DashboardCuidador user={user} onLogout={handleLogout} />
              )
            ) : (
              <Navigate to="/" />
            )
          } 
        />
        
        {/* Ruta comodín */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </>
  );
}

export default App;