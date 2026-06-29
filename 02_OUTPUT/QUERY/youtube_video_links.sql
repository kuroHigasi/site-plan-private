-- SQL dump generated using DBML (dbml.dbdiagram.io)
-- Database: MySQL
-- Generated at: 2026-06-29T09:11:34.266Z

CREATE TABLE `youtube_video_links` (
  `id` int PRIMARY KEY NOT NULL AUTO_INCREMENT COMMENT 'ID',
  `youtube_video_id` int NOT NULL COMMENT '動画ID',
  `label` varchar(255) NOT NULL COMMENT 'リンクの表示文言',
  `url` varchar(255) NOT NULL COMMENT 'リンク先 URL（http/https）',
  `sort_order` int NOT NULL DEFAULT 0 COMMENT '同一動画内の表示順（昇順）',
  `created_at` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  `updated_at` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE INDEX `idx_youtube_video_links_video_sort` ON `youtube_video_links` (`youtube_video_id`, `sort_order`);

ALTER TABLE `youtube_video_links` COMMENT = '動画詳細（P006-04-01）の「関連リンク」セクションで使用する。

- 0 件の場合、フロントエンドはセクションごと非表示とする。
- YouTube 本編への視聴リンクは youtube_videos.youtube_video_id から生成するため、
  本テーブルには登録しない。
';

ALTER TABLE `youtube_video_links` ADD FOREIGN KEY (`youtube_video_id`) REFERENCES `youtube_videos` (`id`) ON DELETE CASCADE;
