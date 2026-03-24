import axios from 'axios'

const API = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
})

export interface ScriptRequest {
  theme: string
  format: 'image_animee' | 'video_ia'
  duration: '15' | '30' | '60'
}

export interface ScriptResponse {
  hook: string
  script: string
  captions: string[]
  tags: string[]
  description: string
  sales_text: string
  publication_hint?: string
}

export interface VideoGenerationRequest extends ScriptResponse {
  format: 'image_animee' | 'video_ia'
  duration: '15' | '30' | '60'
}

export interface VideoStatus {
  video_id: string
  status: 'pending' | 'processing' | 'done' | 'error'
  progress: number
  message: string
  video_url?: string
}

export const generateScript = async (data: ScriptRequest): Promise<ScriptResponse> => {
  const res = await API.post('/api/script', data)
  return res.data
}

export const generateVideo = async (data: VideoGenerationRequest): Promise<VideoStatus> => {
  const res = await API.post('/api/video', data)
  return res.data
}

export const getVideoStatus = async (videoId: string): Promise<VideoStatus> => {
  const res = await API.get(`/api/status/${videoId}`)
  return res.data
}

export const getVideoUrl = (videoId: string) =>
  `${process.env.NEXT_PUBLIC_API_URL}/api/download/${videoId}`