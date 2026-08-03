from __future__ import annotations

import pandas as pd

from lib import market_data

# ---------------------------------------------------------------------------
# Shared
# ---------------------------------------------------------------------------


def attach_tickers(tx: pd.DataFrame, ticker_map: pd.DataFrame) -> pd.DataFrame:
    if tx.empty:
        return tx.assign(ticker=pd.Series(dtype="string"))
    return tx.merge(ticker_map, on="asset_name", how="left")


# ---------------------------------------------------------------------------
# Real estate (category == "tenant")
# ---------------------------------------------------------------------------


def monthly_real_estate_trend(tx: pd.DataFrame) -> pd.DataFrame:
    """Monthly income / expense / net / cumulative-net for real estate."""
    columns = ["month", "income", "expense", "net", "cumulative_net"]
    real_estate = tx[tx["category"] == "tenant"]
    if real_estate.empty:
        return pd.DataFrame(columns=columns)

    df = real_estate.copy()
    df["month"] = df["event_date"].dt.to_period("M").dt.to_timestamp()
    df["income"] = df["amount"].clip(lower=0)
    df["expense"] = -df["amount"].clip(upper=0)

    grouped = df.groupby("month", as_index=False)[["income", "expense"]].sum().sort_values("month")
    grouped["net"] = grouped["income"] - grouped["expense"]
    grouped["cumulative_net"] = grouped["net"].cumsum()
    return grouped.reset_index(drop=True)


def property_income_expense(tx: pd.DataFrame) -> pd.DataFrame:
    """Income vs expense totals per property, for the per-property comparison chart."""
    columns = ["asset_name", "income", "expense"]
    real_estate = tx[tx["category"] == "tenant"]
    if real_estate.empty:
        return pd.DataFrame(columns=columns)

    df = real_estate.copy()
    df["income"] = df["amount"].clip(lower=0)
    df["expense"] = -df["amount"].clip(upper=0)
    grouped = df.groupby("asset_name", as_index=False)[["income", "expense"]].sum()
    return grouped.sort_values("income", ascending=False).reset_index(drop=True)


# ---------------------------------------------------------------------------
# Bond / Stock holdings (category in ["bond", "stock"])
# ---------------------------------------------------------------------------


def holdings_summary(
    tx: pd.DataFrame, category: str, prices: pd.DataFrame | None = None
) -> pd.DataFrame:
    """Per-asset holding quantity + cost basis, and (stocks only) market value / P&L.

    Bonds never receive market valuation even if `prices` is passed —
    yfinance can't price individual corporate bonds, so bonds are shown at
    book value (cost basis) only, per the confirmed design decision.
    """
    base_columns = ["asset_name", "ticker", "quantity", "cost_basis"]
    bond_columns = base_columns + ["maturity_date", "coupon_rate", "coupon_received"]
    market_columns = base_columns + ["current_price", "market_value", "unrealized_pl", "unrealized_pl_pct"]

    subset = tx[tx["category"] == category]
    if subset.empty:
        columns = bond_columns if category == "bond" else market_columns
        return pd.DataFrame(columns=columns)

    purchases = subset[subset["amount"] < 0]
    grouped = subset.groupby(["asset_name", "ticker"], as_index=False, dropna=False).agg(
        quantity=("quantity", lambda s: s.abs().sum())
    )
    cost = purchases.groupby(["asset_name", "ticker"], as_index=False, dropna=False).agg(
        cost_basis=("amount", lambda s: s.abs().sum())
    )
    result = grouped.merge(cost, on=["asset_name", "ticker"], how="left")
    result["cost_basis"] = result["cost_basis"].fillna(0.0)

    if category == "bond":
        return _attach_bond_details(result, subset).reset_index(drop=True)

    if prices is None or prices.empty:
        return result.reset_index(drop=True)

    result["current_price"] = result["ticker"].apply(
        lambda t: market_data.latest_price(prices, t) if pd.notna(t) else None
    )
    result["market_value"] = result["current_price"] * result["quantity"]
    result["unrealized_pl"] = result["market_value"] - result["cost_basis"]
    result["unrealized_pl_pct"] = result.apply(
        lambda row: (row["unrealized_pl"] / row["cost_basis"] * 100) if row["cost_basis"] else None,
        axis=1,
    )
    return result.reset_index(drop=True)


