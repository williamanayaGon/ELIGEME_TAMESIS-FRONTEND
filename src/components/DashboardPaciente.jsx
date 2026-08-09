import { useState, useEffect } from 'react';
import { toast } from 'sonner';
// Importamos los iconos de react-icons
import { FaUserCircle, FaNotesMedical, FaStar, FaRobot, FaBell, FaTimes, FaSignOutAlt, FaCalendarPlus} from 'react-icons/fa';

export default function DashboardPaciente({ user, onLogout }) {
  const [activeModal, setActiveModal] = useState(null); // 'HISTORIA', 'CALIFICAR', 'IA'
  
  // Estados para datos
  const [patientData, setPatientData] = useState({ name: user?.name || "Paciente", status: "Activo" });
  const [historyData, setHistoryData] = useState({ logs: [], visits: [] });
  
  // Estados para Calificación
  const [rating, setRating] = useState(0);
  const [evalComments, setEvalComments] = useState('');
  const [pendingVisitId, setPendingVisitId] = useState(null);

  // Estados para la IA
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isLoadingAi, setIsLoadingAi] = useState(false);

  // --- CARGAR DATOS AL INICIAR ---
  useEffect(() => {
    fetchPatientData();
  }, []);

 // --- CARGAR DATOS AL INICIAR ---
  const fetchPatientData = async () => {
    try {
      // 1. Cargar las bitácoras usando la ruta que compartiste
      const resLogs = await fetch(`http://localhost:3000/api/logs?patientId=${user.id}`);
      
      if (resLogs.ok) {
        const logsData = await resLogs.json();
        
        setHistoryData(prev => ({ 
            ...prev, 
            logs: logsData 
        }));
      }
    } catch (error) {
      console.error("Error cargando el historial:", error);
      toast.error("Error de conexión al cargar la historia clínica");
    }
  };

  // --- ENVIAR CALIFICACIÓN ---
  const handleSendRating = async () => {
    if (rating === 0) return toast.warning("Por favor selecciona una calificación");
    if (!pendingVisitId) return toast.info("No tienes visitas pendientes por calificar");

    try {
      const res = await fetch(import.meta.env.VITE_API_URL + '/api/visits/evaluation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitId: pendingVisitId, rating, comments: evalComments })
      });
      if (res.ok) {
        toast.success("¡Gracias por calificar el servicio!");
        setActiveModal(null);
        setPendingVisitId(null);
        fetchPatientData(); // Recargar datos
      } else {
        toast.error("Error al enviar calificación");
      }
    } catch (error) {
      toast.error("Error de conexión");
    }
  };

  // --- CONSULTAR IA ---
  const handleAskAI = async (e) => {
    e.preventDefault();
    if (!aiPrompt.trim()) return;
    
    setIsLoadingAi(true);
    setAiResponse('');
    
    try {
      // ⚠️ Requiere backend: Tu ruta exacta de IA
      const res = await fetch(import.meta.env.VITE_API_URL + '/api/ai-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiPrompt, message: aiPrompt, userType: 'patient' })
      });
      
      if (res.ok) {
        const data = await res.json();
        setAiResponse(data.reply || data.response || "No se obtuvo respuesta.");
      } else {
        toast.error("Error al consultar la IA");
      }
    } catch (error) {
      toast.error("Error de conexión con la IA");
    } finally {
      setIsLoadingAi(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 font-sans pb-10">
      
      {/* --- NAVBAR --- */}
      <nav className="bg-white shadow-sm px-6 py-4 flex justify-between items-center border-b-4 border-green-600">
        <div className="flex items-center gap-3">
          <FaUserCircle className="text-4xl text-green-600" />
          <div>
            <h1 className="text-xl font-extrabold text-gray-800">Hola, {patientData.name}</h1>
            <p className="text-sm font-bold text-green-600">Portal del Paciente</p>
          </div>
        </div>
        <button onClick={onLogout} className="flex items-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 font-bold py-2 px-4 rounded-xl text-sm transition">
          <FaSignOutAlt /> Cerrar Sesión
        </button>
      </nav>

      {/* --- CONTENIDO PRINCIPAL --- */}
      <main className="max-w-5xl mx-auto mt-8 px-4">
        
        <div className="bg-gradient-to-r from-green-500 to-green-700 rounded-3xl p-6 md:p-8 text-white shadow-lg mb-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h2 className="text-2xl font-black mb-1">Seguimiento de su caso</h2>
            <p className="text-green-100 font-medium">Estado actual: <b>{patientData.status}</b></p>
          </div>
          {pendingVisitId && (
            <div className="bg-yellow-400 p-4 rounded-2xl text-black text-center shadow-md animate-pulse">
               <p className="text-sm font-bold uppercase tracking-wider mb-1">Acción Requerida</p>
               <p className="text-md font-black">Tiene una visita por calificar</p>
            </div>
          )}
        </div>

{/* Grid de Opciones */}
        {/* Nota: Se cambió a lg:grid-cols-5 para que quepan los 5 en una línea */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          
          <button onClick={() => setActiveModal('HISTORIA')} className="bg-white p-6 rounded-3xl shadow-sm hover:shadow-md border border-gray-100 flex flex-col items-center text-center transition transform hover:-translate-y-1">
            <div className="bg-blue-100 p-4 rounded-full text-blue-600 text-3xl mb-4"><FaNotesMedical /></div>
            <h3 className="font-bold text-lg text-gray-800 mb-2">Historia Clínica</h3>
            <p className="text-sm text-gray-500">Sus registros y bitácoras.</p>
          </button>

          <button onClick={() => setActiveModal('CALIFICAR')} className="bg-white p-6 rounded-3xl shadow-sm hover:shadow-md border border-gray-100 flex flex-col items-center text-center transition transform hover:-translate-y-1 border-b-4 border-b-yellow-400">
            <div className="bg-yellow-100 p-4 rounded-full text-yellow-600 text-3xl mb-4"><FaStar /></div>
            <h3 className="font-bold text-lg text-gray-800 mb-2">Calificar Servicio</h3>
            <p className="text-sm text-gray-500">Evalúe al visitador médico.</p>
          </button>

          <button onClick={() => setActiveModal('IA')} className="bg-white p-6 rounded-3xl shadow-sm hover:shadow-md border border-gray-100 flex flex-col items-center text-center transition transform hover:-translate-y-1 border-b-4 border-b-purple-500">
            <div className="bg-purple-100 p-4 rounded-full text-purple-600 text-3xl mb-4"><FaRobot /></div>
            <h3 className="font-bold text-lg text-gray-800 mb-2">Recomendaciones IA</h3>
            <p className="text-sm text-gray-500">Consulte dudas de salud general.</p>
          </button>

          {/* --- NUEVO RECUADRO: AGENDAR CITAS --- */}
          <button onClick={() => setActiveModal('AGENDAR')} className="bg-white p-6 rounded-3xl shadow-sm hover:shadow-md border border-gray-100 flex flex-col items-center text-center transition transform hover:-translate-y-1 border-b-4 border-b-emerald-400">
            <div className="bg-emerald-100 p-4 rounded-full text-emerald-600 text-3xl mb-4"><FaCalendarPlus /></div>
            <h3 className="font-bold text-lg text-gray-800 mb-2">Agendar Citas en Casa</h3>
            <p className="text-sm text-gray-500">Programe una nueva visita médica.</p>
          </button>
          {/* ------------------------------------- */}

          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center text-center opacity-70">
            <div className="bg-red-100 p-4 rounded-full text-red-500 text-3xl mb-4"><FaBell /></div>
            <h3 className="font-bold text-lg text-gray-800 mb-2">Notificaciones</h3>
            <p className="text-sm text-gray-500">Recordatorios (Próximamente).</p>
          </div>

        </div>
      </main>
      {/* ============================== */}
      {/* MODALES DE ACCIÓN              */}
      {/* ============================== */}

      {/* Modal: Calificar Servicio */}
      {activeModal === 'CALIFICAR' && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-sm relative text-center">
            <button onClick={() => setActiveModal(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-800 text-xl"><FaTimes /></button>
            <h2 className="text-2xl font-black text-gray-800 mb-2">Calificar Visitador</h2>
            <p className="text-gray-500 text-sm mb-6">¿Qué tal le pareció la atención médica reciente?</p>
            
            <div className="flex justify-center gap-2 mb-4 cursor-pointer">
              {[1, 2, 3, 4, 5].map((star) => (
                <span key={star} onClick={() => setRating(star)} className={`text-5xl transition-transform ${star <= rating ? 'text-yellow-400 scale-110' : 'text-gray-200 hover:text-yellow-200'}`}>
                  ★
                </span>
              ))}
            </div>
            
            <textarea 
               className="w-full border p-2 rounded-xl mb-4 text-sm outline-none" 
               placeholder="Comentarios (Opcional)" 
               rows="2"
               value={evalComments}
               onChange={(e) => setEvalComments(e.target.value)}
            />

            <button onClick={handleSendRating} className="w-full bg-yellow-500 text-black font-black py-4 rounded-xl hover:bg-yellow-600 transition">
              Enviar Calificación
            </button>
          </div>
        </div>
      )}

      {/* Modal: Asistente IA */}
      {activeModal === 'IA' && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-3xl shadow-2xl w-full max-w-lg relative flex flex-col h-[80vh]">
            <button onClick={() => setActiveModal(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-800 text-xl"><FaTimes /></button>
            <h2 className="text-2xl font-black text-purple-700 mb-2 flex items-center gap-2"><FaRobot /> Asistente de Cuidados</h2>
            <p className="text-gray-500 text-sm mb-4">Consulte recomendaciones generales sobre salud y bienestar.</p>
            
            <div className="flex-1 bg-gray-50 rounded-xl p-4 overflow-y-auto mb-4 border">
              {aiResponse ? (
                <div className="text-gray-700 whitespace-pre-wrap">{aiResponse}</div>
              ) : (
                <div className="text-gray-400 text-center mt-10">Escriba su consulta abajo...</div>
              )}
              {isLoadingAi && <div className="text-purple-500 font-bold mt-4 animate-pulse">Generando respuesta...</div>}
            </div>

            <form onSubmit={handleAskAI} className="flex gap-2">
              <input 
                type="text" 
                required 
                className="flex-1 border-2 border-purple-200 rounded-xl p-3 outline-none focus:border-purple-500" 
                placeholder="Ej: ¿Qué alimentos son buenos para la hipertensión?"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
              />
              <button type="submit" disabled={isLoadingAi} className="bg-purple-600 text-white font-bold px-6 rounded-xl hover:bg-purple-700 disabled:bg-purple-300">
                Consultar
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Historia Clínica */}
      {activeModal === 'HISTORIA' && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-2xl relative max-h-[90vh] flex flex-col">
            <button onClick={() => setActiveModal(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-800 text-xl"><FaTimes /></button>
            <h2 className="text-2xl font-black text-gray-800 mb-6 flex items-center gap-2"><FaNotesMedical className="text-blue-600"/> Mi Historia Clínica</h2>
            
            <div className="overflow-y-auto flex-1 pr-2 space-y-6">
              
              {/* Sección Visitas */}
              <div>
                <h3 className="font-bold text-lg text-gray-700 border-b pb-2 mb-3">Visitas Médicas Recientes</h3>
                {historyData.visits.length === 0 ? <p className="text-gray-500 text-sm">No hay visitas registradas.</p> : (
                  <div className="space-y-3">
                    {historyData.visits.map((visit, i) => (
                      <div key={i} className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                        <p className="text-sm font-bold text-blue-600">{new Date(visit.date).toLocaleDateString()}</p>
                        <p className="text-sm text-gray-700 mt-1">Visita realizada por el profesional de salud.</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Sección Bitácoras */}
              <div>
                <h3 className="font-bold text-lg text-gray-700 border-b pb-2 mb-3">Bitácoras del Cuidador</h3>
                {historyData.logs.length === 0 ? <p className="text-gray-500 text-sm">No hay bitácoras registradas.</p> : (
                  <div className="space-y-3">
                    {historyData.logs.map((log, i) => (
                      <div key={i} className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                        <p className="text-sm font-bold text-green-600">{new Date(log.date).toLocaleDateString()}</p>
                        <p className="text-sm text-gray-700 mt-1"><b>Cuidador:</b> {log.caregiverName || "Asignado"}</p>
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">{log.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}