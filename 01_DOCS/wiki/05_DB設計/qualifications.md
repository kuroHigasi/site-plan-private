# qualifications テーブル定義

> 自動生成: 2026-06-25

## qualifications

> 資格情報の基盤となるマスタデータ

| カラム名 | 型 | NOT NULL | PK | デフォルト値 | 備考 |
| --- | --- | :---: | :---: | --- | --- |
| id | int | ✓ | ✓ |  | ID |
| qualification_name | varchar(255) | ✓ |  |  | 資格名称 |
| overview | text |  |  |  | 資格の概要 |
| category | qualification_type | ✓ |  |  | 資格種別 |
| created_at | timestamp | ✓ |  | `CURRENT_TIMESTAMP` |  |
| updated_at | timestamp | ✓ |  | `CURRENT_TIMESTAMP` |  |

### インデックス

| 名前 | カラム | ユニーク |
| --- | --- | :---: |
| idx_category | category |  |
