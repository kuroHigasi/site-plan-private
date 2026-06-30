# 資格一覧取得API（公開）

## 1. 基本情報

| 項目 | 内容 |
|------|------|
| API名 | 資格一覧取得API（公開） |
| メソッド | GET |
| パス | `/api/public/qualifications.php` |
| バージョン | v1（`Accept` ヘッダー指定） |
| 認証 | **不要** |
| 概要 | `qualifications` と `qualification_statuses` を JOIN し、ステータス・カテゴリ条件に合致する資格を取得する |
| 主な利用画面 | `/certifications/list/`（P005-01 取得資格一覧）, `/certifications/current/`（P005-02 現在学習中の資格） |

## 2. 共通仕様への準拠

本 API は `01_DOCS/wiki/04_API設計/00_共通仕様.md` に準拠する。

- `Accept: application/vnd.astrohp+json;version=1` が必須
- 認証不要（Bearer トークンは **使用しない**）
- エラー形式は RFC7807 互換（`type`, `title`, `status`, `detail`, `instance`, `traceId`）
- 成功時 `Cache-Control: public, max-age=60`（60 秒キャッシュ可）
- ブラウザから呼ぶ場合、`credentials: 'include'` は **不要**

## 3. リクエスト仕様

### 3.1 ヘッダー

| ヘッダー名 | 必須 | 値 | 説明 |
|------------|------|----|------|
| Accept | 必須 | `application/vnd.astrohp+json;version=1` | API バージョン指定 |

### 3.2 クエリパラメータ

| パラメータ | 型 | 必須 | デフォルト | 制約 | 説明 |
|------------|----|------|------------|------|------|
| status | string | **必須** | なし | `earned` または `in_progress,pending` | 取得対象ステータス（カンマ区切り） |
| category | string | 任意 | なし | `it` / `design` / `math` / `language` / `other` | 資格種別で絞り込み |
| exclude_pending | boolean | 任意 | `false` | `status` に `pending` を含む場合のみ有効 | `true` のとき `pending` を除外（P005-02 の中断中非表示トグル） |
| page | integer | 任意 | 1 | 1 以上 | ページ番号 |
| per_page | integer | 任意 | 20 | 1〜50 | 1 ページあたり件数 |

#### 利用例

- P005-01（取得資格一覧・IT カテゴリ）: `/api/public/qualifications.php?status=earned&category=it&page=1&per_page=20`
- P005-02（現在学習中・中断中含む）: `/api/public/qualifications.php?status=in_progress,pending&page=1&per_page=20`
- P005-02（中断中を非表示）: `/api/public/qualifications.php?status=in_progress,pending&exclude_pending=true&page=1&per_page=20`

## 4. データ取得ルール

- 取得元テーブル: `qualification_statuses`（`qs`）JOIN `qualifications`（`q`）ON `qs.qualification_id = q.id`
- 公開制御: `qualifications` マスタに `is_published` は持たない。**DB 登録済みの行はすべて公開対象**とする（`qualification_statuses.status` で表示ページを切り替える）
- 表示単位: **行単位**（同一資格でも年度別など複数行があれば複数カード）
- 抽出条件:
  - `status=earned` → `qs.status = 'earned'`
  - `status=in_progress,pending` → `qs.status IN ('in_progress', 'pending')`
  - `exclude_pending=true` → 上記に加え `qs.status <> 'pending'`
  - `category` 指定時 → `q.category = :category`
- 並び順:
  - `status=earned` のとき: `qs.earned_at DESC`, `qs.id DESC`
  - `status=in_progress,pending` のとき: `qs.status ASC`（`in_progress` → `pending`）, `qs.start_date DESC`, `qs.id DESC`
- ページング:
  - `OFFSET = (page - 1) * per_page`
  - `LIMIT = per_page`

## 5. レスポンス仕様

### 5.1 正常時（200 OK）— status=earned

```json
{
  "data": [
    {
      "id": 3,
      "qualification_id": 1,
      "qualification_name": "G検定",
      "category": "it",
      "status": "earned",
      "earned_at": "2024-06",
      "link": "https://example.com/blog/g-kentei-2024"
    },
    {
      "id": 1,
      "qualification_id": 1,
      "qualification_name": "G検定",
      "category": "it",
      "status": "earned",
      "earned_at": "2023-06",
      "link": null
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total": 2,
    "total_pages": 1
  }
}
```

### 5.2 正常時（200 OK）— status=in_progress,pending

