from __future__ import annotations

import streamlit as st
from streamlit_echarts import st_echarts

from lib import calculations, charts, config, market_data
from lib import period as period_lib
from lib import sheets_client, ui_helpers

try:
    tx_raw = sheets_client.load_transactions()
    ticker_map = sheets_client.load_ticker_map()
except (config.ConfigError, sheets_client.DataLoadError) as exc:
    st.error(f"データの読み込みに失敗しました: {exc}")
    st.stop()

st.header(":material/dashboard: 総合")

if tx_raw.empty:
    ui_helpers.empty_state(
        "取引データがまだありません。Google スプレッドシートの `transactions` シートに"
        "データを入力してください。"
    )
    st.stop()

tx = calculations.attach_tickers(tx_raw, ticker_map)


def main() -> None:
    period = ui_helpers.render_sidebar_period_filter()
    period_start = period_lib.get_period_start_date(period)
    filtered = period_lib.filter_by_period(tx, period)

    stock_tickers = tuple(sorted(tx.loc[tx["category"] == "stock", "ticker"].dropna().unique()))
    prices, failed_tickers = market_data.fetch_market_prices(stock_tickers)
    if failed_tickers:
        st.warning(f"以下の銘柄の株価取得に失敗しました: {', '.join(failed_tickers)}")

    bond_holdings = calculations.holdings_summary(tx, "bond")
    stock_holdings = calculations.holdings_summary(tx, "stock", prices)
    overview = calculations.total_overview(tx, bond_holdings, stock_holdings)
    composition_trend = calculations.asset_composition_trend(tx, prices, period_start)
    net_worth_trend = calculations.total_net_worth_trend(composition_trend)

    if period_start is not None:
        past_overview = calculations.total_overview_as_of(tx, prices, period_start)
        net_worth_delta = overview["total"] - past_overview["total"]
    else:
        net_worth_delta = None

    cashflow_trend = calculations.total_monthly_cashflow_trend(filtered)

    income_mom_delta = calculations.latest_month_over_month_delta(cashflow_trend, "income")
    expense_mom_delta = calculations.latest_month_over_month_delta(cashflow_trend, "expense")
    net_mom_delta = calculations.latest_month_over_month_delta(cashflow_trend, "net")

    st.subheader(":material/payments: 収支サマリー")
    col1, col2, col3, col4 = st.columns(4)
    col1.metric(
        "純資産評価額",
        ui_helpers.format_jpy(overview["total"]),
        delta=ui_helpers.format_delta_jpy(net_worth_delta) if net_worth_delta is not None else None,
        delta_color="normal",
        chart_data=net_worth_trend["value"].tolist() or [0],
        chart_type="area",
        help="不動産=累計純収支、社債=簿価、株式=評価額の合計。全期間の累計残高で、期間フィルターの影響を受けません。",
    )
    col2.metric(
        "総収入",
        ui_helpers.format_jpy(float(cashflow_trend["income"].sum())) if not cashflow_trend.empty else "N/A",
        delta=ui_helpers.format_delta_jpy(income_mom_delta) if income_mom_delta is not None else None,
        delta_color="normal",
        chart_data=cashflow_trend["income"].tolist() or [0],
        chart_type="area",
        help="選択中の期間内の収入合計。デルタは前月比（増加=緑）。",
    )
    col3.metric(
        "総費用",
        ui_helpers.format_jpy(float(cashflow_trend["expense"].sum())) if not cashflow_trend.empty else "N/A",
        delta=ui_helpers.format_delta_jpy(expense_mom_delta) if expense_mom_delta is not None else None,
        delta_color="inverse",
        chart_data=cashflow_trend["expense"].tolist() or [0],
        chart_type="area",
        help="選択中の期間内の費用合計。デルタは前月比（増加=赤）。",
    )
    col4.metric(
        "純額（収入−費用）",
        ui_helpers.format_jpy(float(cashflow_trend["net"].sum())) if not cashflow_trend.empty else "N/A",
        delta=ui_helpers.format_delta_jpy(net_mom_delta) if net_mom_delta is not None else None,
        delta_color="normal",
        chart_data=cashflow_trend["net"].tolist() or [0],
        chart_type="area",
        help="選択中の期間内の収支差額。純資産評価額（残高・全期間）とは異なる、期間内のフロー指標です。デルタは前月比。",
    )

    st.subheader(":material/pie_chart: 資産配分")
    donut_col, trend_col = st.columns([1, 2])
    with donut_col:
        breakdown = {"tenant": overview["tenant"], "bond": overview["bond"], "stock": overview["stock"]}
        if any(breakdown.values()):
            st_echarts(
                options=charts.asset_distribution_donut_option(breakdown),
                height="320px",
                key="asset_distribution_donut",
            )
        else:
            ui_helpers.empty_state("表示できる資産データがありません。")

    with trend_col:
        st.caption("月末時点でのカテゴリ別評価額（不動産=累計純収支、社債=簿価、株式=評価額）の積み上げ推移です。")
        if composition_trend.empty:
            ui_helpers.empty_state("表示できる推移データがありません。")
        else:
            st_echarts(
                options=charts.asset_composition_trend_option(composition_trend),
                height="320px",
                key="asset_composition_trend",
            )

    st.subheader(":material/account_tree: 資金の流れ")
    st.caption("各資産カテゴリで、どの取引種別にどれだけ資金が動いたか（金額の絶対値）を示します。")
    flow = calculations.category_subcategory_flow(filtered)
    if flow.empty:
        ui_helpers.empty_state("この期間の取引データがありません。")
    else:
        st_echarts(options=charts.category_flow_sankey_option(flow), height="420px", key="category_flow_sankey")


ui_helpers.run_page(main)
