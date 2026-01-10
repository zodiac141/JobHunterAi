from .role_intent import derive_role_intent
from .skill_intent import derive_skill_intent
from .experience_filter import experience_filter
from .location_filter import location_filter
from .freshness_filter import freshness_filter


def text_contains_any(text: str, tokens: list[str]) -> bool:
    text_n = text.lower()
    return any(t in text_n for t in tokens)


def is_job_relevant(job: dict, user_input: dict) -> bool:
    role_intent = derive_role_intent(user_input["role"])
    skill_intent = derive_skill_intent(user_input["skills"])

    if not text_contains_any(job["title"], role_intent):
        return False

    if skill_intent:
        combined = f"{job.get('description','')} {job.get('title','')}"
        if not text_contains_any(combined, skill_intent):
            return False

    if not experience_filter(job["title"], user_input["experience"]):
        return False

    if not location_filter(job.get("location", ""), user_input["location"]):
        return False

    if not freshness_filter(job.get("posted_at")):
        return False

    return True
