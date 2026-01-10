from .text_utils import tokenize


def derive_skill_intent(skills: str) -> list[str]:
    """
    Skills are taken exactly as user input.
    No inference, no guessing.
    """
    return list(set(tokenize(skills)))
