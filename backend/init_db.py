"""Database initialization script. Run once to create all tables."""
from app.database import Base, engine
from app.models import User, Generation  # noqa: F401

if __name__ == "__main__":
    Base.metadata.create_all(bind=engine)
    print("Database tables created successfully!")
