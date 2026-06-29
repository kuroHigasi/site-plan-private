# youtube_videos テーブル定義

> 自動生成: 2026-06-29

## youtube_videos

> 投稿した YouTube 動画の詳細情報を管理するテーブル。

【表示単位】
- P006-04（YouTube）: is_published = 1 の各行を動画カードとして表示。
- P006-04-01（動画詳細）: slug 単位で 1 件を表示。

【公開 API の抽出】（詳細は API 仕様書に記載）
- 一覧 / 詳細とも is_published = 1 のみ。
- 並び順: sort_order ASC, published_at DESC, id DESC。

【サムネイルのカラムルール（案C: ハイブリッド）】
| thumbnail_source | thumbnail_path |
|------------------|----------------|
| youtube          | null 固定      |
| custom           | 必須（存在するファイルパス） |

【サムネイル URL 解決ルール】（公開 / 管理 API 共通ロジック）
- custom : APP_URL + thumbnail_path
- youtube: https://i.ytimg.com/vi/{youtube_video_id}/hqdefault.jpg
  （maxresdefault は動画によって 404 になりうるため、既定は hqdefault とする）

- 日付カラムは DB 上 date 型。公開 API レスポンスでは YYYY-MM-DD 形式で返却する。
- thumbnail_alt は未指定時に title を流用する想定（アクセシビリティ方針に準拠）。


| カラム名 | 型 | NOT NULL | PK | デフォルト値 | 備考 |
| --- | --- | :---: | :---: | --- | --- |
| id | int | ✓ | ✓ |  | ID |
| slug | varchar(255) | ✓ |  |  | URL 用識別子（英小文字・数字・ハイフン） |
| title | varchar(255) | ✓ |  |  | 動画名（ページ見出し H1） |
| youtube_video_id | varchar(11) | ✓ |  |  | YouTube 動画 ID（11 文字） |
| overview | text |  |  |  | 動画の概要 |
| reflection | text |  |  |  | 反省点・次回への課題 |
| published_at | date | ✓ |  |  | YouTube 公開日 |
| thumbnail_source | youtube_thumbnail_source | ✓ |  | youtube | サムネイル取得元 |
| thumbnail_path | varchar(255) |  |  |  | カスタムサムネイルの保存パス（thumbnail_source=custom 時のみ） |
| thumbnail_alt | varchar(255) | ✓ |  |  | サムネイルの代替テキスト（未指定時は title をアプリ層で補完） |
| sort_order | int | ✓ |  | 0 | 一覧表示順（昇順） |
| is_published | tinyint(1) | ✓ |  | 0 | 公開フラグ（0:下書き / 1:公開） |
| created_at | timestamp | ✓ |  | `CURRENT_TIMESTAMP` |  |
| updated_at | timestamp | ✓ |  | `CURRENT_TIMESTAMP` |  |

### インデックス

| 名前 | カラム | ユニーク |
| --- | --- | :---: |
| idx_youtube_videos_slug | slug |  |
| idx_youtube_videos_published | is_published, published_at |  |
| idx_youtube_videos_sort_order | sort_order |  |
