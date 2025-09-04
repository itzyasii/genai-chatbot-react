// Tiny client-side logger. In production this is no-op unless DEBUG is enabled.
// Use a global flag (window.__APP_DEBUG__) or Vite's import.meta.env.DEV / VITE_DEBUG.
const isDebug = (() => {
  try {
    if (typeof window !== "undefined" && window.__APP_DEBUG__) return true;
    // If running with Vite / bundler, import.meta.env may be available
    // Access it inside try/catch to avoid ReferenceError in other environments
    // eslint-disable-next-line no-undef
    if (import.meta && import.meta.env) {
      const env = import.meta.env || {};
      if (env.DEV) return true;
      if (env.VITE_DEBUG === "true") return true;
    }
  } catch (e) {
    // ignore - keep logger off by default
  }
  return false;
})();

export const info = (...args) => {
  if (isDebug) console.info(...args);
};

export const debug = (...args) => {
  if (isDebug) console.debug(...args);
};

export const error = (...args) => {
  if (isDebug) console.error(...args);
};

export default { info, debug, error };
