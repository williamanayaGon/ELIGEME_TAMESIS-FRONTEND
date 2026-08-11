import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
  MdInsights, MdFolderOpen, MdTrendingUp, MdDownload, MdAdd, MdClose,
  MdWarning, MdCheckCircle, MdInfoOutline, MdPictureAsPdf, MdUploadFile
} from 'react-icons/md';

import { apiFetch, apiDownload } from '../lib/api';

const PESTANAS = [
  { id: 'INDICADORES', label: 'Indicadores', icono: <MdInsights /> },
  { id: 'EVIDENCIAS', label: 'Evidencias', icono: <MdFolderOpen /> },
  { id: 'PLAN', label: 'Plan de Mejora', icono: <MdTrendingUp /> }
];

const hoy = () => new Date().toISOString().slice(0, 10);
const inicioAno = () => `${new Date().getFullYear()}-01-01`;
const fmt = (d) => d ? new Date(d).toLocaleDateString('es-CO') : '—';

const money = (n) => new Intl.NumberFormat('es-CO', {
  style: 'currency', currency: 'COP', maximumFractionDigits: 0
}).format(Number(n) || 0);

// Presenta el valor tal como debe leerse. Un indicador sin datos dice
// "Sin registrar": un cero afirmaría que algo no ocurrió.
const valorLegible = (ind) => {
  if (ind.sinDatos || ind.valor === null) return 'Sin registrar';
  if (ind.unidad === 'COP') return money(ind.valor);
  if (ind.unidad === '%') return `${ind.valor}%`;
  if (ind.unidad === 'de 5') return `${ind.valor} de 5`;
  return `${ind.valor} ${ind.unidad}`;
};

