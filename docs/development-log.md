# Development Log

## 2026-07-08 15:31
## 80d1b0b, add agents.md, edit 2.2 in readme.md
### 依頼内容
- README.md を読んで、主要ディレクトリ、起動方法、テスト方法、実装ルールを AGENTS.md にまとめる。

### 実施内容
- 変更したファイル: `AGENTS.md`, `README.md`
- README の設計内容をもとに、プロジェクト概要、主要ディレクトリ、起動方法、テスト方法、環境変数、実装ルール、命名規則、未決定事項を整理した。
- 当時の実体に合わせて、実装ファイルや package.json が未作成であることを明記した。

### 確認内容
- 実行したコマンド: `rg --files`, `find . -maxdepth 3 -type f`, `git status --short`, `git diff -- README.md`
- テスト結果: 実装コードとテスト設定が未作成だったため未実行。
- 未確認事項: 実アプリの起動、API、DB、テストは未確認。

### 次にやること
- 最小構成の frontend を作成する。
- 実装が増えたら AGENTS.md の起動・テスト手順を更新する。

## 2026-07-08 15:47
## e9715df, create minimam app
### 依頼内容
- 認証や購入処理の余地を残しつつ、最小構成で Web アプリを作成する。

### 実施内容
- 変更したファイル: `AGENTS.md`, `frontend/**`
- 依存なしの静的 SPA を `frontend/` に作成した。
- 教科書一覧、検索、詳細表示、出品フォーム、購入相談作成の最小 UI を実装した。
- `frontend/src/apiClient.js` を将来 Express API に差し替える境界として用意した。
- デモデータと購入相談は `localStorage` に保存する構成にした。

### 確認内容
- 実行したコマンド: `npm test`, `node --check server.mjs`, `node --check src/app.js`, `node --check src/apiClient.js`, `npm run dev`, `curl -I http://127.0.0.1:4173`
- テスト結果: `frontend/tests/smoke.test.mjs` 成功。HTTP 200 応答を確認。
- 未確認事項: ブラウザでの手動 UI 操作、永続 DB、認証 API、購入確定処理。

### 次にやること
- README/AGENTS のデモ決済・個人情報方針を明確化する。
- backend と database はまだ未作成。

## 2026-07-08 15:59
## 82c8246, think seculity
### 依頼内容
- 外部公開を前提に、実決済やクレジットカード登録を行わず、仮想のお金で売買できることを README.md と AGENTS.md に盛り込む。
- 個人情報やセキュリティリスクのあるものはデモ用の仮想のもので代替し、セキュリティ設計は同等にする。

### 実施内容
- 変更したファイル: `README.md`, `AGENTS.md`
- 実決済、クレジットカード、銀行口座、外部決済 API を実装しない方針を追加した。
- 支払いは仮想ポイントのみで処理する設計に変更した。
- 実在個人情報や本番外部サービスを使わず、デモ認証、仮想セッション、画面内通知で代替する方針を追加した。
- セキュリティ設計として認可、入力検証、XSS/CSRF/CORS、エラー制御を本番に近い形で扱うことを追記した。

### 確認内容
- 実行したコマンド: `rg`, `git diff --check`, `npm test`
- テスト結果: `frontend` の smoke test 成功。Markdown の trailing whitespace なし。
- 未確認事項: 実際の決済遮断 UI/API、セキュリティテスト自動化、backend 実装。

### 次にやること
- 架空個人情報の扱いを、保存する前提で再整理する。
- backend/database 作成時にデモ安全ルールを反映する。

## 2026-07-08 16:03
## f9a0a83, insert creating imagine data on readme.md
### 依頼内容
- 実在メール、電話番号、住所、学生証、本人確認書類などは嘘のデータで保存し、セキュリティも同等に実装する旨を README.md と AGENTS.md に入れる。

### 実施内容
- 変更したファイル: `README.md`, `AGENTS.md`
- 架空メール、架空電話番号、架空住所、架空学生証番号、架空本人確認書類データを保存対象にする方針を追加した。
- `dummy_email`, `dummy_phone`, `dummy_address`, `dummy_student_id`, `dummy_identity_document_ref` を DB/Prisma 設計例に追加した。
- 架空個人情報も、暗号化、マスキング、認可、監査ログ、保存期間、削除手段の対象にする方針を追加した。
- `DEMO_PII_ENCRYPTION_KEY` と `REAL_PERSONAL_DATA_NOT_ALLOWED` を設計に追加した。

### 確認内容
- 実行したコマンド: `rg`, `git diff --check`, `npm test`
- テスト結果: `frontend` の smoke test 成功。Markdown の trailing whitespace なし。
- 未確認事項: 架空個人情報の暗号化実装、マスキング実装、監査ログ実装、削除手段。

### 次にやること
- backend と database のベース構造を作成する。
- Prisma モデル追加は具体機能実装時まで保留する。

