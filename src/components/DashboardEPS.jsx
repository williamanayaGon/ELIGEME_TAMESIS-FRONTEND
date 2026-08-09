import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell 
} from 'recharts';

// --- IMPORTACIONES DE ICONOS ---
import { MdStar } from 'react-icons/md';
import { 
  MdPerson, MdSchool, MdLocalHospital, MdFolderOpen, MdBadge, 
  MdAssignment, MdGavel, MdCheckCircle, MdWarning, MdEmojiEvents,
  MdBarChart, MdMail, MdHealthAndSafety, MdAttachMoney, MdSearch, 
  MdRefresh, MdElderly, MdRemoveRedEye, MdCalendarToday, MdMedication, 
  MdShower, MdRestaurant, MdEditNote, MdPrint, MdClose, MdMedicalServices 
} from 'react-icons/md';
// --- CONSTANTES GLOBALES ---
const EXPENSE_CATEGORIES = [
    "CUIDADORES",
    "VISITADORES MÉDICOS (Médicos y enfermeros)",
    "Medicamentos",
    "Insumos y materiales médicos",
    "Transporte y logística",
    "Gastos administrativos",
    "Tecnología y sistemas",
    "Gastos legales / tutelas",
    "Provisiones y ajustes"
];

// --- CONSTANTES NUEVAS PARA ESTADÍSTICAS ---

// Lista para que el gráfico de enfermedades salga limpio
const COMMON_DISEASES = [
    "Hipertensión Arterial",
    "Diabetes Mellitus",
    "Enfermedad Renal Crónica",
    "EPOC / Enfermedad Respiratoria",
    "Alzheimer / Demencia",
    "Parkinson",
    "Secuelas ACV (Derrame)",
    "Cáncer / Cuidados Paliativos",
    "Artritis / Artrosis Severa",
    "Fractura de Cadera / Inmovilidad",
    "Insuficiencia Cardíaca",
    "Parálisis Cerebral",
    "Esclerosis Lateral Amiotrófica (ELA)",
    "Discapacidad Cognitiva",
    "Otro"
];
// --- CONSTANTES GEOGRÁFICAS DE TÁMESIS ---
const TAMESIS_ZONES = {
    "Casco Urbano": [
        "Centro", "San Antonio", "Pio XII", "El Estadio", "Otro barrio..."
    ],
    "Corregimiento Palermo": [
        "Palermo (Centro Poblado)", "San Isidro", "El Líbano", "La Oculta", "Otra vereda..."
    ],
    "Corregimiento San Pablo": [
        "San Pablo (Centro Poblado)", "El Rayo", "El Guamo", "El Tacón", "Otra vereda..."
    ],
    "Veredas Independientes": [
        "Río Frío", "Santa Teresa", "El Encanto", "Otra vereda..."
    ],
    "Resguardo Indígena": [
        "Comunidad Embera Chamí", "La Mirla", "Otro sector..."
    ]
};

