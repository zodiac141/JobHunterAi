from datetime import datetime, timedelta


def freshness_filter(posted_at: datetime | None) -> bool:
    if not posted_at:
        return False

    return posted_at >= datetime.utcnow() - timedelta(hours=48)
