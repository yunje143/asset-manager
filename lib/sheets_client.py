from __future__ import annotations

import google.auth
import gspread
import pandas as pd
import streamlit as st

from lib import config
from lib.schema import TICKER_MAP_COLUMNS, TRANSACTIONS_COLUMNS

SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets.readonly",
    "https://www.googleapis.com/auth/drive.readonly",
]


class DataLoadError(RuntimeError):
    """Raised when data cannot be loaded from Google Sheets."""


@st.cache_resource(show_spinner=False)
def _get_gspread_client() -> gspread.Client:
    """Authenticate via Application Default Credentials — no key file anywhere.

    On Cloud Run this resolves automatically from the service account attached
    to the revision (metadata server). Locally, run
    `gcloud auth application-default login --impersonate-service-account=<SA email>`
    once so the same code path works on a dev machine.
    """
    try:
        credentials, _ = google.auth.default(scopes=SCOPES)
        return gspread.authorize(credentials)
    except Exception as exc:  # noqa: BLE001
        raise DataLoadError(
            "Google 認証に失敗しました。Cloud Run にサービスアカウントがアタッチされているか、"
            "ローカルでは `gcloud auth application-default login "
            f"--impersonate-service-account=<SAのメールアドレス>` を実行済みか確認してください。詳細: {exc}"
        ) from exc


def _fetch_worksheet_records(worksheet_name: str) -> list[dict]:
    client = _get_gspread_client()
    try:
        sheet = client.open_by_key(config.get_spreadsheet_id())
        worksheet = sheet.worksheet(worksheet_name)
        return worksheet.get_all_records()
    except gspread.exceptions.WorksheetNotFound as exc:
        raise DataLoadError(f"ワークシート '{worksheet_name}' が見つかりません。") from exc
    except gspread.exceptions.APIError as exc:
        raise DataLoadError(f"Google Sheets API エラー: {exc}") from exc


@st.cache_data(ttl=600, show_spinner="取引データを読み込み中...")
def load_transactions() -> pd.DataFrame:
    records = _fetch_worksheet_records(config.get_transactions_worksheet_name())
    df = pd.DataFrame(records, columns=TRANSACTIONS_COLUMNS)
    if df.empty:
        return df

    # Force ns resolution — gspread/yfinance can hand back different datetime64
    # units (s vs us vs ns) depending on the pandas version, and pd.merge_asof
    # requires an exact dtype match between the two sides.
    df["event_date"] = pd.to_datetime(df["event_date"], errors="coerce").astype("datetime64[ns]")
    df["amount"] = pd.to_numeric(df["amount"], errors="coerce").fillna(0.0)
    df["quantity"] = pd.to_numeric(df["quantity"], errors="coerce").fillna(0.0)
    df["row_id"] = pd.to_numeric(df["row_id"], errors="coerce")
    for col in ("asset_name", "category", "transaction_type", "sub_category"):
        df[col] = df[col].astype("string").str.strip()

    return df.dropna(subset=["event_date"]).reset_index(drop=True)


@st.cache_data(ttl=600, show_spinner="銘柄マッピングを読み込み中...")
def load_ticker_map() -> pd.DataFrame:
    try:
        records = _fetch_worksheet_records(config.get_ticker_map_worksheet_name())
    except DataLoadError:
        # ticker_map is a convenience lookup, not core data — missing tab degrades
        # gracefully to "no market valuation" rather than blocking the whole app.
        return pd.DataFrame(columns=TICKER_MAP_COLUMNS)

    df = pd.DataFrame(records, columns=TICKER_MAP_COLUMNS)
    if df.empty:
        return df

    df["asset_name"] = df["asset_name"].astype("string").str.strip()
    df["ticker"] = df["ticker"].astype("string").str.strip().replace("", pd.NA)
    # Bond rows have no yfinance ticker but carry maturity_date / coupon_rate instead —
    # so only asset_name is required, not ticker.
    df["maturity_date"] = pd.to_datetime(df["maturity_date"], errors="coerce").astype("datetime64[ns]")
    df["coupon_rate"] = pd.to_numeric(df["coupon_rate"], errors="coerce")
    return df.dropna(subset=["asset_name"]).reset_index(drop=True)
