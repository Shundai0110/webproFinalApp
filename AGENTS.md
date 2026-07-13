# AGENTS.md

このファイルは、このリポジトリで作業するエージェント向けの開発ガイドです。
現時点のリポジトリ実体は、設計書の `README.md`、依存関係なしで動く静的フロントエンド、backend と database のベース構造です。
frontend には複数のデモアカウント選択、期限付き仮想セッション、プロフィール編集、教科書の簡易出品・検索・購入相談を実装しています。
backend の認証、教科書 API、取引 API、Prisma モデル、MySQL マイグレーション、購入確定処理はまだ実装していません。
実決済、クレジットカード登録、銀行口座登録、実在個人情報の入力・保存は本プロジェクトでは実装しません。
メール、電話番号、住所、学生証、本人確認書類などが必要な画面では、架空のデモデータとして保存し、実データと同等のセキュリティで扱います。

## プロジェクト概要

- プロジェクト名: 慶應生向け教科書売買アプリ
- 目的: 慶應義塾大学の学生同士が教科書を検索、出品、購入リクエスト、双方承諾による取引成立を行える Web アプリを作る。
- デモ方針: 外部に見せる可能性があるデモとして、支払いは仮想ポイントだけで表現し、実際の金銭の受け渡しは発生させない。
- 想定技術: Next.js / React / TypeScript / Node.js / Express / Prisma / MySQL / Render.com
- パッケージ管理: npm を想定する。
- 基本方針: フロントエンド、バックエンド、データ層を分離した 3 層構造で実装する。

## 現在のリポジトリ状態

```text
webproFinalApp/
├── backend/
│   ├── prisma/
│   ├── src/
│   ├── tests/
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
├── database/
│   ├── migrations/
│   ├── seeds/
│   ├── README.md
│   ├── notes.md
│   └── seed.sql
├── docs/
│   ├── agent-memory/
│   │   ├── maker.md
│   │   └── reviewer.md
│   └── development-log.md
├── frontend/
│   ├── assets/
│   ├── src/
│   ├── tests/
│   ├── index.html
│   ├── package.json
│   ├── server.mjs
│   └── styles.css
├── AGENTS.md
├── package.json
└── README.md
```

本格実装へ進める場合は README の「5.3 ディレクトリ構成案」を基準にファイルを追加してください。

## 常時適用ルール

### Maker / Reviewer の役割分離

- 通常の依頼では `Maker` として動作し、調査、設計、実装、テスト、修正を行う。
- プロンプトで `Reviewer` が明示された場合、または依頼の主目的がコードレビュー、実装評価、品質評価、セキュリティ監査である場合は `Reviewer` として動作する。
- 役割を切り替えた回答では、日時の直後に `[Maker]` または `[Reviewer]` を明記する。
- Maker の継続コンテキストは `docs/agent-memory/maker.md` に記録する。
- Reviewer の継続コンテキストと指摘履歴は `docs/agent-memory/reviewer.md` に記録する。
- Reviewer は `docs/agent-memory/maker.md` を参照せず、README、AGENTS、ソースコード、テスト、git 差分、Reviewer 自身のメモリから独立して評価する。
- Reviewer は評価対象の製品コードや設計書を変更しない。実装または修正は、評価後にユーザーから明示的な指示があるまで行わない。
- Reviewer による評価中に修正指示を受けた場合は Maker に切り替えて実装し、必要に応じて Reviewer に戻って再評価する。
- Reviewer が評価記録を `docs/agent-memory/reviewer.md` と `docs/development-log.md` に追記することは、製品実装には含めない。
- Maker はユーザーが修正を承認した Reviewer 指摘だけを参照して実装する。未承認の指摘から勝手に実装しない。
- この分離はファイルによる役割コンテキストの分離であり、別プロセスのモデルや完全に独立した内部記憶を保証するものではない。

### 作業ログ

- 作業が終わったら、`docs/development-log.md` に今回の作業結果を追記する。
- 追記内容には、変更ファイル、実行コマンド、確認結果、残タスクを簡潔に含める。
- commit 前の作業は `未コミット` として記録し、commit 後に必要なら commit id と commit message が分かるように更新する。

