# Backend

Express 5 / TypeScript / Prisma 7 / MySQLによるデモAPIです。実決済、実在個人情報、外部認証には接続しません。

## 実装済みAPI

- `POST /api/auth/register`: デモアカウント追加、初期5,000ポイント、Bearerセッション発行
- `GET /api/users/me`, `PATCH /api/users/me`: 自分の安全なデモプロフィール
- `GET /api/books`, `GET /api/books/:id`: 検索・関連度順・詳細
- `POST /api/books`, `PATCH /api/books/:id`, `DELETE /api/books/:id`: 出品者限定の作成・更新・取消
- `POST /api/transactions`: 自己購入、状態、残高を検証した購入相談
- `GET /api/transactions/:id`: 購入者・出品者限定の取引取得
- `PATCH /api/transactions/:id`: 双方承諾と取引成立
- `GET /api/notifications`: 自分宛ての取引成立通知
- `GET /api/health`: 疎通確認

認証は `Authorization: Bearer <token>` を使用します。トークンは `SESSION_SECRET` で署名され、2時間で失効します。メール、電話番号、住所、パスワード、本人確認情報、カード・銀行情報は登録APIの許可項目に含めません。

## セットアップ

`prisma:deploy`、`prisma:seed`、API起動は `DATABASE_URL` のMySQLへ接続します。実行前に、接続先ホスト・DB名、適用するmigration、seedの件数と更新内容を提示し、ユーザーの明示承諾を得てください。

```bash
npm ci
npm run prisma:deploy
npm run prisma:seed
npm run dev
```

既定URLは `http://127.0.0.1:4000` です。MySQL接続先は `DATABASE_URL`、許可するfrontend Originは `FRONTEND_ORIGIN` で設定します。本番では必ず十分に長い `SESSION_SECRET` を設定してください。

現在のローカル確認環境は、git管理外の `.local/mysql` をデータディレクトリとして `127.0.0.1:3307/keio_book_demo` を使用します。接続値はgit管理外の `backend/.env` にあります。これは外部公開用や本番用の設定ではありません。

## コマンド

```bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:deploy
npm run prisma:seed
npm run build
npm test
npm start
```

`npm test` はPrisma Client生成、TypeScriptビルド、署名セッション、認証境界、双方承諾ポリシー、関連度、構造テストを実行します。DB依存の完全なAPI確認には、migration適用済みのMySQLが必要です。

## Seed

`backend/prisma/seed.ts` が正本です。5架空ユーザー、4架空Book、交渉中と成立済みのTransaction各1件、成立通知2件を冪等に作成します。既存ユーザーを再利用する場合、プロフィール項目は更新しますが、取引後の `pointBalance` は巻き戻しません。`database/seed.sql` は手動確認用の同等SQLです。

## 取引整合性

購入相談開始時はBookを条件付きで `AVAILABLE` から `NEGOTIATING` へ更新します。双方承諾時はTransaction `COMPLETED`、Book `SOLD`、購入者減算、出品者加算、双方通知を直列化可能な単一Prismaトランザクションで確定します。仮想ポイントは換金不可・現金価値なしで、外部決済APIは呼びません。
