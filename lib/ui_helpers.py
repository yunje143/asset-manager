from __future__ import annotations

from typing import Callable

import pandas as pd
import streamlit as st

from lib import config
from lib.period import PERIOD_OPTIONS


DEFAULT_PERIOD = "12 Months"


def render_sidebar_period_filter() -> str:
    st.sidebar.header("期間フィルター")
    return st.sidebar.selectbox(
        "集計期間",
        PERIOD_OPTIONS,
        index=PERIOD_OPTIONS.index(DEFAULT_PERIOD),
        key="period",
        help=(
            "推移グラフと期間比較の集計範囲を指定します。"
            "保有数量・簿価・評価額などの現在値は常に全期間で集計されます。"
        ),
    )


def empty_state(message: str) -> None:
    st.info(message)


def format_jpy(value: float | None) -> str:
    if value is None or pd.isna(value):
        return "N/A"
    return f"¥{value:,.0f}"


def format_delta_jpy(value: float | None) -> str:
    if value is None or pd.isna(value):
        return "N/A"
    sign = "+" if value >= 0 else ""
    return f"{sign}¥{value:,.0f}"


def format_pct(value: float | None) -> str:
    if value is None or pd.isna(value):
        return "N/A"
    return f"{value:+.2f}%"


def format_rate(value: float | None) -> str:
    """Unsigned rate, e.g. a bond's coupon rate — no +/- prefix like a delta."""
    if value is None or pd.isna(value):
        return "N/A"
    return f"{value:.2f}%"


def format_maturity_date(value) -> str:
    if value is None or pd.isna(value):
        return "N/A"
    return pd.Timestamp(value).strftime("%Y-%m-%d")


def format_remaining_period(value, reference_date: pd.Timestamp | None = None) -> str:
    """Time left until a bond's maturity_date, e.g. '残り9年6ヶ月' / '満期済み'."""
    if value is None or pd.isna(value):
        return "N/A"
    reference_date = reference_date or pd.Timestamp.now().normalize()
    days_left = (pd.Timestamp(value) - reference_date).days
    if days_left < 0:
        return "満期済み"
    years, remaining_days = divmod(days_left, 365)
    months = remaining_days // 30
    if years > 0:
        return f"残り{years}年{months}ヶ月"
    if months > 0:
        return f"残り{months}ヶ月"
    return f"残り{days_left}日"


def run_page(main: Callable[[], None]) -> None:
    """Run a page's render function with a generic error boundary, so a bug
    in one section doesn't take down the whole page with a raw traceback."""
    try:
        main()
    except Exception as exc:  # noqa: BLE001
        st.error("ページの表示中にエラーが発生しました。")
        if config.is_debug():
            st.exception(exc)
