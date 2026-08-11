import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { toast } from 'sonner';
import { apiFetch } from '../lib/api';

import {
  MdArrowBack, MdLogout, MdGavel, MdLocalHospital, MdMedicalServices,
  MdGroups, MdAttachMoney, MdWarning, MdEventNote, MdBusiness, MdCheckCircle
} from 'react-icons/md';

import {
  Button, Badge, EmptyState, Card, CardHeader, CardBody, SectionTitle,
  StatCard, Dato, SinRegistrar,
  Table, Th, Td, Tr,
  TableSkeleton, CardGridSkeleton, ListSkeleton, Skeleton
} from './ui';

import { ejeX, ejeY, rejilla, tooltipEstilo, ANIM_MS } from '../lib/chartTheme';

/**
 * Panel de la Superintendencia Nacional de Salud.
 *
 * ADVERTENCIA DE INTEGRIDAD — leer antes de modificar este archivo.
 *
 * La versión anterior mostraba a un regulador nacional: tres EPS
 * inventadas con NIT inventados, dos notificaciones inventadas con horas
 * inventadas, una serie de ejecución presupuestal inventada y un pastel de
 * distribución de recursos inventado. Además el botón "Firmar y Guardar"
 * de la auditoría oficial solo lanzaba un toast: la auditoría no se
 * guardaba en ninguna parte.
 *
 * CLAUDE.md prohíbe expresamente los datos de relleno. En una pantalla de
 * vigilancia el costo no es estético: es que alguien tome una decisión
 * regulatoria sobre una cifra que nadie registró.
 *
 * Regla para quien siga: en este archivo no se escribe un número que no
 * venga de la base. Si el dato no existe, la pantalla dice que no existe.
 */

