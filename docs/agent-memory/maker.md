# Maker Memory

このファイルは Maker の継続コンテキストです。Maker が読み書きします。
Reviewer は独立性を保つため、このファイルを参照しません。

## 役割

- 通常の依頼を調査し、既存設計とコードに沿って実装、テスト、修正まで行う。
- Reviewer の指摘は、ユーザーが修正を明示的に承認したものだけ実装する。
- 作業完了時に `docs/development-log.md` とこのファイルを必要に応じて更新する。

## 引き継いだプロジェクト状態

- プロジェクトは慶應生向け教科書売買アプリのデモである。
- frontend は依存関係なしの静的 SPA で、デモアカウント追加・選択、仮想セッション、プロフィール編集、教科書一覧、検索、詳細、出品、コメント、購入相談、双方承諾、仮想ポイント取引、画面内通知の UI を持つ。
- backend は Express 5 / TypeScriptで、health、署名付きデモ認証、プロフィール、Books、Transactions、Comments、Notifications、demo lifecycle APIを持つ。
- frontendはfetch/Bearer認証でbackendへ接続し、ドメインデータをブラウザストレージへ保存しない。
- 無料公開の既定storageはNode.js組み込みSQLite `:memory:`。Prisma 7 / MySQLモデル・migration・seedは承諾制のローカル検証用として残す。
- リポジトリ直下の `npm run dev` は統合サーバーを通常4000番で起動し、開発時に使用中なら4001番以降へ切り替える。
- リポジトリ直下の `npm test` は frontend と backend の標準 Node.js テストを実行する。

## 継続する制約

- 実決済、カード・銀行口座登録、実在個人情報の入力・保存を実装しない。
- 売買は仮想ポイントで表現し、架空個人情報も実データと同等のセキュリティで扱う。
- 外部サービスは無料プランだけを使用し、課金やカード登録が必要なら作業を中止してユーザーへ伝える。
- backend APIでも実決済・実在個人情報・外部認証を追加せず、入力許可リストと認可を維持する。
- 作業結果は `docs/development-log.md` に追記する。

## 現在の残タスク

- Renderへの実デプロイと、Render上での複数ブラウザ共有・停止後初期化は未確認。
- ローカルHTTP、Supertest API E2E、Playwrightの2利用者ブラウザ操作を確認済み。Render上の目視操作は未確認。
- 任意のMySQLモードはCommentsを永続化せず、無料公開では使用しない。ローカルMySQLは `.local/mysql` の127.0.0.1:3307に残っている。

## 2026-07-15 のREADME実装状況整理

- Reviewer評価でfrontend未対応と確認された画像URL登録、詳細検索、出品編集・取り下げ、プロフィールアイコン、ページ移動、5件目以降の取引・通知をREADMEで`現状実装未定`と明記した。
- 架空メール・電話番号・住所・学生証・本人確認書類の保存と同等保護は、現在の公開用一時SQLiteと登録APIには存在せず入力を拒否することをREADMEへ明記した。
- backend実装済みの画像URL、詳細検索、Book更新・取り下げ、アイコンURL、APIページングと、frontend未対応部分を区別して記載した。
- 認証・認可エラーの401/403ログは現状実装未定で、現在のJSONエラーログが500系だけであることをREADMEへ反映した。
- 製品コードは変更していない。`npm test`はfrontend 2件、backend 4件が成功した。

## 2026-07-15 のRender production build修正

- `render.yaml`のBuild Commandを`npm ci --include=dev --prefix backend && npm run build`へ変更した。
- READMEとAGENTSのRender Build Commandも同じ内容へ同期した。ローカル開発用の通常の`npm ci --prefix backend`は変更していない。
- `NODE_ENV=production`で修正後コマンドを実行し、devDependencies、型定義、Prisma CLIを含む依存導入とfrontend/backend buildが成功することを確認した。
- `npm test`はfrontend 2件、backend 4件が成功した。Render実環境へのデプロイは引き続き未確認である。

## 2026-07-15 のUIテーマ更新

- ユーザー指示を `docs/ui-design-prompt.json` に構造化し、変更範囲をfrontendのデザインと教科書カードの選択UIに限定した。
- ベース色を`rgb(0, 30, 98)`、主要操作のアクセント色を`rgb(253, 208, 0)`へ統一し、小さい角、直線的な境界、オフセット影を使うテーマへ変更した。
- サイドバーの取引・通知セクションを分離し、見出しと件数を非改行にして重なりを防いだ。
- 教科書カード内の「詳細」ボタンを廃止し、カード全体のクリック、Enter、Spaceで詳細を選択できるようにした。API、backend、取引ルールは変更していない。
- `npm test`、`npm run build`、Playwrightの2利用者E2Eが成功した。1440pxと390px幅、およびサイドバー下端のスクリーンショットで重なりがないことを確認した。

