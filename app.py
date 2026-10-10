from __future__ import annotations

import streamlit as st

st.set_page_config(page_title="Asset Manager", layout="wide")

pages = [
    st.Page("pages/total.py", title="総合", icon=":material/dashboard:", default=True),
    st.Page("pages/real_estate.py", title="不動産", icon=":material/apartment:"),
    st.Page("pages/bond.py", title="社債", icon=":material/account_balance:"),
    st.Page("pages/stock.py", title="株式", icon=":material/trending_up:"),
]

navigation = st.navigation(pages)
navigation.run()
