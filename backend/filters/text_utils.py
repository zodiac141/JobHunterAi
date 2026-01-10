import re


def normalize(text: str) -> str:
    return text.lower().strip()


def tokenize(text: str) -> list[str]:
    return [
        t for t in re.split(r"[\/,\-\|\s]+", normalize(text))
        if t and len(t) > 2
    ]
