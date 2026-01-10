from filters.role_intent import derive_role_intent
from filters.skill_intent import derive_skill_intent


CAREER_SITES = [
    "boards.greenhouse.io",
    "jobs.lever.co"
]

PROFESSIONAL_SITES = [
    "linkedin.com/jobs",
    "wellfound.com"
]


def build_queries(user_input: dict) -> list[str]:
    role_tokens = derive_role_intent(user_input["role"])
    skill_tokens = derive_skill_intent(user_input["skills"])
    location = user_input["location"]

    base_phrases = []

    # Role + skill combinations
    for r in role_tokens:
        if skill_tokens:
            for s in skill_tokens:
                base_phrases.append(f"{r} {s} {location}")
        else:
            base_phrases.append(f"{r} {location}")

    queries = []

    # Career pages (highest quality)
    for site in CAREER_SITES:
        for phrase in base_phrases:
            queries.append(f'site:{site} "{phrase}"')

    # Professional boards
    for site in PROFESSIONAL_SITES:
        for phrase in base_phrases:
            queries.append(f'site:{site} "{phrase}"')

    # Direct hiring intent
    for phrase in base_phrases:
        queries.append(f'"{phrase}" careers hiring')

    # Cap to avoid explosion
    return queries[:15]
