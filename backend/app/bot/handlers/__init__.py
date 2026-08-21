"""Router registry.

Order matters:
  * cancel_router first  -> /cancel and the inline "cancel" button take priority
                            over any in-progress FSM step.
  * common_router last   -> its catch-all fallback only fires when nothing else
                            (including the menu buttons) matched.
"""
from __future__ import annotations

from aiogram import Router

from .admin import router as admin_router
from .buyer import router as buyer_router
from .start import cancel_router
from .start import router as common_router
from .profile import router as profile_router
from .add_listing import router as seller_router
from .web import router as web_router


def get_routers() -> list[Router]:
    return [
        cancel_router,
        web_router,  # /start login_<code> must win over the generic /start
        admin_router,  # admin_* callbacks and the AdminListing FSM, before the
                       # seller flow so neither can swallow the other's steps
        profile_router,
        seller_router,
        buyer_router,
        common_router,
    ]
