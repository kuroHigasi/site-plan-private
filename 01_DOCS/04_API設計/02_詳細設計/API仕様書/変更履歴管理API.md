# 変更履歴管理API（管理）

## 1. 基本情報

| 項目 | 内容 |
|------|------|
| API名 | 変更履歴管理API |
| メソッド | GET / POST / PUT / PATCH / DELETE |
| パス | `/api/admin/changelogs.php` |
| バージョン | v1（`Accept` ヘッダー指定） |
| 認証 | **セッション Cookie 必須** |
| CSRF | 変更系（POST/PUT/PATCH/DELETE）は **`X-CSRF-Token` 必須** |
| 概要 | `changelogs` テーブルの CRUD（未公開データを含む） |
| 主な利用画面 | 管理画面（変更履歴編集） |

## 2. 共通仕様への準拠

本 API は `01_DOCS/wiki/04_API設計/00_共通仕様.md` に準拠する。

- `Accept: application/vnd.astrohp+json;version=1` が必須
- 全リクエストに `credentials: 'include'`（Cookie 送信）
- 変更系リクエストに `X-CSRF-Token` ヘッダー
- JSON ボディ送信時は `Content-Type: application/json`
- エラー形式は RFC7807 互換

## 3. リクエスト仕様

### 3.1 ヘッダー

| ヘッダー名 | 必須 | 値 | 説明 |
|------------|------|----|------|
| Accept | 必須 | `application/vnd.astrohp+json;version=1` | API バージョン指定 |
| Content-Type | 変更系必須 | `application/json` | JSON ボディ送信時 |
| X-CSRF-Token | 変更系必須 | `<token>` | `session.php` または `login.php` で取得 |

### 3.2 GET — 一覧取得

#### クエリパラメータ

| パラメータ | 型 | 必須 | デフォルト | 制約 | 説明 |
|------------|----|------|------------|------|------|
| page | integer | 任意 | 1 | 1 以上 | ページ番号 |
| per_page | integer | 任意 | **20** | 1〜**100** | 1 ページあたり件数 |
| from | string(date) | 任意 | なし | `YYYY-MM-DD` | この日付以上の変更履歴を対象 |
| to | string(date) | 任意 | なし | `YYYY-MM-DD`、`from` より後は不可 | この日付以下の変更履歴を対象 |

公開 API との主な違い:

- `is_published` による絞り込みなし（未公開含む全件）
- `per_page` のデフォルト **20**、上限 **100**

#### 正常時（200 OK）

```json
{
  "data": [
    {
      "id": 1,
      "title": "新機能追加",
      "body": "説明文",
      "changed_at": "2025-07-10",
      "is_published": 1,
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

| 項目 | 型 | Null許容 | 説明 |
|------|----|----------|------|
| data[].is_published | integer | いいえ | 公開フラグ（**0/1 の整数**。boolean ではない） |
| data[].created_at | string(datetime) | いいえ | 作成日時 |
| data[].updated_at | string(datetime) | いいえ | 更新日時 |

### 3.3 POST — 作成

#### リクエストボディ

```json
{
  "title": "新機能",
  "body": "説明",
  "changed_at": "2025-09-01",
  "is_published": true
}
```

| フィールド | 型 | 必須 | 制約 | 説明 |
|------------|----|------|------|------|
| title | string | 必須 | 空文字不可、255 文字以内（マルチバイト文字数） | 更新タイトル |
| body | string | 任意 | — | 更新内容詳細（null 可） |
| changed_at | string(date) | 必須 | `YYYY-MM-DD` | 更新日 |
| is_published | boolean | 任意 | `true`/`false`、`0`/`1` 等 | 公開フラグ |

#### 正常時（201 Created）

```json
{
  "data": {
    "id": 5
  }
}
```

### 3.4 PUT / PATCH — 更新

- `id` は **クエリ `?id=1`** または **JSON body の `id`** で指定
- body は **更新する項目のみ**（部分更新）
- 更新対象フィールドが空 → `400`
- 存在しない id → `404`（値が同じで rowCount=0 の場合も 404 判定あり）

#### 正常時（200 OK）

```json
{
  "data": {
    "id": 1,
    "updated": true
  }
}
```

### 3.5 DELETE — 削除

- `id` 指定方法は更新と同じ（クエリまたは JSON body）
- 存在しない id → `404`
- JSON body で `id` を渡す想定（クエリでも可）

#### 正常時（200 OK）

```json
{
  "data": {
    "id": 1,
    "deleted": true
  }
}
```

## 4. エラー仕様

| ステータス | 条件 | detail 例 |
|-----------|------|-----------|
| 400 Bad Request | バリデーションエラー、更新項目なし、JSON 不正 | `title is required.` |
| 401 Unauthorized | Cookie なし・セッション無効 | `Authentication required.` |
| 403 Forbidden | CSRF トークン欠落/不一致 | `CSRF token mismatch.` |
| 404 Not Found | 存在しない changelog id | `Changelog not found.` |
| 405 Method Not Allowed | 許可外 HTTP メソッド | `Method not allowed.` |
| 406 Not Acceptable | Accept ヘッダー不正 | `Unsupported API version.` |
| 500 Internal Server Error | DB 障害等 | `An unexpected error occurred.` |

## 5. バリデーション

| 対象 | ルール |
|------|--------|
| title | 空文字不可、最大 255 文字 |
| changed_at | `YYYY-MM-DD` 形式のみ（時刻不可） |
| is_published | JSON boolean として受け付け（内部では 0/1 に変換） |
| page | 数値のみ、1 以上 |
| per_page | 数値のみ、1 以上 100 以下 |
| from/to | `YYYY-MM-DD` 形式、`from <= to` |

## 6. 補足

- GET（読み取り）には CSRF トークン不要。
- 公開サイト向けの読み取りは `/api/public/changelogs.php` を使用する。
- 旧 URL `/api/changelogs.php` は使用しない。
