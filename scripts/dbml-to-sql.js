#!/usr/bin/env node

/**
 * DBMLファイルから MySQL 用 SQL を生成するスクリプト
 *
 * 使用方法:
 *   node scripts/dbml-to-sql.js <input.dbml> <output.sql>
 *
 * 依存: @dbml/cli
 *
 * - use import のないファイル: dbml2sql の出力をそのまま使用
 * - use import ありのファイル: import 先テーブルの DDL を除外し、
 *   エントリーファイルで定義されたテーブルのみ出力（重複回避）
 */

'use strict';

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const [, , inputFile, outputFile] = process.argv;

if (!inputFile || !outputFile) {
  console.error('Usage: node dbml-to-sql.js <input.dbml> <output.sql>');
  process.exit(1);
}

const absoluteInputFile = path.resolve(inputFile);

if (!fs.existsSync(absoluteInputFile)) {
  console.error(`Error: File not found: ${inputFile}`);
  process.exit(1);
}

function hasUseImport(dbmlContent) {
  return /^use[\s{]/m.test(dbmlContent);
}

function extractTableNames(dbmlContent) {
  const names = [];
  const pattern = /^Table\s+(?:"([^"]+)"|'([^']+)'|(\S+))/gm;
  let match;
  while ((match = pattern.exec(dbmlContent)) !== null) {
    names.push(match[1] ?? match[2] ?? match[3]);
  }
  return new Set(names);
}

function splitSqlStatements(sql) {
  const lines = sql.split('\n');
  const statements = [];
  let current = [];

  for (const line of lines) {
    if (current.length === 0) {
      current.push(line);
      continue;
    }

    if (/^(CREATE TABLE|CREATE INDEX|ALTER TABLE)/.test(line)) {
      statements.push(current.join('\n'));
      current = [line];
    } else {
      current.push(line);
    }
  }

  if (current.length > 0) {
    statements.push(current.join('\n'));
  }

  return statements.map(s => s.trim()).filter(Boolean);
}

function extractTableFromStatement(statement) {
  const createOrAlter = statement.match(/^(?:CREATE TABLE|ALTER TABLE) `([^`]+)`/);
  if (createOrAlter) return createOrAlter[1];

  const index = statement.match(/^CREATE INDEX \S+ ON `([^`]+)`/);
  if (index) return index[1];

  return null;
}

function filterSqlByTables(sql, allowedTableNames) {
  const kept = splitSqlStatements(sql).filter((statement) => {
    const tableName = extractTableFromStatement(statement);
    return tableName && allowedTableNames.has(tableName);
  });

  if (kept.length === 0) return '';
  return `${kept.join('\n\n')}\n`;
}

function runDbml2sql(inputPath) {
  const cliScript = path.join(__dirname, '..', 'node_modules', '@dbml', 'cli', 'bin', 'dbml2sql.js');
  return execFileSync(process.execPath, [cliScript, inputPath, '--mysql'], {
    encoding: 'utf-8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function buildHeader() {
  return [
    '-- SQL dump generated using DBML (dbml.dbdiagram.io)',
    '-- Database: MySQL',
    `-- Generated at: ${new Date().toISOString()}`,
    '',
  ].join('\n');
}

try {
  const entryContent = fs.readFileSync(absoluteInputFile, 'utf-8');
  let sql = runDbml2sql(absoluteInputFile);

  if (hasUseImport(entryContent)) {
    const entryTableNames = extractTableNames(entryContent);
    sql = filterSqlByTables(sql, entryTableNames);
    console.log(
      `  Filtered SQL to entrypoint tables: ${[...entryTableNames].join(', ')}`,
    );
  }

  const outputDir = path.dirname(outputFile);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(outputFile, `${buildHeader()}\n${sql}`, 'utf-8');
  console.log(`✓ Generated: ${outputFile}`);
} catch (err) {
  const stderr = err.stderr?.toString?.() ?? '';
  const message = stderr.trim() || err.message || String(err);
  console.error(`Error processing ${inputFile}:`, message);
  process.exit(1);
}
