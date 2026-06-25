# 資格管理API（管理）

## 1. 基本情報

| 項目 | 内容 |
|------|------|
| API名 | 資格管理API |
| メソッド | GET / POST / PUT / PATCH / DELETE |
| パス | `/api/admin/qualifications.php`, `/api/admin/qualification_statuses.php` |
| バージョン | v1（`Accept` ヘッダー指定） |
| 認証 | **セッション Cookie 必須** |
| CSRF | 変更系（POST/PUT/PATCH/DELETE）は **`X-CSRF-Token` 必須** |
| 概要 | `qualifications`（資格マスタ）および `qualification_statuses`（取得状況）の CRUD |
| 主な利用画面 | 管理画面（資格・取得状況の編集） |

## 2. 共通仕様への準拠

本 API は `01_DOCS/wiki/04_API設計/00_共通仕様.md` に準拠する。

- `Accept: application/vnd.astrohp+json;version=1` が必須
- 全リクエストに `credentials: 'include'`（Cookie 送信）
- 変更系リクエストに `X-CSRF-Token` ヘッダー
- JSON ボディ送信時は `Content-Type: application/json`
- エラー形式は RFC7807 互換

---

## 3. 資格マスタ API（`/api/admin/qualifications.php`）

### 3.1 GET — 一覧取得

#### クエリパラメータ

| パラメータ | 型 | 必須 | デフォルト | 制約 | 説明 |
|------------|----|------|------------|------|------|
| page | integer | 任意 | 1 | 1 以上 | ページ番号 |
| per_page | integer | 任意 | 20 | 1〜100 | 1 ページあたり件数 |
| category | string | 任意 | なし | `it` / `design` / `math` / `language` / `other` | 資格種別で絞り込み |

> 一覧に主キー `id` で 1 件へ絞り込むパラメータは持たせない。`?id=N` 指定時は単件モード（`{ "data": { ... } }`）で 1 件を返す。詳細は [管理API単件取得API.md](管理API単件取得API.md) を参照。

#### 正常時（200 OK）

```json
{
  "data": [
    {
      "id": 1,
      "qualification_name": "G検定",
      "overview": "データサイエンスの基礎資格",
      "category": "it",
      "created_at": "2025-06-01 12:00:00",
      "updated_at": "2025-06-01 12:00:00"
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total": 1,
    "total_pages": 1
  }
}
```

### 3.2 POST — 作成

#### リクエストボディ

```json
{
  "qualification_name": "G検定",
  "overview": "データサイエンスの基礎資格",
  "category": "it"
}
```

| フィールド | 型 | 必須 | 制約 | 説明 |
|------------|----|------|------|------|
| qualification_name | string | 必須 | 空文字不可、255 文字以内 | 資格名称 |
| overview | string | 任意 | — | 資格の概要（null 可） |
| category | string | 必須 | `it` / `design` / `math` / `language` / `other` | 資格種別 |

#### 正常時（201 Created）

```json
{
  "data": {
    "id": 2
  }
}
```

### 3.3 PUT / PATCH — 更新

- `id` は **クエリ `?id=1`** または **JSON body の `id`** で指定
- body は **更新する項目のみ**（部分更新）
- 更新対象フィールドが空 → `400`
- 存在しない id → `404`

#### 正常時（200 OK）

```json
{
  "data": {
    "id": 1,
    "updated": true
  }
}
```

### 3.4 DELETE — 削除

- 取得状況行（`qualification_statuses`）が存在する資格マスタは削除不可 → **409 Conflict**
- 存在しない id → `404`

#### 正常時（200 OK）

```json
{
  "data": {
    "id": 1,
    "deleted": true
  }
}
```

---

## 4. 取得状況 API（`/api/admin/qualification_statuses.php`）

### 4.1 GET — 一覧取得

#### クエリパラメータ

| パラメータ | 型 | 必須 | デフォルト | 制約 | 説明 |
|------------|----|------|------------|------|------|
| page | integer | 任意 | 1 | 1 以上 | ページ番号 |
| per_page | integer | 任意 | 20 | 1〜100 | 1 ページあたり件数 |
| qualification_id | integer | 任意 | なし | 1 以上 | 資格マスタ ID で絞り込み |
| status | string | 任意 | なし | `earned` / `in_progress` / `pending`（カンマ区切り可） | ステータスで絞り込み |

> 一覧に取得状況行の主キー `id` で絞り込むパラメータは持たせない（`qualification_id` は外部キーによる絞り込みであり別物）。取得状況行 1 件の取得は `?id=N` の単件モードを使う。詳細は [管理API単件取得API.md](管理API単件取得API.md) を参照。

#### 正常時（200 OK）

```json
{
  "data": [
    {
      "id": 3,
      "qualification_id": 1,
      "status": "earned",
      "start_date": "2024-06-01",
      "scheduled_exam": null,
      "earned_at": "2024-06-01",
      "progress": null,
      "progress_note": null,
      "link": "https://example.com/blog/g-kentei-2024",
      "created_at": "2025-06-01 12:00:00",
      "updated_at": "2025-06-01 12:00:00"
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total": 1,
    "total_pages": 1
  }
}
```

