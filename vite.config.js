import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Héritage Create React App : le code lit process.env.NODE_ENV et
  // process.env.REACT_APP_* (lib/env.js, lib/supabase.js). `process` n'existe
  // pas dans le navigateur, on remplace donc ces accès à la compilation.
  // Pas en mode test : Vitest tourne sous Node et garde le vrai process.env.
  // `process.env` (objet complet) couvre aussi les variables absentes du .env,
  // qui valent alors undefined au lieu de lever une ReferenceError.
  const env = { ...loadEnv(mode, process.cwd(), 'REACT_APP_'), NODE_ENV: mode === 'production' ? 'production' : 'development' };
  const define = mode === 'test'
    ? {}
    : {
        ...Object.fromEntries(Object.entries(env).map(([key, value]) => [`process.env.${key}`, JSON.stringify(value)])),
        'process.env': JSON.stringify(env),
      };

  return {
    plugins: [react()],
    define,
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/setupTests.js'],
    },
  };
});
