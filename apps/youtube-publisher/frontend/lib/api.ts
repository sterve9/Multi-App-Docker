const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.youtube.sterveshop.cloud";

export type VideoStatus =
  | "DRAFT"
  | "SCRIPTING"
  | "GENERATING_IMAGES"
  | "GENERATING_AUDIO"
  | "ASSEMBLING"
  | "READY"
  | "UPLOADING"
  | "PUBLISHED"
  | "FAILED";

export type VideoFormat = "economique" | "premium";

export interface Video {
  id: number;
  title: string;
  status: VideoStatus;
  format: VideoFormat;
  topic?: string;
  style?: string;
  serie_id?: string;
  episode_number: number;
  thumbnail_path?: string;
  youtube_url?: string;
  youtube_video_id?: string;
  error_message?: string;
  created_at: string;
  updated_at?: string;
}

export interface CreateVideoPayload {
  topic: string;
  style?: string;
  format?: VideoFormat;
  serie_id?: string;
  episode_number?: number;
  previous_summary?: string;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const error = await res.text();
    throw new Error(error || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  listVideos:    ()                              => request<Video[]>("/api/videos"),
  getVideo:      (id: number)                   => request<Video>(`/api/videos/${id}`),
  createVideo:   (data: CreateVideoPayload)     => request<{ video_id: number; message: string }>("/api/generate/create", { method: "POST", body: JSON.stringify(data) }),
  resumeVideo:   (id: number)                   => request<void>(`/api/generate/${id}/resume`, { method: "POST" }),
  publishVideo:  (id: number)                   => request<Video>(`/api/videos/${id}/publish`, { method: "POST" }),
  updateVideo:   (id: number, data: { youtube_url?: string; youtube_video_id?: string; status?: VideoStatus }) => request<Video>(`/api/videos/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteVideo:   (id: number)                   => request<void>(`/api/videos/${id}`, { method: "DELETE" }),
  getDownloadUrl:(id: number)                   => `${API_URL}/api/videos/${id}/download`,
  getThumbnailUrl:(thumbnail_path: string)      => `${API_URL}/api/videos/thumbnail?path=${encodeURIComponent(thumbnail_path)}`,
};
