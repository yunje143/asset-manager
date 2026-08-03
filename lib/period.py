from __future__ import annotations

import pandas as pd

PERIOD_OPTIONS = ["1 Month", "3 Months", "6 Months", "12 Months", "24 Months", "All Time"]

_PERIOD_DAYS = {
    "1 Month": 30,
    "3 Months": 91,
    "6 Months": 182,
    "12 Months": 365,
    "24 Months": 730,
}


def get_period_start_date(
    period: str, reference_date: pd.Timestamp | None = None
) -> pd.Timestamp | None:
    if period == "All Time" or period not in _PERIOD_DAYS:
        return None
    reference_date = reference_date or pd.Timestamp.now().normalize()
    return reference_date - pd.Timedelta(days=_PERIOD_DAYS[period])


def filter_by_period(
    df: pd.DataFrame,
    period: str,
    date_col: str = "event_date",
    reference_date: pd.Timestamp | None = None,
) -> pd.DataFrame:
    """Filter df to rows on/after the period's start date. Used only for
    trend/activity views — point-in-time metrics (holdings, cost basis,
    market value) are always computed over all transactions regardless of
    the selected period.
    """
    if df.empty:
        return df
    start = get_period_start_date(period, reference_date)
    if start is None:
        return df
    return df[df[date_col] >= start]
