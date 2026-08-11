import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line 
} from 'recharts';
import { toast } from 'sonner';
import { apiFetch } from '../lib/api';

// --- PREGUNTAS DE AUDITORÍA (LISTA COMPLETA ORIGINAL) ---
const AUDIT_QUESTIONS = [
  // 1. TALENTO HUMANO
  { id: 'p1', section: '1. Talento Humano', q: '¿El personal médico y de enfermería cuenta con registro profesional vigente?', options: ['Sí', 'No', 'Parcial'], consequence: 'Bloquea cierre de nota y facturación. Marca incumplimiento crítico.' },
  { id: 'p2', section: '1. Talento Humano', q: '¿El personal asignado corresponde a la complejidad del paciente?', options: ['Sí', 'No'], consequence: 'Registra No Conformidad (NC). Puede generar CAPA.' },
  { id: 'p3', section: '1. Talento Humano', q: '¿Los cuidadores están identificados, vinculados al paciente y al plan de cuidado?', options: ['Sí', 'No', 'No aplica'], consequence: 'Impide activar plan y programar visitas. Alerta crítica.' },
  // 2. HISTORIA CLÍNICA
  { id: 'p4', section: '2. Historia Clínica', q: '¿La historia clínica está completa (identificación, motivo, evolución, diagnóstico y plan)?', options: ['Cumple', 'No cumple'], consequence: 'Impide cierre de atención y auditoría.' },
  { id: 'p5', section: '2. Historia Clínica', q: '¿Las evoluciones domiciliarias están firmadas y fechadas?', options: ['Sí', 'No'], consequence: 'No permite cerrar evolución. Documento inválido.' },
  { id: 'p6', section: '2. Historia Clínica', q: '¿Existe trazabilidad de modificaciones en la historia clínica?', options: ['Sí', 'No'], consequence: 'Bloquea edición. Incumplimiento legal.' },
  // 3. ATENCIÓN DOMICILIARIA
  { id: 'p7', section: '3. Atención Domiciliaria', q: '¿Existen criterios documentados de ingreso al programa domiciliario?', options: ['Sí', 'No'], consequence: 'No permite ingreso ni plan de cuidado.' },
  { id: 'p8', section: '3. Atención Domiciliaria', q: '¿Cada visita domiciliaria tiene registro de signos vitales mínimos?', options: ['Sí', 'No', 'Excepción'], consequence: 'Impide cierre de visita (Si es excepción, pide soporte).' },
  { id: 'p9', section: '3. Atención Domiciliaria', q: '¿Las visitas evidencian continuidad del cuidado?', options: ['Sí', 'No'], consequence: 'Genera NC por continuidad. Impacta indicadores.' },
  // 4. PLAN DE CUIDADO
  { id: 'p10', section: '4. Plan de Cuidado', q: '¿Existe un plan de cuidado activo y actualizado?', options: ['Sí', 'No'], consequence: 'Bloquea toda operación clínica si es dependiente.' },
  { id: 'p11', section: '4. Plan de Cuidado', q: '¿El plan define metas, frecuencia y responsables?', options: ['Sí', 'No'], consequence: 'Impide activar plan y programar visitas.' },
  { id: 'p12', section: '4. Plan de Cuidado', q: '¿El plan se ajusta según la evolución del paciente?', options: ['Sí', 'No'], consequence: 'Registra NC. Recomienda revisión del plan.' },
  // 5. CUIDADOR EN CASA
  { id: 'p13', section: '5. Cuidador en Casa', q: '¿El cuidador registra actividades diarias (bitácora)?', options: ['Sí', 'No'], consequence: 'Alerta crítica si supera umbral. Impacta cumplimiento.' },
  { id: 'p14', section: '5. Cuidador en Casa', q: '¿La bitácora es coherente con el plan médico?', options: ['Sí', 'No'], consequence: 'Genera NC por incoherencia.' },
  { id: 'p15', section: '5. Cuidador en Casa', q: '¿Se documentan eventos relevantes (caídas, cambios clínicos)?', options: ['Sí', 'No'], consequence: 'Alerta inmediata. Bloquea cierre de atención.' },
  // 6. GESTIÓN DEL RIESGO
  { id: 'p16', section: '6. Gestión del Riesgo', q: '¿Se identifican riesgos (caídas, LPP, deterioro)?', options: ['Sí', 'No'], consequence: 'NC por prevención. Checklist obligatorio.' },
  { id: 'p17', section: '6. Gestión del Riesgo', q: '¿Los eventos adversos tienen seguimiento y cierre?', options: ['Sí', 'No', 'No aplica'], consequence: 'Bloquea cierre de auditoría. CAPA obligatorio.' },
  // 7. SISTEMAS DE INFORMACIÓN
  { id: 'p18', section: '7. Sistemas de Info', q: '¿La historia clínica es electrónica y accesible para auditoría?', options: ['Sí', 'No'], consequence: 'Incumplimiento grave.' },
  { id: 'p19', section: '7. Sistemas de Info', q: '¿Se garantiza confidencialidad y control de accesos?', options: ['Sí', 'No'], consequence: 'Incumplimiento crítico.' },
  // 8. PLANES DE MEJORAMIENTO
  { id: 'p20', section: '8. Planes de Mejora', q: '¿Existen planes de mejoramiento para hallazgos previos?', options: ['Sí', 'No', 'No aplica'], consequence: 'Bloquea cierre de auditoría.' },
  { id: 'p21', section: '8. Planes de Mejora', q: '¿Los planes tienen responsables, fechas y evidencia de cierre?', options: ['Sí', 'No'], consequence: 'Cierra NC. Si no: Mantiene hallazgo abierto.' },
];

