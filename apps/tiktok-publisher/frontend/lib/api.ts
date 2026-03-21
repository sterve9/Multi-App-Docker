const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export interface Video {
  id: string;
  title: string;
  script: string | null;
  duration_seconds: number;
  audio_path: string | null;
  video_path: string | null;
  status: "DRAFT" | "GENERATING" | "READY" | "FAILED";
  error_message: string | null;
  created_at: string;
}

export interface GenerateRequest {
  title: string;
  topic: string;
  duration_seconds: number;
}

export const api = {
  async generate(data: GenerateRequest) {
    const res = await fetch(`${BASE}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async listVideos(): Promise<Video[]> {
    const res = await fetch(`${BASE}/api/videos`);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async getVideo(id: string): Promise<Video> {
    const res = await fetch(`${BASE}/api/videos/${id}`);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async deleteVideo(id: string) {
    const res = await fetch(`${BASE}/api/videos/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
};
