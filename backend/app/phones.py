"""Phone numbers — the identity of a grower who phones in instead of typing.

Its own module, with no imports from the app, so the data layer can use it at
start-up without a circular import (queries.py re-exports it).
"""
from __future__ import annotations

import unicodedata

# E.164: a full international number has at most 15 digits. Anything longer is
# not a phone number — and '+' plus 32 digits would not fit the VARCHAR(32)
# columns either.
MAX_DIGITS = 15
# The shortest thing anyone has typed for a real number (a local landline).
MIN_DIGITS = 7


def phone_digits(phone: str | None) -> str:
    """The ASCII digits of a number, whatever script they were typed in.

    Telegram keyboards can send Arabic-Indic ('٩٠') or full-width ('９０')
    digits. They are the same number, so they become '90' — never left as
    they are, because a tel: link or a SQL '\\d' would not see them as digits.
    """
    out = []
    for char in phone or "":
        value = unicodedata.decimal(char, None)
        if value is not None:
            out.append(str(value))
    return "".join(out)


def normalize_phone(phone: str | None) -> str | None:
    """Any way a person writes a number -> one canonical '+998…' form.

    '+998 90 123-45-67', '998901234567' and '90 123 45 67' are the same grower,
    and the phone number is how an offline seller is recognised — so they must
    normalise to the same string. Nine digits is an Uzbek mobile number written
    without the country code (the way people say it out loud), and gets +998.
    Anything else keeps its digits as they are. More than 15 digits is not a
    phone number at all -> None.
    """
    digits = phone_digits(phone)
    if not digits:
        return None
    if len(digits) == 9:
        digits = "998" + digits
    if len(digits) > MAX_DIGITS:
        return None
    return f"+{digits}"


def checked_phone(value: str | None) -> str | None:
    """For request validators: empty passes through, anything else must be a
    7–15 digit number and comes back canonical — or ValueError, i.e. a 422
    instead of junk in the database."""
    if not value or not value.strip():
        return value
    digits = phone_digits(value)
    canonical = normalize_phone(value)
    if canonical is None or len(digits) < MIN_DIGITS:
        raise ValueError("telefon raqami 7–15 ta raqamdan iborat bo'lishi kerak")
    return canonical
