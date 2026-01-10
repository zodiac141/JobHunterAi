def experience_filter(title: str, experience: str) -> bool:
    title_n = title.lower()

    if experience in ["fresher", "0-1", "entry"]:
        forbidden = [
            "2+", "3+", "4+", "5+",
            "senior", "staff", "principal",
            "lead", "manager", "architect"
        ]
        return not any(f in title_n for f in forbidden)

    if experience in ["mid", "2-4"]:
        return not any(x in title_n for x in ["staff", "principal", "director"])

    return True