export default function EvidenciaFurag({ user }) {
  const [pestana, setPestana] = useState('INDICADORES');
  const [periodo, setPeriodo] = useState({ desde: inicioAno(), hasta: hoy() });

  const [catalogo, setCatalogo] = useState(null);
  const [evidencias, setEvidencias] = useState([]);
  const [plan, setPlan] = useState({ acciones: [], resumen: {} });
  const [alertas, setAlertas] = useState(null);
  const [cargando, setCargando] = useState(true);

  const [generando, setGenerando] = useState(null);   // indicador en curso
  const [modalCarga, setModalCarga] = useState(false);
  const [modalAccion, setModalAccion] = useState(false);

  // ---------------------------------------------------------------
  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const qs = `?desde=${periodo.desde}&hasta=${periodo.hasta}`;
      const [rc, re, rp, ra] = await Promise.all([
        apiFetch(`/api/furag/indicadores${qs}`),
        apiFetch('/api/furag/evidence'),
        apiFetch('/api/furag/actions'),
        apiFetch('/api/furag/alerts')
      ]);
      if (rc.ok) setCatalogo(await rc.json());
      if (re.ok) setEvidencias(await re.json());
      if (rp.ok) setPlan(await rp.json());
      if (ra.ok) setAlertas(await ra.json());
    } catch {
      toast.error('Error de conexión');
    } finally {
      setCargando(false);
    }
  }, [periodo]);

  useEffect(() => { cargar(); }, [cargar]);

  // ---------------------------------------------------------------
  const generarEvidencia = async (indicador, politica) => {
    setGenerando(indicador.id);
    try {
      const res = await apiFetch('/api/furag/evidence/generar', {
        method: 'POST',
        body: JSON.stringify({
          indicadorId: indicador.id,
          politica,
          desde: periodo.desde,
          hasta: periodo.hasta,
          responsable: user?.fullName || '',
          dependencia: 'Secretaría de Salud'
        })
      });
      const data = await res.json();
      if (!res.ok) return toast.error(data.error || 'No se pudo generar');

      toast.success(
        data.valorGenerado?.sinDatos
          ? 'Evidencia generada. Queda registrada como "Sin registrar" para el periodo.'
          : 'Evidencia generada'
      );
      cargar();
      setPestana('EVIDENCIAS');
    } catch {
      toast.error('Error de conexión');
    } finally {
      setGenerando(null);
    }
  };

  const descargar = async (path, nombre) => {
    try { await apiDownload(path, nombre); }
    catch (e) { toast.error(e.message); }
  };

  const actualizarAvance = async (accion, avance) => {
    const res = await apiFetch(`/api/furag/actions/${accion.id}`, {
      method: 'PUT', body: JSON.stringify({ avance })
    });
    if (!res.ok) return toast.error('No se pudo actualizar el avance');
    cargar();
  };

  // ===============================================================
  return (
    <div className="animate-fade space-y-5">
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Evidencia FURAG</h2>
          <p className="text-sm text-gray-500 max-w-2xl">
            Organiza la actividad real del programa como soporte documental para MIPG.
          </p>
        </div>
        <button
          onClick={() => descargar(
            `/api/furag/executive-report?desde=${periodo.desde}&hasta=${periodo.hasta}`,
            'soporte-gestion.pdf'
          )}
          className="bg-blue-900 text-white px-5 py-2.5 rounded-lg font-bold hover:bg-blue-800 transition flex items-center gap-2 shadow-sm">
          <MdDownload className="text-xl" /> Consolidado del periodo
        </button>
      </div>

      {/* Advertencia de alcance: lo primero que debe leerse */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
        <MdInfoOutline className="text-amber-600 text-xl shrink-0 mt-0.5" />
        <div className="text-sm text-amber-900">
          <p className="font-bold">Soporte de gestión, no reporte oficial.</p>
          <p className="text-amber-800 mt-0.5">
            Este módulo no calcula el Índice de Desempeño Institucional ni puntajes por política, y
            no sustituye el diligenciamiento del formulario ante el Departamento Administrativo de la
            Función Pública. Entrega los soportes que respaldan lo que la entidad responda allí.
          </p>
        </div>
      </div>

      {/* Alertas: solo vencimientos por fecha */}
      {alertas?.total > 0 && (
        <div className="bg-risk-soft border border-risk-border rounded-lg p-4">
          <p className="font-bold text-gray-800 flex items-center gap-2">
            <MdWarning className="text-red-500" /> {alertas.total} asunto(s) por fecha
          </p>
          <ul className="text-sm text-gray-600 mt-2 space-y-1">
            {alertas.evidenciasVencidas.length > 0 && (
              <li>• {alertas.evidenciasVencidas.length} evidencia(s) con vigencia expirada</li>
            )}
            {alertas.evidenciasPorVencer.length > 0 && (
              <li>• {alertas.evidenciasPorVencer.length} evidencia(s) vencen en los próximos {alertas.diasAviso} días</li>
            )}
            {alertas.accionesAtrasadas.length > 0 && (
              <li>• {alertas.accionesAtrasadas.length} acción(es) con fecha objetivo pasada y avance menor a 100%</li>
            )}
          </ul>
        </div>
      )}

      {/* Periodo */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 flex flex-wrap gap-3 items-end">
        <div>
          <label className="text-xs font-bold text-gray-500 uppercase">Periodo desde</label>
          <input type="date" value={periodo.desde}
            onChange={e => setPeriodo({ ...periodo, desde: e.target.value })}
            className="block p-2 border border-gray-300 rounded-lg mt-1" />
        </div>
        <div>
          <label className="text-xs font-bold text-gray-500 uppercase">Hasta</label>
          <input type="date" value={periodo.hasta}
            onChange={e => setPeriodo({ ...periodo, hasta: e.target.value })}
            className="block p-2 border border-gray-300 rounded-lg mt-1" />
        </div>
        <p className="text-xs text-gray-500 pb-2">Aplica a los indicadores y al consolidado.</p>
      </div>

      {/* Pestañas */}
      <div className="border-b border-gray-200 flex gap-6">
        {PESTANAS.map(p => (
          <button key={p.id} onClick={() => setPestana(p.id)}
            className={`pb-3 px-1 font-bold text-sm flex items-center gap-2 border-b-2 transition ${
              pestana === p.id
                ? 'border-blue-700 text-blue-800'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}>
            {p.icono} {p.label}
            {p.id === 'EVIDENCIAS' && evidencias.length > 0 && (
              <span className="bg-gray-100 text-gray-600 px-1.5 rounded text-xs">{evidencias.length}</span>
            )}
            {p.id === 'PLAN' && plan.acciones?.length > 0 && (
              <span className="bg-gray-100 text-gray-600 px-1.5 rounded text-xs">{plan.acciones.length}</span>
            )}
          </button>
        ))}
      </div>

      {cargando && <p className="text-center py-12 text-ink-500">Cargando…</p>}

      {/* ---------------- INDICADORES ---------------- */}
      {!cargando && pestana === 'INDICADORES' && catalogo && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {catalogo.indicadores.map(ind => (
            <div key={ind.id}
              className={`bg-white rounded-xl border p-5 flex flex-col justify-between ${
                ind.sinDatos ? 'border-gray-200' : 'border-gray-200 shadow-sm'
              }`}>
              <div>
                <div className="flex justify-between items-start gap-3">
                  <h3 className="font-bold text-gray-800">{ind.nombre}</h3>
                  {ind.sinDatos
                    ? <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded-full whitespace-nowrap">Sin registrar</span>
                    : <MdCheckCircle className="text-green-500 text-xl shrink-0" />}
                </div>

                <p className={`text-3xl font-bold mt-2 ${ind.sinDatos ? 'text-ink-500 italic' : 'text-ink-900'}`}>
                  {valorLegible(ind)}
                </p>

                {ind.nota && (
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded p-2 mt-2">
                    {ind.nota}
                  </p>
                )}

                {/* La fórmula visible es lo que hace auditable el número */}
                <p className="text-xs text-gray-500 mt-3 leading-relaxed">
                  <span className="font-bold uppercase text-ink-500">Fórmula: </span>
                  {ind.formula}
                </p>

                {ind.detalle && typeof ind.detalle === 'object' && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {Object.entries(ind.detalle)
                      .filter(([, v]) => v !== null && typeof v !== 'object')
                      .map(([k, v]) => (
                        <span key={k} className="text-xs bg-gray-50 border border-gray-200 rounded px-2 py-0.5 text-gray-600">
                          {k}: <strong>{String(v)}</strong>
                        </span>
                      ))}
                  </div>
                )}

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {ind.politicasRelacionadas.map(p => (
                    <span key={p} className="text-xs bg-blue-50 text-blue-800 border border-blue-100 rounded-full px-2 py-0.5">
                      {p}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-gray-100 flex flex-wrap gap-2">
                {ind.politicasRelacionadas.map(p => (
                  <button key={p} disabled={generando === ind.id}
                    onClick={() => generarEvidencia(ind, p)}
                    className="text-xs font-bold text-blue-700 border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition disabled:opacity-50">
                    {generando === ind.id ? 'Generando…' : `Generar evidencia · ${p.split(' ')[0]}`}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ---------------- EVIDENCIAS ---------------- */}
      {!cargando && pestana === 'EVIDENCIAS' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setModalCarga(true)}
              className="border border-gray-300 px-4 py-2 rounded-lg font-bold text-sm hover:bg-gray-50 transition flex items-center gap-2">
              <MdUploadFile /> Cargar evidencia externa
            </button>
          </div>

          {evidencias.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 text-center py-14">
              <MdFolderOpen className="text-5xl text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Todavía no hay evidencias registradas.</p>
              <p className="text-sm text-ink-500 mt-1">
                Genéralas desde la pestaña Indicadores o carga un documento externo.
              </p>
            </div>
          ) : (
            Object.entries(
              evidencias.reduce((acc, e) => {
                (acc[e.politica] = acc[e.politica] || []).push(e);
                return acc;
              }, {})
            ).map(([politica, lista]) => (
              <div key={politica} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <h3 className="font-bold text-gray-800 px-4 py-3 border-b bg-gray-50 text-sm">
                  {politica} <span className="text-ink-500 font-normal">({lista.length})</span>
                </h3>
                <div className="divide-y divide-gray-100">
                  {lista.map(ev => (
                    <div key={ev.id} className="p-4 flex flex-wrap justify-between items-start gap-3 hover:bg-gray-50">
                      <div className="min-w-0">
                        <p className="font-medium text-gray-800 flex items-center gap-2 flex-wrap">
                          {ev.nombre}
                          <span className={`text-xs px-2 py-0.5 rounded-full border font-bold ${
                            ev.origen === 'GENERADA'
                              ? 'bg-brand-50 text-brand-700 border-brand-200'
                              : 'bg-gray-100 text-gray-600 border-gray-200'
                          }`}>{ev.origen}</span>
                          {ev.vencida && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 font-bold">Vigencia expirada</span>
                          )}
                          {ev.porVencer && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-bold">Por vencer</span>
                          )}
                        </p>
                        {ev.valorGenerado && (
                          <p className="text-sm text-gray-700 mt-0.5">
                            Valor:{' '}
                            <strong className={ev.valorGenerado.sinDatos ? 'text-ink-500' : 'text-brand-700'}>
                              {valorLegible({ ...ev.valorGenerado })}
                            </strong>
                          </p>
                        )}
                        <p className="text-xs text-gray-500 mt-0.5">
                          {ev.periodoInicio && `${fmt(ev.periodoInicio)} – ${fmt(ev.periodoFin)} · `}
                          Documento {fmt(ev.fechaDocumento)}
                          {ev.vigenteHasta && ` · vigente hasta ${fmt(ev.vigenteHasta)}`}
                        </p>
                      </div>
                      <button onClick={() => descargar(`/api/furag/evidence/${ev.id}/pdf`, `evidencia-${ev.id}.pdf`)}
                        className="border border-gray-300 px-3 py-1.5 rounded-lg font-bold text-xs hover:bg-white transition flex items-center gap-1.5 shrink-0">
                        <MdPictureAsPdf className="text-red-600" /> PDF
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ---------------- PLAN DE MEJORA ---------------- */}
      {!cargando && pestana === 'PLAN' && (
        <div className="space-y-4">
          <div className="flex flex-wrap justify-between items-center gap-3">
            {plan.resumen?.total > 0 && (
              <div className="flex gap-5 text-sm">
                <span className="text-gray-600">Acciones: <strong>{plan.resumen.total}</strong></span>
                <span className="text-red-600">Vencidas: <strong>{plan.resumen.vencidas}</strong></span>
                <span className="text-green-700">Completadas: <strong>{plan.resumen.completadas}</strong></span>
                <span className="text-gray-600">Avance del plan: <strong>{plan.resumen.avancePlan}%</strong></span>
              </div>
            )}
            <button onClick={() => setModalAccion(true)}
              className="bg-blue-900 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-blue-800 transition flex items-center gap-2 ml-auto">
              <MdAdd /> Nueva acción
            </button>
          </div>

          {plan.acciones?.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 text-center py-14">
              <MdTrendingUp className="text-5xl text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Sin acciones de mejora registradas.</p>
              <p className="text-sm text-ink-500 mt-1 max-w-md mx-auto">
                El sistema no infiere brechas: las describe quien conoce el proceso.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                  <tr>
                    <th className="text-left px-4 py-3 font-bold">Acción / brecha</th>
                    <th className="text-left px-4 py-3 font-bold">Política</th>
                    <th className="text-left px-4 py-3 font-bold">Responsable</th>
                    <th className="text-center px-4 py-3 font-bold">Objetivo</th>
                    <th className="text-left px-4 py-3 font-bold w-44">Avance</th>
                    <th className="text-center px-4 py-3 font-bold">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {plan.acciones.map(a => (
                    <tr key={a.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-800">{a.accion}</p>
                        <p className="text-xs text-gray-500">Brecha: {a.brecha}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs">{a.politica}</td>
                      <td className="px-4 py-3 text-gray-600 text-xs">
                        {a.responsable}<br /><span className="text-ink-500">{a.dependencia}</span>
                      </td>
                      <td className="px-4 py-3 text-center text-xs text-gray-600">{fmt(a.fechaObjetivo)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <input type="range" min="0" max="100" step="5" value={a.avance}
                            onChange={e => actualizarAvance(a, Number(e.target.value))}
                            className="w-24 accent-brand-600" />
                          <span className="text-xs font-bold text-gray-700 w-9">{a.avance}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold border ${
                          a.estado === 'VENCIDA' ? 'bg-red-50 text-red-700 border-red-200' :
                          a.estado === 'COMPLETADA' ? 'bg-green-50 text-green-700 border-green-200' :
                          a.estado === 'EN_CURSO' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          'bg-gray-100 text-gray-600 border-gray-200'
                        }`}>{a.estado}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {modalCarga && (
        <ModalCargarEvidencia
          politicas={catalogo?.politicas ?? []}
          onClose={() => setModalCarga(false)}
          onGuardado={() => { setModalCarga(false); cargar(); }}
        />
      )}

      {modalAccion && (
        <ModalNuevaAccion
          politicas={catalogo?.politicas ?? []}
          onClose={() => setModalAccion(false)}
          onGuardado={() => { setModalAccion(false); cargar(); }}
        />
      )}
    </div>
  );
}

// =================================================================

function ModalCargarEvidencia({ politicas, onClose, onGuardado }) {
  const [d, setD] = useState({
    politica: politicas[0] || '', nombre: '', descripcion: '',
    responsable: '', dependencia: '', fechaDocumento: hoy(), vigenteHasta: '', observaciones: ''
  });
  const [archivo, setArchivo] = useState(null);
  const [guardando, setGuardando] = useState(false);

  const guardar = async (e) => {
    e.preventDefault();
    setGuardando(true);
    try {
      const fd = new FormData();
      Object.entries(d).forEach(([k, v]) => v && fd.append(k, v));
      if (archivo) fd.append('archivo', archivo);

      const res = await apiFetch('/api/furag/evidence', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) return toast.error(data.error || 'No se pudo registrar');
      toast.success('Evidencia registrada');
      onGuardado();
    } catch {
      toast.error('Error de conexión');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <form onSubmit={guardar} className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="bg-blue-900 text-white px-6 py-4 flex justify-between items-center sticky top-0">
          <h3 className="font-bold text-lg">Cargar evidencia externa</h3>
          <button type="button" onClick={onClose} className="text-white/70 hover:text-white text-2xl"><MdClose /></button>
        </div>

        <div className="p-6 space-y-3">
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase">Política MIPG *</label>
            <select required value={d.politica} onChange={e => setD({ ...d, politica: e.target.value })}
              className="w-full p-2.5 border border-gray-300 rounded-lg bg-white mt-1">
              {politicas.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase">Nombre del documento *</label>
            <input required value={d.nombre} onChange={e => setD({ ...d, nombre: e.target.value })}
              className="w-full p-2.5 border border-gray-300 rounded-lg mt-1" />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase">Descripción</label>
            <textarea rows="2" value={d.descripcion} onChange={e => setD({ ...d, descripcion: e.target.value })}
              className="w-full p-2.5 border border-gray-300 rounded-lg mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Responsable</label>
              <input value={d.responsable} onChange={e => setD({ ...d, responsable: e.target.value })}
                className="w-full p-2.5 border border-gray-300 rounded-lg mt-1" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Dependencia</label>
              <input value={d.dependencia} onChange={e => setD({ ...d, dependencia: e.target.value })}
                className="w-full p-2.5 border border-gray-300 rounded-lg mt-1" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Fecha del documento</label>
              <input type="date" value={d.fechaDocumento} onChange={e => setD({ ...d, fechaDocumento: e.target.value })}
                className="w-full p-2.5 border border-gray-300 rounded-lg mt-1" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Vigente hasta</label>
              <input type="date" value={d.vigenteHasta} onChange={e => setD({ ...d, vigenteHasta: e.target.value })}
                className="w-full p-2.5 border border-gray-300 rounded-lg mt-1" />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase">Archivo (PDF, JPG o PNG)</label>
            <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e => setArchivo(e.target.files?.[0])}
              className="w-full text-sm mt-1 file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 cursor-pointer" />
          </div>
        </div>

        <div className="px-6 py-4 border-t flex justify-end gap-2 sticky bottom-0 bg-white">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg font-bold text-gray-600 hover:bg-gray-100">Cancelar</button>
          <button type="submit" disabled={guardando}
            className="bg-blue-900 text-white px-5 py-2 rounded-lg font-bold hover:bg-blue-800 disabled:bg-gray-400">
            {guardando ? 'Guardando…' : 'Registrar'}
          </button>
        </div>
      </form>
    </div>
  );
}

function ModalNuevaAccion({ politicas, onClose, onGuardado }) {
  const [d, setD] = useState({
    politica: politicas[0] || '', brecha: '', accion: '',
    responsable: '', dependencia: '', fechaInicio: hoy(), fechaObjetivo: '', avance: 0
  });
  const [guardando, setGuardando] = useState(false);

  const guardar = async (e) => {
    e.preventDefault();
    setGuardando(true);
    try {
      const res = await apiFetch('/api/furag/actions', { method: 'POST', body: JSON.stringify(d) });
      const data = await res.json();
      if (!res.ok) return toast.error(data.error || 'No se pudo crear');
      toast.success('Acción registrada');
      onGuardado();
    } catch {
      toast.error('Error de conexión');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <form onSubmit={guardar} className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="bg-blue-900 text-white px-6 py-4 flex justify-between items-center sticky top-0">
          <h3 className="font-bold text-lg">Nueva acción de mejora</h3>
          <button type="button" onClick={onClose} className="text-white/70 hover:text-white text-2xl"><MdClose /></button>
        </div>

        <div className="p-6 space-y-3">
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase">Política MIPG *</label>
            <select required value={d.politica} onChange={e => setD({ ...d, politica: e.target.value })}
              className="w-full p-2.5 border border-gray-300 rounded-lg bg-white mt-1">
              {politicas.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase">Brecha identificada *</label>
            <textarea required rows="2" value={d.brecha} onChange={e => setD({ ...d, brecha: e.target.value })}
              className="w-full p-2.5 border border-gray-300 rounded-lg mt-1"
              placeholder="Qué está faltando, en tus palabras" />
            <p className="text-xs text-gray-500 mt-1">La describe quien conoce el proceso; el sistema no la infiere.</p>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase">Acción a ejecutar *</label>
            <textarea required rows="2" value={d.accion} onChange={e => setD({ ...d, accion: e.target.value })}
              className="w-full p-2.5 border border-gray-300 rounded-lg mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Responsable *</label>
              <input required value={d.responsable} onChange={e => setD({ ...d, responsable: e.target.value })}
                className="w-full p-2.5 border border-gray-300 rounded-lg mt-1" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Dependencia *</label>
              <input required value={d.dependencia} onChange={e => setD({ ...d, dependencia: e.target.value })}
                className="w-full p-2.5 border border-gray-300 rounded-lg mt-1" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Fecha de inicio</label>
              <input type="date" value={d.fechaInicio} onChange={e => setD({ ...d, fechaInicio: e.target.value })}
                className="w-full p-2.5 border border-gray-300 rounded-lg mt-1" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Fecha objetivo *</label>
              <input type="date" required value={d.fechaObjetivo} onChange={e => setD({ ...d, fechaObjetivo: e.target.value })}
                className="w-full p-2.5 border border-gray-300 rounded-lg mt-1" />
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t flex justify-end gap-2 sticky bottom-0 bg-white">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg font-bold text-gray-600 hover:bg-gray-100">Cancelar</button>
          <button type="submit" disabled={guardando}
            className="bg-blue-900 text-white px-5 py-2 rounded-lg font-bold hover:bg-blue-800 disabled:bg-gray-400">
            {guardando ? 'Guardando…' : 'Registrar acción'}
          </button>
        </div>
      </form>
    </div>
  );
}
