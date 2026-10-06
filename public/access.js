// A static UI gate only. Public assets are not protected by server authentication.
(() => {
  const key = 'page-tracker-static-access';
  function signedIn() {
    try {
      return sessionStorage.getItem(key) === 'signed-in';
    } catch {
      return false;
    }
  }
  function requireLogin() {
    if (signedIn()) return true;
    document.documentElement.style.visibility = 'hidden';
    location.replace('/login.html');
    return false;
  }
  window.portalAccess = {
    signedIn,
    requireLogin,
    async login(email, password) {
      const response = await fetch('/login-verifier.json');
      if (!response.ok) throw new Error('Login unavailable. Please retry.');
      const config = await response.json();
      if (email.trim().toLowerCase() !== config.email) return false;
      const material = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(password),
        'PBKDF2',
        false,
        ['deriveBits'],
      );
      const salt = Uint8Array.from(config.salt.match(/../g), (value) => parseInt(value, 16));
      const bits = await crypto.subtle.deriveBits(
        { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: config.iterations },
        material,
        256,
      );
      const digest = Array.from(new Uint8Array(bits), (value) =>
        value.toString(16).padStart(2, '0'),
      ).join('');
      if (digest !== config.verifier) return false;
      sessionStorage.setItem(key, 'signed-in');
      return true;
    },
    logout() {
      sessionStorage.removeItem(key);
      location.replace('/login.html');
    },
  };
  if (location.pathname !== '/login.html') {
    requireLogin();
    window.addEventListener('pageshow', requireLogin);
  } else if (signedIn()) location.replace('/');
})();
