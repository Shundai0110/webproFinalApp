# AGENTS.md

このファイルは、このリポジトリで作業するエージェント向けの開発ガイドです。
現時点のリポジトリ実体は、設計書の `README.md`、静的フロントエンド、Express API、Node.js組み込みSQLiteによる一時DB、任意のローカル検証用Prisma / MySQL構成です。
frontend にはデモアカウント追加・選択、期限付き仮想セッション、プロフィール編集、教科書の簡易出品・検索・出品取り消し・購入相談・購入申請取り消し、申請中額を含む残高超過警告、コメント、双方承諾・成立前の承認撤回、仮想ポイント取引、画面内通知を実装しています。
frontendは `fetch` とBearer tokenでbackendへ接続し、backendには署名付きデモ認証、プロフィール、Books、Transactions、Comments、Notifications、ブラウザ生命周期API、一時DBトランザクションによる購入確定処理を実装しています。ドメインデータはブラウザストレージへ保存しません。
実決済、クレジットカード登録、銀行口座登録、実在個人情報の入力・保存は本プロジェクトでは実装しません。
メール、電話番号、住所、学生証、本人確認書類などが必要な画面では、架空のデモデータとして保存し、実データと同等のセキュリティで扱います。

## プロジェクト概要

- プロジェクト名: 慶應生向け教科書売買アプリ
- 目的: 慶應義塾大学の学生同士が教科書を検索、出品、購入リクエスト、双方承諾による取引成立を行える Web アプリを作る。
- デモ方針: 外部に見せる可能性があるデモとして、支払いは仮想ポイントだけで表現し、実際の金銭の受け渡しは発生させない。
- 現在の技術: HTML / CSS / JavaScript / TypeScript / Node.js / Express / SQLite `:memory:` / Render.com
- 任意のローカル永続化検証: Prisma / MySQL
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
├── render.yaml
└── README.md
```

既存実装を拡張する場合は、現在の `frontend/src/` と `backend/src/` の責務分離を維持してください。READMEの「5.3 ディレクトリ構成案」は将来構成であり、現在の実体を優先します。

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

- 現在は `frontend/index.html`、`frontend/styles.css`、`frontend/src/` で構成する静的SPAです。
- DOM表示とイベント処理は `frontend/src/app.js`、API通信と画面用キャッシュは `frontend/src/apiClient.js` に集約する。
- Prisma Client や SQL はフロントエンドに書かない。
- 通常はExpressから同一オリジン配信し、`/api` を使用する。4173番の単独frontend開発時だけ4000番のbackendへ接続する。
- User、Book、Transaction、Comment、Notification、ポイント残高を `localStorage` や `sessionStorage` に保存しない。
- `sessionStorage` に保存できるのは署名付きデモtoken、有効期限、一時client IDだけとする。

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

- 認証・プロフィール・Books・Transactions・Comments・Notifications・demo lifecycle APIを実装済み。
- Express API を `backend/src/` に実装する。
- HTTP 入口は routes、リクエスト処理は controllers、業務ロジックは services、DB アクセスは repositories に分ける。
- Prisma Client は `backend/src/lib/prisma.ts` に集約する。
- 無料公開用のSQLiteアクセスは `backend/src/lib/ephemeralStore.ts` に集約する。
- 画面表示や React コンポーネントをバックエンドに置かない。
- DB 更新が複数テーブルにまたがる処理は、選択中のstorageに対応する単一DB transactionで実行する。
- 認証が必要なAPIは、2時間有効な署名付きBearerデモセッションを必須とする。
- Book状態、Transaction、仮想ポイント、成立通知の確定は単一DBトランザクションで行う。
- 購入相談の作成時は、購入者の`PENDING`取引総額と今回額を合算し、現在残高を超える申請を拒否する。

想定 API:

- `POST /api/auth/register`
- `GET /api/auth/accounts`
- `POST /api/auth/session`
- `GET /api/users/me`
- `PATCH /api/users/me`
- `GET /api/books`
- `GET /api/books/:id`
- `POST /api/books`
- `PATCH /api/books/:id`
- `DELETE /api/books/:id`
- `POST /api/transactions`
- `GET /api/transactions`
- `GET /api/transactions/:id`
- `PATCH /api/transactions/:id`
- `GET /api/notifications`
- `GET /api/comments`
- `GET /api/books/:id/comments`
- `POST /api/books/:id/comments`
- `POST /api/demo/open`
- `POST /api/demo/heartbeat`
- `POST /api/demo/close`
- `POST /api/demo/reset`

### database

- 無料公開の既定値は `DEMO_STORAGE_MODE=ephemeral` とし、Node.js組み込み `node:sqlite` の `:memory:` DBを使用する。
- 一時DBにはUser、Book、Transaction、Comment、Notificationのtable、外部キー、CHECK制約、index、架空seedを作成する。
- 最後のブラウザ終了時、90秒heartbeatなし、プロセス停止・再起動時に変更データを破棄する。永続性やバックアップを追加しない。
- 複数ブラウザは同じWeb Serviceプロセスが動作している間だけ一時DBを共有する。
- 手動初期化はactive clientが1つ以下の場合だけ許可し、同時接続client数は200件を上限とする。
- 公開用一時データはバックアップせず、schemaと架空seedからの再生成を復旧手段とする。
- `User`、`Book`、`Transaction`、`Notification` のPrismaモデルと初期migrationは任意のローカルMySQL検証用として残す。
- `backend/prisma/seed.ts` に架空ユーザー・Book・Transaction・通知の冪等seedを実装済み。
- Prisma schema は `backend/prisma/schema.prisma` に置く。
- Render無料公開ではMySQL、Persistent Disk、外部DBを使用しない。
- `users`、`books`、`transactions` は snake_case 複数形の DB テーブルとして扱う。

## 起動方法

Node.js 24.14.1以上とnpmを使用します。Renderは `NODE_VERSION=24.14.1` で固定します。初回だけbackend依存関係を導入します。

```bash
npm ci --prefix backend
```

リポジトリ直下から無料公開と同じ一時DBモードで起動します。

```bash
npm run dev
```

このコマンドはExpress API、一時SQLite、静的frontendをまとめて起動します。コンソールに表示されるURL（通常は `http://127.0.0.1:4000`）を使用します。開発時に使用中なら4001番以降を最大10回まで試しますが、本番ではRender指定ポートのbind失敗をそのまま異常終了させます。
起動後はサイドバーで架空のデモアカウントを選び、`利用開始・切替` を押して操作します。新しいデモアカウントも追加でき、初期残高は必ず5,000ポイントとします。
デモセッションは2時間有効で、外部認証や実在する認証情報は使用しません。
ドメインデータはbackendのSQLite `:memory:`に保存し、同じプロセスへ接続するブラウザ間で共有します。ブラウザには署名付きtoken、有効期限、一時client IDだけを `sessionStorage` へ保存します。

