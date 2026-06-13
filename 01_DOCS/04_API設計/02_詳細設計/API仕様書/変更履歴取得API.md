# 変更履歴取得API

## 1. 基本情報

| 項目 | 内容 |
|------|------|
| API名 | 変更履歴一覧取得API |
| メソッド | GET |
| パス | `/api/changelogs` |
| バージョン | v1（`Accept` ヘッダー指定） |
| 認証 | 必須（Bearerトークン） |
| 概要 | `changelogs` テーブルから公開済み変更履歴を新しい順で取得する |
| 主な利用画面 | `/`（トップページ）, `/changelog`（変更履歴一覧） |

## 2. 共通仕様への準拠

本APIは `01_DOCS/wiki/04_API設計/00_共通仕様.md` に準拠する。

- `Content-Type: application/json; charset=UTF-8`
- CORSヘッダー返却
- `OPTIONS` は `204 No Content`
- `Accept: application/vnd.<service_name>+json;version=1` が必須
- `Authorization: Bearer <token>` が必須
- エラー形式は RFC7807 互換（`type`, `title`, `status`, `detail`, `instance`, `traceId`）

## 3. リクエスト仕様

### 3.1 ヘッダー

| ヘッダー名 | 必須 | 値 | 説明 |
|------------|------|----|------|
| Accept | 必須 | `application/vnd.astrohp+json;version=1` | APIバージョン指定 |
| Authorization | 必須 | `Bearer <token>` | 認証トークン |
| Content-Type | 任意 | `application/json; charset=UTF-8` | GETのためボディなしだが統一運用として許可 |

### 3.2 クエリパラメータ

| パラメータ | 型 | 必須 | デフォルト | 制約 | 説明 |
|------------|----|------|------------|------|------|
| page | integer | 任意 | 1 | 1以上 | ページ番号 |
| per_page | integer | 任意 | 10 | 1-50 | 1ページあたり件数 |
| from | string(date) | 任意 | なし | `YYYY-MM-DD` | この日付以上の変更履歴を対象 |
| to | string(date) | 任意 | なし | `YYYY-MM-DD` | この日付以下の変更履歴を対象 |

#### 利用例

- トップページ表示用（最新5件）: `/api/changelogs?page=1&per_page=5`
- 一覧ページ表示用（20件）: `/api/changelogs?page=1&per_page=20`

## 4. データ取得ルール

- 取得元テーブル: `changelogs`
- 抽出条件:
  - `is_published = 1`
  - `from` 指定時は `changed_at >= from`
  - `to` 指定時は `changed_at <= to`
- 並び順:
  - `changed_at DESC`
  - 同日の並び安定化のため `id DESC`
- ページング:
  - `OFFSET = (page - 1) * per_page`
  - `LIMIT = per_page`

## 5. レスポンス仕様

### 5.1 正常時（200 OK）

```json
{
  "data": [
    {
      "id": 128,
      "title": "資格一覧ページにフィルタ機能を追加",
      "body": "カテゴリ別に絞り込み可能になりました。",
      "changed_at": "2026-06-10"
    },
    {
      "id": 127,
      "title": "トップページの表示速度を改善",
      "body": null,
      "changed_at": "2026-06-08"
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 10,
    "total": 42,
    "total_pages": 5
  }
}
```

### 5.2 レスポンス項目定義

| 項目 | 型 | Null許容 | 説明 |
|------|----|----------|------|
| data[].id | integer | いいえ | 変更履歴ID |
| data[].title | string | いいえ | 更新タイトル（`changelogs.title`） |
| data[].body | string | はい | 更新内容詳細（`changelogs.body`） |
| data[].changed_at | string(date) | いいえ | 更新日（`YYYY-MM-DD`） |
| pagination.page | integer | いいえ | 現在ページ |
| pagination.per_page | integer | いいえ | 1ページあたり件数 |
| pagination.total | integer | いいえ | 条件一致の総件数 |
| pagination.total_pages | integer | いいえ | 総ページ数 |

## 6. エラー仕様

共通仕様に従い、エラーはすべて RFC7807 互換フォーマットで返却する。

| ステータス | 条件 | detail例 |
|-----------|------|-----------|
| 400 Bad Request | `page`, `per_page`, `from`, `to` の形式不正 | `per_page must be between 1 and 50.` |
| 401 Unauthorized | Bearerトークン不正/未指定 | `Authentication failed.` |
| 406 Not Acceptable | `Accept` ヘッダー未指定・形式不正・未対応 | `Unsupported API version.` |
| 500 Internal Server Error | 想定外エラー（DB障害など） | `An unexpected error occurred.` |

### 6.1 エラー例（400）

```json
{
  "type": "https://example.com/problems/validation-error",
  "title": "Bad Request",
  "status": 400,
  "detail": "per_page must be between 1 and 50.",
  "instance": "/api/changelogs?page=1&per_page=100",
  "traceId": "9a0b2d6f8c1e4a67"
}
```

## 7. バリデーション

| 対象 | ルール |
|------|--------|
| page | 数値のみ、1以上 |
| per_page | 数値のみ、1以上50以下 |
| from | `YYYY-MM-DD` 形式 |
| to | `YYYY-MM-DD` 形式 |
| from/to | `from <= to` であること |

## 8. SQLイメージ

```sql
SELECT
  id,
  title,
  body,
  changed_at
FROM changelogs
WHERE is_published = 1
  AND (:from IS NULL OR changed_at >= :from)
  AND (:to IS NULL OR changed_at <= :to)
ORDER BY changed_at DESC, id DESC
LIMIT :limit OFFSET :offset;
```

## 9. 補足

- 本APIは公開フラグ `is_published=1` のみ返却し、非公開データは返さない。
- `created_at`, `updated_at`, `is_published` は外部公開しない。
- DB例外の詳細（SQL文やスタックトレース）はレスポンスに含めない。

