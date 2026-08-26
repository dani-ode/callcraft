"""
Internal router package — aggregates all sub-routers under the /internal/v1 prefix.
"""
from callcraft_api.routers.internal._deps import router, get_current_user_id  # noqa: F401
from callcraft_api.db.session import get_db_session  # noqa: F401

# Import sub-modules to register their routes on the shared router instance
from callcraft_api.routers.internal import app      # noqa: F401
from callcraft_api.routers.internal import specs    # noqa: F401
from callcraft_api.routers.internal import templates  # noqa: F401
from callcraft_api.routers.internal import keys     # noqa: F401
from callcraft_api.routers.internal import users    # noqa: F401
from callcraft_api.routers.internal import projects  # noqa: F401
from callcraft_api.routers.internal import models    # noqa: F401