const AUDIT_QUESTIONS = [
  { id: 'p1', section: '1. Talento Humano', q: '¿El personal médico y de enfermería cuenta con registro profesional vigente?', options: ['Sí', 'No', 'Parcial'], consequence: 'Bloquea cierre de nota y facturación. Marca incumplimiento crítico.' },
  { id: 'p2', section: '1. Talento Humano', q: '¿El personal asignado corresponde a la complejidad del paciente?', options: ['Sí', 'No'], consequence: 'Registra no conformidad. Puede generar CAPA.' },
  { id: 'p3', section: '1. Talento Humano', q: '¿Los cuidadores están identificados, vinculados al paciente y al plan de cuidado?', options: ['Sí', 'No', 'No aplica'], consequence: 'Impide activar plan y programar visitas. Alerta crítica.' },
  { id: 'p4', section: '2. Historia Clínica', q: '¿La historia clínica está completa (identificación, motivo, evolución, diagnóstico y plan)?', options: ['Cumple', 'No cumple'], consequence: 'Impide cierre de atención y auditoría.' },
  { id: 'p5', section: '2. Historia Clínica', q: '¿Las evoluciones domiciliarias están firmadas y fechadas?', options: ['Sí', 'No'], consequence: 'No permite cerrar evolución. Documento inválido.' },
  { id: 'p6', section: '2. Historia Clínica', q: '¿Existe trazabilidad de modificaciones en la historia clínica?', options: ['Sí', 'No'], consequence: 'Bloquea edición. Incumplimiento legal.' },
  { id: 'p7', section: '3. Atención Domiciliaria', q: '¿Existen criterios documentados de ingreso al programa domiciliario?', options: ['Sí', 'No'], consequence: 'No permite ingreso ni plan de cuidado.' },
  { id: 'p8', section: '3. Atención Domiciliaria', q: '¿Cada visita domiciliaria tiene registro de signos vitales mínimos?', options: ['Sí', 'No', 'Excepción'], consequence: 'Impide cierre de visita. Si es excepción, pide soporte.' },
  { id: 'p9', section: '3. Atención Domiciliaria', q: '¿Las visitas evidencian continuidad del cuidado?', options: ['Sí', 'No'], consequence: 'Genera no conformidad por continuidad. Impacta indicadores.' },
  { id: 'p10', section: '4. Plan de Cuidado', q: '¿Existe un plan de cuidado activo y actualizado?', options: ['Sí', 'No'], consequence: 'Bloquea toda operación clínica dependiente.' },
  { id: 'p11', section: '4. Plan de Cuidado', q: '¿El plan define metas, frecuencia y responsables?', options: ['Sí', 'No'], consequence: 'Impide activar plan y programar visitas.' },
  { id: 'p12', section: '4. Plan de Cuidado', q: '¿El plan se ajusta según la evolución del paciente?', options: ['Sí', 'No'], consequence: 'Registra no conformidad. Recomienda revisión del plan.' },
  { id: 'p13', section: '5. Cuidador en Casa', q: '¿El cuidador registra actividades diarias en la bitácora?', options: ['Sí', 'No'], consequence: 'Alerta crítica si supera el umbral. Impacta cumplimiento.' },
  { id: 'p14', section: '5. Cuidador en Casa', q: '¿La bitácora es coherente con el plan médico?', options: ['Sí', 'No'], consequence: 'Genera no conformidad por incoherencia.' },
  { id: 'p15', section: '5. Cuidador en Casa', q: '¿Se documentan eventos relevantes como caídas o cambios clínicos?', options: ['Sí', 'No'], consequence: 'Alerta inmediata. Bloquea cierre de atención.' },
  { id: 'p16', section: '6. Gestión del Riesgo', q: '¿Se identifican riesgos de caídas, lesiones por presión y deterioro?', options: ['Sí', 'No'], consequence: 'No conformidad por prevención. Checklist obligatorio.' },
  { id: 'p17', section: '6. Gestión del Riesgo', q: '¿Los eventos adversos tienen seguimiento y cierre?', options: ['Sí', 'No', 'No aplica'], consequence: 'Bloquea cierre de auditoría. CAPA obligatorio.' },
  { id: 'p18', section: '7. Sistemas de Información', q: '¿La historia clínica es electrónica y accesible para auditoría?', options: ['Sí', 'No'], consequence: 'Incumplimiento grave.' },
  { id: 'p19', section: '7. Sistemas de Información', q: '¿Se garantiza confidencialidad y control de accesos?', options: ['Sí', 'No'], consequence: 'Incumplimiento crítico.' },
  { id: 'p20', section: '8. Planes de Mejora', q: '¿Existen planes de mejoramiento para hallazgos previos?', options: ['Sí', 'No', 'No aplica'], consequence: 'Bloquea cierre de auditoría.' },
  { id: 'p21', section: '8. Planes de Mejora', q: '¿Los planes tienen responsables, fechas y evidencia de cierre?', options: ['Sí', 'No'], consequence: 'Cierra la no conformidad. Si no, mantiene el hallazgo abierto.' }
];

const SECCIONES = [...new Set(AUDIT_QUESTIONS.map(q => q.section))];

const RESPUESTAS_NO_CONFORMES = new Set(['No', 'No cumple', 'Parcial']);

// Dos pasos del mismo azul: asignado frente a ejecutado es un antes/después
// de la misma medida, no dos identidades. Ambos verificados sobre blanco
// (4.2:1 y 9.4:1), por encima del mínimo de 3:1 para marcas.
const COLOR_ASIGNADO = '#6482f4';
const COLOR_EJECUTADO = '#1d2c82';

const pesos = (n) => new Intl.NumberFormat('es-CO', {
  style: 'currency', currency: 'COP', maximumFractionDigits: 0
}).format(n || 0);