サイト起動時にfrontendが `POST /api/demo/open` を呼び、30秒ごとにheartbeatを送ります。最後のブラウザ終了時にseed状態へ戻し、終了通知が届かない場合も90秒後に戻します。サーバー停止・Render停止・再起動でも変更データは全て失われます。

### frontend

通常の機能確認では単独起動せず、ルートの `npm run dev` を使用します。静的配信だけを確認する場合:

```bash
cd frontend
npm run dev
```

ローカル URL:

```text
http://127.0.0.1:4173
```

`npm run dev` は `node server.mjs` を実行します。
この場合もAPI操作には4000番でbackendが必要です。`npm run build` はJavaScript構文を検査します。

### backend

無料公開用の一時DBモード:

```bash
cd backend
npm ci
npm run dev:ephemeral
```

本番ビルド:

```bash
cd backend
npm run build
npm start
```

### database / Prisma

無料公開ではMySQLを使いません。`prisma migrate dev`、`prisma migrate deploy`、`prisma db seed`、`DEMO_STORAGE_MODE=mysql`でのbackend起動など、任意のローカルMySQL検証を行う前に、次の内容をユーザーへ提示して明示承諾を得てください。

- `DATABASE_URL` からパスワードを除いた接続先ホスト・ポート・DB名
- 適用するmigration名と作成・変更するテーブル
- seedで作成・更新するデータ件数と、既存データへの影響
- 外部サービスの場合は無料プランであり、課金・カード登録が発生しないこと

