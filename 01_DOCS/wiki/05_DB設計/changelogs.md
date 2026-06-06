# changelogs テーブル定義

> 自動生成: 2026-06-06

## changelogs

| カラム名 | 型 | NOT NULL | PK | デフォルト値 | 備考 |
| --- | --- | :---: | :---: | --- | --- |
| id | int | ✓ | ✓ |  |  |
| title | varchar(255)(255) | ✓ |  |  |  |
| body | text |  |  |  |  |
| changed_at | date | ✓ |  |  |  |
| is_published | tinyint(1)(1) | ✓ |  | 0 |  |
| created_at | timestamp | ✓ |  | `CURRENT_TIMESTAMP` |  |
| updated_at | timestamp | ✓ |  | `CURRENT_TIMESTAMP` |  |

### インデックス

| 名前 | カラム | ユニーク |
| --- | --- | :---: |
| idx_changed_at | changed_at |  |
| idx_is_published | is_published |  |
