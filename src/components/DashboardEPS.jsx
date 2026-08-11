import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

import {
  MdPerson, MdSchool, MdLocalHospital, MdFolderOpen, MdBadge,
  MdAssignment, MdGavel, MdCheckCircle, MdWarning, MdVerified,
  MdBarChart, MdMail, MdHealthAndSafety, MdRefresh, MdLogout,
  MdRemoveRedEye, MdCalendarToday, MdEditNote, MdMedicalServices,
  MdStar, MdInbox, MdGroups, MdArrowBack, MdAdd, MdDescription,
  MdInsertDriveFile, MdEventNote
} from 'react-icons/md';

import { apiFetch, fileUrl } from '../lib/api';
import ReportesFinancieros from './ReportesFinancieros';
import EvidenciaFurag from './EvidenciaFurag';
import CaracterizacionPrograma from './CaracterizacionPrograma';

import {
  Modal, Button, Badge, StatusDot, EmptyState,
  Card, CardHeader, CardBody, SectionTitle,
  StatCard, Dato, SinRegistrar, Meter, BarList, OrdinalSplit,
  Field, SearchInput,
  Table, Th, Td, Tr,
  StatGridSkeleton, ChartSkeleton, TableSkeleton, CardGridSkeleton, ListSkeleton
} from './ui';

import {
  RAMPA_ORDINAL, ejeX, ejeY, rejilla, tooltipEstilo, ANIM_MS
} from '../lib/chartTheme';
import { evaluarPrioridad, TONO_NIVEL } from '../lib/triage';

// Los tres reportes, con las imágenes que ya viven en public/.
const REPORTES = [
  { id: 'ADRES',    titulo: 'ADRES',    descripcion: 'Caracterización de la población atendida', imagen: '/logo1.png' },
  { id: 'FURAG',    titulo: 'FURAG',    descripcion: 'Soportes de gestión para MIPG',            imagen: '/logo2.png' },
  { id: 'FINANZAS', titulo: 'Finanzas', descripcion: 'Ejecución del gasto por tipo',             imagen: '/logo3.png' }
];

const COMMON_DISEASES = [
  "Hipertensión Arterial", "Diabetes Mellitus", "Enfermedad Renal Crónica",
  "EPOC / Enfermedad Respiratoria", "Alzheimer / Demencia", "Parkinson",
  "Secuelas ACV (Derrame)", "Cáncer / Cuidados Paliativos", "Artritis / Artrosis Severa",
  "Fractura de Cadera / Inmovilidad", "Insuficiencia Cardíaca", "Parálisis Cerebral",
  "Esclerosis Lateral Amiotrófica (ELA)", "Discapacidad Cognitiva", "Otro"
];

const TAMESIS_ZONES = {
  "Casco Urbano": ["Centro", "San Antonio", "Pio XII", "El Estadio", "Otro barrio..."],
  "Corregimiento Palermo": ["Palermo (Centro Poblado)", "San Isidro", "El Líbano", "La Oculta", "Otra vereda..."],
  "Corregimiento San Pablo": ["San Pablo (Centro Poblado)", "El Rayo", "El Guamo", "El Tacón", "Otra vereda..."],
  "Veredas Independientes": ["Río Frío", "Santa Teresa", "El Encanto", "Otra vereda..."],
  "Resguardo Indígena": ["Comunidad Embera Chamí", "La Mirla", "Otro sector..."]
};

// Umbral de cumplimiento de bitácoras. Se declara aquí y se MUESTRA en la
// interfaz cada vez que se usa: un umbral que el lector no ve es un juicio
// disfrazado de medición.
const UMBRAL_CUMPLIMIENTO = 80;

const TABS = [
  { id: 'METRICAS',      label: 'Estadísticas',  icon: <MdBarChart /> },
  { id: 'SOLICITUDES',   label: 'Solicitudes',   icon: <MdMail /> },
  { id: 'VALIDACION',    label: 'Validación',    icon: <MdFolderOpen /> },
  { id: 'ACTIVOS',       label: 'Cuidadores',    icon: <MdHealthAndSafety /> },
  { id: 'PACIENTES',     label: 'Pacientes',     icon: <MdLocalHospital /> },
  { id: 'PROFESIONALES', label: 'Profesionales', icon: <MdMedicalServices /> },
  { id: 'FINANCIERO',    label: 'Reportes',      icon: <MdDescription /> }
];

const ESTADO_TONO = {
  APROBADO: 'ok',
  PRESELECCIONADO: 'warn',
  RECHAZADO: 'risk',
  PENDIENTE: 'neutral'
};

// ============================================================================
// Modal de hoja de vida del aspirante
// ============================================================================

