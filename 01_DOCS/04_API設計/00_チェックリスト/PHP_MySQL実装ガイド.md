# PHP + MySQL API 実装ガイド

> **本プロジェクトの API 方針:** エンドポイントは `.php` ファイル単位（`/api/public/`, `/api/admin/`）。認証は管理 API のみ HttpOnly Cookie + CSRF。詳細は `01_DOCS/wiki/04_API設計/00_共通仕様.md` を参照。

## 1. 開発環境セットアップ

### 1.1 推奨スキルスタック
- **PHP**: 8.1 以上
- **フレームワーク**: Laravel 11 / Symfony 7 推奨
- **MySQL**: 5.7 以上 / MariaDB 10.3 以上
- **ORM**: Eloquent (Laravel) / Doctrine (Symfony)
- **パッケージ管理**: Composer

### 1.2 必須Composerパッケージ
```json
{
  "require": {
    "php": "^8.1",
    "laravel/framework": "^11.0",
    "laravel/sanctum": "^4.0",
    "guzzlehttp/guzzle": "^7.0",
    "nesbot/carbon": "^2.0"
  },
  "require-dev": {
    "phpunit/phpunit": "^10.0",
    "laravel/pint": "^1.0",
    "phpstan/phpstan": "^1.10"
  }
}
```

### 1.3 .env環境変数テンプレート
```
APP_NAME=MyAPI
APP_ENV=local
APP_DEBUG=true
APP_URL=http://localhost:8080

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=myapi_db
DB_USERNAME=root
DB_PASSWORD=

API_SERVICE_NAME=astrohp
CORS_ALLOW_ORIGIN=*
PUBLIC_API_BASE=http://localhost:8080/api

LOG_CHANNEL=stack
LOG_LEVEL=debug
```

---

## 2. データベース設計ベストプラクティス（MySQL）

### 2.1 テーブル命名規則
- **複数形**: `users`, `products`, `orders`
- **スネークケース**: `user_roles`, `created_at`
- **接頭辞は不使用**: ❌ `tbl_users` → ✅ `users`

### 2.2 エンドポイント別DB設計パターン

