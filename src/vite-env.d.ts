/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MAGNIFIC_KEY?: string;
  readonly VITE_FLUX_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
