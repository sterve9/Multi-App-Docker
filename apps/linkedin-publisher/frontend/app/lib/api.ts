const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.linkedin.sterveshop.cloud";

export type PostStatus =
  | "draft" | "processing" | "ready" | "uploading" | "published" | "failed";

export interface Post {
  id:                number;
  topic:             string;
  hook?:             string;
  reflection?:       string;
  image_prompt?:     string;
  processed_content?:string;
  image_filename?:   string;
  status:            PostStatus;
  error_message?:    string;
  linkedin_post_id?: string;
  published_at?:     string;
  created_at:        string;
  updated_at?:       string;
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
  listPosts:   ()             => request<Post[]>("/api/posts"),
  getPost:     (id: number)  => request<Post>(`/api/posts/${id}`),
  createPost:  (topic: string) =>
    request<{ post_id: number; message: string }>("/api/posts/create", {
      method: "POST",
      body: JSON.stringify({ topic }),
    }),
  publishPost: (id: number)  => request<Post>(`/api/posts/${id}/publish`, { method: "POST" }),
  retryPost:   (id: number)  => request<void>(`/api/posts/${id}/retry`,   { method: "POST" }),
  deletePost:  (id: number)  => request<void>(`/api/posts/${id}`,         { method: "DELETE" }),
  getImageUrl: (filename: string) => `${API_URL}/api/posts/image/${filename}`,
};
