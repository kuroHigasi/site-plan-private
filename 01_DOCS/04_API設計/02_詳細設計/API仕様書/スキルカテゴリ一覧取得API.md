# スキルカテゴリ一覧取得API（公開）

## 1. 基本情報

| 項目 | 内容 |
|------|------|
| API名 | スキルカテゴリ一覧取得API（公開） |
| メソッド | GET |
| パス | `/api/public/skill-categories.php` |
| バージョン | v1（`Accept` ヘッダー指定） |
| 認証 | **不要** |
| 概要 | `skill_categories` と `skill_subcategories` を取得する。`include=skills` 指定時は各カテゴリ配下の `skills`（`skill_evidences` を含む）をネストして返す |
| 主な利用画面 | `/about/`（P002 プロフィール）, `/about/{slug}/`（P002-01〜04 スキル詳細） |

## 2. 共通仕様への準拠

本 API は `01_DOCS/wiki/04_API設計/00_共通仕様.md` に準拠する。

- `Accept: application/vnd.astrohp+json;version=1` が必須
- 認証不要（Bearer トークンは **使用しない**）
- エラー形式は RFC7807 互換（`type`, `title`, `status`, `detail`, `instance`, `traceId`）
- 成功時 `Cache-Control: public, max-age=60`（60 秒キャッシュ可）
- ブラウザから呼ぶ場合、`credentials: 'include'` は **不要**

## 3. リクエスト仕様

### 3.1 ヘッダー

| ヘッダー名 | 必須 | 値 | 説明 |
|------------|------|----|------|
| Accept | 必須 | `application/vnd.astrohp+json;version=1` | API バージョン指定 |

### 3.2 クエリパラメータ

| パラメータ | 型 | 必須 | デフォルト | 制約 | 説明 |
|------------|----|------|------------|------|------|
| include | string | 任意 | なし | `skills` のみ許可 | 指定時、各カテゴリに `skills[]`（`evidence` 含む）をネストして返す |
| page | integer | 任意 | 1 | 1 以上 | ページ番号 |
| per_page | integer | 任意 | 20 | 1〜50 | 1 ページあたり件数（カテゴリは現状 4 件のため通常 1 ページ） |

#### 利用例

- P002 プロフィール（カード 4 枚）: `/api/public/skill-categories.php?page=1&per_page=20`
- P002-01〜04 詳細ページ + `getStaticPaths`（スキルも一括取得）: `/api/public/skill-categories.php?include=skills&page=1&per_page=20`

## 4. データ取得ルール

- 取得元テーブル: `skill_categories`（`sc`）、`skill_subcategories`（`ss`）。`include=skills` 時は `skills`（`s`）と `skill_evidences`（`se`）も取得
- 公開制御: いずれのテーブルにも `is_published` は持たない。**DB 登録済みの行はすべて公開対象**とする
- 抽出条件: なし（全行返却）
- ネスト構造:
  - 各カテゴリに `subcategories[]` を必ず含める
  - `include=skills` のときのみ各カテゴリに `skills[]` を含める。各スキルは `evidence` を 0 件以上持つ
- ページングの単位: **カテゴリ（`skill_categories`）** に対して適用する。`subcategories` / `skills` / `evidence` は件数制限せず、該当カテゴリ配下を全件ネストする
- 並び順:
  - カテゴリ: `sc.sort_order ASC`, `sc.id ASC`
  - サブカテゴリ: `ss.sort_order ASC`, `ss.id ASC`
  - スキル: `s.sort_order ASC`, `s.id ASC`
  - 根拠（evidence）: `se.sort_order ASC`, `se.id ASC`
- ページング:
  - `OFFSET = (page - 1) * per_page`
  - `LIMIT = per_page`

## 5. レスポンス仕様

### 5.1 正常時（200 OK）— include なし

```json
{
  "data": [
    {
      "slug": "frontend",
      "title": "フロントエンド",
      "overview": "HTML・CSS・JavaScript を土台に、TypeScript と Vue.js・Astro でアクセシブルな画面を構築します。Tailwind CSS によるユーティリティファーストなスタイリングを得意としています。",
      "icon": "frontend",
      "is_coming_soon": false,
      "subcategories": [
        { "slug": "language", "label": "言語" },
        { "slug": "framework", "label": "フレームワーク" },
        { "slug": "styling", "label": "スタイリング" },
        { "slug": "devtools", "label": "開発ツール・テスト" }
      ]
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total": 4,
    "total_pages": 1
  }
}
```

