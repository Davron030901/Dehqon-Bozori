"""Finite-state-machine state groups used across the bot."""
from __future__ import annotations

from aiogram.fsm.state import State, StatesGroup


class CreateListing(StatesGroup):
    category = State()
    title = State()
    price = State()
    unit = State()
    quantity = State()
    region = State()
    district = State()
    description = State()
    photo = State()
    phone = State()
    confirm = State()


class Browse(StatesGroup):
    results = State()


class Search(StatesGroup):
    query = State()


class EditListing(StatesGroup):
    price = State()


class ProfileEdit(StatesGroup):
    phone = State()
    region = State()
    village = State()


class AdminListing(StatesGroup):
    """The founder posting on behalf of a grower who phoned instead of typing.

    Same shape as CreateListing, but it starts by asking whose produce this is —
    the seller's phone number is the identity that ties the listing to a person.
    """

    seller_phone = State()
    seller_name = State()
    category = State()
    title = State()
    price = State()
    unit = State()
    quantity = State()
    region = State()
    district = State()
    photo = State()
    confirm = State()
