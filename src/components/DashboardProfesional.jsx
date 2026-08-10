
import { toast } from 'sonner';
import { 
  MdNotificationsActive, MdLocationOn, MdCheck, MdClose, 
  MdAssignment, MdFolderOpen, MdWarning, MdCalendarToday, 
  MdFolderShared, MdEditNote, MdInfoOutline, MdAddCircle, 
  MdDelete, MdDraw 
} from 'react-icons/md';
import { useState, useEffect, useRef } from 'react'; // Añadir useRef
import SignatureCanvas from 'react-signature-canvas';

export default function DashboardProfesional({ user, onLogout }) {

    // --- ESTADOS PARA FIRMA DIGITAL Y ÓRDENES MÉDICAS ---
  const sigPadRef = useRef(null);
  const [signatureData, setSignatureData] = useState('');
  const [medicalOrders, setMedicalOrders] = useState([]);
  const [newOrderType, setNewOrderType] = useState('MEDICAMENTO');
  const [newOrderDesc, setNewOrderDesc] = useState('');
   
  const [activeTab, setActiveTab] = useState('PACIENTES');
  const [patients, setPatients] = useState([]);
  const [myVisitsToday, setMyVisitsToday] = useState([]);
  const [isFullLogModalOpen, setIsFullLogModalOpen] = useState(false);
  
  // Estados para el Modal y Datos
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showVisitModal, setShowVisitModal] = useState(false);
  const [caregiverLogs, setCaregiverLogs] = useState([]); // Bitácoras del cuidador
  const [caregiverData, setCaregiverData] = useState({});
    const [isEditingCaregiver, setIsEditingCaregiver] = useState(false);

    useEffect(() => {
        if (caregiverLogs && caregiverLogs.length > 0) {
            const latestLog = caregiverLogs[0];
            let parsed = {};
            try {
                parsed = JSON.parse(latestLog.content || latestLog.notes || '{}');
            } catch {
                parsed = { observations: latestLog.content || '' };
            }
            
            setCaregiverData({
                id: latestLog.id,
                generalState: parsed.generalState || '',
                alertLevel: parsed.alertLevel || '',
                mobility: parsed.mobility || '',
                feeding: parsed.feeding || '',
                hydration: parsed.hydration || '',
                medsGiven: parsed.medsGiven || '',
                hygiene: parsed.hygiene || '',
                observations: parsed.observations || parsed.foodObs || '',
                ...parsed
            });
        }
    }, [caregiverLogs]);
  const [loadingLogs, setLoadingLogs] = useState(false);
// --- ESTADOS PARA CORRECCIONES DEL VISITADOR ---
  const [logCorrections, setLogCorrections] = useState({});
  const [savingLogId, setSavingLogId] = useState(null);

  const handleSaveLogCorrection = async (logId) => {
      setSavingLogId(logId);
      try {
          // Asumiendo que tu endpoint para actualizar la bitácora soporta PATCH o PUT
          const res = await fetch(`${import.meta.env.VITE_API_URL}/api/logs/${logId}`, {
              method: 'PATCH', 
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  doctorCorrections: logCorrections[logId],
                  reviewedByProId: user.id
              })
          });

          if (res.ok) {
              toast.success("Anotación guardada en la bitácora");
              // Actualizamos el estado local para ver el cambio de inmediato
              setCaregiverLogs(prev => prev.map(l => l.id === logId ? { ...l, doctorCorrections: logCorrections[logId] } : l));
          } else {
              toast.error("Error al guardar la anotación");
          }
      } catch (e) { 
          toast.error("Error de conexión"); 
      } finally {
          setSavingLogId(null);
      }
  };
  // --- FORMULARIO B1-B11 ---
  const initialVisitForm = {
    visitDate: new Date().toISOString().split('T')[0],
    visitTimeStart: '', visitTimeEnd: '', visitType: 'Seguimiento',
    reason: '',
    logReview: 'Sí', findings: '',
    currentIllness: '',
    bp: '', hr: '', rr: '', temp: '', sat: '', weight: '',
    physicalExam: '',
    functionalScale: 'Barthel', functionalResult: '',
    diagnosisMain: '', diagnosisRel: '',
    medication: '', recommendations: '', orders: '', interconsults: '', carePlanAdjust: '',
    educationGiven: 'Sí', educationTopic: '',
    conduct: 'Continúa manejo domiciliario',
    nextVisit: new Date(new Date().setDate(new Date().getDate() + 5)).toISOString().split('T')[0]
  };

  const [formData, setFormData] = useState(initialVisitForm);

  // 1. CARGA INICIAL
 // 1. CARGA INICIAL (CORREGIDA)
  const fetchData = async () => {
    // Validación de seguridad: Si no hay usuario o no tiene EPS, no hacemos nada
    if (!user || !user.epsId) return;

    try {
      // CAMBIO IMPORTANTE AQUÍ: 
      // Agregamos ?epsId=... para decirle al backend "Dame los pacientes de MI jefe (EPS)"
      const resP = await fetch(`${import.meta.env.VITE_API_URL}/api/patients?epsId=${user.epsId}`);
      
      if (resP.ok) {
        const dataP = await resP.json();
        setPatients(Array.isArray(dataP) ? dataP : []);
      }

      // Cargar visitas (Esto lo dejamos igual, o podrías filtrarlas también si el backend lo permite)
      const resV = await fetch(import.meta.env.VITE_API_URL + '/api/visits');
      const dataV = await resV.json();
      
      const today = new Date().toLocaleDateString(); // Ojo: asegúrate que coincida formato con backend
      
      // Filtramos las visitas que hizo ESTE profesional (user.id) HOY
      const myVisits = dataV.filter(v => 
          v.professionalId === user.id && 
          new Date(v.date).toLocaleDateString() === today
      );
      setMyVisitsToday(myVisits);

    } catch (e) { 
      console.error(e);
      toast.error("Error conectando al servidor"); 
    }
  };

  useEffect(() => { fetchData(); }, []);
  const handleAddOrder = () => {
      if (!newOrderDesc.trim()) return toast.error("Escriba la descripción de la orden.");
      setMedicalOrders(prev => [
          ...prev, 
          { id: Date.now(), type: newOrderType, description: newOrderDesc }
      ]);
      setNewOrderDesc('');
      toast.success("Orden agregada");
  };

  const handleRemoveOrder = (id) => {
      setMedicalOrders(prev => prev.filter(o => o.id !== id));
  };

  const handleClearSignature = () => {
      if (sigPadRef.current) sigPadRef.current.clear();
      setSignatureData('');
  };

  // 2. INICIAR VISITA (Carga bitácoras del cuidador)
  const handleStartVisit = async (patient) => {
      if (myVisitsToday.length >= 5) return toast.error("Límite diario alcanzado (5 visitas).");
      
      setSelectedPatient(patient);
      setFormData(initialVisitForm);
      setMedicalOrders([]);
      setSignatureData('');
      if (sigPadRef.current) sigPadRef.current.clear();
      setShowVisitModal(true);
      
      // CARGAR BITÁCORAS DEL CUIDADOR PARA ESTE PACIENTE
      setLoadingLogs(true);
      try {
          const res = await fetch(`${import.meta.env.VITE_API_URL}/api/logs?patientId=${patient.id}`);
          const logs = await res.json();
          setCaregiverLogs(Array.isArray(logs) ? logs : []);
      } catch (error) {
          console.error("Error cargando bitácoras:", error);
      } finally {
          setLoadingLogs(false);
      }
  };