### 5.2 正常時（200 OK）— include=skills

```json
{
  "data": [
    {
      "slug": "frontend",
      "title": "フロントエンド",
      "overview": "HTML・CSS・JavaScript を土台に...",
      "icon": "frontend",
      "is_coming_soon": false,
      "subcategories": [
        { "slug": "language", "label": "言語" },
        { "slug": "framework", "label": "フレームワーク" }
      ],
      "skills": [
        {
          "subcategory": "language",
          "name": "HTML",
          "summary": "セマンティックなマークアップとアクセシビリティを意識した構造化ができます。",
          "level": 4
        },
        {
          "subcategory": "framework",
          "name": "Astro",
          "summary": "本サイトを Astro で構築し、静的サイト生成と部分的な水和を活用しています。",
          "level": 3,
          "evidence": [
            { "label": "本サイトについて", "href": "/works/portfolio/" }
          ]
        }
      ]
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total": 4,
    "total_pages": 1
  }
}
```

### 5.3 レスポンス項目定義

| 項目 | 型 | Null許容 | 説明 |
|------|----|----------|------|
| data[].slug | string | いいえ | カテゴリ識別子（`frontend` / `backend` / `design` / `other`） |
| data[].title | string | いいえ | カテゴリ見出し（`skill_categories.title`） |
| data[].overview | string | いいえ | カード・詳細ページ共通の概要文（`skill_categories.overview`） |
| data[].icon | string | いいえ | カードアイコン種別（`frontend` / `backend` / `design` / `layers`） |
| data[].is_coming_soon | boolean | いいえ | 準備中フラグ。`true` のときカードを薄くしリンク非表示 |
| data[].subcategories[].slug | string | いいえ | サブカテゴリ識別子（フィルタ・SkillIcon キー） |
| data[].subcategories[].label | string | いいえ | フィルタボタンの表示名 |
| data[].skills | array | `include=skills` 時のみ | カテゴリ配下のスキル一覧。`include` 未指定時はキーごと省略 |
| data[].skills[].subcategory | string | いいえ | 紐付くサブカテゴリの `slug`（`SkillIcon.vue` のキー） |
| data[].skills[].name | string | いいえ | スキル名（`skills.name`） |
| data[].skills[].summary | string | いいえ | スキルの説明文（`skills.summary`） |
| data[].skills[].level | integer | いいえ | 習熟度（1〜5） |
| data[].skills[].evidence | array | はい | 根拠リンク。0 件のときはキーごと省略 |
| data[].skills[].evidence[].label | string | いいえ | リンク表示文言（`skill_evidences.label`） |
| data[].skills[].evidence[].href | string | いいえ | リンク先（同一サイト内の相対パス） |
| pagination.page | integer | いいえ | 現在ページ |
| pagination.per_page | integer | いいえ | 1 ページあたり件数 |
| pagination.total | integer | いいえ | カテゴリの総件数 |
| pagination.total_pages | integer | いいえ | 総ページ数 |

### 5.4 真偽値・数値の扱い

- `is_coming_soon` は **真偽値**（`true` / `false`）で返す（管理 API では 0/1 integer。詳細は管理 API 仕様書を参照）
- `level` は 1〜5 の **integer**。習熟度ラベル（「入門」等）は UI 側で固定保持し、API では返さない

### 5.5 レスポンスに含めない項目

- 各テーブルの `id` / `sort_order`
- `created_at` / `updated_at`
- `href`（カテゴリ詳細ページの URL `/about/{slug}/` は `slug` からフロントで生成）
- `include` 未指定時の `data[].skills`

## 6. エラー仕様

共通仕様に従い、エラーはすべて RFC7807 互換フォーマットで返却する。

| ステータス | 条件 | detail 例 |
|-----------|------|-----------|
| 400 Bad Request | `include` 不正値、`page` / `per_page` の形式・範囲不正 | `include must be 'skills'.` |
| 406 Not Acceptable | `Accept` ヘッダー未指定・形式不正・未対応 | `Unsupported API version.` |
| 500 Internal Server Error | 想定外エラー（DB 障害など） | `An unexpected error occurred.` |

