
# Import the database engine and Base
from database import engine, Base

# Import models so SQLAlchemy knows about the tables
from models.user import User

# Create all registered database tables
Base.metadata.create_all(bind=engine)

print("Database tables created successfully!")
