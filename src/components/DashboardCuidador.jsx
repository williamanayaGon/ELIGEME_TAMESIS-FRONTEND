import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import SignatureCanvas from 'react-signature-canvas';
import {
  MdWbSunny, MdWbTwilight, MdNightsStay, MdSentimentNeutral, MdSentimentSatisfied,
  MdSentimentVeryDissatisfied, MdVisibility, MdSnooze, MdPsychology, MdDirectionsWalk,
  MdAccessible, MdBed, MdRestaurant, MdFastfood, MdDoNotDisturb, MdCheck, MdClose,
  MdRemove, MdPersonalInjury, MdThermostat, MdCoronavirus, MdAir, MdStar, MdPerson,
  MdSecurity, MdCheckCircle, MdMedicalServices, MdWarning, MdNoteAlt,
  MdSave, MdLightbulb, MdLogout, MdSend, MdHourglassEmpty, MdVerified,
  MdUploadFile, MdEventNote, MdHome, MdPhone, MdMonitorHeart
} from 'react-icons/md';

import { apiFetch } from '../lib/api';
import {
  Modal, Button, Badge, EmptyState, Card, CardBody,
  Dato, SinRegistrar, Field, Skeleton
} from './ui';

/**
 * Bitácora digital del cuidador.
 *
 * Este es EL usuario primario del programa: registra desde la casa del
 * paciente, en un Android de gama media, a veces a la intemperie y casi
 * siempre con mala señal. Cada decisión aquí se toma desde ahí.
 *
 * Por eso el formulario conserva los controles grandes tipo tarjeta que ya
 * tenía —son lo correcto para un pulgar— y solo cambia lo que estaba mal:
 * el contraste, la jerarquía, los estados de carga y tres controles que
 * simplemente no estaban conectados.
 */

const TURNOS = ['Mañana', 'Tarde', 'Noche'];

const ALERTAS = ['Caída', 'Fiebre', 'Dolor', 'Dif. Respiratoria', 'Cambio Conducta', 'Ninguno'];

const initialForm = {
  shift: '',
  temperature: '',
  systolicBP: '',
  diastolicBP: '',
  generalState: 'Igual',
  alertLevel: 'Alerta',
  mobility: 'Camina',
  feeding: 'Completa',
  hydration: 'Sí',
  foodObs: '',
  medsGiven: 'Sí',
  medsReason: '',
  hygiene: 'Sí',
  clothes: 'Sí',
  skin: 'Sí',
  mobilization: 'Sí',
  position: 'Sí',
  aids: 'Sí',
  alerts: [],
  alertDesc: '',
  observations: '',
  signature: ''
};

