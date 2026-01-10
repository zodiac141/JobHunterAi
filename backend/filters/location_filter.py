def location_filter(job_location: str, user_location: str) -> bool:
    jl = job_location.lower()
    ul = user_location.lower()

    if "remote" in jl:
        return True

    return ul in jl
