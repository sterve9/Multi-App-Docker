import { create } from 'zustand'
import { ScriptResponse } from './api'

interface AppState {
  // Étape courante
  step: 'form' | 'script' | 'generating' | 'preview'
  setStep: (step: AppState['step']) => void

  // Paramètres
  theme: string
  format: 'image_animee' | 'video_ia'
  duration: '15' | '30' | '60'
  setParams: (theme: string, format: AppState['format'], duration: AppState['duration']) => void

  // Script généré
  script: ScriptResponse | null
  setScript: (script: ScriptResponse) => void

  // Job vidéo
  videoId: string | null
  videoStatus: string
  videoProgress: number
  videoMessage: string
  videoUrl: string | null
  setVideoJob: (id: string) => void
  updateVideoStatus: (status: string, progress: number, message: string, url?: string) => void

  // Reset
  reset: () => void
}

export const useAppStore = create<AppState>((set) => ({
  step: 'form',
  setStep: (step) => set({ step }),

  theme: '',
  format: 'image_animee',
  duration: '30',
  setParams: (theme, format, duration) => set({ theme, format, duration }),

  script: null,
  setScript: (script) => set({ script }),

  videoId: null,
  videoStatus: '',
  videoProgress: 0,
  videoMessage: '',
  videoUrl: null,
  setVideoJob: (id) => set({ videoId: id }),
  updateVideoStatus: (status, progress, message, url) =>
    set({ videoStatus: status, videoProgress: progress, videoMessage: message, videoUrl: url }),

  reset: () => set({
    step: 'form',
    theme: '',
    script: null,
    videoId: null,
    videoStatus: '',
    videoProgress: 0,
    videoMessage: '',
    videoUrl: null,
  }),
}))