def _attach_bond_details(result: pd.DataFrame, subset: pd.DataFrame) -> pd.DataFrame:
    """Merge in maturity_date / coupon_rate (static per bond, from ticker_map)
    and cumulative coupon income actually received (summed from the bond's own
    income transactions — not a theoretical rate x time calculation)."""
    meta_cols = [c for c in ("maturity_date", "coupon_rate") if c in subset.columns]
    if meta_cols:
        meta = subset[["asset_name", *meta_cols]].drop_duplicates("asset_name")
        result = result.merge(meta, on="asset_name", how="left")

    coupon = (
        subset[subset["amount"] > 0]
        .groupby("asset_name", as_index=False)["amount"]
        .sum()
        .rename(columns={"amount": "coupon_received"})
    )
    result = result.merge(coupon, on="asset_name", how="left")
    result["coupon_received"] = result["coupon_received"].fillna(0.0)
    return result


def attach_price_changes(holdings: pd.DataFrame, prices: pd.DataFrame) -> pd.DataFrame:
    """Add day-over-day / month-over-month price change columns to a stock holdings table."""
    result = holdings.copy()
    day_changes, month_changes = [], []
    for ticker in result["ticker"]:
        if pd.isna(ticker):
            day_changes.append(None)
            month_changes.append(None)
            continue
        current, day_past = market_data.price_change(prices, ticker, 1)
        _, month_past = market_data.price_change(prices, ticker, 30)
        day_changes.append(current - day_past if current is not None and day_past is not None else None)
        month_changes.append(
            current - month_past if current is not None and month_past is not None else None
        )
    result["day_change"] = day_changes
    result["month_change"] = month_changes
    return result


def portfolio_value_change(
    holdings: pd.DataFrame, prices: pd.DataFrame, days_back: int
) -> tuple[float, float | None]:
    """Total current market value and total value ~days_back days ago, assuming
    today's holding quantities (a personal-tool-level approximation for short
    day/month deltas, not a full point-in-time reconstruction)."""
    current_total = 0.0
    past_total = 0.0
    any_past = False
    for _, row in holdings.iterrows():
        ticker, qty = row.get("ticker"), row.get("quantity", 0.0)
        if pd.isna(ticker) or not qty:
            continue
        current, past = market_data.price_change(prices, ticker, days_back)
        if current is not None:
            current_total += current * qty
        if past is not None:
            past_total += past * qty
            any_past = True
    return current_total, (past_total if any_past else None)


def bond_cost_basis_trend(tx: pd.DataFrame) -> pd.DataFrame:
    """Cumulative bond cost basis invested, by month (bonds have no market
    price, so this stands in for the "trend" the summary card shows)."""
    columns = ["month", "cumulative_cost_basis"]
    bonds = tx[(tx["category"] == "bond") & (tx["amount"] < 0)]
    if bonds.empty:
        return pd.DataFrame(columns=columns)

    df = bonds.copy()
    df["month"] = df["event_date"].dt.to_period("M").dt.to_timestamp()
    df["cost"] = df["amount"].abs()
    grouped = df.groupby("month", as_index=False)["cost"].sum().sort_values("month")
    grouped["cumulative_cost_basis"] = grouped["cost"].cumsum()
    return grouped[columns].reset_index(drop=True)