```json
{
  "data": [
    {
      "id": 5,
      "qualification_id": 2,
      "qualification_name": "基本情報技術者試験",
      "category": "it",
      "status": "in_progress",
      "start_date": "2025-01",
      "scheduled_exam": "2025-06",
      "progress": 45,
      "progress_note": "午前試験のネットワーク分野を学習中"
    },
    {
      "id": 4,
      "qualification_id": 3,
      "qualification_name": "TOEIC",
      "category": "language",
      "status": "pending",
      "start_date": "2024-09",
      "scheduled_exam": "2025-03",
      "progress": null,
      "progress_note": "リスニング対策を一時中断"
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total": 2,
    "total_pages": 1
  }
}
```

### 5.3 レスポンス項目定義

| 項目 | 型 | Null許容 | 説明 |
|------|----|----------|------|
| data[].id | integer | いいえ | 取得状況行 ID（`qualification_statuses.id`） |
| data[].qualification_id | integer | いいえ | 資格マスタ ID（`qualifications.id`） |
| data[].qualification_name | string | いいえ | 資格名称（`qualifications.qualification_name`） |
| data[].category | string | いいえ | 資格種別（`it` / `design` / `math` / `language` / `other`） |
| data[].status | string | いいえ | 取得状況（`earned` / `in_progress` / `pending`） |
| data[].earned_at | string(year-month) | earned 時はいいえ | 取得年月（`YYYY-MM`）。`status=earned` のときのみ返却 |
| data[].link | string(url) | はい | ブログ URL。`status=earned` のときのみ返却 |
| data[].start_date | string(year-month) | in_progress/pending 時はいいえ | 学習開始年月（`YYYY-MM`） |
| data[].scheduled_exam | string(year-month) | はい | 受験予定年月（`YYYY-MM`） |
| data[].progress | integer | はい | 学習進捗率（0〜100）。未設定時は `null` |
| data[].progress_note | string | はい | 現在学習状況の補足 |
| pagination.page | integer | いいえ | 現在ページ |
| pagination.per_page | integer | いいえ | 1 ページあたり件数 |
| pagination.total | integer | いいえ | 条件一致の総件数 |
| pagination.total_pages | integer | いいえ | 総ページ数 |

### 5.4 日付形式

- DB 上は `date` 型だが、レスポンスでは **`YYYY-MM` 形式**に正規化して返却する（日部分は切り捨て）

### 5.5 レスポンスに含めない項目

- `qualifications.overview`
- `qualification_statuses.start_date`（`status=earned` 時）
- `created_at` / `updated_at`

## 6. エラー仕様

| ステータス | 条件 | detail 例 |
|-----------|------|-----------|
| 400 Bad Request | `status` 未指定・不正、`category` 不正、`page`/`per_page` 不正 | `status must be earned or in_progress,pending.` |
| 406 Not Acceptable | `Accept` ヘッダー未指定・形式不正・未対応 | `Unsupported API version.` |
| 500 Internal Server Error | 想定外エラー（DB 障害など） | `An unexpected error occurred.` |

### 6.1 エラー例（400）

```json
{
  "type": "about:blank",
  "title": "Bad Request",
  "status": 400,
  "detail": "status must be earned or in_progress,pending.",
  "instance": "/api/public/qualifications.php?category=it",
  "traceId": "9a0b2d6f8c1e4a67"
}
```

## 7. バリデーション

| 対象 | ルール |
|------|--------|
| status | 必須。`earned` または `in_progress,pending` のみ許可 |
| category | 指定時は `it` / `design` / `math` / `language` / `other` のいずれか |
| exclude_pending | `true` / `false` / `1` / `0`。`status=earned` 指定時は無視 |
| page | 数値のみ、1 以上 |
| per_page | 数値のみ、1 以上 50 以下 |

## 8. SQL イメージ

```sql
SELECT
  qs.id,
  q.id AS qualification_id,
  q.qualification_name,
  q.category,
  qs.status,
  qs.earned_at,
  qs.link,
  qs.start_date,
  qs.scheduled_exam,
  qs.progress,
  qs.progress_note
FROM qualification_statuses qs
INNER JOIN qualifications q ON qs.qualification_id = q.id
WHERE qs.status IN (:status_list)
  AND (:exclude_pending = 0 OR qs.status <> 'pending')
  AND (:category IS NULL OR q.category = :category)
ORDER BY
  CASE WHEN :sort_mode = 'earned' THEN qs.earned_at END DESC,
  CASE WHEN :sort_mode = 'learning' THEN qs.status END ASC,
  CASE WHEN :sort_mode = 'learning' THEN qs.start_date END DESC,
  qs.id DESC
LIMIT :limit OFFSET :offset;
```

## 9. 補足

- P005-01 / P005-02 のカテゴリ絞り込み UI で「存在しないカテゴリは表示しない」要件は、フロントエンドが `category` 未指定の全件取得結果から存在カテゴリを算出してタブを制御する。
- 管理画面での CRUD は site-plan-security リポジトリ `01_DOCS/wiki/04_API設計/05_資格管理API.md` を参照する。