const ApplicantDetailModal = ({ isOpen, onClose, candidate, onAction }) => {
  if (!isOpen || !candidate) return null;

  const getUrl = (path) => {
    if (!path) return null;
    const cleanPath = path.includes(',') ? path.split(',').pop() : path;
    const trimmedPath = cleanPath.trim();
    const finalPath = trimmedPath.startsWith('/') ? trimmedPath : `/${trimmedPath}`;
    return `http://localhost:3000${finalPath}`;
  };

  const Show = ({ label, val }) => (
    <div className="mb-3">
      <p className="text-xs text-gray-500 font-bold uppercase tracking-wide">{label}</p>
      <p className="text-gray-900 font-medium text-sm break-words">
        {val || <span className="text-gray-400 italic">No registrado</span>}
      </p>
    </div>
  );

  const hasMinDocs = candidate.fileCaregiverId && (candidate.fileTraining || candidate.senaFile);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white w-full max-w-6xl h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        
        <div className="bg-[#1f3c88] text-white px-8 py-5 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-xl font-bold border-2 border-white/30">
              {candidate.fullName?.charAt(0) || "U"}
            </div>
            <div>
              <h2 className="text-xl font-bold">{candidate.fullName}</h2>
              <p className="text-blue-200 text-sm">
                C.C. {candidate.identification} • {candidate.email}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white text-3xl leading-none font-light transition"><MdClose /></button>
        </div>

        <div className="flex-1 overflow-auto bg-gray-50 p-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-[#1f3c88] font-bold border-b pb-2 mb-4 flex items-center gap-2">
                  <MdPerson className="text-xl" /> Información Personal
                </h3>
                <Show label="Tipo Documento" val={candidate.docType} />
                <Show label="Teléfono" val={candidate.phone} />
                <Show label="Dirección" val={candidate.address} />
                <Show label="Fecha Nacimiento" val={candidate.birthDate ? new Date(candidate.birthDate).toLocaleDateString() : ''} />
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-[#1f3c88] font-bold border-b pb-2 mb-4 flex items-center gap-2">
                  <MdSchool className="text-xl" /> Perfil Profesional
                </h3>
                <Show label="Código SENA" val={candidate.senaCode} />
                <Show label="Años Experiencia" val={candidate.experienceYears} />
                <Show label="Transporte Propio" val={candidate.hasTransport ? "SÍ TIENE" : "NO TIENE"} />
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-full">
                <h3 className="text-[#1f3c88] font-bold border-b pb-2 mb-4 flex items-center gap-2">
                  <MdLocalHospital className="text-xl" /> Paciente y Cuidado
                </h3>
                {candidate.patientName ? (
                  <>
                    <Show label="Nombre Paciente" val={candidate.patientName} />
                    <Show label="Documento Paciente" val={candidate.patientDoc} />
                    <Show label="Parentesco / Relación" val={candidate.relationship} />
                    <Show label="Tipo de Cuidado" val={candidate.careType} />
                    <Show label="Instrucciones Especiales" val={candidate.careInstructions} />
                    
                    <div className="mt-4 p-4 bg-red-50 rounded-lg border border-red-100">
                      <h4 className="text-red-800 font-bold text-sm mb-2">Diagnóstico Clínico</h4>
                      <Show label="Diagnóstico" val={candidate.diagnosis} />
                      <Show label="Grado Discapacidad" val={candidate.disabilityGrade} />
                      <Show label="Tiene Orden Médica" val={candidate.hasMedicalOrder} />
                    </div>
                  </>
                ) : (
                   <div className="text-center py-10 text-gray-400 italic border-2 border-dashed border-gray-200 rounded-lg">
                     Perfil Profesional Externo <br/> (Sin paciente vinculado)
                   </div>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-[#1f3c88] font-bold border-b pb-2 mb-4 flex items-center gap-2">
                  <MdFolderOpen className="text-xl" /> Documentos Cargados
                </h3>
                
                <div className="grid grid-cols-1 gap-3">
                    {candidate.fileCaregiverId ? (
                        <a href={getUrl(candidate.fileCaregiverId)} target="_blank" rel="noreferrer" 
                           className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition text-sm font-semibold">
                           <MdBadge className="text-lg" /> Cédula Cuidador
                        </a>
                    ) : <span className="text-xs text-red-400 pl-2">x Falta Cédula Cuidador</span>}

                    {(candidate.fileTraining || candidate.senaFile) ? (
                        <a href={getUrl(candidate.fileTraining || candidate.senaFile)} target="_blank" rel="noreferrer" 
                           className="flex items-center gap-3 p-3 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 transition text-sm font-semibold">
                           <MdSchool className="text-lg" /> Diploma / Curso SENA
                        </a>
                    ) : <span className="text-xs text-red-400 pl-2">x Falta Diploma SENA</span>}

                    {candidate.filePatientId && (
                        <a href={getUrl(candidate.filePatientId)} target="_blank" rel="noreferrer" 
                           className="flex items-center gap-3 p-3 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 transition text-sm font-semibold">
                           <MdLocalHospital className="text-lg" /> Doc. Identidad Paciente
                        </a>
                    )}

                    {candidate.fileHistory && (
                        <a href={getUrl(candidate.fileHistory)} target="_blank" rel="noreferrer" 
                           className="flex items-center gap-3 p-3 rounded-lg bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200 transition text-sm font-semibold">
                           <MdAssignment className="text-lg" /> Historia Clínica
                        </a>
                    )}

                    {candidate.filePower && (
                        <a href={getUrl(candidate.filePower)} target="_blank" rel="noreferrer" 
                           className="flex items-center gap-3 p-3 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300 transition text-sm font-semibold">
                           <MdGavel className="text-lg" /> Poder de Representación
                        </a>
                    )}
                </div>
              </div>

              <div className="bg-gray-100 p-6 rounded-xl border border-gray-200 text-center sticky top-0">
                <h3 className="text-gray-800 font-bold mb-4">Gestión de la Solicitud</h3>
                
                {candidate.status === 'PENDIENTE' && (
                    <button
                        onClick={() => onAction(candidate.id, 'PRESELECCIONADO')}
                        className="w-full py-3 bg-yellow-500 hover:bg-yellow-600 text-white font-bold rounded-lg shadow-md transition mb-3 hover:scale-[1.02] flex items-center justify-center gap-2"
                    >
                        <MdCheckCircle className="text-xl" /> Preseleccionar
                    </button>
                )}

                {candidate.status === 'PRESELECCIONADO' && (
                    <>
                        <p className="text-xs text-gray-500 mb-3 px-2 flex items-center justify-center gap-1">
                           {hasMinDocs 
                             ? "Documentación mínima completa." 
                             : <><MdWarning className="text-red-500 text-lg"/> "Faltan documentos obligatorios (Cédula o Diploma)."</>}
                        </p>
                        <button
                            onClick={() => onAction(candidate.id, 'APROBADO')}
                            disabled={!hasMinDocs} 
                            className={`w-full py-3 font-bold rounded-lg shadow-md transition flex items-center justify-center gap-2 ${hasMinDocs ? 'bg-green-600 hover:bg-green-700 text-white hover:scale-[1.02]' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
                        >
                            <MdEmojiEvents className="text-xl" /> Aprobar Contratación
                        </button>
                    </>
                )}

                {candidate.status === 'APROBADO' && (
                    <div className="p-3 bg-green-100 text-green-800 rounded-lg font-bold border border-green-200">
                        Usuario Activo
                    </div>
                )}

                {candidate.status === 'RECHAZADO' && (
                    <div className="p-3 bg-red-100 text-red-800 rounded-lg font-bold border border-red-200">
                        Usuario Rechazado
                    </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default function DashboardEPS({ user, onLogout }) {
  // ==============================================================================
  // 1. ESTADOS (STATES) - GESTIÓN DE DATOS Y NAVEGACIÓN
  // ==============================================================================
  const [selectedPatient, setSelectedPatient] = useState(null);
  
  // AÑADE ESTA LÍNEA AQUÍ:
  const openPatientDetail = (patient) => {
    setSelectedPatient(patient);
  };


  const [selectedPro, setSelectedPro] = useState(null);
  // Navegación principal
  const [activeTab, setActiveTab] = useState('METRICAS'); // Iniciamos en métricas para ver el impacto visual
  // Opciones: 'METRICAS', 'SOLICITUDES', 'VALIDACION', 'ACTIVOS', 'PACIENTES', 'PROFESIONALES', 'FINANCIERO'
  // 1. NUEVO ESTADO PARA EL MODAL DE DETALLE
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // 2. FUNCIÓN PARA ABRIRLO
  const openCandidateDetail = (candidate) => {
    setSelectedCandidate(candidate);
    setShowDetailModal(true);
  };

  // 3. FUNCIÓN DE ACCIÓN (Conecta con tu lógica existente de handleStatusChange)
  const handleDetailAction = (id, status) => {
      handleStatusChange(id, status); // Usamos tu función existente
      setShowDetailModal(false);      // Cerramos el modal tras la acción
  };

  // Datos traídos del Backend
  const [caregivers, setCaregivers] = useState([]);
  const [patients, setPatients] = useState([]);
  const [logs, setLogs] = useState([]);
  const [professionals, setProfessionals] = useState([]); 
  const [visits, setVisits] = useState([]); 
  const [financialReports, setFinancialReports] = useState([]); 
  
  // Estados de carga y búsqueda
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // --- ESTADOS PARA MODALES DE CUIDADORES Y PACIENTES ---
  const [selectedCaregiver, setSelectedCaregiver] = useState(null); 
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [caregiverToAssign, setCaregiverToAssign] = useState(null);
  
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [selectedCaregiverLogs, setSelectedCaregiverLogs] = useState([]);
  const [selectedCaregiverName, setSelectedCaregiverName] = useState('');
  
  const [showPatientForm, setShowPatientForm] = useState(false);
  // NOTA: Se agregó 'stratum' (Estrato) al estado inicial
  const [newPatientData, setNewPatientData] = useState({ 
    fullName: '', age: '', stratum: '', diagnosis: '', address: '', contactPhone: '', careInstructions: '', zoneCategory: '', zoneDetail: '',
    fileHistory: null});

  // --- ESTADOS PARA MODALES DE PROFESIONALES ---
  const [showProForm, setShowProForm] = useState(false);
const [newProData, setNewProData] = useState({ 
    fullName: '', email: '', identification: '', phone: '', position: '', 
    resumeFile: null, fileHistory: null 
});
  const [showVisitsModal, setShowVisitsModal] = useState(false);
  const [selectedProVisits, setSelectedProVisits] = useState([]);
  const [selectedProName, setSelectedProName] = useState('');

  // --- ESTADOS PARA MODALES FINANCIEROS ---
  const [showFinancialForm, setShowFinancialForm] = useState(false);
  const [showFinancialView, setShowFinancialView] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);

  const initialFinancialData = {
      period: '', 
      epsName: 'ELIGEME SALUD EPS', 
      responsible: user?.fullName || '', 
      totalBudget: 0, 
      expenses: EXPENSE_CATEGORIES.map(cat => ({ category: cat, value: 0, support: '', note: '' })),
      generalObs: '', 
      elaboratedBy: '', 
      reviewedBy: ''
  };
  const [financialData, setFinancialData] = useState(initialFinancialData);


// ==============================================================================
  // 2. FETCH DATA
  // ==============================================================================
  const fetchData = async () => {
    // Protección: Si setLoading no existe, no falla.
    if (typeof setLoading === 'function') setLoading(true);

    try {
      // 1. Obtener ID del LocalStorage de forma segura
      const storedRaw = localStorage.getItem('user');
      if (!storedRaw) {
          console.warn("⚠️ No hay usuario, deteniendo carga.");
          if (typeof setLoading === 'function') setLoading(false);
          return;
      }
      
      const storedUser = JSON.parse(storedRaw);
      const myEpsId = storedUser.epsId || storedUser.id;
      const queryParams = myEpsId ? `?epsId=${myEpsId}` : '';

      console.log("🚀 Iniciando carga segura con filtro:", queryParams);

      // 2. Peticiones (Usamos rutas completas por seguridad)
      const [resP, resC, resPro, resL, resV, resF] = await Promise.all([
        fetch(`http://localhost:3000/api/patients${queryParams}`),
        fetch(`http://localhost:3000/api/caregivers${queryParams}`),
        fetch(`http://localhost:3000/api/professionals${queryParams}`),
        fetch(`http://localhost:3000/api/logs${queryParams}`),
        fetch(`http://localhost:3000/api/visits${queryParams}`),
        fetch('http://localhost:3000/api/financial-reports')
      ]);

      // 3. Guardado seguro (Verificamos que las funciones set existan)
      if (resP.ok) { const d = await resP.json(); setPatients(Array.isArray(d) ? d : []); }
      if (resC.ok) { const d = await resC.json(); setCaregivers(Array.isArray(d) ? d : []); }
      if (resPro.ok) { const d = await resPro.json(); setProfessionals(Array.isArray(d) ? d : []); }
      if (resL.ok) { const d = await resL.json(); setLogs(Array.isArray(d) ? d : []); }
      if (resV.ok) { const d = await resV.json(); setVisits(Array.isArray(d) ? d : []); }
      if (resF.ok) { const d = await resF.json(); setFinancialReports(Array.isArray(d) ? d : []); }

    } catch (error) {
      console.error("❌ Error recuperable:", error);
      // Quitamos el toast por si eso era lo que rompía la pantalla
    } finally {
      if (typeof setLoading === 'function') setLoading(false);
    }
  };


useEffect(() => {
    fetchData();// Carga inicial
  }, []);
  // ==============================================================================
  // 2. CÁLCULO DE ESTADÍSTICAS 
  // ==============================================================================
  const getStats = () => {
      // 1. Protección contra fallos
      if (!patients) return { 
          assigned: 0, unassigned: 0, coveragePercent: 0, 
          strataCounts: {1:0,2:0,3:0,4:0,5:0,6:0}, 
          sortedDiagnoses: [], logCompliance: 0, visitOpportunity: 0, 
          ageGroups: { pediatrico: 0, adulto: 0, geriatrico: 0 } 
      };

      const totalPatients = patients.length || 1;
      const assigned = patients.filter(p => p.caregiverId).length;
      const unassigned = patients.filter(p => !p.caregiverId).length;
      const coveragePercent = Math.round((assigned / totalPatients) * 100);

      // 2. Lógica Robusta de Estratos
      const strataCounts = {1:0, 2:0, 3:0, 4:0, 5:0, 6:0};
      patients.forEach(p => {
          const cleanStr = String(p.stratum || "0").replace(/\D/g, ''); 
          const s = parseInt(cleanStr);
          if(s >= 1 && s <= 6) strataCounts[s]++;
      });

      // 3. Lógica Robusta de Diagnósticos
      const diagnoses = {};
      patients.forEach(p => {
          let rawDx = p.diagnosis || 'SIN DIAGNÓSTICO';
          let d = rawDx.split('(')[0].trim();
          d = d.charAt(0).toUpperCase() + d.slice(1).toLowerCase();
          if(d === '' || d === '.') d = 'Sin Diagnóstico';
          diagnoses[d] = (diagnoses[d] || 0) + 1;
      });
      const sortedDiagnoses = Object.entries(diagnoses)
          .sort((a,b) => b[1] - a[1]).slice(0, 5);

      // 4. KPI Bitácoras 
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const recentLogs = logs.filter(l => new Date(l.date) >= oneWeekAgo).length;
      const expectedLogs = (assigned || 1) * 7; 
      const logCompliance = Math.min(100, Math.round((recentLogs / expectedLogs) * 100));

      // 5. KPI Visitas 
      const fiveDaysAgo = new Date();
      fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
      let patientsOnTime = 0;
      patients.forEach(p => {
          const pVisits = visits.filter(v => v.patientId === p.id);
          if (pVisits.length > 0) {
              const sortedVisits = pVisits.sort((a,b) => new Date(b.date) - new Date(a.date));
              if (new Date(sortedVisits[0].date) >= fiveDaysAgo) patientsOnTime++;
          }
      });
      const visitOpportunity = Math.round((patientsOnTime / totalPatients) * 100);

      // 6. Grupos de Edad
      let ageGroups = { pediatrico: 0, adulto: 0, geriatrico: 0 };
      patients.forEach(p => {
          const age = parseInt(p.age);
          if (age <= 18) ageGroups.pediatrico++;
          else if (age <= 59) ageGroups.adulto++;
          else if (age >= 60) ageGroups.geriatrico++;
      });

      // 7. Financiero
      const totalBudgetGlobal = financialReports.reduce((acc, curr) => acc + Number(curr.totalBudget || 0), 0);
      const totalExecutedGlobal = financialReports.reduce((acc, curr) => acc + Number(curr.totalExecuted || 0), 0);
      const executionPercent = totalBudgetGlobal > 0 ? Math.round((totalExecutedGlobal / totalBudgetGlobal) * 100) : 0;

      return { 
          assigned, unassigned, coveragePercent, 
          strataCounts, sortedDiagnoses, ageGroups,
          logCompliance, visitOpportunity, executionPercent
      };
  };

  const stats = getStats();

  // ==============================================================================
  // 2. TU USEEFFECT (SOLO LE AGREGAMOS LA DEPENDENCIA [user])
  // ==============================================================================

const handleViewLogs = (persona) => {
    // 1. Buscamos las bitácoras normales (cuidador)
    const patientLogs = logs
      .filter(l => l.patientId === persona.id || l.caregiverId === persona.id)
      .map(l => ({ ...l, recordType: 'CUIDADOR' }));

    // 2. Buscamos las visitas médicas (profesional)
    const patientVisits = visits // Asegúrate de tener 'visits' en tus estados/variables
      .filter(v => v.patientId === persona.id)
      .map(v => ({ ...v, recordType: 'PROFESIONAL' }));

    // 3. Unimos todo y ordenamos por fecha
    const unifiedLogs = [...patientLogs, ...patientVisits].sort((a, b) => new Date(b.date) - new Date(a.date));

    setSelectedCaregiverLogs(unifiedLogs);
    setSelectedCaregiverName(persona.fullName);
    setShowLogsModal(true);
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      const res = await fetch(`http://localhost:3000/api/caregivers/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        toast.success(`Estado actualizado a ${newStatus}`);
        fetchData();
        setSelectedCaregiver(null);
      } else {
        toast.error("Error al actualizar estado");
      }
    } catch (error) { toast.error("Error de conexión"); }
  };

const handleCreatePatient = async (e) => {
    e.preventDefault();

    // 1. Validación de seguridad: ¿Sabemos quién es la EPS?
    if (!user || !user.epsId) {
      toast.error("Error crítico: No se identifica tu EPS. Cierra sesión e intenta de nuevo.");
      return;
    }

    // 2. Validación de correo obligatorio para enviar el código de acceso
    if (!newPatientData.email) {
      toast.error("El correo electrónico del paciente es obligatorio para generarle su acceso.");
      return;
    }

    // 3. Estructura de datos a enviar
    const payload = {
      fullName: newPatientData.fullName,
      email: newPatientData.email, // 👇 NUEVO: Se envía el correo del paciente
      age: parseInt(newPatientData.age), 
      address: newPatientData.address,
      phone: newPatientData.contactPhone || newPatientData.phone, 
      careInstructions: newPatientData.careInstructions, 
      zoneCategory: newPatientData.zoneCategory,         
      zoneDetail: newPatientData.zoneDetail,             
      stratum: newPatientData.stratum || "0",
      condition: newPatientData.diagnosis || "Sin Diagnóstico",
      diagnosis: newPatientData.diagnosis || "Sin Diagnóstico",
      epsId: parseInt(user.epsId) 
    };

    try {
      const res = await fetch('http://localhost:3000/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(`Paciente ${data.fullName} creado. Se envió el código de acceso a su correo.`);
        
        // Limpiamos el formulario (ajusta según tus estados iniciales)
        setNewPatientData(initialPatientState || {});
        setIsModalOpen(false); // Cierra el modal si aplica
        fetchData(); // Recarga la lista de pacientes
      } else {
        toast.error("Error al crear paciente: " + (data.error || "Datos incompletos"));
      }
    } catch (error) {
      console.error("Error al crear paciente:", error);
      toast.error("Error de conexión al guardar el paciente");
    }

    

    try {
      const res = await fetch('http://localhost:3000/api/patients', { 
        method: 'POST', 
        headers: {'Content-Type': 'application/json'}, 
        body: JSON.stringify(payload)
      });
      
      const data = await res.json(); // Leemos la respuesta siempre

      if(res.ok) {
        toast.success("Paciente creado con éxito");
        setShowPatientForm(false);
        
        // Limpiar formulario
        setNewPatientData({ 
            fullName: '', age: '', stratum: '', diagnosis: '', 
            address: '', contactPhone: '', careInstructions: '' 
        });
        
        // Recargar la lista
        if (typeof fetchData === 'function') fetchData(); 
      

      } else {
      
        toast.error(data.error || "Error al guardar paciente");
      }
    } catch (e) { 
        console.error("Error de conexión:", e);
        toast.error("Error de conexión con el servidor"); 
    }
  };
  const handleAssignPatient = async (patientId) => {
    if (!caregiverToAssign) return;
    try {
      const res = await fetch(`http://localhost:3000/api/patients/${patientId}/assign`, {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ caregiverId: caregiverToAssign.id })
      });
      if (res.ok) {
        toast.success("Paciente asignado exitosamente");
        setShowAssignModal(false);
        setCaregiverToAssign(null);
        fetchData();
      } else {
        toast.error("Error en la asignación");
      }
    } catch (error) { toast.error("Error de asignación"); }
  };
const handleCreateProfessional = async (e) => {
    e.preventDefault();
    
    // Usamos FormData para poder enviar archivos binarios
    const formData = new FormData();
    formData.append('fullName', newProData.fullName);
    formData.append('email', newProData.email);
    formData.append('identification', newProData.identification);
    formData.append('phone', newProData.phone);
    formData.append('position', newProData.position); // Nuevo: Cargo
    formData.append('epsId', user.epsId);
    
    // Archivos
    if (newProData.resumeFile) formData.append('resumeFile', newProData.resumeFile);
    if (newProData.fileHistory) formData.append('fileHistory', newProData.fileHistory);

    try {
        const res = await fetch('http://localhost:3000/api/professionals', {
            method: 'POST',
            body: formData // Eliminamos los headers de 'Content-Type' para que el navegador fije el 'multipart/form-data' automáticamente
        });

        if(res.ok) {
            toast.success("Profesional registrado exitosamente");
            setShowProForm(false);
            setNewProData({ fullName: '', email: '', identification: '', phone: '', position: '', resumeFile: null });
            fetchData(); 
        } else {
            toast.error("Error al crear profesional");
        }
    } catch (e) { 
        toast.error("Error de conexión"); 
    }
};

  const handleViewVisits = (pro) => {
      const proVisits = visits.filter(v => v.professionalId === pro.id);
      proVisits.sort((a, b) => new Date(b.date) - new Date(a.date));
      setSelectedProVisits(proVisits);
      setSelectedProName(pro.fullName);
      setShowVisitsModal(true);
  };

  // --- LÓGICA FINANCIERA ---
  const totalExecuted = financialData.expenses.reduce((acc, curr) => acc + Number(curr.value || 0), 0);
  const balance = Number(financialData.totalBudget || 0) - totalExecuted;

  const handleExpenseChange = (index, field, value) => {
      const newExpenses = [...financialData.expenses];
      newExpenses[index][field] = value;
      setFinancialData({ ...financialData, expenses: newExpenses });
  };

  const handleCreateFinancialReport = async (e) => {
      e.preventDefault();
      try {
          const payload = { ...financialData, totalExecuted: totalExecuted, balance: balance };
          const res = await fetch('http://localhost:3000/api/financial-reports', {
              method: 'POST',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify(payload)
          });
          if(res.ok) {
              toast.success("Reporte Guardado");
              setShowFinancialForm(false);
              setFinancialData(initialFinancialData); 
              fetchData();
          } else {
              toast.error("Error al guardar reporte");
          }
      } catch (e) { toast.error("Error de conexión"); }
  };

  const handlePrint = () => {
      const printContent = document.getElementById('printable-area');
      const win = window.open('', '', 'height=800,width=1000');
      win.document.write('<html><head><title>Imprimir</title>');
      win.document.write(`
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; color: #000; -webkit-print-color-adjust: exact; }
            h1 { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; font-size: 24px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
            th, td { border: 1px solid #ccc; padding: 6px 10px; text-align: left; }
            th { background-color: #f0f0f0; font-weight: bold; }
            .text-right { text-align: right; }
          </style>
      `);
      win.document.write('</head><body>');
      win.document.write(printContent.innerHTML);
      win.document.write('</body></html>');
      win.document.close();
      win.print();
  };

  // --- FILTROS ---
  const filteredCaregivers = caregivers.filter(c => 
    c.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (c.identification && c.identification.includes(searchTerm))
  );

  const pendingRequests = filteredCaregivers.filter(c => c.status === 'PENDIENTE');
  const preselectedRequests = filteredCaregivers.filter(c => c.status === 'PRESELECCIONADO');
  const activeCaregivers = filteredCaregivers.filter(c => c.status === 'APROBADO');



  
  // Cálculo de datos para la gráfica de Estratos
  const stratumChartData = [1, 2, 3, 4, 5, 6].map(level => {
    
    const currentPatients = typeof patients !== 'undefined' ? patients : []; 
    
    const count = currentPatients.filter(p => String(p.stratum) === String(level)).length;
    
    return {
      name: `Est ${level}`,
      cantidad: count
    };
  });
// =======================================================
  // LÓGICA DE BÚSQUEDA (PEGAR ESTO ANTES DEL ÚLTIMO RETURN)
  // =======================================================
  const filteredPatients = patients.filter(p => {
      const term = searchTerm.toLowerCase();
      // Buscamos por Nombre o por Diagnóstico
      const nameMatch = p.fullName && p.fullName.toLowerCase().includes(term);
      const docMatch = p.identification && p.identification.toString().includes(term);
      const diagMatch = p.diagnosis && p.diagnosis.toLowerCase().includes(term);
      
      return nameMatch || docMatch || diagMatch;
  });
  // ==============================================================================
  // 5. RENDERIZADO UI
  // ==============================================================================
  return (
    
    
    <div className="min-h-screen bg-gray-50 text-gray-800 font-sans">
      
      {/* HEADER */}
      <header className="bg-blue-900 text-white shadow-lg sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-wide">
             PANEL ADMIN <span className="font-light text-blue-300">ELIGEME</span>
            </h1>
            <p className="text-xs text-blue-200 uppercase tracking-widest">Hospital/Alcaldía</p>
          </div>
          <div className="flex gap-4 items-center">
             <div className="hidden md:block text-right mr-4">
                
                 <p className="text-xs text-blue-300">Administrador</p>
             </div>
             <button onClick={fetchData} className="text-sm bg-blue-800/50 border border-blue-700 px-3 py-1 rounded hover:bg-blue-700 transition flex items-center gap-1">
                <span>↻</span>
             </button>
             <button onClick={onLogout} className="text-sm bg-red-600 hover:bg-red-700 px-4 py-2 rounded font-bold transition shadow-lg">
                Salir
             </button>
          </div>
        </div>
        
        
       {/* NAV TABS */}
        <div className="bg-white text-gray-600 border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-6 flex space-x-6 overflow-x-auto">
            <TabBtn active={activeTab==='METRICAS'} onClick={()=>setActiveTab('METRICAS')} label="Estadísticas" count={0} icon={<MdBarChart />}/>
            <TabBtn active={activeTab==='SOLICITUDES'} onClick={()=>setActiveTab('SOLICITUDES')} label="Solicitudes" count={pendingRequests.length} icon={<MdMail />}/>
            <TabBtn active={activeTab==='VALIDACION'} onClick={()=>setActiveTab('VALIDACION')} label="Validación" count={preselectedRequests.length} icon={<MdFolderOpen />}/>
            <TabBtn active={activeTab==='ACTIVOS'} onClick={()=>setActiveTab('ACTIVOS')} label="Cuidadores" count={activeCaregivers.length} icon={<MdHealthAndSafety />}/>
            <TabBtn active={activeTab==='PACIENTES'} onClick={()=>setActiveTab('PACIENTES')} label="Pacientes" count={patients.length} icon={<MdLocalHospital />}/>
            
            {/* AQUÍ ESTÁ LA CORRECCIÓN: Usando MdMedicalServices en lugar del anterior */}
            <TabBtn active={activeTab==='PROFESIONALES'} onClick={()=>setActiveTab('PROFESIONALES')} label="Profesionales" count={professionals.length} icon={<MdMedicalServices />}/>
            
            <TabBtn active={activeTab==='FINANCIERO'} onClick={()=>setActiveTab('FINANCIERO')} label="Reportes"  />
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="max-w-7xl mx-auto p-6">
        
        {activeTab !== 'FINANCIERO' && activeTab !== 'METRICAS' && (
            <div className="mb-6 flex justify-end">
                <div className="relative w-full max-w-xs">
                    <input 
                        type="text" 
                        placeholder="Buscar..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="p-2 pl-3 border border-gray-300 rounded-lg w-full focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                    <span className="absolute right-3 top-2 text-gray-400">🔍</span>
                </div>
            </div>
        )}
        {/* VISTA: ESTADÍSTICAS Y MÉTRICAS */}
        {activeTab === 'METRICAS' && (
            <div className="animate-fadeIn space-y-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Tablero de Control e Indicadores</h2>
                
                {/* 1. KPIs Superiores */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white p-5 rounded-xl shadow-sm border-l-4 border-blue-500">
                        <p className="text-gray-500 text-xs font-bold uppercase">Pacientes Totales</p>
                        <p className="text-3xl font-bold text-gray-800">{patients.length}</p>
                    </div>
                    <div className="bg-white p-5 rounded-xl shadow-sm border-l-4 border-green-500">
                        <p className="text-gray-500 text-xs font-bold uppercase">Cobertura Cuidadores</p>
                        <p className="text-3xl font-bold text-green-600">{stats.coveragePercent}%</p>
                        <p className="text-xs text-gray-400">Pacientes asignados</p>
                    </div>
                    <div className="bg-white p-5 rounded-xl shadow-sm border-l-4 border-yellow-500">
                        <p className="text-gray-500 text-xs font-bold uppercase">Bitácoras (7 días)</p>
                        <p className={`text-3xl font-bold ${stats.logCompliance >= 80 ? 'text-green-600' : 'text-yellow-600'}`}>{stats.logCompliance}%</p>
                        <p className="text-xs text-gray-400">Cumplimiento Diario</p>
                    </div>
                    <div className="bg-white p-5 rounded-xl shadow-sm border-l-4 border-purple-500">
                        <p className="text-gray-500 text-xs font-bold uppercase">Visitas (5 días)</p>
                        <p className={`text-3xl font-bold ${stats.visitOpportunity >= 90 ? 'text-green-600' : 'text-purple-600'}`}>{stats.visitOpportunity}%</p>
                        <p className="text-xs text-gray-400">Oportunidad Médica</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* 2. Distribución por Estratos (NUEVO CON RECHARTS) */}
<div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
    <h3 className="font-bold text-gray-800 mb-4">Población por Estrato</h3>
    
    <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
            <BarChart 
                data={stratumChartData} 
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
                {/* Cuadrícula de fondo suave */}
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                
                {/* Eje X (Estrato 1, 2, 3...) */}
                <XAxis 
                    dataKey="name" 
                    tick={{fontSize: 12, fill: '#6B7280'}} 
                    axisLine={false} 
                    tickLine={false} 
                />
                
                {/* Eje Y (Cantidades) */}
                <YAxis 
                    tick={{fontSize: 12, fill: '#6B7280'}} 
                    axisLine={false} 
                    tickLine={false} 
                />
                
                {/* Tooltip flotante al pasar el mouse */}
                <Tooltip 
                    cursor={{fill: '#F3F4F6'}}
                    contentStyle={{
                        borderRadius: '8px', 
                        border: 'none', 
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }} 
                />
                
                {/* Las Barras Azules (Indigo-500) */}
                <Bar 
                    dataKey="cantidad" 
                    fill="#6366F1" 
                    radius={[4, 4, 0, 0]} 
                    barSize={40} 
                    animationDuration={1500}
                />
            </BarChart>
        </ResponsiveContainer>
    </div>
</div>
                    {/* 3. Top Diagnósticos */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <h3 className="font-bold text-gray-800 mb-4">Top 5 Patologías</h3>
                        <div className="space-y-4">
                            {stats.sortedDiagnoses.map(([name, count], idx) => (
                                <div key={idx} className="relative">
                                    <div className="flex justify-between text-sm mb-1 z-10 relative">
                                        <span className="font-medium text-gray-700">{name}</span>
                                        <span className="font-bold text-gray-900">{count}</span>
                                    </div>
                                    <div className="w-full bg-gray-100 rounded-full h-2.5">
                                        <div className="bg-emerald-500 h-2.5 rounded-full" style={{ width: `${(count / patients.length) * 100}%` }}></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 4. Grupos de Edad */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                         <h3 className="font-bold text-gray-800 mb-4">Grupos de Edad</h3>
                         <div className="flex justify-around items-center py-4">
                             <div className="text-center">
                                 <div className="w-16 h-16 rounded-full border-4 border-blue-200 flex items-center justify-center bg-blue-50 font-bold text-blue-700 mx-auto mb-2">{stats.ageGroups.pediatrico}</div>
                                 <p className="text-xs text-gray-400">0-18 años</p>
                             </div>
                             <div className="text-center">
                                 <div className="w-16 h-16 rounded-full border-4 border-indigo-200 flex items-center justify-center bg-indigo-50 font-bold text-indigo-700 mx-auto mb-2">{stats.ageGroups.adulto}</div>
                                 <p className="text-xs text-gray-400">19-59 años</p>
                             </div>
                             <div className="text-center">
                                 <div className="w-16 h-16 rounded-full border-4 border-orange-200 flex items-center justify-center bg-orange-50 font-bold text-orange-700 mx-auto mb-2">{stats.ageGroups.geriatrico}</div>
                                 <p className="text-xs text-gray-400">60+ años</p>
                             </div>
                         </div>
                    </div>

                    {/* 5. Donut Cobertura */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col items-center justify-center">
                         <h3 className="font-bold text-gray-800 mb-2 w-full text-left">Estado Cobertura</h3>
                         <div className="relative w-32 h-32 rounded-full border-8 border-gray-100" style={{background: `conic-gradient(#10b981 ${stats.coveragePercent}%, #ef4444 0)`}}>
                             <div className="absolute inset-2 bg-white rounded-full flex items-center justify-center">
                                 <span className="text-xl font-bold">{stats.coveragePercent}%</span>
                             </div>
                         </div>
                    </div>
                </div>
            </div>
        )}
      {/* -------------------------------------------------------- */}
        {/* SECCIÓN 1: SOLICITUDES                                   */}
        {/* -------------------------------------------------------- */}
        {activeTab === 'SOLICITUDES' && (
          <div className="grid grid-cols-1 gap-4 animate-fadeIn">
             <h2 className="text-xl font-bold mb-2 text-gray-700">Postulaciones Recientes</h2>
             {pendingRequests.length === 0 ? (
                 <div className="text-center py-10 bg-white rounded-lg shadow-sm border border-gray-100"><p className="text-gray-400">No hay solicitudes pendientes.</p></div>
             ) : (
               pendingRequests.map(req => (
                 <div key={req.id} className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-yellow-400 flex flex-col md:flex-row justify-between items-center hover:shadow-md transition">
                    <div className="mb-4 md:mb-0">
                       <h3 className="font-bold text-lg text-gray-800">{req.fullName}</h3>
                       <div className="text-sm text-gray-500 flex gap-4 mt-1"><span>🆔 {req.identification}</span><span>📧 {req.email}</span></div>
                    </div>
                    {/* AQUÍ ESTÁ EL CAMBIO CLAVE: Usamos openCandidateDetail en lugar de setSelectedCaregiver */}
                    <button onClick={() => openCandidateDetail(req)} className="bg-blue-50 text-blue-600 px-6 py-2 rounded-lg font-bold hover:bg-blue-100 border border-blue-200 transition">
                        Revisar Perfil Completo
                    </button>
                 </div>
               ))
             )}
          </div>
        )}

      {/* -------------------------------------------------------- */}
        {/* SECCIÓN 2: VALIDACIÓN (Código Actualizado)               */}
        {/* -------------------------------------------------------- */}
        {activeTab === 'VALIDACION' && (
          <div className="grid grid-cols-1 gap-4 animate-fadeIn">
             <h2 className="text-xl font-bold mb-2 text-gray-700">Validación de Documentos</h2>
             
             {preselectedRequests.length === 0 ? (
                <div className="text-center py-10 bg-white rounded-lg shadow-sm">
                   <p className="text-gray-400">Sin validaciones pendientes.</p>
                </div>
             ) : (
                preselectedRequests.map(user => (
                  <div key={user.id} className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-orange-400 flex flex-col md:flex-row justify-between items-center">
                     
                     {/* COLUMNA IZQUIERDA: INFORMACIÓN BÁSICA */}
                     <div>
                        <h3 className="font-bold text-lg text-gray-800">{user.fullName}</h3>
                        <p className="text-sm text-gray-500 mb-2">C.C. {user.identification || 'No registrada'}</p>
                        
                        <div className="mt-3 flex flex-wrap gap-2">
                           {/* Lógica para ver el archivo PDF cargado */}
                           {user.senaFile ? (
                               <a 
                                 href={`http://localhost:3000${user.senaFile.includes(',') ? user.senaFile.split(',').pop() : user.senaFile}`} 
                                 target="_blank" 
                                 rel="noreferrer" 
                                 className="inline-flex items-center gap-2 text-blue-600 font-bold hover:text-blue-800 underline bg-blue-50 px-3 py-1 rounded transition"
                               >
                                 📄 Ver Documento Cargado
                               </a>
                           ) : (
                               <span className="text-orange-600 text-xs font-bold px-3 py-1 bg-orange-100 rounded">
                                 ⏳ Esperando archivo...
                               </span>
                           )}
                        </div>
                     </div>

                     {/* COLUMNA DERECHA: BOTONES DE ACCIÓN */}
                     <div className="flex flex-wrap gap-2 mt-4 md:mt-0 items-center justify-end">
                         
                         {/* 1. NUEVO BOTÓN: VER HOJA DE VIDA COMPLETA */}
                         <button 
                            onClick={() => openCandidateDetail(user)} className="px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 rounded-lg font-bold flex items-center gap-2 transition shadow-sm">
                                    <MdRemoveRedEye className="text-lg"/> Ver Hoja de Vida
                         </button>

                         {/* 2. RECHAZAR */}
                         <button 
                             onClick={() => handleStatusChange(user.id, 'RECHAZADO')} 
                             className="px-4 py-2 border border-red-200 text-red-600 rounded-lg font-bold hover:bg-red-50 transition"
                         >
                             Rechazar
                         </button>
                         
                         {/* 3. APROBAR (Solo habilitado si ya subió el archivo) */}
                         {user.senaFile ? (
                             <button 
                                 onClick={() => handleStatusChange(user.id, 'APROBADO')} 
                                 className="px-6 py-2 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 shadow-md transition transform hover:-translate-y-0.5"
                             >
                                 ✓ Aprobar
                             </button>
                         ) : (
                             <button 
                                 disabled 
                                 className="px-6 py-2 bg-gray-200 text-gray-400 font-bold rounded-lg cursor-not-allowed border border-gray-300"
                             >
                                 Falta Archivo
                             </button>
                         )}
                     </div>
                  </div>
                ))
             )}
          </div>
        )}
          {/* -------------------------------------------------------- */}
        {/* SECCIÓN 3: ACTIVOS                                       */}
        {/* -------------------------------------------------------- */}
        {activeTab === 'ACTIVOS' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fadeIn">
            {activeCaregivers.length === 0 && <p className="text-gray-500 col-span-3 text-center py-10">No hay cuidadores activos.</p>}
            {activeCaregivers.map(caregiver => {
                const assignedPatient = patients.find(p => p.caregiverId === caregiver.id);
                return (
                  <div key={caregiver.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col h-full hover:shadow-lg transition">
                    <div className="flex justify-between items-start mb-3">
                        <div>
                            <h3 className="font-bold text-gray-900 text-lg">{caregiver.fullName}</h3>
                            <p className="text-xs text-gray-400">ID: {caregiver.identification}</p>
                        </div>
                        <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-bold">ACTIVO</span>
                    </div>
                    
                    <div className="mb-4 bg-gray-100 p-2 rounded text-center">
                        <p className="text-xs text-gray-500 font-bold uppercase">Código Acceso</p>
                        <p className="font-mono font-bold text-gray-800">{caregiver.accessCode}</p>
                    </div>
                    
                    <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100 mb-4 flex-1">
                        <p className="text-xs font-bold text-blue-400 uppercase mb-2">Paciente Asignado</p>
                        {assignedPatient ? (
                            <div className="flex justify-between items-center">
                                <div><p className="text-blue-900 font-bold text-sm">{assignedPatient.fullName}</p></div>
                                <span className="text-xl">👴</span>
                            </div>
                        ) : (
                            <button onClick={()=>{setCaregiverToAssign(caregiver); setShowAssignModal(true)}} className="text-xs bg-blue-600 text-white px-3 py-1 rounded w-full shadow hover:bg-blue-700 transition">+ Asignar Paciente</button>
                        )}
                    </div>
                    
                    <div className="flex gap-3 mt-auto">
                        {/* CAMBIO CLAVE 1: Usamos openCandidateDetail para ver el perfil enriquecido */}
                        <button onClick={() => openCandidateDetail(caregiver)} className="flex-1 flex items-center justify-center gap-2 bg-gray-100 text-gray-700 py-2 rounded text-sm font-bold hover:bg-gray-200 border border-gray-200 transition">
                            <MdRemoveRedEye className="text-lg"/> Perfil Completo
                        </button>
                        {/* CAMBIO CLAVE 2: Mantenemos handleViewLogs que abre el historial completo de bitácoras */}
                        <button onClick={() => handleViewLogs(caregiver)} className="flex-1 bg-blue-600 text-white py-2 rounded text-sm font-bold hover:bg-blue-700 shadow-md transition">
                            📋 Ver Bitácoras
                        </button>
                    </div>
                  </div>
                );
            })}
          </div>
        )}

        {/* -------------------------------------------------------- */}
        {/* SECCIÓN 4: PACIENTES                                     */}
        {/* -------------------------------------------------------- */}
        {activeTab === 'PACIENTES' && (
           <div className="animate-fadeIn">
              <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-gray-800">Listado Maestro</h2>
                  <button onClick={()=>setShowPatientForm(true)} className="bg-green-600 text-white px-6 py-2 rounded-lg font-bold shadow hover:bg-green-700">+ Nuevo Paciente</button>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <table className="w-full text-left text-sm">
                      <thead className="bg-gray-50 text-gray-500 uppercase text-xs font-bold border-b border-gray-200">
                          <tr>
                              <th className="p-4">Nombre</th>
                              <th className="p-4">Estrato</th>
                              <th className="p-4">Diagnóstico</th>
                              <th className="p-4">Cuidador</th>
                              <th className="p-4">Estado</th>
                              <th className="p-4 text-center">Acciones</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                          {patients.map(p => {
                              // Aseguramos la coincidencia del ID del cuidador
                              const assigned = caregivers.find(c => String(c.id) === String(p.caregiverId));
                              return (
                                  <tr key={p.id} className="hover:bg-gray-50">
                                      <td className="p-4 font-medium">{p.fullName} <span className="text-gray-400 text-xs block">{p.age} años</span></td>
                                      <td className="p-4"><span className="bg-gray-100 px-2 py-1 rounded text-xs font-bold">E{p.stratum || '?'}</span></td>
                                      <td className="p-4 text-gray-500">{p.diagnosis}</td>
                                      <td className="p-4">{assigned ? <span className="text-green-700 bg-green-50 px-2 py-1 rounded text-xs font-bold">👤 {assigned.fullName}</span> : <span className="text-gray-400 italic text-xs">Sin asignar</span>}</td>
                                      <td className="p-4"><span className={`w-2 h-2 rounded-full inline-block mr-2 ${assigned ? 'bg-green-500' : 'bg-red-500'}`}></span>{assigned ? 'Cubierto' : 'Pendiente'}</td>
                                      <td className="p-4 text-center">
                                          {/* NUEVO: Botón para ver el perfil completo del paciente */}
                                          <button onClick={() => openPatientDetail(p)} className="bg-gray-100 text-gray-700 px-3 py-1 rounded text-xs font-bold hover:bg-gray-200 transition">
                                              <MdRemoveRedEye className="text-lg"/> Ver Perfil
                                          </button>
                                      </td>
                                  </tr>
                              );
                          })}
                      </tbody>
                  </table>
                  {patients.length === 0 && <div className="p-8 text-center text-gray-400">No hay pacientes registrados.</div>}
              </div>
           </div>
        )}
                        {/* SECCIÓN 5: PROFESIONALES */}
{activeTab === 'PROFESIONALES' && (
  <div className="animate-fadeIn">
      <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-800">Gestión Médica</h2>
          <button onClick={()=>setShowProForm(true)} className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold shadow hover:bg-emerald-700">+ Nuevo Profesional</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {professionals.length === 0 && <p className="col-span-3 text-center text-gray-400">Sin registros.</p>}
          {professionals.map(pro => (
              <div key={pro.id} className="bg-white p-5 rounded-xl shadow-sm border border-emerald-100 hover:shadow-md transition flex flex-col h-full">
                  <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                          {/* AQUÍ ESTABA EL ERROR: Ya está cambiado a MdMedicalServices */}
                          <div className="bg-emerald-100 p-3 rounded-full text-emerald-600"><MdMedicalServices className="text-2xl" /></div>
                          <div>
                              <h3 className="font-bold text-emerald-900 text-lg">{pro.fullName}</h3>
                              <p className="text-xs text-gray-500">{pro.email}</p>
                              <p className="text-xs text-gray-500">ID: {pro.identification}</p>
                          </div>
                      </div>
                  </div>
                  <div className="mt-auto flex flex-col gap-2">
                      <button onClick={() => handleViewVisits(pro)} className="w-full flex items-center justify-center gap-2 bg-emerald-50 text-emerald-700 py-2 rounded font-bold hover:bg-emerald-100 border border-emerald-200 transition shadow-sm">
                          <MdAssignment className="text-lg"/> Perfil y Visitas a Detalle
                      </button>
                  </div>
              </div>
          ))}
      </div>
  </div>
)}
      {/* -------------------------------------------------------- */}
        {/* SECCIÓN 6: FINANCIERO                                    */}
        {/* -------------------------------------------------------- */}
        {activeTab === 'FINANCIERO' && (
            <div className="animate-fadeIn">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-gray-800">Reportes </h2>
                    <button onClick={()=>setShowFinancialForm(true)} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold shadow hover:bg-blue-700">+ Nuevo Reporte</button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    
                    {/* --- NUEVO CAJÓN: GENERAR REPORTE --- */}
<div 
    onClick={() => setShowFinancialForm(true)}
  
    className="bg-blue-50/50 border-2 border-dashed border-blue-300 rounded-xl p-8 flex flex-col items-center justify-center text-blue-600 cursor-pointer hover:bg-blue-100 hover:border-blue-400 hover:shadow-sm transition-all min-h-[250px] group"
>
    {/* AQUÍ ESTÁ LA IMAGEN MÁS GRANDE */}
    <img 
        src="/logo1.png" 
        alt="Ícono de Finanzas" 
     
        className="w-80 h-80 mb-4 object-contain group-hover:scale-110 transition-transform drop-shadow-sm"
    />
    
    <h3 className="font-bold text-lg">ADRES</h3>
    <p className="text-xs text-blue-500 mt-1 text-center font-medium">Crear un nuevo reporte</p>
</div>
{/* ------------------------------------ */}
{/* --- NUEVO CAJÓN: GENERAR REPORTE --- */}
<div 
  
    className="bg-blue-50/50 border-2 border-dashed border-blue-300 rounded-xl p-6 flex flex-col items-center justify-center text-blue-600 cursor-pointer hover:bg-blue-100 hover:border-blue-400 hover:shadow-sm transition-all min-h-[250px] group"
>
    {/* AQUÍ ESTÁ LA IMAGEN NUEVA */}
    <img 
        src="/logo2.png" 
        alt="Ícono de Finanzas" 
        className="w-80 h-80 mb-3 object-contain group-hover:scale-110 transition-transform drop-shadow-sm"
    />
    
    <h3 className="font-bold text-lg">FURAG</h3>
    <p className="text-xs text-blue-500 mt-1 text-center font-medium">Crear un nuevo reporte</p>
</div>
{/* ------------------------------------ */}
{/* --- NUEVO CAJÓN: GENERAR REPORTE --- */}
<div 
    onClick={() => setShowFinancialForm(true)}
    className="bg-blue-50/50 border-2 border-dashed border-blue-300 rounded-xl p-6 flex flex-col items-center justify-center text-blue-600 cursor-pointer hover:bg-blue-100 hover:border-blue-400 hover:shadow-sm transition-all min-h-[250px] group"
>
    {/* AQUÍ ESTÁ LA IMAGEN NUEVA */}
    <img 
        src="/logo3.png" 
        alt="Ícono de Finanzas" 
        className="w-80 h-80 mb-3 object-contain group-hover:scale-110 transition-transform drop-shadow-sm"
    />
    
    <h3 className="font-bold text-lg">FINANZAS</h3>
    <p className="text-xs text-blue-500 mt-1 text-center font-medium">Crear un nuevo reporte</p>
</div>
{/* ------------------------------------ */}        
                   
                            





                    {financialReports.length === 0 && (
                        <div className="col-span-2 flex items-center justify-center border-2 border-dashed border-gray-200 rounded-xl text-gray-400 py-10 min-h-[250px]">
                            Sin reportes financieros anteriores.
                        </div>
                    )}
                    
                    {financialReports.map(rep => (
                        <div key={rep.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition relative min-h-[250px] flex flex-col justify-between">
                            <div>
                                <div className="absolute top-0 right-0 bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded-bl-lg rounded-tr-xl">{rep.reference}</div>
                                <h3 className="font-bold text-lg mb-1">{rep.period}</h3>
                                <p className="text-xs text-gray-500 mb-4">Generado: {new Date(rep.date).toLocaleDateString()}</p>
                                <div className="space-y-2 mb-4 bg-gray-50 p-3 rounded">
                                    <div className="flex justify-between text-sm"><span className="text-gray-500">Presupuesto:</span><span className="font-bold">${Number(rep.totalBudget).toLocaleString()}</span></div>
                                    <div className="flex justify-between text-sm"><span className="text-gray-500">Ejecutado:</span><span className="font-bold text-red-600">${Number(rep.totalExecuted).toLocaleString()}</span></div>
                                    <div className="flex justify-between text-sm border-t border-gray-200 pt-2 mt-2"><span className="text-gray-500 font-bold">Saldo:</span><span className={`font-bold ${Number(rep.balance) >= 0 ? 'text-green-600' : 'text-red-600'}`}>${Number(rep.balance).toLocaleString()}</span></div>
                                </div>
                            </div>
                            <button onClick={() => { setSelectedReport(rep); setShowFinancialView(true); }} className="w-full bg-white text-gray-700 border border-gray-300 py-2 rounded font-bold hover:bg-gray-50 transition">Ver Detalle / Imprimir</button>
                        </div>
                    ))}
                </div>
            </div>
        )}

      </main>

      {/* ================================================================================== */}
      {/* MODALES                                                                            */}
      {/* ================================================================================== */}

      {/* MODAL CUIDADOR */}
      {selectedCaregiver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
                <div className="bg-blue-900 p-6 text-white sticky top-0 flex justify-between">
                    <div><h2 className="text-2xl font-bold">{selectedCaregiver.fullName}</h2><p className="text-blue-200 text-sm">ID: {selectedCaregiver.identification}</p></div>
                    <button onClick={()=>setSelectedCaregiver(null)} className="text-white text-2xl hover:text-red-300">✕</button>
                </div>
                <div className="p-6 space-y-6">
                    <div className="grid grid-cols-2 gap-4 text-sm bg-gray-50 p-4 rounded-lg border border-gray-100">
                        <div><p className="font-bold text-gray-500 text-xs">Teléfono</p><p>{selectedCaregiver.phone}</p></div>
                        <div><p className="font-bold text-gray-500 text-xs">Email</p><p>{selectedCaregiver.email}</p></div>
                        <div><p className="font-bold text-gray-500 text-xs">Experiencia</p><p>{selectedCaregiver.experienceYears} años</p></div>
                        <div><p className="font-bold text-gray-500 text-xs">Dirección</p><p>{selectedCaregiver.address}</p></div>
                    </div>
                    <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                        <h3 className="font-bold text-yellow-800 mb-2">📂 Documentos</h3>
                        {selectedCaregiver.senaFile ? selectedCaregiver.senaFile.split(',').map((f,i)=> (
                            <a key={i} href={`http://localhost:3000/uploads/${f.trim()}`} target="_blank" rel="noreferrer" className="block text-blue-600 underline text-sm mb-1">Documento {i+1}</a>
                        )) : <p className="text-gray-400 text-sm">Sin documentos.</p>}
                    </div>
                    {selectedCaregiver.status === 'PENDIENTE' && (
                        <div className="pt-4 border-t flex justify-end gap-3">
                            <button onClick={()=>handleStatusChange(selectedCaregiver.id, 'RECHAZADO')} className="px-5 py-2 border border-red-200 text-red-600 font-bold rounded hover:bg-red-50">Rechazar</button>
                            <button onClick={()=>handleStatusChange(selectedCaregiver.id, 'PRESELECCIONADO')} className="px-5 py-2 bg-blue-600 text-white font-bold rounded hover:bg-blue-700">Preseleccionar</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}

     {/* MODAL BITÁCORAS (CORREGIDO PARA TU ESTRUCTURA) */}
      {showLogsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl max-w-4xl w-full h-[85vh] flex flex-col shadow-2xl overflow-hidden">
                
                {/* ENCABEZADO DEL MODAL */}
                <div className="bg-slate-900 text-white p-5 flex justify-between items-center shadow-md z-10">
                    <div>
                        <h3 className="font-bold text-xl">Bitácoras del Paciente</h3>
                        <p className="text-slate-400 text-sm">Historial de cuidados y observaciones</p>
                    </div>
                    <button 
                        onClick={() => setShowLogsModal(false)} 
                        className="bg-slate-800 hover:bg-red-500 hover:text-white text-slate-300 w-10 h-10 rounded-full flex items-center justify-center transition-all text-xl font-bold"
                    >
                        ✕
                    </button>
                </div>

                {/* CUERPO DEL MODAL */}
                <div className="p-6 overflow-y-auto bg-slate-100 flex-1 space-y-6">
                    
                    {selectedCaregiverLogs.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                            <span className="text-4xl mb-2">📂</span>
                            <p className="text-lg font-medium">No hay registros disponibles.</p>
                        </div>
                    )}

                    {selectedCaregiverLogs.map((log, idx) => {
                        if (log.recordType === 'PROFESIONAL') {
                            let f = {}; try { f = JSON.parse(log.formData); } catch { f = {}; }
                            return (
                                <div key={idx} className="bg-emerald-50 rounded-xl shadow-sm border border-emerald-200 overflow-hidden mb-4">
                                    <div className="bg-emerald-100 px-5 py-3 border-b border-emerald-200 flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-emerald-600 text-white p-2 rounded-lg">🩺</div>
                                            <div>
                                                <h4 className="font-bold text-emerald-900 text-base">{new Date(log.date).toLocaleDateString()}</h4>
                                                <p className="text-xs text-emerald-700 font-medium">Visita Profesional | Hora: {log.time}</p>
                                            </div>
                                        </div>
                                        <span className="px-4 py-1.5 rounded-full text-xs font-bold uppercase bg-emerald-200 text-emerald-800">
                                            Atención Médica
                                        </span>
                                    </div>
                                    <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                        <div><p className="font-bold text-emerald-800">Motivo</p><p>{f.reason || 'No especificado'}</p></div>
                                        <div><p className="font-bold text-emerald-800">Diagnóstico</p><p className="text-red-600 font-medium">{f.diagnosisMain || 'No especificado'}</p></div>
                                        <div className="col-span-2"><p className="font-bold text-emerald-800">Conducta a seguir</p><p>{f.conduct || 'No especificada'}</p></div>
                                    </div>
                                </div>
                            );
                        }
                        // 1. INTENTAR LEER LA DATA
                        let data = {};
                        try {
                            data = JSON.parse(log.content);
                        } catch (e) {
                            data = { observations: log.content }; 
                        }

                     
                        const obs = data.observations || data.notes || "Sin observaciones detalladas.";
                        const alerta = data.alerts && Array.isArray(data.alerts) && data.alerts.length > 0;

                        return (
                            <div key={idx} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
                                
                                {/* A. ENCABEZADO */}
                                <div className="bg-slate-50 px-5 py-3 border-b border-slate-100 flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-blue-100 text-blue-700 p-2 rounded-lg">📅</div>
                                        <div>
                                            <h4 className="font-bold text-slate-800 text-base">
                                                {new Date(log.date).toLocaleDateString()}
                                            </h4>
                                            <p className="text-xs text-slate-500 font-medium">
                                                Hora: {new Date(log.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Etiqueta de Estado General */}
                                    <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border ${
                                        alerta || data.generalState === 'Peor'
                                        ? 'bg-red-50 text-red-600 border-red-200 animate-pulse' 
                                        : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                                    }`}>
                                        {data.generalState || 'Estable'}
                                    </span>
                                </div>

                                {/* B. GRILLA DE INFORMACIÓN */}
                                <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6">

                                    {/* 1. ESTADO GENERAL Y ALERTAS */}
                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                        <h5 className="font-bold text-slate-700 mb-3 text-sm uppercase">👤 Estado General</h5>
                                        <div className="space-y-2 text-sm">
                                            <div className="flex justify-between border-b border-slate-200 pb-1">
                                                <span className="text-slate-500">Nivel de Conciencia:</span> 
                                                <span className="font-medium text-slate-800">{data.alertLevel || 'No reportado'}</span>
                                            </div>
                                            <div className="flex justify-between border-b border-slate-200 pb-1">
                                                <span className="text-slate-500">Movilidad:</span> 
                                                <span className="font-medium text-slate-800">{data.mobility || 'No reportado'}</span>
                                            </div>
                                            {/* Mostrar Alertas si existen */}
                                            {alerta && (
                                                <div className="mt-2 bg-red-100 p-2 rounded text-red-700 text-xs">
                                                    <strong>⚠️ Alertas:</strong> {data.alerts.join(', ')} <br/>
                                                    <span className="italic">{data.alertDesc}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* 2. CUIDADOS BÁSICOS (Higiene, Piel, Ropa) */}
                                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                                        <h5 className="font-bold text-blue-800 mb-3 text-sm uppercase">🚿 Higiene y Confort</h5>
                                        <div className="flex flex-wrap gap-2 text-xs">
                                            <span className={`px-2 py-1 rounded border ${data.hygiene === 'Sí' ? 'bg-white border-blue-200 text-blue-700' : 'bg-gray-100 text-gray-400'}`}>
                                                {data.hygiene === 'Sí' ? '✅ Higiene Realizada' : '⬜ Sin Higiene'}
                                            </span>
                                            <span className={`px-2 py-1 rounded border ${data.clothes === 'Sí' ? 'bg-white border-blue-200 text-blue-700' : 'bg-gray-100 text-gray-400'}`}>
                                                {data.clothes === 'Sí' ? '✅ Cambio Ropa' : '⬜ Ropa'}
                                            </span>
                                            <span className={`px-2 py-1 rounded border ${data.skin === 'Sí' ? 'bg-white border-blue-200 text-blue-700' : 'bg-gray-100 text-gray-400'}`}>
                                                {data.skin === 'Sí' ? '✅ Piel Hidratada' : '⬜ Piel'}
                                            </span>
                                            <span className={`px-2 py-1 rounded border ${data.position === 'Sí' ? 'bg-white border-blue-200 text-blue-700' : 'bg-gray-100 text-gray-400'}`}>
                                                {data.position === 'Sí' ? '✅ Cambios Posición' : '⬜ Posición'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* 3. ALIMENTACIÓN Y MEDICAMENTOS */}
                                    <div className="col-span-1 md:col-span-2 bg-orange-50 p-4 rounded-xl border border-orange-100 grid grid-cols-1 md:grid-cols-2 gap-4">
                                        
                                        {/* Columna Alimentación */}
                                        <div>
                                            <h5 className="font-bold text-orange-800 mb-2 text-sm uppercase">🍽️ Alimentación</h5>
                                            <div className="text-sm space-y-1">
                                                <p><span className="font-bold text-orange-900">Ingesta:</span> {data.feeding || '-'}</p>
                                                <p><span className="font-bold text-orange-900">Hidratación:</span> {data.hydration || '-'}</p>
                                                {data.foodObs && <p className="text-xs text-orange-800 italic bg-white/50 p-1 rounded">"{data.foodObs}"</p>}
                                            </div>
                                        </div>

                                        {/* Columna Medicamentos */}
                                        <div>
                                            <h5 className="font-bold text-orange-800 mb-2 text-sm uppercase">💊 Medicamentos</h5>
                                            <div className="text-sm space-y-1">
                                                <p><span className="font-bold text-orange-900">Suministrados:</span> {data.medsGiven || '-'}</p>
                                                {data.medsReason && <p className="text-xs text-red-600 bg-red-50 p-1 rounded border border-red-100">⚠️ No dados por: {data.medsReason}</p>}
                                            </div>
                                        </div>
                                    </div>

                                    {/* 4. OBSERVACIONES Y FIRMA */}
                                    <div className="col-span-1 md:col-span-2 bg-yellow-50 p-4 rounded-xl border border-yellow-100">
                                        <h5 className="font-bold text-slate-700 mb-1 text-sm uppercase">📝 Observaciones Generales</h5>
                                        
                                        {/* Observaciones */}
                                        <p className="text-slate-600 italic bg-white p-3 rounded border border-slate-200 text-sm leading-relaxed mb-4">
                                            "{obs}"
                                        </p>

                                        {/* Firma */}
                                        <div className="flex justify-end items-center gap-2 border-t border-yellow-200 pt-2">
                                            <span className="text-xs text-slate-400 uppercase tracking-wider">Firma:</span>
                                            {data.signature ? (
                                                <span className="font-handwriting text-lg text-blue-900 font-bold px-2 border-b border-blue-900">
                                                    {data.signature}
                                                </span>
                                            ) : <span className="text-xs text-gray-400">Sin firma</span>}
                                        </div>
                                    </div>

                                </div>
                            </div>
                        );
                    })}

                </div>
            </div>
        </div>
      )}

      {/* MODAL ASIGNAR */}
      {showAssignModal && caregiverToAssign && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
             <div className="bg-white p-6 rounded shadow-lg max-w-sm w-full animate-fadeIn">
                <h3 className="font-bold mb-4 text-lg">Asignar a {caregiverToAssign.fullName}</h3>
                <div className="max-h-60 overflow-y-auto border rounded border-gray-200">
                    {patients.filter(p=>!p.caregiverId).length === 0 && <p className="text-gray-400 text-sm p-4 text-center">No hay pacientes disponibles.</p>}
                    {patients.filter(p=>!p.caregiverId).map(p=>(
                        <button key={p.id} onClick={()=>handleAssignPatient(p.id)} className="block w-full text-left p-3 hover:bg-blue-50 border-b last:border-0 transition">{p.fullName}</button>
                    ))}
                </div>
                <button onClick={()=>setShowAssignModal(false)} className="mt-4 text-red-500 w-full text-center hover:bg-red-50 py-2 rounded">Cancelar</button>
             </div>
          </div>
      )}
      {/* MODAL CREAR PACIENTE MEJORADO (Con Selects Geográficos + Campo Email) */}
      {showPatientForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
              <div className="bg-white p-6 rounded-lg w-full max-w-lg shadow-2xl animate-fadeIn max-h-[90vh] overflow-y-auto">
                  <h3 className="font-bold mb-4 text-xl border-b pb-2">Nuevo Paciente - Támesis</h3>
                  <form onSubmit={handleCreatePatient} className="space-y-3">
                      <input 
                        placeholder="Nombre Completo" 
                        className="border w-full p-2 rounded" 
                        value={newPatientData.fullName || ''} 
                        onChange={e=>setNewPatientData({...newPatientData, fullName:e.target.value})} 
                        required
                      />

                      {/* 👇 CAMPO NUEVO Y OBLIGATORIO PARA ENVIAR CÓDIGO POR CORREO 👇 */}
                      <input 
                        type="email" 
                        placeholder="Correo Electrónico (para enviarle su código de acceso) *" 
                        className="border w-full p-2 rounded bg-blue-50/40" 
                        value={newPatientData.email || ''} 
                        onChange={e=>setNewPatientData({...newPatientData, email:e.target.value})} 
                        required
                      />
                      
                      <div className="flex gap-2">
                          <input 
                            placeholder="Edad" 
                            type="number" 
                            className="border w-full p-2 rounded" 
                            value={newPatientData.age || ''} 
                            onChange={e=>setNewPatientData({...newPatientData, age:e.target.value})} 
                            required 
                          />
                          <select 
                            className="border w-full p-2 rounded bg-white" 
                            value={newPatientData.stratum || ''} 
                            onChange={e=>setNewPatientData({...newPatientData, stratum:e.target.value})} 
                            required
                          >
                             <option value="">Estrato...</option>
                             <option value="1">1</option><option value="2">2</option><option value="3">3</option>
                             <option value="4">4</option><option value="5">5</option><option value="6">6</option>
                          </select>
                      </div>
                      
                      <input 
                        placeholder="Teléfono" 
                        className="border w-full p-2 rounded" 
                        value={newPatientData.contactPhone || ''} 
                        onChange={e=>setNewPatientData({...newPatientData, contactPhone:e.target.value})} 
                      />
                      
                      <select 
                        className="border w-full p-2 rounded bg-white" 
                        value={newPatientData.diagnosis || ''} 
                        onChange={e=>setNewPatientData({...newPatientData, diagnosis:e.target.value})} 
                        required
                      >
                          <option value="">Seleccione Diagnóstico...</option>
                          {COMMON_DISEASES.map((d, i) => <option key={i} value={d}>{d}</option>)}
                      </select>

                      {/* --- SECCIÓN GEOGRÁFICA --- */}
                      <div className="bg-gray-50 p-3 rounded border border-gray-200 space-y-2">
                          <h4 className="text-xs font-bold text-gray-500 uppercase">Ubicación en Támesis</h4>
                          <select 
                            className="border w-full p-2 rounded bg-white" 
                            value={newPatientData.zoneCategory || ''} 
                            onChange={e=>setNewPatientData({...newPatientData, zoneCategory:e.target.value, zoneDetail: ''})} 
                            required
                          >
                              <option value="">Seleccione Zona Principal...</option>
                              {Object.keys(TAMESIS_ZONES).map(zone => (
                                  <option key={zone} value={zone}>{zone}</option>
                              ))}
                          </select>

                          <select 
                            className="border w-full p-2 rounded bg-white" 
                            value={newPatientData.zoneDetail || ''} 
                            onChange={e=>setNewPatientData({...newPatientData, zoneDetail:e.target.value})} 
                            required 
                            disabled={!newPatientData.zoneCategory}
                          >
                              <option value="">Seleccione Corregimiento/Vereda/Barrio...</option>
                              {newPatientData.zoneCategory && TAMESIS_ZONES[newPatientData.zoneCategory].map(detail => (
                                  <option key={detail} value={detail}>{detail}</option>
                              ))}
                          </select>
                          
                          <input 
                            placeholder="Dirección exacta o puntos de referencia" 
                            className="border w-full p-2 rounded" 
                            value={newPatientData.address || ''} 
                            onChange={e=>setNewPatientData({...newPatientData, address:e.target.value})} 
                            required
                          />
                      </div>

                      <textarea 
                        placeholder="Instrucciones de cuidado específicas..." 
                        className="border w-full p-2 rounded focus:ring-2 outline-none" 
                        value={newPatientData.careInstructions || ''} 
                        onChange={e=>setNewPatientData({...newPatientData, careInstructions:e.target.value})} 
                        rows="3" 
                      />
                      
                      <div>
                          <label className="text-xs font-bold text-gray-500 uppercase">Historia Clínica Previa </label>
                          <input 
                              type="file" 
                              className="w-full border p-2 rounded text-sm" 
                              onChange={(e) => setNewPatientData({...newPatientData, fileHistory: e.target.files[0]})} 
                          />
                      </div>

                      <div className="flex gap-2 pt-2">
                          <button type="button" onClick={()=>setShowPatientForm(false)} className="flex-1 bg-gray-200 text-gray-700 font-bold p-2 rounded">Cancelar</button>
                          <button type="submit" className="flex-1 bg-green-600 text-white font-bold p-2 rounded">Guardar</button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {/* MODAL CREAR PROFESIONAL */}
{showProForm && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
        <div className="bg-white rounded-xl w-full max-w-md shadow-2xl p-6 animate-fadeIn overflow-y-auto max-h-[90vh]">
            <h2 className="text-xl font-bold mb-4 border-b pb-2">Registrar Profesional</h2>
            <form onSubmit={handleCreateProfessional} className="space-y-4">
                <input type="text" placeholder="Nombre Completo" className="w-full border p-2 rounded focus:ring-2 outline-none" value={newProData.fullName} onChange={e=>setNewProData({...newProData, fullName: e.target.value})} required />
                
                <div className="grid grid-cols-2 gap-2">
                    <input type="text" placeholder="Cédula" className="w-full border p-2 rounded focus:ring-2 outline-none" value={newProData.identification} onChange={e=>setNewProData({...newProData, identification: e.target.value})} required />
                    <input type="text" placeholder="Teléfono" className="w-full border p-2 rounded focus:ring-2 outline-none" value={newProData.phone} onChange={e=>setNewProData({...newProData, phone: e.target.value})} required />
                </div>
                
                <input type="email" placeholder="Correo Electrónico" className="w-full border p-2 rounded focus:ring-2 outline-none" value={newProData.email} onChange={e=>setNewProData({...newProData, email: e.target.value})} required />
                
                {/* NUEVO: Campo de Cargo */}
                <input type="text" placeholder="Cargo (Ej: Médico, Enfermero)" className="w-full border p-2 rounded focus:ring-2 outline-none" value={newProData.position} onChange={e=>setNewProData({...newProData, position: e.target.value})} required />
                
                {/* NUEVO: Subida de Hoja de Vida */}
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">Soporte Hoja de Vida</label>
                    <input type="file" className="w-full border p-2 rounded text-sm" onChange={e=>setNewProData({...newProData, resumeFile: e.target.files[0]})} />
                </div>

                <div className="flex gap-2 pt-2">
                    <button type="button" onClick={()=>setShowProForm(false)} className="w-full bg-gray-200 text-gray-700 py-2 rounded font-bold hover:bg-gray-300">Cancelar</button>
                    <button type="submit" className="w-full bg-emerald-600 text-white py-2 rounded font-bold hover:bg-emerald-700">Registrar</button>
                </div>
            </form>
        </div>
    </div>
)}

      {/* MODAL FINANCIERO FORM */}
      {showFinancialForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fadeIn">
              <div className="bg-white rounded-xl w-full max-w-5xl h-[95vh] flex flex-col shadow-2xl overflow-hidden">
                  <div className="bg-blue-800 text-white p-4 flex justify-between items-center"><h2 className="font-bold text-lg">Nuevo Reporte Financiero</h2><button onClick={()=>setShowFinancialForm(false)} className="text-white hover:text-red-300 text-2xl font-bold">✕</button></div>
                  <form onSubmit={handleCreateFinancialReport} className="flex-1 overflow-y-auto p-8 bg-gray-50 space-y-6">
                      <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div><label className="text-xs font-bold text-gray-400 uppercase">Periodo</label><input type="text" className="w-full border p-2 rounded mt-1 focus:ring-2 focus:ring-blue-500 outline-none" required value={financialData.period} onChange={e=>setFinancialData({...financialData, period: e.target.value})} placeholder="Ej: Octubre 2023" /></div>
                          <div><label className="text-xs font-bold text-gray-400 uppercase">EPS</label><input type="text" className="w-full border p-2 rounded mt-1 bg-gray-100 text-gray-600" readOnly value={financialData.epsName} /></div>
                          <div><label className="text-xs font-bold text-gray-400 uppercase">Responsable</label><input type="text" className="w-full border p-2 rounded mt-1 bg-gray-100 text-gray-600" readOnly value={financialData.responsible} /></div>
                      </div>
                      <div className="bg-blue-50 p-5 rounded-lg border border-blue-100 shadow-sm">
                          <h3 className="font-bold text-blue-800 mb-3 border-b border-blue-200 pb-2">PRESUPUESTO DEL PERIODO</h3>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                              <div><label className="block text-sm font-bold text-gray-600 mb-1">Presupuesto Aprobado ($)</label><input type="number" className="w-full border p-3 rounded text-lg font-bold text-gray-700 focus:ring-2 focus:ring-blue-500 outline-none" required value={financialData.totalBudget} onChange={e=>setFinancialData({...financialData, totalBudget: e.target.value})} placeholder="0" /></div>
                              <div><label className="block text-sm font-bold text-gray-600 mb-1">Total Ejecutado</label><div className="w-full bg-white border border-gray-200 p-3 rounded text-lg font-bold text-red-600 shadow-inner">${totalExecuted.toLocaleString()}</div></div>
                              <div><label className="block text-sm font-bold text-gray-600 mb-1">Saldo Disponible</label><div className={`w-full bg-white border border-gray-200 p-3 rounded text-lg font-bold shadow-inner ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>${balance.toLocaleString()}</div></div>
                          </div>
                      </div>
                      <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
                          <h3 className="font-bold text-gray-800 mb-4 border-b pb-2">DETALLE DE EGRESOS</h3>
                          <div className="space-y-4">
                              {financialData.expenses.map((item, idx) => (
                                  <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center border-b border-gray-100 pb-4 last:border-0 hover:bg-gray-50 transition p-2 rounded">
                                      <div className="md:col-span-3"><p className="font-bold text-sm text-gray-700">{item.category}</p></div>
                                      <div className="md:col-span-3"><input type="number" className="w-full border p-2 rounded font-mono focus:ring-1 focus:ring-blue-500 outline-none" placeholder="0" value={item.value} onChange={e => handleExpenseChange(idx, 'value', e.target.value)} /></div>
                                      <div className="md:col-span-3"><input type="text" className="w-full border p-2 rounded text-sm focus:ring-1 focus:ring-blue-500 outline-none" placeholder="Factura / Ref" value={item.support} onChange={e => handleExpenseChange(idx, 'support', e.target.value)} /></div>
                                      <div className="md:col-span-3"><input type="text" className="w-full border p-2 rounded text-sm focus:ring-1 focus:ring-blue-500 outline-none" placeholder="Observación" value={item.note} onChange={e => handleExpenseChange(idx, 'note', e.target.value)} /></div>
                                  </div>
                              ))}
                          </div>
                      </div>
                      <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 space-y-4">
                          <div><label className="font-bold text-sm text-gray-700">Observación General</label><textarea className="w-full border p-2 rounded mt-1 focus:ring-2 focus:ring-blue-500 outline-none" rows="2" value={financialData.generalObs} onChange={e=>setFinancialData({...financialData, generalObs: e.target.value})}></textarea></div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                              <div><label className="text-xs font-bold text-gray-500 uppercase">Elaboró</label><input className="w-full border p-2 rounded mt-1 focus:ring-2 focus:ring-blue-500 outline-none" value={financialData.elaboratedBy} onChange={e=>setFinancialData({...financialData, elaboratedBy: e.target.value})} /></div>
                              <div><label className="text-xs font-bold text-gray-500 uppercase">Revisó</label><input className="w-full border p-2 rounded mt-1 focus:ring-2 focus:ring-blue-500 outline-none" value={financialData.reviewedBy} onChange={e=>setFinancialData({...financialData, reviewedBy: e.target.value})} /></div>
                          </div>
                      </div>
                  </form>
                  <div className="p-4 bg-white border-t flex justify-end gap-3 z-10 shadow-lg">
                      <button onClick={()=>setShowFinancialForm(false)} className="px-6 py-2 bg-gray-200 text-gray-700 font-bold rounded hover:bg-gray-300 transition">Cancelar</button>
                      <button onClick={handleCreateFinancialReport} className="px-6 py-2 bg-blue-600 text-white font-bold rounded shadow hover:bg-blue-700 transition">Guardar Reporte</button>
                  </div>
              </div>
          </div>
      )}

      {/* MODAL VIEW PRINT */}
      {showFinancialView && selectedReport && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
              <div className="bg-white rounded-xl w-full max-w-4xl h-[95vh] flex flex-col shadow-2xl">
                  <div className="bg-gray-800 text-white p-4 flex justify-between items-center">
                      <h3 className="font-bold text-lg">Vista de Reporte</h3>
                      <div className="flex gap-3">
                          <button onClick={handlePrint} className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-1 rounded font-bold shadow transition flex items-center gap-2"><span>🖨️</span> Imprimir</button>
                          <button onClick={()=>setShowFinancialView(false)} className="text-white hover:text-red-400 text-xl font-bold px-2">✕</button>
                      </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-8 bg-gray-200">
                      <div id="printable-area" className="bg-white p-12 shadow-lg mx-auto max-w-[21cm] min-h-[29.7cm] text-black box-border">
                          <div className="text-center border-b-2 border-black pb-4 mb-6"><h1 className="text-2xl font-bold uppercase tracking-wider">REPORTE FINANCIERO EPS</h1><p className="text-sm mt-1">Ref: <strong>{selectedReport.reference}</strong></p></div>
                          <div className="grid grid-cols-2 gap-4 mb-8 text-sm border-b border-gray-300 pb-6"><p><strong>Periodo:</strong> {selectedReport.period}</p><p><strong>EPS:</strong> {selectedReport.epsName}</p><p><strong>Responsable:</strong> {selectedReport.responsible}</p><p><strong>Fecha:</strong> {new Date(selectedReport.date).toLocaleDateString()}</p></div>
                          <div className="mb-10"><h3 className="font-bold border-b border-black mb-3 text-sm uppercase">1. Resumen Presupuestal</h3><table className="w-full text-sm border-collapse border border-gray-400"><tbody><tr><td className="p-2 border border-gray-300 bg-gray-50 w-1/2">Presupuesto Total Aprobado:</td><td className="p-2 border border-gray-300 text-right font-bold text-base">${Number(selectedReport.totalBudget).toLocaleString()}</td></tr><tr><td className="p-2 border border-gray-300 bg-gray-50">Total Ejecutado:</td><td className="p-2 border border-gray-300 text-right font-bold text-red-600 text-base">${Number(selectedReport.totalExecuted).toLocaleString()}</td></tr><tr className="bg-gray-100"><td className="p-2 border border-gray-300 font-bold uppercase">Saldo Disponible:</td><td className="p-2 border border-gray-300 text-right font-bold text-lg text-black">${Number(selectedReport.balance).toLocaleString()}</td></tr></tbody></table></div>
                          <div className="mb-10"><h3 className="font-bold border-b border-black mb-3 text-sm uppercase">2. Detalle de Egresos</h3><table className="w-full text-xs border-collapse border border-gray-400"><thead><tr className="bg-gray-200"><th className="border border-gray-400 p-2 text-left">Concepto</th><th className="border border-gray-400 p-2 text-right">Valor</th><th className="border border-gray-400 p-2 text-left">Soporte</th><th className="border border-gray-400 p-2 text-left">Nota</th></tr></thead><tbody>{JSON.parse(selectedReport.expensesData).map((ex, i) => (<tr key={i}><td className="border border-gray-300 p-2 font-medium">{ex.category}</td><td className="border border-gray-300 p-2 text-right">${Number(ex.value).toLocaleString()}</td><td className="border border-gray-300 p-2 text-gray-600">{ex.support || '-'}</td><td className="border border-gray-300 p-2 text-gray-600">{ex.note || '-'}</td></tr>))}</tbody></table></div>
                          <div className="mb-12"><h3 className="font-bold border-b border-black mb-3 text-sm uppercase">3. Observación General</h3><div className="border border-gray-400 p-4 min-h-[80px] text-sm bg-gray-50 rounded">{selectedReport.generalObs || "Sin observaciones."}</div></div>
                          <div className="grid grid-cols-2 gap-16 mt-20 text-center text-sm"><div className="flex flex-col items-center"><div className="border-b border-black w-full mb-2"></div><p className="font-bold uppercase">{selectedReport.elaboratedBy}</p><p className="text-gray-500">Elaboró</p></div><div className="flex flex-col items-center"><div className="border-b border-black w-full mb-2"></div><p className="font-bold uppercase">{selectedReport.reviewedBy}</p><p className="text-gray-500">Revisó y Aprobó</p></div></div>
                      </div>
                  </div>
              </div>
          </div>
      )}
      {/* RENDERIZAR EL NUEVO MODAL DE DETALLE */}
      <ApplicantDetailModal 
         isOpen={showDetailModal}
         onClose={() => setShowDetailModal(false)}
         candidate={selectedCandidate}
         onAction={handleDetailAction}
      />
  {/* MODAL: PERFIL Y VISITAS DEL PROFESIONAL MEDICO */}
      {showVisitsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fadeIn">
              <div className="bg-white rounded-xl max-w-5xl w-full h-[90vh] flex flex-col shadow-2xl">
                  <div className="bg-emerald-800 text-white p-5 flex justify-between items-center shrink-0">
                      <div>
                          {/* AQUÍ ESTÁ LA CORRECCIÓN: MdMedicalServices en lugar del anterior */}
                          <h3 className="font-bold text-xl flex items-center gap-2"><MdMedicalServices /> Perfil Profesional y Visitas</h3>
                          <p className="text-sm text-emerald-200">Dr(a). {selectedProName}</p>
                      </div>
                      <button onClick={()=>setShowVisitsModal(false)} className="text-2xl hover:text-red-300"><MdClose /></button>
                  </div>
                  
                  <div className="p-6 overflow-y-auto bg-gray-50 flex-1 space-y-6">
                      
  {/* Datos del Médico Completos */}
<div className="bg-white p-5 rounded-lg border border-emerald-100 shadow-sm grid grid-cols-1 md:grid-cols-5 gap-4">
    <div className="md:col-span-5 border-b border-gray-100 pb-2 mb-2">
        <h4 className="font-bold text-emerald-800 flex items-center gap-2"><MdPerson /> Perfil del Profesional</h4>
    </div>
    <div>
        <p className="text-xs text-gray-500 font-bold uppercase">Nombre</p>
        <p className="text-sm font-medium">{selectedProName}</p>
    </div>
    <div>
        <p className="text-xs text-gray-500 font-bold uppercase">Cargo</p>
        {/* AQUÍ ESTÁ EL ARREGLO: selectedPro?.position */}
        <p className="text-sm font-medium text-emerald-700 bg-emerald-50 inline-block px-2 py-0.5 rounded">
            {selectedPro?.position || 'No registrado'}
        </p>
    </div>
    <div>
        <p className="text-xs text-gray-500 font-bold uppercase">Contacto</p>
        {/* AQUÍ ESTÁ EL ARREGLO: selectedPro?.phone */}
        <p className="text-sm font-medium">
            {selectedPro?.phone || 'N/A'}
        </p>
    </div>
    {/* 👇 AQUÍ ESTÁ LA NUEVA CALIFICACIÓN DINÁMICA 👇 */}
    {(() => {
        const evaluatedVisits = selectedProVisits.filter(v => v.rating && Number(v.rating) > 0);
        const count = evaluatedVisits.length;
        const sum = evaluatedVisits.reduce((acc, v) => acc + Number(v.rating), 0);
        const calculatedAvg = count > 0 ? (sum / count).toFixed(1) : (selectedPro?.averageRating || 0);
        const totalCount = count > 0 ? count : (selectedPro?.totalEvaluations || 0);

        return (
            <div>
                <p className="text-xs text-gray-500 font-bold uppercase">Calificación</p>
                <div className="flex items-center gap-1 mt-1">
                    <MdStar className="text-amber-500 text-lg" />
                    <span className="text-sm font-bold text-gray-800">
                        {Number(calculatedAvg) > 0 ? calculatedAvg : 'Sin evaluar'}
                    </span>
                    <span className="text-xs text-gray-400 font-medium">
                        ({totalCount})
                    </span>
                </div>
            </div>
        );
    })()}
    {/* 👆 FIN DE LA CALIFICACIÓN DINÁMICA 👆 */}
    {/* AQUÍ ESTÁ LA NUEVA ACTUALIZACIÓN: Calificación del profesional */}
    <div>
        <p className="text-xs text-gray-500 font-bold uppercase">Calificación</p>
        <div className="flex items-center gap-1 mt-1">
            <MdStar className="text-amber-500 text-lg" />
            <span className="text-sm font-bold text-gray-800">
                {selectedPro?.averageRating > 0 ? selectedPro.averageRating : 'Sin evaluar'}
            </span>
            <span className="text-xs text-gray-400 font-medium">
                ({selectedPro?.totalEvaluations || 0})
            </span>
        </div>
    </div>
    <div>
        <p className="text-xs text-gray-500 font-bold uppercase">Documentos</p>
        <div className="flex flex-col gap-1 mt-1">
            {/* AQUÍ ESTÁ EL ARREGLO: selectedPro?.resumeFile */}
            {selectedPro?.resumeFile ? (
                <a href={`http://localhost:3000/uploads/${selectedPro.resumeFile}`} target="_blank" rel="noreferrer" className="text-xs text-blue-600 font-bold hover:underline">📄 Ver Hoja de Vida</a>
            ) : <span className="text-xs text-gray-400">Sin Hoja de Vida</span>}
        </div>
    </div>
</div>
                      <div className="space-y-4">
                        {selectedProVisits.map((v, i) => {
                            let f = {}; try { f = JSON.parse(v.formData); } catch { f = {}; }
                            return (
                              <div key={i} className="bg-white p-5 rounded-lg shadow-sm border border-emerald-100 hover:shadow-md transition">
                                  <div className="flex justify-between items-center border-b pb-3 mb-3">
                                      <span className="font-bold text-gray-800 flex items-center gap-2"><MdCalendarToday className="text-emerald-600"/> {new Date(v.date).toLocaleDateString()} - {v.time}</span>
                                      <span className="bg-emerald-100 text-emerald-800 text-xs px-3 py-1 rounded-full font-bold">Atención Domiciliaria</span>
                                  </div>
                                  
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
                                      <div className="bg-gray-50 p-4 rounded border border-gray-100">
                                          <h5 className="font-bold text-xs text-gray-500 uppercase flex items-center gap-1 mb-2"><MdPerson /> Paciente</h5>
                                          <p className="text-sm font-medium text-gray-800">{v.patientName || 'No registrado'}</p>
                                      </div>
                                      <div className="md:col-span-2 bg-gray-50 p-4 rounded border border-gray-100">
                                          <h5 className="font-bold text-xs text-gray-500 uppercase flex items-center gap-1 mb-2"><MdHealthAndSafety /> Cuadro Clínico</h5>
                                          <div className="grid grid-cols-2 gap-4 text-sm">
                                              <div><span className="text-gray-500 block">Motivo de consulta:</span> <span className="font-medium">{f.reason || '-'}</span></div>
                                              <div><span className="text-gray-500 block">Diagnóstico:</span> <span className="font-medium text-red-600">{f.diagnosisMain || '-'}</span></div>
                                          </div>
                                      </div>
                                  </div>

                                  <div className="bg-blue-50 p-4 rounded border border-blue-100">
                                      <h5 className="font-bold text-xs text-blue-800 uppercase flex items-center gap-1 mb-2"><MdEditNote /> Conducta / Plan a seguir</h5>
                                      <p className="text-sm text-gray-700">{f.conduct || 'Sin observaciones registradas.'}</p>
                                  </div>
                                  {/* 👇 NUEVO BLOQUE: CALIFICACIÓN Y COMENTARIOS DEL CUIDADOR 👇 */}
                                  {v.rating ? (
                                      <div className="bg-amber-50 p-4 rounded border border-amber-200">
                                          <h5 className="font-bold text-xs text-amber-900 uppercase flex items-center gap-1 mb-2">
                                              <MdStar className="text-amber-500 text-lg" /> Evaluación del Cuidador
                                          </h5>
                                          <div className="flex items-center gap-1 mb-2">
                                              {/* Pintar las 5 estrellas dinámicamente según la calificación */}
                                              {[...Array(5)].map((_, index) => (
                                                  <MdStar key={index} className={`text-xl ${index < v.rating ? 'text-amber-500' : 'text-amber-100'}`} />
                                              ))}
                                              <span className="text-sm font-black text-amber-800 ml-2">{v.rating}.0 / 5.0</span>
                                          </div>
                                          {v.evalComments && (
                                              <div className="mt-2 bg-white p-3 rounded border border-amber-100 shadow-sm relative">
                                                  <p className="text-sm text-gray-700 italic">"{v.evalComments}"</p>
                                              </div>
                                          )}
                                      </div>
                                  ) : (
                                      <div className="bg-gray-50 p-3 rounded border border-gray-200 flex items-center gap-2 text-gray-500">
                                          <MdStar className="text-gray-400 text-lg" />
                                          <span className="text-xs font-medium">Esta visita aún no ha sido calificada por el cuidador.</span>
                                      </div>
                                  )}
                                  {/* 👆 FIN DEL NUEVO BLOQUE 👆 */}
                              </div>
                            )
                        })}
                      </div>
                  </div>
              </div>
          </div>
      )}
                    {/* ======================================================== */}
{/* MODAL: PERFIL COMPLETO CUIDADOR/MÉDICO                   */}
{/* ======================================================== */}
{selectedCaregiver && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 animate-fadeIn p-4">
    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
      
      <div className="bg-blue-600 p-4 text-white flex justify-between items-center">
        <h2 className="text-xl font-bold">Perfil del Activo</h2>
        <button onClick={() => setSelectedCaregiver(null)} className="text-white hover:text-blue-200 font-bold text-xl">&times;</button>
      </div>

      <div className="p-6 overflow-y-auto">
        <div className="flex items-center gap-4 mb-6">
          <div className="text-5xl">👤</div>
          <div>
            <h3 className="text-2xl font-bold text-gray-800">{selectedCaregiver.fullName}</h3>
            <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm font-bold">ID: {selectedCaregiver.identification}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h4 className="font-bold text-gray-700 mb-2">Datos de Acceso</h4>
            <p className="text-sm text-gray-600"><strong>Código:</strong> {selectedCaregiver.accessCode}</p>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h4 className="font-bold text-gray-700 mb-2">Estado de Asignación</h4>
            <p className="text-sm text-gray-600">
              <strong>Paciente:</strong> {
                patients.find(p => String(p.caregiverId) === String(selectedCaregiver.id))?.fullName || 'Sin paciente asignado'
              }
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 bg-gray-50 border-t border-gray-200 text-right">
        <button onClick={() => setSelectedCaregiver(null)} className="bg-gray-300 text-gray-800 px-4 py-2 rounded font-bold hover:bg-gray-400 transition">Cerrar</button>
      </div>
    </div>
  </div>
)}                                {/* MODAL: PERFIL COMPLETO DEL PACIENTE */}
      {selectedPatient && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 animate-fadeIn p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
            
            <div className="bg-green-700 p-5 text-white flex justify-between items-center shrink-0">
              <h2 className="text-xl font-bold flex items-center gap-2"><MdElderly className="text-2xl" /> Perfil Detallado del Paciente</h2>
              <button onClick={() => setSelectedPatient(null)} className="text-white hover:text-green-200 text-2xl"><MdClose /></button>
            </div>

            <div className="p-8 overflow-y-auto bg-gray-50 flex-1">
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm mb-6 flex flex-col md:flex-row items-center gap-6">
                <div className="w-24 h-24 bg-green-100 text-green-700 rounded-full flex items-center justify-center text-4xl shadow-inner">
                  <MdElderly />
                </div>
                <div>
                  <h3 className="text-3xl font-bold text-gray-800 mb-1">{selectedPatient.fullName}</h3>
                  <div className="flex gap-3 text-sm">
                    <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full font-bold">Edad: {selectedPatient.age} años</span>
                    <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full font-bold">ID: {selectedPatient.id}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                  <h4 className="font-bold text-gray-700 mb-4 border-b pb-2 flex items-center gap-2"><MdPerson /> Información Demográfica</h4>
                  <ul className="text-sm space-y-3 text-gray-600">
                    <li className="flex justify-between"><strong className="text-gray-500">Estrato:</strong> <span className="font-medium text-gray-900">{selectedPatient.stratum || 'No registrado'}</span></li>
                    <li className="flex justify-between"><strong className="text-gray-500">Dirección:</strong> <span className="font-medium text-gray-900">{selectedPatient.address || 'No registrado'}</span></li>
                    <li className="flex justify-between"><strong className="text-gray-500">Teléfono:</strong> <span className="font-medium text-gray-900">{selectedPatient.phone || selectedPatient.contactPhone || 'No registrado'}</span></li>
                  </ul>
                </div>

                <div className="bg-blue-50 p-6 rounded-xl border border-blue-200 shadow-sm">
                  <h4 className="font-bold text-blue-900 mb-4 border-b border-blue-200 pb-2 flex items-center gap-2"><MdHealthAndSafety /> Información Clínica y Cuidados</h4>
                  <ul className="text-sm space-y-3 text-blue-900">
                    <li className="flex flex-col gap-1"><strong className="text-blue-700">Diagnóstico Principal:</strong> <span className="font-medium bg-white px-2 py-1 rounded border border-blue-100">{selectedPatient.diagnosis || 'Sin diagnóstico'}</span></li>
                    <li className="flex flex-col gap-1 mt-2"><strong className="text-blue-700">Cuidador Asignado:</strong> 
                       <span className="font-medium bg-white px-2 py-1 rounded border border-blue-100">
                         {caregivers.find(c => String(c.id) === String(selectedPatient.caregiverId))?.fullName || 'Ninguno asignado'}
                       </span>
                    </li>
                  </ul>
                </div>

                <div className="md:col-span-2 bg-yellow-50 p-6 rounded-xl border border-yellow-200 shadow-sm">
                  <h4 className="font-bold text-yellow-800 mb-3 flex items-center gap-2"><MdEditNote /> Instrucciones Particulares de Cuidado</h4>
                  <p className="text-sm text-gray-700 bg-white p-4 rounded-lg border border-yellow-100">
                    {selectedPatient.careInstructions || 'No se han registrado instrucciones especiales para este paciente.'}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="p-4 bg-white border-t border-gray-200 text-right shrink-0">
              <button onClick={() => setSelectedPatient(null)} className="bg-gray-200 text-gray-800 px-6 py-2 rounded-lg font-bold hover:bg-gray-300 transition">Cerrar Perfil</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// --- COMPONENTE TABS ---
function TabBtn({active, onClick, label, count, icon}) {
    return (
        <button onClick={onClick} className={`whitespace-nowrap py-4 px-4 border-b-2 flex items-center gap-2 transition duration-200 outline-none ${active ? 'border-blue-600 text-blue-900 bg-blue-50/50' : 'border-transparent text-gray-500 hover:text-blue-600 hover:bg-gray-50'}`}>
            <span className="text-lg">{icon}</span><span className="font-medium text-sm">{label}</span>{count > 0 && (<span className={`px-2 py-0.5 rounded-full text-xs font-bold ml-1 ${active ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}>{count}</span>)}
        </button>
    )
}