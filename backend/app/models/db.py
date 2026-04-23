"""SQLite cache — MLB API is rate-limited soft, but we don't want to refetch
every enriched pitcher on every page load. We store a daily snapshot."""
from __future__ import annotations

from sqlalchemy import Column, Date, DateTime, Float, Integer, String, Text, create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

Base = declarative_base()


class DailySnapshot(Base):
    __tablename__ = "daily_snapshot"
    id = Column(Integer, primary_key=True, autoincrement=True)
    on_date = Column(Date, index=True, nullable=False)
    payload = Column(Text, nullable=False)          # JSON blob of the whole day
    generated_at = Column(DateTime, nullable=False)


class PitcherCache(Base):
    """Narrow per-pitcher cache, good for detail pages across the session."""
    __tablename__ = "pitcher_cache"
    person_id = Column(Integer, primary_key=True)
    season = Column(Integer, primary_key=True)
    payload = Column(Text, nullable=False)
    updated_at = Column(DateTime, nullable=False)


engine = create_engine(
    "sqlite:///diamond_scout.db",
    connect_args={"check_same_thread": False},
)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def init_db() -> None:
    Base.metadata.create_all(bind=engine)
