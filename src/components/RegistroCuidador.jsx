import { useState } from 'react';
import { apiFetch } from '../lib/api';
// import { toast } from 'sonner';

export default function DashboardCuidador({ user, onLogout }) {
  const [uploading, setUploading] = useState(false);

  // --------------------------------------------------------
  // VISTA A: USUARIO PRESELECCIONADO (Debe subir Certificado)
  // --------------------------------------------------------
  if (user.status === 'PRESELECCIONADO') {
    
    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        const formData = new FormData();
        formData.append('certificate', file);

        try {
            // Antes decía `${myid}`, una variable que no existe: al subir el
            // certificado lanzaba ReferenceError y la pantalla se caía.
            const res = await apiFetch(`/api/upload-certificate/${user.id}`, {
                method: 'POST',
                body: formData
            });

            if (res.ok) {
                alert("¡Certificado enviado! El administrador lo revisará pronto."); 
                window.location.reload(); // Recargar para ver si ya cambió algo o mostrar estado
            } else {
                alert("Error al subir el archivo.");
            }
        } catch (error) {
            console.error(error);
            alert("Error de conexión con el servidor.");
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
            <div className="max-w-md w-full bg-white rounded-xl shadow-2xl overflow-hidden">
                <div className="bg-blue-600 p-6 text-center">
                    <h1 className="text-2xl font-bold text-white">¡Estás Preseleccionado! 🎉</h1>
                    <p className="text-blue-100 text-sm mt-1">Hola, {user.fullName}</p>
                </div>
                
                <div className="p-8">
                    <div className="mb-6 text-center">
                        <p className="text-gray-600 mb-4">
                            Has pasado el primer filtro. Para activar tu cuenta, por favor sube tu 
                            <strong> Certificado de Aptitud del SENA</strong> (PDF o Imagen).
                        </p>
                    </div>

                    {/* Área de Subida */}
                    <div className="border-2 border-dashed border-blue-300 bg-blue-50 rounded-lg p-6 text-center relative hover:bg-blue-100 transition">
                        <input 
                            type="file" 
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={handleFileUpload}
                            disabled={uploading}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <div className="pointer-events-none">
                            <span className="text-3xl block mb-2">📂</span>
                            <span className="text-blue-700 font-bold underline">Seleccionar Archivo</span>
                            <p className="text-xs text-gray-500 mt-2">Máx 5MB</p>
                        </div>
                    </div>
                    
                    {uploading && <p className="text-center text-blue-600 font-bold mt-4 animate-pulse">Subiendo...</p>}

                    {/* Mensaje si ya hay archivo */}
                    {user.senaFile && (
                        <div className="mt-6 bg-green-100 text-green-800 p-3 rounded text-center border border-green-200">
                            ✅ <strong>Archivo Recibido.</strong><br/>
                            Estamos verificando tu documento. Por favor espera la aprobación final.
                        </div>
                    )}

                    <button 
                        onClick={onLogout} 
                        className="mt-8 w-full py-2 text-gray-400 hover:text-gray-600 font-bold text-sm"
                    >
                        Cerrar Sesión
                    </button>
                </div>
            </div>
        </div>
    );
  }

  // --------------------------------------------------------
  // VISTA B: USUARIO APROBADO (Tu Dashboard existente)
  // --------------------------------------------------------
  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow p-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-blue-800">Panel del Cuidador</h1>
        <div className="flex items-center gap-4">
            <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-bold">ACTIVO</span>
            <button onClick={onLogout} className="text-red-500 font-bold">Salir</button>
        </div>
      </nav>

      <div className="p-6 max-w-6xl mx-auto">
        <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-bold mb-4">Bienvenido, {user.fullName}</h2>
            <p className="text-gray-600">Aquí podrás ver tus turnos y registrar bitácoras próximamente.</p>
            
            {/* AQUÍ VA EL RESTO DE TU LÓGICA DE BITÁCORAS O PACIENTES */}
            <div className="mt-8 border-t pt-8 text-center text-gray-400">
                <p>No tienes pacientes asignados actualmente.</p>
            </div>
        </div>
      </div>
    </div>
  );
}