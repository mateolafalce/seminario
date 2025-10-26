from pydantic import BaseModel, Field
from typing import Optional

class HorarioCreate(BaseModel):
    hora: str = Field(..., min_length=1, max_length=20)

class HorarioUpdate(BaseModel):
    hora: Optional[str] = Field(None, min_length=1, max_length=20)
