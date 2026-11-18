from database import engine, Base

# Existing user model
from models.user import User

# New substation model
from models.substation import Substation

# Create missing tables
Base.metadata.create_all(bind=engine)

print("Database tables created successfully!")