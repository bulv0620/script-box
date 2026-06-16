import type { ScriptBoxApi } from './index'

declare global {
  interface Window {
    scriptBox?: ScriptBoxApi
  }
}