// 3. GUARDAR VISITA
const handleSubmitVisit = async (e) => {
      e.preventDefault();

      // Extraer firma en Base64 del canvas
      let finalSignature = signatureData;
      // CÓDIGO CORREGIDO
if (sigPadRef.current && !sigPadRef.current.isEmpty()) {
    finalSignature = sigPadRef.current.getCanvas().toDataURL('image/png');
}

      if (!finalSignature) {
          return toast.error("Se requiere la firma digital del profesional para validar la visita.");
      }

      try {
          const res = await fetch(import.meta.env.VITE_API_URL + '/api/visits', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  professionalId: user.id,
                  patientId: selectedPatient.id,
                  formData: formData,
                  caregiverData: caregiverData,
                  signature: finalSignature, // NUEVO
                  medicalOrders: medicalOrders // NUEVO
              })
          });

          if (res.ok) {
              toast.success("Visita y órdenes registradas exitosamente");
              setShowVisitModal(false);
              setIsEditingCaregiver(false);
              setMedicalOrders([]);
              setSignatureData('');
              fetchData();
          } else {
              toast.error("Error al guardar visita");
          }
      } catch (e) { 
          toast.error("Error de conexión"); 
      }
  };

  const handleChange = (e) => {
      const { name, value } = e.target;
      setFormData(prev => ({ ...prev, [name]: value }));
  };
