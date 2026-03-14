from sqlalchemy.orm import Session

from app.models import User
from app.utils.auth import hash_password


def seed_dev_user(db: Session):
    """Create the default development user if it doesn't exist."""
    existing = db.query(User).filter(User.email == "nidish@kanoonedge.in").first()
    if existing:
        return existing

    dev_user = User(
        name="Nidish MG",
        email="nidish@kanoonedge.in",
        password_hash=hash_password("K@noonEdge#2026!"),
        role="lawyer",
        plan="pro",
    )
    db.add(dev_user)
    db.commit()
    db.refresh(dev_user)
    return dev_user
