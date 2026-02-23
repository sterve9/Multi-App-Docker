import axios from "axios";

const api = axios.create({ baseURL: "/api" });

export type PostStatus = "draft" | "processing" | "ready" | "published" | "failed";
export type PostType = "milestone" | "update" | "learning";

export interface Post {
  id: number;
  user_id: number;
  raw_content: string;
  post_type: PostType;
  processed_content?: string;
  title?: string;
  bullets?: string[];
  status: PostStatus;
  replicate_image_url?: string;
  final_image_path?: string;
  created_at: string;
}

export interface CreatePostPayload {
  raw_content: string;
  post_type: PostType;
  user_id: number;
}

export const postsApi = {
  list: (params?: { status?: PostStatus; user_id?: number }) =>
    api.get<Post[]>("/posts", { params }).then((r) => r.data),
  get: (id: number) =>
    api.get<Post>(`/posts/${id}`).then((r) => r.data),
  create: (payload: CreatePostPayload) =>
    api.post<Post>("/posts", payload).then((r) => r.data),
  delete: (id: number) =>
    api.delete(`/posts/${id}`).then((r) => r.data),
};
