from __future__ import annotations

import streamlit as st

from lib import calculations, charts, config
from lib import period as period_lib
from lib import sheets_client, ui_helpers

try:
    tx_raw = sheets_client.load_transactions()
except (config.ConfigError, sheets_client.DataLoadError) as exc:
    st.error(f"データの読み込みに失敗しました: {exc}")
    st.stop()

st.header(":material/apartment: 不動産")

if tx_raw.empty:
    ui_helpers.empty_state(
        "取引データがまだありません。Google スプレッドシートの `transactions` シートに"
        "データを入力してください。"
    )
    st.stop()


def main() -> None:
    period = ui_helpers.render_sidebar_period_filter()
    filtered = period_lib.filter_by_period(tx_raw, period)
    trend = calculations.monthly_real_estate_trend(filtered)

    st.subheader(":material/bar_chart: 月次 収入・費用")
    if trend.empty:
        ui_helpers.empty_state("この期間の不動産取引はありません。")
    else:
        st.altair_chart(charts.real_estate_monthly_bar_chart(trend), use_container_width=True)

    st.subheader(":material/show_chart: 資産状況の推移（累計純収支）")
    st.caption("毎月の純収支（収入−費用）を積み上げた累計値です。不動産の資産価値そのものの推移を示す代理指標として使えます。")
    if trend.empty:
        ui_helpers.empty_state("この期間の不動産取引はありません。")
    else:
        st.line_chart(trend.set_index("month")["cumulative_net"])

    st.subheader(":material/other_houses: 物件別 収入 vs 費用")
    property_summary = calculations.property_income_expense(filtered)
    if property_summary.empty:
        ui_helpers.empty_state("この期間の不動産取引はありません。")
    else:
        st.altair_chart(
            charts.real_estate_property_bar_chart(property_summary), use_container_width=True
        )


ui_helpers.run_page(main)
