import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { MdLogin, MdKey, MdHowToReg, MdArrowForward } from 'react-icons/md';

import { Modal, Button, Field } from '../components/ui';

/**
 * Portada y acceso.
 *
 * Antes esta pantalla pedía dos archivos que no existen en `public/`:
 * `/fondo.mp4` y `/bee.png`. En producción eran dos 404 — un video que
 * nunca cargaba y la ilustración del héroe rota.
 *
 * El fondo ahora se compone con los colores de la marca y no pesa nada,
 * que es además lo correcto para el usuario que abre esto desde un
 * teléfono de gama media con señal intermitente. Si aparecen los archivos
 * reales, se vuelven a enganchar aquí.
 */

export default function LandingPage({ onLoginSuccess }) {
  const navigate = useNavigate();

  const [modalType, setModalType] = useState(null);
  const [email, setEmail] = useState('');
  const [credential, setCredential] = useState('');
  const [enviando, setEnviando] = useState(false);

  const esCodigo = modalType === 'LOGIN_CODE';

  const handleLogin = async (e) => {
    e.preventDefault();
    setEnviando(true);
    try {
      const res = await fetch(import.meta.env.VITE_API_URL + '/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, credential, type: esCodigo ? 'CODE' : 'PASSWORD' })
      });

      const data = await res.json();

      if (res.ok) {
        // El backend responde { token, user }: se separan antes de guardar.
        onLoginSuccess(data.user, data.token);
      } else {
        toast.error(data.error || 'Correo o contraseña incorrectos.');
      }
    } catch {
      toast.error('No se pudo conectar con el servidor. Revisa tu conexión.');
    } finally {
      setEnviando(false);
    }
  };

  const cerrar = () => {
    setModalType(null);
    setCredential('');
  };

  return (
    <div className="min-h-screen flex flex-col bg-ink-50">

      {/* Fondo compuesto: dos halos suaves sobre el azul institucional.
          Cero peticiones de red. */}
      <div aria-hidden="true" className="fixed inset-0 -z-10 bg-brand-900">
        <div
          className="absolute inset-0 opacity-70"
          style={{
            backgroundImage:
              'radial-gradient(60rem 40rem at 15% 10%, #1f3c88 0%, transparent 60%),' +
              'radial-gradient(45rem 35rem at 85% 90%, #2a4396 0%, transparent 55%)'
          }}
        />
        <div
          className="absolute inset-0 opacity-25"
          style={{
            backgroundImage:
              'radial-gradient(30rem 24rem at 78% 18%, #ecb51f 0%, transparent 62%)'
          }}
        />
      </div>

      <div className="relative flex flex-col min-h-screen on-brand">

        <nav className="w-full">
          <div className="max-w-6xl mx-auto px-5 sm:px-8 py-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img
                src="/logo.png"
                alt=""
                width="44"
                height="44"
                className="h-11 w-11 object-contain rounded-md bg-white/95 p-1"
              />
              <span className="text-xl font-semibold tracking-tight text-white">
                ELÍGEME
              </span>
            </div>

            <Button
              variant="accent"
              icon={<MdLogin />}
              onClick={() => setModalType('LOGIN_PASSWORD')}
            >
              Iniciar sesión
            </Button>
          </div>
        </nav>

        <main className="flex-1 flex items-center">
          <div className="max-w-6xl mx-auto w-full px-5 sm:px-8 py-12 sm:py-20">
            <div className="max-w-2xl">
              <h1 className="text-3xl sm:text-[2.75rem] font-semibold leading-[1.1] tracking-tight text-white">
                Cuidado domiciliario de Támesis
              </h1>

              <p className="mt-5 text-md sm:text-lg text-brand-100 leading-relaxed measure">
                Plataforma de gestión y supervisión del cuidado en casa: del registro
                del cuidador hasta la rendición de cuentas ante los entes de control.
              </p>

              <p className="mt-4 text-sm text-brand-200 measure">
                Cada cifra que aparece en esta plataforma sale de un registro hecho
                por alguien. Donde no hay dato, lo dice.
              </p>

              <div className="mt-9 flex flex-col sm:flex-row gap-3">
                <Button
                  variant="accent"
                  size="lg"
                  icon={<MdKey />}
                  onClick={() => setModalType('LOGIN_CODE')}
                >
                  Tengo un código de acceso
                </Button>

                <Button
                  variant="secondary"
                  size="lg"
                  icon={<MdHowToReg />}
                  iconRight={<MdArrowForward />}
                  onClick={() => navigate('/registro')}
                  className="bg-white/10 text-white border-white/30 hover:bg-white/15 hover:border-white/50 shadow-none"
                >
                  Quiero postularme como cuidador
                </Button>
              </div>
            </div>
          </div>
        </main>

        <footer className="border-t border-white/10">
          <div className="max-w-6xl mx-auto px-5 sm:px-8 py-5 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-brand-200">
              Alcaldía de Támesis, Antioquia · en articulación con el hospital municipal
            </p>
            <p className="text-xs text-brand-200">© 2026 Elígeme S.A.S.</p>
          </div>
        </footer>
      </div>

      <Modal
        open={Boolean(modalType)}
        onClose={cerrar}
        size="sm"
        icon={esCodigo ? <MdKey /> : <MdLogin />}
        title={esCodigo ? 'Acceso con código' : 'Iniciar sesión'}
        subtitle={esCodigo
          ? 'Ingresa el código de seis dígitos que recibiste por correo.'
          : 'Ingresa con tu correo institucional y contraseña.'}
        footer={
          <>
            <Button variant="secondary" onClick={cerrar}>Cancelar</Button>
            <Button variant="primary" type="submit" form="form-login" loading={enviando}>
              Entrar
            </Button>
          </>
        }
      >
        <form id="form-login" onSubmit={handleLogin} className="space-y-5">
          <Field label="Correo electrónico" required>
            {(p) => (
              <input
                {...p}
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nombre@correo.com"
              />
            )}
          </Field>

          <Field
            label={esCodigo ? 'Código de acceso' : 'Contraseña'}
            required
            hint={esCodigo ? 'Son seis dígitos.' : undefined}
          >
            {(p) => (
              <input
                {...p}
                type="password"
                inputMode={esCodigo ? 'numeric' : undefined}
                autoComplete={esCodigo ? 'one-time-code' : 'current-password'}
                value={credential}
                onChange={(e) => setCredential(e.target.value)}
                className={`${p.className} ${esCodigo ? 'tracking-[0.3em]' : ''}`}
              />
            )}
          </Field>

          {!esCodigo && (
            <p className="text-sm text-ink-600">
              ¿Recibiste un código en vez de contraseña?{' '}
              <button
                type="button"
                onClick={() => { setModalType('LOGIN_CODE'); setCredential(''); }}
                className="font-medium text-brand-700 underline underline-offset-2 hover:text-brand-800"
              >
                Entra con tu código
              </button>
            </p>
          )}
        </form>
      </Modal>
    </div>
  );
}
