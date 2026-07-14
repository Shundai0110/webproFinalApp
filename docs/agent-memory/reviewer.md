# Reviewer Memory

このファイルは Reviewer の独立した継続コンテキストと評価履歴です。
Reviewer は Maker のメモリや未公開の実装意図を参照せず、確認可能な成果物と証拠だけから評価します。

## 役割

- README、AGENTS、ソースコード、テスト、git 差分を読み、現状の実装を確認・評価する。
- 指摘は重要度順に、根拠となるファイルと行番号、影響、再現条件、テスト不足を示す。
- 問題が見つからない場合も、その旨と未確認事項、残存リスクを明示する。
- ユーザーから明示的な実装・修正指示が出るまで、評価対象の製品コードや設計書を変更しない。
- 修正指示が出た場合は Maker に引き渡し、Maker の修正後に必要なら独立して再評価する。

## 参照してよい情報

- `README.md` と `AGENTS.md`
- frontend、backend、database の実装とテスト
- git の履歴、状態、差分
- `docs/development-log.md` に記録された客観的な変更・確認結果
- この Reviewer Memory に蓄積した過去の指摘と再評価結果

## 参照しない情報

- `docs/agent-memory/maker.md`
- Maker の非公開な推論、意図、未検証の自己評価

## 評価履歴

### 2026-07-13 README 要件と現状実装の比較

- 評価対象: commit `5ae00bf` (`develop`)、評価開始時の worktree は clean。
- frontend は静的 SPA と localStorage によるプロトタイプであり、一覧、簡易検索、詳細、簡易出品、購入相談作成、関連度並び替え、デモ初期化が動作する。
- backend は `/api/health` と共通基盤だけで、認証、ユーザー、教科書、取引 API は未実装。
- database は Prisma datasource のみで、モデル、migration、seed、MySQL 接続は未実装。

#### 指摘

1. 高: 自分で出品した教科書に自分で購入リクエストを作成できる。`createListing` と `requestPurchase` が同じ `demoSession.name` を seller / buyer に設定し、自己購入判定がない。README UC-003 と API-009 に違反する。
2. 高: `demoSession.authenticated` が false でも出品・購入相談を実行できる。認証・認可・ロール制御がなく、README の各ユースケース事前条件とセキュリティ要件を満たさない。
3. 高: 双方承諾、成立判定、Book の SOLD 更新、仮想ポイント移動、完了通知が未実装で、取引は PENDING 作成までしか進まない。
4. 中: 検索条件、出品項目、ステータス管理は README の一部だけを実装している。学科、学年、年度、教材種別などの絞り込みや取り下げ・更新がない。
5. 中: データは localStorage に平文保存され、API / DB / トランザクションを通らない。改ざん耐性、認可、暗号化、監査、整合性を評価できない。
6. 中: 金額を「円」と表示するが、仮想ポイント残高・支払い風 UI・換金不可表示がないため、仮想取引であることが画面から明確でない。
7. 中: 自動テストは HTML や文字列、ファイル構造の存在確認に限られ、検索・出品・購入・異常系・セキュリティの振る舞いを回帰検証していない。

#### 確認できた安全面

- 実決済、カード、銀行口座、実在個人情報の入力欄と外部送信処理は見つからない。
- frontend はユーザー由来文字列を主に `textContent` で描画し、`innerHTML` の利用は見つからない。
- サンプル画像はリポジトリ内 SVG で、外部画像アップロードはない。
- Express 基盤には CORS origin 制限、1MB JSON 制限、`x-powered-by` 無効化、本番エラーメッセージ抑制がある。

#### 検証結果

- `npm test`: frontend のテストファイル（定義3件）と backend のテストファイル（定義2件）が成功。
- frontend HTTP: `http://127.0.0.1:4173` が `200 OK`。
- 関数検証: 自己購入リクエストが作成され、Book が `NEGOTIATING`、Transaction が `PENDING` になることを再現。
- backend は `node_modules` と `dist` がなく、実サーバー起動・ビルド・health API は未確認。

### 2026-07-14 デプロイ可否の再評価

- 評価対象: commit `451f72b` (`features/database`)、評価開始時のworktreeはclean。Makerメモリは参照していない。
- 判定: 現状のフルスタックは外部デプロイ不可。ローカル実演に限定する。
- 改善確認: backendに署名付きBearerセッション、所有者・取引当事者の認可、入力許可リスト、自己購入拒否、双方承諾、ポイント・Book・通知の単一DBトランザクション、MySQL migration/seedがある。実決済入力・外部決済接続は見つからない。

#### デプロイ阻害事項

