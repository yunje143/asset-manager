from __future__ import annotations

import altair as alt
import pandas as pd

_CATEGORY_LABELS = {"tenant": "不動産", "bond": "社債", "stock": "株式"}


def real_estate_monthly_bar_chart(trend: pd.DataFrame) -> alt.Chart:
    """Monthly income vs expense, grouped bars — single y-axis (amount)."""
    return (
        alt.Chart(trend)
        .transform_fold(["income", "expense"], as_=["種別", "金額"])
        .mark_bar()
        .encode(
            x=alt.X("month:T", title="月"),
            y=alt.Y("金額:Q", title="金額"),
            color=alt.Color("種別:N", title=""),
            xOffset="種別:N",
        )
        .properties(height=320)
    )


def real_estate_property_bar_chart(summary: pd.DataFrame) -> alt.Chart:
    """Horizontal income vs expense bars per property."""
    long_df = summary.melt(
        id_vars="asset_name", value_vars=["income", "expense"], var_name="種別", value_name="金額"
    )
    return (
        alt.Chart(long_df)
        .mark_bar()
        .encode(
            x=alt.X("金額:Q", title="金額"),
            y=alt.Y("asset_name:N", title="物件", sort="-x"),
            color=alt.Color("種別:N", title=""),
            yOffset="種別:N",
        )
        .properties(height=320)
    )


def asset_distribution_donut_option(breakdown: dict[str, float]) -> dict:
    """streamlit-echarts option for the Total screen's category-share donut."""
    data = [
        {"value": round(value, 2), "name": _CATEGORY_LABELS.get(key, key)}
        for key, value in breakdown.items()
        if value
    ]
    return {
        "tooltip": {"trigger": "item"},
        "legend": {"top": "bottom"},
        "series": [
            {
                "name": "資産配分",
                "type": "pie",
                "radius": ["45%", "70%"],
                "avoidLabelOverlap": True,
                "label": {"show": True, "formatter": "{b}: {d}%"},
                "data": data,
            }
        ],
    }


def asset_composition_trend_option(trend: pd.DataFrame) -> dict:
    """streamlit-echarts stacked-area option for the Total screen's
    category-composition-over-time chart. `trend` is long-format
    (month, category, value) from calculations.asset_composition_trend()."""
    months = sorted(trend["month"].unique())
    month_labels = [pd.Timestamp(m).strftime("%Y-%m") for m in months]
    categories = [label for label in _CATEGORY_LABELS.values() if label in set(trend["category"])]

    series = []
    for category in categories:
        by_month = trend[trend["category"] == category].set_index("month")["value"]
        data = [round(float(by_month.get(m, 0.0)), 0) for m in months]
        series.append(
            {
                "name": category,
                "type": "line",
                "stack": "total",
                "areaStyle": {},
                "emphasis": {"focus": "series"},
                "data": data,
            }
        )

    return {
        "tooltip": {"trigger": "axis"},
        "legend": {"data": categories},
        "xAxis": {"type": "category", "boundaryGap": False, "data": month_labels},
        "yAxis": {"type": "value"},
        "series": series,
    }


def category_flow_sankey_option(flow: pd.DataFrame) -> dict:
    """streamlit-echarts Sankey option showing, per asset category, how much
    money moved through each transaction type (rent/purchase/coupon/tax/...)."""
    node_names = sorted(set(flow["category"]) | set(flow["sub_category"]))
    nodes = [{"name": name} for name in node_names]
    links = [
        {
            "source": row["category"],
            "target": row["sub_category"],
            "value": round(float(row["amount"]), 0),
        }
        for _, row in flow.iterrows()
    ]
    return {
        "tooltip": {"trigger": "item", "triggerOn": "mousemove"},
        "series": [
            {
                "type": "sankey",
                "layout": "none",
                "emphasis": {"focus": "adjacency"},
                "data": nodes,
                "links": links,
                "lineStyle": {"color": "gradient", "curveness": 0.5},
            }
        ],
    }


def candlestick_option(prices: pd.DataFrame) -> dict:
    """streamlit-echarts candlestick option for one ticker's OHLC price
    history. Red = up day, blue = down day (JP market chart convention)."""
    df = prices.sort_values("date")
    dates = df["date"].dt.strftime("%Y-%m-%d").tolist()
    ohlc = df[["open_price", "close_price", "low_price", "high_price"]].round(2).values.tolist()
    return {
        "tooltip": {"trigger": "axis"},
        "xAxis": {"type": "category", "data": dates, "scale": True},
        "yAxis": {"type": "value", "scale": True},
        "dataZoom": [{"type": "inside"}, {"type": "slider"}],
        "series": [
            {
                "type": "candlestick",
                "data": ohlc,
                "itemStyle": {
                    "color": "#ef4444",
                    "color0": "#3b82f6",
                    "borderColor": "#ef4444",
                    "borderColor0": "#3b82f6",
                },
            }
        ],
    }


def bond_maturity_gauge_option(remaining_pct: float, detail_label: str) -> dict:
    """streamlit-echarts gauge option showing % of a bond's holding period
    still remaining until maturity."""
    return {
        "series": [
            {
                "type": "gauge",
                "min": 0,
                "max": 100,
                "progress": {"show": True, "width": 14},
                "axisLine": {"lineStyle": {"width": 14}},
                "axisLabel": {"fontSize": 10},
                "pointer": {"show": True},
                "detail": {
                    "valueAnimation": True,
                    "formatter": detail_label,
                    "fontSize": 14,
                    "offsetCenter": [0, "70%"],
                },
                "data": [{"value": round(remaining_pct, 1), "name": "残存"}],
            }
        ]
    }
