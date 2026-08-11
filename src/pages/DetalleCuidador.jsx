import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { apiFetch, fileUrl } from '../lib/api';

export default function DetalleCuidador() {
    const { id } = useParams();
    const [data, setData] = useState(null);

    useEffect(() => {
        apiFetch(`/api/postulations/${id}`)
            .then(res => res.json())
            .then(setData)
            .catch(() => toast.error("Error al cargar datos"));
    }, [id]);

    if (!data) return <div className="text-white text-center mt-20">Cargando perfil...</div>;

    // El backend guarda "uploads/archivo.pdf"; fileUrl la vuelve absoluta
    // y le adjunta el token, que /uploads exige.
    const certificadoUrl = fileUrl(data.certificateUrl);

    return (
        <div className="min-h-screen bg-gray-50 text-gray-900 font-sans pb-20">
            {/* Header */}
            <div className="bg-white shadow px-8 py-4 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <Link to="/admin" className="text-gray-500 hover:text-blue-600 font-bold">← Volver al Panel</Link>
                    <h1 className="text-2xl font-bold text-blue-800">Perfil del Profesional</h1>
                </div>
                <div className="bg-blue-100 text-blue-800 px-4 py-1 rounded-full font-bold text-sm">
                    {data.status}
                </div>
            </div>

            <main className="max-w-6xl mx-auto mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8 px-4">
                
                {/* COLUMNA IZQUIERDA: INFORMACIÓN PERSONAL */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white p-6 rounded-xl shadow border border-gray-200">
                        <h2 className="text-xl font-bold mb-4 text-gray-800 border-b pb-2">Datos Personales</h2>
                        <div className="space-y-3 text-sm">
                            <p><span className="font-bold text-gray-500">Nombre:</span> {data.fullName}</p>
                            <p><span className="font-bold text-gray-500">Cédula:</span> {data.identification}</p>
                            <p><span className="font-bold text-gray-500">Teléfono:</span> {data.phone}</p>
                            <p><span className="font-bold text-gray-500">Email:</span> {data.email}</p>
                            <p><span className="font-bold text-gray-500">Dirección:</span> {data.address}</p>
                            
                            <hr className="my-3"/>
                            
                            <p><span className="font-bold text-gray-500">Código Acceso:</span> <span className="font-mono bg-gray-100 px-2 py-1">{data.accessCode || 'N/A'}</span></p>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow border border-gray-200">
                         <h2 className="text-xl font-semibold mb-4 text-brand-700 border-b border-ink-200 pb-2">Documentación</h2>
                         <p className="text-sm text-gray-600 mb-4">Hoja de vida y certificados adjuntos.</p>
                         
                         {certificadoUrl ? (
                             <a
                                href={certificadoUrl}
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="block w-full bg-red-50 text-red-600 border border-red-200 text-center py-3 rounded hover:bg-red-100 transition font-bold"
                             >
                                📄 Ver Documento PDF
                             </a>
                         ) : (
                             <p className="text-red-500 text-sm">No se adjuntó archivo.</p>
                         )}
                    </div>
                </div>

                {/* COLUMNA DERECHA: PERFIL Y BITÁCORAS */}
                <div className="lg:col-span-2 space-y-6">
                    
                    {/* Perfil Técnico */}
                    <div className="bg-white p-6 rounded-xl shadow border border-gray-200">
                        <h3 className="font-bold text-lg mb-3">Competencias Técnicas</h3>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <p className="font-bold text-gray-500">Nivel Educativo</p>
                                <p>{data.educationLevel}</p>
                            </div>
                            <div>
                                <p className="font-bold text-gray-500">Cert. SENA</p>
                                <p>{data.senaCertification ? `Sí (${data.senaCode})` : 'No'}</p>
                            </div>
                            <div className="col-span-2">
                                <p className="font-bold text-gray-500">Patologías que maneja</p>
                                <p className="bg-gray-50 p-2 rounded mt-1">{data.conditionsHandled}</p>
                            </div>
                            <div className="col-span-2">
                                <p className="font-bold text-gray-500">Habilidades Técnicas</p>
                                <p className="bg-gray-50 p-2 rounded mt-1">{data.technicalKnowledge}</p>
                            </div>
                        </div>
                    </div>

                    {/* BITÁCORAS COMPLETAS */}
                    <div className="bg-white p-6 rounded-xl shadow border border-gray-200">
                        <h2 className="text-xl font-bold mb-6 text-green-700 flex items-center gap-2">
                            📓 Historial de Bitácoras
                            <span className="text-sm bg-green-100 text-green-800 px-2 py-1 rounded-full font-normal">
                                {data.logs?.length || 0} Registros
                            </span>
                        </h2>

                        {(!data.logs || data.logs.length === 0) ? (
                            <p className="text-gray-400 text-center py-8">El cuidador aún no ha registrado bitácoras.</p>
                        ) : (
                            <div className="relative border-l-2 border-gray-200 ml-3 space-y-8">
                                {data.logs.map((log) => (
                                    <div key={log.id} className="relative pl-8">
                                        {/* Punto en la línea de tiempo */}
                                        <div className="absolute -left-[9px] top-0 w-4 h-4 bg-green-500 rounded-full border-2 border-white shadow"></div>
                                        
                                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 hover:border-green-300 transition">
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="text-sm font-bold text-gray-700">Reporte de Novedad</span>
                                                <span className="text-xs text-gray-500 bg-white border px-2 py-1 rounded">
                                                    {new Date(log.date).toLocaleString()}
                                                </span>
                                            </div>
                                            <p className="text-gray-700 text-sm whitespace-pre-wrap leading-relaxed">
                                                {log.content}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

            </main>
        </div>
    );
}