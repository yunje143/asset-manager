from __future__ import annotations

import streamlit as st
from streamlit_echarts import st_echarts

from lib import calculations, charts, config
from lib import period as period_lib
from lib import sheets_client, ui_helpers

try:
    tx_raw = sheets_client.load_transactions()
    ticker_map = sheets_client.load_ticker_map()
except (config.ConfigError, sheets_client.DataLoadError) as exc:
    st.error(f"データの読み込みに失敗しました: {exc}")
    st.stop()

st.header(":material/account_balance: 社債")

if tx_raw.empty:
    ui_helpers.empty_state(
        "取引データがまだありません。Google スプレッドシートの `transactions` シートに"
        "データを入力してください。"
    )
    st.stop()

tx = calculations.attach_tickers(tx_raw, ticker_map)


def main() -> None:
    period = ui_helpers.render_sidebar_period_filter()

    bond_tx = tx[tx["category"] == "bond"]
    if bond_tx.empty:
        ui_helpers.empty_state("社債の取引データがありません。")
        return

    holdings = calculations.holdings_summary(tx, "bond")
    total_cost_basis = float(holdings["cost_basis"].sum())
    total_coupon_received = float(holdings["coupon_received"].sum()) if not holdings.empty else 0.0

    trend = calculations.bond_cost_basis_trend(tx)
    period_start = period_lib.get_period_start_date(period)
    if period_start is not None and not trend.empty:
        past = trend[trend["month"] <= period_start]
        past_value = float(past["cumulative_cost_basis"].iloc[-1]) if not past.empty else 0.0
        delta = total_cost_basis - past_value
    else:
        delta = None

    st.subheader(":material/summarize: サマリー")
    metric_col1, metric_col2 = st.columns(2)
    metric_col1.metric(
        "社債 簿価合計",
        ui_helpers.format_jpy(total_cost_basis),
        delta=ui_helpers.format_delta_jpy(delta) if delta is not None else None,
    )
    metric_col2.metric("累計受取クーポン", ui_helpers.format_jpy(total_coupon_received))
    st.caption(
        "社債は個別銘柄の時価を yfinance から取得できないため、評価額・評価損益は表示せず"
        "簿価（取得コストの累計）のみを表示しています。累計受取クーポンは実際の利金・償還差益等の"
        "入金取引（`income`）の合計です。"
    )

    trend_display = period_lib.filter_by_period(trend, period, date_col="month")
    if trend_display.empty:
        ui_helpers.empty_state("この期間の社債投資データがありません。")
    else:
        st.line_chart(trend_display.set_index("month")["cumulative_cost_basis"])

    with_maturity = holdings.dropna(subset=["maturity_date"])
    if not with_maturity.empty:
        st.subheader(":material/hourglass_bottom: 償還までの残存期間")
        gauge_cols = st.columns(len(with_maturity))
        for col, (_, row) in zip(gauge_cols, with_maturity.iterrows()):
            remaining_ratio = calculations.bond_remaining_ratio(tx, row["asset_name"], row["maturity_date"])
            if remaining_ratio is None:
                continue
            with col:
                st.caption(row["asset_name"])
                st_echarts(
                    options=charts.bond_maturity_gauge_option(
                        remaining_ratio * 100,
                        ui_helpers.format_remaining_period(row["maturity_date"]),
                    ),
                    height="220px",
                    key=f"bond_maturity_gauge_{row['asset_name']}",
                )

    st.subheader(":material/table_chart: 明細")
    display = holdings.copy()
    display["maturity_date"] = display["maturity_date"].apply(ui_helpers.format_maturity_date)
    display["remaining"] = holdings["maturity_date"].apply(ui_helpers.format_remaining_period)
    display["coupon_rate"] = display["coupon_rate"].apply(ui_helpers.format_rate)
    display = display.rename(
        columns={
            "asset_name": "銘柄名",
            "quantity": "保有数量",
            "cost_basis": "簿価",
            "coupon_rate": "表面利率",
            "maturity_date": "償還期限",
            "remaining": "残存期間",
            "coupon_received": "累計受取クーポン",
        }
    )[["銘柄名", "保有数量", "簿価", "表面利率", "償還期限", "残存期間", "累計受取クーポン"]]
    st.dataframe(display, use_container_width=True, hide_index=True)


ui_helpers.run_page(main)
