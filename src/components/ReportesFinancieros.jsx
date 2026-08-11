import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList
} from 'recharts';
import {
  MdAdd, MdArrowBack, MdClose, MdDelete, MdDownload, MdSend, MdEdit,
  MdUploadFile, MdDescription, MdPictureAsPdf, MdTableChart, MdLock
} from 'react-icons/md';

import { apiFetch, apiDownload } from '../lib/api';

// Etiquetas legibles de los tipos que define el backend.
const TIPOS = [
  { valor: 'GENERAL', label: 'Ejecución presupuestal' },
  { valor: 'TRASLADOS', label: 'Traslados' },
  { valor: 'MEDICAMENTOS', label: 'Medicamentos' },
  { valor: 'INSUMOS', label: 'Insumos' },
  { valor: 'TALENTO_HUMANO', label: 'Talento humano' },
  { valor: 'AYUDAS_TECNICAS', label: 'Ayudas técnicas' },
  { valor: 'URGENCIAS', label: 'Urgencias' }
];

const ESTADOS = ['BORRADOR', 'ENVIADO', 'APROBADO', 'OBJETADO'];

const COLOR_ESTADO = {
  BORRADOR: 'bg-gray-100 text-gray-700 border-gray-200',
  ENVIADO: 'bg-blue-50 text-blue-700 border-blue-200',
  APROBADO: 'bg-green-50 text-green-700 border-green-200',
  OBJETADO: 'bg-red-50 text-red-700 border-red-200'
};

// Un solo tono: la gráfica lleva una sola serie, así que el color codifica
// magnitud, no identidad. Validado para contraste sobre fondo claro.
const AZUL = '#2a4396'; // brand-600

const money = (n) => new Intl.NumberFormat('es-CO', {
  style: 'currency', currency: 'COP', maximumFractionDigits: 0
}).format(Number(n) || 0);

const etiquetaTipo = (v) => TIPOS.find(t => t.valor === v)?.label ?? v;
const hoy = () => new Date().toISOString().slice(0, 10);

const lineaVacia = () => ({
  concepto: '', descripcion: '', cantidad: 1, valorUnitario: '', fechaEvento: '', metadata: {}
});

const formularioVacio = (user) => ({
  reportType: 'GENERAL',
  periodoInicio: hoy(),
  periodoFin: hoy(),
  responsible: user?.fullName || '',
  totalBudget: '',
  generalObs: '',
  elaboratedBy: '',
  reviewedBy: '',
  items: [lineaVacia()]
});

