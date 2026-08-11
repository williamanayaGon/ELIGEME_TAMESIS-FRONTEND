import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import SignatureCanvas from 'react-signature-canvas';
import {
  MdLocationOn, MdCheck, MdAssignment, MdFolderOpen, MdWarning,
  MdCalendarToday, MdEditNote, MdAddCircle, MdDelete, MdLogout,
  MdMedicalServices, MdPerson, MdSave, MdEventBusy
} from 'react-icons/md';

import { apiFetch } from '../lib/api';
import { evaluarPrioridad, parseBitacora, TONO_NIVEL, UMBRALES_POR_DEFECTO } from '../lib/triage';
import {
  Modal, Button, Badge, EmptyState, Card, CardHeader, CardBody, SectionTitle,
  Dato, SinRegistrar, Field, CardGridSkeleton, ListSkeleton, Skeleton
} from './ui';

/**
 * Panel del visitador médico.
 *
 * ADVERTENCIA DE SEGURIDAD CLÍNICA — leer antes de modificar el orden de
 * la lista de pacientes.
 *
 * La versión anterior calculaba un semáforo de triage así:
 *
 *     const temp  = parseFloat(data.temperature) || 37;
 *     const sysBP = parseInt(data.systolicBP)    || 120;
 *
 * Es decir: si el cuidador NO registró temperatura ni presión, el código
 * inventaba valores normales y evaluaba el triage contra ellos. Un
 * paciente sin ningún signo vital registrado se le presentaba al médico
 * como "ESTABLE". Lo mismo ocurría con un paciente sin ninguna bitácora.
 *
 * Además los umbrales (39 °C, 180, 90, 37.8, 140 mmHg) estaban escritos a
 * mano, y CLAUDE.md prohíbe expresamente los semáforos con umbrales que
 * nadie definió.
 *
 * Lo que hay ahora no emite ningún juicio clínico. Ordena la lista por
 * hechos registrados —cuántas alertas anotó el cuidador, hace cuántos días
 * fue la última bitácora— y muestra los signos vitales tal como quedaron:
 * si no se registraron, dice "Sin registrar". El juicio lo pone el médico,
 * que para eso es el médico.
 */

const LIMITE_VISITAS_DIA = 5;

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

const TIPOS_ORDEN = [
  { value: 'MEDICAMENTO', label: 'Ajuste de medicamento' },
  { value: 'ESPECIALISTA', label: 'Remisión a especialista' },
  { value: 'EXAMEN', label: 'Examen de laboratorio o imagen' },
  { value: 'OTRO', label: 'Otra indicación' }
];

const parseLog = parseBitacora;