### 外部サービス・課金

- 外部サイト接続、デプロイ、API、ストレージ、DB、認証、決済、メール送信などで課金が必要になった場合は、内容をユーザーに伝えて、その作業は諦める。
- 外部サイトやホスティングサービスを使う場合は無料プランのみ使用する。
- 有料プラン、無料枠を超える課金、クレジットカード登録が必要な設定、従量課金が有効になる設定は禁止する。
- 課金要否が不明な外部サービスは使わず、ローカル実行またはモックで代替する。

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

- 現時点ではベース構造のみで、具体的なドメイン API は未実装。
- Express API を `backend/src/` に実装する。
- HTTP 入口は routes、リクエスト処理は controllers、業務ロジックは services、DB アクセスは repositories に分ける。
- Prisma Client は `backend/src/lib/prisma.ts` に集約する。
- 画面表示や React コンポーネントをバックエンドに置かない。
- DB 更新が複数テーブルにまたがる処理は Prisma の transaction で実行する。
- 具体的な機能を実装するまで、`auth`、`books`、`transactions` のドメインルートは追加しない。

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

- 現時点では DB モデル、migration、seed は未作成。
- MVP の中心テーブルは将来的に `User`、`Book`、`Transaction` とする。
- Prisma schema は `backend/prisma/schema.prisma` に置く。
- MySQL を前提にする。
- `users`、`books`、`transactions` は snake_case 複数形の DB テーブルとして扱う。

## 起動方法

現時点の frontend は `frontend/` 配下の静的 SPA です。
frontend は外部依存がないため `npm install` は不要です。

リポジトリ直下から起動する場合:

```bash
npm run dev
```

このコマンドは現在の開発対象である frontend を起動します。
起動後はサイドバーで架空のデモアカウントを選び、`利用開始・切替` を押して操作します。
デモセッションは2時間有効で、外部認証や実在する認証情報は使用しません。
出品・購入相談・プロフィールはブラウザの `localStorage`、仮想セッションはタブ単位の `sessionStorage` に保存され、別ブラウザや別端末とは共有されません。

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

現時点の backend は依存関係の定義と TypeScript ソースだけを持つベース構造です。
実行する場合は依存関係のインストールが必要です。

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

リポジトリ直下から frontend と backend のテストをまとめて実行する場合:

```bash
npm test
```

```bash
cd frontend
npm test
```

現時点の backend には、依存関係なしで実行できる構造確認テストがあります。

```bash
cd backend
npm test
```

重点的にテストする観点:

- デモユーザーまたは仮想セッションで利用開始できること。
- 教科書出品で必須項目と価格のバリデーションが動くこと。
- 教科書検索で条件検索と関連度順の並び替えが動くこと。
- 購入リクエストで `AVAILABLE` の Book のみ `Transaction` を作成できること。
- 自分の出品物を購入できないこと。
- 関係者以外が Transaction を承諾できないこと。
- 購入者、出品者の双方承諾時のみ `Transaction` が `COMPLETED` になり、`Book` が `SOLD` になること。
- 取引成立処理と仮想ポイント更新が DB トランザクション内で実行されること。
- クレジットカード、銀行口座、外部決済 URL、決済 API を入力・保存・送信できないこと。
- メール、電話番号、住所、学生証番号、本人確認書類は架空データとして保存され、実在データは保存されないこと。
- 架空個人情報も、実個人情報と同等に認可、暗号化、マスキング、監査ログ、保存期間、削除手段の対象になること。

現在の最小 SPA では、デモアカウント、教科書データ、購入相談データを `localStorage`、仮想セッションを `sessionStorage` に保存します。
`frontend/src/apiClient.js` は将来 Express API に差し替える前提の境界です。
所有権と取引当事者の判定には編集可能なニックネームではなくデモユーザー ID を使い、自分の出品物への購入相談を拒否します。
デモアカウントに購入者・出品者の固定ロールは付けず、認証済みの全アカウントが出品と他ユーザー出品の購入相談を行えます。未認証操作は `frontend/src/apiClient.js` の更新関数で拒否し、自分の出品は一覧で青枠とラベルを表示します。
購入は `PENDING` の相談作成までで、双方承諾や購入確定は未実装です。
購入確定を実装する場合も、更新対象は仮想ポイントだけにしてください。

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
- `DEMO_PII_ENCRYPTION_KEY`
- `DEMO_MODE`
- `DEMO_USER_SEED`

