import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { 
    MdWbSunny, MdWbTwilight, MdNightsStay, MdSentimentNeutral, MdSentimentSatisfied, 
    MdSentimentVeryDissatisfied, MdVisibility, MdSnooze, MdPsychology, MdDirectionsWalk, 
    MdAccessible, MdBed, MdRestaurant, MdFastfood, MdDoNotDisturb, MdCheck, MdClose, 
    MdRemove, MdPersonalInjury, MdThermostat, MdCoronavirus, MdAir, MdStar, MdPerson, 
    MdSecurity, MdCheckCircle, MdEvent, MdMedicalServices, MdWash, MdWarning, MdNoteAlt, 
    MdDraw, MdSave, MdLightbulb, MdHome, MdPhone, MdHourglassEmpty, MdCelebration, 
    MdFavorite, MdLocationOn, MdMedication
} from 'react-icons/md';
import SignatureCanvas from 'react-signature-canvas';
import { useRef } from 'react';
import { apiFetch } from '../lib/api';



export default function DashboardCuidador({ user, onLogout }) {
    const sigCanvas = useRef({});
  const [signatureBase64, setSignatureBase64] = useState(null);

  const handleClearSignature = () => {
      sigCanvas.current.clear();
      setSignatureBase64(null);
  };

  const handleSaveSignature = () => {
      if (sigCanvas.current.isEmpty()) {
          toast.warning("Por favor, dibuja tu firma.");
          return;
      }
      setSignatureBase64(sigCanvas.current.getTrimmedCanvas().toDataURL('image/png'));
      toast.success("Firma capturada con éxito");
  };
    
    // --- ESTADOS PARA EVALUACIÓN DEL VISITADOR MÉDICO ---
  const [isEvaluationOpen, setIsEvaluationOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [evalComments, setEvalComments] = useState('');
  const [dataPrivacyAccepted, setDataPrivacyAccepted] = useState(false);
  
  // (Simulación) Este estado se llenará cuando el backend detecte una visita sin calificar
// El estado inicia vacío, el backend dirá si hay algo pendiente
  const [visitorToEvaluate, setVisitorToEvaluate] = useState(null);

  // ENVÍO DE EVALUACIÓN DEL VISITADOR
  const submitEvaluation = async (e) => {
      e.preventDefault();
      if (rating === 0) return toast.warning("Asigna una puntuación al visitador.");
      if (!dataPrivacyAccepted) return toast.error("Debes aceptar la política de tratamiento de datos.");

      try {
          const res = await apiFetch('/api/visits/evaluation', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ visitId: visitorToEvaluate.visitId, caregiverId: user.id, rating, comments: evalComments, dataPrivacyAccepted })
          });
          if (res.ok) {
              toast.success("Evaluación guardada exitosamente");
              setIsEvaluationOpen(false);
              setVisitorToEvaluate(null); 
          } else toast.error("Error al guardar la evaluación");
      } catch (error) { toast.error("Error de conexión"); }
  };
  const [loading, setLoading] = useState(false);
  const [patient, setPatient] = useState(null);
  const [logs, setLogs] = useState([]);
  // ESTADO PARA EL PERFIL DEL PACIENTE
  const [isPatientProfileOpen, setIsPatientProfileOpen] = useState(false);
  
  // --- ESTADOS PARA SUBIDA DE ARCHIVO (PRESELECCIONADO) ---
  const [senaFile, setSenaFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  // =================================================================
  // ESTADOS Y FUNCIÓN DEL ASISTENTE DE IA (GUÍA VIRTUAL)
  // =================================================================
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([
      { role: 'assistant', text: '¡Hola! Soy tu guía virtual. Pregúntame lo que necesites sobre el cuidado de tu paciente hoy.' }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [sendingAi, setSendingAi] = useState(false);

  const handleSendAiMessage = async (e) => {
      e.preventDefault();
      // Evitar enviar mensajes vacíos o si ya está enviando uno
      if (!inputMessage.trim() || sendingAi) return;

      const userText = inputMessage;
      setInputMessage(''); // Limpiar el input rápido
      
      // Mostrar el mensaje del usuario inmediatamente en el chat
      setChatMessages(prev => [...prev, { role: 'user', text: userText }]);
      setSendingAi(true);

      try {
          // Llamar a tu backend
          const res = await apiFetch('/api/ai-assistant', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ message: userText })
          });
          const data = await res.json();
          
          if (res.ok) {
              setChatMessages(prev => [...prev, { role: 'assistant', text: data.reply }]);
          } else {
              setChatMessages(prev => [...prev, { role: 'assistant', text: 'Tuvimos un inconveniente al buscar la respuesta.' }]);
          }
      } catch (error) {
          setChatMessages(prev => [...prev, { role: 'assistant', text: 'Error de conexión. Revisa que el servidor esté encendido.' }]);
      } finally {
          setSendingAi(false);
      }
  };
  // =================================================================

  // --- ESTADO DEL FORMULARIO COMPLETO ---
  const initialForm = {
    temperature: '',
    systolicBP: '', // Presión Alta
    diastolicBP: '', // Presión Baja
    // A2
    generalState: 'Igual',
    alertLevel: 'Alerta',
    mobility: 'Camina',
    // A3
    feeding: 'Completa',
    hydration: 'Sí',
    foodObs: '',
    // A4
    medsGiven: 'Sí',
    medsReason: '', // Si es No
    // A5
    hygiene: 'Sí',
    clothes: 'Sí',
    skin: 'Sí',
    // A6
    mobilization: 'Sí',
    position: 'Sí',
    aids: 'Sí',
    // A7 (Alertas - Checkboxes)
    alerts: [], 
    alertDesc: '',
    // A8
    observations: '',
    // A9
    signature: ''
  };

  const [formData, setFormData] = useState(initialForm);
  const [activeTab, setActiveTab] = useState('FORM'); // 'FORM' o 'HISTORY'

  // --- CARGA DE DATOS ---