#### パターン1: CRUD基本
```sql
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL DEFAULT NULL COMMENT '軟削除用',
  INDEX idx_email (email),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### パターン2: 多対多リレーション
```sql
CREATE TABLE roles (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE user_roles (
  user_id INT NOT NULL,
  role_id INT NOT NULL,
  PRIMARY KEY (user_id, role_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 2.3 インデックス戦略
- **プライマリキー**: 全テーブルに `id` をPKとして設置
- **頻繁な検索条件**: インデックス設定 (e.g., `email`, `status`)
- **ソート対象**: インデックス設定 (e.g., `created_at`, `updated_at`)
- **ネスト検索**: 複合インデックス検討 (e.g., `(user_id, created_at)`)

### 2.4 パフォーマンス考慮事項
```php
// ❌ N+1 クエリ問題
$users = User::all();
foreach ($users as $user) {
    echo $user->roles; // 毎回クエリ発行
}

// ✅ eager loading
$users = User::with('roles')->get();
foreach ($users as $user) {
    echo $user->roles; // キャッシュから取得
}
```

---

## 3. API 設計パターン（本プロジェクト）

### 3.1 エンドポイント構成

```
/api/public/changelogs.php     # 公開: 変更履歴一覧（GET のみ、認証不要）
/api/admin/changelogs.php      # 管理: 変更履歴 CRUD（Cookie + CSRF）
/api/admin/session.php         # 管理: セッション確認
/api/admin/login.php           # 管理: ログイン
/api/admin/logout.php          # 管理: ログアウト
/api/admin/users.php           # 管理: ユーザー一覧（PII）
```

### 3.2 クエリパラメータ（一覧取得）

```
GET /api/public/changelogs.php?page=1&per_page=10&from=2026-01-01&to=2026-12-31
```

| パラメータ | 型 | 公開 API | 管理 API | 説明 |
|-----------|-----|----------|----------|------|
| `page` | int | デフォルト 1 | デフォルト 1 | ページ番号 |
| `per_page` | int | デフォルト 10、上限 50 | デフォルト 20、上限 100 | 1 ページあたり件数 |
| `from` | date | 任意 | 任意 | `YYYY-MM-DD` |
| `to` | date | 任意 | 任意 | `YYYY-MM-DD` |

### 3.3 レスポンスフォーマット統一

```json
// 単体成功
{
  "data": {
    "id": 1,
    "title": "..."
  }
}

// 一覧成功
{
  "data": [],
  "pagination": {
    "page": 1,
    "per_page": 10,
    "total": 42,
    "total_pages": 5
  }
}

// エラー（RFC7807 互換）
{
  "type": "about:blank",
  "title": "Bad Request",
  "status": 400,
  "detail": "per_page must be between 1 and 50.",
  "instance": "/api/public/changelogs.php?page=1&per_page=100",
  "traceId": "9a0b2d6f8c1e4a67"
}
```

---

## 4. 認証・認可実装

### 4.1 セッション Cookie + CSRF（管理 API）

```php
// api/admin/login.php（概要）
// 成功時: Set-Cookie: astrohp_admin=...; HttpOnly; SameSite=Lax
// レスポンス: { "data": { "admin_id": 1, "csrfToken": "..." } }

// api/admin/session.php（概要）
// 未ログインでも 200: { "data": { "authenticated": false, "csrfToken": null } }

// 変更系リクエストの検証
function requireAdminAuth(): void
{
    if (!isAuthenticated()) {
        respondProblem(401, 'Authentication required.');
    }
}

function requireCsrfToken(): void
{
    $token = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    if (!hash_equals(getSessionCsrfToken(), $token)) {
        respondProblem(403, 'CSRF token mismatch.');
    }
}
```

### 4.2 公開 API（認証不要）

```php
// api/public/changelogs.php（概要）
// Accept ヘッダー検証のみ
// is_published = 1 のみ返却
// Cache-Control: public, max-age=60
```

### 4.3 ブラウザからの fetch 例

```javascript
const API_ACCEPT = 'application/vnd.astrohp+json;version=1';

// 公開 API
const res = await fetch(`${BASE}/public/changelogs.php?page=1`, {
  headers: { Accept: API_ACCEPT },
});

// 管理 API（変更系）
const res = await fetch(`${BASE}/admin/changelogs.php`, {
  method: 'POST',
  credentials: 'include',
  headers: {
    Accept: API_ACCEPT,
    'Content-Type': 'application/json',
    'X-CSRF-Token': csrfToken,
  },
  body: JSON.stringify({ title: '...', changed_at: '2026-06-01', is_published: true }),
});
```

> Bearer トークン（JWT 等）は **使用しない**。以下の Laravel 例は汎用参考として残す。

### 4.4 参考: JWT 認証（Laravel Sanctum ― 本プロジェクト非採用）
```php
// routes/api.php
Route::post('/login', [AuthController::class, 'login']);
Route::post('/logout', [AuthController::class, 'logout'])->middleware('auth:sanctum');

// app/Http/Controllers/AuthController.php
class AuthController extends Controller
{
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required|min:6'
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            return response()->json([
                'success' => false,
                'error' => ['message' => '認証情報が不正です']
            ], 401);
        }

        $token = $user->createToken('API Token')->plainTextToken;

        return response()->json([
            'success' => true,
            'data' => ['token' => $token]
        ]);
    }
}
```

### 4.5 参考: ロールベースアクセス制御（RBAC ― 本プロジェクト非採用）
```php
// app/Models/User.php
class User extends Model
{
    public function roles()
    {
        return $this->belongsToMany(Role::class);
    }

    public function hasRole($role)
    {
        return $this->roles()->where('name', $role)->exists();
    }
}

// ✅ ミドルウェア実装
class CheckRole
{
    public function handle(Request $request, Closure $next, $role)
    {
        if (!auth()->check() || !auth()->user()->hasRole($role)) {
            return response()->json([
                'success' => false,
                'error' => ['message' => 'アクセス権限がありません']
            ], 403);
        }

        return $next($request);
    }
}

// routes/api.php
Route::delete('/users/{id}', [UserController::class, 'destroy'])
    ->middleware('auth:sanctum', 'check.role:admin');
```

---

## 5. バリデーション・エラーハンドリング

### 5.1 入力値バリデーション（FormRequest）
```php
// app/Http/Requests/StoreUserRequest.php
class StoreUserRequest extends FormRequest
{
    public function authorize()
    {
        return true;
    }

    public function rules()
    {
        return [
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|min:6|confirmed',
            'age' => 'sometimes|integer|min:18|max:120',
            'status' => 'in:active,inactive,pending'
        ];
    }

    public function messages()
    {
        return [
            'email.unique' => 'このメールアドレスは既に使用されています',
            'password.min' => 'パスワードは6文字以上である必要があります'
        ];
    }
}

// app/Http/Controllers/UserController.php
class UserController extends Controller
{
    public function store(StoreUserRequest $request)
    {
        // バリデーション済みデータ
        $validated = $request->validated();
        $user = User::create($validated);
        return response()->json(['success' => true, 'data' => $user], 201);
    }
}
```

### 5.2 共通エラーハンドラー
```php
// app/Exceptions/Handler.php
class Handler extends ExceptionHandler
{
    public function render($request, Throwable $exception)
    {
        // バリデーションエラー
        if ($exception instanceof ValidationException) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'VALIDATION_ERROR',
                    'message' => 'バリデーションエラー',
                    'details' => $exception->errors()
                ]
            ], 422);
        }

        // 認証エラー
        if ($exception instanceof AuthenticationException) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'UNAUTHENTICATED', 'message' => '認証が必要です']
            ], 401);
        }

        // その他のエラー
        return response()->json([
            'success' => false,
            'error' => [
                'code' => 'INTERNAL_ERROR',
                'message' => 'サーバーエラーが発生しました'
            ]
        ], 500);
    }
}
```

---

## 6. テスト実装

### 6.1 ユニットテスト（PHPUnit）
```php
// tests/Unit/UserTest.php
class UserTest extends TestCase
{
    public function test_user_can_be_created()
    {
        $user = User::create([
            'name' => 'John Doe',
            'email' => 'john@example.com',
            'password' => Hash::make('password123')
        ]);

        $this->assertDatabaseHas('users', [
            'email' => 'john@example.com'
        ]);
    }
}
```

### 6.2 機能テスト（API テスト）

```php
// tests/Feature/ChangelogPublicApiTest.php（概要）
public function test_can_fetch_public_changelogs(): void
{
    $response = $this->get('/api/public/changelogs.php?page=1', [
        'Accept' => 'application/vnd.astrohp+json;version=1',
    ]);

    $response->assertStatus(200)
             ->assertJsonStructure([
                 'data' => [
                     '*' => ['id', 'title', 'body', 'changed_at']
                 ],
                 'pagination' => ['page', 'per_page', 'total', 'total_pages']
             ]);
}

public function test_returns_406_without_accept_header(): void
{
    $response = $this->get('/api/public/changelogs.php');
    $response->assertStatus(406)
             ->assertJsonPath('status', 406);
}

public function test_admin_post_requires_csrf(): void
{
    $this->actingAsAdmin(); // Cookie セッション設定

    $response = $this->postJson('/api/admin/changelogs.php', [
        'title' => 'Test',
        'changed_at' => '2026-06-01',
    ], [
        'Accept' => 'application/vnd.astrohp+json;version=1',
        // X-CSRF-Token なし
    ]);

    $response->assertStatus(403)
             ->assertJsonPath('detail', 'CSRF token mismatch.');
}
```

### 6.3 テスト実行
```bash
# 全テスト実行
php artisan test

# 特定のテストファイル実行
php artisan test tests/Feature/UserApiTest.php

# カバレッジ確認
php artisan test --coverage
```

---

## 7. パフォーマンス最適化

### 7.1 クエリ最適化ト
```php
// ❌ 非効率
$users = User::all();
$activeUsers = $users->where('status', 'active');

// ✅ 効率的
$activeUsers = User::where('status', 'active')->get();

// ✅ さらに最適化（ページネーション）
$activeUsers = User::where('status', 'active')->paginate(20);
```

### 7.2 キャッシング戦略
```php
// ✅ Redis キャッシュ
$users = Cache::remember('users.active', 3600, function () {
    return User::where('status', 'active')->get();
});

// ✅ DBクエリキャッシュ（Laravel Query Caching）
Route::get('/users', function () {
    return cache()->remember('users.list', 86400, function () {
        return User::with('roles')->get();
    });
});
```

### 7.3 遅延読み込み・スクロール
```php
// ✅ カーソルベースのページネーション（大規模データセット向け）
$users = User::orderBy('id')->cursorPaginate(50);
```

---

## 8. セキュリティベストプラクティス

### 8.1 SQLインジェクション対策
```php
// ❌ 危険
$user = User::whereRaw("name = '" . $request->name . "'");

// ✅ 安全（プリペアドステートメント）
$user = User::where('name', $request->name)->first();
```

### 8.2 CORS設定
```php
// config/cors.php
'paths' => ['api/*', 'sanctum/csrf-cookie'],
'allowed_methods' => ['*'],
'allowed_origins' => ['https://example.com'],
'allowed_origins_patterns' => [],
'allowed_headers' => ['*'],
'exposed_headers' => [],
'max_age' => 0,
'supports_credentials' => true,
```

### 8.3 レート制限
```php
// routes/api.php
Route::middleware('throttle:60,1')->group(function () {
    Route::post('/login', [AuthController::class, 'login']);
});

// カスタムレート制限
Route::middleware('throttle:100,1')->group(function () {
    Route::get('/api/v1/users', [UserController::class, 'index']);
});
```

### 8.4 CSRF対策
```php
// Sanctum使用時は自動対応
// (Laravel 9.2以降)
```

---

## 9. デプロイ・運用

### 9.1 本番環境設定
```bash
# 環境変数設定
cp .env.example .env
php artisan key:generate

# データベースマイグレーション
php artisan migrate --force

# キャッシュクリア＆最適化
php artisan config:cache
php artisan route:cache
php artisan view:cache

# アセット公開
php artisan storage:link
```

### 9.2 ログ管理
```php
// config/logging.php
'channels' => [
    'stack' => [
        'driver' => 'stack',
        'channels' => ['single', 'slack'],
    ],
    'slack' => [
        'driver' => 'slack',
        'url' => env('LOG_SLACK_WEBHOOK_URL'),
        'level' => 'critical',
    ],
]

// コードでの使用
\Log::error('Error message', ['context' => $data]);
```

### 9.3 ヘルスチェックエンドポイント
```php
// routes/api.php
Route::get('/health', function () {
    return response()->json([
        'status' => 'ok',
        'timestamp' => now()->toIso8601String(),
        'version' => config('app.version')
    ]);
});
```

---

## 10. 便利なコマンド・ツール

### 10.1 Laravel Artisan コマンド
```bash
# マイグレーション作成
php artisan make:migration create_users_table

# モデル・マイグレーション同時作成
php artisan make:model User -m

# コントローラ作成（リソース型）
php artisan make:controller UserController --resource

# FormRequest作成
php artisan make:request StoreUserRequest

# テストクラス作成
php artisan make:test UserApiTest --feature

# API ドキュメント生成（Laravel OpenAPI）
php artisan l5-swagger:generate
```

### 10.2 推奨ツール
- **PHPStan**: 静的解析ツール
- **Laravel Pint**: コードフォーマッター
- **Sequel Pro**: MySQLクライアント
- **Postman**: API テストツール
- **L5 Swagger**: OpenAPI/Swagger ドキュメント生成

---

## 参考リンク

- [Laravel公式ドキュメント](https://laravel.com/docs)
- [MySQL ベストプラクティス](https://dev.mysql.com/doc/)
- [RESTful API 設計ガイド](https://restfulapi.net/)
- [OpenAPI 仕様](https://swagger.io/specification/)
- [OWASP API Security](https://owasp.org/www-project-api-security/)

---

**最終更新：** {{ DATE }}  
**対応バージョン**：PHP 8.1+, Laravel 11, MySQL 5.7+


