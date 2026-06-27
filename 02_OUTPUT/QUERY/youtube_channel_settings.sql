-- SQL dump generated using DBML (dbml.dbdiagram.io)
-- Database: MySQL
-- Generated at: 2026-06-27T01:00:35.279Z

CREATE TABLE `youtube_channel_settings` (
  `id` int PRIMARY KEY NOT NULL CHECK (id = 1) COMMENT 'ID（固定値 1 のみ）',
  `overview` text NOT NULL COMMENT 'チャンネルの概要',
  `channel_url` varchar(255) COMMENT 'YouTube チャンネル URL',
  `created_at` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  `updated_at` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

ALTER TABLE `youtube_channel_settings` COMMENT = 'P006-04（YouTube）のチャンネル概要セクションで使用する singleton テーブル。

- 行は常に 1 件（id = 1 固定）。AUTO_INCREMENT は付与しない。
- 初期データはマイグレーションの seed で 1 行投入する想定。
- 公開 API（youtube-channel.php）は本行を単件で返却する。
';

