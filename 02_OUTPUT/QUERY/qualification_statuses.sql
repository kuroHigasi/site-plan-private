-- SQL dump generated using DBML (dbml.dbdiagram.io)
-- Database: MySQL
-- Generated at: 2026-06-25T00:00:41.282Z

CREATE TABLE `qualification_statuses` (
  `id` int PRIMARY KEY NOT NULL AUTO_INCREMENT COMMENT 'ID',
  `qualification_id` int NOT NULL COMMENT '資格ID',
  `status` ENUM ('earned', 'in_progress', 'pending') NOT NULL COMMENT '資格取得状況',
  `start_date` date NOT NULL COMMENT '学習開始年月',
  `scheduled_exam` date COMMENT '受験予定年月',
  `earned_at` date COMMENT '取得年月',
  `progress` int CHECK (progress IS NULL OR (progress >= 0 AND progress <= 100)) COMMENT '学習進捗率（0-100）',
  `progress_note` text COMMENT '学習進捗の補足説明',
  `link` varchar(255) COMMENT 'ブログURL',
  `created_at` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  `updated_at` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE INDEX `idx_qualification_id` ON `qualification_statuses` (`qualification_id`);

CREATE INDEX `idx_status_earned_at` ON `qualification_statuses` (`status`, `earned_at`);

CREATE INDEX `idx_status_start_date` ON `qualification_statuses` (`status`, `start_date`);

ALTER TABLE `qualification_statuses` COMMENT = '資格情報の取得状況を管理するテーブル。
同一 qualification_id に複数行を許可する（例: G検定の年度別取得履歴）。

【表示単位】
- P005-01（取得資格一覧）: 行単位。status = earned の各行が1カードとなる。
- P005-02（現在学習中の資格）: 行単位。status IN (in_progress, pending) の各行が1カードとなる。

【公開 API の抽出】（詳細は API 仕様書に記載）
- P005-01: status = earned
- P005-02: status IN (in_progress, pending)

【start_date の扱い（B案）】
- 全ステータスで start_date は NOT NULL。
- 過去取得資格の後追い登録は行わない。
- earned 登録時は start_date = earned_at とする（学習開始日を個別に持たない場合の代替ルール）。

【ステータス別カラムルール】
| status      | start_date | earned_at | scheduled_exam | progress   | progress_note | link |
|-------------|------------|-----------|----------------|------------|---------------|------|
| earned      | 必須       | 必須      | null 固定      | null 固定  | 任意          | 任意 |
| in_progress | 必須       | null 固定 | 任意           | 任意(0-100)| 任意          | 任意 |
| pending     | 必須       | null 固定 | 任意           | 任意(0-100)| 任意          | 任意 |

- progress 未指定時: UI 側で進捗バーを非表示とする（in_progress / pending）。
- 日付カラムは DB 上 date 型。API レスポンスでは YYYY-MM 形式で返却する。
';

ALTER TABLE `qualification_statuses` ADD FOREIGN KEY (`qualification_id`) REFERENCES `qualifications` (`id`) ON DELETE RESTRICT;