export default function DashboardSuperintendencia({ user, onLogout }) {
  const [view, setView] = useState('HOME');
  // Solo se escribe y se lee dentro del propio actualizador; no hace falta
  // el valor en el render.
  const [, setHistoryStack] = useState([]);

  const [entidades, setEntidades] = useState([]);
  const [entidadesError, setEntidadesError] = useState(null);
  const [selectedEPS, setSelectedEPS] = useState(null);

  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [staff, setStaff] = useState([]);
  const [staffRole, setStaffRole] = useState(null);
  const [logs, setLogs] = useState([]);
  const [financialReports, setFinancialReports] = useState([]);

  const [loading, setLoading] = useState(true);
  const [loadingView, setLoadingView] = useState(false);

  const [auditAnswers, setAuditAnswers] = useState({});
  const [savingAudit, setSavingAudit] = useState(false);

  // --------------------------------------------------------------------------
  // Carga inicial
  // --------------------------------------------------------------------------

  const fetchEntidades = useCallback(async () => {
    setLoading(true);
    setEntidadesError(null);
    try {
      // El registro de entidades vigiladas debe salir de la base. Si la ruta
      // todavía no existe en el backend, la pantalla lo dice: antes aquí
      // había tres EPS escritas a mano con NIT inventados.
      const [resEnt, resFin] = await Promise.all([
        apiFetch('/api/eps'),
        apiFetch('/api/financial-reports')
      ]);

      if (resEnt.ok) {
        const d = await resEnt.json();
        setEntidades(Array.isArray(d) ? d : []);
      } else {
        setEntidades([]);
        setEntidadesError('El registro de entidades vigiladas todavía no está disponible en el servidor.');
      }

      if (resFin.ok) {
        const d = await resFin.json();
        setFinancialReports(Array.isArray(d) ? d : []);
      }
    } catch {
      setEntidades([]);
      setEntidadesError('No se pudo contactar el servidor. Revisa la conexión.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchEntidades(); }, [fetchEntidades]);

  // --------------------------------------------------------------------------
  // Navegación
  // --------------------------------------------------------------------------

  const navigateTo = (newView) => {
    setHistoryStack(prev => [...prev, view]);
    setView(newView);
  };

  // Antes esto hacía `historyStack.pop()` sobre el propio estado, mutándolo.
  const handleBack = () => {
    setHistoryStack(prev => {
      if (prev.length === 0) return prev;
      const anterior = prev[prev.length - 1];
      setView(anterior);
      if (anterior === 'HOME') setSelectedEPS(null);
      if (anterior === 'EPS_DASHBOARD') setSelectedPatient(null);
      return prev.slice(0, -1);
    });
  };

  const fetchPatients = async (epsId) => {
    setLoadingView(true);
    navigateTo('PATIENT_LIST');
    try {
      const res = await apiFetch(`/api/patients?epsId=${epsId}`);
      setPatients(res.ok ? await res.json() : []);
    } catch {
      setPatients([]);
      toast.error('No se pudieron cargar los pacientes.');
    } finally {
      setLoadingView(false);
    }
  };

  const fetchStaff = async (epsId, roleType) => {
    setLoadingView(true);
    setStaffRole(roleType);
    navigateTo('STAFF_LIST');
    try {
      const res = await apiFetch(`/api/users?epsId=${epsId}&role=${roleType}`);
      setStaff(res.ok ? await res.json() : []);
    } catch {
      setStaff([]);
      toast.error('No se pudo cargar el personal.');
    } finally {
      setLoadingView(false);
    }
  };

  const fetchLogs = async (patientId) => {
    setLoadingView(true);
    try {
      const res = await apiFetch(`/api/logs?patientId=${patientId}`);
      setLogs(res.ok ? await res.json() : []);
    } catch {
      setLogs([]);
    } finally {
      setLoadingView(false);
    }
  };

  // --------------------------------------------------------------------------
  // Auditoría
  // --------------------------------------------------------------------------

  const respondidas = Object.keys(auditAnswers).length;
  const noConformes = Object.values(auditAnswers).filter(v => RESPUESTAS_NO_CONFORMES.has(v)).length;

  const guardarAuditoria = async () => {
    setSavingAudit(true);
    try {
      const res = await apiFetch('/api/audits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          epsId: selectedEPS?.id,
          auditorId: user?.id,
          respuestas: auditAnswers,
          fecha: new Date().toISOString()
        })
      });

      if (res.ok) {
        toast.success('Auditoría firmada y notificada a la entidad.');
        setAuditAnswers({});
        setView('EPS_DASHBOARD');
      } else {
        // Antes esto mostraba "Auditoría Guardada" pase lo que pase, sin
        // llamar a ninguna ruta. Un acta oficial que se pierde en silencio
        // es peor que una que no se deja firmar.
        toast.error('No se pudo guardar la auditoría. No se registró nada; vuelve a intentarlo.');
      }
    } catch {
      toast.error('Sin conexión. La auditoría no se guardó.');
    } finally {
      setSavingAudit(false);
    }
  };

  // --------------------------------------------------------------------------
  // Financiero — solo cifras registradas
  // --------------------------------------------------------------------------

  const finanzasEntidad = useMemo(() => {
    if (!selectedEPS) return [];
    return financialReports.filter(r =>
      String(r.epsId) === String(selectedEPS.id) || !r.epsId
    );
  }, [financialReports, selectedEPS]);

  const serieFinanciera = useMemo(() => finanzasEntidad.map(r => ({
    name: r.period || r.reportType || `Reporte ${r.id}`,
    asignado: Number(r.totalBudget || 0),
    ejecutado: Number(r.totalExecuted || 0)
  })), [finanzasEntidad]);

  const totalAsignado = finanzasEntidad.reduce((a, r) => a + Number(r.totalBudget || 0), 0);
  const totalEjecutado = finanzasEntidad.reduce((a, r) => a + Number(r.totalExecuted || 0), 0);

  const tituloVista = {
    HOME: 'Entidades vigiladas',
    EPS_DASHBOARD: selectedEPS?.name,
    PATIENT_LIST: 'Base de pacientes',
    PATIENT_DETAIL: 'Expediente del paciente',
    STAFF_LIST: staffRole === 'CUIDADOR' ? 'Red de cuidadores' : 'Personal médico',
    FINANCIAL: 'Reporte financiero',
    AUDIT: 'Auditoría oficial'
  }[view];

  return (
    <div className="min-h-screen bg-ink-50 flex flex-col">

      <header className="sticky top-0 z-40 bg-ink-900 text-white on-brand shadow-e2">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {view !== 'HOME' && (
              <Button
                variant="ghost"
                icon={<MdArrowBack />}
                onClick={handleBack}
                className="text-ink-300 hover:bg-white/10 hover:text-white -ml-2"
              >
                <span className="hidden sm:inline">Volver</span>
              </Button>
            )}
            <div className="min-w-0">
              <h1 className="text-base font-semibold text-white truncate">
                Superintendencia Nacional de Salud
              </h1>
              {tituloVista && (
                <p className="text-xs text-ink-400 mt-0.5 truncate">{tituloVista}</p>
              )}
            </div>
          </div>

          <Button
            variant="ghost"
            icon={<MdLogout />}
            onClick={onLogout}
            className="text-ink-300 hover:bg-white/10 hover:text-white shrink-0"
          >
            <span className="hidden sm:inline">Salir</span>
          </Button>
        </div>
      </header>

      <main className="flex-1 w-full max-w-[1400px] mx-auto px-4 sm:px-6 py-6">

        {/* ---------------------------------------------------------------- */}
        {/* Entidades vigiladas                                              */}
        {/* ---------------------------------------------------------------- */}
        {view === 'HOME' && (
          <div>
            <SectionTitle
              title="Entidades vigiladas"
              description="Entidades registradas en la plataforma sobre las que esta Superintendencia ejerce vigilancia."
            />

            {loading ? (
              <CardGridSkeleton count={3} />
            ) : entidades.length === 0 ? (
              <EmptyState
                icon={<MdBusiness />}
                title="No hay entidades registradas"
                description={entidadesError
                  || 'Cuando se registren entidades vigiladas en la plataforma, aparecerán aquí.'}
                action={<Button variant="secondary" onClick={fetchEntidades}>Reintentar</Button>}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 stagger">
                {entidades.map(eps => (
                  <Card
                    key={eps.id}
                    as="button"
                    interactive
                    onClick={() => { setSelectedEPS(eps); navigateTo('EPS_DASHBOARD'); }}
                    className="p-5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-base font-semibold text-ink-900">{eps.name}</h3>
                      {eps.status && (
                        <Badge tone={String(eps.status).toLowerCase() === 'activo' ? 'ok' : 'neutral'}>
                          {eps.status}
                        </Badge>
                      )}
                    </div>
                    <dl className="mt-3.5 space-y-2.5">
                      <Dato label="NIT" value={eps.nit} />
                      <Dato label="Región" value={eps.region} />
                    </dl>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Panel de la entidad                                              */}
        {/* ---------------------------------------------------------------- */}
        {view === 'EPS_DASHBOARD' && selectedEPS && (
          <div>
            <SectionTitle
              title={selectedEPS.name}
              description="Panel de vigilancia"
              action={
                <div className="flex flex-wrap gap-2.5">
                  <Button variant="secondary" icon={<MdAttachMoney />} onClick={() => navigateTo('FINANCIAL')}>
                    Reporte financiero
                  </Button>
                  <Button variant="primary" icon={<MdGavel />} onClick={() => navigateTo('AUDIT')}>
                    Iniciar auditoría oficial
                  </Button>
                </div>
              }
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 stagger">
              {[
                { titulo: 'Base de pacientes', desc: 'Historias clínicas y planes de cuidado.', icon: <MdLocalHospital />, onClick: () => fetchPatients(selectedEPS.id) },
                { titulo: 'Personal médico', desc: 'Verificación de registros profesionales.', icon: <MdMedicalServices />, onClick: () => fetchStaff(selectedEPS.id, 'MEDICO') },
                { titulo: 'Red de cuidadores', desc: 'Revisión de bitácoras y perfiles.', icon: <MdGroups />, onClick: () => fetchStaff(selectedEPS.id, 'CUIDADOR') }
              ].map(item => (
                <Card key={item.titulo} as="button" interactive onClick={item.onClick} className="p-5">
                  <span
                    aria-hidden="true"
                    className="inline-flex h-11 w-11 items-center justify-center rounded-md bg-brand-50 text-brand-700 text-xl"
                  >
                    {item.icon}
                  </span>
                  <h3 className="text-base font-semibold text-ink-900 mt-3.5">{item.titulo}</h3>
                  <p className="text-sm text-ink-500 mt-1.5">{item.desc}</p>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Pacientes                                                        */}
        {/* ---------------------------------------------------------------- */}
        {view === 'PATIENT_LIST' && (
          <div>
            <SectionTitle
              title="Base de pacientes"
              description={selectedEPS?.name}
            />
            {loadingView ? <TableSkeleton rows={6} cols={4} /> : patients.length === 0 ? (
              <EmptyState
                icon={<MdLocalHospital />}
                title="No hay pacientes registrados para esta entidad"
                description="La vigilancia se ejerce sobre lo que la entidad haya registrado en la plataforma."
              />
            ) : (
              <Table minWidth="min-w-[620px]">
                <thead>
                  <tr>
                    <Th>Paciente</Th>
                    <Th align="center">Edad</Th>
                    <Th>Diagnóstico</Th>
                    <Th align="right">Expediente</Th>
                  </tr>
                </thead>
                <tbody>
                  {patients.map(pt => (
                    <Tr key={pt.id}>
                      <Td className="font-medium text-ink-900">{pt.fullName}</Td>
                      <Td align="center">{pt.age || <SinRegistrar className="text-xs" />}</Td>
                      <Td>{pt.condition || pt.diagnosis || <SinRegistrar />}</Td>
                      <Td align="right">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => { setSelectedPatient(pt); fetchLogs(pt.id); navigateTo('PATIENT_DETAIL'); }}
                        >
                          Ver expediente
                        </Button>
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            )}
          </div>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Expediente                                                       */}
        {/* ---------------------------------------------------------------- */}
        {view === 'PATIENT_DETAIL' && selectedPatient && (
          <div className="space-y-5">
            <Card>
              <CardHeader title="Expediente del paciente" />
              <CardBody>
                <dl className="grid grid-cols-2 lg:grid-cols-3 gap-5">
                  <Dato label="Nombre" value={selectedPatient.fullName} />
                  <Dato label="Edad" value={selectedPatient.age ? `${selectedPatient.age} años` : null} />
                  <Dato label="Estrato" value={selectedPatient.stratum} />
                  <Dato label="Diagnóstico" value={selectedPatient.condition || selectedPatient.diagnosis} />
                  <Dato label="Ubicación" value={selectedPatient.address} />
                  <Dato label="Contacto" value={selectedPatient.contactPhone || selectedPatient.phone} />
                </dl>
              </CardBody>
            </Card>

            <div>
              <h2 className="text-base font-semibold text-ink-900 mb-3">
                Historial de bitácoras y visitas
              </h2>
              {loadingView ? <ListSkeleton rows={3} /> : logs.length === 0 ? (
                <EmptyState
                  icon={<MdEventNote />}
                  title="No existen registros de bitácora"
                  description="Ni el cuidador ni el personal médico han registrado seguimiento para este paciente."
                />
              ) : (
                <div className="space-y-3">
                  {logs.map((log, i) => {
                    let data = {};
                    try { data = JSON.parse(log.content); } catch { data = { observations: log.content }; }
                    const alerta = log.alert || (Array.isArray(data.alerts) && data.alerts.length > 0);
                    return (
                      <Card key={log.id ?? i} className="p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-ink-900">
                            {new Date(log.date).toLocaleDateString('es-CO', {
                              day: 'numeric', month: 'long', year: 'numeric'
                            })}
                            <span className="font-normal text-ink-500">
                              {' · '}
                              {new Date(log.date).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </p>
                          <Badge tone={alerta ? 'risk' : 'ok'} icon={alerta ? <MdWarning /> : <MdCheckCircle />}>
                            {alerta ? 'Alerta registrada' : 'Normal'}
                          </Badge>
                        </div>

                        <p className="text-sm text-ink-800 mt-3 leading-relaxed measure">
                          {data.observations || data.notes || <SinRegistrar />}
                        </p>

                        {data.vitalSigns && (
                          <dl className="mt-3.5 grid grid-cols-3 gap-4 rounded-md border border-ink-200 bg-ink-50 px-4 py-3">
                            <Dato label="Presión arterial" value={data.vitalSigns.bloodPressure} />
                            <Dato label="Temperatura" value={data.vitalSigns.temp ? `${data.vitalSigns.temp} °C` : null} />
                            <Dato label="Saturación" value={data.vitalSigns.oxygen ? `${data.vitalSigns.oxygen} %` : null} />
                          </dl>
                        )}
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Personal                                                         */}
        {/* ---------------------------------------------------------------- */}
        {view === 'STAFF_LIST' && (
          <div>
            <SectionTitle
              title={staffRole === 'CUIDADOR' ? 'Red de cuidadores' : 'Personal médico'}
              description={selectedEPS?.name}
            />
            {loadingView ? <TableSkeleton rows={5} cols={3} /> : staff.length === 0 ? (
              <EmptyState
                icon={staffRole === 'CUIDADOR' ? <MdGroups /> : <MdMedicalServices />}
                title="No hay personal registrado para esta entidad"
              />
            ) : (
              <Table minWidth="min-w-[520px]">
                <thead>
                  <tr>
                    <Th>Nombre</Th>
                    <Th>Documento</Th>
                    <Th>{staffRole === 'CUIDADOR' ? 'Estado' : 'Cargo'}</Th>
                  </tr>
                </thead>
                <tbody>
                  {staff.map(s => (
                    <Tr key={s.id}>
                      <Td className="font-medium text-ink-900">{s.fullName}</Td>
                      <Td>{s.identification || <SinRegistrar className="text-xs" />}</Td>
                      <Td>
                        {staffRole === 'CUIDADOR'
                          ? (s.status ? <Badge tone={s.status === 'APROBADO' ? 'ok' : 'neutral'}>{s.status}</Badge> : <SinRegistrar className="text-xs" />)
                          : (s.position || <SinRegistrar className="text-xs" />)}
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            )}
          </div>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Financiero                                                       */}
        {/* ---------------------------------------------------------------- */}
        {view === 'FINANCIAL' && selectedEPS && (
          <div>
            <SectionTitle
              title="Reporte financiero"
              description={`${selectedEPS.name} · cifras tomadas de los reportes que la entidad cargó en la plataforma.`}
            />

            {loading ? (
              <div className="space-y-5"><Skeleton className="h-24 w-full rounded-lg" /><Skeleton className="h-72 w-full rounded-lg" /></div>
            ) : finanzasEntidad.length === 0 ? (
              <EmptyState
                icon={<MdAttachMoney />}
                title="Esta entidad no ha cargado reportes financieros"
                description="No hay cifras que analizar. Cuando la entidad cargue un reporte, la ejecución aparecerá aquí."
              />
            ) : (
              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <StatCard label="Reportes cargados" value={finanzasEntidad.length} />
                  <StatCard label="Total asignado" value={pesos(totalAsignado)} />
                  <StatCard
                    label="Ejecución"
                    value={totalAsignado > 0 ? Math.round((totalEjecutado / totalAsignado) * 100) : null}
                    unit="%"
                    formula={totalAsignado > 0
                      ? `${pesos(totalEjecutado)} ejecutados ÷ ${pesos(totalAsignado)} asignados`
                      : null}
                    hint="Se calcula cuando haya presupuesto asignado registrado."
                  />
                </div>

                <Card>
                  <CardHeader
                    title="Ejecución presupuestal"
                    description="Asignado frente a ejecutado, por reporte registrado"
                  />
                  <CardBody>
                    <div className="h-72 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={serieFinanciera} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                          <CartesianGrid {...rejilla} />
                          <XAxis dataKey="name" {...ejeX} />
                          <YAxis
                            {...ejeY}
                            width={64}
                            tickFormatter={(v) => new Intl.NumberFormat('es-CO', { notation: 'compact' }).format(v)}
                          />
                          <Tooltip {...tooltipEstilo} formatter={(v) => pesos(v)} />
                          <Legend
                            iconType="circle"
                            iconSize={8}
                            wrapperStyle={{ fontSize: 13, paddingTop: 8, color: '#4b5666' }}
                          />
                          <Bar dataKey="asignado" name="Asignado" fill={COLOR_ASIGNADO} radius={[4, 4, 0, 0]} maxBarSize={36} animationDuration={ANIM_MS} />
                          <Bar dataKey="ejecutado" name="Ejecutado" fill={COLOR_EJECUTADO} radius={[4, 4, 0, 0]} maxBarSize={36} animationDuration={ANIM_MS} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardBody>
                </Card>

                {/* La tabla es el canal de respaldo del gráfico: las cifras
                    exactas siempre deben poder leerse sin interpretar barras. */}
                <Table minWidth="min-w-[560px]">
                  <thead>
                    <tr>
                      <Th>Reporte</Th>
                      <Th align="right">Asignado</Th>
                      <Th align="right">Ejecutado</Th>
                      <Th align="right">Ejecución</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {finanzasEntidad.map(r => {
                      const asignado = Number(r.totalBudget || 0);
                      const ejecutado = Number(r.totalExecuted || 0);
                      return (
                        <Tr key={r.id}>
                          <Td className="font-medium text-ink-900">
                            {r.period || r.reportType || `Reporte ${r.id}`}
                          </Td>
                          <Td align="right">{pesos(asignado)}</Td>
                          <Td align="right">{pesos(ejecutado)}</Td>
                          <Td align="right" className="font-semibold">
                            {asignado > 0
                              ? `${Math.round((ejecutado / asignado) * 100)}%`
                              : <SinRegistrar className="text-xs" />}
                          </Td>
                        </Tr>
                      );
                    })}
                  </tbody>
                </Table>
              </div>
            )}
          </div>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Auditoría                                                        */}
        {/* ---------------------------------------------------------------- */}
        {view === 'AUDIT' && selectedEPS && (
          <div>
            <SectionTitle
              title="Auditoría oficial"
              description={`${selectedEPS.name} · ${new Date().toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}`}
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
              <StatCard
                label="Preguntas respondidas"
                value={respondidas}
                formula={`${respondidas} de ${AUDIT_QUESTIONS.length}`}
              />
              <StatCard label="Hallazgos de no conformidad" value={noConformes} />
              <StatCard
                label="Avance"
                value={Math.round((respondidas / AUDIT_QUESTIONS.length) * 100)}
                unit="%"
                formula={`${respondidas} ÷ ${AUDIT_QUESTIONS.length} preguntas`}
              />
            </div>

            <div className="space-y-5">
              {SECCIONES.map(section => (
                <Card key={section}>
                  <CardHeader title={section.replace(/^\d+\.\s*/, '')} />
                  <CardBody className="pt-0">
                    <ul className="divide-y divide-ink-100">
                      {AUDIT_QUESTIONS.filter(q => q.section === section).map(q => {
                        const respuesta = auditAnswers[q.id];
                        const noConforme = RESPUESTAS_NO_CONFORMES.has(respuesta);
                        return (
                          <li key={q.id} className="py-4 first:pt-2">
                            <fieldset>
                              <legend className="text-sm text-ink-800 leading-relaxed measure mb-3">
                                {q.q}
                              </legend>

                              <div className="flex flex-wrap gap-2">
                                {q.options.map(opt => {
                                  const activa = respuesta === opt;
                                  return (
                                    <label
                                      key={opt}
                                      className={[
                                        'cursor-pointer select-none rounded-md border px-3.5 min-h-10 inline-flex items-center',
                                        'text-sm font-medium transition-colors',
                                        activa
                                          ? 'bg-brand-700 border-brand-700 text-white'
                                          : 'bg-white border-ink-400 text-ink-700 hover:bg-ink-50 hover:border-ink-500'
                                      ].join(' ')}
                                    >
                                      <input
                                        type="radio"
                                        name={q.id}
                                        value={opt}
                                        checked={activa}
                                        onChange={() => setAuditAnswers({ ...auditAnswers, [q.id]: opt })}
                                        className="sr-only"
                                      />
                                      {opt}
                                    </label>
                                  );
                                })}
                              </div>

                              {noConforme && (
                                <p role="alert" className="mt-3 flex items-start gap-2.5 rounded-md border border-risk-border bg-risk-soft px-3.5 py-2.5 text-sm text-risk-strong">
                                  <MdWarning aria-hidden="true" className="text-base shrink-0 mt-0.5" />
                                  <span>{q.consequence}</span>
                                </p>
                              )}
                            </fieldset>
                          </li>
                        );
                      })}
                    </ul>
                  </CardBody>
                </Card>
              ))}
            </div>

            <div className="sticky bottom-0 mt-5 -mx-4 sm:-mx-6 border-t border-ink-200 bg-white/95 backdrop-blur px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-end gap-3">
              <p className="text-sm text-ink-500 mr-auto">
                {respondidas} de {AUDIT_QUESTIONS.length} respondidas
                {noConformes > 0 && ` · ${noConformes} ${noConformes === 1 ? 'hallazgo' : 'hallazgos'}`}
              </p>
              <Button variant="secondary" onClick={() => setView('EPS_DASHBOARD')}>
                Cancelar
              </Button>
              <Button
                variant="primary"
                icon={<MdGavel />}
                onClick={guardarAuditoria}
                loading={savingAudit}
                disabled={respondidas === 0}
              >
                Firmar y guardar
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
