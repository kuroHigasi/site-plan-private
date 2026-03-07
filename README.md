# 目次
- [運用ルール](#運用ルール)
- [GitHub Actionについて](#github-actionについて)
- [ソースコードについて](#ソースコードについて)
- [フォルダ構成](#フォルダ構成)
- [リンク](#リンク)

# 運用ルール
- 00_TODO: タスク管理
    - タスクの状態は「00_TODO/TODO.md」内で管理する
        - 例: `- [ ] タスク1`, `- [x] タスク2`
    - タスクの状態は、完了したタスクを `[x]` に変更することで管理する
    - 月毎にTODOリストを作成し、過去のTODOリストは「old」フォルダに移動する
        - 例: `00_TODO/old/TODO_2024-06.md`、`00_TODO/old/TODO_2024-05.md`
    - 優先度が低く来月以降に対応予定のタスクは、「00_TODO/TODO_tentative.md」に記載する
    - タスクのテンプレートは「00_TODO/template/TODO_template.md」で管理する
- 01_DOCS: ドキュメント管理
    - wikiは「01_DOCS/wiki」フォルダ内のMarkdownファイルで管理する
        - 「01_DOCS/wiki/HOME.md」にはWikiの概要や運用ルールを記載する
    - 仕様書や設計書などのドキュメントは「01_DOCS」フォルダ内で管理する
    - バージョン管理は「01_DOCS/VERSION.md」で行う
- 02_OUTPUT: 成果物管理
    - バージョン管理は「02_OUTPUT/VERSION.md」で行う
    - その他の成果物は「02_OUTPUT」フォルダ内で管理する
- scripts: ドキュメント管理や成果物管理に関連するスクリプトを配置する
    - 例: ドキュメントの更新をWikiに反映するスクリプト「scripts/sync-docs-to-wiki.js」

# GitHub Actionについて
- ドキュメントの更新を検知してWikiに反映するGitHub Actionを設定
- ドキュメントは「01_DOCS/wiki」フォルダ内のMarkdownファイルで管理し、変更があった場合にWikiに自動的に反映されるようにする
    - ページ作成には「scripts/sync-docs-to-wiki.js」を使用

# ソースコードについて
- 実際のソースコードは別リポジトリで管理するため、このリポジトリではドキュメントと成果物の管理に特化する

# フォルダ構成
```
.
├── README.md
├── 00_TODO/
│   ├── old/
│   │   └── ...
│   ├── template/
│   │   └── TODO_template.md
│   ├── TODO_tentative.md
│   └── TODO.md
├── 01_DOCS/
│   ├── VERSION.md
│   └── wiki/
│       └── ...
├── 02_OUTPUT/
│   ├── VERSION.md
│   └── ...
└── scripts/
    └── sync-docs-to-wiki.js
```

# リンク
- [WIKI](https://github.com/{{OWNER}}/{{REPOSITORY_NAME}}/wiki)
