import re


JUNK_TITLE_PATTERNS = [
    r"\bjobs?\b",
    r"\d+\s+jobs",
    r"vacancies",
    r"openings",
]

JUNK_URL_PATTERNS = [
    "/jobs-in-",
    "/search?",
    "glassdoor",
    "naukri",
    "indeed",
]


def is_valid_job_page(title: str, url: str) -> bool:
    title_l = title.lower()
    url_l = url.lower()

    for p in JUNK_TITLE_PATTERNS:
        if re.search(p, title_l):
            return False

    for p in JUNK_URL_PATTERNS:
        if p in url_l:
            return False

    # must look like a real job
    if not any(x in title_l for x in ["engineer", "developer", "analyst", "scientist", "designer"]):
        return False

    return True
