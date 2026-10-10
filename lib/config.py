from __future__ import annotations

import os

import streamlit as st


class ConfigError(RuntimeError):
    """Raised when required configuration is missing."""


def get_spreadsheet_id() -> str:
    if "sheets" in st.secrets and st.secrets["sheets"].get("spreadsheet_id"):
        return st.secrets["sheets"]["spreadsheet_id"]
    value = os.environ.get("SPREADSHEET_ID")
    if not value:
        raise ConfigError(
            "スプレッドシートIDが見つかりません。"
            ".streamlit/secrets.toml の [sheets].spreadsheet_id か、"
            "環境変数 SPREADSHEET_ID を設定してください。"
        )
    return value


def _get_worksheet_name(secrets_key: str, env_key: str, default: str) -> str:
    if "sheets" in st.secrets and st.secrets["sheets"].get(secrets_key):
        return st.secrets["sheets"][secrets_key]
    return os.environ.get(env_key, default)


def get_transactions_worksheet_name() -> str:
    return _get_worksheet_name("transactions_worksheet", "TRANSACTIONS_WORKSHEET", "transactions")


def get_ticker_map_worksheet_name() -> str:
    return _get_worksheet_name("ticker_map_worksheet", "TICKER_MAP_WORKSHEET", "ticker_map")


def is_debug() -> bool:
    if "app" in st.secrets and "debug" in st.secrets["app"]:
        return bool(st.secrets["app"]["debug"])
    return os.environ.get("APP_DEBUG", "").lower() in {"1", "true", "yes"}
