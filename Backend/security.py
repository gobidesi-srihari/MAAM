from pwdlib import PasswordHash

# Create Argon2 password hashing instance
password_hash = PasswordHash.recommended()


# Hash a plain-text password before storing it
def hash_password(password: str) -> str:
    return password_hash.hash(password)


# Verify a password during login
def verify_password(
    plain_password: str,
    hashed_password: str
) -> bool:
    return password_hash.verify(
        plain_password,
        hashed_password
    )