// --- LÓGICA DE TRIAGE Y SEMÁFORO ---
  const getTriageInfo = (patient) => {
      // Si no tiene bitácoras, es Verde por defecto
      if (!patient.logs || patient.logs.length === 0) return { color: 'green', label: 'ESTABLE', weight: 0, alertsCount: 0 };
      
      const lastLog = patient.logs[0]; // La bitácora más reciente
      let data = {};
      try { data = JSON.parse(lastLog.content); } catch (e) {}

      const temp = parseFloat(data.temperature) || 37;
      const sysBP = parseInt(data.systolicBP) || 120;
      const alerts = data.alerts || [];
      const alertsCount = alerts.length;

      // CRITERIOS ROJOS (Urgencia)
      const isRed = temp >= 39 || sysBP >= 180 || sysBP <= 90 || alerts.includes('Dif. Respiratoria') || alerts.includes('Caída') || data.alertLevel === 'Desorientado';
      
      // CRITERIOS AMARILLOS (Precaución)
      const isYellow = temp >= 37.8 || sysBP >= 140 || alerts.includes('Fiebre') || alerts.includes('Dolor') || alertsCount > 0;

      if (isRed) return { color: 'red', label: 'ATENCIÓN URGENTE', weight: 2, alertsCount, bg: 'bg-red-50', border: 'border-red-500', text: 'text-red-700' };
      if (isYellow) return { color: 'yellow', label: 'PRECAUCIÓN', weight: 1, alertsCount, bg: 'bg-yellow-50', border: 'border-yellow-400', text: 'text-yellow-700' };
      
      return { color: 'green', label: 'ESTABLE', weight: 0, alertsCount: 0, bg: 'bg-white', border: 'border-gray-200', text: 'text-emerald-900' };
  };

  // Ordenar pacientes: Los Rojos (weight 2) primero, luego Amarillos (1), luego Verdes (0)
  const sortedPatients = [...patients].sort((a, b) => {
      return getTriageInfo(b).weight - getTriageInfo(a).weight;
  });
  // --- RENDERIZADO ---
  return (
    
    <div className="min-h-screen bg-gray-50 font-sans pb-20">
      <header className="bg-emerald-700 text-white shadow-lg sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold tracking-wide">PANEL VISITADOR MÉDICO</h1>
            <p className="text-xs text-emerald-200">{user.fullName} | Hoy: {myVisitsToday.length}/5</p>
          </div>
          <button onClick={onLogout} className="text-sm bg-red-600/80 hover:bg-red-600 px-4 py-2 rounded font-bold transition">Salir</button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6">
        <h2 className="text-2xl font-bold text-gray-700 mb-4">Pacientes Asignados</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedPatients.map(p => {
                const visitedToday = myVisitsToday.some(v => v.patientId === p.id);
                const triage = getTriageInfo(p); // Obtenemos colores y alertas

                return (
                    <div key={p.id} className={`${triage.bg} p-5 rounded-xl shadow-md border-l-4 ${triage.border} ${visitedToday ? 'opacity-60' : 'relative'} transition-all`}>
                        
                        <MdNotificationsActive className="text-sm mr-0.5"/> {triage.alertsCount}

                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className={`font-black text-lg ${triage.text}`}>{p.fullName}</h3>
                                <p className="text-xs text-gray-600 font-medium">{p.diagnosis}</p>
                            </div>
                            <span className={`text-[10px] px-2 py-1 rounded shadow-sm font-black tracking-wider ${triage.color === 'red' ? 'bg-red-600 text-white' : triage.color === 'yellow' ? 'bg-yellow-400 text-yellow-900' : 'bg-green-100 text-green-800'}`}>
                                {triage.label}
                            </span>
                        </div>
                        
                        {/* Enlace a Google Maps */}
                        <a 
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.address + ', Colombia')}`} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-xs text-blue-600 hover:text-blue-800 hover:underline mt-3 inline-block font-bold flex items-center gap-1"
                        >
                            <MdLocationOn className="text-sm"/> {p.address} (Ver mapa)
                            
                        </a>
                {visitedToday ? (
                        <button 
        disabled 
        className="mt-4 w-full bg-gray-200 text-gray-500 py-2 rounded-lg font-bold cursor-not-allowed flex items-center justify-center gap-1.5"
    >
        <MdCheck className="text-lg" /> Visitado Hoy
    </button>
) : (
                            <button 
                                onClick={() => handleStartVisit(p)}
                                disabled={myVisitsToday.length >= 5}
                                className={`mt-4 w-full py-2 rounded-lg font-bold text-white transition shadow hover:shadow-lg ${myVisitsToday.length >= 5 ? 'bg-gray-300' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                            >
                                Iniciar Visita
                            </button>
                        )}
                    </div>
                );
            })}
        </div>
      </main>

      {/* --- MODAL FORMULARIO VISITA --- */}
{showVisitModal && selectedPatient && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fadeIn">
        <div className="bg-white rounded-xl w-full max-w-5xl h-[95vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="bg-emerald-800 text-white p-4 flex justify-between items-center">
                <div>
                  <h2 className="font-bold text-lg">Visita Domiciliaria</h2>
                  <p className="text-xs text-emerald-200">Paciente: {selectedPatient.fullName} | Edad: {selectedPatient.age}</p>
                </div>
                <button 
                  type="button" 
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowVisitModal(false);
                  }} 
                  className="text-white hover:text-red-300 text-2xl font-bold p-1 rounded-lg hover:bg-emerald-700/60 transition cursor-pointer flex items-center justify-center"
                  aria-label="Cerrar modal"
                >
                  <MdClose />
                </button>
            </div>
                  
                  <div className="flex flex-1 overflow-hidden">
                      
                    {/* COLUMNA IZQUIERDA: RESUMEN Y BOTÓN DE EXPEDIENTE */}
<div className="w-1/3 bg-gray-50 p-4 border-r border-gray-200 flex flex-col">
<MdAssignment className="text-lg text-emerald-600"/> Resumen del Cuidador
    
    {/* Botón principal para abrir el expediente completo */}
    <button 
        onClick={() => setIsFullLogModalOpen(true)}
        disabled={caregiverLogs.length === 0}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 mb-4 disabled:bg-gray-400"
    >
       <MdFolderOpen className="text-xl"/> Abrir Expediente y Bitácora
    </button>

    {loadingLogs ? (
        <p className="text-center text-gray-400 mt-4 text-sm">Cargando...</p>
    ) : caregiverLogs.length === 0 ? (
        <div className="bg-yellow-50 p-4 rounded text-center text-yellow-700 text-sm border border-yellow-200">
            <MdWarning className="text-lg"/> No hay reportes del cuidador registrados.
        </div>
    ) : (
        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2">
            <p className="text-xs text-gray-500 font-bold mb-2">ÚLTIMOS REPORTES RÁPIDOS:</p>
            {caregiverLogs.slice(0, 3).map((log, idx) => {
                let d = {}; 
                try { d = JSON.parse(log.content || log.notes); } catch { d = {}; }
                return (
                    <div key={idx} className="bg-white p-3 rounded-lg shadow-sm border border-gray-200 text-xs">
                        <div className="flex justify-between font-bold text-gray-700 mb-1">
                            <span><MdCalendarToday/> {new Date(log.date).toLocaleDateString()}</span>
                            <span className={d.alertLevel === 'Alerta' ? 'text-red-600' : 'text-green-600'}>
                                {d.alertLevel || 'Estable'}
                            </span>
                        </div>
                        <p className="text-gray-500 truncate">{d.observations || "Sin observaciones."}</p>
                    </div>
                )
            })}
        </div>
    )}
</div>              

                      {/* COLUMNA DERECHA: FORMULARIO DEL MÉDICO */}
