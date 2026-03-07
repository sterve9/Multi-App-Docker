from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class BlogBase(BaseModel):
    title: str
    slug: str
    content: str
    excerpt: Optional[str] = None
    is_published: Optional[bool] = False


class BlogCreate(BlogBase):
    pass


class BlogUpdate(BaseModel):
    title: Optional[str]
    slug: Optional[str]
    content: Optional[str]
    excerpt: Optional[str]
    is_published: Optional[bool]


class BlogResponse(BlogBase):
    id: int
    created_at: Optional[datetime]
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True