def stock_market_value_trend(tx: pd.DataFrame, prices: pd.DataFrame) -> pd.DataFrame:
    """Daily total stock market value, respecting when each purchase happened
    (cumulative quantity as of each price date * that day's close price)."""
    columns = ["date", "market_value"]
    stocks = tx[tx["category"] == "stock"]
    if stocks.empty or prices.empty:
        return pd.DataFrame(columns=columns)

    frames = []
    for ticker, ticker_prices in prices.groupby("ticker"):
        ticker_tx = stocks[stocks["ticker"] == ticker]
        if ticker_tx.empty:
            continue
        purchases = (
            ticker_tx.groupby("event_date", as_index=False)
            .agg(qty_change=("quantity", lambda s: s.abs().sum()))
            .sort_values("event_date")
        )
        purchases["cumulative_qty"] = purchases["qty_change"].cumsum()

        merged = pd.merge_asof(
            ticker_prices.sort_values("date"),
            purchases[["event_date", "cumulative_qty"]],
            left_on="date",
            right_on="event_date",
            direction="backward",
        )
        merged["cumulative_qty"] = merged["cumulative_qty"].fillna(0.0)
        merged["market_value"] = merged["cumulative_qty"] * merged["close_price"]
        frames.append(merged[columns])

    if not frames:
        return pd.DataFrame(columns=columns)

    combined = pd.concat(frames, ignore_index=True)
    return combined.groupby("date", as_index=False)["market_value"].sum().sort_values("date").reset_index(
        drop=True
    )


# ---------------------------------------------------------------------------
# Total overview
# ---------------------------------------------------------------------------


def total_overview(
    tx: pd.DataFrame, bond_holdings: pd.DataFrame, stock_holdings: pd.DataFrame
) -> dict[str, float]:
    real_estate_net = float(tx.loc[tx["category"] == "tenant", "amount"].sum()) if not tx.empty else 0.0
    bond_total = float(bond_holdings["cost_basis"].sum()) if not bond_holdings.empty else 0.0
    if not stock_holdings.empty and "market_value" in stock_holdings.columns:
        stock_total = float(stock_holdings["market_value"].fillna(0).sum())
    else:
        stock_total = 0.0
    return {
        "tenant": real_estate_net,
        "bond": bond_total,
        "stock": stock_total,
        "total": real_estate_net + bond_total + stock_total,
    }


def total_overview_as_of(tx: pd.DataFrame, prices: pd.DataFrame, as_of: pd.Timestamp) -> dict[str, float]:
    """Same shape as total_overview(), but reconstructed as of a past date —
    used to compute the Total screen's period-over-period delta."""
    historical_tx = tx[tx["event_date"] <= as_of]
    bond_holdings = holdings_summary(historical_tx, "bond")
    stock_holdings = holdings_summary(historical_tx, "stock")

    if not stock_holdings.empty and prices is not None and not prices.empty:
        historical_prices = prices[prices["date"] <= as_of]
        stock_holdings = stock_holdings.copy()
        stock_holdings["current_price"] = stock_holdings["ticker"].apply(
            lambda t: market_data.latest_price(historical_prices, t) if pd.notna(t) else None
        )
        stock_holdings["market_value"] = stock_holdings["current_price"] * stock_holdings["quantity"]

    return total_overview(historical_tx, bond_holdings, stock_holdings)


_CATEGORY_LABELS = {"tenant": "不動産", "bond": "社債", "stock": "株式"}


def asset_composition_trend(
    tx: pd.DataFrame, prices: pd.DataFrame, start: pd.Timestamp | None
) -> pd.DataFrame:
    """Month-end snapshot of total value per category, long-format
    (month, category, value) for the Total screen's stacked-area chart.

    Reuses total_overview_as_of() at each month-end checkpoint — cheap at
    personal-tool scale (a few dozen months x a few hundred transactions).
    """
    columns = ["month", "category", "value"]
    if tx.empty:
        return pd.DataFrame(columns=columns)

    first_month = (start or tx["event_date"].min()).to_period("M").to_timestamp()
    last_month = pd.Timestamp.now().normalize().to_period("M").to_timestamp()
    if first_month > last_month:
        return pd.DataFrame(columns=columns)

    rows = []
    for month_start in pd.date_range(first_month, last_month, freq="MS"):
        as_of = month_start + pd.offsets.MonthEnd(0)
        snapshot = total_overview_as_of(tx, prices, as_of)
        for key, label in _CATEGORY_LABELS.items():
            rows.append({"month": month_start, "category": label, "value": snapshot[key]})

    return pd.DataFrame(rows, columns=columns)


