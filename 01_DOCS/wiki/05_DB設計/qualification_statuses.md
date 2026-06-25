# qualification_statuses テーブル定義

> 自動生成: 2026-06-25

## qualification_statuses

> 資格情報の取得状況を管理するテーブル。
同一 qualification_id に複数行を許可する（例: G検定の年度別取得履歴）。

【表示単位】
- P005-01（取得資格一覧）: 行単位。status = earned の各行が1カードとなる。
- P005-02（現在学習中の資格）: 行単位。status IN (in_progress, pending) の各行が1カードとなる。

【公開 API の抽出】（詳細は API 仕様書に記載）
- P005-01: status = earned
- P005-02: status IN (in_progress, pending)

【start_date の扱い（B案）】
- 全ステータスで start_date は NOT NULL。
- 過去取得資格の後追い登録は行わない。
- earned 登録時は start_date = earned_at とする（学習開始日を個別に持たない場合の代替ルール）。

【ステータス別カラムルール】
| status      | start_date | earned_at | scheduled_exam | progress   | progress_note | link |
|-------------|------------|-----------|----------------|------------|---------------|------|
| earned      | 必須       | 必須      | null 固定      | null 固定  | 任意          | 任意 |
| in_progress | 必須       | null 固定 | 任意           | 任意(0-100)| 任意          | 任意 |
| pending     | 必須       | null 固定 | 任意           | 任意(0-100)| 任意          | 任意 |

- progress 未指定時: UI 側で進捗バーを非表示とする（in_progress / pending）。
- 日付カラムは DB 上 date 型。API レスポンスでは YYYY-MM 形式で返却する。


| カラム名 | 型 | NOT NULL | PK | デフォルト値 | 備考 |
| --- | --- | :---: | :---: | --- | --- |
| id | int | ✓ | ✓ |  | ID |
| qualification_id | int | ✓ |  |  | 資格ID |
| status | qualification_status_type | ✓ |  |  | 資格取得状況 |
| start_date | date | ✓ |  |  | 学習開始年月 |
| scheduled_exam | date |  |  |  | 受験予定年月 |
| earned_at | date |  |  |  | 取得年月 |
| progress | int |  |  |  | 学習進捗率（0-100） |
| progress_note | text |  |  |  | 学習進捗の補足説明 |
| link | varchar(255) |  |  |  | ブログURL |
| created_at | timestamp | ✓ |  | `CURRENT_TIMESTAMP` |  |
| updated_at | timestamp | ✓ |  | `CURRENT_TIMESTAMP` |  |

### インデックス

| 名前 | カラム | ユニーク |
| --- | --- | :---: |
| idx_qualification_id | qualification_id |  |
| idx_status_earned_at | status, earned_at |  |
| idx_status_start_date | status, start_date |  |

### 外部キー

| カラム | 参照先テーブル | 参照先カラム | 関係 |
| --- | --- | --- | --- |
| qualification_id | qualifications | id | * - 1 |
