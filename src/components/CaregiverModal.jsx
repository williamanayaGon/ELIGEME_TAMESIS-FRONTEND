import { useState } from 'react';
import { apiFetch } from '../lib/api';

export default function CaregiverModal({ onClose }) {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    description: ''
  });
  const [file, setFile] = useState(null); // Estado para el archivo
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Para enviar archivos, NO podemos usar JSON simple.
    // Usamos FormData.
    const data = new FormData();
    data.append('fullName', formData.fullName);
    data.append('email', formData.email);
    data.append('description', formData.description);
    
    if (file) {
      data.append('certificate', file); // 'certificate' debe coincidir con upload.single('certificate') del backend
    }

    try {
      const res = await apiFetch('/api/postulations/create', {
        method: 'POST',
        // OJO: Cuando usamos FormData, NO ponemos el header 'Content-Type': 'application/json'
        // El navegador lo pone automático.
        body: data 
      });

      if (res.ok) {
        alert("✅ Solicitud enviada con éxito. Revisaremos tu certificado.");
        onClose();
      } else {
        const errorData = await res.json();
        alert("❌ Error: " + errorData.error);
      }
    } catch (error) {
      alert("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center z-50 p-4">
      <div className="bg-[#111] border border-gray-700 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row animate-fade-in-up">
        
        {/* LADO IZQUIERDO: REQUISITOS (Azul oscuro) */}
        <div className="w-full md:w-1/3 bg-blue-900/20 p-6 border-r border-gray-700 flex flex-col justify-center">
          <h3 className="text-xl font-bold text-blue-400 mb-4">Requisitos Obligatorios</h3>
          <ul className="space-y-4 text-sm text-gray-300">
            <li className="flex items-start gap-2">
              <span className="text-green-400">✓</span> Ser mayor de edad (+18).
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400">✓</span> No tener antecedentes penales.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400">✓</span> Experiencia mínima de 6 meses (comprobable).
            </li>
            <li className="flex items-start gap-2">
              <span className="text-yellow-400">⚠</span> <strong>Certificación SENA</strong> o entidad avalada en cuidado de pacientes.
            </li>
          </ul>
        </div>

        {/* LADO DERECHO: FORMULARIO */}
        <div className="w-full md:w-2/3 p-6 relative">
          <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white">✕</button>
          
          <h2 className="text-2xl font-bold text-white mb-1">Postúlate</h2>
          <p className="text-gray-500 text-sm mb-6">Únete a nuestra red profesional.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <input 
              placeholder="Nombre Completo" 
              required
              className="w-full bg-black/50 border border-gray-700 rounded p-3 text-white focus:border-blue-500 outline-none"
              onChange={e => setFormData({...formData, fullName: e.target.value})}
            />
            
            <input 
              type="email" 
              placeholder="Correo Electrónico" 
              required
              className="w-full bg-black/50 border border-gray-700 rounded p-3 text-white focus:border-blue-500 outline-none"
              onChange={e => setFormData({...formData, email: e.target.value})}
            />
            
            <textarea 
              placeholder="Cuéntanos brevemente sobre tu experiencia..." 
              className="w-full bg-black/50 border border-gray-700 rounded p-3 text-white focus:border-blue-500 outline-none h-20 resize-none"
              onChange={e => setFormData({...formData, description: e.target.value})}
            />

            {/* INPUT DE ARCHIVO */}
            <div className="border border-dashed border-gray-600 rounded-lg p-4 bg-gray-900/50 hover:bg-gray-900 transition text-center cursor-pointer relative">
              <input 
                type="file" 
                accept=".pdf,.jpg,.png" // Solo PDF o Imágenes
                required
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onChange={(e) => setFile(e.target.files[0])}
              />
              <div className="text-sm text-gray-400">
                {file ? (
                  <span className="text-green-400 font-bold">📄 {file.name}</span>
                ) : (
                  <>
                    <span className="block text-2xl mb-1">📂</span>
                    <span className="font-bold text-white">Sube tu Certificado SENA</span>
                    <span className="block text-xs mt-1 text-gray-500">(PDF, JPG o PNG)</span>
                  </>
                )}
              </div>
            </div>

            <button disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded transition shadow-lg">
              {loading ? 'Subiendo documentos...' : 'Enviar Solicitud'}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}