メール、SMS、決済、本人確認、大学認証などの本番外部サービス用 API キーは追加しないでください。必要な場合はモック用の設定だけを追加してください。

## デモ安全ルール

- 実決済機能を実装しない。
- クレジットカード番号、有効期限、CVC、カード名義、決済トークンを入力・保存・送信しない。
- 銀行口座、送金リンク、外部決済 URL、決済代行サービスに接続しない。
- 支払い画面は実サービス風に見せても、処理は仮想ポイントの加減算だけにする。
- 仮想ポイントは換金不可、返金不可、現金価値なしとして扱う。
- 氏名、実在メールアドレス、実電話番号、実住所、生年月日、実学生証番号、実本人確認書類の入力・保存を求めない。
- メール、電話番号、住所、学生証番号、本人確認書類の項目が必要な場合は、架空メール、架空電話番号、架空住所、架空学生証番号、架空本人確認書類データだけを保存する。
- 架空個人情報であっても、実個人情報と同等に、保存時暗号化、表示時マスキング、ロール別アクセス制御、監査ログ、保存期間、削除手段を設計する。
- プロフィールはニックネーム、学部、学年、デモアイコン、架空個人情報など、実在人物を特定しない情報だけにする。
- 取引通知は画面内通知またはデモ通知ログで代替し、実メールや SMS を送信しない。
- 画像はサンプル画像またはデモ用 URL を基本にし、個人写真や EXIF 付き実写真を必須にしない。
- 代替実装であっても、認可、入力値検証、CSRF/XSS 対策、CORS、エラー情報制限は本番に近い形で設計する。

## 実装ルール

- README の 3 層構造を守る。
- フロントエンドは画面表示と API 呼び出しに集中させる。
- バックエンドは認証、認可、バリデーション、取引ロジック、DB 更新を担当する。
- DB 操作は Prisma 経由で行い、文字列連結による SQL 生成を避ける。
- ユーザー入力を HTML として直接描画しない。
- 本番エラーでは内部スタックトレースを返さない。
- 実決済・カード登録・銀行口座登録・実在個人情報保存につながる UI、API、DB カラムを追加しない。
- 個人情報風の UI、API、DB カラムを追加する場合は、`dummy_*` など架空データであることが明確な命名にし、README のセキュリティ方針に合わせる。
- Book 更新は出品者のみ許可する。
- Transaction 承諾は購入者または出品者のみ許可する。
- `Book.status` は `AVAILABLE`、`NEGOTIATING`、`SOLD`、`CANCELLED` を使う。
- `Transaction.status` は `PENDING`、`COMPLETED`、`CANCELLED` を使う。
- 購入リクエストや承諾ボタンは二重送信を防止する。
- 取引成立時は `Transaction` 更新、`Book` 更新、仮想ポイント更新を同一 DB トランザクションで行う。

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

- デモユーザーの種類と初期ポイントをどうするか。
- 画像ファイルをサンプル画像だけにするか、デモ用アップロードも許可するか。
- コメント機能を MVP に含めるか、Phase 2 に回すか。
- 授業マスタを作るか、Book の文字列項目で始めるか。
- MySQL を Render 上で運用する際のデモデータリセット・バックアップ方法。
- 管理者機能を MVP に含めるか。
- 画面内デモ通知の保存期間をどうするか。

## 作業時の注意

- 実装前に、現在のリポジトリに実コードや設定ファイルが追加されていないか確認する。
- README と矛盾する変更をする場合は、README または AGENTS.md も更新する。
- 実行できないコマンドを「確認済み」として記録しない。
- 新しい起動・テストコマンドを追加した場合は、この AGENTS.md に追記する。
