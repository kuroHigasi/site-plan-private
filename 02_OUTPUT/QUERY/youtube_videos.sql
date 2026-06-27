-- SQL dump generated using DBML (dbml.dbdiagram.io)
-- Database: MySQL
-- Generated at: 2026-06-27T03:07:42.961Z

CREATE TABLE `youtube_videos` (
  `id` int PRIMARY KEY NOT NULL AUTO_INCREMENT COMMENT 'ID',
  `slug` varchar(255) UNIQUE NOT NULL COMMENT 'URL 用識別子（英小文字・数字・ハイフン）',
  `title` varchar(255) NOT NULL COMMENT '動画名（ページ見出し H1）',
  `youtube_video_id` varchar(11) UNIQUE NOT NULL COMMENT 'YouTube 動画 ID（11 文字）',
  `overview` text COMMENT '動画の概要',
  `reflection` text COMMENT '反省点・次回への課題',
  `published_at` date NOT NULL COMMENT 'YouTube 公開日',
  `thumbnail_source` ENUM ('youtube', 'custom') NOT NULL DEFAULT 'youtube' COMMENT 'サムネイル取得元',
  `thumbnail_path` varchar(255) COMMENT 'カスタムサムネイルの保存パス（thumbnail_source=custom 時のみ）',
  `thumbnail_alt` varchar(255) NOT NULL COMMENT 'サムネイルの代替テキスト（未指定時は title をアプリ層で補完）',
  `sort_order` int NOT NULL DEFAULT 0 COMMENT '一覧表示順（昇順）',
  `is_published` tinyint(1) NOT NULL DEFAULT 0 COMMENT '公開フラグ（0:下書き / 1:公開）',
  `created_at` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  `updated_at` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE INDEX `idx_youtube_videos_slug` ON `youtube_videos` (`slug`);

CREATE INDEX `idx_youtube_videos_published` ON `youtube_videos` (`is_published`, `published_at`);

CREATE INDEX `idx_youtube_videos_sort_order` ON `youtube_videos` (`sort_order`);

ALTER TABLE `youtube_videos` COMMENT = '投稿した YouTube 動画の詳細情報を管理するテーブル。

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
';

