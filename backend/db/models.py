from sqlalchemy import (
    Column,
    String,
    Float,
    DateTime,
    ForeignKey,
    Boolean
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import declarative_base, relationship
import uuid
from datetime import datetime

Base = declarative_base()

# -------------------------
# Agent Runs
# -------------------------
class AgentRun(Base):
    __tablename__ = "agent_runs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    role = Column(String, nullable=False)
    location = Column(String, nullable=False)
    experience = Column(String, nullable=False)
    skills = Column(String, nullable=True)

    status = Column(String, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)

    jobs = relationship("Job", back_populates="agent_run")


# -------------------------
# Companies
# -------------------------
class Company(Base):
    __tablename__ = "companies"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, unique=True, nullable=False)
    domain = Column(String, nullable=True)

    is_product_based = Column(Boolean, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    jobs = relationship("Job", back_populates="company")


# -------------------------
# Jobs
# -------------------------
class Job(Base):
    __tablename__ = "jobs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    agent_run_id = Column(UUID(as_uuid=True), ForeignKey("agent_runs.id"))
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id"))

    title = Column(String, nullable=False)
    location = Column(String, nullable=True)
    url = Column(String, nullable=False)
    source = Column(String, nullable=False)

    score = Column(Float, nullable=True)
    confidence = Column(String, nullable=True)
    email = Column(String, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    agent_run = relationship("AgentRun", back_populates="jobs")
    company = relationship("Company", back_populates="jobs")
