# ユーザー一覧取得API（管理）

## 1. 基本情報

| 項目 | 内容 |
|------|------|
| API名 | ユーザー一覧取得API |
| メソッド | GET |
| パス | `/api/admin/users.php` |
| バージョン | v1（`Accept` ヘッダー指定） |
| 認証 | **セッション Cookie 必須** |
| CSRF | **不要**（読み取りのみ） |
| 概要 | ユーザー一覧（PII 含む）を取得する |
| 主な利用画面 | 管理画面 |

## 2. 共通仕様への準拠

本 API は `01_DOCS/wiki/04_API設計/00_共通仕様.md` に準拠する。

- `Accept: application/vnd.astrohp+json;version=1` が必須
- 全リクエストに `credentials: 'include'`（Cookie 送信）
- PII（email 等）は **管理 API のみ** で返却する
- エラー形式は RFC7807 互換

## 3. リクエスト仕様

### 3.1 ヘッダー

| ヘッダー名 | 必須 | 値 | 説明 |
|------------|------|----|------|
| Accept | 必須 | `application/vnd.astrohp+json;version=1` | API バージョン指定 |

### 3.2 クエリパラメータ

**ページングなし**（最大 100 件、`id ASC` で返却）。

## 4. データ取得ルール

- 取得元テーブル: `users`（想定）
- 並び順: `id ASC`
- 上限: 最大 100 件

## 5. レスポンス仕様

### 5.1 正常時（200 OK）

```json
{
  "data": [
    {
      "id": 1,
      "name": "山田太郎",
      "email": "yamada@example.com"
    }
  ]
}
```

### 5.2 レスポンス項目定義

| 項目 | 型 | Null許容 | 説明 |
|------|----|----------|------|
| data[].id | integer | いいえ | ユーザー ID |
| data[].name | string | いいえ | ユーザー名 |
| data[].email | string | いいえ | メールアドレス（PII） |

## 6. エラー仕様

| ステータス | 条件 | detail 例 |
|-----------|------|-----------|
| 401 Unauthorized | Cookie なし・セッション無効 | `Authentication required.` |
| 405 Method Not Allowed | GET 以外 | `Method not allowed.` |
| 406 Not Acceptable | Accept ヘッダー不正 | `Unsupported API version.` |
| 500 Internal Server Error | DB 障害等 | `An unexpected error occurred.` |

## 7. 補足

- 公開 API 経由で email 等の PII を取得することはできない。
- 旧 URL `/api/users.php` は使用しない。`/api/admin/users.php` に差し替える。
