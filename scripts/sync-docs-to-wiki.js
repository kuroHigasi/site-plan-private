#!/usr/bin/env node

/**
 * 01_DOCS/ 配下の設計書を GitHub Wiki に同期するスクリプト
 *
 * このスクリプトはGitHub Actions環境でのみ実行可能です。
 * ローカル環境からの実行は許可されていません。
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 環境変数の取得
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO || process.env.GITHUB_REPOSITORY;
const GITHUB_ACTIONS = process.env.GITHUB_ACTIONS === 'true';

// GitHub Actions環境でのみ実行を許可
if (!GITHUB_ACTIONS) {
    console.error('❌ このスクリプトはGitHub Actions環境でのみ実行できます');
    console.error('   ローカル環境からの実行は許可されていません');
    console.error('   Wiki同期はGitHub Actionsから自動的に実行されます');
    process.exit(1);
}

if (!GITHUB_TOKEN) {
    console.error('❌ GITHUB_TOKEN 環境変数が設定されていません');
    process.exit(1);
}

if (!GITHUB_REPO) {
    console.error('❌ GITHUB_REPO 環境変数が設定されていません');
    console.error('   例: GITHUB_REPO=owner/repo');
    process.exit(1);
}

const [owner, repo] = GITHUB_REPO.split('/');
if (!owner || !repo) {
    console.error('❌ GITHUB_REPO の形式が正しくありません');
    console.error('   例: GITHUB_REPO=owner/repo');
    process.exit(1);
}

// ここは実際の構成に合わせて変更してください
const DOCS_DIR = path.join(process.cwd(), '01_DOCS', 'wiki');

// Wiki にのみ残すべきページ（削除対象外）
// [private] で始まるページは自動的に保護されます
const PROTECTED_WIKI_PAGES = [];

/**
 * 01_DOCS/wiki/ 配下の Markdown ファイルを再帰的に取得
 */
function getMarkdownFiles(dir, basePath = '') {
    const files = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.join(basePath, entry.name);

        if (entry.isDirectory()) {
            // サブディレクトリも含める
            files.push(...getMarkdownFiles(fullPath, relativePath));
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
            files.push({
                filePath: fullPath,
                relativePath: relativePath,
                wikiTitle: getWikiTitle(relativePath),
            });
        }
    }

    return files;
}

/**
 * ファイルパスから Wiki ページタイトルを生成
 */
