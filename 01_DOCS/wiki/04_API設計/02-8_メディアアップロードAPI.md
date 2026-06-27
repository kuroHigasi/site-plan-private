# メディアアップロードAPI（管理）

> **ステータス: 第 2 フェーズ（叩き台・プレースホルダ）**
> 本仕様は案C（YouTube 自動サムネ + カスタム画像差し替え）の **カスタムサムネイル差し替え** 用に枠組みのみを定義する。
> 実装は custom サムネイルの差し替えが必要になったタイミングで着手する（Phase 1 は `thumbnail_source=youtube` のみで運用可能）。

## 1. 基本情報

| 項目 | 内容 |
|------|------|
| API名 | メディアアップロードAPI |
| メソッド | POST |
| パス | `/api/admin/media.php` |
| バージョン | v1（`Accept` ヘッダー指定） |
| 認証 | **セッション Cookie 必須** |
| CSRF | **`X-CSRF-Token` 必須** |
| Content-Type | `multipart/form-data` |
| 概要 | サムネイル画像をアップロードし、保存パスを返す。返却 `path` を動画 API の `thumbnail_path` に設定する |
| 主な利用画面 | 管理画面（YouTube 動画のカスタムサムネイル設定） |

## 2. 共通仕様への準拠

本 API は `01_DOCS/wiki/04_API設計/00_共通仕様.md` に準拠する。

- `Accept: application/vnd.astrohp+json;version=1` が必須
- 全リクエストに `credentials: 'include'`（Cookie 送信）
- 変更系のため `X-CSRF-Token` ヘッダー必須
- リクエストは `multipart/form-data`（JSON ではない）
- エラー形式は RFC7807 互換

---

## 3. POST — アップロード（TODO）

### 3.1 リクエスト（multipart/form-data）

| フィールド | 型 | 必須 | 制約 | 説明 |
|------------|----|------|------|------|
| file | file | 必須 | 下記制約 | アップロードする画像ファイル |
| purpose | string | 任意 | `youtube_thumbnail`（既定） | 保存先サブディレクトリの決定に使用 |

#### ファイル制約

| 項目 | 制約 |
|------|------|
| 許可 MIME | `image/jpeg`, `image/png`, `image/webp` |
| 最大サイズ | 2MB |
| 推奨解像度 | 1280x720（16:9） |

### 3.2 保存ルール（TODO）

- 保存先: `/media/youtube/{uuid}.webp`（`purpose=youtube_thumbnail` の場合）
- 保存時に WebP へ変換・リサイズする想定（実装時に決定）。変換可否は Phase 2 で確定する
- ファイル名は推測困難な UUID とし、元ファイル名は使用しない

### 3.3 正常時（201 Created）

```json
{
  "data": {
    "path": "/media/youtube/9b1c2d3e-4f5a-6789-abcd-ef0123456789.webp"
  }
}
```

| 項目 | 型 | Null許容 | 説明 |
|------|----|----------|------|
| path | string | いいえ | 保存パス。動画 API の `thumbnail_path` にそのまま設定する |

---

## 4. 管理画面フロー

```
1. 「カスタム画像に差し替え」で画像を選択
2. POST /api/admin/media.php（multipart）→ data.path を取得
3. PATCH /api/admin/youtube-videos.php?id=N で
   thumbnail_source=custom, thumbnail_path=data.path を設定
4. 「YouTube サムネに戻す」で thumbnail_source=youtube に更新
   （サーバー側で thumbnail_path を null クリア）
```

---

## 5. エラー仕様

| ステータス | 条件 | detail 例 |
|-----------|------|-----------|
| 400 Bad Request | `file` 欠落、MIME 不正、サイズ超過 | `Unsupported file type.` / `File size exceeds 2MB.` |
| 401 Unauthorized | Cookie なし・セッション無効 | `Authentication required.` |
| 403 Forbidden | CSRF トークン欠落/不一致 | `CSRF token mismatch.` |
| 406 Not Acceptable | Accept ヘッダー不正 | `Unsupported API version.` |
| 413 Payload Too Large | アップロードサイズ上限超過 | `Payload too large.` |
| 500 Internal Server Error | 保存・変換失敗等 | `An unexpected error occurred.` |

## 6. 補足（実装時に確定する事項）

- 保存先の選択肢（API サーバー配下 `public/media/` / オブジェクトストレージ等）は実装時に決定する。
- 動画削除・サムネ差し替え時の **孤立ファイル掃除方針**（即時削除 / バッチ）は別途定義する。
- 本 API は YouTube サムネイル用途を主とするが、`purpose` で将来的に他用途（UI スクリーンショット等）へ拡張する余地を残す。
- カスタムサムネイルを設定する動画の更新は `/api/admin/youtube-videos.php` を使用する（`YouTube動画管理API.md` 参照）。