const fetchData = async () => {
    if (user.status !== 'APROBADO') return;
    setLoading(true);
    try {
      // 1. Traer datos del paciente
      const resP = await apiFetch(`/api/patients?caregiverId=${user.id}`);
      const dataP = await resP.json();
      if (Array.isArray(dataP) && dataP.length > 0) setPatient(dataP[0]);
      else if (dataP && !Array.isArray(dataP)) setPatient(dataP);
      else setPatient(null);

      // 2. Traer el historial de bitácoras
      const resL = await apiFetch(`/api/logs?caregiverId=${user.id}`);
      const dataL = await resL.json();
      setLogs(Array.isArray(dataL) ? dataL : []);

      // 👇 3. NUEVO: Preguntar si hay visitas pendientes de calificar
      const resV = await apiFetch(`/api/visits/pending-evaluation/${user.id}`);
      const pendingEval = await resV.json();
      
      // Si el backend devuelve algo, activamos el aviso en pantalla
      setVisitorToEvaluate(pendingEval); 

    } catch (error) {
      toast.error("Error cargando datos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [user.status]);

  // --- MANEJADORES DEL FORMULARIO BITÁCORA ---
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCheckbox = (value) => {
    setFormData(prev => {
      const current = prev.alerts;
      if (current.includes(value)) {
        return { ...prev, alerts: current.filter(item => item !== value) };
      } else {
        return { ...prev, alerts: [...current, value] };
      }
    });
  };

  // --- MANEJADOR SUBIDA CERTIFICADO (PRESELECCIONADO) ---
  const handleUploadSena = async (e) => {
      e.preventDefault();
      if (!senaFile) return toast.error("Selecciona un archivo PDF");
      
      const uploadData = new FormData();
      uploadData.append('certificate', senaFile);

      try {
          setUploading(true);
          const res = await apiFetch(`/api/upload-certificate/${user.id}`, {
              method: 'POST',
              body: uploadData
          });

          if (res.ok) {
              toast.success("Certificado enviado correctamente. Espera confirmación.");
          } else {
              toast.error("Error al subir archivo");
          }
      } catch (error) {
          console.error(error);
          toast.error("Error de conexión");
      } finally {
          setUploading(false);
      }
  };

 // --- ENVIAR BITÁCORA ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!patient) return toast.error("No tienes paciente asignado");

    // 1. Extraer la firma automáticamente (SIN usar getTrimmedCanvas)
    let finalSignature = null;
    
    if (sigCanvas.current && !sigCanvas.current.isEmpty()) {
        // 👇 AQUÍ ESTÁ EL CAMBIO: Usamos getCanvas() en lugar de getTrimmedCanvas()
        finalSignature = sigCanvas.current.getCanvas().toDataURL('image/png');
    } else {
        return toast.error("Debes dibujar tu firma en el recuadro antes de guardar");
    }

    try {
        const res = await apiFetch('/api/logs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                caregiverId: user.id,
                patientId: patient.id,
                formData: formData, 
                caregiverSignature: finalSignature
            })
        });

        if (res.ok) {
            toast.success("Bitácora registrada correctamente");
            setFormData(initialForm);
            
            // Limpiamos el lienzo
            if (sigCanvas.current) {
                sigCanvas.current.clear();
            }
            
            fetchData();
            setActiveTab('HISTORY');
        } else {
            const errorData = await res.json();
            toast.error("Error al guardar: " + (errorData.error || "Revisa la consola"));
        }
    } catch (error) {
        toast.error("Error de conexión con el servidor");
    }
  };
  

  // =======================================================
  // VISTA 1: USUARIO PENDIENTE
  // =======================================================
  if (user.status === 'PENDIENTE') {
      return (
          <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
              <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
                  <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-4xl">⏳</span>
                  </div>
                  <h1 className="text-2xl font-bold text-gray-800 mb-2">Solicitud en Revisión</h1>
                  <p className="text-gray-500 mb-6">
                      Hola <strong>{user.fullName}</strong>. Estamos validando tu perfil.
                  </p>
                  <button onClick={onLogout} className="text-blue-600 font-bold hover:underline">Cerrar Sesión</button>
              </div>
          </div>
      );
  }

  // =======================================================
  // VISTA 2: USUARIO PRESELECCIONADO (CORREGIDO)
  // =======================================================
  if (user.status === 'PRESELECCIONADO') {
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
            <div className="bg-white p-8 rounded-2xl shadow-xl max-w-lg w-full">
                <div className="text-center mb-6">
                    <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-4xl">🎉</span>
                    </div>
                    <h1 className="text-2xl font-bold text-blue-900">¡Has sido Preseleccionado!</h1>
                    <p className="text-gray-500 mt-2">
                        Para completar tu contratación, por favor sube tu <strong>Certificado de Cursos SENA</strong> (PDF o Imagen).
                    </p>
                </div>

                <form onSubmit={handleUploadSena} className="bg-gray-50 p-6 rounded-xl border-2 border-dashed border-blue-200">
                    <label className="block text-sm font-bold text-gray-700 mb-2">Seleccionar Archivo</label>
                    <input 
                        type="file" 
                        accept=".pdf,.jpg,.png,.jpeg"
                        onChange={(e) => setSenaFile(e.target.files[0])}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    
                    <button 
                        type="submit" 
                        disabled={uploading}
                        className={`mt-4 w-full py-3 rounded-lg font-bold text-white transition ${uploading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 shadow-lg'}`}
                    >
                        {uploading ? 'Subiendo...' : 'Enviar Certificado'}
                    </button>
                </form>
                
                <div className="mt-6 text-center">
                    <button onClick={onLogout} className="text-red-500 font-bold text-sm hover:underline">Cerrar Sesión</button>
                </div>
            </div>
        </div>
    );
  }

  // =======================================================
  // VISTA 3: USUARIO APROBADO (TU CÓDIGO ACTUAL)
  // =======================================================
  return (
    
    <div className="min-h-screen bg-gray-100 font-sans pb-20">
      
      {/* HEADER */}
      <header className="bg-blue-700 text-white shadow sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 py-4 flex justify-between items-center">
            <div>
                <h1 className="font-bold text-xl">Bitácora Digital</h1>
                <p className="text-xs text-blue-200">Cuidador: {user.fullName}</p>
            </div>
            <button onClick={onLogout} className="bg-white/20 px-4 py-2 rounded text-sm font-bold">Salir</button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-4 space-y-6">

      {/* INFO PACIENTE MEJORADO */}
        {patient ? (
            <div className="bg-white p-5 rounded-2xl shadow-sm border-l-4 border-blue-500 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                    <h2 className="text-gray-500 text-xs font-bold uppercase tracking-wider">Paciente Asignado</h2>
                    <p className="text-2xl font-black text-gray-900 mt-1">{patient.fullName}</p>
                    <p className="text-sm text-gray-600 font-medium">{patient.diagnosis}</p>
                </div>
                
                {/* 👇 EL BOTÓN DEL PERFIL DETALLADO QUEDA AQUÍ 👇 */}
                <button 
                    type="button"
                    onClick={() => setIsPatientProfileOpen(true)}
                    className="bg-blue-50 text-blue-800 hover:bg-blue-100 px-5 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-sm border border-blue-200 shrink-0 self-start sm:self-auto hover:scale-105"
                >
                    <span>👤</span> Ver Perfil Completo
                </button>
                {/* AVISO DE VISITA PENDIENTE POR CALIFICAR */}
                {visitorToEvaluate && (
                    <div className="mt-4 bg-amber-50 border border-amber-200 p-4 rounded-xl flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <MdStar className="text-amber-500 text-3xl" />
                            <div>
                                <p className="text-sm font-bold text-amber-900">Visita Médica Reciente</p>
                                <p className="text-xs text-amber-700">Por favor, califica la atención de {visitorToEvaluate.name}</p>
                            </div>
                        </div>
                        <button onClick={() => setIsEvaluationOpen(true)} className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm">
                            Evaluar Ahora
                        </button>
                    </div>
                )}
            </div>
        ) : (
            <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-200 text-yellow-800 font-medium">
                ⚠️ Esperando asignación de paciente...
            </div>
        )}

        {/* TABS */}
        <div className="flex bg-white rounded-lg shadow-sm overflow-hidden">
            <button 
                onClick={() => setActiveTab('FORM')}
                className={`flex-1 py-3 font-bold text-sm ${activeTab === 'FORM' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
            >
                📝 Nueva Bitácora
            </button>
            <button 
                onClick={() => setActiveTab('HISTORY')}
                className={`flex-1 py-3 font-bold text-sm ${activeTab === 'HISTORY' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
            >
                historial ({logs.length})
            </button>
        </div>

{/* FORMULARIO */}
        {activeTab === 'FORM' && (
            <form onSubmit={handleSubmit} className="space-y-6">
                
                {/* A1 */}
                <Section title="A1. Identificación" icon="📅">
                    <div className="grid grid-cols-2 gap-4 text-sm bg-gray-50 p-4 rounded-xl border border-gray-200">
                        <div>
                            <span className="block text-gray-500 text-xs font-bold mb-1">Fecha de hoy</span>
                            <span className="font-extrabold text-lg text-blue-700">{new Date().toLocaleDateString()}</span>
                        </div>
                        <div>
                            <span className="block text-gray-500 text-xs font-bold mb-2">Turno</span>
                            <div className="flex gap-2">
                                {/* Cambiamos el select feo por botones rápidos */}
                                {['Mañana', 'Tarde', 'Noche'].map(turno => (
                                    <label key={turno} className="flex-1 text-center cursor-pointer">
                                        <input type="radio" name="shift" value={turno} className="hidden" />
                                        <div className="bg-white border border-gray-300 rounded-lg py-2 hover:bg-blue-50 text-xl" title={turno}>
                                            {getIcon(turno)}
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                </Section>

                {/* A2 */}
                <Section title="A2. Estado General" icon="👤">
                    <RadioGroup label="¿Cómo encontró al paciente?" name="generalState" options={['Igual', 'Mejor', 'Peor']} val={formData.generalState} onChange={handleChange} />
                    <RadioGroup label="Nivel de Alerta" name="alertLevel" options={['Alerta', 'Somnoliento', 'Desorientado']} val={formData.alertLevel} onChange={handleChange} />
                    <RadioGroup label="Movilidad" name="mobility" options={['Camina', 'Con ayuda', 'Encamado']} val={formData.mobility} onChange={handleChange} />
                </Section>
                {/* A2.5 SIGNOS VITALES (NUEVO) */}
                <Section title="A2.5 Signos Vitales (Opcional pero recomendado)" icon="❤️">
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">Temp (°C)</label>
                            <input type="number" step="0.1" name="temperature" value={formData.temperature} onChange={handleChange} placeholder="Ej: 37.5" className="w-full border-2 border-gray-200 rounded-xl p-2 text-sm focus:border-blue-500 outline-none" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">Presión Alta</label>
                            <input type="number" name="systolicBP" value={formData.systolicBP} onChange={handleChange} placeholder="Ej: 120" className="w-full border-2 border-gray-200 rounded-xl p-2 text-sm focus:border-blue-500 outline-none" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">Presión Baja</label>
                            <input type="number" name="diastolicBP" value={formData.diastolicBP} onChange={handleChange} placeholder="Ej: 80" className="w-full border-2 border-gray-200 rounded-xl p-2 text-sm focus:border-blue-500 outline-none" />
                        </div>
                    </div>
                </Section>

                {/* A3 */}
                <Section title="A3. Alimentación e Hidratación" icon="🍲">
                    <RadioGroup label="¿Cómo se alimentó?" name="feeding" options={['Completa', 'Parcial', 'No toleró']} val={formData.feeding} onChange={handleChange} />
                    <div className="mb-4">
                        <VisualSelect label="¿Tomó suficientes líquidos?" name="hydration" val={formData.hydration} onChange={handleChange} />
                    </div>
                    <textarea name="foodObs" placeholder="Escribe aquí si hubo algún problema con la comida..." value={formData.foodObs} onChange={handleChange} className="w-full border-2 border-gray-200 rounded-xl p-3 text-sm mt-2 focus:border-blue-500 outline-none" rows="2" />
                </Section>

                {/* A4 */}
                <Section title="A4. Medicación" icon="💊">
                    <RadioGroup label="¿Se administraron los medicamentos a tiempo?" name="medsGiven" options={['Sí', 'No']} val={formData.medsGiven} onChange={handleChange} />
                    {formData.medsGiven === 'No' && (
                        <div className="bg-red-50 p-4 rounded-xl border border-red-200 mt-2 animate-fade-in">
                            <label className="text-red-700 font-bold text-xs mb-2 block">⚠️ Escriba el motivo por el cual NO se dio el medicamento:</label>
                            <input type="text" name="medsReason" placeholder="Ej: El paciente lo rechazó, no había pastillas..." value={formData.medsReason} onChange={handleChange} className="w-full border-2 border-red-300 rounded-lg p-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-400" />
                        </div>
                    )}
                </Section>

                {/* A5 */}
                <Section title="A5. Higiene y Cuidado" icon="🧼">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <VisualSelect label="Baño realizado" name="hygiene" val={formData.hygiene} onChange={handleChange} />
                        <VisualSelect label="Cambio de Ropa" name="clothes" val={formData.clothes} onChange={handleChange} />
                        <VisualSelect label="Cuidado de Piel (Cremas)" name="skin" val={formData.skin} onChange={handleChange} />
                    </div>
                </Section>

                {/* A6 */}
                <Section title="A6. Movilización" icon="🦽">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <VisualSelect label="Se levantó/Movió" name="mobilization" val={formData.mobilization} onChange={handleChange} />
                        <VisualSelect label="Cambio Postura (cama)" name="position" val={formData.position} onChange={handleChange} />
                        <VisualSelect label="Usó Ayudas (Bastón, etc)" name="aids" val={formData.aids} onChange={handleChange} />
                    </div>
                </Section>

                {/* A7 - CHECKBOXES VISUALES */}
                <Section title="A7. Eventos o Alertas" icon="🚨">
                    <p className="text-sm text-gray-500 mb-4 font-medium">Toca los eventos que hayan ocurrido hoy (puedes marcar varios):</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                        {['Caída', 'Fiebre', 'Dolor', 'Dif. Respiratoria', 'Cambio Conducta', 'Ninguno'].map(opt => {
                            const isSelected = formData.alerts.includes(opt);
                            const isNinguno = opt === 'Ninguno';
                            return (
                                <label key={opt} className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 cursor-pointer transition-all text-center ${
                                    isSelected 
                                        ? (isNinguno ? 'bg-green-100 border-green-500 text-green-800 shadow-md' : 'bg-red-100 border-red-500 text-red-800 shadow-md') 
                                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                }`}>
                                    <input type="checkbox" checked={isSelected} onChange={() => handleCheckbox(opt)} className="hidden" />
                                    <span className="text-2xl mb-1">{getIcon(opt)}</span>
                                    <span className="text-xs font-bold leading-tight">{opt}</span>
                                </label>
                            );
                        })}
                    </div>
                    <textarea name="alertDesc" placeholder="Si marcaste una alerta, descríbela brevemente aquí..." value={formData.alertDesc} onChange={handleChange} className="w-full border-2 border-gray-200 rounded-xl p-3 text-sm h-20 focus:border-blue-500 outline-none"></textarea>
                </Section>

                {/* A8 */}
                <Section title="A8. Observaciones Adicionales" icon="📝">
                    <textarea name="observations" placeholder="Cualquier otro detalle importante sobre el turno..." value={formData.observations} onChange={handleChange} className="w-full border-2 border-gray-200 rounded-xl p-3 text-sm h-24 focus:border-blue-500 outline-none"></textarea>
                </Section>

        {/* --- LIENZO DE FIRMA --- */}
<div className="flex flex-col gap-2 mt-4">
    <label className="text-xs font-bold text-gray-700 uppercase">Firma del Cuidador *</label>
    
    {/* Contenedor centrado y sin deformar el lienzo */}
    <div className="border-2 border-dashed border-gray-300 rounded-xl bg-white flex justify-center overflow-hidden">
        <SignatureCanvas
            ref={sigCanvas}
            canvasProps={{ 
                width: 350, 
                height: 150, 
                className: 'cursor-crosshair touch-none' 
            }}
            penColor="black"
        />
    </div>

    <div className="flex gap-2 justify-center mt-1">
        <button type="button" onClick={handleClearSignature} className="bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs font-bold py-1.5 px-3 rounded-lg">
            Borrar Firma
        </button>
    </div>
</div>

                <button type="submit" disabled={!patient} className="w-full bg-green-600 text-white py-5 rounded-2xl font-black text-xl shadow-xl hover:bg-green-700 hover:shadow-2xl transition-all flex items-center justify-center gap-3">
                    <span>💾</span> GUARDAR BITÁCORA
                </button>
            </form>
        )}

        {/* HISTORIAL */}
        {activeTab === 'HISTORY' && (
            <div className="space-y-4">
                {logs.length === 0 && <p className="text-center text-gray-400">No hay registros aún.</p>}
                {logs.map((log) => {
                    let content = {};
                    try { content = JSON.parse(log.notes); } catch { content = { observations: log.notes }; }
                    
                    return (
                        <div key={log.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                            <div className="flex justify-between items-center mb-2">
                                <span className="font-bold text-blue-600">{new Date(log.date).toLocaleDateString()} - {log.time}</span>
                                <span className={`text-xs px-2 py-1 rounded font-bold ${log.vitalSigns === 'Alerta' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                                    {log.vitalSigns || 'Reporte'}
                                </span>
                            </div>
                            <p className="text-sm text-gray-600 line-clamp-2">
                                {content.observations || content.alertDesc || "Sin observaciones adicionales."}
                            </p>
                            <div className="mt-2 text-xs text-gray-400 flex gap-2">
                                <span>🍽️ {content.feeding || '-'}</span>
                                <span>💊 {content.medsGiven === 'Sí' ? 'Meds OK' : 'Sin Meds'}</span>
                            </div>
                        </div>
                    );
                })}
            </div>
        )}

      </main>
      {/* ================================================================= */}
      {/* VENTANA DEL PERFIL DEL PACIENTE (MODAL RESPONSIVE) */}
      {/* ================================================================= */}
      {isPatientProfileOpen && patient && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              
              <div className="bg-white w-full max-w-md max-h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-fade-in">
                  
                  {/* Encabezado */}
                  <div className="bg-gradient-to-r from-blue-700 to-blue-500 p-5 text-white flex justify-between items-start shadow-md shrink-0">
                      <div className="flex items-center gap-4">
                          <div className="bg-white/20 p-3 rounded-2xl text-4xl shadow-inner">
                              👤
                          </div>
                          <div>
                              <h3 className="font-black text-xl leading-tight">{patient.fullName || 'Paciente'}</h3>
                              <p className="text-sm text-blue-100 font-medium">{patient.age} años {patient.stratum ? `• Estrato ${patient.stratum}` : ''}</p>
                          </div>
                      </div>
                      <button 
                          onClick={() => setIsPatientProfileOpen(false)}
                          className="text-white hover:text-red-200 text-4xl font-light leading-none"
                      >
                          &times;
                      </button>
                  </div>

                  {/* Contenido (Scrollable) */}
                  <div className="flex-1 overflow-y-auto p-5 bg-slate-50 space-y-4">
                      
                      {/* Tarjeta Médica */}
                      <div className="bg-white p-4 rounded-xl shadow-sm border border-red-100 border-l-4 border-l-red-500">
                          <h4 className="text-xs font-black text-red-800 uppercase mb-3 flex items-center gap-2">
                              <span>🏥</span> Información Médica
                          </h4>
                          <div className="space-y-3">
                              <div>
                                  <span className="block text-[10px] text-gray-500 font-bold">DIAGNÓSTICO PRINCIPAL</span>
                                  <span className="text-sm font-bold text-gray-800">{patient.diagnosis || 'No registrado'}</span>
                              </div>
                              {patient.condition && (
                                  <div>
                                      <span className="block text-[10px] text-gray-500 font-bold">CONDICIÓN ACTUAL</span>
                                      <span className="text-sm text-gray-700 bg-gray-100 px-2 py-1 rounded-md inline-block mt-1">{patient.condition}</span>
                                  </div>
                              )}
                          </div>
                      </div>

                      {/* Tarjeta de Cuidados Especiales */}
                      <div className="bg-white p-4 rounded-xl shadow-sm border border-yellow-100 border-l-4 border-l-yellow-400">
                          <h4 className="text-xs font-black text-yellow-800 uppercase mb-2 flex items-center gap-2">
                              <span>⚠️</span> Instrucciones de Cuidado
                          </h4>
                          <p className="text-sm text-gray-700 whitespace-pre-line bg-yellow-50/50 p-3 rounded-lg border border-yellow-100">
                              {patient.careInstructions || 'No hay instrucciones especiales registradas.'}
                          </p>
                      </div>

                      {/* Tarjeta de Contacto / Ubicación */}
                      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                          <h4 className="text-xs font-black text-gray-600 uppercase mb-3 flex items-center gap-2">
                              <span>📍</span> Ubicación y Contacto
                          </h4>
                          <div className="space-y-3">
                              <div className="flex items-center gap-3 bg-gray-50 p-2 rounded-lg border border-gray-100">
                                  <span className="text-xl">🏠</span>
                                  <div>
                                      <span className="block text-[10px] text-gray-500 font-bold">DIRECCIÓN</span>
                                      <span className="text-sm font-bold text-gray-700">{patient.address || 'No registrada'}</span>
                                  </div>
                              </div>
                              <div className="flex items-center gap-3 bg-gray-50 p-2 rounded-lg border border-gray-100">
                                  <span className="text-xl">📞</span>
                                  <div>
                                      <span className="block text-[10px] text-gray-500 font-bold">TELÉFONO</span>
                                      <span className="text-sm font-bold text-gray-700">{patient.phone || 'No registrado'}</span>
                                  </div>
                              </div>
                          </div>
                      </div>

                  </div>
                  
                  {/* Footer del Modal */}
                  <div className="p-4 bg-white border-t border-gray-100 shrink-0">
                      <button 
                          onClick={() => setIsPatientProfileOpen(false)}
                          className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-3 rounded-xl transition-colors"
                      >
                          Cerrar Perfil
                      </button>
                  </div>

              </div>
          </div>
      )}
        {/* ================================================================= */}
      {/* BOTÓN FLOTANTE (ABRE EL ASISTENTE) */}
      {/* ================================================================= */}
      <div className="fixed bottom-6 right-6 z-40">
          <button 
              onClick={() => setIsChatOpen(true)}
              className="bg-blue-600 text-white w-16 h-16 rounded-full shadow-2xl hover:bg-blue-700 transition duration-300 transform hover:scale-110 flex items-center justify-center border-2 border-white"
          >
              <span className="text-3xl">💡</span>
          </button>
      </div>

      {/* ================================================================= */}
      {/* VENTANA DEL CHAT CENTRADA (MODAL RESPONSIVE) */}
      {/* ================================================================= */}
      {isChatOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              
              {/* Contenedor principal del chat (Cuadrado/Rectángulo) */}
              <div className="bg-white w-full max-w-md h-[80vh] max-h-[600px] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-fade-in">
                  
                  {/* Encabezado */}
                  <div className="bg-blue-700 p-4 text-white flex justify-between items-center shadow-md shrink-0">
                      <div className="flex items-center gap-3">
                          <span className="text-2xl bg-white/20 p-2 rounded-full">💡</span>
                          <div>
                              <h3 className="font-bold text-lg leading-tight">Guía de Cuidado</h3>
                              <p className="text-xs text-blue-200">Asistente Virtual 24/7</p>
                          </div>
                      </div>
                      <button 
                          onClick={() => setIsChatOpen(false)}
                          className="text-white hover:text-red-300 text-3xl font-light leading-none mb-1"
                      >
                          &times;
                      </button>
                  </div>

                  {/* Historial de Mensajes (Scroll) */}
                  <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50 flex flex-col">
                      {chatMessages.map((msg, index) => (
                          <div 
                              key={index} 
                              className={`p-3 rounded-2xl text-sm max-w-[85%] whitespace-pre-line shadow-sm ${
                                  msg.role === 'user' 
                                      ? 'bg-blue-600 text-white self-end rounded-tr-sm' 
                                      : 'bg-white text-gray-800 border border-gray-200 self-start rounded-tl-sm'
                              }`}
                          >
                              {msg.text}
                          </div>
                      ))}
                      {sendingAi && (
                          <div className="bg-white border border-gray-200 text-gray-500 p-3 rounded-2xl rounded-tl-sm text-sm self-start flex items-center gap-2 shadow-sm">
                              <span className="animate-bounce">●</span>
                              <span className="animate-bounce delay-100">●</span>
                              <span className="animate-bounce delay-200">●</span>
                          </div>
                      )}
                  </div>

                  {/* Formulario para Escribir (Teclado celular) */}
                  <form onSubmit={handleSendAiMessage} className="p-3 bg-white border-t border-gray-200 flex gap-2 shrink-0">
                      <input 
                          type="text"
                          value={inputMessage}
                          onChange={(e) => setInputMessage(e.target.value)}
                          placeholder="Escribe tu pregunta aquí..."
                          disabled={sendingAi}
                          className="flex-1 border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
                      />
                      <button 
                          type="submit"
                          disabled={sendingAi || !inputMessage.trim()}
                          className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-5 py-3 rounded-xl font-bold text-sm transition-colors shadow-sm"
                      >
                          Enviar
                      </button>
                  </form>

              </div>
          </div>
      )}
      {/* MODAL: EVALUACIÓN DE VISITADOR */}
      {isEvaluationOpen && visitorToEvaluate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-fade-in p-6">
                  <div className="flex justify-between items-start mb-4">
                      <h3 className="text-lg font-black text-gray-800 flex items-center gap-2"><MdStar className="text-amber-500 text-2xl" /> Evaluar Visita Médica</h3>
                      <button onClick={() => setIsEvaluationOpen(false)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
                  </div>

                  <div className="bg-blue-50 rounded-xl p-4 flex items-center gap-4 mb-6">
                      <div className="w-12 h-12 rounded-full bg-blue-200 text-blue-700 flex items-center justify-center text-xl"><MdPerson /></div>
                      <div>
                          <p className="font-bold text-gray-800">{visitorToEvaluate.name}</p>
                          <p className="text-xs text-gray-500">{visitorToEvaluate.specialty}</p>
                      </div>
                  </div>

                  <form onSubmit={submitEvaluation} className="space-y-5">
                      <div>
                          <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Puntuación de la atención</label>
                          <div className="flex items-center gap-2 mb-4">
                              {[1, 2, 3, 4, 5].map((star) => (
                                  <button key={star} type="button" onClick={() => setRating(star)} onMouseEnter={() => setHoverRating(star)} onMouseLeave={() => setHoverRating(0)} className="text-3xl focus:outline-none">
                                      <MdStar className={(hoverRating || rating) >= star ? 'text-amber-400' : 'text-gray-300'} />
                                  </button>
                              ))}
                          </div>
                          <textarea className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none" rows="3" placeholder="Comentarios sobre la visita (opcional)" value={evalComments} onChange={(e) => setEvalComments(e.target.value)} />
                      </div>

                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs text-gray-700 flex gap-3">
                          <MdSecurity className="text-blue-600 text-2xl shrink-0" />
                          <div>
                              <p className="font-semibold text-gray-900 mb-1">Tratamiento de Datos Personales</p>
                              <p className="text-[10px] text-gray-500 mb-2">Autorizo el tratamiento de mis datos y los del paciente para fines de auditoría y seguimiento clínico, según la ley de Habeas Data.</p>
                              <label className="flex items-center gap-2 cursor-pointer font-bold">
                                  <input type="checkbox" checked={dataPrivacyAccepted} onChange={(e) => setDataPrivacyAccepted(e.target.checked)} className="w-4 h-4 text-blue-600 rounded" />
                                  Acepto la política de datos
                              </label>
                          </div>
                      </div>

                      <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2">
                          <MdCheckCircle className="text-lg" /> Enviar Evaluación
                      </button>
                  </form>
              </div>
          </div>
      )}



    </div>
  );
}
// --- COMPONENTES UI AUXILIARES MEJORADOS (MÁS INTUITIVOS) ---

// --- DICCIONARIO DE ICONOS PROFESIONALES ---
const getIcon = (word) => {
    const icons = {
        'Mañana': <MdWbSunny className="text-yellow-500" />,
        'Tarde': <MdWbTwilight className="text-orange-500" />,
        'Noche': <MdNightsStay className="text-blue-800" />,
        'Igual': <MdSentimentNeutral className="text-gray-500" />,
        'Mejor': <MdSentimentSatisfied className="text-green-500" />,
        'Peor': <MdSentimentVeryDissatisfied className="text-red-500" />,
        'Alerta': <MdVisibility className="text-blue-500" />,
        'Somnoliento': <MdSnooze className="text-purple-500" />,
        'Desorientado': <MdPsychology className="text-orange-500" />,
        'Camina': <MdDirectionsWalk className="text-green-600" />,
        'Con ayuda': <MdAccessible className="text-blue-500" />,
        'Encamado': <MdBed className="text-gray-600" />,
        'Completa': <MdRestaurant className="text-green-600" />,
        'Parcial': <MdFastfood className="text-orange-500" />,
        'No toleró': <MdDoNotDisturb className="text-red-500" />,
        'Sí': <MdCheck className="text-green-600" />,
        'No': <MdClose className="text-red-600" />,
        'No aplica': <MdRemove className="text-gray-500" />,
        'Caída': <MdPersonalInjury className="text-red-500" />,
        'Fiebre': <MdThermostat className="text-orange-500" />,
        'Dolor': <MdCoronavirus className="text-red-600" />,
        'Dif. Respiratoria': <MdAir className="text-blue-400" />,
        'Cambio Conducta': <MdPsychology className="text-purple-500" />,
        'Ninguno': <MdCheckCircle className="text-green-500" />
    };
    return icons[word] || <MdNoteAlt className="text-gray-400" />;
};

// 2. Secciones con iconos y diseño de tarjeta
const Section = ({ title, icon, children }) => (
    <div className="bg-white p-5 rounded-2xl shadow-md border-t-4 border-blue-500 mb-6">
        <h3 className="font-bold text-blue-900 border-b-2 border-gray-100 pb-3 mb-5 text-sm uppercase tracking-wide flex items-center gap-2">
            <span className="text-2xl">{icon}</span> {title}
        </h3>
        {children}
    </div>
);

// 3. Botones gigantes tipo tarjeta en lugar de los círculos pequeños
const RadioGroup = ({ label, name, options, val, onChange }) => (
    <div className="mb-6 bg-blue-50/50 p-4 rounded-xl border border-blue-100">
        <p className="text-sm font-extrabold text-gray-700 mb-3">{label}</p>
        <div className="grid grid-cols-3 gap-2">
            {options.map(opt => (
                <label key={opt} className={`flex flex-col items-center justify-center p-3 rounded-xl text-xs font-bold cursor-pointer transition-all border-2 text-center ${
                    val === opt 
                        ? 'bg-blue-600 border-blue-600 text-white shadow-lg transform scale-105' 
                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-100'
                }`}>
                    <input type="radio" name={name} value={opt} checked={val === opt} onChange={onChange} className="hidden" />
                    <span className="text-3xl mb-1">{getIcon(opt)}</span>
                    <span className="break-words w-full leading-tight">{opt}</span>
                </label>
            ))}
        </div>
    </div>
);

// 4. Transformamos los antiguos Selects (desplegables) en botones Sí/No grandes y coloreados
const VisualSelect = ({ label, name, val, onChange }) => (
    <div className="bg-gray-50 p-3 rounded-xl text-center border border-gray-200 shadow-sm">
        <span className="block text-xs font-extrabold text-gray-700 mb-3">{label}</span>
        <div className="flex gap-2 justify-center">
            {['Sí', 'No', 'No aplica'].map(opt => (
                <label key={opt} className={`flex-1 flex flex-col items-center py-2 rounded-lg text-[10px] sm:text-xs font-bold cursor-pointer transition-all border-2 ${
                    val === opt 
                        ? (opt === 'Sí' ? 'bg-green-100 border-green-500 text-green-800 shadow-md' : 
                           opt === 'No' ? 'bg-red-100 border-red-500 text-red-800 shadow-md' : 
                           'bg-gray-200 border-gray-500 text-gray-800 shadow-md') 
                        : 'bg-white border-gray-100 text-gray-400 hover:bg-gray-50'
                }`}>
                    <input type="radio" name={name} value={opt} checked={val === opt} onChange={onChange} className="hidden" />
                    <span className="text-xl mb-1">{getIcon(opt)}</span>
                    <span>{opt}</span>
                </label>
            ))}
        </div>
    </div>
);