## 2026-07-15 のUIテーマ再調整

- 追加指示を `docs/ui-design-refinement-prompt.json` に構造化し、前回の黄色を大面積で使う指定と出品セクションのボックス表現を上書きした。
- サイドバーの黄色い外縁を削除し、ボタン、件数、選択状態を紺・白・薄青中心へ変更した。黄系は交渉中状態の小さな表示だけに限定した。
- 検索条件をページタイトルと同じ `site-header` 内へ移し、デスクトップとモバイルで画面上端へ固定した。
- 自分の出品カードは薄青背景で表示し、出品セクションは外枠、背景、影を持たないページ内フォームへ変更した。
- Playwrightの計算スタイルで固定ヘッダー上端`0px`、出品外枠`0px`、影`none`、自分の出品背景`rgb(222, 235, 255)`を確認した。

## 2026-07-15 の主要操作色調整

- サイドバー外縁、背景、件数、カード選択影は抑えた配色を維持し、`K`ブランドマークと主要操作ボタンだけを元の`rgb(253, 208, 0)`へ戻した。
- 補助操作と無効状態は黄にせず、通常、hover、disabledの状態差を維持した。
- frontendテストとfrontend buildが成功し、Playwrightでブランドマークとサイドバー主要ボタンの計算色が`rgb(253, 208, 0)`であることを確認した。

## 2026-07-15 の出品区切り線

- 教科書一覧・詳細エリアと出品セクションの間に、テーマ色`rgb(0, 30, 98)`の上辺2px区切り線を追加した。
- 左右と下辺は0px、背景と影はなしのままとし、出品セクションをボックス化せず境界だけを示した。
- frontendテストとbuildが成功し、Playwrightで上辺2px、その他の辺0pxを確認した。

## 2026-07-31 の円表示・出品例追加

- frontendの金額表示を`pt`から`円`へ変更し、プロフィールは`円（デモ）`、支払い欄は`DEMO`と換金不可・現金価値なしの注意書きを表示する。
- APIの`price`、`pointBalance`と取引処理は換金できない仮想ポイントのままで、実決済や実際の金銭移動は追加していない。
- 架空の出品例として「ミクロ経済学ワークブック」「憲法判例ガイド」「Pythonデータ分析入門」「英語アカデミック・ライティング」を追加し、初期Bookを8件にした。
- 一時SQLite、Prisma seed、手動MySQL用SQL、frontend参照データを同期した。MySQLへの接続・seed適用は行っていない。
- 通常テスト、build、Playwright 2利用者E2Eが成功し、ブラウザで8件、円表示、`pt`表示なしを確認した。

## 2026-07-31 のREPORT記入

- `REPORT.md`の「サービス説明」と「設計の説明」を現行実装に基づいて記入した。
- サービスの利用フロー、関連度順、双方承諾、円表示のデモ通貨、実決済・実在個人情報を扱わない制約を説明した。
- frontend、Express API、一時SQLiteの三層構成、Bearerデモ認証、DBトランザクション、Render Free構成、テスト範囲を説明した。
- 初期Bookが8件になった後もAPI E2Eが4件前提だったため、出品後9件・reset後8件へ期待値を更新した。
- frontend 8件、backend 11件、API E2E 1件が成功した。

## 2026-07-31 の承認撤回・出品取り消し

- `PENDING`取引では、購入者・出品者が自分の承認だけを撤回できる。相手の承認は保持し、未承認からの重複撤回、第三者操作、`COMPLETED`後の撤回はAPIで拒否する。
- 出品者は詳細画面から自分の`AVAILABLE`な出品を取り消せる。第三者、`NEGOTIATING`、`SOLD`の取り消しは拒否または操作不可とする。
- frontendへ「承認を取り消す」と「出品を取り消す」の確認付き操作を追加し、API・一時SQLite・Prisma/MySQL経路を同じルールに揃えた。
- 通常テスト、build、API E2E、Playwright 2利用者E2Eが成功した。1440pxと390pxで横はみ出しがなく、両操作ボタンが表示されることを確認した。

## 2026-07-31 のREPORTこだわりポイント記入

- `REPORT.md`の4つのこだわりポイントを、箇条書きの要点から現行実装に基づく説明へ書き換えた。
- 関連度ランキングと検索、アカウント連動の出品初期値、frontend/APIの入力検証、紺・黄を使ったエッジのあるUI、サイドバーと固定検索による操作導線を説明した。
- 出品フォームで自動反映する値は学部・学科・学年であり、すべての入力を自動設定するものではないことを実装に合わせて記載した。
- 製品コードは変更せず、`git diff --check`と関連ソースの照合を行った。

## 2026-07-31 のREPORT設計説明詳細化

