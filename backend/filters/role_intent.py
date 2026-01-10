from .text_utils import tokenize


ROLE_NOISE = {
    "engineer", "developer", "specialist", "expert",
    "associate", "junior", "senior", "lead", "intern",
    "role", "position", "level"
}


def derive_role_intent(role: str) -> list[str]:
    """
    Derives role intent ONLY from user input.
    No predefined roles.
    """
    tokens = tokenize(role)

    intent = set()
    for t in tokens:
        if t not in ROLE_NOISE:
            intent.add(t)

    return list(intent)