export default function DashboardCuidador({ user, onLogout }) {
  const sigCanvas = useRef(null);

  const [loading, setLoading] = useState(true);
  const [patient, setPatient] = useState(null);
  const [logs, setLogs] = useState([]);
  const [visitorToEvaluate, setVisitorToEvaluate] = useState(null);

  const [formData, setFormData] = useState(initialForm);
  const [activeTab, setActiveTab] = useState('FORM');
  const [saving, setSaving] = useState(false);

  const [senaFile, setSenaFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const [isPatientProfileOpen, setIsPatientProfileOpen] = useState(false);
  const [isEvaluationOpen, setIsEvaluationOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const [rating, setRating] = useState(0);
  const [evalComments, setEvalComments] = useState('');
  const [dataPrivacyAccepted, setDataPrivacyAccepted] = useState(false);
  const [sendingEval, setSendingEval] = useState(false);

  const [chatMessages, setChatMessages] = useState([
    { role: 'assistant', text: 'Hola. Soy tu guía de cuidado. Pregúntame lo que necesites sobre el cuidado de tu paciente.' }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [sendingAi, setSendingAi] = useState(false);

  // --------------------------------------------------------------------------
  // Carga
  // --------------------------------------------------------------------------

  const fetchData = useCallback(async () => {
    if (user.status !== 'APROBADO') { setLoading(false); return; }
    setLoading(true);
    try {
      const [resP, resL, resV] = await Promise.all([
        apiFetch(`/api/patients?caregiverId=${user.id}`),
        apiFetch(`/api/logs?caregiverId=${user.id}`),
        apiFetch(`/api/visits/pending-evaluation/${user.id}`)
      ]);

      if (resP.ok) {
        const d = await resP.json();
        setPatient(Array.isArray(d) ? (d[0] ?? null) : (d ?? null));
      }
      if (resL.ok) {
        const d = await resL.json();
        setLogs(Array.isArray(d) ? d : []);
      }
      if (resV.ok) {
        const d = await resV.json();
        const pendiente = Array.isArray(d) ? d[0] : d;
        // Antes se guardaba la respuesta tal cual: un `{}` vacío es
        // "verdadero" y encendía el aviso con el nombre en blanco.
        setVisitorToEvaluate(pendiente && (pendiente.visitId || pendiente.id) ? pendiente : null);
      }
    } catch {
      toast.error('No se pudo conectar. Revisa tu señal e intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }, [user.id, user.status]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // --------------------------------------------------------------------------
  // Formulario
  // --------------------------------------------------------------------------

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCheckbox = (value) => {
    setFormData(prev => {
      // "Ninguno" y una alerta concreta no pueden convivir.
      if (value === 'Ninguno') {
        return { ...prev, alerts: prev.alerts.includes('Ninguno') ? [] : ['Ninguno'] };
      }
      const sinNinguno = prev.alerts.filter(a => a !== 'Ninguno');
      return {
        ...prev,
        alerts: sinNinguno.includes(value)
          ? sinNinguno.filter(a => a !== value)
          : [...sinNinguno, value]
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!patient) {
      toast.error('Todavía no tienes un paciente asignado.');
      return;
    }
    if (!sigCanvas.current || sigCanvas.current.isEmpty()) {
      toast.error('Dibuja tu firma en el recuadro antes de guardar.');
      return;
    }

    // getCanvas() y no getTrimmedCanvas(): la versión alpha de la librería
    // rompe con el recorte.
    const finalSignature = sigCanvas.current.getCanvas().toDataURL('image/png');

    setSaving(true);
    try {
      const res = await apiFetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caregiverId: user.id,
          patientId: patient.id,
          formData,
          caregiverSignature: finalSignature
        })
      });

      if (res.ok) {
        toast.success('Bitácora registrada.');
        setFormData(initialForm);
        sigCanvas.current?.clear();
        fetchData();
        setActiveTab('HISTORY');
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'No se pudo guardar la bitácora.');
      }
    } catch {
      toast.error('Sin conexión. La bitácora no se guardó.');
    } finally {
      setSaving(false);
    }
  };

  const handleUploadSena = async (e) => {
    e.preventDefault();
    if (!senaFile) {
      toast.error('Selecciona primero el archivo.');
      return;
    }
    const uploadData = new FormData();
    uploadData.append('certificate', senaFile);

    setUploading(true);
    try {
      const res = await apiFetch(`/api/upload-certificate/${user.id}`, {
        method: 'POST',
        body: uploadData
      });
      if (res.ok) {
        toast.success('Certificado enviado. Te avisaremos cuando lo revisen.');
        setSenaFile(null);
      } else {
        toast.error('No se pudo subir el archivo.');
      }
    } catch {
      toast.error('Sin conexión con el servidor.');
    } finally {
      setUploading(false);
    }
  };

  const submitEvaluation = async (e) => {
    e.preventDefault();
    if (rating === 0) { toast.warning('Asigna una puntuación.'); return; }
    if (!dataPrivacyAccepted) { toast.error('Debes aceptar la política de tratamiento de datos.'); return; }

    setSendingEval(true);
    try {
      const res = await apiFetch('/api/visits/evaluation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitId: visitorToEvaluate.visitId ?? visitorToEvaluate.id,
          caregiverId: user.id,
          rating,
          comments: evalComments,
          dataPrivacyAccepted
        })
      });
      if (res.ok) {
        toast.success('Evaluación enviada. Gracias.');
        setIsEvaluationOpen(false);
        setVisitorToEvaluate(null);
        setRating(0);
        setEvalComments('');
        setDataPrivacyAccepted(false);
      } else {
        toast.error('No se pudo guardar la evaluación.');
      }
    } catch {
      toast.error('Sin conexión con el servidor.');
    } finally {
      setSendingEval(false);
    }
  };

  const handleSendAiMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || sendingAi) return;

    const userText = inputMessage;
    setInputMessage('');
    setChatMessages(prev => [...prev, { role: 'user', text: userText }]);
    setSendingAi(true);

    try {
      const res = await apiFetch('/api/ai-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userText })
      });
      const data = await res.json();
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        text: res.ok ? data.reply : 'No pude encontrar la respuesta. Intenta de nuevo.'
      }]);
    } catch {
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        text: 'Sin conexión. Revisa tu señal e intenta de nuevo.'
      }]);
    } finally {
      setSendingAi(false);
    }
  };

  // ==========================================================================
  // Estados de la postulación
  // ==========================================================================

  if (user.status === 'PENDIENTE') {
    return (
      <EstadoPostulacion
        icon={<MdHourglassEmpty />}
        tono="warn"
        titulo="Tu solicitud está en revisión"
        descripcion={`Hola ${user.fullName}. Estamos validando tu perfil. Te avisaremos por correo cuando haya una respuesta.`}
        onLogout={onLogout}
      />
    );
  }

  if (user.status === 'PRESELECCIONADO') {
    return (
      <EstadoPostulacion
        icon={<MdVerified />}
        tono="ok"
        titulo="Fuiste preseleccionado"
        descripcion="Para completar tu contratación, sube tu certificado de cursos del SENA. Puede ser un PDF o una foto del documento."
        onLogout={onLogout}
      >
        <form onSubmit={handleUploadSena} className="mt-6 text-left">
          <Field label="Certificado del SENA" required>
            {(p) => (
              <input
                {...p}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => setSenaFile(e.target.files[0])}
                className="w-full min-h-11 rounded-md border border-ink-400 bg-white px-3 py-2 text-sm text-ink-700 file:mr-3 file:rounded file:border-0 file:bg-ink-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-ink-700"
              />
            )}
          </Field>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            icon={<MdUploadFile />}
            loading={uploading}
            disabled={!senaFile}
            className="w-full mt-4"
          >
            Enviar certificado
          </Button>
        </form>
      </EstadoPostulacion>
    );
  }

  // ==========================================================================
  // Panel aprobado
  // ==========================================================================

  return (
    <div className="min-h-screen bg-ink-50 pb-24">

      <header className="sticky top-0 z-40 bg-brand-800 text-white on-brand shadow-e2">
        <div className="max-w-3xl mx-auto px-4 py-3.5 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-lg font-semibold text-white">Bitácora digital</h1>
            <p className="text-xs text-brand-200 truncate">{user.fullName}</p>
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

      <main className="max-w-3xl mx-auto px-4 py-5 space-y-5">

        {/* Paciente asignado */}
        {loading ? (
          <Card className="p-5">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-6 w-52 mt-2.5" />
            <Skeleton className="h-3.5 w-40 mt-2" />
          </Card>
        ) : patient ? (
          <Card className="p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-ink-500">
                  Paciente a tu cargo
                </p>
                <h2 className="text-xl font-semibold text-ink-900 mt-1">{patient.fullName}</h2>
                <p className="text-sm text-ink-600 mt-1">
                  {patient.diagnosis || <SinRegistrar />}
                </p>
              </div>
              <Button
                variant="secondary"
                icon={<MdPerson />}
                onClick={() => setIsPatientProfileOpen(true)}
                className="shrink-0"
              >
                Ver perfil
              </Button>
            </div>
          </Card>
        ) : (
          <EmptyState
            icon={<MdPerson />}
            title="Todavía no tienes un paciente asignado"
            description="Cuando la alcaldía te asigne un paciente, podrás registrar la bitácora diaria."
          />
        )}

        {/* Lo que exige acción va aparte, no escondido dentro de otra tarjeta */}
        {!loading && visitorToEvaluate && (
          <section className="rounded-lg border border-accent-200 bg-accent-50 p-5 animate-rise">
            <h2 className="text-base font-semibold text-accent-900">
              Califica la visita del profesional
            </h2>
            <p className="text-sm text-accent-800 mt-1.5 measure">
              {visitorToEvaluate.name
                ? `${visitorToEvaluate.name} visitó a tu paciente recientemente.`
                : 'Un profesional visitó a tu paciente recientemente.'}
            </p>
            <Button
              variant="primary"
              icon={<MdStar />}
              className="mt-3.5"
              onClick={() => setIsEvaluationOpen(true)}
            >
              Evaluar ahora
            </Button>
          </section>
        )}

        {/* Pestañas */}
        <div role="tablist" aria-label="Secciones" className="flex gap-1 rounded-lg border border-ink-200 bg-white p-1">
          {[
            { id: 'FORM', label: 'Nueva bitácora', icon: <MdNoteAlt /> },
            { id: 'HISTORY', label: `Historial (${logs.length})`, icon: <MdEventNote /> }
          ].map(tab => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={[
                'flex-1 inline-flex items-center justify-center gap-2 min-h-11 rounded-md',
                'text-sm font-medium transition-colors',
                activeTab === tab.id
                  ? 'bg-brand-700 text-white'
                  : 'text-ink-600 hover:bg-ink-100 hover:text-ink-900'
              ].join(' ')}
            >
              <span aria-hidden="true" className="text-base">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Formulario                                                       */}
        {/* ---------------------------------------------------------------- */}
        {activeTab === 'FORM' && (
          <form id="form-bitacora" onSubmit={handleSubmit} className="space-y-5">

            <Section code="A1" title="Identificación">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-ink-500">Fecha de hoy</p>
                  <p className="text-md font-semibold text-ink-900 mt-1.5">
                    {new Date().toLocaleDateString('es-CO', {
                      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
                    })}
                  </p>
                </div>

                {/* Estos botones existían pero no estaban conectados a nada:
                    el turno nunca quedaba registrado. */}
                <fieldset>
                  <legend className="text-xs font-medium uppercase tracking-wide text-ink-500 mb-2">
                    Turno
                  </legend>
                  <div className="grid grid-cols-3 gap-2">
                    {TURNOS.map(turno => (
                      <OpcionTarjeta
                        key={turno}
                        name="shift"
                        value={turno}
                        checked={formData.shift === turno}
                        onChange={handleChange}
                        label={turno}
                      />
                    ))}
                  </div>
                </fieldset>
              </div>
            </Section>

            <Section code="A2" title="Estado general">
              <RadioGroup label="¿Cómo encontraste al paciente?" name="generalState" options={['Igual', 'Mejor', 'Peor']} val={formData.generalState} onChange={handleChange} />
              <RadioGroup label="Nivel de alerta" name="alertLevel" options={['Alerta', 'Somnoliento', 'Desorientado']} val={formData.alertLevel} onChange={handleChange} />
              <RadioGroup label="Movilidad" name="mobility" options={['Camina', 'Con ayuda', 'Encamado']} val={formData.mobility} onChange={handleChange} />
            </Section>

            <Section code="A3" title="Signos vitales" hint="Opcional, pero ayuda mucho al médico.">
              <div className="grid grid-cols-3 gap-3">
                <Field label="Temperatura">
                  {(p) => <input {...p} type="number" step="0.1" inputMode="decimal" name="temperature" value={formData.temperature} onChange={handleChange} placeholder="37.5" />}
                </Field>
                <Field label="Presión alta">
                  {(p) => <input {...p} type="number" inputMode="numeric" name="systolicBP" value={formData.systolicBP} onChange={handleChange} placeholder="120" />}
                </Field>
                <Field label="Presión baja">
                  {(p) => <input {...p} type="number" inputMode="numeric" name="diastolicBP" value={formData.diastolicBP} onChange={handleChange} placeholder="80" />}
                </Field>
              </div>
            </Section>

            <Section code="A4" title="Alimentación e hidratación">
              <RadioGroup label="¿Cómo se alimentó?" name="feeding" options={['Completa', 'Parcial', 'No toleró']} val={formData.feeding} onChange={handleChange} />
              <VisualSelect label="¿Tomó suficientes líquidos?" name="hydration" val={formData.hydration} onChange={handleChange} />
              <Field label="Observaciones sobre la comida" className="mt-4">
                {(p) => <textarea {...p} rows={2} name="foodObs" value={formData.foodObs} onChange={handleChange} placeholder="Escribe aquí si hubo algún problema…" />}
              </Field>
            </Section>

            <Section code="A5" title="Medicación">
              <RadioGroup label="¿Se dieron los medicamentos a tiempo?" name="medsGiven" options={['Sí', 'No']} val={formData.medsGiven} onChange={handleChange} />
              {formData.medsGiven === 'No' && (
                <div className="rounded-md border border-risk-border bg-risk-soft p-4 animate-rise">
                  <Field
                    label="¿Por qué no se dio el medicamento?"
                    required
                    hint="Este dato lo revisa el equipo médico."
                  >
                    {(p) => (
                      <input
                        {...p}
                        type="text"
                        name="medsReason"
                        value={formData.medsReason}
                        onChange={handleChange}
                        placeholder="El paciente lo rechazó, no había pastillas…"
                      />
                    )}
                  </Field>
                </div>
              )}
            </Section>

            <Section code="A6" title="Higiene y cuidado">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <VisualSelect label="Baño realizado" name="hygiene" val={formData.hygiene} onChange={handleChange} />
                <VisualSelect label="Cambio de ropa" name="clothes" val={formData.clothes} onChange={handleChange} />
                <VisualSelect label="Cuidado de la piel" name="skin" val={formData.skin} onChange={handleChange} />
              </div>
            </Section>

            <Section code="A7" title="Movilización">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <VisualSelect label="Se levantó o se movió" name="mobilization" val={formData.mobilization} onChange={handleChange} />
                <VisualSelect label="Cambio de postura" name="position" val={formData.position} onChange={handleChange} />
                <VisualSelect label="Usó ayudas" name="aids" val={formData.aids} onChange={handleChange} />
              </div>
            </Section>

            <Section code="A8" title="Eventos o alertas" hint="Toca todo lo que haya pasado hoy. Puedes marcar varios.">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {ALERTAS.map(opt => {
                  const isSelected = formData.alerts.includes(opt);
                  const esNinguno = opt === 'Ninguno';
                  return (
                    <label
                      key={opt}
                      className={[
                        'flex flex-col items-center justify-center gap-1.5 min-h-24 p-3 rounded-md border cursor-pointer text-center transition-colors',
                        isSelected
                          ? esNinguno
                            ? 'bg-ok-soft border-ok text-ok-strong'
                            : 'bg-risk-soft border-risk text-risk-strong'
                          : 'bg-white border-ink-400 text-ink-700 hover:bg-ink-50 hover:border-ink-500'
                      ].join(' ')}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleCheckbox(opt)}
                        className="sr-only"
                      />
                      <span aria-hidden="true" className="text-2xl">{getIcon(opt)}</span>
                      <span className="text-xs font-medium leading-tight">{opt}</span>
                    </label>
                  );
                })}
              </div>

              <Field label="Describe brevemente lo que pasó" className="mt-4">
                {(p) => <textarea {...p} rows={3} name="alertDesc" value={formData.alertDesc} onChange={handleChange} placeholder="Si marcaste una alerta, cuéntanos qué ocurrió…" />}
              </Field>
            </Section>

            <Section code="A9" title="Observaciones">
              <Field label="Cualquier otro detalle del turno">
                {(p) => <textarea {...p} rows={4} name="observations" value={formData.observations} onChange={handleChange} placeholder="Escribe aquí lo que creas importante…" />}
              </Field>
            </Section>

            <Section code="A10" title="Tu firma" hint="Dibuja tu firma con el dedo dentro del recuadro.">
              <div className="rounded-md border border-dashed border-ink-400 bg-white overflow-hidden">
                <SignatureCanvas
                  ref={sigCanvas}
                  canvasProps={{
                    className: 'w-full h-40 cursor-crosshair touch-none',
                    'aria-label': 'Recuadro para dibujar tu firma'
                  }}
                  penColor="#141920"
                />
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="mt-3"
                onClick={() => sigCanvas.current?.clear()}
              >
                Borrar firma
              </Button>
            </Section>
          </form>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Historial                                                        */}
        {/* ---------------------------------------------------------------- */}
        {activeTab === 'HISTORY' && (
          loading ? (
            <div className="space-y-3">
              {[0, 1, 2].map(i => (
                <Card key={i} className="p-4">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3.5 w-full mt-3" />
                  <Skeleton className="h-3.5 w-2/3 mt-1.5" />
                </Card>
              ))}
            </div>
          ) : logs.length === 0 ? (
            <EmptyState
              icon={<MdEventNote />}
              title="Todavía no has registrado bitácoras"
              description="Cuando guardes tu primera bitácora, aparecerá aquí."
              action={<Button variant="primary" onClick={() => setActiveTab('FORM')}>Registrar la primera</Button>}
            />
          ) : (
            <div className="space-y-3 stagger">
              {logs.map((log) => {
                // El POST envía el contenido en `formData` y el servidor lo
                // guarda en `content`. Antes esto leía `log.notes`, que no
                // existe, así que el historial salía siempre sin detalle.
                let content = {};
                const crudo = log.content ?? log.notes ?? log.formData;
                try {
                  content = typeof crudo === 'string' ? JSON.parse(crudo) : (crudo || {});
                } catch {
                  content = { observations: crudo };
                }

                const alertas = Array.isArray(content.alerts)
                  ? content.alerts.filter(a => a !== 'Ninguno')
                  : [];

                return (
                  <Card key={log.id} className="p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-ink-900">
                        {new Date(log.date).toLocaleDateString('es-CO', {
                          weekday: 'short', day: 'numeric', month: 'long'
                        })}
                        {content.shift && (
                          <span className="font-normal text-ink-500"> · turno {content.shift.toLowerCase()}</span>
                        )}
                      </p>
                      <Badge
                        tone={alertas.length > 0 ? 'risk' : 'ok'}
                        icon={alertas.length > 0 ? <MdWarning /> : <MdCheckCircle />}
                      >
                        {alertas.length > 0 ? `${alertas.length} alerta${alertas.length > 1 ? 's' : ''}` : 'Sin novedad'}
                      </Badge>
                    </div>

                    <p className="text-sm text-ink-700 mt-2.5 leading-relaxed measure">
                      {content.observations || content.alertDesc || <SinRegistrar />}
                    </p>

                    <div className="flex flex-wrap gap-2 mt-3">
                      {content.feeding && <Badge>Alimentación: {content.feeding}</Badge>}
                      <Badge tone={content.medsGiven === 'Sí' ? 'ok' : 'warn'}>
                        {content.medsGiven === 'Sí' ? 'Medicamentos al día' : 'Medicamentos pendientes'}
                      </Badge>
                    </div>
                  </Card>
                );
              })}
            </div>
          )
        )}
      </main>

      {/* Barra de guardado fija: el formulario es largo y en un teléfono el
          botón quedaba a diez pantallas de distancia del último campo. */}
      {activeTab === 'FORM' && (
        <div className="fixed bottom-0 inset-x-0 z-30 border-t border-ink-200 bg-white/95 backdrop-blur px-4 py-3">
          <div className="max-w-3xl mx-auto">
            <Button
              type="submit"
              form="form-bitacora"
              variant="ok"
              size="lg"
              icon={<MdSave />}
              loading={saving}
              disabled={!patient}
              className="w-full"
            >
              Guardar bitácora
            </Button>
          </div>
        </div>
      )}

      {/* Asistente */}
      <button
        type="button"
        onClick={() => setIsChatOpen(true)}
        aria-label="Abrir la guía de cuidado"
        className="fixed bottom-24 right-4 z-30 h-14 w-14 rounded-full bg-brand-700 text-white shadow-e3 hover:bg-brand-800 transition-colors flex items-center justify-center"
      >
        <MdLightbulb aria-hidden="true" className="text-2xl" />
      </button>

      {/* ------------------------------------------------------------------ */}
      {/* Modales                                                             */}
      {/* ------------------------------------------------------------------ */}

      <Modal
        open={isPatientProfileOpen && Boolean(patient)}
        onClose={() => setIsPatientProfileOpen(false)}
        size="sm"
        icon={<MdPerson />}
        title={patient?.fullName || 'Paciente'}
        subtitle={[
          patient?.age ? `${patient.age} años` : null,
          patient?.stratum ? `estrato ${patient.stratum}` : null
        ].filter(Boolean).join(' · ') || undefined}
        footer={<Button variant="primary" onClick={() => setIsPatientProfileOpen(false)}>Cerrar</Button>}
      >
        {patient && (
          <div className="space-y-4">
            <Card>
              <CardBody className="pt-5">
                <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-ink-500 mb-3">
                  <MdMonitorHeart aria-hidden="true" className="text-base" />
                  Información médica
                </p>
                <dl className="space-y-3.5">
                  <Dato label="Diagnóstico principal" value={patient.diagnosis} />
                  <Dato label="Condición actual" value={patient.condition} />
                </dl>
              </CardBody>
            </Card>

            <Card>
              <CardBody className="pt-5">
                <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-ink-500 mb-3">
                  <MdWarning aria-hidden="true" className="text-base" />
                  Instrucciones de cuidado
                </p>
                <p className="text-sm text-ink-800 leading-relaxed whitespace-pre-line measure">
                  {patient.careInstructions || <SinRegistrar />}
                </p>
              </CardBody>
            </Card>

            <Card>
              <CardBody className="pt-5">
                <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-ink-500 mb-3">
                  <MdHome aria-hidden="true" className="text-base" />
                  Ubicación y contacto
                </p>
                <dl className="space-y-3.5">
                  <Dato label="Dirección" value={patient.address} />
                  <Dato
                    label="Teléfono"
                    value={patient.phone
                      ? <a href={`tel:${patient.phone}`} className="text-brand-700 underline underline-offset-2 inline-flex items-center gap-1.5">
                          <MdPhone aria-hidden="true" />{patient.phone}
                        </a>
                      : null}
                  />
                </dl>
              </CardBody>
            </Card>
          </div>
        )}
      </Modal>

      <Modal
        open={isEvaluationOpen && Boolean(visitorToEvaluate)}
        onClose={() => setIsEvaluationOpen(false)}
        size="sm"
        icon={<MdStar />}
        title="Evaluar la visita médica"
        subtitle={visitorToEvaluate?.name}
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsEvaluationOpen(false)}>Cancelar</Button>
            <Button
              variant="primary"
              type="submit"
              form="form-evaluacion"
              loading={sendingEval}
              disabled={rating === 0 || !dataPrivacyAccepted}
            >
              Enviar evaluación
            </Button>
          </>
        }
      >
        <form id="form-evaluacion" onSubmit={submitEvaluation} className="space-y-5">
          {visitorToEvaluate?.specialty && (
            <Card className="p-4 flex items-center gap-3.5">
              <span aria-hidden="true" className="h-11 w-11 rounded-full bg-brand-50 text-brand-700 flex items-center justify-center text-xl">
                <MdMedicalServices />
              </span>
              <div>
                <p className="text-sm font-semibold text-ink-900">{visitorToEvaluate.name}</p>
                <p className="text-xs text-ink-500">{visitorToEvaluate.specialty}</p>
              </div>
            </Card>
          )}

          <fieldset>
            <legend className="text-sm font-medium text-ink-700 mb-3">
              Puntuación de la atención
            </legend>
            <div className="flex gap-1.5">
              {[1, 2, 3, 4, 5].map(star => (
                <label key={star} className="cursor-pointer p-1.5 rounded-md hover:bg-ink-100 transition-colors">
                  <input
                    type="radio"
                    name="rating"
                    value={star}
                    checked={rating === star}
                    onChange={() => setRating(star)}
                    className="sr-only"
                  />
                  <span className="sr-only">{star} de 5 estrellas</span>
                  <MdStar
                    aria-hidden="true"
                    className={`text-3xl ${star <= rating ? 'text-accent-400' : 'text-ink-300'}`}
                  />
                </label>
              ))}
            </div>
          </fieldset>

          <Field label="Comentarios" hint="Opcional.">
            {(p) => (
              <textarea
                {...p}
                rows={3}
                value={evalComments}
                onChange={(e) => setEvalComments(e.target.value)}
                placeholder="¿Qué estuvo bien? ¿Qué se puede mejorar?"
              />
            )}
          </Field>

          <div className="rounded-md border border-ink-200 bg-white p-4">
            <p className="flex items-center gap-2 text-sm font-medium text-ink-900">
              <MdSecurity aria-hidden="true" className="text-brand-600" />
              Tratamiento de datos personales
            </p>
            <p className="text-xs text-ink-600 mt-2 leading-relaxed">
              Autorizo el tratamiento de mis datos y los del paciente para fines de
              auditoría y seguimiento clínico, conforme a la Ley 1581 de 2012.
            </p>
            <label className="flex items-center gap-2.5 mt-3.5 min-h-11 cursor-pointer text-sm font-medium text-ink-900">
              <input
                type="checkbox"
                checked={dataPrivacyAccepted}
                onChange={(e) => setDataPrivacyAccepted(e.target.checked)}
                className="h-5 w-5 rounded border-ink-400 text-brand-700 focus:ring-brand-500"
              />
              Acepto la política de datos
            </label>
          </div>
        </form>
      </Modal>

      <Modal
        open={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        size="sm"
        icon={<MdLightbulb />}
        title="Guía de cuidado"
        subtitle="Preguntas sobre el cuidado diario"
        bodyClassName="p-4 flex flex-col gap-3"
      >
        <div className="flex flex-col gap-3" aria-live="polite">
          {chatMessages.map((msg, index) => (
            <div
              key={index}
              className={[
                'px-4 py-2.5 rounded-lg text-sm whitespace-pre-line max-w-[88%] leading-relaxed',
                msg.role === 'user'
                  ? 'bg-brand-700 text-white self-end'
                  : 'bg-white border border-ink-200 text-ink-800 self-start'
              ].join(' ')}
            >
              {msg.text}
            </div>
          ))}

          {sendingAi && (
            <div className="self-start bg-white border border-ink-200 rounded-lg px-4 py-3">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-3 w-24 mt-2" />
            </div>
          )}
        </div>

        <form onSubmit={handleSendAiMessage} className="flex gap-2 pt-1">
          <Field label="Tu pregunta" className="flex-1">
            {(p) => (
              <input
                {...p}
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Escribe tu pregunta…"
                disabled={sendingAi}
              />
            )}
          </Field>
          <Button
            type="submit"
            variant="primary"
            icon={<MdSend />}
            loading={sendingAi}
            disabled={!inputMessage.trim()}
            className="self-end"
          >
            <span className="sr-only">Enviar</span>
          </Button>
        </form>
      </Modal>
    </div>
  );
}

