# YouTube動画一覧取得API（公開）

## 1. 基本情報

| 項目 | 内容 |
|------|------|
| API名 | YouTube動画一覧取得API（公開） |
| メソッド | GET |
| パス | `/api/public/youtube-videos.php` |
| バージョン | v1（`Accept` ヘッダー指定） |
| 認証 | **不要** |
| 概要 | `youtube_videos` と `youtube_video_links` から公開済み動画を取得する。`slug` 指定で単件（詳細）、未指定で一覧を返す |
| 主な利用画面 | `/works/youtube/`（P006-04 YouTube）, `/works/youtube/{slug}/`（P006-04-01 動画詳細） |

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

### 3.2 動作モード

| 条件 | モード | レスポンス形式 |
|------|--------|----------------|
| `slug` 指定あり | 単件（詳細） | `{ "data": { ... } }` |
| `slug` 指定なし | 一覧 | `{ "data": [...], "pagination": {...} }` |

### 3.3 クエリパラメータ

| パラメータ | 型 | 必須 | デフォルト | 制約 | 説明 |
|------------|----|------|------------|------|------|
| slug | string | 任意 | なし | `^[a-z0-9]+(?:-[a-z0-9]+)*$` | 指定時は単件（詳細）モード |
| page | integer | 任意 | 1 | 1 以上 | ページ番号（一覧モードのみ有効） |
| per_page | integer | 任意 | 20 | 1〜50 | 1 ページあたり件数（一覧モードのみ有効） |

#### 利用例

- P006-04（一覧）: `/api/public/youtube-videos.php?page=1&per_page=20`
- P006-04-01（詳細）: `/api/public/youtube-videos.php?slug=sample-youtube-1`

## 4. データ取得ルール

- 取得元テーブル: `youtube_videos`（`v`）。詳細モードでは `youtube_video_links`（`l`）を `l.youtube_video_id = v.id` で取得し `links[]` にネスト
- 公開制御: `v.is_published = 1` のレコードのみ対象（一覧・詳細とも）。詳細モードで該当 `slug` が非公開・不存在の場合は `404`
- 並び順（一覧）: `v.sort_order ASC`, `v.published_at DESC`, `v.id DESC`
- 関連リンクの並び順: `l.sort_order ASC`, `l.id ASC`
- ページング（一覧）:
  - `OFFSET = (page - 1) * per_page`
  - `LIMIT = per_page`

### 4.1 サムネイル URL の解決

`thumbnail_url` はサーバー側で解決済みの URL として返却する（フロントエンドは解決ロジックを持たない）。

| `thumbnail_source` | `thumbnail_url` の値 |
|--------------------|----------------------|
| `custom` | `APP_URL` + `thumbnail_path` |
| `youtube` | `https://i.ytimg.com/vi/{youtube_video_id}/hqdefault.jpg` |

## 5. レスポンス仕様

### 5.1 正常時（200 OK）— 一覧モード

```json
{
  "data": [
    {
      "slug": "sample-youtube-1",
      "title": "ポートフォリオサイト制作の裏側",
      "published_at": "2025-07-10",
      "thumbnail_url": "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
      "detail_href": "/works/youtube/sample-youtube-1/"
    },
    {
      "slug": "sample-youtube-2",
      "title": "ゲーム開発のふりかえり",
      "published_at": "2025-06-01",
      "thumbnail_url": "https://example.com/media/youtube/abc123.webp",
      "detail_href": "/works/youtube/sample-youtube-2/"
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

### 5.2 正常時（200 OK）— 単件（詳細）モード

```json
{
  "data": {
    "slug": "sample-youtube-1",
    "title": "ポートフォリオサイト制作の裏側",
    "published_at": "2025-07-10",
    "thumbnail_url": "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
    "thumbnail_alt": "ポートフォリオサイト制作の裏側",
    "youtube_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "overview": "ポートフォリオサイトを制作した際の技術選定と工夫を紹介した動画です。",
    "reflection": "編集テンポが速すぎたため、次回は字幕を併用したい。",
    "links": [
      { "label": "関連ブログ記事", "url": "https://example.com/blog/portfolio" },
      { "label": "使用素材", "url": "https://example.com/assets" }
    ]
  }
}
```

### 5.3 レスポンス項目定義

| 項目 | 型 | Null許容 | モード | 説明 |
|------|----|----------|--------|------|
| slug | string | いいえ | 共通 | URL 用識別子（`youtube_videos.slug`） |
| title | string | いいえ | 共通 | 動画名 |
| published_at | string(date) | いいえ | 共通 | YouTube 公開日（`YYYY-MM-DD`） |
| thumbnail_url | string(url) | いいえ | 共通 | 解決済みサムネイル URL（4.1 参照） |
| detail_href | string | いいえ | 一覧のみ | 詳細ページパス（`/works/youtube/{slug}/`） |
| thumbnail_alt | string | いいえ | 詳細のみ | サムネイルの代替テキスト |
| youtube_url | string(url) | いいえ | 詳細のみ | YouTube 本編 URL（`https://www.youtube.com/watch?v={youtube_video_id}`） |
| overview | string | はい | 詳細のみ | 動画の概要 |
| reflection | string | はい | 詳細のみ | 反省点 |
| links | array | いいえ | 詳細のみ | 関連リンク配列（0 件のときは空配列） |
| links[].label | string | いいえ | 詳細のみ | リンクの表示文言 |
| links[].url | string(url) | いいえ | 詳細のみ | リンク先 URL |
| pagination.page | integer | いいえ | 一覧のみ | 現在ページ |
| pagination.per_page | integer | いいえ | 一覧のみ | 1 ページあたり件数 |
| pagination.total | integer | いいえ | 一覧のみ | 条件一致の総件数 |
| pagination.total_pages | integer | いいえ | 一覧のみ | 総ページ数 |

