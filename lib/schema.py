from __future__ import annotations

TRANSACTIONS_COLUMNS = [
    "row_id",
    "asset_name",
    "category",
    "event_date",
    "transaction_type",
    "sub_category",
    "amount",
    "quantity",
]

TICKER_MAP_COLUMNS = ["asset_name", "ticker", "maturity_date", "coupon_rate"]

CATEGORIES = ("tenant", "bond", "stock")
TRANSACTION_TYPES = ("income", "expense")