// ============================================================================
// Piezas del formulario
// ============================================================================

/**
 * Iconos del formulario. Se conservan porque son buenos: son iconos
 * dibujados de una librería real, no emoji, y cada uno dice algo. Lo que
 * cambia es la paleta: ahora usan los tonos semánticos del sistema en vez
 * de siete familias de color sin criterio.
 */
const getIcon = (word) => {
  const icons = {
    'Mañana': <MdWbSunny className="text-accent-500" />,
    'Tarde': <MdWbTwilight className="text-accent-600" />,
    'Noche': <MdNightsStay className="text-brand-700" />,
    'Igual': <MdSentimentNeutral className="text-ink-500" />,
    'Mejor': <MdSentimentSatisfied className="text-ok" />,
    'Peor': <MdSentimentVeryDissatisfied className="text-risk" />,
    'Alerta': <MdVisibility className="text-brand-600" />,
    'Somnoliento': <MdSnooze className="text-ink-500" />,
    'Desorientado': <MdPsychology className="text-accent-700" />,
    'Camina': <MdDirectionsWalk className="text-ok" />,
    'Con ayuda': <MdAccessible className="text-brand-600" />,
    'Encamado': <MdBed className="text-ink-600" />,
    'Completa': <MdRestaurant className="text-ok" />,
    'Parcial': <MdFastfood className="text-accent-700" />,
    'No toleró': <MdDoNotDisturb className="text-risk" />,
    'Sí': <MdCheck className="text-ok" />,
    'No': <MdClose className="text-risk" />,
    'No aplica': <MdRemove className="text-ink-500" />,
    'Caída': <MdPersonalInjury className="text-risk" />,
    'Fiebre': <MdThermostat className="text-accent-700" />,
    'Dolor': <MdCoronavirus className="text-risk" />,
    'Dif. Respiratoria': <MdAir className="text-brand-600" />,
    'Cambio Conducta': <MdPsychology className="text-accent-700" />,
    'Ninguno': <MdCheckCircle className="text-ok" />
  };
  return icons[word] || <MdNoteAlt className="text-ink-500" />;
};

