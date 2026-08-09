import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';


// =====================================================================
// 1. COMPONENTE MODAL DE ÉXITO (Definido aquí para evitar errores)
// =====================================================================
const SuccessModal = ({ isOpen, type, onClose }) => {
  if (!isOpen) return null;

  const isPreselected = type === 'PRESELECCIONADO';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 backdrop-blur-sm transition-all">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden transform transition-all scale-100 animate-fade-in-up">
        
        {/* Encabezado del Modal */}
        <div className={`p-6 text-center ${isPreselected ? 'bg-gradient-to-r from-blue-600 to-indigo-700' : 'bg-green-600'}`}>
          <div className="mx-auto w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-lg">
            {isPreselected ? (
              <span className="text-3xl">🎉</span> 
            ) : (
              // Icono de Check
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
            )}
          </div>
          <h2 className="text-2xl font-bold text-white mb-1">
            {isPreselected ? '¡FELICITACIONES!' : '¡Solicitud Recibida!'}
          </h2>
          <p className="text-blue-100 text-sm">
            {isPreselected ? 'Has sido preseleccionado' : 'Registro exitoso'}
          </p>
        </div>

        {/* Cuerpo del Modal */}
        <div className="p-8 text-center space-y-4">
          <p className="text-gray-600 text-lg leading-relaxed">
            {isPreselected 
              ? "Debido a la condición prioritaria del paciente, tu perfil ha sido aprobado automáticamente." 
              : "Hemos recibido tu postulación correctamente. La EPS revisará tus documentos y te contactará pronto."}
          </p>
          
          {isPreselected && (
            <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl">
              <p className="text-sm text-blue-800 font-semibold">📧 Revisa tu correo electrónico para ver tus credenciales de acceso inmediato.</p>
            </div>
          )}

          <button 
            onClick={onClose}
            className={`w-full py-3 rounded-xl font-bold text-white shadow-lg transition transform hover:-translate-y-1 ${isPreselected ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-800 hover:bg-gray-900'}`}
          >
            Entendido, continuar
          </button>
        </div>
      </div>
    </div>
  );
};

