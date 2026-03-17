from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.models.post import PostStatus


class PostCreateRequest(BaseModel):
    topic: str


class PostPatchRequest(BaseModel):
    status:           Optional[PostStatus] = None
    linkedin_post_id: Optional[str]        = None
    error_message:    Optional[str]        = None


class PostResponse(BaseModel):
    id:                int
    topic:             str
    hook:              Optional[str]      = None
    reflection:        Optional[str]      = None
    image_prompt:      Optional[str]      = None
    processed_content: Optional[str]      = None
    image_filename:    Optional[str]      = None
    status:            PostStatus
    error_message:     Optional[str]      = None
    linkedin_post_id:  Optional[str]      = None
    published_at:      Optional[datetime] = None
    created_at:        datetime
    updated_at:        Optional[datetime] = None

    model_config = {"from_attributes": True}