> 管理 API の日付は DB 値そのまま **`YYYY-MM-DD`** 形式で返却する（公開 API とは形式が異なる）。

### 4.2 POST — 作成

#### リクエストボディ（earned の例）

```json
{
  "qualification_id": 1,
  "status": "earned",
  "start_date": "2024-06-01",
  "earned_at": "2024-06-01",
  "link": "https://example.com/blog/g-kentei-2024"
}
```

#### リクエストボディ（in_progress の例）

```json
{
  "qualification_id": 2,
  "status": "in_progress",
  "start_date": "2025-01-01",
  "scheduled_exam": "2025-06-01",
  "progress": 45,
  "progress_note": "午前試験のネットワーク分野を学習中"
}
```

| フィールド | 型 | 必須 | 制約 | 説明 |
|------------|----|------|------|------|
| qualification_id | integer | 必須 | 存在する `qualifications.id` | 資格マスタ ID |
| status | string | 必須 | `earned` / `in_progress` / `pending` | 取得状況 |
| start_date | string(date) | 必須 | `YYYY-MM-DD` | 学習開始年月 |
| scheduled_exam | string(date) | 任意 | `YYYY-MM-DD` | 受験予定年月 |
| earned_at | string(date) | 条件付き | `YYYY-MM-DD` | 取得年月（`status=earned` 時必須） |
| progress | integer | 任意 | 0〜100 | 学習進捗率 |
| progress_note | string | 任意 | — | 学習進捗の補足 |
| link | string(url) | 任意 | 255 文字以内 | ブログ URL |

#### 正常時（201 Created）

```json
{
  "data": {
    "id": 4
  }
}
```

### 4.3 PUT / PATCH — 更新

- `id` は **クエリ `?id=1`** または **JSON body の `id`** で指定
- `status` 変更時は **ステータス別バリデーション（4.5）を再適用**する
- 存在しない id → `404`

#### 正常時（200 OK）

```json
{
  "data": {
    "id": 4,
    "updated": true
  }
}
```

### 4.4 DELETE — 削除

#### 正常時（200 OK）

```json
{
  "data": {
    "id": 4,
    "deleted": true
  }
}
```

### 4.5 ステータス別バリデーション

`qualification_statuses.dbml` の Note に準拠する。

| status | 必須フィールド | null 固定フィールド | 備考 |
|--------|---------------|-------------------|------|
| earned | `start_date`, `earned_at` | `scheduled_exam`, `progress`, `progress_note` | `start_date = earned_at` とする（B案）。過去取得資格の後追い登録は行わない |
| in_progress | `start_date` | `earned_at` | `progress` 未指定可 |
| pending | `start_date` | `earned_at` | `in_progress` と同様 |

#### 共通ルール

| 対象 | ルール |
|------|--------|
| qualification_id | 存在するマスタ ID であること |
| start_date / scheduled_exam / earned_at | `YYYY-MM-DD` 形式 |
| progress | 指定時は 0 以上 100 以下 |
| link | 指定時は 255 文字以内 |

#### エラー例（422 Unprocessable Entity）

| 条件 | detail 例 |
|------|-----------|
| earned で earned_at 未指定 | `earned_at is required when status is earned.` |
| earned で scheduled_exam 指定 | `scheduled_exam must be null when status is earned.` |
| in_progress で earned_at 指定 | `earned_at must be null when status is not earned.` |

---

## 5. エラー仕様（共通）

| ステータス | 条件 | detail 例 |
|-----------|------|-----------|
| 400 Bad Request | バリデーションエラー、更新項目なし、JSON 不正 | `qualification_name is required.` |
| 401 Unauthorized | Cookie なし・セッション無効 | `Authentication required.` |
| 403 Forbidden | CSRF トークン欠落/不一致 | `CSRF token mismatch.` |
| 404 Not Found | 存在しない id | `Qualification not found.`（取得状況は `Qualification status not found.`） |
| 409 Conflict | 取得状況が残る資格マスタの削除 | `Cannot delete qualification with existing statuses.` |
| 405 Method Not Allowed | 許可外 HTTP メソッド | `Method not allowed.` |
| 406 Not Acceptable | Accept ヘッダー不正 | `Unsupported API version.` |
| 422 Unprocessable Entity | ステータス別ルール違反 | `earned_at is required when status is earned.` |
| 500 Internal Server Error | DB 障害等 | `An unexpected error occurred.` |

## 6. 補足

- GET（読み取り）には CSRF トークン不要。
- 単件取得（`GET ?id=N`）は [管理API単件取得API.md](管理API単件取得API.md) の横断仕様に準拠する（資格マスタ・取得状況とも）。
- 公開サイト向けの読み取りは `/api/public/qualifications.php` を使用する（`資格一覧取得API.md` 参照）。
- 同一 `qualification_id` に複数の取得状況行を登録できる（例: G検定の年度別取得履歴）。
- 資格マスタに `is_published` は持たない。公開可否は取得状況の `status` と公開 API の抽出条件で制御する。