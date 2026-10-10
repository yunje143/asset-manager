from __future__ import annotations

import pandas as pd
import streamlit as st
import yfinance as yf

PRICE_COLUMNS = ["date", "ticker", "open_price", "high_price", "low_price", "close_price"]


@st.cache_data(ttl=86400, show_spinner="株価データを取得中...")
def fetch_market_prices(tickers: tuple[str, ...]) -> tuple[pd.DataFrame, tuple[str, ...]]:
    """Fetch trailing 24 months of daily close prices for the given tickers.

    Only ever called with stock-category tickers — bonds are excluded by the
    caller since yfinance can't price individual corporate bonds.
    Returns (prices_df, failed_tickers) so one bad ticker never blanks the batch.
    """
    if not tickers:
        return pd.DataFrame(columns=PRICE_COLUMNS), ()

    frames = []
    failed = []
    for ticker in tickers:
        try:
            hist = yf.Ticker(ticker).history(period="24mo", interval="1d")
            if hist.empty:
                failed.append(ticker)
                continue
            frame = hist[["Open", "High", "Low", "Close"]].reset_index()
            frame = frame.rename(
                columns={
                    "Date": "date",
                    "Open": "open_price",
                    "High": "high_price",
                    "Low": "low_price",
                    "Close": "close_price",
                }
            )
            # Force ns resolution to match load_transactions()'s event_date —
            # pd.merge_asof requires an exact datetime64 dtype match.
            frame["date"] = pd.to_datetime(frame["date"]).dt.tz_localize(None).astype("datetime64[ns]")
            frame["ticker"] = ticker
            frames.append(frame[PRICE_COLUMNS])
        except Exception:  # noqa: BLE001
            failed.append(ticker)

    if not frames:
        return pd.DataFrame(columns=PRICE_COLUMNS), tuple(failed)

    prices = pd.concat(frames, ignore_index=True).sort_values(["ticker", "date"])
    return prices.reset_index(drop=True), tuple(failed)


def latest_price(prices: pd.DataFrame, ticker: str) -> float | None:
    subset = prices[prices["ticker"] == ticker]
    if subset.empty:
        return None
    return float(subset.sort_values("date").iloc[-1]["close_price"])


def price_change(prices: pd.DataFrame, ticker: str, days_back: int) -> tuple[float | None, float | None]:
    """Return (current close, close ~days_back calendar days ago) for a ticker."""
    subset = prices[prices["ticker"] == ticker].sort_values("date")
    if subset.empty:
        return None, None
    current_row = subset.iloc[-1]
    current = float(current_row["close_price"])
    target_date = current_row["date"] - pd.Timedelta(days=days_back)
    past = subset[subset["date"] <= target_date]
    if past.empty:
        return current, None
    return current, float(past.iloc[-1]["close_price"])
