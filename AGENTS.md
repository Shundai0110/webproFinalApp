# AGENTS.md

このファイルは、このリポジトリで作業するエージェント向けの開発ガイドです。
現時点のリポジトリ実体は、設計書の `README.md` と、依存関係なしで動く最小構成の静的フロントエンドです。
認証、バックエンド API、Prisma、MySQL、決済・購入確定処理はまだ実装していません。

## プロジェクト概要

- プロジェクト名: 慶應生向け教科書売買アプリ
- 目的: 慶應義塾大学の学生同士が教科書を検索、出品、購入リクエスト、双方承諾による取引成立を行える Web アプリを作る。
- 想定技術: Next.js / React / TypeScript / Node.js / Express / Prisma / MySQL / Render.com
- パッケージ管理: npm を想定する。
- 基本方針: フロントエンド、バックエンド、データ層を分離した 3 層構造で実装する。

## 現在のリポジトリ状態

```text
webproFinalApp/
├── frontend/
│   ├── assets/
│   ├── src/
│   ├── tests/
│   ├── index.html
│   ├── package.json
│   ├── server.mjs
│   └── styles.css
├── AGENTS.md
├── README.md
```

現時点では `backend/`、`database/`、`docs/` は未作成です。
本格実装へ進める場合は README の「5.3 ディレクトリ構成案」を基準にディレクトリを追加してください。

## 主要ディレクトリ方針

実装時は次の構成を基本にしてください。

```text
project-root/
├── frontend/
│   ├── app/
│   ├── components/
│   ├── lib/
│   ├── types/
│   ├── package.json
│   └── next.config.ts
├── backend/
│   ├── prisma/
│   │   └── schema.prisma
│   ├── src/
│   │   ├── server.ts
│   │   ├── app.ts
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── repositories/
│   │   ├── middlewares/
│   │   └── lib/
│   ├── package.json
│   └── .env.example
├── database/
├── docs/
├── README.md
└── AGENTS.md
```

### frontend

- Next.js App Router を想定する。
- 画面は `frontend/app/` に配置する。
- 再利用 UI は `frontend/components/` に配置する。
- API クライアントは `frontend/lib/api.ts` に集約する。
- 型定義は `frontend/types/` に配置する。
- Prisma Client や SQL はフロントエンドに書かない。
- API ベース URL は `NEXT_PUBLIC_API_BASE_URL` から取得する。

想定画面:

- `/`
- `/register`
- `/profile`
- `/books`
- `/books/new`
- `/books/[id]`
- `/search`
- `/transactions/[id]`
- `/transactions/[id]/complete`

### backend

- Express API を `backend/src/` に実装する。
- HTTP 入口は routes、リクエスト処理は controllers、業務ロジックは services、DB アクセスは repositories に分ける。
- Prisma Client は `backend/src/lib/prisma.ts` に集約する。
- 画面表示や React コンポーネントをバックエンドに置かない。
- DB 更新が複数テーブルにまたがる処理は Prisma の transaction で実行する。

想定 API:

- `POST /api/auth/register`
- `GET /api/users/me`
- `PATCH /api/users/me`
- `GET /api/books`
- `GET /api/books/:id`
- `POST /api/books`
- `PATCH /api/books/:id`
- `DELETE /api/books/:id`
- `POST /api/transactions`
- `GET /api/transactions/:id`
- `PATCH /api/transactions/:id`

### database

- MVP の中心テーブルは `User`、`Book`、`Transaction`。
- Prisma schema は `backend/prisma/schema.prisma` に置く。
- MySQL を前提にする。
- `users`、`books`、`transactions` は snake_case 複数形の DB テーブルとして扱う。

## 起動方法

現時点の最小構成は `frontend/` 配下の静的 SPA です。
外部依存はないため `npm install` は不要です。

### frontend

```bash
cd frontend
npm run dev
```

ローカル URL:

```text
http://127.0.0.1:4173
```

`npm run dev` は `node server.mjs` を実行します。
現在は静的ファイルのみのため、本番ビルド手順はありません。

将来 Next.js に移行した場合の想定:

```bash
cd frontend
npm install
npm run dev
npm run build
npm run start
```

### backend

```bash
cd backend
npm install
npx prisma generate
npm run dev
```

本番ビルド:

```bash
cd backend
npm run build
npm start
```

### database / Prisma

開発 DB へのマイグレーション:

```bash
cd backend
npx prisma migrate dev
```

本番 DB へのマイグレーション:

```bash
cd backend
npx prisma migrate deploy
```

Prisma Client 生成:

```bash
cd backend
npx prisma generate
```

## テスト方法

現時点では Node.js 標準の `node:test` を使った smoke test を用意しています。

```bash
cd frontend
npm test
```

backend 実装後は backend 側にも `npm test` を用意してください。

重点的にテストする観点:

