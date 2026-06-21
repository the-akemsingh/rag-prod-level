from sqlalchemy import ForeignKey, Text, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column
from db.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        autoincrement=True
    )

    email: Mapped[str] = mapped_column(
        unique=True,
        index=True
    )

    name: Mapped[str]

    google_id: Mapped[str | None]


class Chat(Base):
    __tablename__ = "chats"

    id: Mapped[str] = mapped_column(primary_key=True)

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        index=True,
        nullable=False
    )

    title: Mapped[str | None]

    created_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now()
    )


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[str] = mapped_column(
        primary_key=True,
        unique=True
    )

    document_name: Mapped[str]

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        index=True,
        nullable=False
    )

    chat_id: Mapped[str] = mapped_column(
        ForeignKey("chats.id"),
        index=True,
        nullable=False
    )

    is_embedded: Mapped[bool] = mapped_column(
        default=False
    )


class Message(Base):
    __tablename__ = "messages"

    id: Mapped[str] = mapped_column(primary_key=True)

    chat_id: Mapped[str] = mapped_column(
        ForeignKey("chats.id"),
        index=True,
        nullable=False
    )

    role: Mapped[str]  # "user" | "assistant" | "document"

    content: Mapped[str] = mapped_column(Text)

    created_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now()
    )