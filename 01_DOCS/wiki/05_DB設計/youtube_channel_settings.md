# youtube_channel_settings テーブル定義

> 自動生成: 2026-06-29

## youtube_channel_settings

> P006-04（YouTube）のチャンネル概要セクションで使用する singleton テーブル。

- 行は常に 1 件（id = 1 固定）。AUTO_INCREMENT は付与しない。
- 初期データはマイグレーションの seed で 1 行投入する想定。
- 公開 API（youtube-channel.php）は本行を単件で返却する。


| カラム名 | 型 | NOT NULL | PK | デフォルト値 | 備考 |
| --- | --- | :---: | :---: | --- | --- |
| id | int | ✓ | ✓ |  | ID（固定値 1 のみ） |
| overview | text | ✓ |  |  | チャンネルの概要 |
| channel_url | varchar(255) |  |  |  | YouTube チャンネル URL |
| created_at | timestamp | ✓ |  | `CURRENT_TIMESTAMP` |  |
| updated_at | timestamp | ✓ |  | `CURRENT_TIMESTAMP` |  |