承諾前はMySQLへ接続しないでください。`prisma generate`、TypeScript build、DB非接続テストは承諾なしで実行できます。

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

Node.js標準の `node:test` とTypeScriptビルドを使ったテストを用意しています。

リポジトリ直下から frontend と backend のテストをまとめて実行する場合:

```bash
npm test
```

```bash
cd frontend
npm test
```

backendテストはPrisma Client生成とTypeScriptビルドを行うため、先に `npm ci` が必要です。

```bash
cd backend
npm test
```

API E2Eと2利用者ブラウザE2Eは、通常の単体テストから分離します。

```bash
npm run test:e2e
npm exec --prefix backend -- playwright install chromium
npm run test:browser
```

- `test:e2e` はSupertestで2利用者の認証、出品共有、自己購入拒否、双方承諾、ポイント移動、ページング、最終client終了時resetを確認する。
- `test:browser` はPlaywrightの独立browser context 2つで、自分の出品表示、別利用者への共有、購入相談を確認する。
- E2Eは公開用SQLite `:memory:`だけを使用し、MySQLへ自動接続・書き込みしない。

重点的にテストする観点:

- デモユーザーまたは仮想セッションで利用開始できること。
- 追加デモアカウントの初期残高が5,000ポイントで、実在連絡先や認証情報を入力・保存しないこと。
- 教科書出品で必須項目と価格のバリデーションが動くこと。
- 教科書検索で条件検索と関連度順の並び替えが動くこと。
- 購入リクエストで `AVAILABLE` の Book のみ `Transaction` を作成できること。
- 自分の出品物を購入できないこと。
- 関係者以外が Transaction を承諾できないこと。
- 購入者、出品者の双方承諾時のみ `Transaction` が `COMPLETED` になり、`Book` が `SOLD` になること。
- 取引成立処理と仮想ポイント更新が DB トランザクション内で実行されること。
- 未認証コメント、空コメント、240文字超過を拒否し、コメント投稿者・取引関係者以外へ通知しないこと。
- コメントをHTMLとして直接描画せず、取引成立通知を購入者・出品者だけに表示すること。
- クレジットカード、銀行口座、外部決済 URL、決済 API を入力・保存・送信できないこと。
- メール、電話番号、住所、学生証番号、本人確認書類は架空データとして保存され、実在データは保存されないこと。
- 架空個人情報も、実個人情報と同等に認可、暗号化、マスキング、監査ログ、保存期間、削除手段の対象になること。

現在のSPAでは、追加デモアカウント、教科書、購入相談、コメント、仮想ポイント残高、画面内通知をExpress API経由で一時SQLiteへ保存します。`frontend/src/apiClient.js` のドメイン操作は必ず `fetch` を使い、ブラウザストレージをデータベース代わりにしないでください。
所有権と取引当事者の判定には編集可能なニックネームではなくデモユーザー ID を使い、自分の出品物への購入相談を拒否します。
デモアカウントに購入者・出品者の固定ロールは付けず、認証済みの全アカウントが出品と他ユーザー出品の購入相談を行えます。未認証操作は `frontend/src/apiClient.js` の更新関数で拒否し、自分の出品は一覧で青枠とラベルを表示します。
購入相談は `PENDING` で作成し、購入者と出品者の双方承諾時だけ `COMPLETED` にして Book を `SOLD` にします。成立時に移動するのは換金不可・現金価値なしのデモ用仮想ポイントだけで、双方へ画面内通知を作成します。
片側承諾時は残高を更新せず、第三者承諾、重複承諾、残高不足を API 境界で拒否してください。カード・銀行口座・住所・電話番号などの支払い情報入力欄や外部決済 API は追加しないでください。
一時SQLite版と任意のMySQL版は、取引、Book、購入者・出品者残高、通知を単一のDBトランザクションで更新します。この保証を維持してください。
追加アカウントはニックネーム、学部、学科・専攻、学年だけを受け取り、コード側でデモ専用IDと5,000ポイントを付与します。実在メール、電話番号、住所、パスワード、本人確認情報を追加フォームへ含めないでください。
簡易コメントは教科書へ紐づけ、投稿は認証必須、本文は1〜240文字とします。UIでは `textContent` 相当の安全な描画を使い、外部メールやSMSではなく関係者向けの画面内通知だけを作成してください。

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