## 2026-07-08 16:07
## 2eb449c, create basement of backend, database
### 依頼内容
- backend と database のベース構造と最小構成の機能だけを作成する。
- 具体的な機能はまだ入れない。

### 実施内容
- 変更したファイル: `AGENTS.md`, `backend/**`, `database/**`
- Express / TypeScript / Prisma 用の backend ベース構造を追加した。
- 疎通確認用に `/api/health` のみ追加した。
- Prisma schema は datasource/generator のみで、ドメインモデルは未定義にした。
- database に migration/seed 置き場、README、notes、空の seed.sql を追加した。
- backend の構造確認テストを追加した。

### 確認内容
- 実行したコマンド: `npm test` in `backend`, `npm test` in `frontend`, `git diff --check`, `rg`
- テスト結果: backend 構造テスト成功。frontend smoke test 成功。Markdown/空白チェック成功。
- 未確認事項: `npm install`, TypeScript build, Prisma generate, MySQL 接続、実サーバ起動。

### 次にやること
- 具体機能を実装するタイミングで auth/books/transactions のルート、controller、service、repository を追加する。
- Prisma モデルと migration は機能実装時に追加する。

## 2026-07-08 16:10
## 未コミット, docs: 開発ログを追加
### 依頼内容
- `docs/development-log.md` を作成し、今までの作業と今後の作業ごとに作業結果を追記する。
- 変更ファイル、実行コマンド、確認結果、残タスクを簡潔にまとめ、git の commit 対応が分かるようにする。

### 実施内容
- 変更したファイル: `docs/development-log.md`
- 既存 commit 5 件の作業内容を、指定形式で開発ログ化した。
- 各 entry に依頼内容、変更ファイル、実施内容、確認コマンド、確認結果、未確認事項、残タスクを整理した。

### 確認内容
- 実行したコマンド: `git log --oneline -5`, `git log --date=format:'%Y-%m-%d %H:%M' --format='%h%x09%ad%x09%s' -5`, `git show --stat --oneline --name-only <commit>`, `git diff --check`, `cd frontend && npm test`, `cd backend && npm test`
- テスト結果: `git diff --check` 成功。frontend smoke test 成功。backend 構造確認テスト成功。
- 未確認事項: なし。

### 次にやること
- このログ追加を commit する。

## 2026-07-08 16:18
## 未コミット, docs: 作業ログの保存先を development-log に統一
### 依頼内容
- `docs/codex-work-log.md` ではなく、`docs/development-log.md` に保存するように書き換える。

### 実施内容
- 変更したファイル: `AGENTS.md`, `docs/development-log.md`
- `AGENTS.md` の作業ログ保存先を `docs/codex-work-log.md` から `docs/development-log.md` に変更した。
- `/prompt1` の「作業後ログ追記」と `/prompt2` の「有料外部サービス禁止・無料プランのみ使用」ルールは、`AGENTS.md` の常時適用ルールとして維持した。
- 今回の作業結果を `docs/development-log.md` に追記した。
- 誤って作成していた `docs/codex-work-log.md` は不要になるため削除する。

### 確認内容
- 実行したコマンド: `date '+%y.%m.%d %H:%M'`, `date '+%Y-%m-%d %H:%M'`, `rg -n "codex-work-log|development-log|作業ログ|常時適用" AGENTS.md docs`, `git status --short`, `sed -n '100,180p' docs/development-log.md`, `sed -n '48,68p' AGENTS.md`, `sed -n '1,120p' docs/codex-work-log.md`, `rg -n "codex-work-log" AGENTS.md docs || true`, `git diff --check`, `cd frontend && npm test`, `cd backend && npm test`
- テスト結果: `git diff --check` 成功。frontend smoke test 成功。backend 構造確認テスト成功。
- 未確認事項: なし。`codex-work-log` の文字列は `docs/development-log.md` の作業履歴内にのみ残っている。

### 次にやること
- 今回のログ保存先修正を commit する。

## 2026-07-13 19:02
## 未コミット, fix: ルートから開発環境を起動可能にする
### 依頼内容
- リポジトリ直下で `npm run dev` を実行すると、`package.json` がなく `ENOENT` になる問題を解消する。

### 実施内容
- 変更したファイル: `package.json`, `README.md`, `AGENTS.md`, `docs/development-log.md`
- ルート `package.json` を追加し、`npm run dev` で現在の静的 frontend を起動できるようにした。
- frontend、backend の個別起動スクリプトと、両方のテストを実行するルート `npm test` を追加した。
- README と AGENTS の起動・テスト手順をルートコマンドに対応させた。

### 確認内容
- 実行したコマンド: `npm pkg get scripts`, `npm test`, `npm run dev`, `curl -sS -I http://127.0.0.1:4173`, `git diff --check`
- テスト結果: frontend smoke test 1件、backend 構造確認テスト 1件が成功。ルート `npm run dev` で起動し、HTTP `200 OK` を確認した。
- 未確認事項: backend 開発サーバーは依存関係未インストールのため起動未確認。

### 次にやること
- 今回の修正を commit する。