<form onSubmit={handleSubmitVisit} className="w-2/3 p-6 overflow-y-auto bg-white space-y-6">

    {/* --- INICIO SECCIÓN A0: BITÁCORA DEL CUIDADOR PRELLENADA Y EDITABLE --- */}
    <div className="bg-slate-50 border border-blue-200 rounded-xl p-4 shadow-sm">
        <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-200">
            <div className="flex items-center gap-2">
                <span className="bg-blue-600 text-white text-[11px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                    A0. Reporte del Cuidador
                </span>
                <span className="text-xs text-gray-500 font-medium">
                    (Cargado automáticamente)
                </span>
            </div>

            {/* BOTÓN CON LÁPIZ PARA HABILITAR EDICIÓN */}
            <button
                type="button"
                onClick={() => setIsEditingCaregiver(!isEditingCaregiver)}
                className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border transition ${
                    isEditingCaregiver 
                        ? 'bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200' 
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100 shadow-sm'
                }`}
            >
                <MdEditNote className="text-lg text-blue-600" />
                {isEditingCaregiver ? 'Bloquear Edición' : 'Editar Datos del Cuidador'}
            </button>
        </div>

        {/* CAMPOS DE LA BITÁCORA PRELLENADOS (COMPLETOS) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs mt-4">
            
            {/* 1. Estado General */}
            <div>
                <label className="block font-bold text-gray-600 mb-1">Estado General</label>
                <input
                    type="text"
                    disabled={!isEditingCaregiver}
                    className={`w-full p-2 border rounded-md transition ${isEditingCaregiver ? 'bg-white border-amber-400 focus:ring-2 focus:ring-amber-200 outline-none' : 'bg-gray-100/80 border-gray-200 text-gray-700'}`}
                    value={caregiverData.generalState || ''}
                    onChange={(e) => setCaregiverData({...caregiverData, generalState: e.target.value})}
                />
            </div>

            {/* 2. Nivel de Alerta */}
            <div>
                <label className="block font-bold text-gray-600 mb-1">Nivel de Alerta</label>
                <input
                    type="text"
                    disabled={!isEditingCaregiver}
                    className={`w-full p-2 border rounded-md transition ${isEditingCaregiver ? 'bg-white border-amber-400 focus:ring-2 focus:ring-amber-200 outline-none' : 'bg-gray-100/80 border-gray-200 text-gray-700'}`}
                    value={caregiverData.alertLevel || ''}
                    onChange={(e) => setCaregiverData({...caregiverData, alertLevel: e.target.value})}
                />
            </div>

            {/* 3. Movilidad */}
            <div>
                <label className="block font-bold text-gray-600 mb-1">Movilidad</label>
                <input
                    type="text"
                    disabled={!isEditingCaregiver}
                    className={`w-full p-2 border rounded-md transition ${isEditingCaregiver ? 'bg-white border-amber-400 focus:ring-2 focus:ring-amber-200 outline-none' : 'bg-gray-100/80 border-gray-200 text-gray-700'}`}
                    value={caregiverData.mobility || ''}
                    onChange={(e) => setCaregiverData({...caregiverData, mobility: e.target.value})}
                />
            </div>

            {/* 4. Alimentación */}
            <div>
                <label className="block font-bold text-gray-600 mb-1">Alimentación</label>
                <input
                    type="text"
                    disabled={!isEditingCaregiver}
                    className={`w-full p-2 border rounded-md transition ${isEditingCaregiver ? 'bg-white border-amber-400 focus:ring-2 focus:ring-amber-200 outline-none' : 'bg-gray-100/80 border-gray-200 text-gray-700'}`}
                    value={caregiverData.feeding || ''}
                    onChange={(e) => setCaregiverData({...caregiverData, feeding: e.target.value})}
                />
            </div>

            {/* 5. Hidratación */}
            <div>
                <label className="block font-bold text-gray-600 mb-1">Hidratación</label>
                <input
                    type="text"
                    disabled={!isEditingCaregiver}
                    className={`w-full p-2 border rounded-md transition ${isEditingCaregiver ? 'bg-white border-amber-400 focus:ring-2 focus:ring-amber-200 outline-none' : 'bg-gray-100/80 border-gray-200 text-gray-700'}`}
                    value={caregiverData.hydration || ''}
                    onChange={(e) => setCaregiverData({...caregiverData, hydration: e.target.value})}
                />
            </div>

            {/* 6. Medicación */}
            <div>
                <label className="block font-bold text-gray-600 mb-1">Medicación Dada</label>
                <input
                    type="text"
                    disabled={!isEditingCaregiver}
                    className={`w-full p-2 border rounded-md transition ${isEditingCaregiver ? 'bg-white border-amber-400 focus:ring-2 focus:ring-amber-200 outline-none' : 'bg-gray-100/80 border-gray-200 text-gray-700'}`}
                    value={caregiverData.medsGiven || ''}
                    onChange={(e) => setCaregiverData({...caregiverData, medsGiven: e.target.value})}
                />
            </div>

            {/* 7. Higiene / Baño */}
            <div>
                <label className="block font-bold text-gray-600 mb-1">Higiene / Baño</label>
                <input
                    type="text"
                    disabled={!isEditingCaregiver}
                    className={`w-full p-2 border rounded-md transition ${isEditingCaregiver ? 'bg-white border-amber-400 focus:ring-2 focus:ring-amber-200 outline-none' : 'bg-gray-100/80 border-gray-200 text-gray-700'}`}
                    value={caregiverData.hygiene || ''}
                    onChange={(e) => setCaregiverData({...caregiverData, hygiene: e.target.value})}
                />
            </div>

            {/* 8. Cuidado de Piel */}
            <div>
                <label className="block font-bold text-gray-600 mb-1">Cuidado de Piel</label>
                <input
                    type="text"
                    disabled={!isEditingCaregiver}
                    className={`w-full p-2 border rounded-md transition ${isEditingCaregiver ? 'bg-white border-amber-400 focus:ring-2 focus:ring-amber-200 outline-none' : 'bg-gray-100/80 border-gray-200 text-gray-700'}`}
                    value={caregiverData.skin || ''}
                    onChange={(e) => setCaregiverData({...caregiverData, skin: e.target.value})}
                />
            </div>

            {/* 9. Cambios de Postura */}
            <div>
                <label className="block font-bold text-gray-600 mb-1">Cambios de Postura</label>
                <input
                    type="text"
                    disabled={!isEditingCaregiver}
                    className={`w-full p-2 border rounded-md transition ${isEditingCaregiver ? 'bg-white border-amber-400 focus:ring-2 focus:ring-amber-200 outline-none' : 'bg-gray-100/80 border-gray-200 text-gray-700'}`}
                    value={caregiverData.position || ''}
                    onChange={(e) => setCaregiverData({...caregiverData, position: e.target.value})}
                />
            </div>

            {/* 10. Alertas y Observaciones (Ocupa todo el ancho) */}
            <div className="sm:col-span-2 md:col-span-3">
                <label className="block font-bold text-gray-600 mb-1">Observaciones y Descripción de Alertas</label>
                <textarea
                    rows="3"
                    disabled={!isEditingCaregiver}
                    className={`w-full p-2 border rounded-md transition ${isEditingCaregiver ? 'bg-white border-amber-400 focus:ring-2 focus:ring-amber-200 outline-none' : 'bg-gray-100/80 border-gray-200 text-gray-700'}`}
                    value={caregiverData.observations || ''}
                    onChange={(e) => setCaregiverData({...caregiverData, observations: e.target.value})}
                />
            </div>
        </div>
    </div>
    {/* --- FIN SECCIÓN A0 --- */}
                          
                          <Section title="B1. Datos Generales">
                              <div className="grid grid-cols-3 gap-3">
                                  <Input label="Fecha" type="date" name="visitDate" val={formData.visitDate} onChange={handleChange} />
                                  <Input label="Inicio" type="time" name="visitTimeStart" val={formData.visitTimeStart} onChange={handleChange} />
                                  <Input label="Fin" type="time" name="visitTimeEnd" val={formData.visitTimeEnd} onChange={handleChange} />
                              </div>
                              <Select label="Tipo Visita" name="visitType" val={formData.visitType} onChange={handleChange} opts={['Seguimiento', 'Interconsulta', 'Urgente']} />
                          </Section>

                          <Section title="B2. Motivo de Visita">
                              <textarea name="reason" value={formData.reason} onChange={handleChange} className="w-full border rounded p-2 text-sm" rows="2" placeholder="Describe el motivo..."></textarea>
                          </Section>

                          <Section title="B3. Análisis Bitácora Cuidador">
                              <div className="bg-yellow-50 p-3 rounded border border-yellow-100 mb-2 text-xs text-yellow-800">
                                  <MdInfoOutline className="text-lg"/> Revisa los reportes en el panel izquierdo para responder.
                              </div>
                              <Select label="¿Se revisó la bitácora?" name="logReview" val={formData.logReview} onChange={handleChange} opts={['Sí', 'No']} />
                              <textarea name="findings" value={formData.findings} onChange={handleChange} className="w-full border rounded p-2 text-sm mt-2" rows="2" placeholder="Hallazgos relevantes de la bitácora..."></textarea>
                          </Section>

                          <Section title="B4. Enfermedad Actual">
                              <textarea name="currentIllness" value={formData.currentIllness} onChange={handleChange} className="w-full border rounded p-2 text-sm" rows="3"></textarea>
                          </Section>

                          <Section title="B5. Signos Vitales (Domicilio)">
                              <div className="grid grid-cols-3 gap-3">
                                  <Input label="PA" name="bp" val={formData.bp} onChange={handleChange} ph="120/80" />
                                  <Input label="FC" name="hr" val={formData.hr} onChange={handleChange} ph="lpm" />
                                  <Input label="FR" name="rr" val={formData.rr} onChange={handleChange} ph="rpm" />
                                  <Input label="Temp" name="temp" val={formData.temp} onChange={handleChange} ph="°C" />
                                  <Input label="SatO2" name="sat" val={formData.sat} onChange={handleChange} ph="%" />
                                  <Input label="Peso" name="weight" val={formData.weight} onChange={handleChange} ph="kg" />
                              </div>
                          </Section>

                          <Section title="B6. Examen Físico">
                              <textarea name="physicalExam" value={formData.physicalExam} onChange={handleChange} className="w-full border rounded p-2 text-sm" rows="3"></textarea>
                          </Section>

                          <Section title="B7. Evaluación Funcional">
                              <div className="flex gap-4">
                                  <div className="w-1/2"><Select label="Escala" name="functionalScale" val={formData.functionalScale} onChange={handleChange} opts={['Barthel', 'Glasgow', 'Norton', 'Otra']} /></div>
                                  <div className="w-1/2"><Input label="Puntaje" name="functionalResult" val={formData.functionalResult} onChange={handleChange} /></div>
                              </div>
                          </Section>

                          <Section title="B8. Diagnóstico">
                              <Input label="Principal (CIE-10)" name="diagnosisMain" val={formData.diagnosisMain} onChange={handleChange} />
                              <Input label="Relacionados" name="diagnosisRel" val={formData.diagnosisRel} onChange={handleChange} />
                          </Section>

                          <Section title="B9. Plan de Manejo">
                              <div className="space-y-2">
                                  <Input label="Medicación" name="medication" val={formData.medication} onChange={handleChange} ph="Dosis, frecuencia..." />
                                  <Input label="Recomendaciones" name="recommendations" val={formData.recommendations} onChange={handleChange} />
                                  <Input label="Órdenes" name="orders" val={formData.orders} onChange={handleChange} />
                                  <Input label="Interconsultas" name="interconsults" val={formData.interconsults} onChange={handleChange} />
                              </div>
                          </Section>

                          <Section title="B10. Educación al Cuidador">
                              <Select label="¿Se brindó educación?" name="educationGiven" val={formData.educationGiven} onChange={handleChange} opts={['Sí', 'No']} />
                              <Input label="Tema tratado" name="educationTopic" val={formData.educationTopic} onChange={handleChange} />
                          </Section>

                          <Section title="B11. Conducta">
                              <Select label="Decisión" name="conduct" val={formData.conduct} onChange={handleChange} opts={['Continúa manejo domiciliario', 'Ajuste de plan', 'Remisión', 'Alta del programa']} />
                              <div className="mt-2 bg-emerald-50 p-2 rounded border border-emerald-100">
                                  <label className="block text-xs font-bold text-emerald-800">Próxima Visita Sugerida</label>
                                  <input type="date" name="nextVisit" value={formData.nextVisit} onChange={handleChange} className="w-full bg-white border border-emerald-300 rounded p-1 text-sm font-bold" />
                              </div>
                          </Section>
                          {/* --- NUEVO B12: GENERACIÓN DE ÓRDENES MÉDICAS --- */}
                          <Section title="B12. Órdenes Médicas Especiales">
                              <div className="bg-slate-50 p-4 rounded-xl border border-blue-200 space-y-3">
                                  <div className="flex flex-col sm:flex-row gap-3">
                                      <div className="sm:w-1/3">
                                          <label className="block text-xs font-bold text-gray-700 mb-1">Tipo de Orden</label>
                                          <select 
                                              value={newOrderType} 
                                              onChange={(e) => setNewOrderType(e.target.value)}
                                              className="w-full border rounded p-2 text-xs bg-white focus:outline-none focus:border-blue-500 font-medium"
                                          >
                                              <option value="MEDICAMENTO">Ajuste de Medicamento</option>
                                              <option value="ESPECIALISTA">Remisión a Especialista</option>
                                              <option value="EXAMEN">Examen de Laboratorio / Imagen</option>
                                              <option value="OTRO">Otra Indicación</option>
                                          </select>
                                      </div>
                                      <div className="sm:w-2/3">
                                          <label className="block text-xs font-bold text-gray-700 mb-1">Indicaciones / Descripción</label>
                                          <textarea 
                                              rows="2"
                                              value={newOrderDesc}
                                              onChange={(e) => setNewOrderDesc(e.target.value)}
                                              placeholder="Ej: Suspender Enalapril e iniciar Losartán 50mg / Cita con Cardiología..."
                                              className="w-full border rounded p-2 text-xs bg-white focus:outline-none focus:border-blue-500"
                                          />
                                      </div>
                                  </div>
                                  <div className="flex justify-end">
                                      <button 
                                          type="button"
                                          onClick={handleAddOrder}
                                          className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-4 py-2 rounded font-bold shadow flex items-center gap-1 transition"
                                      >
                                          <MdAddCircle className="text-base" /> Agregar Orden
                                      </button>
                                  </div>

                                  {/* LISTA DE ÓRDENES CREADAS */}
                                  {medicalOrders.length > 0 && (
                                      <div className="mt-3 space-y-2 border-t border-gray-200 pt-3">
                                          <p className="text-xs font-bold text-gray-600 uppercase">Órdenes a emitir ({medicalOrders.length}):</p>
                                          {medicalOrders.map((ord) => (
                                              <div key={ord.id} className="bg-white p-3 rounded-lg border border-blue-200 flex justify-between items-start shadow-sm">
                                                  <div>
                                                      <span className="bg-blue-100 text-blue-800 text-[10px] font-black px-2 py-0.5 rounded uppercase">
                                                          {ord.type}
                                                      </span>
                                                      <p className="text-xs text-gray-800 mt-1 font-medium">{ord.description}</p>
                                                  </div>
                                                  <button 
                                                      type="button" 
                                                      onClick={() => handleRemoveOrder(ord.id)}
                                                      className="text-red-500 hover:text-red-700 p-1"
                                                      title="Eliminar orden"
                                                  >
                                                      <MdDelete className="text-lg" />
                                                  </button>
                                              </div>
                                          ))}
                                      </div>
                                  )}
                              </div>
                          </Section>

                          {/* --- NUEVO B13: FIRMA DIGITAL --- */}
                          <Section title="B13. Firma Digital del Profesional">
                              <div className="bg-slate-50 p-4 rounded-xl border border-emerald-200 space-y-2">
                                  <p className="text-xs text-gray-600 font-medium flex items-center gap-1">
                                      <MdDraw className="text-emerald-600 text-base"/> Trace su firma en el recuadro para validar legalmente la visita y las órdenes.
                                  </p>
                                  
                                  <div className="border-2 border-dashed border-emerald-300 rounded-lg bg-white overflow-hidden shadow-inner">
                                      <SignatureCanvas 
                                          ref={sigPadRef}
                                          penColor="#065f46"
                                          canvasProps={{ 
                                              className: "w-full h-32 cursor-crosshair" 
                                          }}
                                      />
                                  </div>

                                  <div className="flex justify-between items-center pt-1">
                                      <span className="text-[11px] text-gray-500 font-bold">
                                          {user.fullName} — Profesional Médico
                                      </span>
                                      <button 
                                          type="button"
                                          onClick={handleClearSignature}
                                          className="text-xs bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-1.5 rounded font-bold transition"
                                      >
                                          Limpiar Firma
                                      </button>
                                  </div>
                              </div>
                          </Section>

                          <div className="pt-4 border-t flex justify-end gap-3 pb-10">
                              <button type="button" onClick={() => setShowVisitModal(false)} className="px-6 py-2 bg-gray-200 text-gray-700 font-bold rounded">Cancelar</button>
                              <button type="submit" className="px-6 py-2 bg-emerald-600 text-white font-bold rounded shadow hover:bg-emerald-700">Guardar Visita</button>
                          </div>
                      </form>
                  </div>
              </div>
          </div>
      )}
      {/* ================================================================= */}
      {/* MODAL GIGANTE: EXPEDIENTE DEL PACIENTE Y BITÁCORAS COMPLETAS */}
      {/* ================================================================= */}
      {isFullLogModalOpen && selectedPatient && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
              
              <div className="bg-gray-100 w-full max-w-6xl h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-fade-in">
                  
                  {/* ENCABEZADO DEL MODAL */}
                  <div className="bg-blue-800 p-4 text-white flex justify-between items-center shadow-md shrink-0">
                      <div className="flex items-center gap-3">
                          <span className="text-3xl"><MdFolderShared className="text-3xl text-blue-200"/>   </span>
                          <div>
                              <h2 className="font-black text-xl leading-tight">Expediente Médico y Bitácora de Cuidado</h2>
                              <p className="text-blue-200 text-sm">Paciente: {selectedPatient.fullName}</p>
                          </div>
                      </div>
                      <button onClick={() => setIsFullLogModalOpen(false)} className="text-white hover:text-red-300 text-4xl font-light leading-none">
                          &times;
                      </button>
                  </div>

                  {/* CUERPO DEL MODAL DIVIDIDO EN 2 COLUMNAS */}
                  <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                      
                      {/* LADO IZQUIERDO: INFORMACIÓN COMPLETA DEL PACIENTE */}
                      <div className="w-full md:w-1/3 bg-white border-r border-gray-200 p-5 overflow-y-auto shrink-0 shadow-inner">
                          <h3 className="font-bold text-gray-800 uppercase border-b-2 border-blue-500 pb-2 mb-4">Información del Paciente</h3>
                          
                          <div className="space-y-4">
                              <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                                  <span className="text-[10px] text-blue-600 font-black uppercase">Datos Personales</span>
                                  <p className="font-bold text-gray-800 mt-1">{selectedPatient.fullName}</p>
                                  <p className="text-sm text-gray-600">Edad: {selectedPatient.age} años {selectedPatient.stratum && `| Estrato: ${selectedPatient.stratum}`}</p>
                              </div>

                              <div className="bg-red-50 p-3 rounded-lg border border-red-100">
                                  <span className="text-[10px] text-red-600 font-black uppercase">Diagnóstico Médico</span>
                                  <p className="font-bold text-red-900 mt-1">{selectedPatient.diagnosis || 'No especificado'}</p>
                                  {selectedPatient.condition && <p className="text-sm text-red-700 mt-1">Condición: {selectedPatient.condition}</p>}
                              </div>

                              <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                                  <span className="text-[10px] text-gray-500 font-black uppercase">Contacto y Ubicación</span>
                                  <p><MdLocationOn className="text-gray-400"/> {selectedPatient.address|| 'Sin dirección'}</p>
                                  <p className="text-sm text-gray-800 mt-1">📞 {selectedPatient.phone || 'Sin teléfono'}</p>
                              </div>

                              <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                                  <span className="text-[10px] text-yellow-700 font-black uppercase">Instrucciones Especiales (Cuidador)</span>
                                  <p className="text-sm text-gray-800 mt-1 whitespace-pre-line font-medium italic">
                                      "{selectedPatient.careInstructions || 'Ninguna instrucción registrada.'}"
                                  </p>
                              </div>
                          </div>
                      </div>

                      {/* LADO DERECHO: BITÁCORA COMPLETA DEL CUIDADOR */}
                      <div className="w-full md:w-2/3 p-5 overflow-y-auto bg-slate-50 space-y-6 custom-scrollbar">
                          <h3 className="font-bold text-gray-800 uppercase mb-2">Historial Detallado del Cuidador</h3>
                          
                          {caregiverLogs.length === 0 ? (
                              <p className="text-gray-500 text-center mt-10">No hay registros para mostrar.</p>
                          ) : (
                              caregiverLogs.map((log, idx) => {
                                  let d = {};
                                  try { d = JSON.parse(log.content || log.notes || '{}'); } catch { d = { observations: log.content }; }

                                  return (
                                      <div key={idx} className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
                                          {/* Cabecera del reporte */}
                                          <div className="bg-slate-100 border-b border-gray-200 p-3 flex justify-between items-center">
                                              <span ><MdCalendarToday/> Reporte del {new Date(log.date).toLocaleDateString()}</span>
                                              <span ><MdEditNote className="text-lg text-gray-400"/> Firma:{d.signature || 'No firmada'}</span>
                                          </div>

                                          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-6">
                                              
                                              {/* A2. Estado General */}
                                              <div>
                                                  <h4 className="text-[11px] font-black text-gray-400 uppercase mb-2">A2. Estado General</h4>
                                                  <ul className="text-sm space-y-1 text-gray-700">
                                                      <li><strong>Evolución:</strong> {d.generalState || '-'}</li>
                                                      <li><strong>Nivel de Alerta:</strong> <span className={d.alertLevel==='Alerta' ? 'text-red-500 font-bold' : ''}>{d.alertLevel || '-'}</span></li>
                                                      <li><strong>Movilidad:</strong> {d.mobility || '-'}</li>
                                                  </ul>
                                              </div>

                                              {/* A3 & A4. Alimentación y Medicinas */}
                                              <div>
                                                  <h4 className="text-[11px] font-black text-gray-400 uppercase mb-2">A3/A4. Ingesta y Medicinas</h4>
                                                  <ul className="text-sm space-y-1 text-gray-700">
                                                      <li><strong>Alimentación:</strong> {d.feeding || '-'}</li>
                                                      <li><strong>Hidratación:</strong> {d.hydration || '-'}</li>
                                                      <li><strong>Medicación dada:</strong> {d.medsGiven === 'No' ? <span className="text-red-500 font-bold">No ({d.medsReason})</span> : (d.medsGiven || '-')}</li>
                                                  </ul>
                                              </div>

                                              {/* A5 & A6. Higiene y Movilización */}
                                              <div>
                                                  <h4 className="text-[11px] font-black text-gray-400 uppercase mb-2">A5/A6. Cuidado Físico</h4>
                                                  <ul className="text-sm space-y-1 text-gray-700">
                                                      <li><strong>Higiene/Baño:</strong> {d.hygiene || '-'}</li>
                                                      <li><strong>Cuidado de piel:</strong> {d.skin || '-'}</li>
                                                      <li><strong>Cambios de postura:</strong> {d.position || '-'}</li>
                                                  </ul>
                                              </div>

                                              {/* A7. Alertas Reportadas */}
                                              <div>
                                                  <h4 className="text-[11px] font-black text-red-400 uppercase mb-2">A7. Alertas de Turno</h4>
                                                  {d.alerts && d.alerts.length > 0 && !d.alerts.includes('Ninguno') ? (
                                                      <div className="bg-red-50 border-l-2 border-red-500 p-2 text-sm text-red-700 font-bold">
                                                          {Array.isArray(d.alerts) ? d.alerts.join(' • ') : d.alerts}
                                                      </div>
                                                  ) : (
                                                      <span className="text-sm text-green-600 font-bold">Ninguna alerta reportada.</span>
                                                  )}
                                              </div>
                                          </div>

                                          {/* A8. Observaciones Libres */}
                                          <div className="bg-blue-50/50 p-4 border-t border-blue-100">
                                              <h4 className="text-[11px] font-black text-blue-500 uppercase mb-1">A8. Observaciones y Descripción</h4>
                                              <p className="text-sm text-gray-700 italic">
                                                  {d.alertDesc ? <strong>Sobre alerta:</strong> : ''} {d.alertDesc} 
                                              </p>
                                              <p className="text-sm text-gray-700 italic mt-1">
                                                  "{d.observations || d.foodObs || 'No hay observaciones adicionales.'}"
                                              </p>
                                              {/* A8. Observaciones Libres */}
                                            <div className="bg-blue-50/50 p-4 border-t border-blue-100">
                                                <h4 className="text-[11px] font-black text-blue-500 uppercase mb-1">A8. Observaciones y Descripción</h4>
                                                <p className="text-sm text-gray-700 italic">
                                                    {d.alertDesc ? <strong>Sobre alerta:</strong> : ''} {d.alertDesc} 
                                                </p>
                                                <p className="text-sm text-gray-700 italic mt-1">
                                                    "{d.observations || d.foodObs || 'No hay observaciones adicionales.'}"
                                                </p>
                                            </div>

                                            {/* --- SECCIÓN EXCLUSIVA VISITADOR MÉDICO --- */}
                                            <div className="bg-emerald-50 p-4 border-t border-emerald-200">
                                                <label className="text-[11px] font-black text-emerald-800 uppercase mb-2 flex items-center gap-1">
                                                    <MdEditNote className="text-lg" /> Correcciones y Anotaciones del Visitador Médico
                                                </label>
                                                <textarea 
                                                    className="w-full border border-emerald-200 rounded p-2 text-sm bg-white focus:outline-none focus:border-emerald-500"
                                                    rows="2"
                                                    placeholder="Escriba aquí sus correcciones o validaciones clínicas sobre el reporte del cuidador..."
                                                    value={logCorrections[log.id] !== undefined ? logCorrections[log.id] : (log.doctorCorrections || '')}
                                                    onChange={(e) => setLogCorrections({...logCorrections, [log.id]: e.target.value})}
                                                />
                                                <div className="mt-2 flex justify-end">
                                                    <button 
                                                        onClick={() => handleSaveLogCorrection(log.id)}
                                                        disabled={savingLogId === log.id}
                                                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-4 py-1.5 rounded font-bold shadow transition disabled:opacity-50"
                                                    >
                                                        {savingLogId === log.id ? 'Guardando...' : 'Guardar Anotación'}
                                                    </button>
                                                </div>
                                            </div>
                                            {/* FIN DE SECCIÓN EXCLUSIVA VISITADOR MÉDICO */}
                                          </div>
                                          {/* --- MOSTRAR FIRMA DEL CUIDADOR --- */}
{log.caregiverSignature ? (
    <div className="mt-4 pt-3 border-t border-gray-100 flex flex-col items-end">
        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">
            Firmado electrónicamente por el cuidador
        </span>
        <img 
            src={log.caregiverSignature} 
            alt="Firma del cuidador" 
            className="h-12 object-contain mix-blend-multiply opacity-80"
        />
        <span className="text-xs font-bold text-gray-700 mt-1">
            {log.caregiverName || 'Cuidador Asignado'}
        </span>
    </div>
) : (
    <div className="mt-4 pt-3 border-t border-gray-100">
        <span className="text-[10px] text-gray-400 font-bold uppercase">Sin firma registrada</span>
    </div>
)}

                                      </div>
                                  )
                              })
                          )}
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
    
  );
}

// UI Components
const Section = ({title, children}) => (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <h3 className="font-bold text-emerald-800 border-b pb-2 mb-3 uppercase text-xs tracking-wider">{title}</h3>
        {children}
    </div>
);
const Input = ({label, type="text", name, val, onChange, ph}) => (
    <div className="mb-2 w-full">
        <label className="block text-xs font-bold text-gray-500 mb-1">{label}</label>
        <input type={type} name={name} value={val} onChange={onChange} placeholder={ph} className="w-full border border-gray-300 rounded p-2 text-sm focus:border-emerald-500 outline-none" />
    </div>
);
const Select = ({label, name, val, onChange, opts}) => (
    <div className="mb-2 w-full">
        <label className="block text-xs font-bold text-gray-500 mb-1">{label}</label>
        <select name={name} value={val} onChange={onChange} className="w-full border border-gray-300 rounded p-2 text-sm bg-white focus:border-emerald-500 outline-none">
            {opts.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
    </div>
);