-- SQL dump generated using DBML (dbml.dbdiagram.io)
-- Database: MySQL
-- Generated at: 2026-06-25T00:00:43.612Z

CREATE TABLE `changelogs` (
  `id` int PRIMARY KEY NOT NULL AUTO_INCREMENT COMMENT 'ID',
  `title` varchar(255) NOT NULL COMMENT '更新タイトル',
  `body` text COMMENT '更新内容の詳細。Markdown可。',
  `changed_at` date NOT NULL COMMENT '更新日',
  `is_published` tinyint(1) NOT NULL DEFAULT 0 COMMENT '公開フラグ（0:非公開 / 1:公開）',
  `created_at` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  `updated_at` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE INDEX `idx_changed_at` ON `changelogs` (`changed_at`);

CREATE INDEX `idx_is_published` ON `changelogs` (`is_published`);

ALTER TABLE `changelogs` COMMENT = 'トップページ（/）の更新履歴セクションで使用する。最新N件を表示。';

