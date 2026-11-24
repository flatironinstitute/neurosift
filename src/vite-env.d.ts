/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Where the homepage's BRAIN link opens Neurosift Brain, the atlas tool in the suite. */
  readonly VITE_NEUROSIFT_BRAIN_URL?: string;
  /** The embedded chat the dataset page's Chat panel loads. */
  readonly VITE_CHAT_EMBED_URL?: string;
}