def category_subcategory_flow(tx: pd.DataFrame) -> pd.DataFrame:
    """Total absolute transaction amount per (category, sub_category) — the
    flow-magnitude data behind the Total screen's Sankey ("where does money
    move within each asset category")."""
    columns = ["category", "sub_category", "amount"]
    if tx.empty:
        return pd.DataFrame(columns=columns)

    df = tx.copy()
    df["category"] = df["category"].map(_CATEGORY_LABELS).fillna(df["category"])
    grouped = df.groupby(["category", "sub_category"], as_index=False).agg(
        amount=("amount", lambda s: s.abs().sum())
    )
    return grouped[grouped["amount"] > 0].reset_index(drop=True)


def bond_remaining_ratio(tx: pd.DataFrame, asset_name: str, maturity_date) -> float | None:
    """Fraction (0-1) of a bond's holding period still remaining, anchored on
    its first purchase date. None when there isn't enough info to compute it."""
    if maturity_date is None or pd.isna(maturity_date):
        return None
    purchases = tx[
        (tx["asset_name"] == asset_name) & (tx["category"] == "bond") & (tx["amount"] < 0)
    ]
    if purchases.empty:
        return None
    start = purchases["event_date"].min()
    maturity = pd.Timestamp(maturity_date)
    total_days = (maturity - start).days
    if total_days <= 0:
        return None
    elapsed_days = (pd.Timestamp.now().normalize() - start).days
    remaining_ratio = 1 - (elapsed_days / total_days)
    return max(0.0, min(1.0, remaining_ratio))


def total_monthly_cashflow_trend(tx: pd.DataFrame) -> pd.DataFrame:
    """Combined monthly income / expense / net across all categories, for the
    Total screen's income/expense/net sparkline metrics. This is a flow view
    (resets to the selected period) — distinct from net worth, which is a
    point-in-time balance (see asset_composition_trend / total_overview)."""
    columns = ["month", "income", "expense", "net"]
    if tx.empty:
        return pd.DataFrame(columns=columns)
    df = tx.copy()
    df["month"] = df["event_date"].dt.to_period("M").dt.to_timestamp()
    df["income"] = df["amount"].clip(lower=0)
    df["expense"] = -df["amount"].clip(upper=0)
    grouped = df.groupby("month", as_index=False)[["income", "expense"]].sum().sort_values("month")
    grouped["net"] = grouped["income"] - grouped["expense"]
    return grouped.reset_index(drop=True)


def latest_month_over_month_delta(trend: pd.DataFrame, column: str) -> float | None:
    """Latest month's value minus the previous month's, for a monthly trend
    dataframe — drives the +/- delta (and its color) on a sparkline metric."""
    if len(trend) < 2:
        return None
    return float(trend[column].iloc[-1] - trend[column].iloc[-2])


def total_net_worth_trend(composition_trend: pd.DataFrame) -> pd.DataFrame:
    """Total net worth per month = sum across categories, derived from the
    same asset_composition_trend() output used for the stacked-area chart —
    so the net-worth sparkline and the composition chart always agree."""
    columns = ["month", "value"]
    if composition_trend.empty:
        return pd.DataFrame(columns=columns)
    return (
        composition_trend.groupby("month", as_index=False)["value"]
        .sum()
        .sort_values("month")
        .reset_index(drop=True)
    )
