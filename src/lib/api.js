// Punto único para hablar con el backend.
// Se encarga de adjuntar la sesión y de reaccionar cuando expira.

const API_URL = import.meta.env.VITE_API_URL;

export const getToken = () => localStorage.getItem('token');

export const setSession = (token, user) => {
  if (token) localStorage.setItem('token', token);
  if (user) localStorage.setItem('user', JSON.stringify(user));
};

export const clearSession = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};

export const getStoredUser = () => {
  try {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

/**
 * fetch con el token puesto.
 *
 * Ante un 401 limpia la sesión y devuelve al inicio: dejar la interfaz
 * abierta con la sesión vencida solo produce pantallas vacías sin explicación.
 */
export async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = { ...(options.headers || {}) };

  if (token) headers.Authorization = `Bearer ${token}`;

  // No se fija Content-Type con FormData: el navegador debe poner el boundary.
  if (options.body && !(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (res.status === 401) {
    clearSession();
    if (window.location.pathname !== '/') window.location.href = '/';
  }

  return res;
}

/**
 * URL de un archivo subido. El token va en el query string porque las
 * etiquetas <img> y los enlaces de descarga no envían encabezados.
 */
export function fileUrl(path) {
  if (!path) return null;
  const limpio = (path.includes(',') ? path.split(',').pop() : path).trim();
  const ruta = limpio.startsWith('/') ? limpio : `/${limpio}`;
  const token = getToken();
  return `${API_URL}${ruta}${token ? `?token=${encodeURIComponent(token)}` : ''}`;
}