- 通常は環境変数不要。同一オリジンの `/api` を使用する。

### backend

- `NODE_ENV`
- `PORT`
- `HOST`
- `DEMO_STORAGE_MODE`（公開時は `ephemeral`）
- `SERVE_FRONTEND`（公開時は `true`）
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
- DB 操作はPrismaまたは `EphemeralStore` のparameter binding済みprepared statement経由で行い、ユーザー入力をSQL文字列へ連結しない。
- ユーザー入力を HTML として直接描画しない。
- 本番エラーでは内部スタックトレースを返さない。
- `/api` のインメモリrate limitは1クライアント1分180件を基準とし、生IPは保存せずプロセスsaltでハッシュ化する。
- 一覧APIは `page` / `pageSize` を受け取り、既定20件・最大50件とする。
- 500系エラーログはrequest ID、method、固定route pattern、status、error codeだけとし、生path、body、query、token、IP、ユーザー入力を記録しない。
- `/api/health` は選択中storageへ `SELECT 1` を実行し、接続不能時は503を返す。
- 実決済・カード登録・銀行口座登録・実在個人情報保存につながる UI、API、DB カラムを追加しない。
- 個人情報風の UI、API、DB カラムを追加する場合は、`dummy_*` など架空データであることが明確な命名にし、README のセキュリティ方針に合わせる。
- Book 更新・取り消しは出品者のみ許可し、取り消しは`AVAILABLE`の出品に限定する。
- Transaction 承諾・承認撤回は購入者または出品者本人のみ許可する。撤回は`PENDING`中の自分の承認に限定し、相手の承認や成立済み取引を巻き戻さない。
- 購入申請取り消しは`PENDING`中の購入者本人だけに許可し、Transactionを`CANCELLED`、Bookを`AVAILABLE`へ同一DB transactionで戻す。出品者、第三者、成立済み取引からの操作は拒否する。
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

Render.comのFree Web Service 1個へのデプロイを想定し、ルートの `render.yaml` を使用する。

- Build Command: `npm ci --include=dev --prefix backend && npm run build`
- Start Command: `npm start`
- Health Check Path: `/api/health`
- `DEMO_STORAGE_MODE=ephemeral`
- `SERVE_FRONTEND=true`

ExpressがfrontendとAPIを同一オリジンで配信します。別frontendサービス、MySQL、Persistent Disk、外部DBを作成しないでください。
frontendを単独確認する場合も `npm --prefix frontend run build` を成功させ、`server.mjs` はRender要件に合わせて `0.0.0.0`へbindする状態を維持してください。

有料プラン、カード登録、従量課金、Persistent Diskが必要になった場合はデプロイを中止してユーザーへ伝えてください。Free Web Serviceの停止・再起動、最後のブラウザ終了、90秒heartbeatなしで一時データを破棄する仕様を維持します。

Renderへ実際にデプロイする操作は、無料プランであることを確認し、ユーザーの明示指示を受けてから行ってください。

## 未決定事項

README 上で未決定とされている内容は、実装前に決定または明示してください。

- 画像ファイルをサンプル画像だけにするか、デモ用アップロードも許可するか。
- 授業マスタを作るか、Book の文字列項目で始めるか。
- 管理者機能を MVP に含めるか。
- 画面内デモ通知の保存期間をどうするか。

## 作業時の注意

- 実装前に、現在のリポジトリに実コードや設定ファイルが追加されていないか確認する。
- README と矛盾する変更をする場合は、README または AGENTS.md も更新する。
- 実行できないコマンドを「確認済み」として記録しない。
- 新しい起動・テストコマンドを追加した場合は、この AGENTS.md に追記する。
