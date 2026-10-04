"""Phone numbers — the identity of a grower who phones in instead of typing.

Its own module, with no imports from the app, so the data layer can use it at
start-up without a circular import (queries.py re-exports it).
"""
from __future__ import annotations


def normalize_phone(phone: str | None) -> str | None:
    """Any way a person writes a number -> one canonical '+998…' form.

    '+998 90 123-45-67', '998901234567' and '90 123 45 67' are the same grower,
    and the phone number is how an offline seller is recognised — so they must
    normalise to the same string. Nine digits is an Uzbek mobile number written
    without the country code (the way people say it out loud), and gets +998.
    Anything else keeps its digits as they are.
    """
    if not phone:
        return None
    digits = "".join(c for c in phone if c.isdigit())
    if not digits:
        return None
    if len(digits) == 9:
        digits = "998" + digits
    return f"+{digits}"
