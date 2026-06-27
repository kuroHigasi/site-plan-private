# skill_categories テーブル定義

> 自動生成: 2026-06-27

## skill_categories

> スキルカテゴリのマスタ。P002 のカードと P002-01〜04 の詳細ページで共通利用する。

- slug はサイト URL（/about/{slug}/）と SkillIcon の種別キーを兼ねる。UNIQUE。
- overview はカードの概要文と詳細ページ冒頭で同一文言を使う。
- 現状の初期データは 4 件（frontend / backend / design / other）。
- sort_order 初期値: frontend=1, backend=2, design=3, other=4。


| カラム名 | 型 | NOT NULL | PK | デフォルト値 | 備考 |
| --- | --- | :---: | :---: | --- | --- |
| id | int | ✓ | ✓ |  | ID |
| slug | skill_category_slug | ✓ |  |  | カテゴリ識別子（URL・SkillIcon キー） |
| title | varchar(255) | ✓ |  |  | 見出し（例: フロントエンド） |
| overview | text | ✓ |  |  | カード説明・詳細ページ概要で共通利用する文言 |
| icon | skill_icon | ✓ |  |  | カードアイコン種別 |
| is_coming_soon | tinyint(1) | ✓ |  | 0 | 準備中フラグ（0:公開 / 1:準備中。1 のときカードを薄くしリンク非表示） |
| sort_order | int | ✓ |  | 0 | カテゴリ表示順（昇順） |
| created_at | timestamp | ✓ |  | `CURRENT_TIMESTAMP` |  |
| updated_at | timestamp | ✓ |  | `CURRENT_TIMESTAMP` |  |

### インデックス

| 名前 | カラム | ユニーク |
| --- | --- | :---: |
| uq_skill_categories_slug | slug | ✓ |
| idx_skill_categories_sort_order | sort_order |  |

### 外部キー

| カラム | 参照先テーブル | 参照先カラム | 関係 |
| --- | --- | --- | --- |
| id | skill_subcategories | skill_category_id | * - 1 |
| id | skills | skill_category_id | * - 1 |

## skill_subcategories

> カテゴリ配下のサブカテゴリ（SkillList のフィルタタブ）。

- slug はカテゴリ内で一意（language は frontend / other で別行として保持）。
- SkillIcon.vue が slug をキーにアイコンを選ぶため、定義済み slug と一致させる。
- 現状の初期データは 16 件（4 カテゴリ × 4 サブカテゴリ）。


| カラム名 | 型 | NOT NULL | PK | デフォルト値 | 備考 |
| --- | --- | :---: | :---: | --- | --- |
| id | int | ✓ | ✓ |  | ID |
| skill_category_id | int | ✓ |  |  | カテゴリID |
| slug | varchar(64) | ✓ |  |  | サブカテゴリ識別子（フィルタ・SkillIcon キー。カテゴリ内で一意） |
| label | varchar(255) | ✓ |  |  | フィルタボタンの表示名 |
| sort_order | int | ✓ |  | 0 | タブ表示順（昇順） |
| created_at | timestamp | ✓ |  | `CURRENT_TIMESTAMP` |  |
| updated_at | timestamp | ✓ |  | `CURRENT_TIMESTAMP` |  |

### インデックス

| 名前 | カラム | ユニーク |
| --- | --- | :---: |
| uq_skill_subcategories_category_slug | skill_category_id, slug | ✓ |
| idx_skill_subcategories_category_sort | skill_category_id, sort_order |  |

### 外部キー

| カラム | 参照先テーブル | 参照先カラム | 関係 |
| --- | --- | --- | --- |
| skill_category_id | skill_categories | id | * - 1 |
| id | skills | skill_subcategory_id | * - 1 |

## skills

> 個別スキル。SkillList で表示する単位（行単位で 1 スキル）。

- skill_subcategory_id は同一 skill_category_id に属するサブカテゴリのみ許可（アプリ層で検証）。
- level: 1=入門 〜 5=設計・指導が可能。習熟度ラベルは UI 側で固定保持する。
- 現状の初期データは 19 件。


| カラム名 | 型 | NOT NULL | PK | デフォルト値 | 備考 |
| --- | --- | :---: | :---: | --- | --- |
| id | int | ✓ | ✓ |  | ID |
| skill_category_id | int | ✓ |  |  | カテゴリID |
| skill_subcategory_id | int | ✓ |  |  | サブカテゴリID |
| name | varchar(255) | ✓ |  |  | スキル名（見出し） |
| summary | text | ✓ |  |  | スキルの説明文 |
| level | int | ✓ |  |  | 習熟度（1〜5） |
| sort_order | int | ✓ |  | 0 | カテゴリ内の表示順（昇順） |
| created_at | timestamp | ✓ |  | `CURRENT_TIMESTAMP` |  |
| updated_at | timestamp | ✓ |  | `CURRENT_TIMESTAMP` |  |

### インデックス

| 名前 | カラム | ユニーク |
| --- | --- | :---: |
| idx_skills_category_id | skill_category_id |  |
| idx_skills_subcategory_id | skill_subcategory_id |  |
| idx_skills_category_sort | skill_category_id, sort_order |  |

### 外部キー

| カラム | 参照先テーブル | 参照先カラム | 関係 |
| --- | --- | --- | --- |
| skill_category_id | skill_categories | id | * - 1 |
| skill_subcategory_id | skill_subcategories | id | * - 1 |
| id | skill_evidences | skill_id | * - 1 |

## skill_evidences

> スキルの「根拠」リンク（0..n）。実在する資格・作品ページがある場合のみ付与する。

- href は同一サイト内の相対パス（例: /works/portfolio/, /certifications/list/）。
- 現状 evidence を持つスキルは 6 件（Astro / Tailwind CSS / Playwright / AWS / UI/UX 設計 / 生成 AI 活用）。


| カラム名 | 型 | NOT NULL | PK | デフォルト値 | 備考 |
| --- | --- | :---: | :---: | --- | --- |
| id | int | ✓ | ✓ |  | ID |
| skill_id | int | ✓ |  |  | スキルID |
| label | varchar(255) | ✓ |  |  | 根拠リンクの表示文言 |
| href | varchar(255) | ✓ |  |  | 根拠リンク先（同一サイト内の相対パス） |
| sort_order | int | ✓ |  | 0 | 同一スキル内の表示順（昇順） |
| created_at | timestamp | ✓ |  | `CURRENT_TIMESTAMP` |  |
| updated_at | timestamp | ✓ |  | `CURRENT_TIMESTAMP` |  |

### インデックス

| 名前 | カラム | ユニーク |
| --- | --- | :---: |
| idx_skill_evidences_skill_sort | skill_id, sort_order |  |

### 外部キー

| カラム | 参照先テーブル | 参照先カラム | 関係 |
| --- | --- | --- | --- |
| skill_id | skills | id | * - 1 |
