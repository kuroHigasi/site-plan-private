# YouTubeチャンネル取得API（公開）

## 1. 基本情報

| 項目 | 内容 |
|------|------|
| API名 | YouTubeチャンネル取得API（公開） |
| メソッド | GET |
| パス | `/api/public/youtube-channel.php` |
| バージョン | v1（`Accept` ヘッダー指定） |
| 認証 | **不要** |
| 概要 | `youtube_channel_settings`（singleton）からチャンネル概要を取得する |
| 主な利用画面 | `/works/youtube/`（P006-04 YouTube／チャンネル概要セクション） |

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

なし（singleton のため絞り込みパラメータを持たない）。

## 4. データ取得ルール

- 取得元テーブル: `youtube_channel_settings`
- 抽出条件: `id = 1`（行は常に 1 件）
- 行が存在しない場合は `404`

## 5. レスポンス仕様

### 5.1 正常時（200 OK）

```json
{
  "data": {
    "overview": "ゲーム開発や UI 制作の過程を発信する個人チャンネルです。",
    "channel_url": "https://www.youtube.com/@example"
  }
}
```

### 5.2 レスポンス項目定義

| 項目 | 型 | Null許容 | 説明 |
|------|----|----------|------|
| overview | string | いいえ | チャンネルの概要 |
| channel_url | string(url) | はい | YouTube チャンネル URL（未設定時は `null`） |

### 5.3 レスポンスに含めない項目

- `id`, `created_at`, `updated_at`

## 6. エラー仕様

| ステータス | 条件 | detail 例 |
|-----------|------|-----------|
| 404 Not Found | チャンネル設定行が未作成 | `Channel settings not found.` |
| 406 Not Acceptable | `Accept` ヘッダー未指定・形式不正・未対応 | `Unsupported API version.` |
| 500 Internal Server Error | 想定外エラー（DB 障害など） | `An unexpected error occurred.` |

## 7. SQL イメージ

```sql
SELECT overview, channel_url
FROM youtube_channel_settings
WHERE id = 1;
```

## 8. 補足

- チャンネル設定の編集は `/api/admin/youtube-channel.php` を使用する（`YouTube動画管理API.md` 参照）。
- 行は常に 1 件である前提（`youtube_channel_settings.dbml` の Note 参照）。初期データはマイグレーションの seed で投入する。
