# Database Schema (SQLite)

## Master Tables
- **properties (物件マスタ)**
  - `id` (PK), `name`, `address`, `type` (Mansion/Tenant/Stay), `purchase_price`, `purchase_date`, `useful_life`
- **units (部屋マスタ)**
  - `id` (PK), `property_id` (FK), `room_number`, `usage_type` (Lease/Stay/Tenant), `target_rent`, `area_size`
- **loans (ローンマスタ)**
  - `id` (PK), `property_id` (FK), `principal`, `interest_rate`, `term_months`, `start_date`

## Transaction Tables
- **incomes (収入テーブル)**
  - `id`, `date`, `amount`, `category`, `unit_id` (FK), `note`
  - `status` 
    - (TEXT: 'pending' or 'completed') -- 消込管理用
  - `source_type` 
    - (TEXT: 'auto' or 'manual') -- 自動生成か手入力か
  - `external_ref_id` 
    - (TEXT: NULLABLE) -- CSVインポート時の重複検知用ID
- **expenses (費用テーブル)**
  - `id`, `date`, `amount`, `category`, `property_id` (FK), `unit_id` (FK, nullable), `note`
- **lease_contracts (賃貸契約)**
  - `id` (PK), `unit_id` (FK), `tenant_name`, `start_date`, `end_date`, `monthly_rent`, `is_active` (BOOLEAN)
- **stay_records (民泊実績)**
  - `id`, `unit_id` (FK), `guest_name`, `check_in`, `check_out`, `nightly_rate`, `cleaning_fee`
