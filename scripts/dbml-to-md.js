#!/usr/bin/env node

/**
 * DBMLファイルをMarkdownテーブル定義書に変換するスクリプト
 *
 * 使用方法:
 *   node scripts/dbml-to-md.js <input.dbml> <output.md>
 *
 * 依存: @dbml/core
 */

'use strict';

const { Parser } = require('@dbml/core');
const fs = require('fs');
const path = require('path');

const [, , inputFile, outputFile] = process.argv;

if (!inputFile || !outputFile) {
  console.error('Usage: node dbml-to-md.js <input.dbml> <output.md>');
  process.exit(1);
}

if (!fs.existsSync(inputFile)) {
  console.error(`Error: File not found: ${inputFile}`);
  process.exit(1);
}

try {
  const content = fs.readFileSync(inputFile, 'utf-8');
  const database = new Parser().parse(content, 'dbml');

  const baseName = path.basename(inputFile, '.dbml');
  const lines = [];

  lines.push(`# ${baseName} テーブル定義`);
  lines.push('');
  lines.push(`> 自動生成: ${new Date().toISOString().split('T')[0]}`);
  lines.push('');

  for (const schema of database.schemas) {
    for (const table of schema.tables) {
      lines.push(`## ${table.name}`);
      lines.push('');

      // テーブルの Note
      const tableNote = table.note?.value ?? null;
      if (tableNote) {
        lines.push(`> ${tableNote}`);
        lines.push('');
      }

      // カラム定義テーブル
      lines.push('| カラム名 | 型 | NOT NULL | PK | デフォルト値 | 備考 |');
      lines.push('| --- | --- | :---: | :---: | --- | --- |');

      for (const field of table.fields) {
        const name = field.name ?? '';
        const typeName = field.type?.type_name ?? '';
        const typeArgs = field.type?.args ? `(${field.type.args})` : '';
        const fullType = `${typeName}${typeArgs}`;
        const notNull = field.not_null ? '✓' : '';
        const pk = field.pk ? '✓' : '';

        let defaultVal = '';
        if (field.dbdefault !== null && field.dbdefault !== undefined) {
          const val = field.dbdefault.value;
          const type = field.dbdefault.type;
          // expression型の場合はバッククォートで囲む
          defaultVal = type === 'expression' ? `\`${val}\`` : String(val);
        }

        const note = field.note?.value ?? '';

        lines.push(`| ${name} | ${fullType} | ${notNull} | ${pk} | ${defaultVal} | ${note} |`);
      }

      lines.push('');

      // インデックス定義
      if (table.indexes && table.indexes.length > 0) {
        lines.push('### インデックス');
        lines.push('');
        lines.push('| 名前 | カラム | ユニーク |');
        lines.push('| --- | --- | :---: |');

        for (const idx of table.indexes) {
          const idxName = idx.name ?? '';
          const cols = (idx.columns ?? []).map(c => c.value ?? c.name ?? '').join(', ');
          const unique = idx.unique ? '✓' : '';
          lines.push(`| ${idxName} | ${cols} | ${unique} |`);
        }

        lines.push('');
      }

      // Ref（外部キー）定義
      const refs = (schema.refs ?? []).filter(ref => {
        return (
          ref.endpoints?.[0]?.tableName === table.name ||
          ref.endpoints?.[1]?.tableName === table.name
        );
      });

      if (refs.length > 0) {
        lines.push('### 外部キー');
        lines.push('');
        lines.push('| カラム | 参照先テーブル | 参照先カラム | 関係 |');
        lines.push('| --- | --- | --- | --- |');

        for (const ref of refs) {
          const ep0 = ref.endpoints?.[0];
          const ep1 = ref.endpoints?.[1];
          if (!ep0 || !ep1) continue;

          // ep0 が元テーブル、ep1 が参照先として整理
          const [from, to] = ep0.tableName === table.name ? [ep0, ep1] : [ep1, ep0];
          const fromCol = (from.fieldNames ?? []).join(', ');
          const toTable = to.tableName ?? '';
          const toCol = (to.fieldNames ?? []).join(', ');
          const relation = `${ep0.relation ?? ''} - ${ep1.relation ?? ''}`;

          lines.push(`| ${fromCol} | ${toTable} | ${toCol} | ${relation} |`);
        }

        lines.push('');
      }
    }
  }

  // 出力先ディレクトリを作成
  const outputDir = path.dirname(outputFile);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(outputFile, lines.join('\n'), 'utf-8');
  console.log(`✓ Generated: ${outputFile}`);
} catch (err) {
  console.error(`Error processing ${inputFile}:`, err.message);
  process.exit(1);
}

