-- SQL dump generated using DBML (dbml.dbdiagram.io)
-- Database: MySQL
-- Generated at: 2026-06-29T09:11:43.962Z

CREATE TABLE `qualifications` (
  `id` int PRIMARY KEY NOT NULL AUTO_INCREMENT COMMENT 'ID',
  `qualification_name` varchar(255) NOT NULL COMMENT '資格名称',
  `overview` text COMMENT '資格の概要',
  `category` ENUM ('it', 'design', 'math', 'language', 'other') NOT NULL COMMENT '資格種別',
  `created_at` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  `updated_at` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE INDEX `idx_category` ON `qualifications` (`category`);

ALTER TABLE `qualifications` COMMENT = '資格情報の基盤となるマスタデータ';