function getWikiTitle(relativePath) {
    // ファイル名から拡張子を除去
    const nameWithoutExt = relativePath.replace(/\.md$/, '');

    // パス区切りをハイフンに変換（必要に応じて調整）
    // 例: "01_要件定義書" -> "01_要件定義書"
    // 例: "01_要件定義書/顧客要件" -> "01_要件定義書-顧客要件"
    return nameWithoutExt.replace(/\\/g, '-').replace(/\//g, '-');
}

/**
 * ファイル一覧をツリー構造に変換してサイドバーコンテンツを生成
 */
function generateSidebarContent(files, protectedPages) {
    // ファイルをパス順にソート
    const sortedFiles = files
        .filter(f => !f.relativePath?.includes('wiki-backup'))
        .sort((a, b) => a.relativePath.localeCompare(b.relativePath, 'ja'));

    // フォルダ構造を構築
    const folderStructure = {};

    for (const file of sortedFiles) {
        // パス区切りを統一（Windowsの \ も / も対応）
        const normalizedPath = file.relativePath.replace(/\\/g, '/').replace(/\.md$/, '');
        const pathParts = normalizedPath.split('/');
        let current = folderStructure;

        // フォルダ階層を生成
        for (let i = 0; i < pathParts.length - 1; i++) {
            const folder = pathParts[i];
            if (!current[folder]) {
                current[folder] = {};
            }
            current = current[folder];
        }

        // ファイルを追加
        const fileName = pathParts[pathParts.length - 1];
        current[`_file_${fileName}`] = file;
    }

    // 再帰的にツリーを生成
    function buildTree(obj, depth = 0, parentPath = '') {
        const lines = [];
        const indent = '  '.repeat(depth);
        const keys = Object.keys(obj).sort();

        for (const key of keys) {
            const item = obj[key];

            if (key.startsWith('_file_')) {
                // ファイルの場合：表示名称はファイル名のみ
                const fileName = key.replace('_file_', '');
                // wikiTitleは「フォルダ名-フォルダ名-ファイル名」形式
                // リンク形式：[[リンク先ページ|表示名称]]
                lines.push(`${indent}- [[${fileName}|${item.wikiTitle}]]`);
            } else {
                // フォルダの場合：フォルダ名を表示（リンクなし）
                lines.push(`${indent}- ${key}`);
                const currentPath = parentPath ? `${parentPath}/${key}` : key;
                const subLines = buildTree(item, depth + 1, currentPath);
                if (subLines.length > 0) {
                    lines.push(...subLines);
                }
            }
        }

        return lines;
    }

    // ツリーを生成
    const treeLines = buildTree(folderStructure);

    // サイドバーコンテンツを組み立て
    let content = '# 目次\n\n';
    content += treeLines.join('\n');

    // 保護対象ページを追加
    if (protectedPages.length > 0) {
        content += '\n\n## Wiki 専用ページ\n\n';
        content += protectedPages
            .map(p => `- [[${p.wikiTitle}|${p.wikiTitle}]]`)
            .join('\n');
    }

    content += '\n';
    return content;
}

/**
 * Markdown表のNO列を自動連番に変換
 */
function autoNumberTable(content) {
    const lines = content.split('\n');
    const result = [];
    let inTable = false;
    let headerRowIndex = -1;
    let noColumnIndex = -1;
    let rowNumber = 1;
    const tableNameStack = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // 表の開始を検出（| で始まり | を含む行）
        if (line.trim().startsWith('|') && line.includes('|')) {
            if (!inTable) {
                inTable = true;
                headerRowIndex = i;
                // ヘッダー行からNO列のインデックスを取得
                const headers = line.split('|').map(h => h.trim());
                noColumnIndex = headers.findIndex(h => h.toUpperCase() === 'NO');

                // デバッグ: ヘッダー検出
                const tableName = `Table at line ${i + 1}`;
                tableNameStack.push(tableName);
                if (process.env.DEBUG_AUTONUMBER) {
                    console.log(`[DEBUG] 表検出: ${tableName}`);
                    console.log(`[DEBUG] ヘッダー: ${headers.join(' | ')}`);
                    console.log(`[DEBUG] NO列インデックス: ${noColumnIndex}`);
                }

                result.push(line);
                continue;
            }

            // 区切り行（:---|---: など）はそのまま
            if (line.includes('---')) {
                result.push(line);
                continue;
            }

            // NO列が存在する場合、自動採番
            if (noColumnIndex >= 0) {
                const cells = line.split('|');
                // セルが十分に存在し、NO列が空の場合のみ採番
                if (cells.length > noColumnIndex) {
                    const cellContent = cells[noColumnIndex].trim();
                    // 空のセルのみ採番対象（区切り行や既に値が入っているものは除外）
                    if (cellContent === '' && !line.includes('---')) {
                        cells[noColumnIndex] = ` ${rowNumber} `;
                        rowNumber++;

                        if (process.env.DEBUG_AUTONUMBER) {
                            console.log(`[DEBUG] 採番行 ${rowNumber - 1}: ${cells.join('|').substring(0, 80)}`);
                        }

                        result.push(cells.join('|'));
                        continue;
                    }
                }
            }

            result.push(line);
        } else {
            // 表の終了
            if (inTable) {
                inTable = false;
                const tableName = tableNameStack.pop();
                if (process.env.DEBUG_AUTONUMBER && tableName) {
                    console.log(`[DEBUG] 表終了: ${tableName}（採番: ${rowNumber - 1}行）`);
                }
                rowNumber = 1;
                noColumnIndex = -1;
            }
            result.push(line);
        }
    }

    return result.join('\n');
}

/**
 * Wiki ページを作成または更新（Gitリポジトリ経由）
 */
function createOrUpdateWikiPage(title, content, wikiDir) {
    const fileName = `${title}.md`;
    const filePath = path.join(wikiDir, fileName);

    // ファイルが既に存在するか確認
    const exists = fs.existsSync(filePath);

    // 自動連番処理を適用
    const processedContent = autoNumberTable(content);

    // ファイルを書き込み
    fs.writeFileSync(filePath, processedContent, 'utf-8');

    // Gitに追加
    execSync(`cd "${wikiDir}" && git add "${fileName}"`, { stdio: 'pipe' });

    if (exists) {
        console.log(`✅ 更新: ${title}`);
    } else {
        console.log(`✨ 作成: ${title}`);
    }
}

/**
 * Wiki リポジトリからすべてのページを取得（Git操作のみ）
 */