// =====================================================================
// 2. COMPONENTE PRINCIPAL (PÁGINA DE REGISTRO)
// =====================================================================
export default function RegistroPage() {
  const navigate = useNavigate();
  
  // --- ESTADOS DE LA INTERFAZ ---
  const [step, setStep] = useState('REQUISITOS'); // 'REQUISITOS' | 'FORMULARIO'
  const [loading, setLoading] = useState(false);
  const [applicantType, setApplicantType] = useState('FAMILIAR'); // 'FAMILIAR' | 'CONTRATISTA'
  
  // --- ESTADOS DE DATOS ---
  const [epsList, setEpsList] = useState([]);
  
  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('NORMAL');

  // Formulario Completo
  const [formData, setFormData] = useState({
    // Datos Comunes
    fullName: '', docType: 'CC', identification: '', birthDate: '',
    phone: '', email: '', address: '',
    
    // Perfil
    senaCode: '', experienceYears: '', hasTransport: false, shiftPreference: 'Diurno',
    
    // EPS
    epsId: '', 
    
    // Datos Paciente (Solo Familiar)
    patientName: '', patientDoc: '', disabilityGrade: 'MODERADA', hasMedicalOrder: 'NO', diagnosis: '',
    
    // Relación y Servicio
    relationship: 'Familiar', careType: 'Diario', startDate: '',
    
    // Términos
    acceptTerms: false
  });

  // Archivos (Separados para evitar errores)
  const [files, setFiles] = useState({
    docCaregiver: null,
    docPatient: null, 
    docHistory: null, 
    docPower: null,   
    docTraining: null,
    docCv: null       
  });

  // --- CARGAR EPS AL INICIAR ---
  useEffect(() => {
    // CAMBIA LA URL SI ES NECESARIO (ej: https://tuhost.railway.app)
    const API_URL = import.meta.env.VITE_API_URL + ''; 
    
    fetch(`${API_URL}/api/eps-list`)
      .then(res => res.json())
      .then(data => {
        if(Array.isArray(data)) setEpsList(data);
      })
      .catch(err => console.error("Error cargando EPS:", err));
  }, []);

  // --- MANEJADORES DE EVENTOS ---
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleFileChange = (e, fieldKey) => {
    if (e.target.files && e.target.files[0]) {
      setFiles(prev => ({ ...prev, [fieldKey]: e.target.files[0] }));
    }
  };

  const handleApplicantTypeSelect = (type) => {
    setApplicantType(type);
    setStep('FORMULARIO');
    // Ajustar el valor de relación automáticamente
    setFormData(prev => ({
        ...prev,
        relationship: type === 'CONTRATISTA' ? 'Contratista' : 'Familiar'
    }));
  };

  const handleCloseModal = () => {
      setShowModal(false);
      navigate('/'); // Redirigir al inicio al cerrar
  };

  // --- ENVÍO DEL FORMULARIO (CORREGIDO PARA MULTER) ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Validaciones
    if (!formData.epsId) {
        toast.error("Selección requerida", { description: "Por favor selecciona una EPS." });
        setLoading(false); return;
    }
    if (!formData.acceptTerms) {
        toast.error("Requerido", { description: "Debes aceptar la declaración." });
        setLoading(false); return;
    }

    const dataToSend = new FormData();
    // 1. Agregar todos los campos de texto
    Object.keys(formData).forEach(key => dataToSend.append(key, formData[key]));

    // 2. Agregar Archivos (USANDO LAS CLAVES EXACTAS DEL BACKEND)
    
    // Todos suben su cédula
    if (files.docCaregiver) dataToSend.append('docCaregiver', files.docCaregiver); 
    
    if (applicantType === 'FAMILIAR') {
        // Familiares: Documentos del paciente y legales
        if (files.docPatient) dataToSend.append('docPatient', files.docPatient);
        if (files.docHistory) dataToSend.append('docHistory', files.docHistory);
        if (files.docPower)   dataToSend.append('docPower', files.docPower);
    } else {
        // Contratistas: Hoja de Vida
        if (files.docCv) dataToSend.append('docCv', files.docCv);
    }
    
    // Opcional (Diploma SENA)
    if (files.docTraining) dataToSend.append('docTraining', files.docTraining);

    try {
      // URL DEL BACKEND (Asegúrate que coincida)
      const res = await fetch(import.meta.env.VITE_API_URL + '/api/caregivers', {
        method: 'POST',
        body: dataToSend
      });

      const data = await res.json();

      if (res.ok) {
        // Determinar qué tipo de modal mostrar
        if (applicantType === 'FAMILIAR' && data.status === 'PRESELECCIONADO') {
            setModalType('PRESELECCIONADO');
        } else {
            setModalType('NORMAL');
        }
        setShowModal(true); // Abrir el modal
      } else {
        toast.error("Error al registrar", { description: data.error || "Intenta nuevamente." });
      }
    } catch (error) {
      console.error(error);
      toast.error("Error de conexión");
    } finally {
        setLoading(false);
    }
  };

  // =====================================================================
  // RENDERIZADO (VISTA HTML)
  // =====================================================================
  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 font-sans text-gray-800">
      
      {/* MODAL (Renderizado condicionalmente) */}
      <SuccessModal isOpen={showModal} type={modalType} onClose={handleCloseModal} />

      {/* VISTA 1: SELECCIÓN DE TIPO Y REQUISITOS */}
      {step === 'REQUISITOS' && (
        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
            
            {/* Título Principal */}
            <div className="text-center mb-8">
                <h1 className="text-4xl font-extrabold text-blue-900">Bienvenido al Registro Único</h1>
                <p className="text-gray-500 mt-2 text-lg">Selecciona tu perfil para ver los requisitos adecuados</p>
            </div>

            {/* TARJETAS DE SELECCIÓN */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Opción 1: Familiar */}
                <button 
                    onClick={() => handleApplicantTypeSelect('FAMILIAR')}
                    className="group bg-white p-8 rounded-2xl shadow-md hover:shadow-2xl transition-all border-2 border-transparent hover:border-blue-500 text-left"
                >
                    <div className="bg-blue-100 w-14 h-14 rounded-full flex items-center justify-center text-3xl mb-4 group-hover:scale-110 transition">🏠</div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">Soy Familiar o Conocido</h3>
                    <p className="text-gray-500 text-sm">
                        Busco formalizar mi labor de cuidado con un paciente que conozco (familiar, amigo o vecino).
                    </p>
                    <div className="mt-4 text-blue-600 font-bold text-sm flex items-center gap-1">
                        Ver requisitos y postular <span className="group-hover:translate-x-1 transition">→</span>
                    </div>
                </button>

                {/* Opción 2: Contratista */}
                <button 
                    onClick={() => handleApplicantTypeSelect('CONTRATISTA')}
                    className="group bg-white p-8 rounded-2xl shadow-md hover:shadow-2xl transition-all border-2 border-transparent hover:border-purple-500 text-left"
                >
                    <div className="bg-purple-100 w-14 h-14 rounded-full flex items-center justify-center text-3xl mb-4 group-hover:scale-110 transition">💼</div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">Soy Profesional / Contratista</h3>
                    <p className="text-gray-500 text-sm">
                        Soy auxiliar de enfermería o cuidador externo y deseo ofrecer mis servicios a la EPS.
                    </p>
                    <div className="mt-4 text-purple-600 font-bold text-sm flex items-center gap-1">
                        Ver requisitos y postular <span className="group-hover:translate-x-1 transition">→</span>
                    </div>
                </button>
            </div>

            {/* Requisitos Generales (Informativo) */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mt-8">
                <h4 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span> Requisitos Generales
                </h4>
                <ul className="text-sm text-gray-600 grid grid-cols-1 md:grid-cols-2 gap-3 pl-4 list-disc">
                    <li>Ser mayor de edad con cédula vigente.</li>
                    <li>Disponibilidad de tiempo y actitud de servicio.</li>
                    <li>Certificado SENA (Recomendado).</li>
                    <li>Correo electrónico activo.</li>
                </ul>
            </div>
            
            <div className="text-center pt-4">
                 <button onClick={() => navigate('/')} className="text-gray-400 hover:text-gray-600 font-medium underline">Cancelar y volver al inicio</button>
            </div>
        </div>
      )}

      {/* VISTA 2: FORMULARIO DINÁMICO */}
      {step === 'FORMULARIO' && (
        <div className="max-w-4xl mx-auto mb-6 animate-fade-in-up">
             <button onClick={() => setStep('REQUISITOS')} className="text-gray-500 hover:text-blue-600 flex items-center gap-1 font-medium mb-4 transition">
                ← Volver a selección de perfil
            </button>
            
            <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-xl p-8 space-y-8 relative overflow-hidden">
                
                {/* Indicador visual superior */}
                <div className={`absolute top-0 left-0 w-full h-2 ${applicantType === 'FAMILIAR' ? 'bg-blue-500' : 'bg-purple-500'}`}></div>
                
                <div className="flex justify-between items-center border-b pb-4">
                    <h2 className="text-2xl font-bold text-gray-800">
                        Registro: {applicantType === 'FAMILIAR' ? 'Cuidador Familiar' : 'Profesional Externo'}
                    </h2>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${applicantType === 'FAMILIAR' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                        {applicantType}
                    </span>
                </div>

                {/* 1. SELECCIÓN DE EPS */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <label className="block text-sm font-bold text-gray-700 mb-2 uppercase">
                        ¿A qué EPS deseas postularte? *
                    </label>
                    <select 
                        name="epsId" 
                        onChange={handleChange} 
                        required 
                        className="w-full p-3 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none transition"
                        value={formData.epsId}
                    >
                        <option value="">-- Selecciona una Entidad --</option>
                        {epsList.map((eps) => (
                            <option key={eps.id} value={eps.id}>{eps.name}</option>
                        ))}
                    </select>
                </div>

                {/* 2. DATOS DEL POSTULANTE (Común para ambos) */}
                <section>
                    <h3 className="text-lg font-bold text-gray-800 mb-4 border-l-4 border-gray-500 pl-3">Datos Personales</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase">Nombre Completo *</label>
                            <input name="fullName" onChange={handleChange} className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-200 transition outline-none" required />
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                             <div className="col-span-1">
                                <label className="text-xs font-bold text-gray-500 uppercase">Tipo *</label>
                                <select name="docType" onChange={handleChange} className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50">
                                    <option value="CC">CC</option>
                                    <option value="CE">CE</option>
                                    <option value="PPT">PPT</option>
                                </select>
                             </div>
                             <div className="col-span-2">
                                <label className="text-xs font-bold text-gray-500 uppercase">Identificación *</label>
                                <input name="identification" onChange={handleChange} className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-200 transition outline-none" required />
                             </div>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase">Fecha Nacimiento *</label>
                            <input type="date" name="birthDate" onChange={handleChange} className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50" required />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase">Teléfono *</label>
                            <input name="phone" onChange={handleChange} className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50" required />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase">Correo Electrónico *</label>
                            <input name="email" type="email" onChange={handleChange} className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50" required />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase">Dirección</label>
                            <input name="address" onChange={handleChange} className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50" />
                        </div>
                    </div>
                </section>
                
                {/* 3. PERFIL PROFESIONAL */}
                <section className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-700 mb-4">Perfil Laboral</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase">Código Certificado SENA</label>
                            <input name="senaCode" onChange={handleChange} className="w-full p-3 border border-gray-200 rounded-lg focus:border-blue-400 outline-none" placeholder="Opcional" />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase">Años de Experiencia</label>
                            <input name="experienceYears" type="number" onChange={handleChange} className="w-full p-3 border border-gray-200 rounded-lg focus:border-blue-400 outline-none" placeholder="0" />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase">Preferencia Turno</label>
                            <select name="shiftPreference" onChange={handleChange} className="w-full p-3 border border-gray-200 rounded-lg">
                                <option value="Diurno">Diurno</option>
                                <option value="Nocturno">Nocturno</option>
                                <option value="Interno">Interno</option>
                            </select>
                        </div>
                        <div className="flex items-center pt-6">
                            <label className="flex items-center space-x-3 cursor-pointer">
                                <input type="checkbox" name="hasTransport" onChange={handleChange} className="w-5 h-5 text-blue-600 rounded" />
                                <span className="text-gray-700 text-sm">Cuento con transporte propio</span>
                            </label>
                        </div>
                    </div>
                </section>

                {/* 4. INFORMACIÓN DEL PACIENTE (SOLO SI ES FAMILIAR) */}
                {applicantType === 'FAMILIAR' && (
                    <section className="animate-fade-in">
                        <h3 className="text-lg font-bold text-blue-800 mb-4 border-l-4 border-blue-500 pl-3">Información del Paciente</h3>
                        <div className="bg-blue-50 p-6 rounded-xl border border-blue-100 grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Nombre del Paciente *</label>
                                <input name="patientName" onChange={handleChange} className="w-full p-3 border border-gray-300 rounded-lg bg-white" required />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Documento Paciente *</label>
                                <input name="patientDoc" onChange={handleChange} className="w-full p-3 border border-gray-300 rounded-lg bg-white" required />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Grado Discapacidad *</label>
                                <select name="disabilityGrade" onChange={handleChange} className="w-full p-3 border border-gray-300 rounded-lg bg-white">
                                    <option value="MODERADA">Moderada</option>
                                    <option value="SEVERA">Severa (Postración Parcial)</option>
                                    <option value="TOTAL">Total (Postración Total)</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">¿Tiene Orden Médica? *</label>
                                <select name="hasMedicalOrder" onChange={handleChange} className="w-full p-3 border border-gray-300 rounded-lg bg-white">
                                    <option value="NO">NO</option>
                                    <option value="SI">SÍ, vigente</option>
                                </select>
                            </div>
                            <div className="md:col-span-2">
                                <label className="text-xs font-bold text-gray-500 uppercase">Diagnóstico Principal *</label>
                                <textarea name="diagnosis" onChange={handleChange} className="w-full p-3 border border-gray-300 rounded-lg bg-white" rows="2" placeholder="Ej: Alzheimer fase 2, movilidad reducida..." required></textarea>
                            </div>
                            
                            {/* Detalles de Servicio */}
                             <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Parentesco *</label>
                                <select name="relationship" onChange={handleChange} className="w-full p-3 border border-gray-300 rounded-lg bg-white">
                                    <option value="Familiar">Familiar Directo</option>
                                    <option value="Amigo">Amigo / Vecino</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Inicio Estimado *</label>
                                <input type="date" name="startDate" onChange={handleChange} className="w-full p-3 border border-gray-300 rounded-lg bg-white" required />
                            </div>
                        </div>
                    </section>
                )}

                {/* 5. SOPORTES DOCUMENTALES (CONDICIONAL) */}
                <section className="bg-gray-100 p-6 rounded-xl border border-gray-200">
                    <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                        📎 Soportes Documentales <span className="text-xs font-normal text-gray-500">(PDF o Imagen)</span>
                    </h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        
                        {/* 1. DOCUMENTO CUIDADOR (TODOS) */}
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">Cédula del Solicitante *</label>
                            <input type="file" required accept=".pdf,.jpg,.png" onChange={(e) => handleFileChange(e, 'docCaregiver')} className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer" />
                        </div>

                        {/* DOCUMENTOS SOLO PARA FAMILIARES */}
                        {applicantType === 'FAMILIAR' && (
                            <>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Cédula del Paciente *</label>
                                    <input type="file" required accept=".pdf,.jpg,.png" onChange={(e) => handleFileChange(e, 'docPatient')} className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer" />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Historia Clínica *</label>
                                    <input type="file" required accept=".pdf,.jpg,.png" onChange={(e) => handleFileChange(e, 'docHistory')} className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer" />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Poder / Extrajuicio *</label>
                                    <input type="file" required accept=".pdf,.jpg,.png" onChange={(e) => handleFileChange(e, 'docPower')} className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer" />
                                </div>
                            </>
                        )}

                        {/* DOCUMENTOS SOLO PARA CONTRATISTAS */}
                        {applicantType === 'CONTRATISTA' && (
                            <div className="col-span-1 md:col-span-2 bg-purple-50 p-4 rounded border border-purple-100">
                                <label className="block text-xs font-bold text-purple-700 mb-1">Hoja de Vida / Soportes de Experiencia *</label>
                                <input type="file" required accept=".pdf,.jpg,.png" onChange={(e) => handleFileChange(e, 'docCv')} className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-100 file:text-purple-700 hover:file:bg-purple-200 cursor-pointer" />
                                <p className="text-xs text-purple-500 mt-1">Sube un único archivo PDF con tu HV y certificados laborales.</p>
                            </div>
                        )}

                        {/* OPCIONAL (TODOS) */}
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">Certificado SENA (Opcional)</label>
                            <input type="file" accept=".pdf,.jpg,.png" onChange={(e) => handleFileChange(e, 'docTraining')} className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-gray-50 file:text-gray-700 hover:file:bg-gray-200 cursor-pointer" />
                        </div>

                    </div>
                </section>

                {/* 6. DECLARACIÓN RESPONSABILIDAD */}
                <section className="bg-yellow-50 p-4 rounded border border-yellow-200">
                    <label className="flex items-start gap-3 cursor-pointer">
                        <input type="checkbox" name="acceptTerms" onChange={handleChange} className="mt-1 w-5 h-5 text-blue-600 rounded" />
                        <span className="text-sm text-gray-800">
                            <strong>Acepto tratamiento de mis datos personales:</strong> 
                            {applicantType === 'FAMILIAR' 
                                ? " He leído y acepto la Política de Tratamiento de Datos Personales y autorizo el tratamiento de mis datos personales."
                                : " He leído y acepto la Política de Tratamiento de Datos Personales y autorizo el tratamiento de mis datos personales."
                            }
                        </span>
                    </label>
                </section>

                <button 
                    type="submit" 
                    disabled={loading}
                    className={`w-full py-4 text-white rounded-xl font-bold shadow-lg transition transform hover:-translate-y-1 disabled:bg-gray-400 disabled:cursor-not-allowed ${applicantType === 'FAMILIAR' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-purple-600 hover:bg-purple-700'}`}
                >
                    {loading ? 'Enviando Documentación...' : 'RADICAR POSTULACIÓN'}
                </button>
            </form>
        </div>
      )}

      {/* SECCIÓN INFORMATIVA SENA */}
      <div className="max-w-3xl mx-auto mt-12 bg-white rounded-xl border border-gray-200 p-8">
            <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold text-xl">S</div>
                <h2 className="text-2xl font-bold text-gray-800">¿Cómo certificarse en el SENA?</h2>
            </div>
            <p className="text-gray-600 mb-6 leading-relaxed">
                El Servicio Nacional de Aprendizaje (SENA) ofrece cursos gratuitos presenciales y virtuales en áreas de salud y cuidado. 
                Para postularte en nuestra plataforma, el curso de <strong>"Atención y Cuidado a Personas Mayores"</strong> es un requisito.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-bold text-gray-800 mb-2">Paso 1: Inscripción</h4>
                    <p className="text-sm text-gray-500">Ingresa a SofiaPlus, busca el curso de tu interés y regístrate en las fechas de convocatoria.</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-bold text-gray-800 mb-2">Paso 2: Certificación</h4>
                    <p className="text-sm text-gray-500">Al finalizar y aprobar el curso, podrás descargar tu diploma digital en formato PDF.</p>
                </div>
            </div>

            <div className="mt-6 text-center">
                <a 
                    href="https://oferta.senasofiaplus.edu.co/sofia-oferta/" 
                    target="_blank" 
                    rel="noreferrer"
                    className="inline-block bg-orange-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-orange-700 transition"
                >
                    Ir al Portal SENA SofiaPlus &rarr;
                </a>
            </div>
      </div>
      
      <div className="text-center mt-10 text-gray-400 text-sm pb-10">
        © 2026 Eligeme - Tus datos están protegidos.
      </div>
    </div>
  );
}