- アカウント登録で keio.jp メールのみ許可されること。
- 教科書出品で必須項目と価格のバリデーションが動くこと。
- 教科書検索で条件検索と関連度順の並び替えが動くこと。
- 購入リクエストで `AVAILABLE` の Book のみ `Transaction` を作成できること。
- 自分の出品物を購入できないこと。
- 関係者以外が Transaction を承諾できないこと。
- 購入者、出品者の双方承諾時のみ `Transaction` が `COMPLETED` になり、`Book` が `SOLD` になること。
- 取引成立処理が DB トランザクション内で実行されること。

現在の最小 SPA では、教科書データと購入相談データを `localStorage` に保存します。
`frontend/src/apiClient.js` は将来 Express API に差し替える前提の境界です。
購入は `PENDING` の相談作成までで、双方承諾や購入確定は未実装です。

README にある重要テストケース:

| buyer_approved | seller_approved | 期待 Transaction 状態 | 期待 Book 状態 |
|---|---|---|---|
| false | false | PENDING | NEGOTIATING |
| true | false | PENDING | NEGOTIATING |
| false | true | PENDING | NEGOTIATING |
| true | true | COMPLETED | SOLD |

## 環境変数

実装時は `.env.example` を backend と必要に応じて frontend に追加してください。
秘密情報をリポジトリにコミットしないでください。

### frontend

- `NEXT_PUBLIC_API_BASE_URL`

### backend

- `NODE_ENV`
- `PORT`
- `DATABASE_URL`
- `FRONTEND_ORIGIN`
- `SESSION_SECRET`
- `MAIL_FROM`
- `MAIL_API_KEY`

## 実装ルール

- README の 3 層構造を守る。
- フロントエンドは画面表示と API 呼び出しに集中させる。
- バックエンドは認証、認可、バリデーション、取引ロジック、DB 更新を担当する。
- DB 操作は Prisma 経由で行い、文字列連結による SQL 生成を避ける。
- ユーザー入力を HTML として直接描画しない。
- 本番エラーでは内部スタックトレースを返さない。
- Book 更新は出品者のみ許可する。
- Transaction 承諾は購入者または出品者のみ許可する。
- `Book.status` は `AVAILABLE`、`NEGOTIATING`、`SOLD`、`CANCELLED` を使う。
- `Transaction.status` は `PENDING`、`COMPLETED`、`CANCELLED` を使う。
- 購入リクエストや承諾ボタンは二重送信を防止する。
- 取引成立時は `Transaction` 更新と `Book` 更新を同一 DB トランザクションで行う。

## 命名規則

| 対象 | 例 | 方針 |
|---|---|---|
| API パス | `/api/books` | 複数形の名詞 |
| Prisma Model | `User`, `Book`, `Transaction` | PascalCase |
| DB テーブル | `users`, `books`, `transactions` | snake_case 複数形 |
| TypeScript 型 | `Book`, `TransactionStatus` | PascalCase |
| React コンポーネント | `BookCard`, `SearchForm` | PascalCase |
| 関数 | `approveTransaction` | camelCase |

## Git / コミット

README では次のブランチ運用が想定されています。

- `main`: 本番反映用
- `develop`: 開発統合用
- `feature/auth`: 認証機能
- `feature/books`: 教科書出品・検索機能
- `feature/transactions`: 購入リクエスト・承諾機能
- `fix/*`: 修正用

コミットメッセージ例:

```text
feat: 教科書出品APIを追加
feat: 購入リクエストAPIを追加
feat: 双方承諾時のみ取引成立にする処理を追加
fix: 売却済み教科書に購入リクエストできる問題を修正
docs: 設計書にPrismaスキーマを追記
refactor: transactionServiceの責務を整理
```

## デプロイ方針

Render.com へのデプロイを想定する。

### frontend

- Build Command: `npm install && npm run build`
- Start Command: `npm run start`

### backend

- Build Command: `npm install && npx prisma generate && npm run build`
- Start Command: `npm start`

### MySQL

- Render の MySQL Template または Web Service + Persistent Disk を想定する。
- バックアップ方法は未決定のため、実装時に運用方針を決める。

## 未決定事項

README 上で未決定とされている内容は、実装前に決定または明示してください。

- keio.jp 認証をメール確認で実装するか、大学認証連携にするか。
- 実決済を入れるか、仮想ポイントのみにするか。
- 画像ファイルの保存先をどこにするか。
- コメント機能を MVP に含めるか、Phase 2 に回すか。
- 授業マスタを作るか、Book の文字列項目で始めるか。
- MySQL を Render 上で運用する際のバックアップ方法。
- 管理者機能を MVP に含めるか。
- 完了メール送信サービスの選定。
- ポイント残高を実際の決済と結びつけるか。

## 作業時の注意

- 実装前に、現在のリポジトリに実コードや設定ファイルが追加されていないか確認する。
- README と矛盾する変更をする場合は、README または AGENTS.md も更新する。
- 実行できないコマンドを「確認済み」として記録しない。
- 新しい起動・テストコマンドを追加した場合は、この AGENTS.md に追記する。
