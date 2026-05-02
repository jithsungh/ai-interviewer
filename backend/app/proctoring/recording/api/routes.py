from __future__ import annotations

import time
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, File, UploadFile, status
from sqlalchemy.orm import Session

from app.bootstrap.dependencies import get_db_session_with_commit, get_identity
from app.shared.auth_context import IdentityContext
from app.shared.observability import get_context_logger
from app.proctoring.persistence.models import ProctoringRecordingModel
from app.config import settings as global_settings

logger = get_context_logger(__name__)

router = APIRouter()


async def _upload_to_azure_blob(
    org_id: int | None,
    submission_id: int,
    artifact_id: str,
    recording: UploadFile,
) -> tuple[str, int]:
    """Upload recording blob to Azure Blob Storage (required).
    
    Returns (blob_path, file_size_bytes) where blob_path is the path in the container.
    """
    from azure.storage.blob import BlobClient
    
    azure_settings = global_settings.azure_storage
    blob_path = f"proctoring_recordings/{org_id or 'org'}/{submission_id}/{artifact_id}.webm"
    
    blob_client = BlobClient(
        account_url=azure_settings.account_url,
        container_name=azure_settings.azure_container_recordings,
        blob_name=blob_path,
        credential=azure_settings.azure_storage_account_key,
    )
    
    # Read file into memory and upload
    content = await recording.read()
    blob_client.upload_blob(content, overwrite=True)
    
    logger.info(f"Uploaded recording {artifact_id} to Azure Blob at {blob_path}")
    return blob_path, len(content)


@router.post(
    "/recordings/{submission_id}/upload",
    status_code=status.HTTP_202_ACCEPTED,
    summary="Upload a screen recording for a submission",
)
async def upload_screen_recording(
    submission_id: int,
    recording: UploadFile = File(...),
    session: Session = Depends(get_db_session_with_commit),
    identity: IdentityContext = Depends(get_identity),
) -> dict:
    """Accept an uploaded recording blob and persist metadata to Azure Blob Storage.
    
    Uses Azure Blob Storage exclusively (required).
    Returns artifact id and storage path.
    """
    org_id = identity.organization_id

    # Generate artifact id
    artifact_id = f"{submission_id}-{int(time.time() * 1000)}"

    started_at = datetime.now(timezone.utc)
    try:
        # Upload to Azure Blob Storage (exclusive)
        storage_path, size_bytes = await _upload_to_azure_blob(
            org_id, submission_id, artifact_id, recording
        )

        completed_at = datetime.now(timezone.utc)

        # Persist metadata
        model = ProctoringRecordingModel(
            interview_submission_id=submission_id,
            artifact_id=artifact_id,
            storage_path=storage_path,
            mime_type=recording.content_type or 'video/webm',
            file_size_bytes=size_bytes,
            upload_started_at=started_at,
            upload_completed_at=completed_at,
        )
        session.add(model)
        session.flush()

        logger.info(f"Persisted recording artifact {artifact_id} for submission {submission_id}")
        return {
            "artifactId": artifact_id,
            "storagePath": storage_path,
            "sizeBytes": size_bytes,
        }
    except Exception as exc:
        logger.error(f"Failed to persist recording for submission {submission_id}: {exc}", exc_info=True)
        raise


@router.get(
    "/recordings/{submission_id}/playback/{artifact_id}",
    status_code=status.HTTP_200_OK,
    summary="Get presigned URL for a recording",
)
async def get_playback(
    submission_id: int,
    artifact_id: str,
    session: Session = Depends(get_db_session_with_commit),
    identity: IdentityContext = Depends(get_identity),
):
    """Return a presigned SAS URL for a persisted recording from Azure Blob Storage.
    
    Uses Azure Blob Storage exclusively (required).
    """
    # Lookup recording
    rec = (
        session.query(ProctoringRecordingModel)
        .filter(
            ProctoringRecordingModel.interview_submission_id == submission_id,
            ProctoringRecordingModel.artifact_id == artifact_id,
        )
        .one_or_none()
    )
    if not rec:
        return {"error": "recording_not_found"}

    # Generate presigned SAS URL from Azure Blob Storage
    try:
        from azure.storage.blob import BlobSasPermissions, generate_blob_sas
        
        azure_settings = global_settings.azure_storage
        
        # Generate SAS URL (read-only, expires based on configuration)
        sas_token = generate_blob_sas(
            account_name=azure_settings.azure_storage_account_name,
            container_name=azure_settings.azure_container_recordings,
            blob_name=rec.storage_path,
            account_key=azure_settings.azure_storage_account_key,
            permission=BlobSasPermissions(read=True),
            expiry=datetime.utcnow() + timedelta(hours=azure_settings.azure_sas_token_expiry_hours),
        )
        
        presigned_url = f"{azure_settings.account_url}/{azure_settings.azure_container_recordings}/{rec.storage_path}?{sas_token}"
        logger.info(f"Generated presigned URL for recording {artifact_id}")
        return {"presigned_url": presigned_url}
    except Exception as exc:
        logger.error(f"Failed to generate presigned Azure URL: {exc}", exc_info=True)
        return {"error": "failed_to_generate_url"}

