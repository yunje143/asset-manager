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

st.header(":material/trending_up: 株式")

if tx_raw.empty:
    ui_helpers.empty_state(
        "取引データがまだありません。Google スプレッドシートの `transactions` シートに"
        "データを入力してください。"
    )
    st.stop()

tx = calculations.attach_tickers(tx_raw, ticker_map)


def main() -> None:
    period = ui_helpers.render_sidebar_period_filter()

    stock_tx = tx[tx["category"] == "stock"]
    if stock_tx.empty:
        ui_helpers.empty_state("株式の取引データがありません。")
        return

    tickers = tuple(sorted(stock_tx["ticker"].dropna().unique()))
    prices, failed_tickers = market_data.fetch_market_prices(tickers)
    if failed_tickers:
        st.warning(f"以下の銘柄の株価取得に失敗しました: {', '.join(failed_tickers)}")

    unmapped = sorted(stock_tx.loc[stock_tx["ticker"].isna(), "asset_name"].unique())
    if unmapped:
        st.warning(f"ticker_map シートに銘柄コードの登録がありません: {', '.join(unmapped)}")

    holdings = calculations.holdings_summary(tx, "stock", prices)
    total_market_value = float(holdings["market_value"].fillna(0).sum()) if not holdings.empty else 0.0
    day_current, day_past = calculations.portfolio_value_change(holdings, prices, days_back=1)
    month_current, month_past = calculations.portfolio_value_change(holdings, prices, days_back=30)

    st.subheader(":material/summarize: サマリー")
    metric_col1, metric_col2, metric_col3 = st.columns(3)
    metric_col1.metric("株式 評価額合計", ui_helpers.format_jpy(total_market_value))
    metric_col2.metric(
        "前日比",
        ui_helpers.format_delta_jpy(day_current - day_past) if day_past is not None else "N/A",
    )
    metric_col3.metric(
        "前月比",
        ui_helpers.format_delta_jpy(month_current - month_past) if month_past is not None else "N/A",
    )

    trend = calculations.stock_market_value_trend(tx, prices)
    trend_display = period_lib.filter_by_period(trend, period, date_col="date")
    if trend_display.empty:
        ui_helpers.empty_state("この期間の株式評価額データがありません。")
    else:
        st.line_chart(trend_display.set_index("date")["market_value"])

    st.subheader(":material/candlestick_chart: 銘柄別 値動き")
    ticker_by_asset = dict(
        holdings.dropna(subset=["ticker"])[["asset_name", "ticker"]].itertuples(index=False)
    )
    if not ticker_by_asset:
        ui_helpers.empty_state("銘柄コードが登録されている株式がありません。")
    else:
        selected_asset = st.selectbox("銘柄を選択", sorted(ticker_by_asset.keys()), key="stock_candlestick_asset")
        selected_ticker = ticker_by_asset[selected_asset]
        ticker_prices = prices[prices["ticker"] == selected_ticker]
        ticker_prices = period_lib.filter_by_period(ticker_prices, period, date_col="date")
        if ticker_prices.empty:
            ui_helpers.empty_state("この期間の株価データがありません。")
        else:
            st_echarts(
                options=charts.candlestick_option(ticker_prices),
                height="360px",
                key=f"candlestick_{selected_ticker}",
            )

    st.subheader(":material/table_chart: 明細")
    if holdings.empty:
        ui_helpers.empty_state("表示できる株式データがありません。")
        return

    display = calculations.attach_price_changes(holdings, prices).rename(
        columns={
            "asset_name": "銘柄名",
            "current_price": "現在値",
            "day_change": "前日比",
            "month_change": "前月比",
            "market_value": "評価額",
            "unrealized_pl": "評価損益",
        }
    )[["銘柄名", "現在値", "前日比", "前月比", "評価額", "評価損益"]]
    st.dataframe(display, use_container_width=True, hide_index=True)


ui_helpers.run_page(main)
