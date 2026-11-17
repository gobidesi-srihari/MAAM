from getpass import getpass

from database import SessionLocal
from models.user import User
from security import hash_password


def create_admin():
    db = SessionLocal()

    try:
        print("Create MAAM Administrator Account")

        full_name = input("Enter administrator name: ").strip()
        username = input("Enter administrator username: ").strip()
        password = getpass("Enter administrator password: ")
        confirm_password = getpass("Confirm administrator password: ")

        if not full_name or not username or not password:
            print("Error: All fields are required.")
            return

        if password != confirm_password:
            print("Error: Passwords do not match.")
            return

        if db.query(User).filter(User.username == username).first():
            print("Error: Username already exists.")
            return

        admin = User(
            full_name=full_name,
            username=username,
            password_hash=hash_password(password),
            role="admin",
            is_active=True,
            created_by=None
        )

        db.add(admin)
        db.commit()

        print("\nAdministrator account created successfully!")

    except Exception as error:
        db.rollback()
        print("Error creating administrator:", error)

    finally:
        db.close()


if __name__ == "__main__":
    create_admin()