### 6.1 エラー例（400）

```json
{
  "type": "about:blank",
  "title": "Bad Request",
  "status": 400,
  "detail": "include must be 'skills'.",
  "instance": "/api/public/skill-categories.php?include=foo",
  "traceId": "9a0b2d6f8c1e4a67"
}
```

## 7. バリデーション

| 対象 | ルール |
|------|--------|
| include | 指定時は `skills` のみ許可 |
| page | 数値のみ、1 以上 |
| per_page | 数値のみ、1 以上 50 以下 |

## 8. SQL イメージ

カテゴリとサブカテゴリの取得（`include` 共通）:

```sql
-- カテゴリ（ページング対象）
SELECT
  sc.slug,
  sc.title,
  sc.overview,
  sc.icon,
  sc.is_coming_soon
FROM skill_categories sc
ORDER BY sc.sort_order ASC, sc.id ASC
LIMIT :limit OFFSET :offset;

-- サブカテゴリ（取得済みカテゴリ ID で絞り込み）
SELECT
  ss.skill_category_id,
  ss.slug,
  ss.label
FROM skill_subcategories ss
WHERE ss.skill_category_id IN (:category_ids)
ORDER BY ss.skill_category_id ASC, ss.sort_order ASC, ss.id ASC;
```

`include=skills` 指定時に追加で取得（スキル + 根拠）:

```sql
-- スキル
SELECT
  s.id,
  s.skill_category_id,
  ss.slug AS subcategory,
  s.name,
  s.summary,
  s.level
FROM skills s
INNER JOIN skill_subcategories ss ON s.skill_subcategory_id = ss.id
WHERE s.skill_category_id IN (:category_ids)
ORDER BY s.skill_category_id ASC, s.sort_order ASC, s.id ASC;

-- 根拠（取得済みスキル ID で絞り込み）
SELECT
  se.skill_id,
  se.label,
  se.href
FROM skill_evidences se
WHERE se.skill_id IN (:skill_ids)
ORDER BY se.skill_id ASC, se.sort_order ASC, se.id ASC;
```

取得後、アプリ層で `skill_category_id` / `skill_id` をキーにグルーピングしてネスト構造を組み立てる（N+1 を避けるため `IN` でまとめて取得する）。

## 9. 補足

### 9.1 エンドポイント方針

- 公開 API は本エンドポイント 1 本に集約する（案 B: ネスト型）。SSG ビルド時の fetch 回数を 1 回に抑えられる。
- スキルのみを横断取得する `/api/public/skills.php?category=` は現状不要のため設けない。将来カテゴリ横断検索が必要になった場合の拡張候補とする。
- 管理画面での CRUD は site-plan-security リポジトリ `01_DOCS/wiki/04_API設計/04_スキル管理API.md` を参照する。

### 9.2 フロントエンド（astro-hp）連携メモ

本リポジトリのスコープ外だが、実装時の参照として整理する。

| 項目 | 方針 |
|------|------|
| 型定義 | `src/types/api/skills.ts`（API 仕様準拠・snake_case） |
| 取得関数 | `src/lib/api/skills.ts` に `fetchSkillCategories({ includeSkills?: boolean })` を追加 |
| フィクスチャ | `src/fixtures/skill-categories.json`（`include=skills` 相当の 1 ファイル）。`PUBLIC_API_USE_FIXTURE=true` で利用 |
| UI 型マッピング | API `is_coming_soon` → UI `isComingSoon`、`slug` → `href`（`/about/{slug}/`）を生成 |
| 利用ページ | `about/index.astro`（カテゴリのみ）、`about/[category].astro` の `getStaticPaths`（`include=skills`） |
| テスト | Playwright ビジュアルテスト 4 ページ（`/about/frontend/` 等）は fixture 運用を継続 |

### 9.3 整合性の注意

- `subcategory` slug は `SkillIcon.vue` がアイコン選択のキーに使う。定義済み slug と一致させること。未知の slug はフロントでフォールバック表示になる。
- `slug` はカテゴリ内で一意（`language` は frontend / other で別行）。`subcategory` の値はカテゴリのコンテキスト内で解釈する。
