# 変更履歴一覧取得API（公開）

## 1. 基本情報

| 項目 | 内容 |
|------|------|
| API名 | 変更履歴一覧取得API（公開） |
| メソッド | GET |
| パス | `/api/public/changelogs.php` |
| バージョン | v1（`Accept` ヘッダー指定） |
| 認証 | **不要** |
| 概要 | `changelogs` テーブルから公開済み変更履歴を新しい順で取得する |
| 主な利用画面 | `/`（トップページ）, `/changelog`（変更履歴一覧） |

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
| page | integer | 任意 | 1 | 1 以上 | ページ番号 |
| per_page | integer | 任意 | 10 | 1〜50 | 1 ページあたり件数 |
| from | string(date) | 任意 | なし | `YYYY-MM-DD` | この日付以上の変更履歴を対象 |
| to | string(date) | 任意 | なし | `YYYY-MM-DD`、`from` より後は不可 | この日付以下の変更履歴を対象 |

#### 利用例

- トップページ表示用（最新 5 件）: `/api/public/changelogs.php?page=1&per_page=5`
- 一覧ページ表示用（20 件）: `/api/public/changelogs.php?page=1&per_page=20`

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
      "id": 4,
      "title": "パフォーマンス改善",
      "body": "画面遷移のパフォーマンスを改善しました。",
      "changed_at": "2025-07-10"
    },
    {
      "id": 3,
      "title": "トップページの表示速度を改善",
      "body": null,
      "changed_at": "2025-07-08"
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 10,
    "total": 4,
    "total_pages": 1
  }
}
```

### 5.2 レスポンス項目定義

| 項目 | 型 | Null許容 | 説明 |
|------|----|----------|------|
| data[].id | integer | いいえ | 変更履歴 ID |
| data[].title | string | いいえ | 更新タイトル（`changelogs.title`） |
| data[].body | string | はい | 更新内容詳細（`changelogs.body`） |
| data[].changed_at | string(date) | いいえ | 更新日（`YYYY-MM-DD`） |
| pagination.page | integer | いいえ | 現在ページ |
| pagination.per_page | integer | いいえ | 1 ページあたり件数 |
| pagination.total | integer | いいえ | 条件一致の総件数 |
| pagination.total_pages | integer | いいえ | 総ページ数 |

### 5.3 レスポンスに含めない項目

- `is_published`
- `created_at`
- `updated_at`

## 6. エラー仕様

共通仕様に従い、エラーはすべて RFC7807 互換フォーマットで返却する。

| ステータス | 条件 | detail 例 |
|-----------|------|-----------|
| 400 Bad Request | `page`, `per_page`, `from`, `to` の形式不正 | `per_page must be between 1 and 50.` |
| 406 Not Acceptable | `Accept` ヘッダー未指定・形式不正・未対応 | `Unsupported API version.` |
| 500 Internal Server Error | 想定外エラー（DB 障害など） | `An unexpected error occurred.` |

### 6.1 エラー例（400）

```json
{
  "type": "about:blank",
  "title": "Bad Request",
  "status": 400,
  "detail": "per_page must be between 1 and 50.",
  "instance": "/api/public/changelogs.php?page=1&per_page=100",
  "traceId": "9a0b2d6f8c1e4a67"
}
```

## 7. バリデーション

| 対象 | ルール |
|------|--------|
| page | 数値のみ、1 以上 |
| per_page | 数値のみ、1 以上 50 以下 |
| from | `YYYY-MM-DD` 形式 |
| to | `YYYY-MM-DD` 形式 |
| from/to | `from <= to` であること |

## 8. SQL イメージ

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

- 本 API は公開フラグ `is_published = 1` のみ返却し、非公開データは返さない。
- 管理画面での CRUD は `/api/admin/changelogs.php` を使用する（`変更履歴管理API.md` 参照）。
- 旧 URL `/api/changelogs.php` は使用しない。
