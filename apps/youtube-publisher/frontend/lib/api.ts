const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.youtube.sterveshop.cloud";

export type VideoStatus =
  | "PENDING"
  | "GENERATING_SCRIPT"
  | "GENERATING_IMAGES"
  | "GENERATING_AUDIO"
  | "ASSEMBLING_VIDEO"
  | "COMPLETED"
  | "FAILED"
  | "PUBLISHED";

export interface Video {
  id: string;
  title: string;
  description?: string;
  tags?: string[];
  status: VideoStatus;
  topic?: string;
  script?: string;
  video_url?: string;
  youtube_url?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateVideoPayload {
  topic: string;
  title?: string;
  description?: string;
  tags?: string[];
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
  listVideos: () => request<Video[]>("/api/videos"),
  getVideo: (id: string) => request<Video>(`/api/videos/${id}`),
  createVideo: (data: CreateVideoPayload) =>
    request<Video>("/api/videos", { method: "POST", body: JSON.stringify(data) }),
  generateVideo: (id: string) =>
    request<Video>(`/api/generate/${id}`, { method: "POST" }),
  updateVideo: (id: string, data: Partial<Video>) =>
    request<Video>(`/api/videos/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteVideo: (id: string) =>
    request<void>(`/api/videos/${id}`, { method: "DELETE" }),
  getDownloadUrl: (id: string) => `${API_URL}/api/videos/${id}/download`,
};