- `REPORT.md`の「設計の説明」を、設計方針、責務分離、frontend状態、認証・認可、データモデル・状態遷移、storage lifecycle、セキュリティ、公開運用、テスト・既知の制約に分けて詳細化した。
- 公開用一時SQLiteと任意のローカルMySQLの差、Commentの対応範囲、単一プロセス前提、データ消失・reset方針を明記した。
- Book・Transactionの状態遷移表と、双方承諾時の残高・Book・取引・通知を単一transactionで確定する規則を記載した。
- HTTP防御、HMAC署名付きデモセッション、認可、入力許可リスト、rate limit、request ID、個人情報を残さない500系ログを実装に沿って説明した。
- ページ移動、取引キャンセル、返金、MySQL Comment、401・403監査ログ、Render実環境などの未実装・未確認範囲も明記した。

## 2026-07-31 のREPORT設計説明簡素化

- 詳細化した設計説明から重複する責務表と処理手順を除き、こだわりポイントに近い学生レポート調へ書き換えた。
- 全体構成、frontend、認証、取引、保存、セキュリティ、公開・テストの7節に整理し、説明を91行から68行へ短縮した。
- 状態遷移表、transaction、DB初期化条件、MySQLとの差、HTTP対策、単一プロセス前提、テストと未実装範囲は維持した。
- 製品コードは変更せず、`git diff --check`で文書差分を確認した。

## 2026-07-31 のREPORT設計説明50%化

- 設計説明を7節・68行から5節・33行へ縮め、直前の約49%の分量にした。
- 状態遷移表を文章へ統合し、構成、認証、取引、保存・セキュリティ、公開・テストに整理した。
- 主要な設計判断、公開条件、未実装範囲は維持し、製品コードは変更していない。

## 2026-07-14 の実装

- 5つの架空デモアカウントを追加し、同一タブで随時切り替え可能にした。
- 2時間有効な仮想セッションを `sessionStorage` に保存し、タブごとに異なるユーザーで操作可能にした。
- プロフィールのニックネーム、学部、学科・専攻、学年を編集可能にした。
- 所有権と取引当事者を変更不能なデモユーザー ID で判定し、自己購入を拒否した。
- 未認証時の出品・購入を拒否し、取引一覧を購入者・出品者だけに限定した。
- 金額表示を実通貨ではなく `pt` に統一した。
- frontend に API 境界の振る舞いテストを追加した。
- デモアカウントに購入者・出品者の固定ロールは付けず、認証済みなら出品と他ユーザー出品の購入相談を両方行える。
- 未認証操作は API 境界で拒否し、自己購入は安定したユーザー ID で拒否する。
- 教科書一覧では自分の出品カードを青枠と「自分の出品」ラベルで表示する。
- 購入者と出品者が別々に承諾し、双方承諾時だけ取引を `COMPLETED`、教科書を `SOLD` にする処理を frontend の API 境界へ追加した。
- 片側承諾時は仮想ポイントを移動せず、双方承諾時だけ購入者残高を減算し、出品者残高を加算する。残高不足、第三者承諾、重複承諾は拒否する。
- プロフィールの残高表示、教科書詳細の支払い風プレビュー、取引承諾操作、取引完了通知を追加した。実決済情報の入力欄や外部決済 API は持たない。
- 複数の `localStorage` 更新は失敗時に更新前データへ戻すが、DB 相当の同時実行制御はない。backend 実装時は単一の DB トランザクションへ置き換える。
- ニックネーム、学部、学科・専攻、学年だけでデモアカウントを追加可能にし、コード側で変更不能なデモIDと初期5,000ポイントを付与する。追加アカウントを含めて最大20件とする。
- 教科書詳細へ1〜240文字の簡易コメントを追加し、未認証・空文字・文字数超過を API 境界で拒否する。投稿内容は `textContent` で描画する。
- 購入希望者等のコメントは出品者へ、出品者の返信は同じ教科書の既存投稿者と取引購入者へ画面内通知する。取引成立通知には `TRANSACTION_COMPLETED` 種別を付ける。
- backendへ2時間有効なHMAC署名付きBearerデモセッション、プロフィール、Books CRUD、Transactions作成・取得・承諾、成立通知APIを追加した。
- User、Book、Transaction、NotificationのPrisma 7モデルとMySQL migrationを追加し、Prisma MariaDB driver adapterで接続する。
- 双方承諾時のTransaction、Book、購入者・出品者残高、通知を直列化可能な単一DBトランザクションで確定する。
- 一時MySQLで登録、出品、購入相談、片側承諾、双方成立、ポイント移動、成立通知のE2E確認を完了した。
- `backend/prisma/seed.ts` に5架空ユーザー、4架空Book、交渉中・成立済みTransaction各1件、成立通知2件の冪等seedを追加した。`database/seed.sql` は手動確認用の同等SQLである。
- seed再実行時は取引後の仮想ポイントを巻き戻さず、実在個人情報・認証情報・決済情報を投入しない。
- MySQLへ接続するmigration、seed、API起動は、接続先・変更内容・件数・既存データ影響を提示し、ユーザーの明示承諾後だけ実行する。承諾後、ローカル3307番へmigrationとseedを適用した。
- `keio_book_demo` にはUser 5件、Book 4件、Transaction 2件、Notification 2件があり、seed再実行後も件数が増えないことを確認した。
- frontendのAPI境界をlocalStorage実装からfetch/Bearer実装へ置き換え、認証、アカウント、プロフィール、Books、Transactions、Comments、NotificationsをExpress APIへ接続した。
- backendにNode.js組み込みSQLite `:memory:`のUser、Book、Transaction、Comment、Notification schema、制約、index、架空seedを追加した。
- 一時SQLiteでも自己購入拒否、価格一致、残高、当事者承諾、Book状態、ポイント移動、通知を単一transactionで処理する。
- ブラウザopen/30秒heartbeat/close APIを追加し、最終client終了、90秒通信断、プロセス停止時にデータをseed状態へ戻す。共有中の手動resetを拒否し、active client上限を200件にした。
- Expressから静的frontendとAPIを同一オリジン配信し、Render Free Web Service 1個だけを作る `render.yaml` を追加した。MySQL、Persistent Disk、外部DB、カード・課金設定は公開構成に含めない。
- `npm run dev` は一時DB統合サーバーを起動し、開発時のEADDRINUSEでは最大10ポート先まで再試行する。本番では指定PORTのbind失敗を異常終了にする。
- frontendのAPIモックテストとbackend一時DBテストを追加し、localStorage未使用、認証header、5,000ポイント、自己購入拒否、双方成立、ポイント移動、最終client終了時resetを確認した。
- frontend単独buildと `0.0.0.0` bindを確認し、Renderでは引き続き統合Web Serviceから同一オリジン配信する。
- APIへ生IPを保存しない1分180件のインメモリrate limit、request ID、固定route patternだけを使う500系JSONエラーログを追加した。
- Books、Transactions、Comments、Notificationsへ既定20件・最大50件のページングを追加し、frontendをページレスポンスへ追従させた。
- healthは選択中storageへ `SELECT 1` を実行し、SQLite統計またはMySQL接続状態を返し、失敗時は503にする。
- Supertest API E2Eで2利用者のsession、出品共有、自己購入拒否、双方承諾、ポイント移動、ページング、最終client終了時resetを確認した。
- Playwright Chromiumの独立browser context 2つで、自分の出品表示・購入不可、別利用者への出品共有、購入相談、出品者への取引反映を確認した。
- 公開用一時DBはバックアップせず、schemaと架空seedからのresetを復旧手段とする。MySQLは公開せず、health probe以外の自動接続は行わない。

