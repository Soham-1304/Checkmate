from typing import Any, Optional
from fastapi import HTTPException, status


class EntityNotFoundException(HTTPException):
    def __init__(self, entity_name: str, entity_id: Any):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"{entity_name} with id {entity_id} was not found.",
        )


class PermissionDeniedException(HTTPException):
    def __init__(self, message: str = "Not authorized to perform this operation."):
        super().__init__(status_code=status.HTTP_403_FORBIDDEN, detail=message)


class InvalidWorkflowStateException(HTTPException):
    def __init__(self, current_state: str, attempted_action: str):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot execute '{attempted_action}' while state is '{current_state}'.",
        )
