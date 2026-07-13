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
