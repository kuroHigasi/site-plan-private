# changelogs テーブル定義

> 自動生成: 2026-06-25

## changelogs

> トップページ（/）の更新履歴セクションで使用する。最新N件を表示。

| カラム名 | 型 | NOT NULL | PK | デフォルト値 | 備考 |
| --- | --- | :---: | :---: | --- | --- |
| id | int | ✓ | ✓ |  | ID |
| title | varchar(255) | ✓ |  |  | 更新タイトル |
| body | text |  |  |  | 更新内容の詳細。Markdown可。 |
| changed_at | date | ✓ |  |  | 更新日 |
| is_published | tinyint(1) | ✓ |  | 0 | 公開フラグ（0:非公開 / 1:公開） |
| created_at | timestamp | ✓ |  | `CURRENT_TIMESTAMP` |  |
| updated_at | timestamp | ✓ |  | `CURRENT_TIMESTAMP` |  |

### インデックス

| 名前 | カラム | ユニーク |
| --- | --- | :---: |
| idx_changed_at | changed_at |  |
| idx_is_published | is_published |  |
