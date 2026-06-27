# YouTube動画管理API（管理）

## 1. 基本情報

| 項目 | 内容 |
|------|------|
| API名 | YouTube動画管理API |
| メソッド | GET / POST / PUT / PATCH / DELETE |
| パス | `/api/admin/youtube-videos.php`, `/api/admin/youtube-video-links.php`, `/api/admin/youtube-channel.php` |
| バージョン | v1（`Accept` ヘッダー指定） |
| 認証 | **セッション Cookie 必須** |
| CSRF | 変更系（POST/PUT/PATCH/DELETE）は **`X-CSRF-Token` 必須** |
| 概要 | `youtube_videos`（動画）、`youtube_video_links`（関連リンク）、`youtube_channel_settings`（チャンネル設定）の CRUD |
| 主な利用画面 | 管理画面（YouTube 動画・関連リンク・チャンネル概要の編集） |

## 2. 共通仕様への準拠

本 API は `01_DOCS/wiki/04_API設計/00_共通仕様.md` に準拠する。

- `Accept: application/vnd.astrohp+json;version=1` が必須
- 全リクエストに `credentials: 'include'`（Cookie 送信）
- 変更系リクエストに `X-CSRF-Token` ヘッダー
- JSON ボディ送信時は `Content-Type: application/json`
- エラー形式は RFC7807 互換

---

## 3. 動画 API（`/api/admin/youtube-videos.php`）

対象テーブル: `youtube_videos`

### 3.1 GET — 一覧取得

#### クエリパラメータ

| パラメータ | 型 | 必須 | デフォルト | 制約 | 説明 |
|------------|----|------|------------|------|------|
| page | integer | 任意 | 1 | 1 以上 | ページ番号 |
| per_page | integer | 任意 | 20 | 1〜100 | 1 ページあたり件数 |
| is_published | integer | 任意 | なし | `0` / `1` | 公開状態で絞り込み |

> 一覧に主キー `id` で 1 件へ絞り込むパラメータは持たせない。`?id=N` 指定時は単件モード（`{ "data": { ... } }`）で 1 件を返す。詳細は [管理API単件取得API.md](管理API単件取得API.md) を参照。

#### 正常時（200 OK）

公開 API と異なり、管理用カラム（`id` / `youtube_video_id` / `thumbnail_source` / `thumbnail_path` / `is_published` / `sort_order` / `created_at` / `updated_at`）を返却する。プレビュー用に **解決済み `thumbnail_url`** も併せて返す。