1. 高: frontendは`fetch`やAPI URLを持たず、`localStorage`/`sessionStorage`だけを使用する。Express/MySQLの認証・認可・整合性保証は実画面から一切使われず、利用者間でデータ共有できない。
2. 高: backend認証入口はアカウント新規作成だけで、既存デモユーザー選択・再ログイン・セッション再発行がない。2時間失効後は復帰できず、全体20件上限はseed 5件を含むため公開利用者が枠を埋められる。
3. 高: README/AGENTSのfrontend Build Commandは実在しない`npm run build`で失敗する。静的サーバーは既定で`127.0.0.1`へbindするが、Render Web Serviceは`0.0.0.0`を要求する。Render設定ファイルもなく、公開対象の`main`はHEADより10 commit古い。
4. 高: Renderの無料Web ServiceはPersistent Diskを使用できず、READMEが想定するMySQL + Persistent Diskは有料構成になる。無料プラン限定・有料禁止ルール下では、現在のRender/MySQL構成を採用できない。
5. 中: READMEにあるcomments APIとCommentモデルはbackendにない。自由記述のnickname、Book description、Transaction messageへ実在個人情報を入力・平文保存でき、項目名allowlistだけでは実データ混入を防げない。
6. 中: rate limit、ページング、DB接続を含むhealth check、エラーログ、バックアップ、デモデータリセット、API/DB E2E・デプロイ後テストがない。公開時の枯渇・障害検知・復旧を評価できない。

#### 検証結果

- `npm test`: frontend 2 test files、backend 3 test files、Prisma Client生成、TypeScript buildが成功。
- `npm audit --omit=dev --json`: 本番依存169件、既知脆弱性0件。
- `npm --prefix frontend run build`: `Missing script: build`で失敗。
- 不正URLに対する静的サーバー停止可能性の動的再現は、隔離ポート起動の権限が承認されず未確認。コード上は`decodeURIComponent`が例外処理外にある。

### 2026-07-15 README限定デモのデプロイ可否再評価

- 評価対象: commit `e7b72d7` (`develop`)、評価開始時のworktreeはclean。Makerメモリは参照していない。
- 判定: 現行`render.yaml`のままではデプロイ不可。`NODE_ENV=production`で`npm ci`がdevDependenciesを省略し、TypeScript型定義が不足してBuild Commandが失敗する。
- 修正可能性: 一時環境で`npm ci --include=dev`を使うとproduction buildが成功したため、Build Command修正後はREADME限定の消失前提デモとしてデプロイ候補になる。ただしRender実環境は未確認であり、現時点ではデプロイ済み・デプロイ可能確認済みとは判定しない。

#### 指摘

1. 高: `render.yaml`は`NODE_ENV=production`を設定した状態で`npm ci --prefix backend`を実行する。npmはこの条件でdevDependenciesを省略し、`@types/node`、`@types/express`、`@types/cors`などがなく`tsc`が失敗する。現行Build CommandではRender deployを完了できない。
2. 中: READMEのMVPにある画像URL登録、詳細検索条件、出品編集・取り下げ、プロフィールアイコン編集はAPIの一部に存在してもfrontendに入力・操作UIがない。検索画面はキーワード・学部・状態だけで、学科・学年・年度・教材種別・カテゴリを指定できない。
3. 中: frontendはBooks・Transactions・Comments・Notificationsを先頭50件だけ取得し、ページ移動手段がない。さらに取引と通知は先頭4件だけ表示するため、5件目以降の取引承諾や通知確認を画面から行えない。
4. 中: READMEは架空メール・電話・住所・学生証・本人確認書類の保存と同等保護を記載する一方、実装のUser schemaと登録APIはこれらの項目を持たず拒否する。T-014/T-016は実行不能で、README内でも「保存する」と「求めず拒否する」が矛盾している。
5. 低: READMEの非機能要件はRender Logsで認証エラー確認を求めるが、実装は500系だけをJSON記録し、401/403を記録しない。
6. 未確認: Render上でのbuild/start、health、同一オリジン、2利用者共有、429、最終client終了・90秒失効・サービス停止後resetは未実施。通常検索2秒目標と長時間・負荷時動作も未計測。

#### 確認結果

- `npm test`: frontend 2 test files、backend 4 test filesが成功。
- `npm run build`: frontend構文検査、Prisma Client生成、TypeScript buildが成功。
- `npm run test:e2e`: 2利用者API取引、自己購入拒否、双方承諾、ポイント移動、SOLD更新、ページング、health、最終client close後resetが成功。
- `npm run test:browser`: 2 browser contextの出品共有、自己購入不可表示、購入相談共有が成功。
- `npm audit --prefix backend --omit=dev`: 既知脆弱性0件。
- production依存だけの一時環境: 現行相当の`npm ci`後は型定義不足でbuild失敗し、`npm ci --include=dev`後はbuild成功。
- Render FreeはREADME用途に合うが、課金禁止を守るには支払方法を登録しない。無料枠超過時は停止を許容し、課金で継続しない。
