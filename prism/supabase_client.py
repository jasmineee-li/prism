import os
from functools import lru_cache
from supabase import create_client, Client


@lru_cache(maxsize=1)
def get_supabase_client() -> Client:
    """Return a singleton Supabase client instance configured via environment variables.

    Requires the following environment variables to be set:
    - SUPABASE_URL: The base URL of the Supabase project (e.g. https://xyzcompany.supabase.co)
    - SUPABASE_SERVICE_KEY: A service role key with full access privileges. **Keep this secret!**
    """
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv(
        "SUPABASE_SERVICE_KEY"
    )  # Use the SERVICE_ROLE key on the server side.

    if not supabase_url or not supabase_key:
        raise RuntimeError(
            "SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables must be set to connect to Supabase."
        )

    return create_client(supabase_url, supabase_key)