function ApplicantDetailModal({ open, onClose, candidate, onAction }) {
  if (!candidate) return null;

  const hasMinDocs = candidate.fileCaregiverId && (candidate.fileTraining || candidate.senaFile);

  const documentos = [
    { key: 'fileCaregiverId', label: 'Cédula del cuidador', icon: <MdBadge />, path: candidate.fileCaregiverId, requerido: true },
    { key: 'senaFile',        label: 'Diploma / curso SENA', icon: <MdSchool />, path: candidate.fileTraining || candidate.senaFile, requerido: true },
    { key: 'filePatientId',   label: 'Documento del paciente', icon: <MdLocalHospital />, path: candidate.filePatientId },
    { key: 'fileHistory',     label: 'Historia clínica', icon: <MdAssignment />, path: candidate.fileHistory },
    { key: 'filePower',       label: 'Poder de representación', icon: <MdGavel />, path: candidate.filePower }
  ];

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title={candidate.fullName}
      subtitle={`C.C. ${candidate.identification || 'sin registrar'} · ${candidate.email || 'sin correo'}`}
      icon={<MdPerson />}
      footer={
        <>
          <Badge tone={ESTADO_TONO[candidate.status]}>{candidate.status}</Badge>
          <div className="flex-1" />
          {candidate.status === 'PENDIENTE' && (
            <Button variant="accent" icon={<MdCheckCircle />} onClick={() => onAction(candidate.id, 'PRESELECCIONADO')}>
              Preseleccionar
            </Button>
          )}
          {candidate.status === 'PRESELECCIONADO' && (
            <Button
              variant="ok"
              icon={<MdVerified />}
              disabled={!hasMinDocs}
              onClick={() => onAction(candidate.id, 'APROBADO')}
              title={hasMinDocs ? undefined : 'Faltan la cédula o el diploma'}
            >
              Aprobar contratación
            </Button>
          )}
        </>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        <div className="space-y-5">
          <Card>
            <CardHeader title="Información personal" />
            <CardBody>
              <dl className="space-y-3.5">
                <Dato label="Tipo de documento" value={candidate.docType} />
                <Dato label="Teléfono" value={candidate.phone} />
                <Dato label="Dirección" value={candidate.address} />
                <Dato
                  label="Fecha de nacimiento"
                  value={candidate.birthDate ? new Date(candidate.birthDate).toLocaleDateString('es-CO') : null}
                />
              </dl>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Perfil profesional" />
            <CardBody>
              <dl className="space-y-3.5">
                <Dato label="Código SENA" value={candidate.senaCode} />
                <Dato label="Años de experiencia" value={candidate.experienceYears} />
                <Dato label="Transporte propio" value={candidate.hasTransport ? 'Sí tiene' : 'No tiene'} />
              </dl>
            </CardBody>
          </Card>
        </div>

        <Card className="h-fit">
          <CardHeader title="Paciente y cuidado" />
          <CardBody>
            {candidate.patientName ? (
              <>
                <dl className="space-y-3.5">
                  <Dato label="Nombre del paciente" value={candidate.patientName} />
                  <Dato label="Documento del paciente" value={candidate.patientDoc} />
                  <Dato label="Parentesco o relación" value={candidate.relationship} />
                  <Dato label="Tipo de cuidado" value={candidate.careType} />
                  <Dato label="Instrucciones especiales" value={candidate.careInstructions} />
                </dl>

                <div className="mt-5 pt-5 border-t border-ink-200">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-ink-600 mb-3">
                    Diagnóstico clínico
                  </h4>
                  <dl className="space-y-3.5">
                    <Dato label="Diagnóstico" value={candidate.diagnosis} />
                    <Dato label="Grado de discapacidad" value={candidate.disabilityGrade} />
                    <Dato label="Tiene orden médica" value={candidate.hasMedicalOrder} />
                  </dl>
                </div>
              </>
            ) : (
              <p className="text-sm text-ink-500 py-8 text-center">
                Perfil profesional externo, sin paciente vinculado.
              </p>
            )}
          </CardBody>
        </Card>

        <Card className="h-fit">
          <CardHeader
            title="Documentos"
            description={hasMinDocs
              ? 'Documentación mínima completa.'
              : 'Faltan documentos obligatorios para aprobar.'}
          />
          <CardBody>
            <ul className="space-y-2">
              {documentos.map(doc => (
                <li key={doc.key}>
                  {doc.path ? (
                    <a
                      href={fileUrl(doc.path)}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2.5 min-h-11 px-3 rounded-md border border-ink-200 bg-white text-sm font-medium text-brand-700 hover:bg-brand-50 hover:border-brand-200 transition-colors"
                    >
                      <span aria-hidden="true" className="text-base shrink-0">{doc.icon}</span>
                      <span className="truncate">{doc.label}</span>
                    </a>
                  ) : doc.requerido ? (
                    <p className="flex items-center gap-2.5 min-h-11 px-3 rounded-md border border-dashed border-risk-border bg-risk-soft text-sm text-risk-strong">
                      <MdWarning aria-hidden="true" className="text-base shrink-0" />
                      Falta: {doc.label}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      </div>
    </Modal>
  );
}

// ============================================================================
// Panel principal
// ============================================================================

export default function DashboardEPS({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('METRICAS');
  const [searchTerm, setSearchTerm] = useState('');

  // Datos del backend
  const [caregivers, setCaregivers] = useState([]);
  const [patients, setPatients] = useState([]);
  const [logs, setLogs] = useState([]);
  const [professionals, setProfessionals] = useState([]);
  const [visits, setVisits] = useState([]);
  const [umbralDias, setUmbralDias] = useState(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(null);

  // Modales
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [selectedPro, setSelectedPro] = useState(null);
  const [caregiverToAssign, setCaregiverToAssign] = useState(null);
  const [logsModal, setLogsModal] = useState(null);      // { nombre, registros }
  const [visitsModal, setVisitsModal] = useState(null);  // { nombre, visitas }
  const [showComplianceDetail, setShowComplianceDetail] = useState(false);
  const [showVisitsDetail, setShowVisitsDetail] = useState(false);
  const [showPatientForm, setShowPatientForm] = useState(false);
  const [showProForm, setShowProForm] = useState(false);

  const [newPatientData, setNewPatientData] = useState({
    fullName: '', identification: '', email: '', age: '', stratum: '', diagnosis: '',
    address: '', contactPhone: '', careInstructions: '', zoneCategory: '', zoneDetail: '', fileHistory: null
  });
  const [newProData, setNewProData] = useState({
    fullName: '', email: '', identification: '', phone: '', position: '', resumeFile: null
  });
  const [saving, setSaving] = useState(false);

  const [reporteAbierto, setReporteAbierto] = useState(null);

  // --------------------------------------------------------------------------
  // Carga
  // --------------------------------------------------------------------------

  const fetchData = useCallback(async ({ silent = false } = {}) => {
    if (silent) setRefreshing(true); else setLoading(true);
    setLoadError(null);

    try {
      const storedRaw = localStorage.getItem('user');
      if (!storedRaw) return;

      const storedUser = JSON.parse(storedRaw);
      const myEpsId = storedUser.epsId || storedUser.id;
      const qs = myEpsId ? `?epsId=${myEpsId}` : '';

      const [resP, resC, resPro, resL, resV, resU] = await Promise.all([
        apiFetch(`/api/patients${qs}`),
        apiFetch(`/api/caregivers${qs}`),
        apiFetch(`/api/professionals${qs}`),
        apiFetch(`/api/logs${qs}`),
        apiFetch(`/api/visits${qs}`),
        apiFetch('/api/programa/umbral')
      ]);

      if (resP.ok)   { const d = await resP.json();   setPatients(Array.isArray(d) ? d : []); }
      if (resC.ok)   { const d = await resC.json();   setCaregivers(Array.isArray(d) ? d : []); }
      if (resPro.ok) { const d = await resPro.json(); setProfessionals(Array.isArray(d) ? d : []); }
      if (resL.ok)   { const d = await resL.json();   setLogs(Array.isArray(d) ? d : []); }
      if (resV.ok)   { const d = await resV.json();   setVisits(Array.isArray(d) ? d : []); }
      if (resU.ok)   { const d = await resU.json();   if (typeof d?.dias === 'number') setUmbralDias(d.dias); }

    } catch {
      // Con señal intermitente esto pasa a diario. Se dice, no se esconde:
      // un tablero en blanco sin explicación se lee como "no hay programa".
      setLoadError('No se pudo contactar el servidor. Revisa la conexión e intenta de nuevo.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // --------------------------------------------------------------------------
  // Indicadores
  //
  // Regla central del proyecto: nada inventado. Un porcentaje sin base
  // sobre la cual calcularse NO es cero, es `null`, y la interfaz escribe
  // "Sin registrar". Antes esto hacía `patients.length || 1` y publicaba
  // 0% de cobertura sobre cero pacientes.
  //
  // Va en useMemo porque el cálculo anida filtros de visitas dentro de un
  // recorrido de pacientes: sin memoizar corría entero en cada pulsación
  // del buscador.
  // --------------------------------------------------------------------------

  const stats = useMemo(() => {
    const totalPatients = patients.length;
    const assigned = patients.filter(p => p.caregiverId).length;
    const unassigned = totalPatients - assigned;

    const coveragePercent = totalPatients > 0
      ? Math.round((assigned / totalPatients) * 100)
      : null;

    const strataCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    patients.forEach(p => {
      const s = parseInt(String(p.stratum || '0').replace(/\D/g, ''), 10);
      if (s >= 1 && s <= 6) strataCounts[s]++;
    });

    const diagnoses = {};
    patients.forEach(p => {
      let d = (p.diagnosis || 'Sin diagnóstico').split('(')[0].trim();
      d = d.charAt(0).toUpperCase() + d.slice(1).toLowerCase();
      if (d === '' || d === '.') d = 'Sin diagnóstico';
      diagnoses[d] = (diagnoses[d] || 0) + 1;
    });
    const sortedDiagnoses = Object.entries(diagnoses).sort((a, b) => b[1] - a[1]).slice(0, 5);

    // Bitácoras: solo se puede medir si hay pacientes asignados a alguien.
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const recentLogs = logs.filter(l => new Date(l.date) >= oneWeekAgo).length;
    const expectedLogs = assigned * 7;
    const logCompliance = expectedLogs > 0
      ? Math.min(100, Math.round((recentLogs / expectedLogs) * 100))
      : null;

    // Visitas: se mide contra los pacientes registrados.
    const fiveDaysAgo = new Date();
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
    const visitasPorPaciente = new Map();
    visits.forEach(v => {
      const prev = visitasPorPaciente.get(v.patientId);
      const d = new Date(v.date);
      if (!prev || d > prev) visitasPorPaciente.set(v.patientId, d);
    });
    const patientsOnTime = patients.filter(p => {
      const ultima = visitasPorPaciente.get(p.id);
      return ultima && ultima >= fiveDaysAgo;
    }).length;
    const visitOpportunity = totalPatients > 0
      ? Math.round((patientsOnTime / totalPatients) * 100)
      : null;

    const ageGroups = { pediatrico: 0, adulto: 0, geriatrico: 0 };
    patients.forEach(p => {
      const age = parseInt(p.age, 10);
      if (Number.isNaN(age)) return;
      if (age <= 18) ageGroups.pediatrico++;
      else if (age <= 59) ageGroups.adulto++;
      else ageGroups.geriatrico++;
    });
    const conEdad = ageGroups.pediatrico + ageGroups.adulto + ageGroups.geriatrico;

    return {
      totalPatients, assigned, unassigned, coveragePercent,
      strataCounts, sortedDiagnoses, ageGroups, conEdad,
      recentLogs, expectedLogs, logCompliance,
      patientsOnTime, visitOpportunity
    };
  }, [patients, logs, visits]);

  /**
   * Prioridad por paciente, con exactamente el mismo criterio que usa el
   * panel del visitador médico: hallazgos registrados, diagnóstico, y el
   * umbral de seguimiento que definió la entidad. Se calcula aquí para que
   * la alcaldía vea la misma cola que ve el profesional en la calle, sin
   * dos verdades distintas sobre el mismo paciente.
   */
  const prioridadPorPaciente = useMemo(() => {
    const porPacienteLogs = new Map();
    const porPacienteVisitas = new Map();

    logs.forEach(l => {
      if (!porPacienteLogs.has(l.patientId)) porPacienteLogs.set(l.patientId, []);
      porPacienteLogs.get(l.patientId).push(l);
    });
    visits.forEach(v => {
      if (!porPacienteVisitas.has(v.patientId)) porPacienteVisitas.set(v.patientId, []);
      porPacienteVisitas.get(v.patientId).push(v);
    });

    const mapa = new Map();
    patients.forEach(p => {
      mapa.set(p.id, evaluarPrioridad(
        p,
        porPacienteLogs.get(p.id) || [],
        porPacienteVisitas.get(p.id) || [],
        {},
        umbralDias
      ));
    });
    return mapa;
  }, [patients, logs, visits, umbralDias]);

  /** La prioridad de un cuidador es la más alta entre sus pacientes. */
  const prioridadDeCuidador = useCallback((caregiverId) => {
    const suyos = patients.filter(p => String(p.caregiverId) === String(caregiverId));
    if (suyos.length === 0) return null;
    return suyos
      .map(p => prioridadPorPaciente.get(p.id))
      .filter(Boolean)
      .sort((a, b) => b.orden - a.orden)[0] ?? null;
  }, [patients, prioridadPorPaciente]);

  const stratumChartData = useMemo(
    () => [1, 2, 3, 4, 5, 6].map((level, i) => ({
      name: `Estrato ${level}`,
      corto: `E${level}`,
      cantidad: stats.strataCounts[level],
      // El color va en el dato: `Cell` quedó obsoleto en Recharts 3.
      fill: RAMPA_ORDINAL[i]
    })),
    [stats.strataCounts]
  );

  const dayKey = (value) => {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const logDetail = useMemo(() => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const ventana = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(hoy);
      d.setDate(d.getDate() - (6 - i));
      return {
        key: dayKey(d),
        label: d.toLocaleDateString('es-CO', { weekday: 'short' }).replace('.', ''),
        dayNum: d.getDate()
      };
    });
    const clavesVentana = new Set(ventana.map(d => d.key));

    const porCuidador = new Map();
    patients.filter(p => p.caregiverId).forEach(p => {
      if (!porCuidador.has(p.caregiverId)) porCuidador.set(p.caregiverId, []);
      porCuidador.get(p.caregiverId).push(p);
    });

    // Un paciente/día cuenta una sola vez aunque haya varias bitácoras.
    const reportados = new Set();
    logs.forEach(l => {
      const k = dayKey(l.date);
      if (k && clavesVentana.has(k)) reportados.add(`${l.patientId}|${k}`);
    });

    const filas = [...porCuidador.entries()].map(([caregiverId, susPacientes]) => {
      const cuidador = caregivers.find(c => c.id === caregiverId);
      const dias = ventana.map(d => {
        const cubiertos = susPacientes.filter(p => reportados.has(`${p.id}|${d.key}`)).length;
        return { ...d, cubiertos, total: susPacientes.length, completo: cubiertos === susPacientes.length };
      });
      const esperado = susPacientes.length * 7;
      const registradas = dias.reduce((acc, d) => acc + d.cubiertos, 0);
      return {
        caregiverId,
        name: cuidador?.fullName || `Cuidador #${caregiverId}`,
        identification: cuidador?.identification || null,
        pacientes: susPacientes,
        dias, registradas, esperado,
        percent: esperado > 0 ? Math.round((registradas / esperado) * 100) : null
      };
    });

    // Los incumplidos primero: es lo que hay que accionar.
    filas.sort((a, b) => (a.percent ?? 0) - (b.percent ?? 0));

    return {
      ventana, filas,
      cumplen: filas.filter(f => f.percent !== null && f.percent >= UMBRAL_CUMPLIMIENTO),
      incumplen: filas.filter(f => f.percent !== null && f.percent < UMBRAL_CUMPLIMIENTO)
    };
  }, [patients, logs, caregivers]);

  const visitsDetail = useMemo(() => {
    const limite = new Date();
    limite.setDate(limite.getDate() - 5);

    const porProfesional = new Map();
    visits.forEach(v => {
      if (!porProfesional.has(v.professionalId)) {
        porProfesional.set(v.professionalId, { total: 0, recientes: 0, ultima: null });
      }
      const item = porProfesional.get(v.professionalId);
      const d = new Date(v.date);
      item.total++;
      if (d >= limite) item.recientes++;
      if (!item.ultima || d > item.ultima) item.ultima = d;
    });

    const filasPro = [...porProfesional.entries()]
      .map(([id, datos]) => {
        const pro = professionals.find(p => p.id === id);
        return { id, name: pro?.fullName || `Profesional #${id}`, position: pro?.position || null, ...datos };
      })
      .sort((a, b) => b.total - a.total);

    const porPaciente = new Map();
    visits.forEach(v => {
      if (!porPaciente.has(v.patientId)) porPaciente.set(v.patientId, []);
      porPaciente.get(v.patientId).push(v);
    });

    const filasPaciente = patients
      .map(p => {
        const suyas = porPaciente.get(p.id) || [];
        const ultima = suyas.reduce((max, v) => {
          const d = new Date(v.date);
          return !max || d > max ? d : max;
        }, null);
        return {
          id: p.id,
          name: p.fullName,
          total: suyas.length,
          ultima,
          alDia: Boolean(ultima && ultima >= limite),
          diasSin: ultima ? Math.floor((Date.now() - ultima.getTime()) / 86400000) : null
        };
      })
      .sort((a, b) => (a.alDia === b.alDia ? b.total - a.total : (a.alDia ? 1 : -1)));

    return {
      totalVisitas: visits.length,
      totalRecientes: visits.filter(v => new Date(v.date) >= limite).length,
      pacientesAlDia: filasPaciente.filter(p => p.alDia).length,
      filasPro, filasPaciente
    };
  }, [visits, patients, professionals]);

  // --------------------------------------------------------------------------
  // Acciones
  // --------------------------------------------------------------------------

  const handleStatusChange = async (id, newStatus) => {
    try {
      const res = await apiFetch(`/api/caregivers/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        toast.success(`Estado actualizado a ${newStatus.toLowerCase()}.`);
        setSelectedCandidate(null);
        fetchData({ silent: true });
      } else {
        toast.error('No se pudo actualizar el estado.');
      }
    } catch {
      toast.error('Sin conexión con el servidor.');
    }
  };

  const handleAssignPatient = async (patientId) => {
    if (!caregiverToAssign) return;
    try {
      const res = await apiFetch(`/api/patients/${patientId}/assign`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caregiverId: caregiverToAssign.id })
      });
      if (res.ok) {
        toast.success('Paciente asignado.');
        setCaregiverToAssign(null);
        fetchData({ silent: true });
      } else {
        toast.error('No se pudo asignar el paciente.');
      }
    } catch {
      toast.error('Sin conexión con el servidor.');
    }
  };

  const handleCreatePatient = async (e) => {
    e.preventDefault();
    if (!user?.epsId) {
      toast.error('No se identifica tu entidad. Cierra sesión y vuelve a entrar.');
      return;
    }
    setSaving(true);
    try {
      const res = await apiFetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: newPatientData.fullName,
          identification: (newPatientData.identification || '').trim(),
          email: newPatientData.email,
          age: parseInt(newPatientData.age, 10),
          address: newPatientData.address,
          phone: newPatientData.contactPhone,
          careInstructions: newPatientData.careInstructions,
          zoneCategory: newPatientData.zoneCategory,
          zoneDetail: newPatientData.zoneDetail,
          stratum: newPatientData.stratum || '0',
          condition: newPatientData.diagnosis || 'Sin diagnóstico',
          diagnosis: newPatientData.diagnosis || 'Sin diagnóstico',
          epsId: parseInt(user.epsId, 10)
        })
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Paciente registrado. Se le envió su código de acceso al correo.');
        setShowPatientForm(false);
        setNewPatientData({
          fullName: '', identification: '', email: '', age: '', stratum: '', diagnosis: '',
          address: '', contactPhone: '', careInstructions: '', zoneCategory: '', zoneDetail: '', fileHistory: null
        });
        fetchData({ silent: true });
      } else {
        toast.error(data.error || 'No se pudo guardar el paciente.');
      }
    } catch {
      toast.error('Sin conexión con el servidor.');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateProfessional = async (e) => {
    e.preventDefault();
    setSaving(true);
    const formData = new FormData();
    formData.append('fullName', newProData.fullName);
    formData.append('email', newProData.email);
    formData.append('identification', newProData.identification);
    formData.append('phone', newProData.phone);
    formData.append('position', newProData.position);
    formData.append('epsId', user.epsId);
    if (newProData.resumeFile) formData.append('resumeFile', newProData.resumeFile);

    try {
      const res = await apiFetch('/api/professionals', { method: 'POST', body: formData });
      if (res.ok) {
        toast.success('Profesional registrado.');
        setShowProForm(false);
        setNewProData({ fullName: '', email: '', identification: '', phone: '', position: '', resumeFile: null });
        fetchData({ silent: true });
      } else {
        toast.error('No se pudo registrar al profesional.');
      }
    } catch {
      toast.error('Sin conexión con el servidor.');
    } finally {
      setSaving(false);
    }
  };

  const handleViewLogs = (persona) => {
    const registros = [
      ...logs.filter(l => l.patientId === persona.id || l.caregiverId === persona.id)
        .map(l => ({ ...l, recordType: 'CUIDADOR' })),
      ...visits.filter(v => v.patientId === persona.id)
        .map(v => ({ ...v, recordType: 'PROFESIONAL' }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    setLogsModal({ nombre: persona.fullName, registros });
  };

  // Antes esto fijaba las visitas y el nombre pero nunca el profesional, así
  // que el modal mostraba "No registrado" en cargo, contacto y hoja de vida
  // aunque el dato existiera.
  const handleViewVisits = (pro) => {
    setSelectedPro(pro);
    setVisitsModal({
      nombre: pro.fullName,
      visitas: visits
        .filter(v => v.professionalId === pro.id)
        .sort((a, b) => new Date(b.date) - new Date(a.date))
    });
  };

  // --------------------------------------------------------------------------
  // Filtros
  // --------------------------------------------------------------------------

  const term = searchTerm.trim().toLowerCase();

  const filteredCaregivers = useMemo(() => caregivers.filter(c =>
    (c.fullName || '').toLowerCase().includes(term) ||
    (c.identification || '').toString().includes(term)
  ), [caregivers, term]);

  // Antes se calculaba y no se usaba: la tabla iteraba `patients` y el
  // buscador de la pestaña Pacientes no filtraba nada.
  const filteredPatients = useMemo(() => patients.filter(p =>
    (p.fullName || '').toLowerCase().includes(term) ||
    (p.identification || '').toString().includes(term) ||
    (p.diagnosis || '').toLowerCase().includes(term)
  ), [patients, term]);

  const filteredProfessionals = useMemo(() => professionals.filter(p =>
    (p.fullName || '').toLowerCase().includes(term) ||
    (p.identification || '').toString().includes(term) ||
    (p.position || '').toLowerCase().includes(term)
  ), [professionals, term]);

  const pendingRequests = filteredCaregivers.filter(c => c.status === 'PENDIENTE');
  const preselectedRequests = filteredCaregivers.filter(c => c.status === 'PRESELECCIONADO');
  const activeCaregivers = filteredCaregivers.filter(c => c.status === 'APROBADO');

  const counts = {
    METRICAS: null,
    SOLICITUDES: caregivers.filter(c => c.status === 'PENDIENTE').length,
    VALIDACION: caregivers.filter(c => c.status === 'PRESELECCIONADO').length,
    ACTIVOS: caregivers.filter(c => c.status === 'APROBADO').length,
    PACIENTES: patients.length,
    PROFESIONALES: professionals.length,
    FINANCIERO: null
  };

  const mostrarBuscador = !['METRICAS', 'FINANCIERO'].includes(activeTab);

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-ink-50">

      <header className="sticky top-0 z-40 shadow-e2">
        <div className="bg-brand-800 text-white on-brand">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-lg font-semibold tracking-tight text-white truncate">
                ELÍGEME
                {/* El sufijo se cae en pantallas angostas: truncado dejaba
                    "Panel administrat…" cortado a mitad de palabra. */}
                <span className="font-normal text-brand-200 hidden sm:inline"> · Panel administrativo</span>
              </h1>
              <p className="text-xs text-brand-200 mt-0.5 truncate">
                Hospital y Alcaldía de Támesis
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="ghost"
                size="md"
                onClick={() => fetchData({ silent: true })}
                loading={refreshing}
                icon={<MdRefresh />}
                className="text-brand-100 hover:bg-white/10 hover:text-white"
              >
                <span className="hidden sm:inline">Actualizar</span>
              </Button>
              <Button
                variant="ghost"
                size="md"
                onClick={onLogout}
                icon={<MdLogout />}
                className="text-brand-100 hover:bg-white/10 hover:text-white"
              >
                <span className="hidden sm:inline">Salir</span>
              </Button>
            </div>
          </div>
        </div>

        <NavTabs tabs={TABS} counts={counts} active={activeTab} onChange={(id) => {
          setActiveTab(id);
          if (id === 'FINANCIERO') setReporteAbierto(null);
        }} />
      </header>

      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">

        {loadError && (
          <div role="alert" className="mb-5 flex flex-wrap items-center gap-3 rounded-lg border border-risk-border bg-risk-soft px-4 py-3">
            <MdWarning aria-hidden="true" className="text-lg text-risk shrink-0" />
            <p className="text-sm text-risk-strong flex-1">{loadError}</p>
            <Button variant="secondary" size="sm" onClick={() => fetchData()}>Reintentar</Button>
          </div>
        )}

        {mostrarBuscador && (
          <div className="mb-5 flex justify-end">
            <SearchInput
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nombre, cédula o diagnóstico…"
              className="w-full sm:max-w-sm"
            />
          </div>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Estadísticas                                                     */}
        {/* ---------------------------------------------------------------- */}
        {activeTab === 'METRICAS' && (
          <div className="space-y-6">
            <SectionTitle
              title="Tablero de control"
              description="Cada cifra sale de un registro hecho en la plataforma. Los porcentajes muestran la operación con la que se calcularon; donde no hay base para calcular, dice «Sin registrar»."
            />

            {loading ? (
              <>
                <StatGridSkeleton count={4} />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  <ChartSkeleton />
                  <ChartSkeleton />
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 stagger">
                  <StatCard
                    label="Pacientes registrados"
                    value={stats.totalPatients}
                    formula="Filas de paciente creadas en la plataforma."
                  />
                  <StatCard
                    label="Cobertura de cuidadores"
                    value={stats.coveragePercent}
                    unit="%"
                    formula={`${stats.assigned} con cuidador ÷ ${stats.totalPatients} registrados`}
                    hint="Se calcula cuando haya al menos un paciente registrado."
                  />
                  <StatCard
                    label="Bitácoras · 7 días"
                    value={stats.logCompliance}
                    unit="%"
                    formula={`${stats.recentLogs} registradas ÷ ${stats.expectedLogs} esperadas (1 diaria × ${stats.assigned} pacientes asignados × 7 días)`}
                    hint="Se calcula cuando haya pacientes asignados a un cuidador."
                    onClick={() => setShowComplianceDetail(true)}
                    actionLabel="Ver cuidador por cuidador"
                  />
                  <StatCard
                    label="Visitas · 5 días"
                    value={stats.visitOpportunity}
                    unit="%"
                    formula={`${stats.patientsOnTime} pacientes con visita en los últimos 5 días ÷ ${stats.totalPatients} registrados`}
                    hint="Se calcula cuando haya al menos un paciente registrado."
                    onClick={() => setShowVisitsDetail(true)}
                    actionLabel="Ver el detalle de visitas"
                  />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

                  <Card>
                    <CardHeader
                      title="Población por estrato"
                      description={`${stats.totalPatients} pacientes registrados`}
                    />
                    <CardBody>
                      {stats.totalPatients === 0 ? (
                        <p className="py-14 text-center text-sm"><SinRegistrar /></p>
                      ) : (
                        <div className="h-[280px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stratumChartData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                              <CartesianGrid {...rejilla} />
                              <XAxis dataKey="corto" {...ejeX} />
                              <YAxis {...ejeY} />
                              <Tooltip
                                {...tooltipEstilo}
                                formatter={(v) => [`${v} paciente${v === 1 ? '' : 's'}`, '']}
                                labelFormatter={(_, p) => p?.[0]?.payload?.name ?? ''}
                              />
                              <Bar dataKey="cantidad" radius={[4, 4, 0, 0]} maxBarSize={44} animationDuration={ANIM_MS} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </CardBody>
                  </Card>

                  <Card>
                    <CardHeader
                      title="Diagnósticos más frecuentes"
                      description="Las cinco condiciones con más pacientes registrados"
                    />
                    <CardBody>
                      <BarList
                        items={stats.sortedDiagnoses.map(([label, value]) => ({ label, value }))}
                        total={stats.totalPatients}
                        emptyLabel="Sin diagnósticos registrados"
                      />
                    </CardBody>
                  </Card>

                  <Card>
                    <CardHeader
                      title="Grupos de edad"
                      description={stats.conEdad < stats.totalPatients
                        ? `${stats.conEdad} de ${stats.totalPatients} pacientes tienen edad registrada`
                        : `${stats.conEdad} pacientes con edad registrada`}
                    />
                    <CardBody>
                      <OrdinalSplit
                        total={stats.conEdad}
                        segments={[
                          { label: '0 a 18 años',  value: stats.ageGroups.pediatrico, color: RAMPA_ORDINAL[0] },
                          { label: '19 a 59 años', value: stats.ageGroups.adulto,     color: RAMPA_ORDINAL[2] },
                          { label: '60 años o más', value: stats.ageGroups.geriatrico, color: RAMPA_ORDINAL[4] }
                        ]}
                      />
                    </CardBody>
                  </Card>

                  <Card>
                    <CardHeader title="Estado de la cobertura" />
                    <CardBody className="space-y-5">
                      <Meter
                        label="Pacientes con cuidador asignado"
                        value={stats.assigned}
                        total={stats.totalPatients}
                        formula={stats.coveragePercent !== null
                          ? `${stats.assigned} ÷ ${stats.totalPatients} = ${stats.coveragePercent}%`
                          : null}
                      />
                      {stats.unassigned > 0 && (
                        <p className="flex items-start gap-2.5 rounded-md bg-warn-soft border border-warn-border px-3.5 py-3 text-sm text-warn-strong">
                          <MdWarning aria-hidden="true" className="text-base shrink-0 mt-0.5" />
                          <span>
                            <strong className="font-semibold">{stats.unassigned}</strong>{' '}
                            {stats.unassigned === 1 ? 'persona registrada no tiene' : 'personas registradas no tienen'}{' '}
                            cuidador asignado.
                          </span>
                        </p>
                      )}
                    </CardBody>
                  </Card>
                </div>
              </>
            )}
          </div>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Solicitudes                                                      */}
        {/* ---------------------------------------------------------------- */}
        {activeTab === 'SOLICITUDES' && (
          <div>
            <SectionTitle
              title="Postulaciones recientes"
              description="Aspirantes que enviaron su solicitud y esperan una primera revisión."
            />
            {loading ? <ListSkeleton rows={3} /> : pendingRequests.length === 0 ? (
              <EmptyState
                icon={<MdInbox />}
                title={term ? 'Ninguna postulación coincide con la búsqueda' : 'No hay postulaciones pendientes'}
                description={term
                  ? 'Prueba con otro nombre o número de cédula.'
                  : 'Cuando alguien se postule desde el formulario público, aparecerá aquí.'}
              />
            ) : (
              <div className="space-y-3 stagger">
                {pendingRequests.map(req => (
                  <Card key={req.id} className="p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base font-semibold text-ink-900">{req.fullName}</h3>
                      <p className="text-sm text-ink-500 mt-1">
                        C.C. {req.identification || 'sin registrar'} · {req.email || 'sin correo'}
                      </p>
                    </div>
                    <Button
                      variant="primary"
                      icon={<MdRemoveRedEye />}
                      onClick={() => setSelectedCandidate(req)}
                      className="sm:shrink-0"
                    >
                      Revisar hoja de vida
                    </Button>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Validación                                                       */}
        {/* ---------------------------------------------------------------- */}
        {activeTab === 'VALIDACION' && (
          <div>
            <SectionTitle
              title="Validación de documentos"
              description="Aspirantes preseleccionados. Para aprobar la contratación se exige el diploma o certificado cargado."
            />
            {loading ? <ListSkeleton rows={3} /> : preselectedRequests.length === 0 ? (
              <EmptyState
                icon={<MdFolderOpen />}
                title={term ? 'Nadie coincide con la búsqueda' : 'No hay validaciones pendientes'}
                description={term
                  ? 'Prueba con otro nombre o número de cédula.'
                  : 'Los aspirantes preseleccionados desde Solicitudes aparecerán aquí.'}
              />
            ) : (
              <div className="space-y-3 stagger">
                {preselectedRequests.map(aspirante => (
                  <Card key={aspirante.id} className="p-5 flex flex-col lg:flex-row lg:items-center gap-4">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base font-semibold text-ink-900">{aspirante.fullName}</h3>
                      <p className="text-sm text-ink-500 mt-1">
                        C.C. {aspirante.identification || 'sin registrar'}
                      </p>
                      <div className="mt-3">
                        {aspirante.senaFile ? (
                          <a
                            href={fileUrl(aspirante.senaFile)}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 min-h-9 text-sm font-medium text-brand-700 hover:text-brand-800 underline underline-offset-2"
                          >
                            <MdInsertDriveFile aria-hidden="true" />
                            Ver documento cargado
                          </a>
                        ) : (
                          <Badge tone="warn" icon={<MdWarning />}>Esperando el archivo</Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2.5 lg:shrink-0">
                      <Button variant="secondary" icon={<MdRemoveRedEye />} onClick={() => setSelectedCandidate(aspirante)}>
                        Hoja de vida
                      </Button>
                      <Button variant="risk" onClick={() => handleStatusChange(aspirante.id, 'RECHAZADO')}>
                        Rechazar
                      </Button>
                      <Button
                        variant="ok"
                        icon={<MdVerified />}
                        disabled={!aspirante.senaFile}
                        onClick={() => handleStatusChange(aspirante.id, 'APROBADO')}
                        title={aspirante.senaFile ? undefined : 'Falta el documento de formación'}
                      >
                        Aprobar
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Cuidadores activos                                               */}
        {/* ---------------------------------------------------------------- */}
        {activeTab === 'ACTIVOS' && (
          <div>
            <SectionTitle
              title="Red de cuidadores"
              description="Cuidadores aprobados y su paciente a cargo."
            />
            {loading ? <CardGridSkeleton count={6} /> : activeCaregivers.length === 0 ? (
              <EmptyState
                icon={<MdGroups />}
                title={term ? 'Ningún cuidador coincide con la búsqueda' : 'Todavía no hay cuidadores activos'}
                description={term
                  ? 'Prueba con otro nombre o número de cédula.'
                  : 'Los aspirantes aprobados en Validación aparecerán aquí.'}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 stagger">
                {activeCaregivers.map(caregiver => {
                  const assignedPatient = patients.find(p => String(p.caregiverId) === String(caregiver.id));
                  return (
                    <Card key={caregiver.id} className="p-5 flex flex-col">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="text-base font-semibold text-ink-900 truncate">{caregiver.fullName}</h3>
                          <p className="text-xs text-ink-500 mt-1">
                            C.C. {caregiver.identification || 'sin registrar'}
                          </p>
                        </div>
                        <Badge tone="ok">Activo</Badge>
                      </div>

                      <dl className="mt-4 flex items-baseline justify-between gap-3 rounded-md bg-ink-50 border border-ink-200 px-3.5 py-2.5">
                        <dt className="text-xs font-medium uppercase tracking-wide text-ink-500">Código</dt>
                        <dd className="font-mono text-sm font-semibold text-ink-900">
                          {caregiver.accessCode || <SinRegistrar />}
                        </dd>
                      </dl>

                      <div className="mt-3 flex-1 rounded-md border border-ink-200 px-3.5 py-3">
                        <p className="text-xs font-medium uppercase tracking-wide text-ink-500">
                          Paciente asignado
                        </p>
                        {assignedPatient ? (
                          <>
                            <p className="text-sm font-medium text-ink-900 mt-1.5">{assignedPatient.fullName}</p>
                            {/* Mismo semáforo que ve el visitador médico: la
                                alcaldía y la calle miran la misma cola. */}
                            {(() => {
                              const pr = prioridadDeCuidador(caregiver.id);
                              if (!pr) return null;
                              return (
                                <div className="mt-2.5">
                                  <Badge
                                    tone={TONO_NIVEL[pr.nivel]}
                                    icon={pr.nivel === 'alta' ? <MdWarning /> : pr.atendida ? <MdCheckCircle /> : undefined}
                                  >
                                    {pr.etiqueta}
                                  </Badge>
                                  {pr.motivos[0] && (
                                    <p className="text-xs text-ink-500 mt-1.5 leading-relaxed">
                                      {pr.motivos[0].texto}
                                    </p>
                                  )}
                                </div>
                              );
                            })()}
                          </>
                        ) : (
                          <Button
                            variant="secondary"
                            size="sm"
                            icon={<MdAdd />}
                            className="mt-2 w-full"
                            onClick={() => setCaregiverToAssign(caregiver)}
                          >
                            Asignar paciente
                          </Button>
                        )}
                      </div>

                      <div className="flex gap-2.5 mt-4">
                        <Button variant="secondary" className="flex-1" icon={<MdRemoveRedEye />} onClick={() => setSelectedCandidate(caregiver)}>
                          Perfil
                        </Button>
                        <Button variant="primary" className="flex-1" icon={<MdEventNote />} onClick={() => handleViewLogs(caregiver)}>
                          Bitácoras
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Pacientes                                                        */}
        {/* ---------------------------------------------------------------- */}
        {activeTab === 'PACIENTES' && (
          <div>
            <SectionTitle
              title="Listado maestro de pacientes"
              description={`${patients.length} personas registradas en el programa.`}
              action={
                <Button variant="primary" icon={<MdAdd />} onClick={() => setShowPatientForm(true)}>
                  Nuevo paciente
                </Button>
              }
            />
            {loading ? <TableSkeleton rows={8} cols={6} /> : filteredPatients.length === 0 ? (
              <EmptyState
                icon={<MdLocalHospital />}
                title={term ? 'Ningún paciente coincide con la búsqueda' : 'Todavía no hay pacientes registrados'}
                description={term
                  ? 'Prueba con otro nombre, cédula o diagnóstico.'
                  : 'Registra el primer paciente para empezar a medir la cobertura del programa.'}
                action={!term && (
                  <Button variant="primary" icon={<MdAdd />} onClick={() => setShowPatientForm(true)}>
                    Registrar paciente
                  </Button>
                )}
              />
            ) : (
              <Table minWidth="min-w-[760px]">
                <thead>
                  <tr>
                    <Th>Paciente</Th>
                    <Th>Estrato</Th>
                    <Th>Diagnóstico</Th>
                    <Th>Cuidador</Th>
                    <Th>Prioridad</Th>
                    <Th align="right">Acciones</Th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPatients.map(p => {
                    const assigned = caregivers.find(c => String(c.id) === String(p.caregiverId));
                    return (
                      <Tr key={p.id}>
                        <Td>
                          {/* Sin nowrap, un nombre de tres palabras se parte
                              en tres líneas dentro de la tabla en móvil. */}
                          <p className="font-medium text-ink-900 whitespace-nowrap">{p.fullName}</p>
                          <p className="text-xs text-ink-500 mt-0.5">
                            {p.age ? `${p.age} años` : <SinRegistrar className="text-xs" />}
                          </p>
                        </Td>
                        <Td>
                          {p.stratum
                            ? <Badge>Estrato {p.stratum}</Badge>
                            : <SinRegistrar className="text-xs" />}
                        </Td>
                        <Td className="text-ink-700 max-w-[220px] truncate">{p.diagnosis || <SinRegistrar />}</Td>
                        <Td>
                          {assigned
                            ? <span className="text-ink-900">{assigned.fullName}</span>
                            : <SinRegistrar className="text-xs" />}
                        </Td>
                        <Td>
                          {(() => {
                            const pr = prioridadPorPaciente.get(p.id);
                            if (!pr) return <SinRegistrar className="text-xs" />;
                            return (
                              <Badge
                                tone={TONO_NIVEL[pr.nivel]}
                                icon={pr.nivel === 'alta' ? <MdWarning /> : pr.atendida ? <MdCheckCircle /> : undefined}
                                title={pr.motivos.map(m => m.texto).join(' · ')}
                              >
                                {pr.etiqueta}
                              </Badge>
                            );
                          })()}
                        </Td>
                        <Td align="right">
                          <Button variant="secondary" size="sm" icon={<MdRemoveRedEye />} onClick={() => setSelectedPatient(p)}>
                            Ver perfil
                          </Button>
                        </Td>
                      </Tr>
                    );
                  })}
                </tbody>
              </Table>
            )}
          </div>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Profesionales                                                    */}
        {/* ---------------------------------------------------------------- */}
        {activeTab === 'PROFESIONALES' && (
          <div>
            <SectionTitle
              title="Personal médico"
              description="Profesionales habilitados para registrar visitas domiciliarias."
              action={
                <Button variant="primary" icon={<MdAdd />} onClick={() => setShowProForm(true)}>
                  Nuevo profesional
                </Button>
              }
            />
            {loading ? <CardGridSkeleton count={3} /> : filteredProfessionals.length === 0 ? (
              <EmptyState
                icon={<MdMedicalServices />}
                title={term ? 'Ningún profesional coincide con la búsqueda' : 'Todavía no hay profesionales registrados'}
                description={term
                  ? 'Prueba con otro nombre, cédula o cargo.'
                  : 'Registra al personal médico que hará las visitas domiciliarias.'}
                action={!term && (
                  <Button variant="primary" icon={<MdAdd />} onClick={() => setShowProForm(true)}>
                    Registrar profesional
                  </Button>
                )}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 stagger">
                {filteredProfessionals.map(pro => (
                  <Card key={pro.id} className="p-5 flex flex-col">
                    <div className="flex items-start gap-3.5">
                      <span aria-hidden="true" className="shrink-0 h-11 w-11 rounded-md bg-brand-50 text-brand-700 flex items-center justify-center text-xl">
                        <MdMedicalServices />
                      </span>
                      <div className="min-w-0">
                        <h3 className="text-base font-semibold text-ink-900 truncate">{pro.fullName}</h3>
                        <p className="text-sm text-ink-500 mt-0.5">{pro.position || <SinRegistrar />}</p>
                        <p className="text-xs text-ink-500 mt-1 truncate">{pro.email}</p>
                      </div>
                    </div>

                    <Button
                      variant="secondary"
                      className="mt-4 w-full"
                      icon={<MdAssignment />}
                      onClick={() => handleViewVisits(pro)}
                    >
                      Perfil y visitas
                    </Button>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Reportes                                                         */}
        {/* ---------------------------------------------------------------- */}
        {activeTab === 'FINANCIERO' && (
          <div>
            {!reporteAbierto ? (
              <>
                <SectionTitle
                  title="Reportes institucionales"
                  description="Elige el reporte que necesitas generar."
                />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 stagger">
                  {REPORTES.map(r => (
                    <Card
                      key={r.id}
                      as="button"
                      interactive
                      onClick={() => setReporteAbierto(r.id)}
                      className="p-6 flex flex-col items-center text-center"
                    >
                      <img
                        src={r.imagen}
                        alt=""
                        loading="lazy"
                        className="w-40 h-40 object-contain"
                      />
                      <h3 className="mt-4 text-base font-semibold text-ink-900">{r.titulo}</h3>
                      <p className="mt-1.5 text-sm text-ink-500">{r.descripcion}</p>
                    </Card>
                  ))}
                </div>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  icon={<MdArrowBack />}
                  className="mb-4 -ml-2"
                  onClick={() => setReporteAbierto(null)}
                >
                  Volver a reportes
                </Button>
                {reporteAbierto === 'FINANZAS' && <ReportesFinancieros user={user} />}
                {reporteAbierto === 'FURAG'    && <EvidenciaFurag user={user} />}
                {reporteAbierto === 'ADRES'    && <CaracterizacionPrograma />}
              </>
            )}
          </div>
        )}
      </main>

      {/* ================================================================== */}
      {/* Modales                                                            */}
      {/* ================================================================== */}

      <ApplicantDetailModal
        open={Boolean(selectedCandidate)}
        candidate={selectedCandidate}
        onClose={() => setSelectedCandidate(null)}
        onAction={handleStatusChange}
      />

      <ComplianceModal
        open={showComplianceDetail}
        onClose={() => setShowComplianceDetail(false)}
        detail={logDetail}
      />

      <VisitsOverviewModal
        open={showVisitsDetail}
        onClose={() => setShowVisitsDetail(false)}
        detail={visitsDetail}
        totalPacientes={stats.totalPatients}
      />

      <AssignModal
        caregiver={caregiverToAssign}
        pacientesLibres={patients.filter(p => !p.caregiverId)}
        onAssign={handleAssignPatient}
        onClose={() => setCaregiverToAssign(null)}
      />

      <LogsModal data={logsModal} onClose={() => setLogsModal(null)} />

      <ProfessionalModal
        data={visitsModal}
        pro={selectedPro}
        onClose={() => { setVisitsModal(null); setSelectedPro(null); }}
      />

      <PatientModal
        patient={selectedPatient}
        caregivers={caregivers}
        onClose={() => setSelectedPatient(null)}
      />

      <NewPatientModal
        open={showPatientForm}
        onClose={() => setShowPatientForm(false)}
        data={newPatientData}
        setData={setNewPatientData}
        onSubmit={handleCreatePatient}
        saving={saving}
      />

      <NewProfessionalModal
        open={showProForm}
        onClose={() => setShowProForm(false)}
        data={newProData}
        setData={setNewProData}
        onSubmit={handleCreateProfessional}
        saving={saving}
      />
    </div>
  );
}

// ============================================================================
// Navegación por pestañas
// ============================================================================

function NavTabs({ tabs, counts, active, onChange }) {
  const refs = useRef({});

  // Flechas para moverse entre pestañas, Inicio y Fin a los extremos.
  // Sin esto la barra es un montón de botones sueltos para el teclado.
  const onKeyDown = (e) => {
    const idx = tabs.findIndex(t => t.id === active);
    let next = null;
    if (e.key === 'ArrowRight') next = tabs[(idx + 1) % tabs.length];
    else if (e.key === 'ArrowLeft') next = tabs[(idx - 1 + tabs.length) % tabs.length];
    else if (e.key === 'Home') next = tabs[0];
    else if (e.key === 'End') next = tabs[tabs.length - 1];
    if (!next) return;
    e.preventDefault();
    onChange(next.id);
    refs.current[next.id]?.focus();
  };

  // El scroll vive en el contenedor y la fila usa `w-max mx-auto`: así las
  // pestañas quedan centradas cuando caben, y siguen desplazándose sin
  // cortar la primera cuando no caben — que es lo que rompe poner
  // `justify-center` directamente sobre un flex con overflow.
  return (
    <div className="bg-white border-b border-ink-200 overflow-x-auto">
      <div
        role="tablist"
        aria-label="Secciones del panel"
        onKeyDown={onKeyDown}
        className="w-max mx-auto px-4 sm:px-6 flex gap-1"
      >
        {tabs.map(tab => {
          const isActive = active === tab.id;
          const count = counts[tab.id];
          return (
            <button
              key={tab.id}
              ref={el => { refs.current[tab.id] = el; }}
              role="tab"
              aria-selected={isActive}
              tabIndex={isActive ? 0 : -1}
              onClick={() => onChange(tab.id)}
              className={[
                'relative flex items-center gap-2 whitespace-nowrap min-h-12 px-3.5',
                'text-sm font-medium transition-colors duration-150',
                'after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:transition-colors',
                isActive
                  ? 'text-brand-700 after:bg-brand-700'
                  : 'text-ink-600 hover:text-ink-900 after:bg-transparent'
              ].join(' ')}
            >
              <span aria-hidden="true" className="text-base">{tab.icon}</span>
              {tab.label}
              {count > 0 && (
                <span
                  className={[
                    'ml-0.5 rounded-full px-1.5 py-0.5 text-2xs font-semibold',
                    isActive ? 'bg-brand-700 text-white' : 'bg-ink-100 text-ink-600'
                  ].join(' ')}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// Modal · cumplimiento de bitácoras
// ============================================================================

function ComplianceModal({ open, onClose, detail }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      tone="neutral"
      icon={<MdEditNote />}
      title="Cumplimiento de bitácoras"
      subtitle={`Últimos 7 días · se espera una bitácora diaria por cada paciente asignado · umbral configurado: ${UMBRAL_CUMPLIMIENTO}%`}
      footer={
        <>
          <div className="flex flex-wrap gap-4 text-xs text-ink-500 mr-auto">
            <span className="flex items-center gap-1.5">
              <span aria-hidden="true" className="h-2.5 w-2.5 rounded-xs bg-brand-600" /> Día completo
            </span>
            <span className="flex items-center gap-1.5">
              <span aria-hidden="true" className="h-2.5 w-2.5 rounded-xs bg-brand-200" /> Parcial
            </span>
            <span className="flex items-center gap-1.5">
              <span aria-hidden="true" className="h-2.5 w-2.5 rounded-xs bg-ink-200" /> Sin bitácora
            </span>
          </div>
          <Button variant="primary" onClick={onClose}>Cerrar</Button>
        </>
      }
    >
      <div className="grid grid-cols-3 gap-4 mb-5">
        <StatCard label="Cuidadores evaluados" value={detail.filas.length} />
        <StatCard label={`Cumplen (≥${UMBRAL_CUMPLIMIENTO}%)`} value={detail.cumplen.length} />
        <StatCard label="No cumplen" value={detail.incumplen.length} />
      </div>

      {detail.filas.length === 0 ? (
        <EmptyState
          icon={<MdEditNote />}
          title="No hay cuidadores con pacientes asignados"
          description="El cumplimiento se mide sobre los pacientes que ya tienen cuidador. Asigna pacientes para poder medirlo."
        />
      ) : (
        <div className="space-y-3">
          {detail.filas.map(fila => {
            const cumple = fila.percent !== null && fila.percent >= UMBRAL_CUMPLIMIENTO;
            return (
              <Card key={fila.caregiverId} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-sm font-semibold text-ink-900">
                      {cumple
                        ? <MdCheckCircle aria-hidden="true" className="text-ok shrink-0" />
                        : <MdWarning aria-hidden="true" className="text-risk shrink-0" />}
                      {fila.name}
                      <span className="sr-only">{cumple ? '· cumple' : '· no cumple'}</span>
                    </p>
                    <p className="text-xs text-ink-500 mt-1">
                      C.C. {fila.identification || 'sin registrar'} · {fila.pacientes.length}{' '}
                      {fila.pacientes.length === 1 ? 'paciente' : 'pacientes'}:{' '}
                      {fila.pacientes.map(p => p.fullName).join(', ')}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-2xl font-bold text-ink-900 leading-none" data-numeral>{fila.percent}%</p>
                    <p className="text-xs text-ink-500 mt-1.5">
                      {fila.registradas} de {fila.esperado} bitácoras
                    </p>
                  </div>
                </div>

                <div className="flex gap-1.5 mt-4">
                  {fila.dias.map(d => (
                    <div key={d.key} className="flex-1 text-center">
                      <div
                        title={`${d.cubiertos} de ${d.total} bitácoras`}
                        className={[
                          'h-8 rounded-xs flex items-center justify-center text-xs font-semibold',
                          d.completo
                            ? 'bg-brand-600 text-white'
                            : d.cubiertos > 0
                              ? 'bg-brand-200 text-brand-900'
                              : 'bg-ink-200 text-ink-600'
                        ].join(' ')}
                      >
                        {d.cubiertos}/{d.total}
                      </div>
                      <p className="text-2xs text-ink-500 mt-1 capitalize">{d.label} {d.dayNum}</p>
                    </div>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </Modal>
  );
}

// ============================================================================
// Modal · visitas
// ============================================================================

function VisitsOverviewModal({ open, onClose, detail, totalPacientes }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      tone="neutral"
      icon={<MdMedicalServices />}
      title="Visitas domiciliarias"
      subtitle="Oportunidad médica medida sobre una ventana de 5 días"
      footer={<Button variant="primary" onClick={onClose}>Cerrar</Button>}
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard label="Visitas registradas" value={detail.totalVisitas} formula="Total histórico." />
        <StatCard label="En los últimos 5 días" value={detail.totalRecientes} />
        <StatCard
          label="Pacientes al día"
          value={totalPacientes > 0 ? detail.pacientesAlDia : null}
          formula={totalPacientes > 0 ? `${detail.pacientesAlDia} de ${totalPacientes} registrados` : null}
          hint="Se calcula cuando haya pacientes registrados."
        />
      </div>

      <section className="mb-6">
        <h3 className="text-sm font-semibold text-ink-900 mb-3">Visitas por profesional</h3>
        {detail.filasPro.length === 0 ? (
          <EmptyState icon={<MdMedicalServices />} title="Todavía no se ha registrado ninguna visita" />
        ) : (
          <Table minWidth="min-w-[520px]">
            <thead>
              <tr>
                <Th>Profesional</Th>
                <Th align="center">Total</Th>
                <Th align="center">Últimos 5 días</Th>
                <Th align="right">Última visita</Th>
              </tr>
            </thead>
            <tbody>
              {detail.filasPro.map(pro => (
                <Tr key={pro.id}>
                  <Td>
                    <p className="font-medium text-ink-900">{pro.name}</p>
                    <p className="text-xs text-ink-500 mt-0.5">{pro.position || <SinRegistrar />}</p>
                  </Td>
                  <Td align="center" className="font-semibold">{pro.total}</Td>
                  <Td align="center">{pro.recientes}</Td>
                  <Td align="right" className="text-ink-500 text-xs">
                    {pro.ultima ? pro.ultima.toLocaleDateString('es-CO') : <SinRegistrar />}
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </section>

      <section>
        <h3 className="text-sm font-semibold text-ink-900 mb-3">Estado por paciente</h3>
        {detail.filasPaciente.length === 0 ? (
          <EmptyState icon={<MdLocalHospital />} title="No hay pacientes registrados" />
        ) : (
          <Table minWidth="min-w-[520px]">
            <thead>
              <tr>
                <Th>Paciente</Th>
                <Th align="center">Visitas</Th>
                <Th align="right">Última visita</Th>
                <Th align="right">Estado</Th>
              </tr>
            </thead>
            <tbody>
              {detail.filasPaciente.map(p => (
                <Tr key={p.id}>
                  <Td className="font-medium text-ink-900">{p.name}</Td>
                  <Td align="center" className="font-semibold">{p.total}</Td>
                  <Td align="right" className="text-ink-500 text-xs">
                    {p.ultima
                      ? `${p.ultima.toLocaleDateString('es-CO')} · hace ${p.diasSin} d`
                      : 'Nunca visitado'}
                  </Td>
                  <Td align="right">
                    <Badge tone={p.alDia ? 'ok' : 'warn'}>{p.alDia ? 'Al día' : 'Pendiente'}</Badge>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </section>
    </Modal>
  );
}

// ============================================================================
// Modal · asignar paciente
// ============================================================================

function AssignModal({ caregiver, pacientesLibres, onAssign, onClose }) {
  return (
    <Modal
      open={Boolean(caregiver)}
      onClose={onClose}
      size="sm"
      title="Asignar paciente"
      subtitle={caregiver ? `Cuidador: ${caregiver.fullName}` : undefined}
      icon={<MdGroups />}
      footer={<Button variant="secondary" onClick={onClose}>Cancelar</Button>}
    >
      {pacientesLibres.length === 0 ? (
        <EmptyState
          icon={<MdLocalHospital />}
          title="No hay pacientes sin cuidador"
          description="Todos los pacientes registrados ya tienen a alguien a cargo."
        />
      ) : (
        <ul className="divide-y divide-ink-100 rounded-lg border border-ink-200 bg-white overflow-hidden">
          {pacientesLibres.map(p => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => onAssign(p.id)}
                className="w-full text-left min-h-12 px-4 py-3 text-sm text-ink-900 hover:bg-brand-50 transition-colors"
              >
                <span className="font-medium">{p.fullName}</span>
                {p.diagnosis && <span className="block text-xs text-ink-500 mt-0.5">{p.diagnosis}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}

// ============================================================================
// Modal · bitácoras
// ============================================================================

function LogsModal({ data, onClose }) {
  return (
    <Modal
      open={Boolean(data)}
      onClose={onClose}
      size="lg"
      tone="neutral"
      icon={<MdEventNote />}
      title="Bitácoras y visitas"
      subtitle={data?.nombre}
      footer={<Button variant="primary" onClick={onClose}>Cerrar</Button>}
    >
      {!data?.registros?.length ? (
        <EmptyState
          icon={<MdEventNote />}
          title="No hay registros"
          description="Cuando el cuidador registre una bitácora o un profesional una visita, aparecerán aquí."
        />
      ) : (
        <div className="space-y-4">
          {data.registros.map((log, idx) => (
            log.recordType === 'PROFESIONAL'
              ? <VisitaCard key={`v-${idx}`} visita={log} />
              : <BitacoraCard key={`l-${idx}`} log={log} />
          ))}
        </div>
      )}
    </Modal>
  );
}

function VisitaCard({ visita }) {
  let f = {};
  try { f = JSON.parse(visita.formData); } catch { f = {}; }

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-ink-100">
        <p className="flex items-center gap-2 text-sm font-semibold text-ink-900">
          <MdMedicalServices aria-hidden="true" className="text-brand-600" />
          {new Date(visita.date).toLocaleDateString('es-CO')}
          {visita.time && <span className="font-normal text-ink-500">· {visita.time}</span>}
        </p>
        <Badge tone="brand">Visita profesional</Badge>
      </div>
      <CardBody className="pt-4">
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Dato label="Motivo" value={f.reason} />
          <Dato label="Diagnóstico" value={f.diagnosisMain} />
          <Dato label="Conducta a seguir" value={f.conduct} className="sm:col-span-2" />
        </dl>
      </CardBody>
    </Card>
  );
}

function BitacoraCard({ log }) {
  let data = {};
  try { data = JSON.parse(log.content); } catch { data = { observations: log.content }; }

  const alerta = Array.isArray(data.alerts) && data.alerts.length > 0;
  const cuidados = [
    { label: 'Higiene', hecho: data.hygiene === 'Sí' },
    { label: 'Cambio de ropa', hecho: data.clothes === 'Sí' },
    { label: 'Piel hidratada', hecho: data.skin === 'Sí' },
    { label: 'Cambios de posición', hecho: data.position === 'Sí' }
  ];

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-ink-100">
        <p className="flex items-center gap-2 text-sm font-semibold text-ink-900">
          <MdEventNote aria-hidden="true" className="text-ink-500" />
          {new Date(log.date).toLocaleDateString('es-CO')}
          <span className="font-normal text-ink-500">
            · {new Date(log.date).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </p>
        <Badge tone={alerta || data.generalState === 'Peor' ? 'risk' : 'ok'}>
          {data.generalState || 'Estable'}
        </Badge>
      </div>

      <CardBody className="pt-4 space-y-4">
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Dato label="Nivel de conciencia" value={data.alertLevel} />
          <Dato label="Movilidad" value={data.mobility} />
          <Dato label="Ingesta" value={data.feeding} />
          <Dato label="Hidratación" value={data.hydration} />
          <Dato label="Medicamentos suministrados" value={data.medsGiven} />
          {data.medsReason && <Dato label="Motivo de no suministro" value={data.medsReason} />}
        </dl>

        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-ink-500 mb-2">
            Cuidados básicos
          </p>
          <ul className="flex flex-wrap gap-2">
            {cuidados.map(c => (
              <li key={c.label}>
                <Badge tone={c.hecho ? 'ok' : 'neutral'} icon={c.hecho ? <MdCheckCircle /> : undefined}>
                  {c.label}{c.hecho ? '' : ': sin registrar'}
                </Badge>
              </li>
            ))}
          </ul>
        </div>

        {alerta && (
          <p role="alert" className="flex items-start gap-2.5 rounded-md border border-risk-border bg-risk-soft px-3.5 py-3 text-sm text-risk-strong">
            <MdWarning aria-hidden="true" className="text-base shrink-0 mt-0.5" />
            <span>
              <strong className="font-semibold">Alertas:</strong> {data.alerts.join(', ')}
              {data.alertDesc && <span className="block mt-1">{data.alertDesc}</span>}
            </span>
          </p>
        )}

        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-ink-500 mb-2">Observaciones</p>
          <p className="text-sm text-ink-800 leading-relaxed measure">
            {data.observations || data.notes || <SinRegistrar />}
          </p>
        </div>

        <p className="flex items-center justify-end gap-2 pt-3 border-t border-ink-100 text-xs text-ink-500">
          Firma:
          {data.signature
            ? <span className="text-sm font-medium text-ink-900">{data.signature}</span>
            : <SinRegistrar className="text-xs" />}
        </p>
      </CardBody>
    </Card>
  );
}

// ============================================================================
// Modal · perfil del profesional
// ============================================================================

function ProfessionalModal({ data, pro, onClose }) {
  // La calificación se calcula sobre las visitas realmente evaluadas. El
  // panel anterior mostraba este bloque dos veces: una calculada y otra
  // con el valor estático, con cifras distintas.
  const evaluadas = (data?.visitas || []).filter(v => v.rating && Number(v.rating) > 0);
  const promedio = evaluadas.length > 0
    ? (evaluadas.reduce((a, v) => a + Number(v.rating), 0) / evaluadas.length).toFixed(1)
    : null;

  return (
    <Modal
      open={Boolean(data)}
      onClose={onClose}
      size="lg"
      icon={<MdMedicalServices />}
      title={data?.nombre || 'Profesional'}
      subtitle={pro?.position || 'Cargo sin registrar'}
      footer={<Button variant="primary" onClick={onClose}>Cerrar</Button>}
    >
      <Card className="mb-5">
        <CardHeader title="Perfil del profesional" />
        <CardBody>
          <dl className="grid grid-cols-2 lg:grid-cols-4 gap-5">
            <Dato label="Cédula" value={pro?.identification} />
            <Dato label="Cargo" value={pro?.position} />
            <Dato label="Contacto" value={pro?.phone} />
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-ink-500">
                Calificación
              </dt>
              <dd className="mt-1">
                {promedio ? (
                  <span className="flex items-center gap-1.5">
                    <MdStar aria-hidden="true" className="text-accent-500" />
                    <span className="text-sm font-semibold text-ink-900" data-numeral>{promedio}</span>
                    <span className="text-xs text-ink-500">
                      de {evaluadas.length} {evaluadas.length === 1 ? 'evaluación' : 'evaluaciones'}
                    </span>
                  </span>
                ) : (
                  <span className="text-sm"><SinRegistrar /></span>
                )}
              </dd>
            </div>
          </dl>

          <div className="mt-5 pt-5 border-t border-ink-100">
            {pro?.resumeFile ? (
              <a
                href={fileUrl(`/uploads/${pro.resumeFile}`)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 min-h-11 text-sm font-medium text-brand-700 hover:text-brand-800 underline underline-offset-2"
              >
                <MdInsertDriveFile aria-hidden="true" />
                Ver hoja de vida
              </a>
            ) : (
              <p className="text-sm text-ink-500">Hoja de vida: <SinRegistrar /></p>
            )}
          </div>
        </CardBody>
      </Card>

      <h3 className="text-sm font-semibold text-ink-900 mb-3">
        Visitas realizadas
        {data?.visitas?.length > 0 && (
          <span className="font-normal text-ink-500"> · {data.visitas.length}</span>
        )}
      </h3>

      {!data?.visitas?.length ? (
        <EmptyState
          icon={<MdCalendarToday />}
          title="Este profesional aún no ha registrado visitas"
        />
      ) : (
        <div className="space-y-4">
          {data.visitas.map((v, i) => {
            let f = {};
            try { f = JSON.parse(v.formData); } catch { f = {}; }
            return (
              <Card key={i}>
                <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-ink-100">
                  <p className="flex items-center gap-2 text-sm font-semibold text-ink-900">
                    <MdCalendarToday aria-hidden="true" className="text-brand-600" />
                    {new Date(v.date).toLocaleDateString('es-CO')}
                    {v.time && <span className="font-normal text-ink-500">· {v.time}</span>}
                  </p>
                  <Badge tone="brand">Atención domiciliaria</Badge>
                </div>
                <CardBody className="pt-4 space-y-4">
                  <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Dato label="Paciente" value={v.patientName} />
                    <Dato label="Motivo de consulta" value={f.reason} />
                    <Dato label="Diagnóstico" value={f.diagnosisMain} />
                  </dl>
                  <Dato label="Conducta o plan a seguir" value={f.conduct} />

                  {v.rating ? (
                    <div className="rounded-md border border-ink-200 bg-ink-50 px-4 py-3.5">
                      <p className="text-xs font-medium uppercase tracking-wide text-ink-500 mb-2">
                        Evaluación del paciente
                      </p>
                      <p className="flex items-center gap-1">
                        {[...Array(5)].map((_, index) => (
                          <MdStar
                            key={index}
                            aria-hidden="true"
                            className={index < v.rating ? 'text-accent-500' : 'text-ink-300'}
                          />
                        ))}
                        <span className="ml-2 text-sm font-semibold text-ink-900" data-numeral>
                          {v.rating} de 5
                        </span>
                      </p>
                      {v.evalComments && (
                        <p className="mt-2.5 text-sm text-ink-700 measure">{v.evalComments}</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-ink-500">Esta visita aún no ha sido calificada.</p>
                  )}
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}
    </Modal>
  );
}

// ============================================================================
// Modal · perfil del paciente
// ============================================================================

function PatientModal({ patient, caregivers, onClose }) {
  if (!patient) return null;
  const cuidador = caregivers.find(c => String(c.id) === String(patient.caregiverId));

  return (
    <Modal
      open
      onClose={onClose}
      size="md"
      tone="ok"
      icon={<MdPerson />}
      title={patient.fullName}
      subtitle={patient.age ? `${patient.age} años` : 'Edad sin registrar'}
      footer={<Button variant="primary" onClick={onClose}>Cerrar</Button>}
    >
      <div className="space-y-5">
        <Card>
          <CardHeader title="Información demográfica" />
          <CardBody>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Dato label="Estrato" value={patient.stratum} />
              <Dato label="Teléfono" value={patient.phone || patient.contactPhone} />
              <Dato label="Dirección" value={patient.address} className="sm:col-span-2" />
              <Dato label="Zona" value={[patient.zoneCategory, patient.zoneDetail].filter(Boolean).join(' · ')} className="sm:col-span-2" />
            </dl>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Información clínica y cuidado" />
          <CardBody>
            <dl className="space-y-4">
              <Dato label="Diagnóstico principal" value={patient.diagnosis} />
              <Dato label="Cuidador asignado" value={cuidador?.fullName} />
              <Dato label="Instrucciones particulares de cuidado" value={patient.careInstructions} />
            </dl>
          </CardBody>
        </Card>
      </div>
    </Modal>
  );
}

// ============================================================================
// Modal · nuevo paciente
// ============================================================================

function NewPatientModal({ open, onClose, data, setData, onSubmit, saving }) {
  const set = (k) => (e) => setData({ ...data, [k]: e.target.value });

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      icon={<MdAdd />}
      title="Registrar paciente"
      subtitle="Támesis, Antioquia"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" type="submit" form="form-nuevo-paciente" loading={saving}>
            Guardar paciente
          </Button>
        </>
      }
    >
      <form id="form-nuevo-paciente" onSubmit={onSubmit} className="space-y-5">
        <Field label="Nombre completo" required>
          {(p) => <input {...p} value={data.fullName} onChange={set('fullName')} autoComplete="off" />}
        </Field>

        <Field
          label="Cédula del paciente"
          required
          hint="Con este documento el sistema asigna automáticamente al cuidador que lo registre en su postulación."
        >
          {(p) => <input {...p} inputMode="numeric" value={data.identification} onChange={set('identification')} />}
        </Field>

        <Field
          label="Correo electrónico"
          required
          hint="A este correo se le envía el código de acceso del paciente."
        >
          {(p) => <input {...p} type="email" value={data.email} onChange={set('email')} />}
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Edad" required>
            {(p) => <input {...p} type="number" min="0" max="120" value={data.age} onChange={set('age')} />}
          </Field>
          <Field label="Estrato" required>
            {(p) => (
              <select {...p} value={data.stratum} onChange={set('stratum')}>
                <option value="">Seleccionar…</option>
                {[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>Estrato {n}</option>)}
              </select>
            )}
          </Field>
        </div>

        <Field label="Teléfono de contacto">
          {(p) => <input {...p} type="tel" value={data.contactPhone} onChange={set('contactPhone')} />}
        </Field>

        <Field label="Diagnóstico" required>
          {(p) => (
            <select {...p} value={data.diagnosis} onChange={set('diagnosis')}>
              <option value="">Seleccionar…</option>
              {COMMON_DISEASES.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          )}
        </Field>

        <fieldset className="rounded-lg border border-ink-200 bg-white p-4 space-y-4">
          <legend className="px-1.5 text-xs font-medium uppercase tracking-wide text-ink-600">
            Ubicación en Támesis
          </legend>

          <Field label="Zona principal" required>
            {(p) => (
              <select
                {...p}
                value={data.zoneCategory}
                onChange={(e) => setData({ ...data, zoneCategory: e.target.value, zoneDetail: '' })}
              >
                <option value="">Seleccionar…</option>
                {Object.keys(TAMESIS_ZONES).map(z => <option key={z} value={z}>{z}</option>)}
              </select>
            )}
          </Field>

          <Field label="Corregimiento, vereda o barrio" required>
            {(p) => (
              <select {...p} value={data.zoneDetail} onChange={set('zoneDetail')} disabled={!data.zoneCategory}>
                <option value="">
                  {data.zoneCategory ? 'Seleccionar…' : 'Elige primero la zona principal'}
                </option>
                {data.zoneCategory && TAMESIS_ZONES[data.zoneCategory].map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            )}
          </Field>

          <Field label="Dirección exacta o puntos de referencia" required>
            {(p) => <input {...p} value={data.address} onChange={set('address')} />}
          </Field>
        </fieldset>

        <Field label="Instrucciones de cuidado">
          {(p) => <textarea {...p} rows={3} value={data.careInstructions} onChange={set('careInstructions')} />}
        </Field>
      </form>
    </Modal>
  );
}

// ============================================================================
// Modal · nuevo profesional
// ============================================================================

function NewProfessionalModal({ open, onClose, data, setData, onSubmit, saving }) {
  const set = (k) => (e) => setData({ ...data, [k]: e.target.value });

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      icon={<MdMedicalServices />}
      title="Registrar profesional"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" type="submit" form="form-nuevo-profesional" loading={saving}>
            Registrar
          </Button>
        </>
      }
    >
      <form id="form-nuevo-profesional" onSubmit={onSubmit} className="space-y-5">
        <Field label="Nombre completo" required>
          {(p) => <input {...p} value={data.fullName} onChange={set('fullName')} />}
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Cédula" required>
            {(p) => <input {...p} inputMode="numeric" value={data.identification} onChange={set('identification')} />}
          </Field>
          <Field label="Teléfono" required>
            {(p) => <input {...p} type="tel" value={data.phone} onChange={set('phone')} />}
          </Field>
        </div>

        <Field label="Correo electrónico" required>
          {(p) => <input {...p} type="email" value={data.email} onChange={set('email')} />}
        </Field>

        <Field label="Cargo" required hint="Por ejemplo: médico general, enfermera jefe.">
          {(p) => <input {...p} value={data.position} onChange={set('position')} />}
        </Field>

        <Field label="Hoja de vida">
          {(p) => (
            <input
              {...p}
              type="file"
              accept=".pdf,.doc,.docx,image/*"
              onChange={(e) => setData({ ...data, resumeFile: e.target.files[0] })}
              className="w-full min-h-11 rounded-md border border-ink-400 bg-white px-3 py-2 text-sm text-ink-700 file:mr-3 file:rounded file:border-0 file:bg-ink-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-ink-700 hover:file:bg-ink-200"
            />
          )}
        </Field>
      </form>
    </Modal>
  );
}