export default function ReportesFinancieros({ user }) {
  const [vista, setVista] = useState('LISTA');   // LISTA | FORMULARIO | DETALLE
  const [reportes, setReportes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const [filtros, setFiltros] = useState({ tipo: '', estado: '', desde: '', hasta: '' });

  const [form, setForm] = useState(formularioVacio(user));
  const [editandoId, setEditandoId] = useState(null);
  const [columnas, setColumnas] = useState([]);   // columnas propias del tipo
  const [detalle, setDetalle] = useState(null);

  // ---------------------------------------------------------------
  // CARGA
  // ---------------------------------------------------------------
  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const qs = new URLSearchParams(
        Object.entries(filtros).filter(([, v]) => v)
      ).toString();

      const res = await apiFetch(`/api/financial-reports${qs ? `?${qs}` : ''}`);
      if (res.ok) setReportes(await res.json());
      else toast.error('No se pudieron cargar los reportes');
    } catch {
      toast.error('Error de conexión');
    } finally {
      setCargando(false);
    }
  }, [filtros]);

  useEffect(() => { cargar(); }, [cargar]);

  // Las columnas del formulario las define el backend, para que plantilla,
  // importación y formulario no se desincronicen.
  useEffect(() => {
    let vigente = true;
    apiFetch(`/api/financial-reports/plantilla/${form.reportType}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!vigente || !d) return;
        // Las 5 primeras son las comunes; aquí solo interesan las del tipo.
        setColumnas(d.columnas.slice(5));
      })
      .catch(() => { /* el formulario sigue usable sin columnas extra */ });
    return () => { vigente = false; };
  }, [form.reportType]);

  // ---------------------------------------------------------------
  // TOTALES EN VIVO
  // ---------------------------------------------------------------
  const totalLinea = (l) => (Number(l.cantidad) || 0) * (Number(l.valorUnitario) || 0);
  const totalEjecutado = form.items.reduce((a, l) => a + totalLinea(l), 0);
  const saldo = (Number(form.totalBudget) || 0) - totalEjecutado;

  // ---------------------------------------------------------------
  // EDICIÓN DE LÍNEAS
  // ---------------------------------------------------------------
  const cambiarLinea = (idx, campo, valor) => {
    setForm(f => {
      const items = [...f.items];
      items[idx] = { ...items[idx], [campo]: valor };
      return { ...f, items };
    });
  };

  const cambiarMeta = (idx, key, valor) => {
    setForm(f => {
      const items = [...f.items];
      items[idx] = { ...items[idx], metadata: { ...items[idx].metadata, [key]: valor } };
      return { ...f, items };
    });
  };

  const agregarLinea = () => setForm(f => ({ ...f, items: [...f.items, lineaVacia()] }));

  const quitarLinea = (idx) => setForm(f => ({
    ...f,
    items: f.items.length === 1 ? [lineaVacia()] : f.items.filter((_, i) => i !== idx)
  }));

  // ---------------------------------------------------------------
  // ACCIONES
  // ---------------------------------------------------------------
  const abrirNuevo = () => {
    setForm(formularioVacio(user));
    setEditandoId(null);
    setVista('FORMULARIO');
  };

  const abrirEdicion = async (id) => {
    const res = await apiFetch(`/api/financial-reports/${id}`);
    if (!res.ok) return toast.error('No se pudo cargar el reporte');
    const r = await res.json();

    setForm({
      reportType: r.reportType,
      periodoInicio: r.periodoInicio?.slice(0, 10) || hoy(),
      periodoFin: r.periodoFin?.slice(0, 10) || hoy(),
      responsible: r.responsible || '',
      totalBudget: r.totalBudget || '',
      generalObs: r.generalObs || '',
      elaboratedBy: r.elaboratedBy || '',
      reviewedBy: r.reviewedBy || '',
      items: r.items.length ? r.items.map(i => ({
        concepto: i.concepto,
        descripcion: i.descripcion || '',
        cantidad: i.cantidad,
        valorUnitario: i.valorUnitario,
        fechaEvento: i.fechaEvento?.slice(0, 10) || '',
        metadata: i.metadata || {}
      })) : [lineaVacia()]
    });
    setEditandoId(id);
    setVista('FORMULARIO');
  };

  const abrirDetalle = async (id) => {
    const res = await apiFetch(`/api/financial-reports/${id}`);
    if (!res.ok) return toast.error('No se pudo cargar el reporte');
    setDetalle(await res.json());
    setVista('DETALLE');
  };

  const guardar = async (e) => {
    e.preventDefault();

    if (form.items.every(l => !l.concepto.trim())) {
      return toast.error('Agrega al menos una línea con concepto');
    }
    if (new Date(form.periodoFin) < new Date(form.periodoInicio)) {
      return toast.error('El periodo termina antes de empezar');
    }

    setGuardando(true);
    try {
      const payload = {
        ...form,
        epsName: user?.fullName || '',
        items: form.items.filter(l => l.concepto.trim())
      };

      const res = await apiFetch(
        editandoId ? `/api/financial-reports/${editandoId}` : '/api/financial-reports',
        { method: editandoId ? 'PUT' : 'POST', body: JSON.stringify(payload) }
      );
      const data = await res.json();

      if (!res.ok) return toast.error(data.error || 'No se pudo guardar');

      toast.success(editandoId ? 'Reporte actualizado' : 'Reporte creado como borrador');
      await cargar();
      abrirDetalle(data.id);
    } catch {
      toast.error('Error de conexión');
    } finally {
      setGuardando(false);
    }
  };

  const enviar = async (id) => {
    if (!window.confirm(
      'Al enviarlo, el reporte queda congelado y ya no podrás editarlo. ' +
      'Para corregirlo tendrás que crear uno nuevo. ¿Continuar?'
    )) return;

    const res = await apiFetch(`/api/financial-reports/${id}/enviar`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) return toast.error(data.error || 'No se pudo enviar');

    toast.success('Reporte enviado. Ya no admite cambios.');
    setDetalle(data);
    cargar();
  };

  const exportar = async (id, formato) => {
    try {
      await apiDownload(`/api/financial-reports/${id}/export?formato=${formato}`, `reporte.${formato}`);
      toast.success(`Descarga en ${formato.toUpperCase()} lista`);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const descargarPlantilla = async () => {
    try {
      await apiDownload(
        `/api/financial-reports/plantilla/${form.reportType}?formato=xlsx`,
        `plantilla-${form.reportType.toLowerCase()}.xlsx`
      );
    } catch (err) {
      toast.error(err.message);
    }
  };

  const importar = async (archivo) => {
    if (!archivo) return;
    const fd = new FormData();
    fd.append('archivo', archivo);
    fd.append('tipo', form.reportType);

    const res = await apiFetch('/api/financial-reports/importar', { method: 'POST', body: fd });
    const data = await res.json();
    if (!res.ok) return toast.error(data.error || 'No se pudo leer el archivo');

    setForm(f => ({
      ...f,
      items: data.lineas.map(l => ({
        concepto: l.concepto,
        descripcion: l.descripcion || '',
        cantidad: l.cantidad,
        valorUnitario: l.valorUnitario,
        fechaEvento: l.fechaEvento?.slice(0, 10) || '',
        metadata: l.metadata || {}
      }))
    }));
    toast.success(data.mensaje);
  };

  // ===============================================================
  // VISTA: LISTA
  // ===============================================================
  if (vista === 'LISTA') {
    return (
      <div className="animate-fade space-y-5">
        <div className="flex flex-wrap justify-between items-center gap-3">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Reportes financieros</h2>
            <p className="text-sm text-gray-500">Ejecución del gasto por tipo, con soporte línea a línea.</p>
          </div>
          <button onClick={abrirNuevo}
            className="bg-blue-900 text-white px-5 py-2.5 rounded-lg font-bold hover:bg-blue-800 transition flex items-center gap-2 shadow-sm">
            <MdAdd className="text-xl" /> Nuevo reporte
          </button>
        </div>

        {/* Filtros, en una sola fila sobre la tabla */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[160px]">
            <label className="text-xs font-bold text-gray-500 uppercase">Tipo</label>
            <select value={filtros.tipo} onChange={e => setFiltros({ ...filtros, tipo: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded-lg bg-white mt-1">
              <option value="">Todos</option>
              {TIPOS.map(t => <option key={t.valor} value={t.valor}>{t.label}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="text-xs font-bold text-gray-500 uppercase">Estado</label>
            <select value={filtros.estado} onChange={e => setFiltros({ ...filtros, estado: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded-lg bg-white mt-1">
              <option value="">Todos</option>
              {ESTADOS.map(e2 => <option key={e2} value={e2}>{e2}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="text-xs font-bold text-gray-500 uppercase">Desde</label>
            <input type="date" value={filtros.desde} onChange={e => setFiltros({ ...filtros, desde: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded-lg mt-1" />
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="text-xs font-bold text-gray-500 uppercase">Hasta</label>
            <input type="date" value={filtros.hasta} onChange={e => setFiltros({ ...filtros, hasta: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded-lg mt-1" />
          </div>
          {Object.values(filtros).some(Boolean) && (
            <button onClick={() => setFiltros({ tipo: '', estado: '', desde: '', hasta: '' })}
              className="text-sm text-gray-500 hover:text-gray-800 underline pb-2">Limpiar</button>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {cargando ? (
            <p className="text-center py-14 text-gray-400">Cargando reportes…</p>
          ) : reportes.length === 0 ? (
            <div className="text-center py-14">
              <MdDescription className="text-5xl text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No hay reportes con esos criterios.</p>
              <button onClick={abrirNuevo} className="text-blue-600 font-bold text-sm mt-2 hover:underline">
                Crear el primero
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                  <tr>
                    <th className="text-left px-4 py-3 font-bold">Referencia</th>
                    <th className="text-left px-4 py-3 font-bold">Tipo</th>
                    <th className="text-left px-4 py-3 font-bold">Periodo</th>
                    <th className="text-center px-4 py-3 font-bold">Líneas</th>
                    <th className="text-right px-4 py-3 font-bold">Ejecutado</th>
                    <th className="text-center px-4 py-3 font-bold">Estado</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {reportes.map(r => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs font-bold text-gray-700">{r.reference}</td>
                      <td className="px-4 py-3">{etiquetaTipo(r.reportType)}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {new Date(r.periodoInicio).toLocaleDateString('es-CO')} –{' '}
                        {new Date(r.periodoFin).toLocaleDateString('es-CO')}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-700">{r.items?.length ?? 0}</td>
                      <td className="px-4 py-3 text-right font-bold text-gray-800">{money(r.totalExecuted)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold border ${COLOR_ESTADO[r.estado]}`}>
                          {r.estado}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <button onClick={() => abrirDetalle(r.id)}
                          className="text-blue-600 font-bold text-xs hover:underline">Ver</button>
                        {r.estado === 'BORRADOR' && (
                          <button onClick={() => abrirEdicion(r.id)}
                            className="text-gray-500 font-bold text-xs hover:underline ml-3">Editar</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ===============================================================
  // VISTA: FORMULARIO
  // ===============================================================
  if (vista === 'FORMULARIO') {
    return (
      <form onSubmit={guardar} className="animate-fade space-y-5">
        <button type="button" onClick={() => setVista('LISTA')}
          className="text-gray-500 hover:text-blue-600 flex items-center gap-1 font-medium">
          <MdArrowBack /> Volver a la lista
        </button>

        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
          <h2 className="text-xl font-bold text-gray-800 border-b pb-3">
            {editandoId ? 'Editar borrador' : 'Nuevo reporte financiero'}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <label className="text-xs font-bold text-gray-500 uppercase">Tipo de reporte *</label>
              <select value={form.reportType}
                onChange={e => setForm({ ...form, reportType: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg bg-white mt-1 font-medium">
                {TIPOS.map(t => <option key={t.valor} value={t.valor}>{t.label}</option>)}
              </select>
              <p className="text-xs text-gray-500 mt-1">Define qué columnas pide cada línea.</p>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Periodo desde *</label>
              <input type="date" required value={form.periodoInicio}
                onChange={e => setForm({ ...form, periodoInicio: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg mt-1" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Periodo hasta *</label>
              <input type="date" required value={form.periodoFin}
                onChange={e => setForm({ ...form, periodoFin: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg mt-1" />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-bold text-gray-500 uppercase">Responsable</label>
              <input value={form.responsible} onChange={e => setForm({ ...form, responsible: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg mt-1" />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-bold text-gray-500 uppercase">Presupuesto aprobado</label>
              <input type="number" min="0" value={form.totalBudget}
                onChange={e => setForm({ ...form, totalBudget: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg mt-1" placeholder="0" />
            </div>
          </div>
        </div>

        {/* Líneas de gasto */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex flex-wrap justify-between items-center gap-3 p-4 border-b bg-gray-50">
            <h3 className="font-bold text-gray-800">Líneas de gasto</h3>
            <div className="flex gap-2">
              <button type="button" onClick={descargarPlantilla}
                className="text-xs font-bold text-gray-600 border border-gray-300 px-3 py-2 rounded-lg hover:bg-gray-100 transition flex items-center gap-1">
                <MdDownload /> Plantilla
              </button>
              <label className="text-xs font-bold text-blue-700 border border-blue-200 bg-blue-50 px-3 py-2 rounded-lg hover:bg-blue-100 transition flex items-center gap-1 cursor-pointer">
                <MdUploadFile /> Importar CSV/XLSX
                <input type="file" accept=".csv,.xlsx" className="hidden"
                  onChange={e => { importar(e.target.files?.[0]); e.target.value = ''; }} />
              </label>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  <th className="text-left px-3 py-2 font-bold min-w-[160px]">Concepto *</th>
                  <th className="text-left px-3 py-2 font-bold min-w-[160px]">Descripción</th>
                  {columnas.map(c => (
                    <th key={c.key} className="text-left px-3 py-2 font-bold min-w-[130px]">{c.label}</th>
                  ))}
                  <th className="text-left px-3 py-2 font-bold w-24">Cant.</th>
                  <th className="text-left px-3 py-2 font-bold w-36">V. unitario</th>
                  <th className="text-left px-3 py-2 font-bold w-36">Fecha</th>
                  <th className="text-right px-3 py-2 font-bold w-36">Total</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {form.items.map((l, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/60">
                    <td className="px-2 py-1">
                      <input value={l.concepto} onChange={e => cambiarLinea(idx, 'concepto', e.target.value)}
                        className="w-full p-2 border border-gray-200 rounded focus:border-blue-400 outline-none" />
                    </td>
                    <td className="px-2 py-1">
                      <input value={l.descripcion} onChange={e => cambiarLinea(idx, 'descripcion', e.target.value)}
                        className="w-full p-2 border border-gray-200 rounded focus:border-blue-400 outline-none" />
                    </td>
                    {columnas.map(c => (
                      <td key={c.key} className="px-2 py-1">
                        <input
                          type={c.tipo === 'numero' ? 'number' : c.tipo === 'fecha' ? 'date' : 'text'}
                          value={l.metadata?.[c.key] ?? ''}
                          onChange={e => cambiarMeta(idx, c.key, e.target.value)}
                          className="w-full p-2 border border-gray-200 rounded focus:border-blue-400 outline-none" />
                      </td>
                    ))}
                    <td className="px-2 py-1">
                      <input type="number" min="0" step="0.01" value={l.cantidad}
                        onChange={e => cambiarLinea(idx, 'cantidad', e.target.value)}
                        className="w-full p-2 border border-gray-200 rounded focus:border-blue-400 outline-none" />
                    </td>
                    <td className="px-2 py-1">
                      <input type="number" min="0" step="0.01" value={l.valorUnitario}
                        onChange={e => cambiarLinea(idx, 'valorUnitario', e.target.value)}
                        className="w-full p-2 border border-gray-200 rounded focus:border-blue-400 outline-none" />
                    </td>
                    <td className="px-2 py-1">
                      <input type="date" value={l.fechaEvento}
                        onChange={e => cambiarLinea(idx, 'fechaEvento', e.target.value)}
                        className="w-full p-2 border border-gray-200 rounded focus:border-blue-400 outline-none" />
                    </td>
                    <td className="px-3 py-1 text-right font-bold text-gray-800 whitespace-nowrap">
                      {money(totalLinea(l))}
                    </td>
                    <td className="px-2 py-1 text-center">
                      <button type="button" onClick={() => quitarLinea(idx)}
                        className="text-gray-300 hover:text-red-500 transition" title="Quitar línea">
                        <MdDelete className="text-lg" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-4 border-t bg-gray-50 flex flex-wrap justify-between items-center gap-4">
            <button type="button" onClick={agregarLinea}
              className="text-blue-600 font-bold text-sm hover:underline flex items-center gap-1">
              <MdAdd /> Agregar línea
            </button>
            <div className="text-right space-y-0.5">
              <p className="text-sm text-gray-500">
                Presupuesto: <strong className="text-gray-700">{money(form.totalBudget)}</strong>
              </p>
              <p className="text-lg font-bold text-gray-900">
                Ejecutado: {money(totalEjecutado)}
              </p>
              <p className={`text-sm font-bold ${saldo < 0 ? 'text-red-600' : 'text-green-700'}`}>
                Saldo: {money(saldo)}
                {saldo < 0 && ' — supera el presupuesto'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="text-xs font-bold text-gray-500 uppercase">Observaciones</label>
            <textarea rows="2" value={form.generalObs}
              onChange={e => setForm({ ...form, generalObs: e.target.value })}
              className="w-full p-3 border border-gray-300 rounded-lg mt-1" />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase">Elaboró</label>
            <input value={form.elaboratedBy} onChange={e => setForm({ ...form, elaboratedBy: e.target.value })}
              className="w-full p-3 border border-gray-300 rounded-lg mt-1" />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase">Revisó</label>
            <input value={form.reviewedBy} onChange={e => setForm({ ...form, reviewedBy: e.target.value })}
              className="w-full p-3 border border-gray-300 rounded-lg mt-1" />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => setVista('LISTA')}
            className="px-5 py-3 rounded-lg font-bold text-gray-600 hover:bg-gray-100 transition">
            Cancelar
          </button>
          <button type="submit" disabled={guardando}
            className="bg-blue-900 text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-800 transition disabled:bg-gray-400 shadow-sm">
            {guardando ? 'Guardando…' : editandoId ? 'Guardar cambios' : 'Guardar borrador'}
          </button>
        </div>
      </form>
    );
  }

  // ===============================================================
  // VISTA: DETALLE
  // ===============================================================
  if (vista === 'DETALLE' && detalle) {
    const total = detalle.totalCalculado || 0;
    const extra = columnasDelDetalle(detalle);

    // Composición del gasto: se agrupa por concepto y se ordena por monto.
    // Barras horizontales en vez de un pastel: con muchos conceptos el pastel
    // deja de ser legible y no permite comparar magnitudes.
    const porConcepto = Object.values(
      detalle.items.reduce((acc, i) => {
        acc[i.concepto] = acc[i.concepto] || { concepto: i.concepto, valor: 0 };
        acc[i.concepto].valor += Number(i.valorTotal);
        return acc;
      }, {})
    ).sort((a, b) => b.valor - a.valor);

    const grafico = porConcepto.slice(0, 8).map(x => ({
      ...x,
      etiqueta: x.concepto.length > 26 ? `${x.concepto.slice(0, 24)}…` : x.concepto,
      porcentaje: total > 0 ? Math.round((x.valor / total) * 100) : 0
    }));

    const bloqueado = detalle.estado !== 'BORRADOR';

    return (
      <div className="animate-fade space-y-5">
        <button onClick={() => { setVista('LISTA'); cargar(); }}
          className="text-gray-500 hover:text-blue-600 flex items-center gap-1 font-medium">
          <MdArrowBack /> Volver a la lista
        </button>

        {/* Encabezado */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex flex-wrap justify-between items-start gap-4">
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-2xl font-bold text-gray-800">{etiquetaTipo(detalle.reportType)}</h2>
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${COLOR_ESTADO[detalle.estado]}`}>
                  {detalle.estado}
                </span>
                {bloqueado && (
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <MdLock /> congelado, ya no admite cambios
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-1 font-mono">{detalle.reference}</p>
              <p className="text-sm text-gray-500">
                {new Date(detalle.periodoInicio).toLocaleDateString('es-CO')} –{' '}
                {new Date(detalle.periodoFin).toLocaleDateString('es-CO')}
                {detalle.responsible && ` · ${detalle.responsible}`}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button onClick={() => exportar(detalle.id, 'pdf')}
                className="border border-gray-300 px-4 py-2 rounded-lg font-bold text-sm hover:bg-gray-50 transition flex items-center gap-1.5">
                <MdPictureAsPdf className="text-red-600" /> PDF
              </button>
              <button onClick={() => exportar(detalle.id, 'xlsx')}
                className="border border-gray-300 px-4 py-2 rounded-lg font-bold text-sm hover:bg-gray-50 transition flex items-center gap-1.5">
                <MdTableChart className="text-green-700" /> Excel
              </button>
              {!bloqueado && (
                <>
                  <button onClick={() => abrirEdicion(detalle.id)}
                    className="border border-gray-300 px-4 py-2 rounded-lg font-bold text-sm hover:bg-gray-50 transition flex items-center gap-1.5">
                    <MdEdit /> Editar
                  </button>
                  <button onClick={() => enviar(detalle.id)}
                    className="bg-blue-900 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-blue-800 transition flex items-center gap-1.5 shadow-sm">
                    <MdSend /> Enviar
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-gray-200 mt-6 rounded-lg overflow-hidden border border-gray-200">
            <div className="bg-white p-4">
              <p className="text-xs text-gray-500 uppercase font-bold">Presupuesto</p>
              <p className="text-xl font-bold text-gray-800">{money(detalle.totalBudget)}</p>
            </div>
            <div className="bg-white p-4">
              <p className="text-xs text-gray-500 uppercase font-bold">Ejecutado</p>
              <p className="text-xl font-bold text-brand-700">{money(total)}</p>
            </div>
            <div className="bg-white p-4">
              <p className="text-xs text-gray-500 uppercase font-bold">Saldo</p>
              <p className={`text-xl font-bold ${Number(detalle.balance) < 0 ? 'text-red-600' : 'text-green-700'}`}>
                {money(detalle.balance)}
              </p>
            </div>
          </div>
        </div>

        {/* Composición del gasto */}
        {grafico.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-bold text-gray-800">Composición del gasto</h3>
            <p className="text-xs text-gray-500 mb-4">
              Por concepto, de mayor a menor{porConcepto.length > 8 && ` · se muestran los 8 mayores de ${porConcepto.length}`}
            </p>

            <div style={{ height: Math.max(180, grafico.length * 42) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={grafico} layout="vertical" margin={{ top: 0, right: 96, left: 8, bottom: 0 }}>
                  <CartesianGrid horizontal={false} stroke="#E5E7EB" strokeDasharray="3 3" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#6B7280' }}
                    axisLine={false} tickLine={false}
                    tickFormatter={v => new Intl.NumberFormat('es-CO', { notation: 'compact' }).format(v)} />
                  <YAxis type="category" dataKey="etiqueta" width={170}
                    tick={{ fontSize: 12, fill: '#374151' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    cursor={{ fill: '#F3F4F6' }}
                    formatter={(v, _n, p) => [`${money(v)} · ${p.payload.porcentaje}%`, 'Gasto']}
                    labelFormatter={(_l, p) => p?.[0]?.payload?.concepto ?? ''}
                    contentStyle={{ borderRadius: 8, border: '1px solid #E5E7EB', boxShadow: '0 4px 6px -1px rgba(0,0,0,.1)' }} />
                  <Bar dataKey="valor" fill={AZUL} radius={[0, 4, 4, 0]} barSize={18}>
                    <LabelList dataKey="valor" position="right" offset={8}
                      formatter={v => money(v)}
                      style={{ fontSize: 11, fill: '#374151', fontWeight: 600 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Desglose línea a línea */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <h3 className="font-bold text-gray-800 p-4 border-b">Detalle de líneas ({detalle.items.length})</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  <th className="text-left px-4 py-3 font-bold">Concepto</th>
                  {extra.map(c => <th key={c.key} className="text-left px-4 py-3 font-bold">{c.label}</th>)}
                  <th className="text-center px-4 py-3 font-bold">Cant.</th>
                  <th className="text-right px-4 py-3 font-bold">V. unitario</th>
                  <th className="text-right px-4 py-3 font-bold">Total</th>
                  <th className="text-right px-4 py-3 font-bold">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {detalle.items.map(i => (
                  <tr key={i.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">{i.concepto}</p>
                      {i.descripcion && <p className="text-xs text-gray-500">{i.descripcion}</p>}
                    </td>
                    {extra.map(c => (
                      <td key={c.key} className="px-4 py-3 text-gray-600">{i.metadata?.[c.key] ?? '—'}</td>
                    ))}
                    <td className="px-4 py-3 text-center text-gray-700">{i.cantidad}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{money(i.valorUnitario)}</td>
                    <td className="px-4 py-3 text-right font-bold text-gray-900">{money(i.valorTotal)}</td>
                    <td className="px-4 py-3 text-right text-gray-500 text-xs">
                      {i.fechaEvento ? new Date(i.fechaEvento).toLocaleDateString('es-CO') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 font-bold">
                  <td className="px-4 py-3" colSpan={extra.length + 3}>Total ejecutado</td>
                  <td className="px-4 py-3 text-right text-lg text-gray-900">{money(total)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {detalle.generalObs && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-bold text-gray-800 mb-2">Observaciones</h3>
            <p className="text-sm text-gray-600 whitespace-pre-line">{detalle.generalObs}</p>
          </div>
        )}
      </div>
    );
  }

  return null;
}

// Las columnas propias del tipo se deducen de la metadata guardada, para no
// depender de otra llamada al abrir el detalle.
function columnasDelDetalle(detalle) {
  const claves = new Set();
  for (const i of detalle.items) {
    for (const k of Object.keys(i.metadata || {})) claves.add(k);
  }
  const bonito = {
    origen: 'Origen', destino: 'Destino', kilometros: 'Km', tipoVehiculo: 'Vehículo',
    codigoCUM: 'CUM', principioActivo: 'Principio activo', presentacion: 'Presentación',
    codigo: 'Código', rol: 'Rol', horas: 'Horas', tipoAyuda: 'Tipo de ayuda',
    serial: 'Serial', institucion: 'Institución', diagnostico: 'Diagnóstico'
  };
  return [...claves].map(k => ({ key: k, label: bonito[k] || k }));
}
