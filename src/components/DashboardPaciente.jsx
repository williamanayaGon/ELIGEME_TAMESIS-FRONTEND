import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
  MdPerson, MdAssignment, MdStar, MdSmartToy, MdLogout,
  MdEventNote, MdMedicalServices, MdSend, MdCheckCircle
} from 'react-icons/md';

import { apiFetch } from '../lib/api';
import {
  Modal, Button, Badge, EmptyState,
  Card, CardHeader, CardBody,
  Dato, SinRegistrar, Field,
  Skeleton
} from './ui';

/**
 * Portal del paciente.
 *
 * Es la superficie con el usuario más vulnerable del programa: adultos
 * mayores, a veces con visión reducida, muchas veces desde el teléfono de
 * un familiar. Por eso aquí el cuerpo de texto sube un escalón respecto al
 * resto de la aplicación, las acciones son pocas y grandes, y lo único que
 * exige atención se anuncia arriba en lugar de esconderse en una tarjeta.
 */

export default function DashboardPaciente({ user, onLogout }) {
  const [activeModal, setActiveModal] = useState(null);
  const [loading, setLoading] = useState(true);

  const [logs, setLogs] = useState([]);
  const [visits, setVisits] = useState([]);
  const [pendingVisit, setPendingVisit] = useState(null);

  const [rating, setRating] = useState(0);
  const [evalComments, setEvalComments] = useState('');
  const [sending, setSending] = useState(false);

  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isLoadingAi, setIsLoadingAi] = useState(false);

  // --------------------------------------------------------------------------
  // Carga
  // --------------------------------------------------------------------------

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Las tres cosas que el paciente puede ver de sí mismo. Antes solo se
      // pedían las bitácoras: las visitas quedaban siempre vacías en
      // pantalla y la visita pendiente por calificar nunca se buscaba, así
      // que el botón de calificar no podía funcionar nunca.
      const [resLogs, resVisits, resPending] = await Promise.all([
        apiFetch(`/api/logs?patientId=${user.id}`),
        apiFetch(`/api/visits?patientId=${user.id}`),
        apiFetch(`/api/visits/pending-evaluation/${user.id}`)
      ]);

      // Se vuelve a filtrar por paciente en el cliente aunque la petición
      // ya lleve `patientId`. Si el backend ignorara ese parámetro, este
      // panel mostraría a un paciente las visitas y bitácoras de otros:
      // datos de salud de terceros, categoría sensible bajo la Ley 1581.
      // El filtro del servidor sigue siendo el que manda; esto es un cierre.
      const soloMios = (lista) =>
        (Array.isArray(lista) ? lista : []).filter(
          (r) => String(r.patientId) === String(user.id)
        );

      if (resLogs.ok) setLogs(soloMios(await resLogs.json()));
      if (resVisits.ok) setVisits(soloMios(await resVisits.json()));
      if (resPending.ok) {
        const d = await resPending.json();
        // La ruta puede devolver una visita o una lista, según el caso.
        const pendiente = Array.isArray(d) ? d[0] : d;
        setPendingVisit(pendiente && pendiente.id ? pendiente : null);
      }
    } catch {
      toast.error('No se pudo conectar con el servidor. Revisa tu conexión.');
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // --------------------------------------------------------------------------
  // Acciones
  // --------------------------------------------------------------------------

  const handleSendRating = async () => {
    if (rating === 0) {
      toast.warning('Selecciona de una a cinco estrellas.');
      return;
    }
    if (!pendingVisit) return;

    setSending(true);
    try {
      const res = await apiFetch('/api/visits/evaluation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitId: pendingVisit.id, rating, comments: evalComments })
      });
      if (res.ok) {
        toast.success('Gracias por calificar el servicio.');
        setActiveModal(null);
        setPendingVisit(null);
        setRating(0);
        setEvalComments('');
        fetchData();
      } else {
        toast.error('No se pudo enviar la calificación.');
      }
    } catch {
      toast.error('Sin conexión con el servidor.');
    } finally {
      setSending(false);
    }
  };

  const handleAskAI = async (e) => {
    e.preventDefault();
    if (!aiPrompt.trim()) return;

    setIsLoadingAi(true);
    setAiResponse('');
    try {
      const res = await apiFetch('/api/ai-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiPrompt, message: aiPrompt, userType: 'patient' })
      });
      if (res.ok) {
        const data = await res.json();
        setAiResponse(data.reply || data.response || 'No se obtuvo respuesta.');
      } else {
        toast.error('No se pudo consultar el asistente.');
      }
    } catch {
      toast.error('Sin conexión con el asistente.');
    } finally {
      setIsLoadingAi(false);
    }
  };

  const nombre = user?.name || user?.fullName || 'Paciente';

  const acciones = [
    {
      id: 'HISTORIA',
      titulo: 'Mi historia',
      descripcion: 'Las visitas del médico y las bitácoras de tu cuidador.',
      icon: <MdAssignment />
    },
    {
      id: 'CALIFICAR',
      titulo: 'Calificar la atención',
      descripcion: pendingVisit
        ? 'Tienes una visita por calificar.'
        : 'Ahora mismo no tienes visitas por calificar.',
      icon: <MdStar />,
      disabled: !pendingVisit
    },
    {
      id: 'IA',
      titulo: 'Consultar dudas',
      descripcion: 'Preguntas generales sobre salud y bienestar.',
      icon: <MdSmartToy />
    }
  ];

  return (
    <div className="min-h-screen bg-ink-50">

      <header className="bg-brand-800 text-white on-brand shadow-e2">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <span
              aria-hidden="true"
              className="shrink-0 h-11 w-11 rounded-full bg-white/15 flex items-center justify-center text-2xl"
            >
              <MdPerson />
            </span>
            <div className="min-w-0">
              <p className="text-xs text-brand-200">Portal del paciente</p>
              <h1 className="text-lg font-semibold text-white truncate">{nombre}</h1>
            </div>
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

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* Lo que exige acción va arriba y se anuncia. No es una tarjeta más
            en una rejilla: es el único motivo por el que alguien entraría hoy. */}
        {!loading && pendingVisit && (
          <section
            aria-labelledby="accion-requerida"
            className="rounded-lg border border-accent-200 bg-accent-50 p-5 sm:p-6 animate-rise"
          >
            <h2 id="accion-requerida" className="text-lg font-semibold text-accent-900">
              Tienes una visita por calificar
            </h2>
            <p className="text-md text-accent-800 mt-1.5 measure">
              {pendingVisit.date
                ? `El profesional te visitó el ${new Date(pendingVisit.date).toLocaleDateString('es-CO', { day: 'numeric', month: 'long' })}.`
                : 'Un profesional te visitó recientemente.'}
              {' '}Tu opinión ayuda a mejorar el servicio.
            </p>
            <Button
              variant="primary"
              size="lg"
              icon={<MdStar />}
              className="mt-4"
              onClick={() => setActiveModal('CALIFICAR')}
            >
              Calificar ahora
            </Button>
          </section>
        )}

        <section aria-label="Acciones disponibles">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[0, 1, 2].map(i => (
                <div key={i} className="bg-white border border-ink-200 rounded-lg shadow-e1 p-6">
                  <Skeleton className="h-11 w-11 rounded-md" />
                  <Skeleton className="h-5 w-32 mt-4" />
                  <Skeleton className="h-3.5 w-full mt-2.5" />
                  <Skeleton className="h-3.5 w-3/4 mt-1.5" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 stagger">
              {acciones.map(a => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setActiveModal(a.id)}
                  disabled={a.disabled}
                  className={[
                    'text-left bg-white border border-ink-200 rounded-lg shadow-e1 p-6',
                    'transition-shadow duration-200',
                    a.disabled
                      ? 'opacity-60 cursor-not-allowed'
                      : 'hover:shadow-e2 hover:border-ink-300'
                  ].join(' ')}
                >
                  <span
                    aria-hidden="true"
                    className="inline-flex h-11 w-11 items-center justify-center rounded-md bg-brand-50 text-brand-700 text-2xl"
                  >
                    {a.icon}
                  </span>
                  <h3 className="text-md font-semibold text-ink-900 mt-4">{a.titulo}</h3>
                  <p className="text-sm text-ink-500 mt-1.5 leading-relaxed">{a.descripcion}</p>
                </button>
              ))}
            </div>
          )}
        </section>

        <section aria-labelledby="resumen">
          <h2 id="resumen" className="sr-only">Resumen de tu seguimiento</h2>
          <Card>
            <CardBody className="pt-5">
              <dl className="grid grid-cols-2 gap-5">
                <Dato
                  label="Visitas del médico"
                  value={loading ? '…' : visits.length || <SinRegistrar />}
                />
                <Dato
                  label="Bitácoras de tu cuidador"
                  value={loading ? '…' : logs.length || <SinRegistrar />}
                />
              </dl>
            </CardBody>
          </Card>
        </section>
      </main>

      {/* ------------------------------------------------------------------ */}
      {/* Historia clínica                                                    */}
      {/* ------------------------------------------------------------------ */}
      <Modal
        open={activeModal === 'HISTORIA'}
        onClose={() => setActiveModal(null)}
        size="md"
        icon={<MdAssignment />}
        title="Mi historia"
        subtitle="Todo lo que se ha registrado sobre tu cuidado"
        footer={<Button variant="primary" onClick={() => setActiveModal(null)}>Cerrar</Button>}
      >
        <div className="space-y-6">
          <section>
            <h3 className="text-sm font-semibold text-ink-900 mb-3">Visitas del médico</h3>
            {visits.length === 0 ? (
              <EmptyState
                icon={<MdMedicalServices />}
                title="Todavía no hay visitas registradas"
                description="Cuando un profesional te visite en casa, quedará registrado aquí."
              />
            ) : (
              <ul className="space-y-3">
                {visits.map((v, i) => (
                  <li key={v.id ?? i}>
                    <Card className="p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-ink-900">
                          {new Date(v.date).toLocaleDateString('es-CO', {
                            day: 'numeric', month: 'long', year: 'numeric'
                          })}
                        </p>
                        <Badge tone="brand">Visita domiciliaria</Badge>
                      </div>
                      {v.professionalName && (
                        <p className="text-sm text-ink-500 mt-1.5">
                          Atendida por {v.professionalName}
                        </p>
                      )}
                    </Card>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h3 className="text-sm font-semibold text-ink-900 mb-3">Bitácoras de tu cuidador</h3>
            {logs.length === 0 ? (
              <EmptyState
                icon={<MdEventNote />}
                title="Todavía no hay bitácoras"
                description="Tu cuidador registra aquí lo que hace cada día."
              />
            ) : (
              <ul className="space-y-3">
                {logs.map((log, i) => {
                  let data = {};
                  try { data = JSON.parse(log.content); } catch { data = { observations: log.content }; }
                  return (
                    <li key={log.id ?? i}>
                      <Card className="p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-ink-900">
                            {new Date(log.date).toLocaleDateString('es-CO', {
                              day: 'numeric', month: 'long', year: 'numeric'
                            })}
                          </p>
                          {data.generalState && (
                            <Badge tone={data.generalState === 'Peor' ? 'risk' : 'ok'}>
                              {data.generalState}
                            </Badge>
                          )}
                        </div>
                        {log.caregiverName && (
                          <p className="text-sm text-ink-500 mt-1.5">Cuidador: {log.caregiverName}</p>
                        )}
                        <p className="text-sm text-ink-800 mt-2.5 leading-relaxed measure">
                          {data.observations || data.notes || <SinRegistrar />}
                        </p>
                      </Card>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </Modal>

      {/* ------------------------------------------------------------------ */}
      {/* Calificar                                                           */}
      {/* ------------------------------------------------------------------ */}
      <Modal
        open={activeModal === 'CALIFICAR'}
        onClose={() => setActiveModal(null)}
        size="sm"
        icon={<MdStar />}
        title="Calificar la atención"
        subtitle="¿Cómo te pareció la visita del profesional?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setActiveModal(null)}>Cancelar</Button>
            <Button variant="primary" onClick={handleSendRating} loading={sending} disabled={rating === 0}>
              Enviar calificación
            </Button>
          </>
        }
      >
        {!pendingVisit ? (
          <EmptyState
            icon={<MdCheckCircle />}
            title="No tienes visitas por calificar"
            description="Cuando un profesional te visite, podrás calificar la atención desde aquí."
          />
        ) : (
          <div className="space-y-6">
            {/* Radios reales: se puede llegar con Tab y elegir con las flechas. */}
            <fieldset>
              <legend className="text-sm font-medium text-ink-700 mb-3">
                Elige de una a cinco estrellas
              </legend>
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map(star => (
                  <label
                    key={star}
                    className="cursor-pointer p-1 rounded-md hover:bg-ink-100 transition-colors"
                    title={`${star} de 5`}
                  >
                    <input
                      type="radio"
                      name="calificacion"
                      value={star}
                      checked={rating === star}
                      onChange={() => setRating(star)}
                      className="sr-only peer"
                    />
                    <span className="sr-only">{star} de 5 estrellas</span>
                    <MdStar
                      aria-hidden="true"
                      className={[
                        'text-4xl transition-colors rounded-xs',
                        star <= rating ? 'text-accent-400' : 'text-ink-300',
                        'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand-500'
                      ].join(' ')}
                    />
                  </label>
                ))}
              </div>
              {rating > 0 && (
                <p aria-live="polite" className="text-center text-sm text-ink-600 mt-3">
                  Elegiste {rating} de 5
                </p>
              )}
            </fieldset>

            <Field label="Comentarios" hint="Opcional. Cuéntanos qué estuvo bien o qué se puede mejorar.">
              {(p) => (
                <textarea
                  {...p}
                  rows={3}
                  value={evalComments}
                  onChange={(e) => setEvalComments(e.target.value)}
                />
              )}
            </Field>
          </div>
        )}
      </Modal>

      {/* ------------------------------------------------------------------ */}
      {/* Asistente                                                           */}
      {/* ------------------------------------------------------------------ */}
      <Modal
        open={activeModal === 'IA'}
        onClose={() => setActiveModal(null)}
        size="md"
        icon={<MdSmartToy />}
        title="Consultar dudas"
        subtitle="Recomendaciones generales de salud y bienestar"
      >
        <div className="flex flex-col gap-4">
          <p className="rounded-md border border-ink-200 bg-white px-4 py-3 text-sm text-ink-600 measure">
            Esto no reemplaza a tu médico. Si sientes algo urgente, llama a tu
            profesional o acude al hospital.
          </p>

          <div
            aria-live="polite"
            className="min-h-40 rounded-md border border-ink-200 bg-white p-4"
          >
            {isLoadingAi ? (
              <div className="space-y-2.5">
                <Skeleton className="h-3.5 w-full" />
                <Skeleton className="h-3.5 w-11/12" />
                <Skeleton className="h-3.5 w-4/5" />
              </div>
            ) : aiResponse ? (
              <p className="text-base text-ink-800 whitespace-pre-wrap leading-relaxed measure">
                {aiResponse}
              </p>
            ) : (
              <p className="text-sm text-ink-500">
                Escribe tu pregunta abajo. Por ejemplo: «¿qué alimentos son buenos
                para la hipertensión?».
              </p>
            )}
          </div>

          <form onSubmit={handleAskAI} className="flex flex-col sm:flex-row gap-3">
            <Field label="Tu pregunta" className="flex-1">
              {(p) => (
                <input
                  {...p}
                  type="text"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="Escribe tu consulta…"
                />
              )}
            </Field>
            <Button
              type="submit"
              variant="primary"
              size="lg"
              icon={<MdSend />}
              loading={isLoadingAi}
              className="sm:self-end sm:mb-0.5"
            >
              Consultar
            </Button>
          </form>
        </div>
      </Modal>
    </div>
  );
}