export default function DashboardProfesional({ user, onLogout }) {
  const sigPadRef = useRef(null);

  const [patients, setPatients] = useState([]);
  const [myVisitsToday, setMyVisitsToday] = useState([]);
  const [allVisits, setAllVisits] = useState([]);
  const [allLogs, setAllLogs] = useState([]);
  const [umbral, setUmbral] = useState({ dias: null, definidoPorLaEntidad: false });
  const [loading, setLoading] = useState(true);

  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showVisitModal, setShowVisitModal] = useState(false);
  const [isFullLogModalOpen, setIsFullLogModalOpen] = useState(false);

  const [caregiverLogs, setCaregiverLogs] = useState([]);
  const [caregiverData, setCaregiverData] = useState({});
  const [isEditingCaregiver, setIsEditingCaregiver] = useState(false);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const [formData, setFormData] = useState(initialVisitForm);
  const [medicalOrders, setMedicalOrders] = useState([]);
  const [newOrderType, setNewOrderType] = useState('MEDICAMENTO');
  const [newOrderDesc, setNewOrderDesc] = useState('');
  const [saving, setSaving] = useState(false);

  const [logCorrections, setLogCorrections] = useState({});
  const [savingLogId, setSavingLogId] = useState(null);

  // --------------------------------------------------------------------------
  // Carga
  // --------------------------------------------------------------------------

  const fetchData = useCallback(async () => {
    if (!user?.epsId) { setLoading(false); return; }
    setLoading(true);
    try {
      // Las bitácoras se piden de una sola vez para toda la entidad: la
      // priorización necesita la última de CADA paciente, y pedirlas una
      // por una serían tantas peticiones como pacientes.
      const [resP, resV, resL, resU] = await Promise.all([
        apiFetch(`/api/patients?epsId=${user.epsId}`),
        apiFetch('/api/visits'),
        apiFetch(`/api/logs?epsId=${user.epsId}`),
        apiFetch('/api/programa/umbral')
      ]);

      if (resP.ok) {
        const d = await resP.json();
        setPatients(Array.isArray(d) ? d : []);
      }

      if (resV.ok) {
        const d = await resV.json();
        const lista = Array.isArray(d) ? d : [];
        setAllVisits(lista);
        const hoy = new Date().toDateString();
        setMyVisitsToday(
          lista.filter(v =>
            v.professionalId === user.id && new Date(v.date).toDateString() === hoy
          )
        );
      }

      if (resL.ok) {
        const d = await resL.json();
        setAllLogs(Array.isArray(d) ? d : []);
      }

      // El umbral de seguimiento lo define la entidad. Si no lo ha
      // definido, se usa el valor por defecto documentado en triage.js y
      // la interfaz lo dice.
      if (resU.ok) {
        const d = await resU.json();
        if (d && typeof d.dias === 'number') {
          setUmbral({ dias: d.dias, definidoPorLaEntidad: Boolean(d.definidoPorLaEntidad) });
        }
      }
    } catch {
      toast.error('No se pudo conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  }, [user?.epsId, user?.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Prellena el bloque A0 con la última bitácora del cuidador.
  useEffect(() => {
    if (!caregiverLogs.length) { setCaregiverData({}); return; }
    const ultima = caregiverLogs[0];
    const parsed = parseLog(ultima);
    setCaregiverData({ id: ultima.id, ...parsed });
  }, [caregiverLogs]);

  // Bitácoras y visitas agrupadas por paciente, una sola pasada cada una.
  const porPaciente = useMemo(() => {
    const logs = new Map();
    const vis = new Map();
    allLogs.forEach(l => {
      if (!logs.has(l.patientId)) logs.set(l.patientId, []);
      logs.get(l.patientId).push(l);
    });
    allVisits.forEach(v => {
      if (!vis.has(v.patientId)) vis.set(v.patientId, []);
      vis.get(v.patientId).push(v);
    });
    return { logs, vis };
  }, [allLogs, allVisits]);

  const pacientesPriorizados = useMemo(() => {
    return patients
      .map(p => ({
        paciente: p,
        // `p.logs` se usa si el backend ya las manda embebidas; si no, se
        // toman de la carga general.
        prioridad: evaluarPrioridad(
          p,
          p.logs?.length ? p.logs : (porPaciente.logs.get(p.id) || []),
          porPaciente.vis.get(p.id) || [],
          {},
          umbral.dias
        )
      }))
      .sort((a, b) =>
        b.prioridad.orden - a.prioridad.orden ||
        a.paciente.fullName.localeCompare(b.paciente.fullName, 'es')
      );
  }, [patients, porPaciente, umbral.dias]);

  const enCola = pacientesPriorizados.filter(x => x.prioridad.orden >= 2).length;

  const limiteAlcanzado = myVisitsToday.length >= LIMITE_VISITAS_DIA;

  // --------------------------------------------------------------------------
  // Acciones
  // --------------------------------------------------------------------------

  const handleStartVisit = async (patient) => {
    if (limiteAlcanzado) {
      toast.error(`Alcanzaste el límite de ${LIMITE_VISITAS_DIA} visitas por día.`);
      return;
    }

    setSelectedPatient(patient);
    setFormData(initialVisitForm);
    setMedicalOrders([]);
    setIsEditingCaregiver(false);
    sigPadRef.current?.clear();
    setShowVisitModal(true);

    setLoadingLogs(true);
    try {
      const res = await apiFetch(`/api/logs?patientId=${patient.id}`);
      const logs = res.ok ? await res.json() : [];
      setCaregiverLogs(Array.isArray(logs) ? logs : []);
    } catch {
      setCaregiverLogs([]);
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddOrder = () => {
    if (!newOrderDesc.trim()) {
      toast.error('Escribe la descripción de la orden.');
      return;
    }
    setMedicalOrders(prev => [...prev, { id: Date.now(), type: newOrderType, description: newOrderDesc }]);
    setNewOrderDesc('');
  };

  const handleSubmitVisit = async (e) => {
    e.preventDefault();

    if (!sigPadRef.current || sigPadRef.current.isEmpty()) {
      toast.error('Se requiere tu firma para validar la visita y las órdenes.');
      return;
    }
    const signature = sigPadRef.current.getCanvas().toDataURL('image/png');

    setSaving(true);
    try {
      const res = await apiFetch('/api/visits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          professionalId: user.id,
          patientId: selectedPatient.id,
          formData,
          caregiverData,
          signature,
          medicalOrders
        })
      });

      if (res.ok) {
        toast.success('Visita y órdenes registradas.');
        setShowVisitModal(false);
        setIsEditingCaregiver(false);
        setMedicalOrders([]);
        fetchData();
      } else {
        toast.error('No se pudo guardar la visita.');
      }
    } catch {
      toast.error('Sin conexión. La visita no se guardó.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveLogCorrection = async (logId) => {
    setSavingLogId(logId);
    try {
      const res = await apiFetch(`/api/logs/${logId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doctorCorrections: logCorrections[logId],
          reviewedByProId: user.id
        })
      });
      if (res.ok) {
        toast.success('Anotación guardada en la bitácora.');
        setCaregiverLogs(prev => prev.map(l =>
          l.id === logId ? { ...l, doctorCorrections: logCorrections[logId] } : l
        ));
      } else {
        toast.error('No se pudo guardar la anotación.');
      }
    } catch {
      toast.error('Sin conexión con el servidor.');
    } finally {
      setSavingLogId(null);
    }
  };

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-ink-50">

      <header className="sticky top-0 z-40 bg-brand-800 text-white on-brand shadow-e2">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-lg font-semibold text-white">Visitas domiciliarias</h1>
            <p className="text-xs text-brand-200 truncate">
              {user.fullName} · {myVisitsToday.length} de {LIMITE_VISITAS_DIA} visitas hoy
            </p>
          </div>
          <Button
            variant="ghost"
            onClick={onLogout}
            icon={<MdLogout />}
            className="text-brand-100 hover:bg-white/10 hover:text-white shrink-0"
          >
            <span className="hidden sm:inline">Salir</span>
          </Button>
        </div>
      </header>

      <main className="max-w-[1200px] mx-auto px-4 sm:px-6 py-6">
        <SectionTitle
          title="Pacientes asignados"
          description={
            `Priorizados por los hallazgos que el cuidador registró y por el diagnóstico de cada paciente. ` +
            `Cada tarjeta dice qué la puso ahí. Un caso sale de la cola cuando queda una visita registrada después de la bitácora que lo levantó.`
          }
          action={
            enCola > 0 && !loading ? (
              <Badge tone="risk" icon={<MdWarning />}>
                {enCola} {enCola === 1 ? 'caso por atender' : 'casos por atender'}
              </Badge>
            ) : null
          }
        />

        {!loading && patients.length > 0 && (
          <p className="text-xs text-ink-500 -mt-2 mb-5">
            Umbral de seguimiento:{' '}
            <strong className="font-medium text-ink-700">{umbral.dias ?? UMBRALES_POR_DEFECTO.diasSinVisita} días</strong>
            {umbral.definidoPorLaEntidad
              ? ' · definido por la entidad.'
              : ' · valor por defecto; la entidad aún no lo ha definido en Caracterización del programa.'}
          </p>
        )}

        {limiteAlcanzado && (
          <div role="status" className="mb-5 flex items-start gap-3 rounded-lg border border-warn-border bg-warn-soft px-4 py-3">
            <MdWarning aria-hidden="true" className="text-lg text-warn shrink-0 mt-0.5" />
            <p className="text-sm text-warn-strong">
              Alcanzaste el límite de {LIMITE_VISITAS_DIA} visitas registradas hoy.
            </p>
          </div>
        )}

        {loading ? (
          <CardGridSkeleton count={6} />
        ) : pacientesPriorizados.length === 0 ? (
          <EmptyState
            icon={<MdPerson />}
            title="No tienes pacientes asignados"
            description="Cuando la entidad te asigne pacientes, aparecerán aquí ordenados por prioridad."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 stagger">
            {pacientesPriorizados.map(({ paciente: p, prioridad }) => {
              const visitedToday = myVisitsToday.some(v => v.patientId === p.id);
              const { vitales } = prioridad;
              const destacada = prioridad.nivel === 'alta';

              return (
                <Card
                  key={p.id}
                  className={[
                    'p-5 flex flex-col',
                    // El caso prioritario se marca con el borde completo, no
                    // con un filete lateral de 4px.
                    destacada ? 'border-risk' : '',
                    visitedToday ? 'opacity-70' : ''
                  ].join(' ')}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-base font-semibold text-ink-900">{p.fullName}</h3>
                      <p className="text-sm text-ink-500 mt-1">{p.diagnosis || <SinRegistrar />}</p>
                    </div>
                    <Badge
                      tone={TONO_NIVEL[prioridad.nivel]}
                      icon={destacada ? <MdWarning /> : prioridad.atendida ? <MdCheck /> : undefined}
                    >
                      {prioridad.etiqueta}
                    </Badge>
                  </div>

                  {/* El color nunca va solo: cada motivo se escribe, y el
                      umbral que lo disparó viaja con él. */}
                  {prioridad.motivos.length > 0 && (
                    <ul className="mt-3.5 space-y-2">
                      {prioridad.motivos.map((m, i) => (
                        <li
                          key={i}
                          className={[
                            'text-sm leading-relaxed rounded-md px-3 py-2 border',
                            destacada
                              ? 'bg-risk-soft border-risk-border text-risk-strong'
                              : prioridad.atendida
                                ? 'bg-ok-soft border-ok-border text-ok-strong'
                                : 'bg-ink-50 border-ink-200 text-ink-700'
                          ].join(' ')}
                        >
                          {m.texto}
                          {m.umbral && (
                            <span className="block text-xs opacity-80 mt-0.5">{m.umbral}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}

                  {/* Los signos vitales se muestran como quedaron registrados.
                      Si no hay dato, dice que no lo hay — nunca se sustituye
                      por un valor normal. */}
                  <dl className="grid grid-cols-2 gap-3 mt-4 rounded-md border border-ink-200 bg-ink-50 px-3.5 py-3">
                    <Dato
                      label="Temperatura"
                      value={vitales?.temperatura !== null && vitales?.temperatura !== undefined
                        ? `${vitales.temperatura} °C`
                        : null}
                    />
                    <Dato
                      label="Presión"
                      value={vitales?.sistolica && vitales?.diastolica
                        ? `${vitales.sistolica}/${vitales.diastolica} mmHg`
                        : null}
                    />
                  </dl>

                  {p.address && (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.address + ', Támesis, Colombia')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3.5 inline-flex items-start gap-1.5 text-sm text-brand-700 hover:text-brand-800 underline underline-offset-2"
                    >
                      <MdLocationOn aria-hidden="true" className="text-base shrink-0 mt-0.5" />
                      <span>{p.address}</span>
                    </a>
                  )}

                  <div className="mt-auto pt-4">
                    {visitedToday ? (
                      <Button variant="secondary" disabled icon={<MdCheck />} className="w-full">
                        Visitado hoy
                      </Button>
                    ) : (
                      <Button
                        variant="primary"
                        icon={<MdMedicalServices />}
                        className="w-full"
                        disabled={limiteAlcanzado}
                        onClick={() => handleStartVisit(p)}
                      >
                        Iniciar visita
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      {/* ------------------------------------------------------------------ */}
      {/* Formulario de visita                                                */}
      {/* ------------------------------------------------------------------ */}
      <Modal
        open={showVisitModal && Boolean(selectedPatient)}
        onClose={() => setShowVisitModal(false)}
        size="xl"
        icon={<MdMedicalServices />}
        title="Visita domiciliaria"
        subtitle={selectedPatient
          ? `${selectedPatient.fullName}${selectedPatient.age ? ` · ${selectedPatient.age} años` : ''}`
          : undefined}
        footer={
          <>
            <Button
              variant="secondary"
              icon={<MdFolderOpen />}
              onClick={() => setIsFullLogModalOpen(true)}
              disabled={caregiverLogs.length === 0}
              className="mr-auto"
            >
              Ver expediente completo
            </Button>
            <Button variant="secondary" onClick={() => setShowVisitModal(false)}>Cancelar</Button>
            <Button variant="primary" type="submit" form="form-visita" icon={<MdSave />} loading={saving}>
              Guardar visita
            </Button>
          </>
        }
      >
        <form id="form-visita" onSubmit={handleSubmitVisit} className="space-y-5">

          {/* A0 — reporte del cuidador */}
          <Card>
            <CardHeader
              title="A0 · Reporte del cuidador"
              description="Cargado automáticamente desde la última bitácora."
              action={
                <Button
                  variant={isEditingCaregiver ? 'accent' : 'secondary'}
                  size="sm"
                  icon={<MdEditNote />}
                  onClick={() => setIsEditingCaregiver(v => !v)}
                >
                  {isEditingCaregiver ? 'Bloquear' : 'Corregir'}
                </Button>
              }
            />
            <CardBody>
              {loadingLogs ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-14" />)}
                </div>
              ) : caregiverLogs.length === 0 ? (
                <p className="flex items-center gap-2.5 rounded-md border border-warn-border bg-warn-soft px-3.5 py-3 text-sm text-warn-strong">
                  <MdWarning aria-hidden="true" className="text-base shrink-0" />
                  El cuidador no ha registrado bitácoras para este paciente.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[
                    ['generalState', 'Estado general'],
                    ['alertLevel', 'Nivel de alerta'],
                    ['mobility', 'Movilidad'],
                    ['feeding', 'Alimentación'],
                    ['hydration', 'Hidratación'],
                    ['medsGiven', 'Medicación dada'],
                    ['hygiene', 'Higiene'],
                    ['skin', 'Cuidado de piel'],
                    ['position', 'Cambios de postura']
                  ].map(([key, label]) => (
                    isEditingCaregiver ? (
                      <Field key={key} label={label}>
                        {(p) => (
                          <input
                            {...p}
                            type="text"
                            value={caregiverData[key] || ''}
                            onChange={(e) => setCaregiverData({ ...caregiverData, [key]: e.target.value })}
                          />
                        )}
                      </Field>
                    ) : (
                      <Dato key={key} label={label} value={caregiverData[key]} />
                    )
                  ))}

                  <div className="sm:col-span-2 lg:col-span-3">
                    {isEditingCaregiver ? (
                      <Field label="Observaciones y alertas">
                        {(p) => (
                          <textarea
                            {...p}
                            rows={3}
                            value={caregiverData.observations || ''}
                            onChange={(e) => setCaregiverData({ ...caregiverData, observations: e.target.value })}
                          />
                        )}
                      </Field>
                    ) : (
                      <Dato label="Observaciones y alertas" value={caregiverData.observations} />
                    )}
                  </div>
                </div>
              )}
            </CardBody>
          </Card>

          <SeccionVisita code="B1" title="Datos generales">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Fecha">{(p) => <input {...p} type="date" name="visitDate" value={formData.visitDate} onChange={handleChange} />}</Field>
              <Field label="Hora de inicio">{(p) => <input {...p} type="time" name="visitTimeStart" value={formData.visitTimeStart} onChange={handleChange} />}</Field>
              <Field label="Hora de fin">{(p) => <input {...p} type="time" name="visitTimeEnd" value={formData.visitTimeEnd} onChange={handleChange} />}</Field>
            </div>
            <Field label="Tipo de visita" className="mt-4">
              {(p) => (
                <select {...p} name="visitType" value={formData.visitType} onChange={handleChange}>
                  {['Seguimiento', 'Interconsulta', 'Urgente'].map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              )}
            </Field>
          </SeccionVisita>

          <SeccionVisita code="B2" title="Motivo de la visita">
            <Field label="Motivo">
              {(p) => <textarea {...p} rows={2} name="reason" value={formData.reason} onChange={handleChange} placeholder="Describe el motivo…" />}
            </Field>
          </SeccionVisita>

          <SeccionVisita code="B3" title="Análisis de la bitácora del cuidador">
            <Field label="¿Se revisó la bitácora?">
              {(p) => (
                <select {...p} name="logReview" value={formData.logReview} onChange={handleChange}>
                  <option value="Sí">Sí</option>
                  <option value="No">No</option>
                </select>
              )}
            </Field>
            <Field label="Hallazgos relevantes" className="mt-4">
              {(p) => <textarea {...p} rows={2} name="findings" value={formData.findings} onChange={handleChange} />}
            </Field>
          </SeccionVisita>

          <SeccionVisita code="B4" title="Enfermedad actual">
            <Field label="Descripción">
              {(p) => <textarea {...p} rows={3} name="currentIllness" value={formData.currentIllness} onChange={handleChange} />}
            </Field>
          </SeccionVisita>

          <SeccionVisita code="B5" title="Signos vitales tomados en el domicilio">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <Field label="Presión arterial">{(p) => <input {...p} name="bp" value={formData.bp} onChange={handleChange} placeholder="120/80" />}</Field>
              <Field label="Frecuencia cardíaca">{(p) => <input {...p} name="hr" value={formData.hr} onChange={handleChange} placeholder="lpm" />}</Field>
              <Field label="Frecuencia respiratoria">{(p) => <input {...p} name="rr" value={formData.rr} onChange={handleChange} placeholder="rpm" />}</Field>
              <Field label="Temperatura">{(p) => <input {...p} name="temp" value={formData.temp} onChange={handleChange} placeholder="°C" />}</Field>
              <Field label="Saturación">{(p) => <input {...p} name="sat" value={formData.sat} onChange={handleChange} placeholder="%" />}</Field>
              <Field label="Peso">{(p) => <input {...p} name="weight" value={formData.weight} onChange={handleChange} placeholder="kg" />}</Field>
            </div>
          </SeccionVisita>

          <SeccionVisita code="B6" title="Examen físico">
            <Field label="Hallazgos">
              {(p) => <textarea {...p} rows={3} name="physicalExam" value={formData.physicalExam} onChange={handleChange} />}
            </Field>
          </SeccionVisita>

          <SeccionVisita code="B7" title="Evaluación funcional">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Escala">
                {(p) => (
                  <select {...p} name="functionalScale" value={formData.functionalScale} onChange={handleChange}>
                    {['Barthel', 'Glasgow', 'Norton', 'Otra'].map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                )}
              </Field>
              <Field label="Puntaje">
                {(p) => <input {...p} name="functionalResult" value={formData.functionalResult} onChange={handleChange} />}
              </Field>
            </div>
          </SeccionVisita>

          <SeccionVisita code="B8" title="Diagnóstico">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Principal (CIE-10)">{(p) => <input {...p} name="diagnosisMain" value={formData.diagnosisMain} onChange={handleChange} />}</Field>
              <Field label="Relacionados">{(p) => <input {...p} name="diagnosisRel" value={formData.diagnosisRel} onChange={handleChange} />}</Field>
            </div>
          </SeccionVisita>

          <SeccionVisita code="B9" title="Plan de manejo">
            <div className="space-y-4">
              <Field label="Medicación">{(p) => <input {...p} name="medication" value={formData.medication} onChange={handleChange} placeholder="Dosis, frecuencia…" />}</Field>
              <Field label="Recomendaciones">{(p) => <input {...p} name="recommendations" value={formData.recommendations} onChange={handleChange} />}</Field>
              <Field label="Órdenes">{(p) => <input {...p} name="orders" value={formData.orders} onChange={handleChange} />}</Field>
              <Field label="Interconsultas">{(p) => <input {...p} name="interconsults" value={formData.interconsults} onChange={handleChange} />}</Field>
            </div>
          </SeccionVisita>

          <SeccionVisita code="B10" title="Educación al cuidador">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="¿Se brindó educación?">
                {(p) => (
                  <select {...p} name="educationGiven" value={formData.educationGiven} onChange={handleChange}>
                    <option value="Sí">Sí</option>
                    <option value="No">No</option>
                  </select>
                )}
              </Field>
              <Field label="Tema tratado">{(p) => <input {...p} name="educationTopic" value={formData.educationTopic} onChange={handleChange} />}</Field>
            </div>
          </SeccionVisita>

          <SeccionVisita code="B11" title="Conducta">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Decisión">
                {(p) => (
                  <select {...p} name="conduct" value={formData.conduct} onChange={handleChange}>
                    {['Continúa manejo domiciliario', 'Ajuste de plan', 'Remisión', 'Alta del programa'].map(o => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                )}
              </Field>
              <Field label="Próxima visita sugerida">
                {(p) => <input {...p} type="date" name="nextVisit" value={formData.nextVisit} onChange={handleChange} />}
              </Field>
            </div>
          </SeccionVisita>

          <SeccionVisita code="B12" title="Órdenes médicas especiales">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Tipo de orden">
                {(p) => (
                  <select {...p} value={newOrderType} onChange={(e) => setNewOrderType(e.target.value)}>
                    {TIPOS_ORDEN.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                )}
              </Field>
              <Field label="Indicaciones" className="sm:col-span-2">
                {(p) => (
                  <textarea
                    {...p}
                    rows={2}
                    value={newOrderDesc}
                    onChange={(e) => setNewOrderDesc(e.target.value)}
                    placeholder="Suspender Enalapril e iniciar Losartán 50 mg…"
                  />
                )}
              </Field>
            </div>

            <div className="flex justify-end mt-3">
              <Button variant="secondary" icon={<MdAddCircle />} onClick={handleAddOrder}>
                Agregar orden
              </Button>
            </div>

            {medicalOrders.length > 0 && (
              <ul className="mt-4 space-y-2.5 border-t border-ink-100 pt-4">
                {medicalOrders.map(ord => (
                  <li key={ord.id} className="flex items-start justify-between gap-3 rounded-md border border-ink-200 bg-white px-4 py-3">
                    <div className="min-w-0">
                      <Badge tone="brand">
                        {TIPOS_ORDEN.find(t => t.value === ord.type)?.label || ord.type}
                      </Badge>
                      <p className="text-sm text-ink-800 mt-2">{ord.description}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label="Eliminar orden"
                      onClick={() => setMedicalOrders(prev => prev.filter(o => o.id !== ord.id))}
                      className="text-risk hover:bg-risk-soft shrink-0"
                      icon={<MdDelete />}
                    />
                  </li>
                ))}
              </ul>
            )}
          </SeccionVisita>

          <SeccionVisita
            code="B13"
            title="Firma del profesional"
            hint="Traza tu firma en el recuadro para validar legalmente la visita y las órdenes."
          >
            <div className="rounded-md border border-dashed border-ink-400 bg-white overflow-hidden">
              <SignatureCanvas
                ref={sigPadRef}
                penColor="#141920"
                canvasProps={{
                  className: 'w-full h-32 cursor-crosshair touch-none',
                  'aria-label': 'Recuadro para trazar tu firma'
                }}
              />
            </div>
            <div className="flex items-center justify-between gap-3 mt-3">
              <p className="text-xs text-ink-500">{user.fullName} · profesional de salud</p>
              <Button variant="secondary" size="sm" onClick={() => sigPadRef.current?.clear()}>
                Limpiar firma
              </Button>
            </div>
          </SeccionVisita>
        </form>
      </Modal>

      {/* ------------------------------------------------------------------ */}
      {/* Expediente completo                                                 */}
      {/* ------------------------------------------------------------------ */}
      <Modal
        open={isFullLogModalOpen && Boolean(selectedPatient)}
        onClose={() => setIsFullLogModalOpen(false)}
        size="lg"
        tone="neutral"
        icon={<MdAssignment />}
        title="Expediente y bitácoras"
        subtitle={selectedPatient?.fullName}
        footer={<Button variant="primary" onClick={() => setIsFullLogModalOpen(false)}>Cerrar</Button>}
      >
        {selectedPatient && (
          <Card className="mb-5">
            <CardHeader title="Datos del paciente" />
            <CardBody>
              <dl className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <Dato label="Edad" value={selectedPatient.age ? `${selectedPatient.age} años` : null} />
                <Dato label="Estrato" value={selectedPatient.stratum} />
                <Dato label="Diagnóstico" value={selectedPatient.diagnosis} />
                <Dato label="Dirección" value={selectedPatient.address} />
                <Dato label="Teléfono" value={selectedPatient.phone || selectedPatient.contactPhone} />
                <Dato label="Instrucciones" value={selectedPatient.careInstructions} />
              </dl>
            </CardBody>
          </Card>
        )}

        <h3 className="text-sm font-semibold text-ink-900 mb-3">
          Bitácoras del cuidador
          {caregiverLogs.length > 0 && <span className="font-normal text-ink-500"> · {caregiverLogs.length}</span>}
        </h3>

        {loadingLogs ? (
          <ListSkeleton rows={3} />
        ) : caregiverLogs.length === 0 ? (
          <EmptyState
            icon={<MdEventBusy />}
            title="No hay bitácoras registradas"
            description="El cuidador todavía no ha registrado seguimiento para este paciente."
          />
        ) : (
          <div className="space-y-4">
            {caregiverLogs.map(log => {
              const d = parseLog(log);
              const alertas = Array.isArray(d.alerts) ? d.alerts.filter(a => a !== 'Ninguno') : [];

              return (
                <Card key={log.id}>
                  <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-ink-100">
                    <p className="flex items-center gap-2 text-sm font-semibold text-ink-900">
                      <MdCalendarToday aria-hidden="true" className="text-ink-500" />
                      {new Date(log.date).toLocaleDateString('es-CO', {
                        day: 'numeric', month: 'long', year: 'numeric'
                      })}
                    </p>
                    <Badge tone={alertas.length > 0 ? 'risk' : 'ok'}>
                      {alertas.length > 0
                        ? `${alertas.length} ${alertas.length === 1 ? 'alerta' : 'alertas'}`
                        : 'Sin novedad'}
                    </Badge>
                  </div>

                  <CardBody className="pt-4 space-y-4">
                    <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <Dato label="Estado general" value={d.generalState} />
                      <Dato label="Movilidad" value={d.mobility} />
                      <Dato label="Alimentación" value={d.feeding} />
                      <Dato label="Medicación" value={d.medsGiven} />
                      <Dato label="Temperatura" value={d.temperature ? `${d.temperature} °C` : null} />
                      <Dato
                        label="Presión"
                        value={d.systolicBP && d.diastolicBP ? `${d.systolicBP}/${d.diastolicBP}` : null}
                      />
                    </dl>

                    {alertas.length > 0 && (
                      <p role="alert" className="flex items-start gap-2.5 rounded-md border border-risk-border bg-risk-soft px-3.5 py-3 text-sm text-risk-strong">
                        <MdWarning aria-hidden="true" className="text-base shrink-0 mt-0.5" />
                        <span>
                          <strong className="font-semibold">{alertas.join(', ')}</strong>
                          {d.alertDesc && <span className="block mt-1">{d.alertDesc}</span>}
                        </span>
                      </p>
                    )}

                    <Dato label="Observaciones del cuidador" value={d.observations} />

                    {log.caregiverSignature && (
                      <div className="flex flex-col items-end pt-3 border-t border-ink-100">
                        <span className="text-2xs uppercase tracking-wide text-ink-500">
                          Firmado electrónicamente por el cuidador
                        </span>
                        <img
                          src={log.caregiverSignature}
                          alt={`Firma de ${log.caregiverName || 'el cuidador'}`}
                          className="h-12 object-contain mt-1"
                        />
                        <span className="text-xs font-medium text-ink-700">
                          {log.caregiverName || 'Cuidador asignado'}
                        </span>
                      </div>
                    )}

                    {/* Anotación del profesional sobre la bitácora */}
                    <div className="rounded-md border border-ink-200 bg-ink-50 p-4">
                      <Field
                        label="Anotación del profesional"
                        hint="Queda registrada en la bitácora junto a tu identificación."
                      >
                        {(p) => (
                          <textarea
                            {...p}
                            rows={2}
                            value={logCorrections[log.id] ?? log.doctorCorrections ?? ''}
                            onChange={(e) => setLogCorrections(prev => ({ ...prev, [log.id]: e.target.value }))}
                            placeholder="Corrección o comentario clínico…"
                          />
                        )}
                      </Field>
                      <div className="flex justify-end mt-3">
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={<MdEditNote />}
                          loading={savingLogId === log.id}
                          disabled={!logCorrections[log.id]}
                          onClick={() => handleSaveLogCorrection(log.id)}
                        >
                          Guardar anotación
                        </Button>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              );
            })}
          </div>
        )}
      </Modal>
    </div>
  );
}

function SeccionVisita({ code, title, hint, children }) {
  return (
    <section className="bg-white border border-ink-200 rounded-lg shadow-e1 p-5">
      <header className="mb-4">
        <h3 className="text-base font-semibold text-ink-900">
          <span className="text-ink-500 font-normal mr-2">{code}</span>
          {title}
        </h3>
        {hint && <p className="text-sm text-ink-500 mt-1.5 measure">{hint}</p>}
      </header>
      {children}
    </section>
  );
}