## 2026-07-31 購入申請の残高超過警告

- 購入者の`PENDING`取引額と今回の申請額を合算し、現在残高を超える場合は`409 PURCHASE_BUDGET_EXCEEDED`で申請作成を拒否する。
- MySQL用Prisma transactionはSerializable分離、一時SQLiteは単一transaction内で合計検査と申請作成を行う。
- frontendの支払い欄へ現在残高、申請中額、今回額、すべて成立した場合の残高を表示し、超過時は警告文を表示して申請ボタンを無効化する。
- frontend側の事前判定に加え、古い画面状態や直接リクエストに対してもbackendを最終判定とする。
- API E2Eで残高3,200円に対する1,800円と1,600円の連続申請を検証し、2件目の拒否とBook状態維持を確認した。
- Playwrightで申請中500円の利用者が3,000円の教材を選択した際の警告表示とボタン無効化を確認した。
- `PENDING`取引は成立またはデモデータresetまで利用予定額に含まれる。取引キャンセルと期限切れは未実装である。

## 2026-07-31 購入申請取り消し

- 購入者本人は`PENDING`の購入申請を`CANCEL_PURCHASE`で取り消せる。出品者の承認有無は問わない。
- 取消時はTransactionを`CANCELLED`、Bookを`AVAILABLE`へ同一DB transactionで更新し、仮想ポイント残高は変更しない。
- `CANCELLED`は残高の申請中額集計から外れるため、取消直後に利用予定額が解放される。
- 出品者、第三者、重複取消、`COMPLETED`後の取消はAPIで拒否する。成立後の返金・取引取消は対象外である。
- frontendの購入者側取引欄へ確認ダイアログ付きの「購入申請を取り消す」ボタンを追加し、取消後の状態と再公開されたBookを表示する。
- 単体テスト、API E2E、Playwrightで権限、状態遷移、残高不変、Book復旧、再申請可能化を確認した。
