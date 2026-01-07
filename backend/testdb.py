from db.session import engine

with engine.connect() as conn:
    print("✅ Connected to PostgreSQL successfully")
