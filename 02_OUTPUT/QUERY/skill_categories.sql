-- SQL dump generated using DBML (dbml.dbdiagram.io)
-- Database: MySQL
-- Generated at: 2026-06-25T00:00:48.359Z

CREATE TABLE `skill_categories` (
  `id` int PRIMARY KEY NOT NULL AUTO_INCREMENT COMMENT 'ID',
  `slug` ENUM ('frontend', 'backend', 'design', 'other') NOT NULL COMMENT 'カテゴリ識別子（URL・SkillIcon キー）',
  `title` varchar(255) NOT NULL COMMENT '見出し（例: フロントエンド）',
  `overview` text NOT NULL COMMENT 'カード説明・詳細ページ概要で共通利用する文言',
  `icon` ENUM ('frontend', 'backend', 'design', 'layers') NOT NULL COMMENT 'カードアイコン種別',
  `is_coming_soon` tinyint(1) NOT NULL DEFAULT 0 COMMENT '準備中フラグ（0:公開 / 1:準備中。1 のときカードを薄くしリンク非表示）',
  `sort_order` int NOT NULL DEFAULT 0 COMMENT 'カテゴリ表示順（昇順）',
  `created_at` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  `updated_at` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE `skill_subcategories` (
  `id` int PRIMARY KEY NOT NULL AUTO_INCREMENT COMMENT 'ID',
  `skill_category_id` int NOT NULL COMMENT 'カテゴリID',
  `slug` varchar(64) NOT NULL COMMENT 'サブカテゴリ識別子（フィルタ・SkillIcon キー。カテゴリ内で一意）',
  `label` varchar(255) NOT NULL COMMENT 'フィルタボタンの表示名',
  `sort_order` int NOT NULL DEFAULT 0 COMMENT 'タブ表示順（昇順）',
  `created_at` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  `updated_at` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE `skills` (
  `id` int PRIMARY KEY NOT NULL AUTO_INCREMENT COMMENT 'ID',
  `skill_category_id` int NOT NULL COMMENT 'カテゴリID',
  `skill_subcategory_id` int NOT NULL COMMENT 'サブカテゴリID',
  `name` varchar(255) NOT NULL COMMENT 'スキル名（見出し）',
  `summary` text NOT NULL COMMENT 'スキルの説明文',
  `level` int NOT NULL CHECK (level >= 1 AND level <= 5) COMMENT '習熟度（1〜5）',
  `sort_order` int NOT NULL DEFAULT 0 COMMENT 'カテゴリ内の表示順（昇順）',
  `created_at` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  `updated_at` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE `skill_evidences` (
  `id` int PRIMARY KEY NOT NULL AUTO_INCREMENT COMMENT 'ID',
  `skill_id` int NOT NULL COMMENT 'スキルID',
  `label` varchar(255) NOT NULL COMMENT '根拠リンクの表示文言',
  `href` varchar(255) NOT NULL COMMENT '根拠リンク先（同一サイト内の相対パス）',
  `sort_order` int NOT NULL DEFAULT 0 COMMENT '同一スキル内の表示順（昇順）',
  `created_at` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  `updated_at` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE UNIQUE INDEX `uq_skill_categories_slug` ON `skill_categories` (`slug`);

CREATE INDEX `idx_skill_categories_sort_order` ON `skill_categories` (`sort_order`);

CREATE UNIQUE INDEX `uq_skill_subcategories_category_slug` ON `skill_subcategories` (`skill_category_id`, `slug`);

CREATE INDEX `idx_skill_subcategories_category_sort` ON `skill_subcategories` (`skill_category_id`, `sort_order`);

CREATE INDEX `idx_skills_category_id` ON `skills` (`skill_category_id`);

CREATE INDEX `idx_skills_subcategory_id` ON `skills` (`skill_subcategory_id`);

CREATE INDEX `idx_skills_category_sort` ON `skills` (`skill_category_id`, `sort_order`);

CREATE INDEX `idx_skill_evidences_skill_sort` ON `skill_evidences` (`skill_id`, `sort_order`);

ALTER TABLE `skill_categories` COMMENT = 'スキルカテゴリのマスタ。P002 のカードと P002-01〜04 の詳細ページで共通利用する。

- slug はサイト URL（/about/{slug}/）と SkillIcon の種別キーを兼ねる。UNIQUE。
- overview はカードの概要文と詳細ページ冒頭で同一文言を使う。
- 現状の初期データは 4 件（frontend / backend / design / other）。
- sort_order 初期値: frontend=1, backend=2, design=3, other=4。
';

ALTER TABLE `skill_subcategories` COMMENT = 'カテゴリ配下のサブカテゴリ（SkillList のフィルタタブ）。

- slug はカテゴリ内で一意（language は frontend / other で別行として保持）。
- SkillIcon.vue が slug をキーにアイコンを選ぶため、定義済み slug と一致させる。
- 現状の初期データは 16 件（4 カテゴリ × 4 サブカテゴリ）。
';

ALTER TABLE `skills` COMMENT = '個別スキル。SkillList で表示する単位（行単位で 1 スキル）。

- skill_subcategory_id は同一 skill_category_id に属するサブカテゴリのみ許可（アプリ層で検証）。
- level: 1=入門 〜 5=設計・指導が可能。習熟度ラベルは UI 側で固定保持する。
- 現状の初期データは 19 件。
';

ALTER TABLE `skill_evidences` COMMENT = 'スキルの「根拠」リンク（0..n）。実在する資格・作品ページがある場合のみ付与する。

- href は同一サイト内の相対パス（例: /works/portfolio/, /certifications/list/）。
- 現状 evidence を持つスキルは 6 件（Astro / Tailwind CSS / Playwright / AWS / UI/UX 設計 / 生成 AI 活用）。
';

ALTER TABLE `skill_subcategories` ADD FOREIGN KEY (`skill_category_id`) REFERENCES `skill_categories` (`id`) ON DELETE CASCADE;

ALTER TABLE `skills` ADD FOREIGN KEY (`skill_category_id`) REFERENCES `skill_categories` (`id`) ON DELETE CASCADE;

ALTER TABLE `skills` ADD FOREIGN KEY (`skill_subcategory_id`) REFERENCES `skill_subcategories` (`id`) ON DELETE RESTRICT;

ALTER TABLE `skill_evidences` ADD FOREIGN KEY (`skill_id`) REFERENCES `skills` (`id`) ON DELETE CASCADE;

