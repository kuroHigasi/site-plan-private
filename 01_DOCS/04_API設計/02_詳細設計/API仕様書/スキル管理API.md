# スキル管理API（管理）

> **ステータス: 第 2 フェーズ（叩き台・プレースホルダ）**
> 本仕様はカテゴリ・スキルの CRUD を担う管理 API の枠組みのみを定義する。
> 詳細項目は公開 API（`スキルカテゴリ一覧取得API.md`）の確定後に肉付けする。

## 1. 基本情報

| 項目 | 内容 |
|------|------|
| API名 | スキル管理API |
| メソッド | GET / POST / PUT / PATCH / DELETE |
| パス | `/api/admin/skill-categories.php`, `/api/admin/skills.php` |
| バージョン | v1（`Accept` ヘッダー指定） |
| 認証 | **セッション Cookie 必須** |
| CSRF | 変更系（POST/PUT/PATCH/DELETE）は **`X-CSRF-Token` 必須** |
| 概要 | `skill_categories` / `skill_subcategories`（カテゴリ・サブカテゴリ）および `skills` / `skill_evidences`（スキル・根拠）の CRUD |
| 主な利用画面 | 管理画面（スキルセットの編集） |

## 2. 共通仕様への準拠

本 API は `01_DOCS/wiki/04_API設計/00_共通仕様.md` に準拠する。

- `Accept: application/vnd.astrohp+json;version=1` が必須
- 全リクエストに `credentials: 'include'`（Cookie 送信）
- 変更系リクエストに `X-CSRF-Token` ヘッダー
- JSON ボディ送信時は `Content-Type: application/json`
- エラー形式は RFC7807 互換

---

## 3. スキルカテゴリ API（`/api/admin/skill-categories.php`）

対象テーブル: `skill_categories`、`skill_subcategories`

### 3.1 GET — 一覧取得（TODO）

- 全カテゴリを `sort_order ASC` で返す。`subcategories[]` をネスト。
- 公開 API と異なり、`id` / `sort_order` / `created_at` / `updated_at` を返却する。
- `is_coming_soon` は **0/1 の integer** で返す（公開 API は boolean）。

### 3.2 POST — カテゴリ作成（TODO）

- レスポンス: `{ "data": { "id": N } }`（201）

### 3.3 PUT / PATCH — カテゴリ更新（TODO）

- レスポンス: `{ "data": { "id": N, "updated": true } }`（200）

### 3.4 DELETE — カテゴリ削除（TODO）

- レスポンス: `{ "data": { "id": N, "deleted": true } }`（200）
- 配下の `skill_subcategories` / `skills` / `skill_evidences` は FK の `ON DELETE CASCADE` 連動を前提とする（`skills.skill_subcategory_id` は `RESTRICT` のため、サブカテゴリ単体削除時は紐付くスキルの有無を検証）。

### 3.5 サブカテゴリの扱い（TODO）

- サブカテゴリはカテゴリのサブリソースとして同一エンドポイントで扱うか、別エンドポイントに分けるかを実装時に決定する。

---

## 4. スキル API（`/api/admin/skills.php`）

対象テーブル: `skills`、`skill_evidences`

### 4.1 GET — 一覧取得（TODO）

- `category` 等で絞り込み可能とする想定。`evidence[]` をネスト。

### 4.2 POST — スキル作成（TODO）

- `skill_category_id` / `skill_subcategory_id` の整合性（サブカテゴリが当該カテゴリに属すること）を検証する。
- `level` は 1〜5 の範囲を検証する。
- レスポンス: `{ "data": { "id": N } }`（201）

### 4.3 PUT / PATCH — スキル更新（TODO）

- レスポンス: `{ "data": { "id": N, "updated": true } }`（200）

### 4.4 DELETE — スキル削除（TODO）

- レスポンス: `{ "data": { "id": N, "deleted": true } }`（200）
- 配下の `skill_evidences` は `ON DELETE CASCADE` で連動削除。

---

## 5. バリデーション（TODO）

| 対象 | ルール |
|------|--------|
| slug（カテゴリ） | `frontend` / `backend` / `design` / `other` のいずれか。UNIQUE |
| slug（サブカテゴリ） | カテゴリ内で一意 |
| icon | `frontend` / `backend` / `design` / `layers` のいずれか |
| level | 1〜5 の整数 |
| skill_subcategory_id | 指定した `skill_category_id` に属すること |
| evidence[].href | 同一サイト内の相対パス |

## 6. 補足

- 公開取得は `/api/public/skill-categories.php` を使用する（`スキルカテゴリ一覧取得API.md` 参照）。
- 表示順は `sort_order` カラムで制御する。並べ替え UI を設ける場合は本 API で `sort_order` を更新する。
