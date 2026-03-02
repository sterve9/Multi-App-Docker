from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base
import os

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL non définie")

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=300,
    pool_size=5,
    max_overflow=10,
)

# Engine sans pool pour le pipeline async
engine_no_pool = create_engine(
    DATABASE_URL,
    poolclass=__import__('sqlalchemy.pool', fromlist=['NullPool']).NullPool,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
SessionDirect = sessionmaker(autocommit=False, autoflush=False, bind=engine_no_pool)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()