```json
{
  "data": [
    {
      "id": 1,
      "slug": "sample-youtube-1",
      "title": "ポートフォリオサイト制作の裏側",
      "youtube_video_id": "dQw4w9WgXcQ",
      "overview": "ポートフォリオサイトを制作した際の技術選定と工夫を紹介した動画です。",
      "reflection": "編集テンポが速すぎたため、次回は字幕を併用したい。",
      "published_at": "2025-07-10",
      "thumbnail_source": "youtube",
      "thumbnail_path": null,
      "thumbnail_url": "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
      "thumbnail_alt": "ポートフォリオサイト制作の裏側",
      "sort_order": 0,
      "is_published": 1,
      "created_at": "2025-07-01 12:00:00",
      "updated_at": "2025-07-01 12:00:00"
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

> 管理 API の日付は DB 値そのまま **`YYYY-MM-DD`** 形式で返却する（公開 API と同じ）。`is_published` は **0/1 の integer** で返す。

### 3.2 POST — 作成

#### リクエストボディ

```json
{
  "slug": "sample-youtube-1",
  "title": "ポートフォリオサイト制作の裏側",
  "youtube_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "overview": "ポートフォリオサイトを制作した際の技術選定と工夫を紹介した動画です。",
  "reflection": "編集テンポが速すぎたため、次回は字幕を併用したい。",
  "published_at": "2025-07-10",
  "thumbnail_source": "youtube",
  "thumbnail_alt": "ポートフォリオサイト制作の裏側",
  "sort_order": 0,
  "is_published": 1
}
```

| フィールド | 型 | 必須 | 制約 | 説明 |
|------------|----|------|------|------|
| slug | string | 必須 | `^[a-z0-9]+(?:-[a-z0-9]+)*$`、255 文字以内、一意 | URL 用識別子 |
| title | string | 必須 | 空文字不可、255 文字以内 | 動画名 |
| youtube_video_id | string | 条件付き | 11 文字 | `youtube_url` 未指定時は必須 |
| youtube_url | string(url) | 条件付き | YouTube URL | 指定時はサーバー側で 11 文字 ID を抽出（`youtube_video_id` の代替入力） |
| overview | string | 任意 | — | 概要（null 可） |
| reflection | string | 任意 | — | 反省点（null 可） |
| published_at | string(date) | 必須 | `YYYY-MM-DD` | YouTube 公開日 |
| thumbnail_source | string | 任意 | `youtube` / `custom` | 既定 `youtube` |
| thumbnail_path | string | 条件付き | 255 文字以内 | `thumbnail_source=custom` 時必須（「サムネイル別バリデーション」参照） |
| thumbnail_alt | string | 任意 | 255 文字以内 | 未指定時は `title` を補完して保存 |
| sort_order | integer | 任意 | 0 以上 | 既定 `0` |
| is_published | integer | 任意 | `0` / `1` | 既定 `0`（下書き） |

- `youtube_video_id` と `youtube_url` の両方指定時は、抽出した ID が一致しなければ `400`。
- `youtube_video_id` は一意。重複時は `409 Conflict`。

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
- `slug` / `youtube_video_id` を一意制約に違反する値へ変更 → `409`
- `thumbnail_source` を変更する場合は **「サムネイル別バリデーション」を再適用**する

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

- 配下の `youtube_video_links` は FK の `ON DELETE CASCADE` で連動削除される
- 存在しない id → `404`
- `thumbnail_source=custom` の動画削除時、`thumbnail_path` が指すファイルの物理削除は **実装時 TODO**（孤立ファイルの掃除方針を別途定義）

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

## 4. 関連リンク API（`/api/admin/youtube-video-links.php`）

対象テーブル: `youtube_video_links`

### 4.1 GET — 一覧取得

#### クエリパラメータ

| パラメータ | 型 | 必須 | デフォルト | 制約 | 説明 |
|------------|----|------|------------|------|------|
| page | integer | 任意 | 1 | 1 以上 | ページ番号 |
| per_page | integer | 任意 | 20 | 1〜100 | 1 ページあたり件数 |
| youtube_video_id | integer | 任意 | なし | 1 以上 | 動画 ID で絞り込み |

> 一覧に関連リンク行の主キー `id` で絞り込むパラメータは持たせない（`youtube_video_id` は外部キーによる絞り込みであり別物）。リンク 1 件の取得は `?id=N` の単件モードを使う。詳細は [管理API単件取得API.md](管理API単件取得API.md) を参照。

#### 正常時（200 OK）

```json
{
  "data": [
    {
      "id": 3,
      "youtube_video_id": 1,
      "label": "関連ブログ記事",
      "url": "https://example.com/blog/portfolio",
      "sort_order": 0,
      "created_at": "2025-07-01 12:00:00",
      "updated_at": "2025-07-01 12:00:00"
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

### 4.2 POST — 作成

#### リクエストボディ

```json
{
  "youtube_video_id": 1,
  "label": "関連ブログ記事",
  "url": "https://example.com/blog/portfolio",
  "sort_order": 0
}
```

| フィールド | 型 | 必須 | 制約 | 説明 |
|------------|----|------|------|------|
| youtube_video_id | integer | 必須 | 存在する `youtube_videos.id` | 動画 ID |
| label | string | 必須 | 空文字不可、255 文字以内 | 表示文言 |
| url | string(url) | 必須 | `http`/`https`、255 文字以内 | リンク先 URL |
| sort_order | integer | 任意 | 0 以上 | 既定 `0` |

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
- body は **更新する項目のみ**（部分更新）
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

---

## サムネイル別バリデーション（動画 API 共通）

`youtube_videos.dbml` の Note に準拠する。動画 API（3章）の POST / PUT / PATCH に適用する。

| thumbnail_source | thumbnail_path | 備考 |
|------------------|----------------|------|
| youtube | null 固定 | `thumbnail_path` 指定時は `422` |
| custom | 必須 | アップロード済みの保存パス（`メディアアップロードAPI.md` の返却 `path`） |

- `thumbnail_source=youtube` へ変更した場合、`thumbnail_path` はサーバー側で `null` にクリアする。
- `thumbnail_source=custom` で `thumbnail_path` 未指定 → `422`。

---

## 5. チャンネル設定 API（`/api/admin/youtube-channel.php`）

対象テーブル: `youtube_channel_settings`（singleton, `id = 1`）

### 5.1 GET — 取得

- クエリパラメータなし。`id = 1` の行を単件返却する。
- 行が未作成の場合 → `404`

```json
{
  "data": {
    "id": 1,
    "overview": "ゲーム開発や UI 制作の過程を発信する個人チャンネルです。",
    "channel_url": "https://www.youtube.com/@example",
    "created_at": "2025-07-01 12:00:00",
    "updated_at": "2025-07-01 12:00:00"
  }
}
```

### 5.2 PUT / PATCH — 更新

- 対象は常に `id = 1` の行（id 指定は不要）
- 行が未作成の場合は本リクエストで作成する（`id = 1` 固定で upsert）

| フィールド | 型 | 必須 | 制約 | 説明 |
|------------|----|------|------|------|
| overview | string | 必須 | 空文字不可 | チャンネル概要 |
| channel_url | string(url) | 任意 | `http`/`https`、255 文字以内 | チャンネル URL（null 可） |

```json
{
  "data": {
    "id": 1,
    "updated": true
  }
}
```

> チャンネル設定は singleton のため、DELETE は提供しない。

---

## 6. エラー仕様（共通）

| ステータス | 条件 | detail 例 |
|-----------|------|-----------|
| 400 Bad Request | バリデーションエラー、更新項目なし、JSON 不正、ID 抽出不可 | `slug is required.` |
| 401 Unauthorized | Cookie なし・セッション無効 | `Authentication required.` |
| 403 Forbidden | CSRF トークン欠落/不一致 | `CSRF token mismatch.` |
| 404 Not Found | 存在しない id | `Video not found.`（リンクは `Video link not found.`、チャンネルは `Channel settings not found.`） |
| 405 Method Not Allowed | 許可外 HTTP メソッド | `Method not allowed.` |
| 406 Not Acceptable | Accept ヘッダー不正 | `Unsupported API version.` |
| 409 Conflict | `slug` / `youtube_video_id` の重複 | `Duplicate slug.` / `Duplicate youtube_video_id.` |
| 422 Unprocessable Entity | サムネイル別ルール違反 | `thumbnail_path is required when thumbnail_source is custom.` |
| 500 Internal Server Error | DB 障害等 | `An unexpected error occurred.` |

## 7. 補足

- GET（読み取り）には CSRF トークン不要。
- 単件取得（`GET ?id=N`）は [管理API単件取得API.md](管理API単件取得API.md) の横断仕様に準拠する（動画・関連リンクとも）。
- 公開サイト向けの読み取りは `/api/public/youtube-videos.php`（`YouTube動画一覧取得API.md`）および `/api/public/youtube-channel.php`（`YouTubeチャンネル取得API.md`）を使用する。
- カスタムサムネイルの画像アップロードは `/api/admin/media.php`（`メディアアップロードAPI.md`）で行い、返却された `path` を `thumbnail_path` に設定する。
