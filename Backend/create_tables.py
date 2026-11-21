from database import engine, Base

# Existing user model
from models.user import User
from models.substation import Substation
from models.equipment_type import EquipmentType
from models.equipment import Equipment
from models.asset_schedule import AssetSchedule
from models.transformer_bdv import TransformerBDV
from models.transformer_test_reading import TransformerTestReading

# Create missing tables
Base.metadata.create_all(bind=engine)

print("Database tables created successfully!")