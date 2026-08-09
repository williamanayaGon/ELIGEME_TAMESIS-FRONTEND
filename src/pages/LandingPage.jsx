import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export default function LandingPage({ onLoginSuccess }) {
  const navigate = useNavigate();

  // Estados
  const [modalType, setModalType] = useState(null);
  const [email, setEmail] = useState('');
  const [credential, setCredential] = useState('');

  // Lógica de Login
  const handleLogin = async (e) => {
    e.preventDefault();
    const type = modalType === 'LOGIN_CODE' ? 'CODE' : 'PASSWORD';

    try {
     const res = await fetch('http://localhost:3000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, credential, type }) 
      });

      const data = await res.json();

      if (res.ok) {
        onLoginSuccess(data);
      } else {
        toast.error(data.error || 'Error de credenciales');
      }
    } catch {
      toast.error('Error de conexión con el servidor');
    }
  };

  return (
    <div className="min-h-screen flex flex-col text-gray-800 relative overflow-hidden bg-white">

      {/* ============================================================ */}
      {/* CAPA 1: VIDEO DE FONDO                                       */}
      {/* ============================================================ */}
      <div className="absolute inset-0 z-0 w-full h-full overflow-hidden">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute top-0 left-0 w-full h-full object-cover"
        >
          <source src="/fondo.mp4" type="video/mp4" />
        </video>

        <div className="absolute inset-0 bg-white/15 backdrop-blur-[1px]"></div>
      </div>


      {/* ============================================================ */}
      {/* CAPA 2: CONTENIDO PRINCIPAL                                  */}
      {/* ============================================================ */}
      <div className="relative z-10 flex flex-col min-h-screen">

        {/* --- NAVBAR --- */}
        <nav className="w-full pt-6 pb-2">
          <div className="max-w-7xl mx-auto px-10 flex justify-between items-center">
            
            <div className="flex items-center gap-4">
              <img src="/bee.png" alt="" className="h-14 w-auto drop-shadow-md" />
              <span className="text-2xl font-extrabold text-[#1f3c88] tracking-tight drop-shadow-sm">
                ELÍGEME
              </span>
            </div>

            <button
              onClick={() => setModalType('LOGIN_PASSWORD')}
              className="flex items-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-black px-6 py-3 rounded-full font-bold transition shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              Iniciar sesión
            </button>
          </div>
        </nav>

        {/* --- HERO SECTION --- */}
        <main className="relative flex-1 flex flex-col md:flex-row items-center justify-between gap-20 px-12 md:px-28 py-16">
          
          {/* Columna Izquierda: Textos */}
          <div className="relative max-w-2xl z-10">
            <h1 className="text-6xl md:text-7xl font-extrabold text-[#1f3c88] mb-8 leading-tight drop-shadow-md">
              ¡ELÍGEME!
            </h1>

            <p className="text-2xl text-gray-900 mb-6 leading-relaxed font-bold">
              Plataforma de la Superintendencia para la gestión y supervisión del cuidado.
            </p>

            <p className="text-gray-900 mb-14 text-lg leading-relaxed max-w-xl font-semibold">
              Sistema institucional que permite gestionar de forma integral los procesos
              relacionados con el cuidado, desde el registro hasta la supervisión normativa.
            </p>

            <div className="flex flex-col sm:flex-row gap-6">
              <button
                onClick={() => setModalType('LOGIN_CODE')}
                className="flex items-center gap-3 bg-yellow-500 hover:bg-yellow-600 text-black px-10 py-5 rounded-full font-bold shadow-xl hover:shadow-2xl transition transform hover:-translate-y-1"
              >
                Ya tengo un Código / Soy EPS
              </button>

              <button
                onClick={() => navigate('/registro')}
                className="flex items-center gap-3 bg-white/90 border-2 border-yellow-500 text-yellow-700 hover:bg-yellow-50 px-10 py-5 rounded-full font-bold shadow-lg hover:shadow-xl transition transform hover:-translate-y-1 backdrop-blur-sm"
              >
                Quiero postularme
              </button>
            </div>
          </div>

          {/* Columna Derecha: Imagen Decorativa (SIN RECUADRO BLANCO) */}
          <div className="relative max-w-sm z-10 hidden md:block">
            {/* Se eliminó el div absoluto con bg-white/40 para mostrar la transparencia real */}
            <img
              src="/bee.png"
              alt=""
              className="relative w-full h-auto drop-shadow-[0_20px_50px_rgba(0,0,0,0.3)] animate-float"
            />
          </div>
        </main>

        {/* --- FOOTER --- */}
        <footer className="py-6 text-center text-gray-700 font-bold text-sm">
          © 2026 Eligeme S.A.S
        </footer>
      </div>

      {/* MODAL LOGIN */}
      {modalType && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md relative border border-gray-100">
            <button
              onClick={() => setModalType(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 font-bold text-xl"
            >
              ✕
            </button>
            <h2 className="text-2xl font-bold mb-2 text-center text-[#1f3c88]">
              {modalType === 'LOGIN_CODE' ? 'Acceso con Código' : 'Inicio de Sesión'}
            </h2>
            <p className="text-center text-sm text-gray-500 mb-8">
              Ingresa tus credenciales para continuar.
            </p>
            <form onSubmit={handleLogin} className="space-y-4">
              <input
                type="email"
                required
                placeholder="Correo electrónico"
                className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-yellow-400 outline-none bg-gray-50 text-gray-900"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <input
                type="password"
                required
                placeholder={modalType === 'LOGIN_CODE' ? 'Código de 6 dígitos' : 'Contraseña'}
                className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-yellow-400 outline-none bg-gray-50 tracking-widest text-gray-900"
                value={credential}
                onChange={(e) => setCredential(e.target.value)}
              />
              <button className="w-full bg-[#1f3c88] text-white font-bold py-4 rounded-xl hover:bg-[#162c63] transition shadow-lg">
                Ingresar
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Estilos para la animación de flotado */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }
        .animate-float {
          animation: float 4s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}