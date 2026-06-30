# ブラウザ開発者向け API 利用ガイド（公開 API）

この API は **ポートフォリオサイトのフロント（Astro 等）から直接呼ぶ前提** で設計されています。本ガイドは認証不要の **公開 API（`/api/public/`）** を対象とします。

詳細なエンドポイント仕様は `01_DOCS/04_API設計/02_詳細設計/API仕様書/` 配下の各ドキュメントを参照してください。

> 管理画面（`/admin/*`）のフロントから管理 API（`/api/admin/`）を呼ぶ実装は、非公開リポジトリ **site-plan-security** の `01_DOCS/04_API設計/02_詳細設計/管理画面向けAPI利用ガイド.md`（Wiki: `09_管理画面向けAPI利用ガイド`）を参照してください。

---

## 1. ベース URL とエンドポイント構成

| 環境 | ベース URL（例） |
|------|------------------|
| ローカル Docker | `http://localhost:8080/api/` |
| 本番 | `https://<your-domain>/api/` |

エンドポイントは **`.php` ファイル単位** です（REST 風ルーティングではありません）。

```
/api/public/   … 認証不要・読み取り専用（公開サイト向け。本ガイドの対象）
/api/admin/    … 要ログイン・書き込み・PII（管理画面向け。site-plan-security 管理）
```

**旧 URL は使わないでください。** 公開サイトからは公開エンドポイントに差し替えます。

| 旧 | 新（公開） |
|----|-----|
| `/api/changelogs.php` | `/api/public/changelogs.php` |

---

## 2. 全リクエスト共通：必須ヘッダー

### Accept（必須・省略不可）

```
Accept: application/vnd.astrohp+json;version=1
```

- 未指定・形式不正・未対応バージョン → **406 Not Acceptable**
- 現在サポートされているバージョンは **v1 のみ**

### レスポンス形式

- 成功時: `Content-Type: application/json; charset=UTF-8`
- 一覧系: `{ "data": [...], "pagination": {...} }`
- 単体系: `{ "data": {...} }`

---

## 3. CORS

公開 API は認証不要で Cookie を使わないため、`credentials: 'include'` は不要です。

許可ヘッダー: `Authorization, Content-Type, Accept, X-CSRF-Token`  
許可メソッド: `GET, POST, PUT, PATCH, DELETE, OPTIONS`  
`OPTIONS` は **204 No Content**（プリフライト用）

---

## 4. 公開 API（`/api/public/`）の方針

- **認証不要**
- **GET のみ**（現状）
- **公開済みデータのみ**（例: `is_published = 1` の changelogs）
- Bearer トークンは **使わない**（廃止済み）
- email 等の PII は返しません（管理 API のみ。site-plan-security 参照）

---

## 5. エンドポイント詳細

### 公開: 変更履歴一覧

```
GET /api/public/changelogs.php
```

詳細: [変更履歴取得API.md](./API仕様書/変更履歴取得API.md)

| クエリ | 型 | デフォルト | 制約 |
|--------|-----|-----------|------|
| `page` | int | `1` | 1 以上 |
| `per_page` | int | `10` | 1〜50 |
| `from` | date | — | `YYYY-MM-DD` |
| `to` | date | — | `YYYY-MM-DD`、`from` より後は不可 |

**Response 例:**
```json
{
  "data": [
    {
      "id": 4,
      "title": "パフォーマンス改善",
      "body": "...",
      "changed_at": "2025-07-10"
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 10,
    "total": 4,
    "total_pages": 1
  }
}
```

- `is_published`・`created_at` 等は **返りません**
- `Cache-Control: public, max-age=60` が付きます（60秒キャッシュ可）
- `credentials: 'include'` は不要です

> 公開サイトが利用するその他の公開 API（資格・スキル・YouTube 等）は `API仕様書/` 配下の各仕様書を参照してください。管理画面向けの CRUD は site-plan-security で管理します。

---

## 6. エラーレスポンス（RFC 7807 互換）

すべてのエラーは同一形式です。

```json
{
  "type": "about:blank",
  "title": "Bad Request",
  "status": 400,
  "detail": "page must be an integer of 1 or greater.",
  "instance": "/api/public/changelogs.php?page=abc",
  "traceId": "trace-..."
}
```

| HTTP | 意味 | 主な発生場面 |
|------|------|-------------|
| 400 | バリデーションエラー | 不正なクエリ・JSON・必須項目不足 |
| 404 | リソースなし | 存在しない・非公開の id |
| 405 | メソッド不許可 | 許可外 HTTP メソッド |
| 406 | Accept 不正 | Accept ヘッダー未設定・形式不正 |
| 500 | サーバーエラー | DB 障害等（詳細は返さない） |

フロント実装では **`response.ok` だけでなく `status` と `detail` を見る** 設計がよいです。

---

## 7. fetch 実装の参考コード

### 公開 API（変更履歴）

```javascript
const API_ACCEPT = 'application/vnd.astrohp+json;version=1';
const BASE = import.meta.env.PUBLIC_API_BASE ?? 'http://localhost:8080/api';

async function fetchPublicChangelogs({ page = 1, perPage = 10, from, to } = {}) {
  const params = new URLSearchParams({ page, per_page: perPage });
  if (from) params.set('from', from);
  if (to) params.set('to', to);

  const res = await fetch(`${BASE}/public/changelogs.php?${params}`, {
    headers: { Accept: API_ACCEPT },
  });

  if (!res.ok) {
    const problem = await res.json();
    throw new Error(problem.detail ?? problem.title);
  }
  return res.json();
}
```

---

## 8. 知っておくべき制約・注意点

### やってはいけないこと

- **Bearer トークンをブラウザに埋め込む**（廃止済み。秘密は置けない）
- 公開 API 経由で **email 等の PII を期待する**（管理 API のみ。site-plan-security 参照）

### バリデーションの細かい点

- 日付は **`YYYY-MM-DD` のみ**（時刻不可）
- JSON body が空・不正 → `400`

### キャッシュ

- 公開 changelogs のみ `max-age=60`

---

## 9. フロント側の環境変数（推奨）

```env
PUBLIC_API_BASE=https://your-domain.com/api
```

開発時:

```env
PUBLIC_API_BASE=http://localhost:8080/api
```

Accept ヘッダーのサービス名は `astrohp` 固定（サーバー側 `API_SERVICE_NAME` と一致させる）。

---

## 10. チェックリスト（実装前）

- [ ] 公開ページは `/api/public/` のみ使用
- [ ] 全リクエストに `Accept: application/vnd.astrohp+json;version=1`
- [ ] 406/404 を UI に反映
- [ ] 旧 `/api/changelogs.php` 等への参照を削除済み

---

## 関連ドキュメント

| ドキュメント | 内容 |
|-------------|------|
| [00_共通仕様.md](../../wiki/04_API設計/00_共通仕様.md) | 公開 API 共通仕様 |
| [変更履歴取得API.md](./API仕様書/変更履歴取得API.md) | 公開 changelogs GET |

> 管理 API（認証・CRUD・ユーザー一覧等）の仕様は site-plan-security の `01_DOCS/wiki/04_API設計/`（`01_管理画面認証API` 〜 `09_管理画面向けAPI利用ガイド`）を参照してください。