export default function DashboardSuperintendencia({ user, onLogout }) {
  // --- ESTADOS DE NAVEGACIÓN ---
  const [view, setView] = useState('HOME'); 
  const [historyStack, setHistoryStack] = useState([]);

  // --- ESTADOS DE DATOS ---
  const [epsList, setEpsList] = useState([]);
  const [selectedEPS, setSelectedEPS] = useState(null);
  
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  
  const [staff, setStaff] = useState([]);
  
  const [logs, setLogs] = useState([]); 

  // --- ESTADOS DE AUDITORÍA Y NOTIFICACIONES ---
  const [auditAnswers, setAuditAnswers] = useState({});
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
 
  const [notifications, setNotifications] = useState([
    { id: 1, type: 'financial', msg: 'Savia Salud: Reporte Financiero Mensual Cargado', time: 'Hace 10 min', unread: true },
    { id: 2, type: 'financial', msg: 'Hospital: Ajuste Presupuestal Q1', time: 'Hace 2 horas', unread: true }
  ]);

  // --- CARGA DE EPS ---
  useEffect(() => {
 
    setEpsList([
        { id: 1, name: "Savia Salud EPS", nit: "900.200.123", region: "Antioquia", status: "activo" },
        { id: 2, name: "Saludcoop", nit: "800.150.999", region: "Nacional", status: "activo" },
        { id: 3, name: "Hospital", nit: "890.900.555", region: "Antioquia", status: "activo" }
    ]);
  }, []);

  // --- NAVEGACIÓN (BREADCRUMBS) ---
  const navigateTo = (newView) => {
    setHistoryStack([...historyStack, view]);
    setView(newView);
  };

  const handleBack = () => {
    if (historyStack.length === 0) return;
    const previousView = historyStack.pop();
    setHistoryStack([...historyStack]);
    setView(previousView);
    // Limpieza de estados al volver
    if (previousView === 'HOME') setSelectedEPS(null);
    if (previousView === 'EPS_DASHBOARD') { setSelectedPatient(null); }
  };


  
  const fetchPatients = async (epsId) => {
    try {
     
        const res = await apiFetch(`/api/patients?epsId=${epsId}`);
        if(res.ok) {
            const data = await res.json();
            setPatients(data);
            navigateTo('PATIENT_LIST');
        } else {
            setPatients([]); 
            toast.error("No se encontraron pacientes para esta EPS.");
            navigateTo('PATIENT_LIST');
        }
    } catch (error) { 
        toast.error("Error de conexión al obtener pacientes"); 
    }
  };

  const fetchStaff = async (epsId, roleType) => {
    try {
        const res = await apiFetch(`/api/users?epsId=${epsId}&role=${roleType}`);
        if(res.ok) {
             const data = await res.json();
             setStaff(data);
             navigateTo('STAFF_LIST');
        } else {
             setStaff([]); 
             toast.error("No se encontró personal registrado.");
             navigateTo('STAFF_LIST');
        }
    } catch (error) { toast.error("Error cargando personal"); }
  };

  const fetchLogs = async (patientId) => {
    try {
        const res = await apiFetch(`/api/logs?patientId=${patientId}`);
        if(res.ok) {
            const data = await res.json();
            setLogs(data);
        } else {
            setLogs([]);
        }
    } catch (error) { console.error(error); }
  };

  // --- RENDERIZADO DE BITÁCORA ---
  const renderLogDetail = (log) => {
    let data = {};
    try { data = JSON.parse(log.content); } catch (e) { data = { observations: log.content }; }
    
    return (
        <div className="bg-white p-4 rounded border border-gray-200 mb-4 text-sm shadow-sm">
            <div className="flex justify-between font-bold text-gray-800 mb-2 border-b pb-1">
                <span>{new Date(log.date).toLocaleDateString()} {new Date(log.date).toLocaleTimeString()}</span>
                <span className={log.alert ? 'text-red-700' : 'text-green-700'}>
                    {log.alert ? 'ALERTA REGISTRADA' : 'Normal'}
                </span>
            </div>
            <div className="text-gray-700 mb-2">
                <span className="font-bold">Observación:</span> {data.observations || data.notes || "Sin detalles"}
            </div>
            {data.vitalSigns && (
                <div className="bg-slate-50 p-2 rounded text-xs grid grid-cols-3 gap-2">
                    <div>P/A: <strong>{data.vitalSigns.bloodPressure}</strong></div>
                    <div>Temp: <strong>{data.vitalSigns.temp}°C</strong></div>
                    <div>O2: <strong>{data.vitalSigns.oxygen}%</strong></div>
                </div>
            )}
        </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-100 font-sans flex flex-col text-slate-800">
      
      {/* NAVBAR */}
      <nav className="bg-slate-900 text-white p-4 sticky top-0 z-50 shadow flex justify-between items-center">
        <div className="flex items-center gap-4">
          {view !== 'HOME' && (
            <button onClick={handleBack} className="bg-slate-700 px-3 py-1 rounded text-sm hover:bg-slate-600 transition">
               Volver
            </button>
          )}
          <h1 className="text-lg font-bold uppercase tracking-wider">Superintendencia Nacional de Salud</h1>
        </div>
        
        <div className="flex items-center gap-6">
            {/* Notificaciones Financieras */}
            <div className="relative">
                <button onClick={() => setShowNotifDropdown(!showNotifDropdown)} className="relative">
                    <span className="text-xl">🔔</span>
                    {notifications.some(n => n.unread) && <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full"></span>}
                </button>
                {showNotifDropdown && (
                    <div className="absolute right-0 mt-2 w-80 bg-white text-slate-800 rounded shadow-xl border border-gray-200 z-50">
                        <div className="p-2 border-b font-bold text-xs text-gray-500 bg-gray-50">Reportes Financieros Recientes</div>
                        {notifications.map(n => (
                            <div key={n.id} className="p-3 border-b text-sm hover:bg-gray-50 cursor-pointer">
                                <p className="font-semibold text-blue-900">{n.msg}</p>
                                <p className="text-xs text-gray-400">{n.time}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            <button onClick={onLogout} className="text-sm font-semibold hover:text-gray-300">Cerrar Sesión</button>
        </div>
      </nav>

      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        
        {/* VISTA 1: LISTA EPS */}
        {view === 'HOME' && (
            <div>
                <h2 className="text-2xl font-bold mb-6 border-b border-gray-300 pb-2">Entidades Vigiladas</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {epsList.map(eps => (
                        <div key={eps.id} onClick={() => { setSelectedEPS(eps); navigateTo('EPS_DASHBOARD'); }} 
                             className="bg-white p-6 rounded shadow border border-gray-200 cursor-pointer hover:shadow-md transition">
                            <div className="flex justify-between mb-2">
                                <span className="font-bold text-lg text-blue-900">{eps.name}</span>
                                <span className={`text-xs px-2 py-1 rounded font-bold ${eps.status === 'Activo' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                    {eps.status}
                                </span>
                            </div>
                            <p className="text-sm text-gray-500">NIT: {eps.nit}</p>
                            <p className="text-sm text-gray-500">Región: {eps.region}</p>
                            <div className="mt-4 text-xs font-bold text-blue-600 uppercase">Ver Dashboard &gt;</div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* VISTA 2: DASHBOARD EPS */}
        {view === 'EPS_DASHBOARD' && selectedEPS && (
            <div>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-slate-900">{selectedEPS.name} <span className="text-gray-400 font-normal">| Panel de Vigilancia</span></h2>
                    <div className="flex gap-2">
                         <button onClick={() => navigateTo('FINANCIAL')} className="bg-slate-800 text-white px-4 py-2 rounded text-sm font-bold">Reporte Financiero</button>
                         <button onClick={() => navigateTo('AUDIT')} className="bg-red-700 text-white px-4 py-2 rounded text-sm font-bold">Iniciar Auditoría Oficial</button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div onClick={() => fetchPatients(selectedEPS.id)} className="bg-white p-6 rounded shadow border-l-4 border-blue-600 cursor-pointer hover:bg-gray-50">
                        <h3 className="font-bold text-lg mb-1">Base de Pacientes</h3>
                        <p className="text-sm text-gray-500">Acceso a historias clínicas y planes de cuidado.</p>
                    </div>
                    <div onClick={() => fetchStaff(selectedEPS.id, 'MEDICO')} className="bg-white p-6 rounded shadow border-l-4 border-teal-600 cursor-pointer hover:bg-gray-50">
                        <h3 className="font-bold text-lg mb-1">Personal Médico</h3>
                        <p className="text-sm text-gray-500">Verificación de registros y turnos.</p>
                    </div>
                    <div onClick={() => fetchStaff(selectedEPS.id, 'CUIDADOR')} className="bg-white p-6 rounded shadow border-l-4 border-purple-600 cursor-pointer hover:bg-gray-50">
                        <h3 className="font-bold text-lg mb-1">Red de Cuidadores</h3>
                        <p className="text-sm text-gray-500">Revisión de bitácoras y perfiles.</p>
                    </div>
                </div>
            </div>
        )}

        {/* VISTA 3: LISTA PACIENTES */}
        {view === 'PATIENT_LIST' && (
            <div className="bg-white rounded shadow border border-gray-200">
                <div className="p-4 border-b border-gray-200 font-bold bg-gray-50">Listado de Pacientes - {selectedEPS.name}</div>
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-100 text-gray-600 uppercase text-xs">
                        <tr>
                            <th className="p-4">Nombre Completo</th>
                            <th className="p-4">Edad</th>
                            <th className="p-4">Diagnóstico</th>
                            <th className="p-4">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {patients.length === 0 ? (
                            <tr><td colSpan="4" className="p-8 text-center text-gray-400">No hay datos registrados en el sistema.</td></tr>
                        ) : patients.map(pt => (
                            <tr key={pt.id} className="border-b last:border-0 hover:bg-gray-50">
                                <td className="p-4 font-medium">{pt.fullName}</td>
                                <td className="p-4">{pt.age}</td>
                                <td className="p-4">{pt.condition}</td>
                                <td className="p-4">
                                    <button onClick={() => { setSelectedPatient(pt); fetchLogs(pt.id); navigateTo('PATIENT_DETAIL'); }} className="text-blue-700 font-bold hover:underline">
                                        Ver Expediente
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}

        {/* VISTA 4: DETALLE PACIENTE */}
        {view === 'PATIENT_DETAIL' && selectedPatient && (
            <div className="space-y-6">
                <div className="bg-white p-6 rounded shadow border border-gray-200">
                    <h2 className="text-xl font-bold mb-4 border-b pb-2">Expediente del Paciente</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div><span className="block text-gray-500">Nombre</span><strong>{selectedPatient.fullName}</strong></div>
                        <div><span className="block text-gray-500">Edad</span><strong>{selectedPatient.age} años</strong></div>
                        <div><span className="block text-gray-500">Estrato</span><strong>{selectedPatient.stratum}</strong></div>
                        <div><span className="block text-gray-500">Diagnóstico</span><strong>{selectedPatient.condition}</strong></div>
                        <div><span className="block text-gray-500">Ubicación</span><strong>{selectedPatient.address}</strong></div>
                        <div><span className="block text-gray-500">Contacto</span><strong>{selectedPatient.contactPhone}</strong></div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Bitácoras */}
                    <div className="md:col-span-2">
                        <h3 className="font-bold text-gray-800 mb-2">Historial de Bitácoras (Cuidadores/Médicos)</h3>
                        <div className="bg-gray-50 p-4 rounded border border-gray-200 h-96 overflow-y-auto">
                            {logs.length === 0 ? (
                                <p className="text-center text-gray-400 py-10">No existen registros de bitácora.</p>
                            ) : logs.map((log, i) => <div key={i}>{renderLogDetail(log)}</div>)}
                        </div>
                    </div>
                    {/* Cuidador */}
                    <div>
                        <h3 className="font-bold text-gray-800 mb-2">Cuidador Asignado</h3>
                        <div className="bg-white p-6 rounded shadow border border-gray-200 text-center">
                            <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-3 flex items-center justify-center font-bold text-gray-500">IMG</div>
                            <h4 className="font-bold">Cuidador Principal</h4>
                            <p className="text-xs text-gray-500 mb-4">Certificación Validada</p>
                            <button className="w-full border border-gray-300 py-2 rounded text-sm font-bold hover:bg-gray-50">Ver Perfil Completo</button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* VISTA 5: REPORTE FINANCIERO */}
        {view === 'FINANCIAL' && selectedEPS && (
            <div>
                <h2 className="text-xl font-bold mb-6">Análisis Financiero: {selectedEPS.name}</h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                     <div className="bg-white p-4 rounded shadow border border-gray-200">
                        <h3 className="font-bold text-sm mb-4">Ejecución Presupuestal (Real vs Asignado)</h3>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={[
                                    { name: 'Ene', presupuesto: 4000, real: 3800 },
                                    { name: 'Feb', presupuesto: 3000, real: 2900 },
                                    { name: 'Mar', presupuesto: 5000, real: 5100 },
                                    { name: 'Abr', presupuesto: 4000, real: 3950 },
                                ]}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <Tooltip />
                                    <Legend />
                                    <Line type="monotone" dataKey="presupuesto" stroke="#0f172a" strokeWidth={2} />
                                    <Line type="monotone" dataKey="real" stroke="#dc2626" strokeWidth={2} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                     </div>
                     <div className="bg-white p-4 rounded shadow border border-gray-200">
                        <h3 className="font-bold text-sm mb-4">Distribución de Recursos</h3>
                         <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={[
                                        { name: 'Nómina', value: 60 },
                                        { name: 'Insumos', value: 25 },
                                        { name: 'Logística', value: 15 },
                                    ]} cx="50%" cy="50%" outerRadius={80} fill="#0f172a" label />
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                     </div>
                </div>
            </div>
        )}

        {/* VISTA 6: AUDITORÍA (FORMULARIO ORIGINAL) */}
        {view === 'AUDIT' && (
            <div className="bg-white rounded shadow-lg border border-gray-300">
                <div className="bg-slate-800 text-white p-4">
                    <h2 className="text-xl font-bold uppercase text-center">Auditoría Oficial – Superintendencia</h2>
                    <div className="mt-2 text-sm text-center text-gray-400">
                        Entidad Auditada: {selectedEPS.name} | Fecha: {new Date().toLocaleDateString()}
                    </div>
                </div>
                
                <div className="p-8 space-y-8 bg-gray-50">
                    {/* Renderizamos las preguntas agrupadas por sección */}
                    {['1. Talento Humano', '2. Historia Clínica', '3. Atención Domiciliaria', '4. Plan de Cuidado', '5. Cuidador en Casa', '6. Gestión del Riesgo', '7. Sistemas de Info', '8. Planes de Mejora'].map(section => (
                        <div key={section} className="bg-white p-6 rounded shadow-sm border border-gray-200">
                            <h3 className="font-bold text-lg text-slate-800 mb-4 border-b pb-2 uppercase">{section}</h3>
                            <div className="space-y-6">
                                {AUDIT_QUESTIONS.filter(q => q.section.includes(section.split('.')[0])).map(q => (
                                    <div key={q.id} className="grid grid-cols-1 md:grid-cols-3 gap-4 border-b border-gray-100 pb-4 last:border-0">
                                        <div className="md:col-span-2">
                                            <p className="font-medium text-sm text-gray-800">{q.q}</p>
                                            {/* Lógica de Alerta Roja */}
                                            {(auditAnswers[q.id] === 'No' || auditAnswers[q.id] === 'No cumple' || auditAnswers[q.id] === 'Parcial') && (
                                                <div className="mt-2 bg-red-50 border border-red-200 text-red-800 text-xs p-2 font-bold">
                                                    IMPIDE CIERRE / SANCIÓN: {q.consequence}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex gap-2 justify-end items-start">
                                            {q.options.map(opt => (
                                                <button
                                                    key={opt}
                                                    onClick={() => setAuditAnswers({...auditAnswers, [q.id]: opt})}
                                                    className={`px-3 py-1 text-xs font-bold border rounded transition ${
                                                        auditAnswers[q.id] === opt 
                                                        ? 'bg-slate-800 text-white border-slate-800' 
                                                        : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100'
                                                    }`}
                                                >
                                                    {opt}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="p-4 bg-gray-200 flex justify-end gap-4 border-t border-gray-300">
                    <button onClick={() => setView('EPS_DASHBOARD')} className="px-6 py-2 bg-white border border-gray-400 text-gray-700 font-bold rounded">Cancelar</button>
                    <button onClick={() => { toast.success("Auditoría Guardada y Notificada a la EPS"); setView('EPS_DASHBOARD'); }} className="px-6 py-2 bg-slate-900 text-white font-bold rounded">Firmar y Guardar</button>
                </div>
            </div>
        )}

      </main>
    </div>
  );
}