function Section({ code, title, hint, children }) {
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

/** Botón-tarjeta con radio real debajo: llega con Tab y se elige con flechas. */
function OpcionTarjeta({ name, value, checked, onChange, label }) {
  return (
    <label
      className={[
        'flex flex-col items-center justify-center gap-1.5 min-h-20 px-2 py-3 rounded-md border cursor-pointer text-center transition-colors',
        checked
          ? 'bg-brand-700 border-brand-700 text-white'
          : 'bg-white border-ink-400 text-ink-700 hover:bg-ink-50 hover:border-ink-500'
      ].join(' ')}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        className="sr-only"
      />
      <span aria-hidden="true" className={`text-2xl ${checked ? 'brightness-0 invert' : ''}`}>
        {getIcon(value)}
      </span>
      <span className="text-xs font-medium leading-tight">{label}</span>
    </label>
  );
}

function RadioGroup({ label, name, options, val, onChange }) {
  return (
    <fieldset className="mb-5 last:mb-0">
      <legend className="text-sm font-medium text-ink-800 mb-2.5">{label}</legend>
      <div className="grid grid-cols-3 gap-2">
        {options.map(opt => (
          <OpcionTarjeta
            key={opt}
            name={name}
            value={opt}
            checked={val === opt}
            onChange={onChange}
            label={opt}
          />
        ))}
      </div>
    </fieldset>
  );
}

function VisualSelect({ label, name, val, onChange }) {
  return (
    <fieldset className="rounded-md border border-ink-200 p-3.5">
      <legend className="px-1.5 text-xs font-medium text-ink-700">{label}</legend>
      <div className="grid grid-cols-3 gap-2 mt-1">
        {['Sí', 'No', 'No aplica'].map(opt => {
          const checked = val === opt;
          return (
            <label
              key={opt}
              className={[
                'flex flex-col items-center justify-center gap-1 min-h-16 rounded-md border cursor-pointer text-center transition-colors px-1',
                checked
                  ? opt === 'Sí'
                    ? 'bg-ok-soft border-ok text-ok-strong'
                    : opt === 'No'
                      ? 'bg-risk-soft border-risk text-risk-strong'
                      : 'bg-ink-100 border-ink-400 text-ink-800'
                  : 'bg-white border-ink-400 text-ink-600 hover:bg-ink-50 hover:border-ink-500'
              ].join(' ')}
            >
              <input
                type="radio"
                name={name}
                value={opt}
                checked={checked}
                onChange={onChange}
                className="sr-only"
              />
              <span aria-hidden="true" className="text-lg">{getIcon(opt)}</span>
              <span className="text-2xs font-medium leading-tight">{opt}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

// ============================================================================
// Pantallas de estado de la postulación
// ============================================================================

function EstadoPostulacion({ icon, tono, titulo, descripcion, children, onLogout }) {
  const tonos = {
    warn: 'bg-warn-soft text-warn-strong',
    ok: 'bg-ok-soft text-ok-strong'
  };

  return (
    <div className="min-h-screen bg-ink-50 flex items-center justify-center p-5">
      <Card className="w-full max-w-lg p-7 text-center animate-rise">
        <span
          aria-hidden="true"
          className={`inline-flex h-16 w-16 items-center justify-center rounded-full text-3xl ${tonos[tono]}`}
        >
          {icon}
        </span>

        <h1 className="text-xl font-semibold text-ink-900 mt-5">{titulo}</h1>
        <p className="text-base text-ink-600 mt-2.5 leading-relaxed measure mx-auto">
          {descripcion}
        </p>

        {children}

        <div className="mt-6 pt-5 border-t border-ink-100">
          <Button variant="ghost" onClick={onLogout} icon={<MdLogout />}>
            Cerrar sesión
          </Button>
        </div>
      </Card>
    </div>
  );
}
