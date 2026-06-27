# youtube_video_links テーブル定義

> 自動生成: 2026-06-27

## youtube_video_links

> 動画詳細（P006-04-01）の「関連リンク」セクションで使用する。

- 0 件の場合、フロントエンドはセクションごと非表示とする。
- YouTube 本編への視聴リンクは youtube_videos.youtube_video_id から生成するため、
  本テーブルには登録しない。


| カラム名 | 型 | NOT NULL | PK | デフォルト値 | 備考 |
| --- | --- | :---: | :---: | --- | --- |
| id | int | ✓ | ✓ |  | ID |
| youtube_video_id | int | ✓ |  |  | 動画ID |
| label | varchar(255) | ✓ |  |  | リンクの表示文言 |
| url | varchar(255) | ✓ |  |  | リンク先 URL（http/https） |
| sort_order | int | ✓ |  | 0 | 同一動画内の表示順（昇順） |
| created_at | timestamp | ✓ |  | `CURRENT_TIMESTAMP` |  |
| updated_at | timestamp | ✓ |  | `CURRENT_TIMESTAMP` |  |

### インデックス

| 名前 | カラム | ユニーク |
| --- | --- | :---: |
| idx_youtube_video_links_video_sort | youtube_video_id, sort_order |  |

### 外部キー

| カラム | 参照先テーブル | 参照先カラム | 関係 |
| --- | --- | --- | --- |
| youtube_video_id | youtube_videos | id | * - 1 |