function getAllWikiPages(wikiDir) {
    const pages = [];

    if (!fs.existsSync(wikiDir)) {
        return [];
    }

    const files = fs.readdirSync(wikiDir);
    for (const file of files) {
        if (file.endsWith('.md')) {
            const title = file.replace(/\.md$/, '');
            // システムページは除外
            if (title !== '_Sidebar' && title !== 'Home') {
                pages.push({
                    title: title,
                    fileName: file,
                });
            }
        }
    }

    return pages;
}

/**
 * ページタイトルが保護対象かどうかを判定
 */
function isProtectedPage(title) {
    // [private] で始まるページは保護対象
    if (title.startsWith('[private]')) {
        return true;
    }

    // 明示的に指定された保護対象ページ
    return PROTECTED_WIKI_PAGES.some(protectedPage => {
        // 完全一致または、スラッシュ/ハイフンの違いを考慮
        return title === protectedPage ||
            title === protectedPage.replace(/\//g, '-') ||
            title === protectedPage.replace(/-/g, '/');
    });
}

/**
 * Wiki ページを削除（Git操作のみ）
 */
function deleteWikiPages(wikiDir, pagesToDelete) {
    if (pagesToDelete.length === 0) {
        return 0;
    }

    let deletedCount = 0;
    for (const pageTitle of pagesToDelete) {
        const fileName = `${pageTitle}.md`;
        const filePath = path.join(wikiDir, fileName);

        if (fs.existsSync(filePath)) {
            execSync(`cd "${wikiDir}" && git rm "${fileName}"`, { stdio: 'pipe' });
            console.log(`🗑️  削除: ${pageTitle}`);
            deletedCount++;
        }
    }

    return deletedCount;
}

/**
 * メイン処理
 */
function main() {
    console.log(`📚 ${GITHUB_REPO} の Wiki に同期を開始します...\n`);

    // 01_DOCS/wiki/ ディレクトリの存在確認
    if (!fs.existsSync(DOCS_DIR)) {
        console.error(`❌ 01_DOCS/wiki/ ディレクトリが見つかりません: ${DOCS_DIR}`);
        process.exit(1);
    }

    // Markdown ファイルの取得
    const files = getMarkdownFiles(DOCS_DIR);
    console.log(`📄 ${files.length} 個の Markdown ファイルが見つかりました\n`);

    // Wikiリポジトリをクローン
    const wikiDir = path.join(process.cwd(), '.wiki-temp');
    // GitHub Actions環境では、URLに直接トークンを埋め込む（ユーザー名に x-access-token を利用）
    const encodedToken = encodeURIComponent(GITHUB_TOKEN);
    const wikiRepoUrl = `https://x-access-token:${encodedToken}@github.com/${owner}/${repo}.wiki.git`;
    const gitUserName = process.env.GITHUB_ACTOR || 'github-actions[bot]';
    const gitUserEmail = process.env.GIT_COMMIT_EMAIL || `${gitUserName}@users.noreply.github.com`;

    try {
        // GitHub Actions環境でのGit認証設定
        // GIT_TERMINAL_PROMPTを0に設定してパスワードプロンプトを無効化
        const gitEnv = {
            ...process.env,
            GIT_TERMINAL_PROMPT: '0',
            GIT_ASKPASS: 'echo',
        };

        if (!fs.existsSync(wikiDir)) {
            console.log('📥 Wiki リポジトリをクローン中...\n');
            execSync(`git clone "${wikiRepoUrl}" "${wikiDir}"`, {
                stdio: 'inherit',
                env: gitEnv
            });
        } else {
            execSync(`cd "${wikiDir}" && git pull origin master`, {
                stdio: 'pipe',
                env: gitEnv
            });
        }

        // リモートURLを認証付きURLに更新（既存クローン対策）
        execSync(`cd "${wikiDir}" && git remote set-url origin "${wikiRepoUrl}"`, {
            stdio: 'pipe',
            env: gitEnv,
        });

        // Gitユーザー情報を設定
        execSync(`cd "${wikiDir}" && git config user.name "${gitUserName}"`, {
            stdio: 'pipe',
            env: gitEnv,
        });
        execSync(`cd "${wikiDir}" && git config user.email "${gitUserEmail}"`, {
            stdio: 'pipe',
            env: gitEnv,
        });

        // Wiki リポジトリから既存のページを取得
        const wikiPages = getAllWikiPages(wikiDir);
        const docsWikiTitles = new Set(files.map(f => f.wikiTitle));

        // 保護対象ページを取得（サイドバーに含めるため）
        const protectedPages = wikiPages
            .filter(page => {
                const title = page.title;
                return isProtectedPage(title);
            })
            .map(page => ({
                title: page.title,
                wikiTitle: page.title,
                fileName: page.fileName,
            }));

        // すべてのファイルを追加
        for (const file of files) {
            const content = fs.readFileSync(file.filePath, 'utf-8');
            createOrUpdateWikiPage(file.wikiTitle, content, wikiDir);
        }

        // サイドバーを作成（階層的なフォルダ構造を反映）
        const sidebarContent = generateSidebarContent(files, protectedPages);
        createOrUpdateWikiPage('_Sidebar', sidebarContent, wikiDir);

        // 削除対象のページを処理
        const pagesToDelete = wikiPages
            .filter(page => {
                const title = page.title;
                // 保護対象ページは削除しない
                if (isProtectedPage(title)) {
                    return false;
                }
                // 01_DOCS/wiki/ に存在しないページのみ削除対象
                return !docsWikiTitles.has(title);
            })
            .map(page => page.title);

        // 保護対象ページの確認ログ
        const allProtectedPages = wikiPages.filter(page => isProtectedPage(page.title));
        if (allProtectedPages.length > 0) {
            console.log(`\n🔒 保護された Wiki ページ（削除対象外）: ${allProtectedPages.length} 個`);
            allProtectedPages.forEach(page => console.log(`   - ${page.title}`));
        }

        if (pagesToDelete.length > 0) {
            console.log(`\n🗑️  削除対象の Wiki ページ: ${pagesToDelete.length} 個`);
            pagesToDelete.forEach(title => console.log(`   - ${title}`));
            deleteWikiPages(wikiDir, pagesToDelete);
        } else {
            console.log('\n✅ 削除対象のページはありませんでした');
        }

        // 変更があるか確認してコミット・プッシュ
        try {
            execSync(`cd "${wikiDir}" && git diff --cached --quiet`, { stdio: 'pipe' });
            console.log('\n✅ 変更はありませんでした');
        } catch {
            // 変更がある場合はコミット・プッシュ
            console.log('\n💾 変更をコミット中...');
            execSync(`cd "${wikiDir}" && git commit -m "Sync 01_DOCS/wiki to GitHub Wiki"`, { stdio: 'inherit' });

            console.log('📤 変更をプッシュ中...');
            execSync(`cd "${wikiDir}" && git push origin master`, {
                stdio: 'inherit',
                env: gitEnv
            });

            console.log('\n✅ Wikiへの同期が完了しました！');
        }
    } finally {
        // 一時ディレクトリをクリーンアップ
        if (fs.existsSync(wikiDir)) {
            execSync(`rm -rf "${wikiDir}"`, { stdio: 'pipe' });
        }
    }
}

try {
    // ローカルテストモード: DEBUG_AUTONUMBER=true かつ GITHUB_ACTIONS=false で実行可能
    if (process.env.DEBUG_AUTONUMBER && !GITHUB_ACTIONS) {
        console.log('🧪 ローカルテストモード: 自動採番機能のテスト\n');

        // テスト対象の Markdown ファイルを処理
        const files = getMarkdownFiles(DOCS_DIR);
        console.log(`📄 ${files.length} 個の Markdown ファイルをテストします\n`);

        for (const file of files) {
            const content = fs.readFileSync(file.filePath, 'utf-8');
            console.log(`\n📋 ファイル: ${file.relativePath}`);
            console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

            const processedContent = autoNumberTable(content);

            // 変更があったかどうかを確認
            if (content === processedContent) {
                console.log('✅ 変更なし（NO列が見つからないか、既に採番済み）');
            } else {
                console.log('✨ 変更あり（自動採番処理が実行されました）\n');
                console.log('--- 処理後の内容 ---');
                // テーブル部分だけを抽出して表示
                const processedLines = processedContent.split('\n');
                let inTable = false;
                for (const line of processedLines) {
                    if (line.trim().startsWith('|')) {
                        inTable = true;
                        console.log(line);
                    } else if (inTable && line.trim() === '') {
                        break;
                    } else if (inTable) {
                        console.log(line);
                    }
                }
            }
        }

        console.log('\n✅ テスト完了（ファイルは変更されていません）');
        process.exit(0);
    }

    main();
} catch (error) {
    console.error('\n❌ エラーが発生しました:', error);
    process.exit(1);
}