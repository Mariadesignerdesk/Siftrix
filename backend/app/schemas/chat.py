
"""Validated request schemas for the SIFTRIX AI chat endpoint."""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class ChatHistoryMessage(BaseModel):
    """A single previous user or assistant message."""

    model_config = ConfigDict(str_strip_whitespace=True)

    role: Literal["user", "assistant"]
    content: str = Field(..., min_length=1, max_length=4000)

    @field_validator("content")
    @classmethod
    def reject_blank_content(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Message content cannot be blank")
        return value


class ChatRequest(BaseModel):
    """Incoming chatbot prompt and recent conversation context."""

    model_config = ConfigDict(str_strip_whitespace=True)

    prompt: str = Field(..., min_length=1, max_length=4000)
    history: list[ChatHistoryMessage] = Field(
        default_factory=list,
        max_length=6,
    )

    @field_validator("prompt")
    @classmethod
    def reject_blank_prompt(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Prompt cannot be blank")
        return value
