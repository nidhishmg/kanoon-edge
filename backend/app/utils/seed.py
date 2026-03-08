from sqlalchemy.orm import Session

from app.models import User
from app.utils.auth import hash_password


def seed_dev_user(db: Session):
    """Create the default development user if it doesn't exist."""
    existing = db.query(User).filter(User.email == "user123").first()
    if existing:
        return existing

    dev_user = User(
        name="Advocate Rahul",
        email="user123",
        password_hash=hash_password("123"),
        role="lawyer",
        plan="pro",
    )
    db.add(dev_user)
    db.commit()
    db.refresh(dev_user)
    return dev_user
