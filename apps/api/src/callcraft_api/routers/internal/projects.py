import re
import ulid
from typing import Optional
from fastapi import Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from callcraft_api.db.repository import Repository
from callcraft_api.db.session import get_db_session
from callcraft_api.routers.internal._deps import router, get_current_user_id


class CreateProjectRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="Project display name")
    slug: Optional[str] = Field(None, description="URL-safe slug (auto-generated from name if omitted)")
    description: Optional[str] = Field(None, description="Short project description")
    color: str = Field("#e1b329", description="Accent color hex code for UI display")
    icon: str = Field("Boxes", description="Lucide icon name for UI display")


class UpdateProjectRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None)
    color: Optional[str] = Field(None)
    icon: Optional[str] = Field(None)


def _generate_slug(name: str) -> str:
    """Converts a project name to a URL-safe slug."""
    slug = name.lower().strip()
    slug = re.sub(r"[^a-z0-9\s-]", "", slug)
    slug = re.sub(r"[\s-]+", "-", slug)
    return slug.strip("-")


@router.get("/projects")
async def list_projects(
    user_id: str = Depends(get_current_user_id),
    db: Optional[AsyncSession] = Depends(get_db_session),
):
    """Lists all active projects for the authenticated user."""
    return await Repository.list_projects(db, user_id)


@router.post("/projects", status_code=status.HTTP_201_CREATED)
async def create_project(
    payload: CreateProjectRequest,
    user_id: str = Depends(get_current_user_id),
    db: Optional[AsyncSession] = Depends(get_db_session),
):
    """Creates a new project for the authenticated user."""
    if not db:
        raise HTTPException(status_code=500, detail="Database session unavailable")

    slug = payload.slug if payload.slug else _generate_slug(payload.name)
    if not slug:
        raise HTTPException(status_code=400, detail="Project slug cannot be empty. Provide a valid project name.")

    # Check uniqueness of slug per user
    existing = await Repository.list_projects(db, user_id)
    if any(p["slug"] == slug for p in existing):
        slug = f"{slug}-{str(ulid.new())[:6].lower()}"

    project = await Repository.create_project(
        db=db,
        user_id=user_id,
        name=payload.name,
        slug=slug,
        description=payload.description,
        color=payload.color,
        icon=payload.icon,
    )
    return project


@router.get("/projects/{project_id}")
async def get_project(
    project_id: str,
    user_id: str = Depends(get_current_user_id),
    db: Optional[AsyncSession] = Depends(get_db_session),
):
    """Gets a single project by ID, verifying ownership."""
    project = await Repository.get_project(db, project_id, user_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found or you do not have access to it.")
    return project


@router.put("/projects/{project_id}")
async def update_project(
    project_id: str,
    payload: UpdateProjectRequest,
    user_id: str = Depends(get_current_user_id),
    db: Optional[AsyncSession] = Depends(get_db_session),
):
    """Updates a project's metadata."""
    if not db:
        raise HTTPException(status_code=500, detail="Database session unavailable")

    project = await Repository.update_project(
        db=db,
        project_id=project_id,
        user_id=user_id,
        name=payload.name,
        description=payload.description,
        color=payload.color,
        icon=payload.icon,
    )
    if not project:
        raise HTTPException(status_code=404, detail="Project not found or you do not have access to it.")
    return project


@router.delete("/projects/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: str,
    user_id: str = Depends(get_current_user_id),
    db: Optional[AsyncSession] = Depends(get_db_session),
):
    """Deletes a project and all its resources (CASCADE). Requires at least 1 remaining project."""
    if not db:
        raise HTTPException(status_code=500, detail="Database session unavailable")

    count = await Repository.count_user_projects(db, user_id)
    if count <= 1:
        raise HTTPException(
            status_code=400,
            detail="Anda harus memiliki minimal 1 project aktif. Buat project baru sebelum menghapus project ini.",
        )

    deleted = await Repository.delete_project(db, project_id, user_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Project not found or you do not have access to it.")