### 5.4 レスポンスに含めない項目

- `id`, `youtube_video_id`（生 ID。`youtube_url` / `thumbnail_url` に組み込んで返す）
- `thumbnail_source`, `thumbnail_path`（解決済み `thumbnail_url` のみ返す）
- `is_published`, `sort_order`, `created_at`, `updated_at`

## 6. エラー仕様

| ステータス | 条件 | detail 例 |
|-----------|------|-----------|
| 400 Bad Request | `slug` 形式不正、`page`/`per_page` 不正 | `per_page must be between 1 and 50.` |
| 404 Not Found | 指定 `slug` が存在しない、または非公開 | `Video not found.` |
| 406 Not Acceptable | `Accept` ヘッダー未指定・形式不正・未対応 | `Unsupported API version.` |
| 500 Internal Server Error | 想定外エラー（DB 障害など） | `An unexpected error occurred.` |

### 6.1 エラー例（404）

```json
{
  "type": "about:blank",
  "title": "Not Found",
  "status": 404,
  "detail": "Video not found.",
  "instance": "/api/public/youtube-videos.php?slug=unknown",
  "traceId": "3f7a1c9e0b2d4a68"
}
```

## 7. バリデーション

| 対象 | ルール |
|------|--------|
| slug | 指定時は `^[a-z0-9]+(?:-[a-z0-9]+)*$` のみ許可 |
| page | 数値のみ、1 以上 |
| per_page | 数値のみ、1 以上 50 以下 |

## 8. SQL イメージ

### 8.1 一覧モード

```sql
SELECT
  v.slug,
  v.title,
  v.published_at,
  v.youtube_video_id,
  v.thumbnail_source,
  v.thumbnail_path
FROM youtube_videos v
WHERE v.is_published = 1
ORDER BY v.sort_order ASC, v.published_at DESC, v.id DESC
LIMIT :limit OFFSET :offset;
```

### 8.2 単件（詳細）モード

```sql
SELECT
  v.id,
  v.slug,
  v.title,
  v.published_at,
  v.youtube_video_id,
  v.thumbnail_source,
  v.thumbnail_path,
  v.thumbnail_alt,
  v.overview,
  v.reflection
FROM youtube_videos v
WHERE v.is_published = 1 AND v.slug = :slug;

-- 上記が 1 件取得できた場合のみ関連リンクを取得
SELECT l.label, l.url
FROM youtube_video_links l
WHERE l.youtube_video_id = :video_id
ORDER BY l.sort_order ASC, l.id ASC;
```

## 9. 補足

- `thumbnail_url` / `youtube_url` の組み立てロジックは `youtube_videos.dbml` の Note（サムネイル URL 解決ルール）に準拠する。
- 管理画面での CRUD は `/api/admin/youtube-videos.php` および `/api/admin/youtube-video-links.php` を使用する（`YouTube動画管理API.md` 参照）。
- チャンネル概要は別エンドポイント `/api/public/youtube-channel.php` で取得する（`YouTubeチャンネル取得API.md` 参照）。
