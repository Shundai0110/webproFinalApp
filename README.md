# Webアプリ設計書テンプレート

作成日時: 2026-MM-DD
対象アプリ: 慶應生向け教科書売買アプリ  
対象構成: Next.js / TypeScript / Node.js / Express / Prisma / MySQL / Render.com

---

## 1. 文書情報

| 項目 | 内容 |
|---|---|
| プロジェクト名 | 慶應生向け 教科書売買アプリ |
| 作成開始日 | 2026-6-24 |
| 最終更新日 | 2026-MM-DD |
| バージョン | beta |
| リポジトリURL | __ |
| デプロイ先 | Render.com |
| 本番URL | __ |
| API URL |  |

---

## 2. システム概要

### 2.0 テーマ
慶應生の間で、教科書を売り買いできるアプリ

### 2.1 目的

本Webアプリは、慶應義塾大学の学生同士が、授業で使用する教科書を売買・譲渡できるWebアプリを提供する。

ユーザーは、教科書名、授業名、学部、学科、学年、使用年度、必須教材か参考書かといった条件から教科書を検索できる。  
出品者は、教科書の写真、価格、対象授業、使用年度、状態などを登録できる。  
購入者と出品者の双方が承諾した場合のみ、取引を成立させる。

本アプリはデモ・学習用途を前提とし、実際の金銭決済、クレジットカード登録、銀行口座登録、実在する連絡先や本人確認書類の保存は行わない。
画面上でメール、電話番号、住所、学生証、本人確認書類などの項目が必要な場合は、実在データではなく架空のデモデータを保存する。
売買体験は見た目だけ実サービスに近づけるが、支払いはデモ用の仮想ポイントだけで処理し、実際のお金の受け渡しは発生させない。

### 2.2 解決したい課題

| 課題 | 本システムでの解決方法 |
|---|---|
| 教科書の購入費用が高い | 学生間で中古教科書を売買・譲渡できる |
| 授業と教科書の対応が分かりにくい | 出品時に授業名・使用年度・学部・学科・学年を登録する |
| 購入合意が曖昧になりやすい | Transactionで購入者・出品者の承諾状態を管理する |
| 探したい教科書を見つけにくい | 教科書・授業・学部・学科・学年・年度・教材種別で検索する |
| 本人の情報に従っておすすめをしたい | 本人の授業・学部・学科・学年からおすすめ表示 |
| 実決済や個人情報保存によるリスクを避けたい | デモ認証、仮想ポイント、仮想ユーザー、架空の個人情報、サンプル画像、画面内通知で代替する |

### 2.3 主な利用者

| 利用者 | 説明 | 主な操作 |
|---|---|---|
| 慶應生想定ユーザー | デモ認証または仮想セッション上の学生ロール | 教科書検索 / 出品 / 購入リクエスト / 承諾 |
| 出品者 | 教科書を売りたい、または譲渡したいユーザー | 教科書投稿 / 価格変更 / コメント対応 / 取引承諾 |
| 購入者 | 教科書を探しているユーザー | 検索 / 詳細確認 / 購入リクエスト / 取引承諾 |
| 管理者 | 不適切投稿やトラブル対応を行う担当者 | 投稿確認 / ユーザー確認 / 取引状況確認 |

### 2.4 MVPの範囲

MVPでは、以下を最小構成とする。

- デモユーザーまたは仮想セッションによる利用開始
- 教科書の出品
- 教科書の一覧表示・検索
- 教科書詳細表示
- 購入リクエスト
- 購入者・出品者の双方承諾による取引成立
- 出品ステータスの変更
- サンプル画像URLまたはデモ用画像URLの登録
- 仮想ポイント残高の表示
- 仮想ポイントによる支払い風UI

以下は拡張候補とする。

- コメント専用テーブル
- 授業マスタ
- 複数枚の写真投稿
- カテゴリマスタ
- レビュー機能
- 通知機能
- 管理者画面

以下は本プロジェクトでは実装しない。

- 実決済機能
- クレジットカード登録・保存・利用
- 銀行口座登録・保存・利用
- 実在するメールアドレス、電話番号、住所、学生証、本人確認書類の入力・保存
- 架空データでない個人情報の保存

### 2.5 デモ公開・安全方針

外部に見せる可能性があるデモとして、セキュリティリスクや個人情報保護上のリスクがある機能は、実データを扱わない代替実装にする。
ただし、架空のメール、電話番号、住所、学生証番号、本人確認書類データは保存対象にし、セキュリティ実装は実データを扱う場合と同等にする。

| 対象 | デモでの扱い | 実装禁止事項 |
|---|---|---|
| 支払い | 仮想ポイントの加減算と支払い完了風の画面で代替する | 実決済API、カード番号入力、カードトークン保存、銀行口座登録 |
| 認証 | デモユーザー、仮想セッション、開発用ロールで代替し、必要な識別情報は架空データで保存する | 実在メールアドレス必須化、大学認証の本番接続、実本人確認書類アップロード |
| プロフィール | ニックネーム、学部、学年、架空メール、架空電話番号、架空住所、架空学生証番号を扱う | 実在する氏名、住所、電話番号、生年月日、学生証番号の保存 |
| 連絡 | 画面内通知、デモ通知ログで代替する | 実メール送信、SMS送信、外部チャット連携 |
| 本人確認書類 | 架空の本人確認書類データ、サンプル画像、またはダミーメタデータを保存する | 実本人確認書類、学生証実画像、EXIF付き実写真の保存 |
| 画像 | サンプル画像またはデモ用URLを使う | EXIF付き実写真の保存、個人が写る画像の必須アップロード |
| 管理機能 | デモデータ上の状態変更で代替する | 実ユーザー停止、実個人情報閲覧、監査ログへの個人情報保存 |

架空データであっても、セキュリティ設計は本番データと同等に行う。認可チェック、入力値検証、保存時暗号化、画面表示時のマスキング、CSRF/XSS対策、CORS制御、エラー情報の制限、操作ログ、保存期間、削除手段の設計は、実データを扱う場合と同じ前提で設計する。

---

## 3. 採用技術

| 区分 | 技術 | 用途 |
|---|---|---|
| フロントエンド | Next.js | 画面表示、ルーティング、API呼び出し |
| UI実装 | React / TypeScript | コンポーネント単位のUI構築、型安全な画面実装 |
| スタイリング | CSS / CSS Modules / Tailwind CSSなど | 画面デザイン |
| バックエンド実行環境 | Node.js | サーバーサイドJavaScript/TypeScript実行環境 |
| バックエンドフレームワーク | Express | REST APIの実装 |
| ORM | Prisma | TypeScriptからMySQLを安全に操作するためのORM |
| データベース | MySQL | User / Book / Transactionデータの永続化 |
| デプロイ | Render.com | フロントエンド、API、MySQLのホスティング |
| バージョン管理 | Git / GitHub | ソースコード管理 |
| パッケージ管理 | npm | 依存関係管理 |

### 3.1 技術選定理由

| 技術 | 選定理由 |
|---|---|
| Next.js | 画面単位のルーティング、ReactによるUI構築、API連携がしやすい |
| Express | REST APIを明確に分離し、ルーティングとコントローラーを実装しやすい |
| Prisma | SQLを直接書く量を減らし、User / Book / Transactionの関係を型付きで扱える |
| MySQL | リレーショナルデータとしてユーザー、教科書、取引の関係を扱いやすい |
| Render | GitHub連携によるデプロイ、Web Service、Persistent Diskを用いたMySQL構成が利用できる |

---

## 4. 3層構造

本システムは、以下の3層構造で設計する。

| 層 | 役割 | 使用技術 | 主な責務 |
|---|---|---|---|
| プレゼンテーション層 | ユーザーとの入出力 | Next.js / React / TypeScript / CSS | 検索画面、出品フォーム、購入・承諾ボタン、プロフィール、ポイント残高表示 |
| アプリケーション層 | 業務処理・API提供 | Node.js / Express / Prisma | 出品処理、検索処理、購入リクエスト、双方承諾確認、状態更新 |
| データ層 | データ永続化 | MySQL | User / Book / Transactionの保存、検索、整合性管理 |

### 4.1 3層構造図

```mermaid
flowchart TB
    User[慶應生想定ユーザー / ブラウザ]

    subgraph Presentation["プレゼンテーション層: Next.js"]
        Register[デモアカウント画面]
        Profile[プロフィール画面]
        Search[検索画面]
        ListingForm[教科書投稿画面]
        BookDetail[教科書詳細画面]
        Purchase[購入・承諾画面]
        ApiClient[API Client]
    end

    subgraph Application["アプリケーション層: Node.js + Express + Prisma"]
        Routes[Routes]
        Controllers[Controllers]
        Services[Services / Business Logic]
        PrismaClient[Prisma Client]
        AuthLogic[デモ認証・仮想セッション]
        TransactionLogic[双方承諾ロジック]
        RankingLogic[関連度ランキング]
    end

    subgraph Data["データ層: MySQL"]
        DB[(MySQL)]
        UserTable[User]
        BookTable[Book]
        TransactionTable[Transaction]
    end

    User --> Register
    User --> Search
    User --> ListingForm
    User --> BookDetail
    User --> Purchase

    Register --> ApiClient
    Search --> ApiClient
    ListingForm --> ApiClient
    BookDetail --> ApiClient
    Purchase --> ApiClient

    ApiClient -->|HTTPS / REST API| Routes
    Routes --> Controllers
    Controllers --> Services
    Services --> AuthLogic
    Services --> TransactionLogic
    Services --> RankingLogic
    Services --> PrismaClient
    PrismaClient --> DB

    DB --> UserTable
    DB --> BookTable
    DB --> TransactionTable
```

### 4.2 各層の責務分離

#### プレゼンテーション層

- デモアカウント画面を表示する
- プロフィール画面を表示する
- 検索画面を表示する
- 教科書投稿画面を表示する
- 教科書詳細画面を表示する
- 購入画面を表示する
- 仮想ポイント残高を表示する
- 商品ステータスを表示する
  - 出品中
  - 交渉中
  - 売却済み
  - 取り下げ
- APIへリクエストを送る
- APIから受け取った検索結果を画像付きで表示する

この層では、SQLやPrisma Clientを直接扱わない。  
DB操作は必ずExpress APIを経由する。

#### アプリケーション層

- デモ認証または仮想セッションを処理する
- 出品情報を受け取り、DBへ保存する
- 検索条件に応じてBookを検索する
- ユーザー情報に合わせて関連度を計算する
- 購入リクエストを作成する
- 購入者と出品者の双方承諾を確認する
- 双方承諾済みの場合だけ取引を成立させる
- 取引成立後、Bookのステータスを売却済みに更新する
- 完了画面用のレスポンスを返す
- 画面内デモ通知の処理を呼び出す

この層では、画面のHTMLやReactコンポーネントを扱わない。

#### データ層

- Userを保存する
- Bookを保存する
- Transactionを保存する
- 外部キーでユーザー、出品、取引の関係を保持する
- 承諾状態と取引状態の整合性を保つ
- 検索用インデックスを管理する

この層では、画面表示やUIの状態を直接扱わない。

### 4.3 入力・処理・出力の対応

#### 出品フロー

| 区分 | 内容 |
|---|---|
| input | 教科書のサンプル画像、仮想ポイント価格、説明、対象授業、使用年度、必須教材/参考書、学部、学科、対象学年 |
| logic | 入力内容を検証し、Bookとして保存する。出品者IDをseller_idに紐づける |
| output | 出品完了画面を表示し、教科書詳細画面へ遷移できるようにする |

#### 検索フロー

| 区分 | 内容 |
|---|---|
| input | 教科書名、対象授業、学部、学科、学年、参考書か必須教材か、年度 |
| logic | Bookテーブルから条件に応じて検索する。ユーザー属性と一致する項目を用いて関連度順に並べる |
| output | 検索結果を画像、価格、授業名、使用年度、ステータスとともに表示する |

#### 購入フロー

| 区分 | 内容 |
|---|---|
| input | 購入リクエスト、対象Book ID、購入者ID、仮想ポイント価格、承諾操作 |
| logic | Transactionを作成し、購入者・出品者の承諾フラグを確認する。双方承諾済みの場合だけ取引成立にする |
| output | 購入完了画面を表示し、画面内デモ通知を作成する |

### 4.4 3層間の処理イメージ

```text
       【フロントエンド】             【バックエンド】             【データベース】
      （ブラウザ・画面）           （サーバー・頭脳）           （倉庫・保管場所）
             |                            |                            |
  [出品] ----|---(情報の送信)----------> |                            |
             |                            | --- (保存) --------------> | [Book]
             |                            |                            |
  [検索] ----|---(条件を送信)----------> |                            |
             |                            | --- (検索実行) ----------> | [Book/User]
             | <---(結果を返す)--------- |                            |
             |                            |                            |
  [購入] ----|---(リクエスト送信)------> |                            |
             |                            | --- (作成・状態更新) ----> | [Transaction/Book]
             | <---(完了を表示)--------- |                            |
```

---

## 5. システム構成

### 5.1 論理構成

```mermaid
flowchart LR
    Browser[Browser]
    Frontend[Next.js App on Render]
    Backend[Express API on Render]
    Database[(MySQL on Render)]

    Browser -->|HTTPS| Frontend
    Frontend -->|HTTPS / REST| Backend
    Backend -->|Prisma / MySQL Protocol| Database
```

### 5.2 Render上のサービス構成

| サービス名 | 種別 | 技術 | 役割 | 公開範囲 |
|---|---|---|---|---|
| `keio-book-frontend` | Web Service または Static Site | Next.js | 画面配信 | Public |
| `keio-book-api` | Web Service | Node.js / Express / Prisma | API提供 | Public |
| `keio-book-mysql` | Web Service + Persistent Disk または MySQL Template | MySQL | データ保存 | Private推奨 |

### 5.3 ディレクトリ構成案

```text
project-root/
├── frontend/
│   ├── app/
│   │   ├── page.tsx
│   │   ├── layout.tsx
│   │   ├── register/
│   │   │   └── page.tsx
│   │   ├── profile/
│   │   │   └── page.tsx
│   │   ├── books/
│   │   │   ├── page.tsx
│   │   │   ├── new/
│   │   │   │   └── page.tsx
│   │   │   └── [id]/
│   │   │       └── page.tsx
│   │   ├── search/
│   │   │   └── page.tsx
│   │   └── transactions/
│   │       └── [id]/
│   │           └── page.tsx
│   ├── components/
│   │   ├── BookCard.tsx
│   │   ├── BookForm.tsx
│   │   ├── SearchForm.tsx
│   │   ├── PurchaseButton.tsx
│   │   └── TransactionStatus.tsx
│   ├── lib/
│   │   └── api.ts
│   ├── types/
│   │   ├── book.ts
│   │   ├── user.ts
│   │   └── transaction.ts
│   ├── package.json
│   └── next.config.ts
│
├── backend/
│   ├── prisma/
│   │   └── schema.prisma
│   ├── src/
│   │   ├── server.ts
│   │   ├── app.ts
│   │   ├── routes/
│   │   │   ├── authRoutes.ts
│   │   │   ├── bookRoutes.ts
│   │   │   └── transactionRoutes.ts
│   │   ├── controllers/
│   │   │   ├── authController.ts
│   │   │   ├── bookController.ts
│   │   │   └── transactionController.ts
│   │   ├── services/
│   │   │   ├── authService.ts
│   │   │   ├── bookService.ts
│   │   │   ├── rankingService.ts
│   │   │   └── transactionService.ts
│   │   ├── repositories/
│   │   │   ├── bookRepository.ts
│   │   │   ├── userRepository.ts
│   │   │   └── transactionRepository.ts
│   │   ├── middlewares/
│   │   │   ├── authMiddleware.ts
│   │   │   ├── errorHandler.ts
│   │   │   └── validateRequest.ts
│   │   └── lib/
│   │       └── prisma.ts
│   ├── package.json
│   └── .env.example
│
├── database/
│   ├── seed.sql
│   └── notes.md
│
├── docs/
│   └── design.md
│
└── README.md
```

---

## 6. 機能要件

### 6.1 機能一覧

| 機能ID | 機能名 | 概要 | 利用者 | 優先度 |
|---|---|---|---|---|
| F-001 | デモアカウント利用開始 | デモユーザーまたは仮想セッションで利用を開始する | 慶應生想定ユーザー | 高 |
| F-002 | デモプロフィール表示・編集 | ニックネーム、学部、学科、学年、デモアイコン、仮想ポイント残高を表示・編集する | 慶應生想定ユーザー | 中 |
| F-003 | 教科書出品 | 写真、価格、説明、授業名、使用年度などを登録する | 出品者 | 高 |
| F-004 | 教科書一覧表示 | 出品中の教科書を一覧表示する | 慶應生想定ユーザー | 高 |
| F-005 | 教科書検索 | 教科書名、授業、学部、学科、学年、年度、教材種別で検索する | 慶應生想定ユーザー | 高 |
| F-006 | 教科書詳細表示 | 出品情報、写真、価格、使用授業、使用年度、ステータスを表示する | 慶應生想定ユーザー | 高 |
| F-007 | 購入リクエスト | 購入希望者が出品者へ購入リクエストを送る | 購入者 | 高 |
| F-008 | 取引承諾 | 購入者・出品者が取引を承諾する | 購入者 / 出品者 | 高 |
| F-009 | 取引成立判定 | 双方承諾済みの場合のみ取引を成立させる | システム | 高 |
| F-010 | ステータス管理 | 出品中、交渉中、売却済み、取り下げを管理する | システム / 出品者 | 高 |
| F-011 | コメント対応 | 値下げ相談などのコメントを扱う | 購入者 / 出品者 | 中 |
| F-012 | 関連度ランキング | ユーザー情報や検索条件に応じて関連度順に表示する | システム | 中 |
| F-013 | デモ通知表示 | 取引成立後に購入者・出品者へ画面内のデモ通知を表示する | システム | 低 |
| F-014 | 仮想ポイント残高表示 | デモ用の仮想ポイント残高を表示する | 慶應生想定ユーザー | 中 |

### 6.2 ユースケース

#### UC-001: 教科書を検索する

| 項目 | 内容 |
|---|---|
| アクター | 慶應生想定ユーザー |
| 事前条件 | デモセッションが有効である |
| 基本フロー | 1. 検索画面を開く<br>2. 教科書名、授業名、学部、学科、学年、年度、必須教材/参考書を入力する<br>3. Next.jsがExpress APIへ検索条件を送信する<br>4. ExpressがPrisma経由でMySQLを検索する<br>5. ユーザー属性との関連度を計算する<br>6. 検索結果を画像付きで表示する |
| 代替フロー | 検索結果が0件の場合、0件メッセージを表示する |
| 例外フロー | APIエラー時、エラーメッセージを表示する |

#### UC-002: 教科書を出品する

| 項目 | 内容 |
|---|---|
| アクター | 出品者 |
| 事前条件 | デモセッションが有効である |
| 基本フロー | 1. 教科書投稿画面を開く<br>2. 写真、価格、説明、対象授業、使用年度、学部、学科、学年を入力する<br>3. 出品ボタンを押す<br>4. Express APIが入力値を検証する<br>5. BookとしてMySQLに保存する<br>6. 出品完了画面を表示する |
| 代替フロー | 写真がない場合、画像なし表示で登録する |
| 例外フロー | 価格が不正、必須項目が空の場合、400エラーを返す |

#### UC-003: 購入リクエストを送る

| 項目 | 内容 |
|---|---|
| アクター | 購入者 |
| 事前条件 | デモセッションが有効で、対象Bookが出品中である |
| 基本フロー | 1. 教科書詳細画面を開く<br>2. 購入リクエストボタンを押す<br>3. Express APIがTransactionを作成する<br>4. Bookの状態を交渉中に更新する<br>5. 購入リクエスト完了画面を表示する |
| 代替フロー | すでに交渉中の場合、既存Transactionを表示する |
| 例外フロー | 自分の出品物を購入しようとした場合、400エラーを返す |

#### UC-004: 双方承諾で取引を成立させる

| 項目 | 内容 |
|---|---|
| アクター | 購入者 / 出品者 |
| 事前条件 | Transactionが作成済みである |
| 基本フロー | 1. 取引画面を開く<br>2. 購入者または出品者が承諾ボタンを押す<br>3. Express APIが該当する承諾フラグを更新する<br>4. buyer_approvedとseller_approvedを確認する<br>5. 両方trueならTransactionをCOMPLETEDにする<br>6. BookをSOLDにする<br>7. 仮想ポイントを更新する<br>8. 完了画面と画面内デモ通知を表示する |
| 代替フロー | 片方だけ承諾済みの場合、PENDING状態を維持する |
| 例外フロー | 関係のないユーザーが承諾しようとした場合、403エラーを返す |

---

## 7. 非機能要件

| 区分 | 要件 |
|---|---|
| 可用性 | Render上で常時アクセス可能な構成を目標とする |
| 性能 | 通常検索は2秒以内の応答を目標とする |
| セキュリティ | デモ認証・仮想セッションで利用者ロールを制限し、実在個人情報や実決済情報は扱わない |
| 保守性 | 3層構造により、画面・API・DBを分離する |
| 拡張性 | User / Book / Transactionを中心にしつつ、Comment、Lesson、BookImage、Categoryへ拡張できる設計にする |
| 可観測性 | Render LogsでAPIエラー、DB接続エラー、認証エラーを確認できるようにする |
| データ整合性 | Transaction成立時にBookステータス更新を同一トランザクションで処理する |
| 個人情報保護 | 実在する氏名、メールアドレス、電話番号、住所、学生証番号、本人確認書類、カード情報は保存せず、必要な項目は架空デモデータとして保存する。架空データも実個人情報と同等に保護する |
| 秘密情報管理 | DB接続情報や認証シークレットを環境変数で管理する |
| バックアップ | デモデータの永続化・スナップショット・リセット方針を定義する |

---

## 8. 画面設計

### 8.1 画面一覧

| 画面ID | 画面名 | URL | 概要 |
|---|---|---|---|
| UI-001 | トップページ | `/` | アプリ概要、検索導線、出品導線を表示 |
| UI-002 | デモアカウント画面 | `/register` | デモユーザーまたは仮想セッションで利用を開始する |
| UI-003 | プロフィール画面 | `/profile` | ニックネーム、学部、学科、学年、デモアイコン、仮想ポイント残高を表示する |
| UI-004 | 教科書一覧画面 | `/books` | 出品中の教科書を一覧表示する |
| UI-005 | 検索画面 | `/search` | 教科書名、授業、学部、学科、学年、年度で検索する |
| UI-006 | 教科書投稿画面 | `/books/new` | 教科書を出品する |
| UI-007 | 教科書詳細画面 | `/books/[id]` | 教科書の詳細、写真、価格、出品者、使用授業を表示する |
| UI-008 | 購入画面 | `/transactions/[id]` | 購入リクエスト、承諾状態、成立状態を表示する |
| UI-009 | 購入完了画面 | `/transactions/[id]/complete` | 取引成立後の完了表示を行う |

### 8.2 画面遷移図

```mermaid
flowchart LR
    Top[トップページ]
    Register[デモアカウント]
    Profile[プロフィール]
    Books[教科書一覧]
    Search[検索画面]
    NewBook[教科書投稿]
    Detail[教科書詳細]
    Transaction[購入・承諾画面]
    Complete[購入完了画面]

    Top --> Register
    Top --> Books
    Top --> Search
    Register --> Profile
    Profile --> Books
    Books --> Detail
    Search --> Detail
    Books --> NewBook
    NewBook --> Detail
    Detail --> Transaction
    Transaction --> Complete
```

### 8.3 画面項目定義

#### UI-002: デモアカウント画面

| 項目名 | 種別 | 必須 | 説明 |
|---|---|---|---|
| デモユーザー | select/text | ✓ | 実在メールアドレスを使わない仮想ユーザー |
| ニックネーム | text | ✓ | 個人を特定しない表示名 |
| 架空メール | text/email | - | `demo+001@example.test` などの架空メール。実在メールは保存しない |
| 架空電話番号 | text | - | `000-0000-0000` などのデモ用番号。実在電話番号は保存しない |
| 架空住所 | text | - | デモ用住所。実在住所は保存しない |
| 架空学生証番号 | text | - | デモ用学生証番号。実在学生証番号は保存しない |
| 架空本人確認書類 | select/file-ref | - | サンプル画像またはダミーメタデータ。実本人確認書類は保存しない |
| 学年 | select | ✓ | 1年、2年、3年、4年、院生など |
| 学部 | select | ✓ | 文、経済、法、商、理工など |
| 学科 | text/select | - | 学科または専攻 |
| アイコン | select/url | - | デモ用アイコン。個人写真のアップロードは求めない |

#### UI-005: 検索画面

| 項目名 | 種別 | 必須 | 説明 |
|---|---|---|---|
| キーワード | text | - | 教科書名・授業名の検索 |
| 学部 | select | - | 使用学部 |
| 学科 | select | - | 使用学科 |
| 学年 | select | - | 対象学年 |
| 年度 | select/input | - | 使用年度 |
| 教材種別 | select | - | 必須教材 / 参考書 |
| 検索ボタン | button | - | 検索APIを呼び出す |

#### UI-006: 教科書投稿画面

| 項目名 | 種別 | 必須 | 説明 |
|---|---|---|---|
| 教科書名 | text | ✓ | 出品する教科書名 |
| 写真 | file/url | - | 教科書画像 |
| 金額 | number | ✓ | 仮想ポイント価格。0ポイントの場合は譲渡扱い |
| 説明 | textarea | - | 書き込み、汚れ、版、注意事項など |
| 対象授業 | text | ✓ | どの授業で使われたか |
| 使用年度 | number/select | ✓ | 使用した年度 |
| 学部 | select | - | 対象学部 |
| 学科 | select | - | 対象学科 |
| 対象学年 | select | - | 対象学年 |
| 教材種別 | select | - | 必須教材 / 参考書 |
| カテゴリ | select | - | 語学、一般教養、専門科目など |
| 出品ボタン | button | - | POST `/books`を呼び出す |

#### UI-007: 教科書詳細画面

| 項目名 | 種別 | 必須 | 説明 |
|---|---|---|---|
| 教科書画像 | image | - | 登録された写真を表示 |
| 教科書名 | text | - | タイトル |
| 価格 | text | - | 仮想ポイント価格 |
| ステータス | badge | - | 出品中 / 交渉中 / 売却済み |
| 使用授業 | text | - | 授業名 |
| 使用年度 | text | - | 年度 |
| 出品者 | text | - | 出品者名 |
| 購入リクエストボタン | button | - | POST `/transactions`を呼び出し、仮想ポイント取引を開始する |
| コメント欄 | textarea/list | - | 値下げ相談など。MVPでは簡易メモ、拡張時にCommentテーブル化 |

---

## 9. API設計

### 9.1 API共通仕様

| 項目 | 内容 |
|---|---|
| ベースURL | `https://〇〇-api.onrender.com/api` |
| 通信形式 | HTTPS |
| データ形式 | JSON |
| 認証方式 | デモ認証または仮想セッション。本番の大学認証や実在メール確認には接続しない |
| 文字コード | UTF-8 |

### 9.2 レスポンス形式

#### 成功時

```json
{
  "success": true,
  "data": {},
  "message": "success"
}
```

#### 失敗時

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "入力値が不正です"
  }
}
```

### 9.3 API一覧

| API ID | メソッド | エンドポイント | 概要 | 対応機能 |
|---|---|---|---|---|
| API-001 | POST | `/api/auth/register` | デモアカウント利用開始 | F-001 |
| API-002 | GET | `/api/users/me` | 自分のプロフィール取得 | F-002 |
| API-003 | PATCH | `/api/users/me` | 自分のプロフィール更新 | F-002 |
| API-004 | GET | `/api/books` | 教科書一覧・検索 | F-004 / F-005 |
| API-005 | GET | `/api/books/:id` | 教科書詳細取得 | F-006 |
| API-006 | POST | `/api/books` | 教科書を出品する | F-003 |
| API-007 | PATCH | `/api/books/:id` | 教科書情報・価格・ステータスを更新する | F-003 / F-010 |
| API-008 | DELETE | `/api/books/:id` | 出品を取り消す | F-010 |
| API-009 | POST | `/api/transactions` | 購入リクエストを送る | F-007 |
| API-010 | GET | `/api/transactions/:id` | 取引状態を取得する | F-008 |
| API-011 | PATCH | `/api/transactions/:id` | 取引を承諾・更新する | F-008 / F-009 |

### 9.4 API詳細

#### API-004: 教科書一覧・検索

| 項目 | 内容 |
|---|---|
| メソッド | GET |
| パス | `/api/books` |
| 認証 | 必要 |
| 概要 | 条件に一致する教科書を検索し、関連度順に返す |

##### クエリ例

```text
GET /api/books?q=経済学&faculty=経済学部&year=1&usedYear=2025&materialType=REQUIRED
```

##### クエリパラメータ

| パラメータ | 型 | 必須 | 説明 |
|---|---|---|---|
| q | string | - | 教科書名・授業名のキーワード |
| faculty | string | - | 学部 |
| department | string | - | 学科 |
| year | number | - | 対象学年 |
| usedYear | number | - | 使用年度 |
| materialType | string | - | `REQUIRED`または`REFERENCE` |
| category | string | - | カテゴリ |
| status | string | - | `AVAILABLE`など |

##### レスポンス例

```json
{
  "success": true,
  "data": [
    {
      "bookId": 1,
      "title": "経済学入門",
      "price": 1200,
      "imageUrl": "https://example.com/book.jpg",
      "usedLesson": "経済学 I",
      "usedYear": 2025,
      "status": "AVAILABLE",
      "relatedScore": 87
    }
  ],
  "message": "success"
}
```

#### API-006: 教科書を出品する

| 項目 | 内容 |
|---|---|
| メソッド | POST |
| パス | `/api/books` |
| 認証 | 必要 |
| 概要 | 教科書の出品情報をBookとして登録する |

##### リクエスト例

```json
{
  "title": "経済学入門",
  "price": 1200,
  "description": "2025年度の経済学Iで使用。書き込み少なめ。",
  "imageUrl": "https://example.com/book.jpg",
  "usedLesson": "経済学 I",
  "usedYear": 2025,
  "usedFaculty": "経済学部",
  "usedDepartment": "経済学科",
  "targetYear": 1,
  "materialType": "REQUIRED",
  "category": "専門科目"
}
```

##### バリデーション

| 項目 | 条件 |
|---|---|
| title | 必須、最大255文字 |
| price | 必須、0以上の整数。仮想ポイント価格として扱う |
| usedLesson | 必須、最大255文字 |
| usedYear | 必須、2000以上の整数 |
| imageUrl | 任意、URL形式 |
| materialType | `REQUIRED`または`REFERENCE` |
| category | 任意、最大100文字 |

#### API-009: 購入リクエストを送る

| 項目 | 内容 |
|---|---|
| メソッド | POST |
| パス | `/api/transactions` |
| 認証 | 必要 |
| 概要 | 購入者がBookに対して購入リクエストを送る |

##### リクエスト例

```json
{
  "bookId": 1,
  "offeredPrice": 1200,
  "message": "購入希望です。日吉キャンパスで受け渡し可能です。"
}
```

##### 主な処理

1. デモセッションのユーザーをbuyer_idとして取得する。
2. 対象Bookを取得する。
3. Bookのstatusが`AVAILABLE`であることを確認する。
4. 自分自身の出品でないことを確認する。
5. Transactionを`PENDING`として作成する。
6. Bookのstatusを`NEGOTIATING`に更新する。
7. この時点では実決済も仮想ポイント移動も行わない。

#### API-011: 取引を承諾・更新する

| 項目 | 内容 |
|---|---|
| メソッド | PATCH |
| パス | `/api/transactions/:id` |
| 認証 | 必要 |
| 概要 | 購入者または出品者が取引を承諾し、双方承諾済みなら取引を成立させる |

##### リクエスト例

```json
{
  "action": "APPROVE"
}
```

##### 主な処理

1. Transactionを取得する。
2. デモセッションのユーザーがbuyerまたはsellerであることを確認する。
3. buyerなら`buyerApproved = true`にする。
4. sellerなら`sellerApproved = true`にする。
5. 更新後、`buyerApproved === true && sellerApproved === true`を確認する。
6. 両方trueの場合、Transactionを`COMPLETED`にする。
7. Bookを`SOLD`にする。
8. 仮想ポイント残高を更新する。
9. 画面内のデモ通知を作成する。
10. 完了画面用のレスポンスを返す。

---

## 10. データベース設計

### 10.1 ER図

MVPでは、User、Book、Transactionの3テーブルを中心にする。

```mermaid
erDiagram
    User ||--o{ Book : sells
    User ||--o{ Transaction : buys
    Book ||--o{ Transaction : has

    User {
        int id PK
        string demoUserKey
        string nickname
        string dummyEmail
        string dummyPhone
        string dummyAddress
        string dummyStudentId
        string dummyIdentityDocumentRef
        int year
        string faculty
        string department
        string iconUrl
        int pointBalance
        datetime createdAt
        datetime updatedAt
    }

    Book {
        int id PK
        string title
        int price
        string description
        string imageUrl
        int sellerId FK
        string status
        int usedYear
        string usedLesson
        string usedFaculty
        string usedDepartment
        int targetYear
        string materialType
        string category
        datetime createdAt
        datetime updatedAt
    }

    Transaction {
        int id PK
        int bookId FK
        int buyerId FK
        int sellerId FK
        int offeredPrice
        boolean sellerApproved
        boolean buyerApproved
        string status
        datetime createdAt
        datetime updatedAt
        datetime completedAt
    }
```

### 10.2 テーブル一覧

| テーブル名 | 概要 |
|---|---|
| User | デモユーザー情報 |
| Book | 出品された教科書情報 |
| Transaction | 教科書の購入リクエスト・承諾状態・取引状態 |

### 10.3 テーブル定義

#### User

| カラム名 | 型 | PK | FK | NOT NULL | UNIQUE | 説明 |
|---|---|---|---|---|---|---|
| id | INT AUTO_INCREMENT | ✓ | - | ✓ | ✓ | ユーザーID |
| demo_user_key | VARCHAR(100) | - | - | ✓ | ✓ | デモ用ユーザー識別子。実在メールアドレスは使わない |
| nickname | VARCHAR(100) | - | - | ✓ | - | 個人を特定しない表示名 |
| dummy_email | VARCHAR(255) | - | - | - | - | 架空メールアドレス。実在メールアドレスは保存しない |
| dummy_phone | VARCHAR(50) | - | - | - | - | 架空電話番号。実在電話番号は保存しない |
| dummy_address | VARCHAR(255) | - | - | - | - | 架空住所。実在住所は保存しない |
| dummy_student_id | VARCHAR(100) | - | - | - | - | 架空学生証番号。実在学生証番号は保存しない |
| dummy_identity_document_ref | VARCHAR(255) | - | - | - | - | 架空本人確認書類データへの参照。実本人確認書類は保存しない |
| year | INT | - | - | - | - | 学年 |
| faculty | VARCHAR(100) | - | - | - | - | 学部 |
| department | VARCHAR(100) | - | - | - | - | 学科 |
| icon_url | VARCHAR(1000) | - | - | - | - | デモ用アイコン画像URL |
| point_balance | INT | - | - | ✓ | - | デモ用仮想ポイント残高 |
| created_at | DATETIME | - | - | ✓ | - | 作成日時 |
| updated_at | DATETIME | - | - | ✓ | - | 更新日時 |

#### Book

| カラム名 | 型 | PK | FK | NOT NULL | UNIQUE | 説明 |
|---|---|---|---|---|---|---|
| id | INT AUTO_INCREMENT | ✓ | - | ✓ | ✓ | 教科書ID |
| title | VARCHAR(255) | - | - | ✓ | - | 教科書名 |
| price | INT | - | - | ✓ | - | 仮想ポイント価格。実通貨として扱わない |
| description | TEXT | - | - | - | - | 内容、対象授業、状態など |
| image_url | VARCHAR(1000) | - | - | - | - | 写真の保存先URL |
| seller_id | INT | - | User.id | ✓ | - | 出品したユーザーID |
| status | VARCHAR(50) | - | - | ✓ | - | `AVAILABLE` / `NEGOTIATING` / `SOLD` / `CANCELLED` |
| used_year | INT | - | - | ✓ | - | 使用年度 |
| used_lesson | VARCHAR(255) | - | - | ✓ | - | 使用授業 |
| used_faculty | VARCHAR(100) | - | - | - | - | 使用学部 |
| used_department | VARCHAR(100) | - | - | - | - | 使用学科 |
| target_year | INT | - | - | - | - | 対象学年 |
| material_type | VARCHAR(50) | - | - | - | - | `REQUIRED` / `REFERENCE` |
| category | VARCHAR(100) | - | - | - | - | カテゴリ |
| created_at | DATETIME | - | - | ✓ | - | 作成日時 |
| updated_at | DATETIME | - | - | ✓ | - | 更新日時 |

#### Transaction

| カラム名 | 型 | PK | FK | NOT NULL | UNIQUE | 説明 |
|---|---|---|---|---|---|---|
| id | INT AUTO_INCREMENT | ✓ | - | ✓ | ✓ | 取引ID |
| book_id | INT | - | Book.id | ✓ | - | 対象教科書ID |
| buyer_id | INT | - | User.id | ✓ | - | 購入希望者ID |
| seller_id | INT | - | User.id | ✓ | - | 出品者ID |
| offered_price | INT | - | - | ✓ | - | 購入希望ポイント数。実通貨として扱わない |
| seller_approved | BOOLEAN | - | - | ✓ | - | 出品者が承諾したか |
| buyer_approved | BOOLEAN | - | - | ✓ | - | 購入者が承諾したか |
| status | VARCHAR(50) | - | - | ✓ | - | `PENDING` / `COMPLETED` / `CANCELLED` |
| message | TEXT | - | - | - | - | 購入リクエストや相談内容 |
| created_at | DATETIME | - | - | ✓ | - | 取引開始日時 |
| updated_at | DATETIME | - | - | ✓ | - | 更新日時 |
| completed_at | DATETIME | - | - | - | - | 取引成立日時 |

### 10.4 Prisma Schema例

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

model User {
  id           Int      @id @default(autoincrement())
  demoUserKey  String   @unique @map("demo_user_key") @db.VarChar(100)
  nickname     String   @db.VarChar(100)
  dummyEmail   String?  @map("dummy_email") @db.VarChar(255)
  dummyPhone   String?  @map("dummy_phone") @db.VarChar(50)
  dummyAddress String?  @map("dummy_address") @db.VarChar(255)
  dummyStudentId String? @map("dummy_student_id") @db.VarChar(100)
  dummyIdentityDocumentRef String? @map("dummy_identity_document_ref") @db.VarChar(255)
  year         Int?
  faculty      String?  @db.VarChar(100)
  department   String?  @db.VarChar(100)
  iconUrl      String?  @map("icon_url") @db.VarChar(1000)
  pointBalance Int      @default(0) @map("point_balance")
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  books        Book[]   @relation("SellerBooks")
  purchases    Transaction[] @relation("BuyerTransactions")
  sales        Transaction[] @relation("SellerTransactions")

  @@map("users")
}

model Book {
  id             Int      @id @default(autoincrement())
  title          String   @db.VarChar(255)
  price          Int
  description    String?  @db.Text
  imageUrl       String?  @map("image_url") @db.VarChar(1000)
  sellerId       Int      @map("seller_id")
  status         BookStatus @default(AVAILABLE)
  usedYear       Int      @map("used_year")
  usedLesson     String   @map("used_lesson") @db.VarChar(255)
  usedFaculty    String?  @map("used_faculty") @db.VarChar(100)
  usedDepartment String?  @map("used_department") @db.VarChar(100)
  targetYear     Int?     @map("target_year")
  materialType   MaterialType? @map("material_type")
  category       String?  @db.VarChar(100)
  createdAt      DateTime @default(now()) @map("created_at")
  updatedAt      DateTime @updatedAt @map("updated_at")

  seller       User @relation("SellerBooks", fields: [sellerId], references: [id])
  transactions Transaction[]

  @@index([sellerId])
  @@index([status])
  @@index([usedYear])
  @@index([usedLesson])
  @@index([usedFaculty])
  @@index([usedDepartment])
  @@index([targetYear])
  @@map("books")
}

model Transaction {
  id              Int      @id @default(autoincrement())
  bookId          Int      @map("book_id")
  buyerId         Int      @map("buyer_id")
  sellerId        Int      @map("seller_id")
  offeredPrice    Int      @map("offered_price")
  sellerApproved  Boolean  @default(false) @map("seller_approved")
  buyerApproved   Boolean  @default(false) @map("buyer_approved")
  status          TransactionStatus @default(PENDING)
  message         String?  @db.Text
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")
  completedAt     DateTime? @map("completed_at")

  book   Book @relation(fields: [bookId], references: [id])
  buyer  User @relation("BuyerTransactions", fields: [buyerId], references: [id])
  seller User @relation("SellerTransactions", fields: [sellerId], references: [id])

  @@index([bookId])
  @@index([buyerId])
  @@index([sellerId])
  @@index([status])
  @@map("transactions")
}

enum BookStatus {
  AVAILABLE
  NEGOTIATING
  SOLD
  CANCELLED
}

enum TransactionStatus {
  PENDING
  COMPLETED
  CANCELLED
}

enum MaterialType {
  REQUIRED
  REFERENCE
}
```

### 10.5 インデックス設計

| テーブル | インデックス名 | カラム | 目的 |
|---|---|---|---|
| users | unique_users_demo_user_key | demo_user_key | デモユーザー識別子の重複防止 |
| books | idx_books_seller_id | seller_id | ユーザー別出品一覧 |
| books | idx_books_status | status | 出品中のみの一覧表示 |
| books | idx_books_used_year | used_year | 使用年度検索 |
| books | idx_books_used_lesson | used_lesson | 授業名検索 |
| books | idx_books_used_faculty | used_faculty | 学部検索 |
| books | idx_books_used_department | used_department | 学科検索 |
| books | idx_books_target_year | target_year | 対象学年検索 |
| transactions | idx_transactions_book_id | book_id | 教科書別取引確認 |
| transactions | idx_transactions_buyer_id | buyer_id | 購入者別取引一覧 |
| transactions | idx_transactions_seller_id | seller_id | 出品者別取引一覧 |
| transactions | idx_transactions_status | status | 取引状態検索 |

### 10.6 拡張用テーブル候補

MVPはUser、Book、Transactionの3テーブルで開始する。  
ただし、機能拡張時は以下のテーブルを追加できる設計にしておく。

| テーブル名 | 目的 | 追加する理由 |
|---|---|---|
| Comment | 値下げ相談や質問コメント | BookやTransactionに複数コメントを紐づけるため |
| Lesson | 授業名、担当教員、年度、学部、学科の正規化 | 授業と教科書の対応をより正確に扱うため |
| BookImage | 複数枚の写真投稿 | 表紙、書き込み、汚れなどを複数画像で見せるため |
| Category | カテゴリ管理 | 語学、専門科目、一般教養などをマスタ化するため |
| Review | 取引後評価 | 安心して取引できるユーザー評価を作るため |
| Notification | 通知管理 | 承諾、コメント、取引成立を通知するため |

---

## 11. バックエンド設計

### 11.1 Express + Prisma構成

```text
backend/src/
├── server.ts
├── app.ts
├── routes/
│   ├── authRoutes.ts
│   ├── bookRoutes.ts
│   └── transactionRoutes.ts
├── controllers/
│   ├── authController.ts
│   ├── bookController.ts
│   └── transactionController.ts
├── services/
│   ├── authService.ts
│   ├── bookService.ts
│   ├── rankingService.ts
│   └── transactionService.ts
├── repositories/
│   ├── userRepository.ts
│   ├── bookRepository.ts
│   └── transactionRepository.ts
├── middlewares/
│   ├── authMiddleware.ts
│   ├── errorHandler.ts
│   └── validateRequest.ts
└── lib/
    └── prisma.ts
```

### 11.2 MVCとの対応

| MVC | 本設計での対応 | 内容 |
|---|---|---|
| Model | Prisma Model / Repository | User、Book、TransactionをDBとして扱う |
| View | Next.js Page / Component | 検索画面、投稿画面、購入画面など |
| Controller | Express Controller | HTTPリクエストを受け取り、Serviceを呼び出す |

本設計は、MVCを3層構造に対応させると以下のように整理できる。

- View: プレゼンテーション層
- Controller: アプリケーション層の入口
- Model: データ層およびPrisma Model

### 11.3 処理の流れ

```mermaid
sequenceDiagram
    participant Browser as Browser
    participant Next as Next.js
    participant API as Express API
    participant Service as TransactionService
    participant Prisma as Prisma
    participant DB as MySQL

    Browser->>Next: 承諾ボタンを押す
    Next->>API: PATCH /api/transactions/:id
    API->>API: 認証・認可確認
    API->>Service: approveTransaction(transactionId, userId)
    Service->>Prisma: Transaction取得
    Prisma->>DB: SELECT transaction
    DB-->>Prisma: transaction
    Prisma-->>Service: transaction
    Service->>Service: buyer/seller判定
    Service->>Prisma: 承諾フラグ更新
    Prisma->>DB: UPDATE transaction
    Service->>Service: buyerApproved && sellerApproved を確認
    alt 双方承諾済み
        Service->>Prisma: Transaction COMPLETED / Book SOLD
        Prisma->>DB: UPDATE transaction, book
        Service-->>API: completed
    else 片方のみ承諾済み
        Service-->>API: pending
    end
    API-->>Next: JSON
    Next-->>Browser: 状態表示
```

### 11.4 取引成立ロジック

購入者と出品者の双方が承諾したときだけ、Transactionを`COMPLETED`にし、Bookを`SOLD`にする。  
この処理は、途中で片方だけ更新されないようにDBトランザクション内で実行する。

#### 疑似コード

```ts
async function approveTransaction(transactionId: number, currentUserId: number) {
  return prisma.$transaction(async (tx) => {
    const transaction = await tx.transaction.findUnique({
      where: { id: transactionId },
      include: { book: true },
    });

    if (!transaction) {
      throw new Error("TRANSACTION_NOT_FOUND");
    }

    if (transaction.status !== "PENDING") {
      throw new Error("TRANSACTION_ALREADY_CLOSED");
    }

    if (
      currentUserId !== transaction.buyerId &&
      currentUserId !== transaction.sellerId
    ) {
      throw new Error("FORBIDDEN");
    }

    const nextBuyerApproved =
      currentUserId === transaction.buyerId
        ? true
        : transaction.buyerApproved;

    const nextSellerApproved =
      currentUserId === transaction.sellerId
        ? true
        : transaction.sellerApproved;

    const shouldComplete = nextBuyerApproved && nextSellerApproved;

    const updatedTransaction = await tx.transaction.update({
      where: { id: transactionId },
      data: {
        buyerApproved: nextBuyerApproved,
        sellerApproved: nextSellerApproved,
        status: shouldComplete ? "COMPLETED" : "PENDING",
        completedAt: shouldComplete ? new Date() : null,
      },
    });

    if (shouldComplete) {
      await tx.book.update({
        where: { id: transaction.bookId },
        data: {
          status: "SOLD",
        },
      });
    }

    return updatedTransaction;
  });
}
```

### 11.5 関連度ランキングの考え方

検索結果は、単純な一致だけでなく、ユーザー情報との関連度を計算して並び替える。

| 条件 | 加点例 |
|---|---:|
| 教科書名にキーワードが含まれる | +40 |
| 授業名が一致する | +30 |
| 学部が一致する | +15 |
| 学科が一致する | +15 |
| 学年が一致する | +10 |
| 使用年度が新しい | +10 |
| 必須教材である | +5 |

#### 関連度計算の例

```ts
function calculateRelatedScore(book, user, query) {
  let score = 0;

  if (query.q && book.title.includes(query.q)) score += 40;
  if (query.q && book.usedLesson.includes(query.q)) score += 30;
  if (user.faculty && book.usedFaculty === user.faculty) score += 15;
  if (user.department && book.usedDepartment === user.department) score += 15;
  if (user.year && book.targetYear === user.year) score += 10;
  if (book.materialType === "REQUIRED") score += 5;

  return score;
}
```

---

## 12. フロントエンド設計

### 12.1 Next.js構成

```text
frontend/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── register/
│   │   └── page.tsx
│   ├── profile/
│   │   └── page.tsx
│   ├── books/
│   │   ├── page.tsx
│   │   ├── new/
│   │   │   └── page.tsx
│   │   └── [id]/
│   │       └── page.tsx
│   ├── search/
│   │   └── page.tsx
│   └── transactions/
│       ├── [id]/
│       │   └── page.tsx
│       └── [id]/
│           └── complete/
│               └── page.tsx
├── components/
│   ├── BookCard.tsx
│   ├── BookForm.tsx
│   ├── SearchForm.tsx
│   ├── TransactionStatus.tsx
│   ├── PurchaseButton.tsx
│   └── ApprovalButton.tsx
├── lib/
│   └── api.ts
└── types/
    ├── user.ts
    ├── book.ts
    └── transaction.ts
```

### 12.2 API呼び出し方針

- APIのURLは`NEXT_PUBLIC_API_BASE_URL`から取得する。
- SQLやPrisma Clientはフロントエンドに書かない。
- 検索条件はクエリパラメータとして送信する。
- POST/PATCH/DELETEは、成功時と失敗時の表示を明確に分ける。
- 購入リクエストや承諾ボタンは二重送信を防止する。
- ステータスに応じてボタン表示を切り替える。

### 12.3 主要コンポーネント

| コンポーネント | 役割 |
|---|---|
| BookCard | 検索結果の1件を表示する |
| SearchForm | 授業名、学部、学科、年度などの検索条件を入力する |
| BookForm | 教科書の出品フォーム |
| BookDetail | 教科書詳細表示 |
| PurchaseButton | 購入リクエストを送る |
| ApprovalButton | 取引承諾を行う |
| TransactionStatus | 取引状態、承諾状態、成立状態を表示する |

### 12.4 UI表示ルール

| 状態 | 表示 |
|---|---|
| AVAILABLE | 「出品中」バッジ、購入リクエストボタンを表示 |
| NEGOTIATING | 「交渉中」バッジ、関係者のみ取引画面へ誘導 |
| SOLD | 「売却済み」バッジ、購入リクエスト不可 |
| CANCELLED | 「取り下げ」バッジ、一覧には原則表示しない |
| Transaction PENDING | 双方承諾待ち表示 |
| Transaction COMPLETED | 購入完了表示 |
| Transaction CANCELLED | 取引キャンセル表示 |

---

## 13. セキュリティ設計

| 対策 | 内容 |
|---|---|
| デモ利用者制限 | デモ認証または仮想セッションにより、購入者・出品者・管理者ロールを制限する |
| 認証情報管理 | デモセッションシークレットや認証関連情報を環境変数で管理する |
| 認可 | Book更新は出品者のみ、Transaction承諾は購入者または出品者のみ許可する |
| SQLインジェクション対策 | Prismaを用い、文字列連結によるSQL生成を避ける |
| XSS対策 | ユーザー入力をHTMLとして直接描画しない |
| CORS制御 | `FRONTEND_ORIGIN`に一致するOriginのみ許可する |
| 画像投稿 | サンプル画像またはデモ用URLを基本とし、実写真アップロードを必須にしない。アップロードを入れる場合はファイル種類、サイズ、EXIF削除、保存先を制限する |
| エラー情報 | 本番環境では内部スタックトレースを返さない |
| 仮想ポイント管理 | 残高更新をDBトランザクション内で処理する。仮想ポイントは換金不可で、実通貨・決済手段と接続しない |
| 架空個人情報 | メール、電話番号、住所、学生証番号、本人確認書類が必要な画面では架空データを保存する。実在データは保存しない |
| 架空個人情報の保護 | 架空データであっても実個人情報と同等に扱い、認可、保存時暗号化、表示時マスキング、監査ログ、保存期間、削除手段を設計する |
| 支払い情報 | カード番号、有効期限、CVC、カード名義、決済トークン、銀行口座情報を入力・保存・送信しない |
| 外部サービス | メール、SMS、決済、本人確認、大学認証などの本番外部サービスへ接続しない。必要な場合はモックで代替する |

### 13.1 デモ認証について

本設計では、慶應生向けアプリの体験を確認するために、実在する keio.jp メールや大学認証基盤には接続しない。
外部に見せるデモでは、以下の方式で利用者ロールを表現する。

| 方式 | 内容 | 状態 |
|---|---|---|
| デモユーザー選択 | 用意済みの購入者・出品者・管理者ロールから選択する | MVP方針 |
| 仮想セッション | ランダムなデモセッションIDでログイン風の状態を管理する | MVP方針 |
| モック認証API | 本番認証に似たレスポンス形式を返すが、外部認証には接続しない | 拡張候補 |

本番の大学認証、実在メール確認、実学生証アップロード、実本人確認書類アップロードは実装しない。
学生証番号や本人確認書類が必要な体験は、架空番号、サンプル画像、ダミーメタデータを保存して表現する。
ただし、認可チェック、セッション期限、CSRF対策、ロール制御、エラー応答は本番に近い設計にする。

### 13.2 デモ決済・仮想ポイントについて

支払い画面は実サービスに近い見た目にしてよいが、入力できるのは仮想ポイントの利用確認だけにする。
クレジットカード、銀行口座、電子決済、決済代行サービス、送金リンク、外部決済URLは扱わない。

| 項目 | 方針 |
|---|---|
| 価格表示 | `円`表記に見せる場合でも内部的には仮想ポイントとして扱う |
| 支払い操作 | 仮想ポイントの減算・加算だけを行う |
| 換金性 | 仮想ポイントは換金不可、返金不可、現金価値なしと明示する |
| 入力フォーム | カード番号、CVC、有効期限、名義、住所、電話番号を入力させない |
| ログ | 支払い風操作の結果だけを記録し、決済情報や個人情報は記録しない |

---

## 14. エラー設計

### 14.1 エラーコード一覧

| コード | HTTPステータス | 意味 |
|---|---:|---|
| `VALIDATION_ERROR` | 400 | 入力値が不正 |
| `AUTH_REQUIRED` | 401 | デモセッションが必要 |
| `INVALID_DEMO_USER` | 400 | デモユーザーまたは仮想セッションが不正 |
| `PAYMENT_METHOD_NOT_ALLOWED` | 400 | 実決済手段の入力・利用は不可 |
| `REAL_PERSONAL_DATA_NOT_ALLOWED` | 400 | 実在する個人情報は保存不可 |
| `UNAUTHORIZED` | 401 | 認証が必要 |
| `FORBIDDEN` | 403 | 権限不足 |
| `NOT_FOUND` | 404 | 対象データが存在しない |
| `BOOK_NOT_AVAILABLE` | 409 | 教科書が出品中ではない |
| `SELF_PURCHASE_NOT_ALLOWED` | 400 | 自分の出品物は購入できない |
| `TRANSACTION_ALREADY_CLOSED` | 409 | 取引がすでに終了している |
| `CONFLICT` | 409 | 重複などの競合 |
| `INTERNAL_SERVER_ERROR` | 500 | サーバー内部エラー |

### 14.2 エラーレスポンス例

```json
{
  "success": false,
  "error": {
    "code": "BOOK_NOT_AVAILABLE",
    "message": "この教科書は現在購入できません"
  }
}
```

### 14.3 取引処理の代表的な異常系

| 条件 | 処理 |
|---|---|
| Bookが存在しない | 404を返す |
| Bookが`AVAILABLE`ではない | 409を返す |
| 自分の出品物を購入しようとした | 400を返す |
| Transaction関係者以外が承諾しようとした | 403を返す |
| すでにCOMPLETEDのTransactionを更新しようとした | 409を返す |
| DB更新途中で失敗した | ロールバックし、500を返す |

---

## 15. デプロイ設計

### 15.1 Renderデプロイ方針

| 対象 | Renderサービス種別 | Build Command | Start Command |
|---|---|---|---|
| Next.js | Web Service または Static Site | `npm install && npm run build` | `npm run start` |
| Express API | Web Service | `npm install && npx prisma generate && npm run build` | `npm start` |
| MySQL | MySQL Template または Web Service + Persistent Disk | 構成に応じて指定 | 構成に応じて指定 |

### 15.2 本番環境の接続関係

```mermaid
flowchart TB
    Frontend[Render: keio-book-frontend]
    Backend[Render: keio-book-api]
    MySQL[(Render: keio-book-mysql + Persistent Disk)]

    Frontend -->|NEXT_PUBLIC_API_BASE_URL| Backend
    Backend -->|DATABASE_URL| MySQL
```

### 15.3 Render環境変数設定

#### frontend

| Key | Value |
|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | `https://keio-book-api.onrender.com/api` |

#### backend

| Key | Value |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | Render側で指定されるポートを使用 |
| `DATABASE_URL` | `mysql://USER:PASSWORD@HOST:3306/DATABASE` |
| `FRONTEND_ORIGIN` | `https://keio-book-frontend.onrender.com` |
| `SESSION_SECRET` | 任意の長いランダム文字列 |
| `DEMO_PII_ENCRYPTION_KEY` | 架空個人情報を実データ同等に暗号化するためのキー |
| `DEMO_MODE` | `true`を基本とする |
| `DEMO_USER_SEED` | デモユーザー初期データを指定する場合に使用 |

### 15.4 Prismaマイグレーション方針

| 環境 | コマンド | 用途 |
|---|---|---|
| 開発 | `npx prisma migrate dev` | ローカルDBにスキーマ変更を反映 |
| 本番 | `npx prisma migrate deploy` | Render上のMySQLへ適用済みmigrationを反映 |
| 共通 | `npx prisma generate` | Prisma Client生成 |

### 15.5 デプロイ手順

1. GitHubにリポジトリを作成する。
2. `frontend/`、`backend/`をpushする。
3. RenderでGitHubリポジトリを接続する。
4. MySQLサービスを作成し、永続化ディスクを設定する。
5. Express API用Web Serviceを作成する。
6. backendに`DATABASE_URL`などの環境変数を設定する。
7. Express APIのBuild Commandに`prisma generate`を含める。
8. 必要に応じて`prisma migrate deploy`を実行する。
9. Next.js用サービスを作成する。
10. frontendに`NEXT_PUBLIC_API_BASE_URL`を設定する。
11. デプロイ後、API、DB、画面の疎通を確認する。

### 15.6 デプロイ後確認項目

| 確認項目 | 確認内容 | 結果 |
|---|---|---|
| フロントエンド表示 | トップページが表示される | 未確認 |
| API疎通 | `/api/health`が200を返す | 未確認 |
| DB接続 | APIからMySQLに接続できる | 未確認 |
| Prisma接続 | Prisma ClientがMySQLに接続できる | 未確認 |
| 検索機能 | `/api/books?q=...`が動作する | 未確認 |
| 出品機能 | `POST /api/books`でBookが保存される | 未確認 |
| 購入リクエスト | `POST /api/transactions`でTransactionが作成される | 未確認 |
| 双方承諾 | `PATCH /api/transactions/:id`で双方承諾時のみCOMPLETEDになる | 未確認 |
| Book状態更新 | 取引成立後にBookがSOLDになる | 未確認 |
| ログ | Renderログに重大エラーがない | 未確認 |
| 実決済遮断 | カード番号、銀行口座、外部決済URLを入力・保存・送信できない | 未確認 |
| 架空個人情報保存 | メール、電話番号、住所、学生証番号、本人確認書類は架空データとして保存され、実在データは保存されない | 未確認 |

---

## 16. テスト設計

### 16.1 テスト観点

| 区分 | 観点 |
|---|---|
| 画面テスト | デモ利用開始、検索、出品、購入、承諾、完了表示 |
| APIテスト | 正常系、異常系、バリデーション、認可 |
| DBテスト | User / Book / Transactionの作成・更新・外部キー制約 |
| 取引ロジック | 双方承諾時のみTransactionがCOMPLETEDになる |
| セキュリティテスト | デモ認証、認可、SQLインジェクション、XSS、実決済遮断、架空個人情報の同等保護 |
| デプロイ確認 | 環境変数、Prisma migration、DB接続、ログ |

### 16.2 テストケース例

| テストID | 対象 | 条件 | 操作 | 期待結果 |
|---|---|---|---|---|
| T-001 | デモ利用開始 | 有効なデモユーザー | 利用開始する | Userまたは仮想セッションが作成される |
| T-002 | デモ利用開始 | 未定義のデモユーザー | 利用開始する | 400エラー |
| T-003 | 教科書出品 | 正常な入力 | `POST /api/books` | BookがAVAILABLEで作成される |
| T-004 | 教科書出品 | 価格が負数 | `POST /api/books` | 400エラー |
| T-005 | 教科書検索 | 条件に一致するBookあり | `GET /api/books?q=経済学` | 画像付き検索結果を返す |
| T-006 | 購入リクエスト | BookがAVAILABLE | `POST /api/transactions` | TransactionがPENDINGで作成される |
| T-007 | 購入リクエスト | 自分の出品物 | `POST /api/transactions` | 400エラー |
| T-008 | 承諾処理 | 購入者のみ承諾 | `PATCH /api/transactions/:id` | TransactionはPENDINGのまま |
| T-009 | 承諾処理 | 出品者のみ承諾 | `PATCH /api/transactions/:id` | TransactionはPENDINGのまま |
| T-010 | 承諾処理 | 購入者・出品者の双方承諾 | `PATCH /api/transactions/:id` | TransactionがCOMPLETED、BookがSOLD |
| T-011 | 承諾処理 | 第三者が承諾 | `PATCH /api/transactions/:id` | 403エラー |
| T-012 | 取引成立後 | SOLDのBook | 購入リクエスト | 409エラー |
| T-013 | 支払い情報 | カード番号入力 | 入力または送信する | 入力欄が存在しない、または400エラー |
| T-014 | 架空個人情報 | メール、電話番号、住所、学生証番号、本人確認書類 | 保存する | 架空データだけが保存され、実在データは保存されない |
| T-015 | 仮想ポイント | 双方承諾成立 | 承諾する | 仮想ポイントだけが更新され、外部決済APIは呼ばれない |
| T-016 | 架空個人情報保護 | 第三者ユーザー | 他ユーザーの架空個人情報を取得する | 403エラー、またはマスキング済みレスポンス |

### 16.3 取引成立ロジックの重点テスト

| buyer_approved | seller_approved | 期待Transaction状態 | 期待Book状態 |
|---|---|---|---|
| false | false | PENDING | NEGOTIATING |
| true | false | PENDING | NEGOTIATING |
| false | true | PENDING | NEGOTIATING |
| true | true | COMPLETED | SOLD |

---

## 17. 運用設計

| 項目 | 方針 |
|---|---|
| ログ確認 | Render DashboardのLogsを確認する |
| 障害対応 | 500エラー発生時はAPIログ、Prismaエラー、DB接続状況を確認する |
| DBバックアップ | Render DiskのスナップショットまたはMySQLダンプの運用を検討する |
| 環境変数変更 | Render Dashboard上で変更し、再デプロイする |
| スキーマ変更 | Prisma migrationで変更履歴を管理する |
| 不適切投稿対応 | 管理者によるBookステータス変更、ユーザー停止機能を将来追加する |
| 取引トラブル対応 | Transaction履歴と承諾状態を確認できるようにする |
| 画像管理 | 画像保存先、削除、容量制限を運用ルールとして定義する |
| デモ通知 | 取引成立時、購入者・出品者に画面内の完了通知を表示する |

---

## 18. 開発ルール

### 18.0 ローカル起動・テスト

現在の最小構成では、リポジトリ直下から次のコマンドで静的フロントエンドを起動する。

```bash
npm run dev
```

起動後は `http://127.0.0.1:4173` を開く。frontend と backend のテストは、リポジトリ直下からまとめて実行できる。

現在の静的 frontend では、サイドバーから5つの架空デモアカウントを選択し、2時間有効な仮想セッションを開始できる。アカウントは随時切り替え可能で、ニックネーム、学部、学科・専攻、学年を編集できる。実在メールやパスワード、外部認証は使用しない。

デモアカウントに購入者・出品者の固定ロールは設定しない。仮想セッションが有効なアカウントはすべて、教科書の出品と他ユーザーが出品した教科書への購入相談を行える。未認証状態の更新操作は `frontend/src/apiClient.js` で拒否し、UI のボタン無効化だけを認証判定として信用しない。

出品者と購入者は変更不能なデモユーザー ID で識別する。同じユーザーが自分の出品へ購入相談を作成することは禁止し、別のデモユーザーに切り替えた場合だけ購入相談を作成できる。教科書一覧では自分の出品を青い枠と「自分の出品」ラベルで表示する。取引一覧は購入者または出品者になっているユーザーにだけ表示する。

デモアカウント、プロフィール、教科書、購入相談はブラウザの `localStorage` で共有し、仮想セッションはタブ単位の `sessionStorage` に保存する。別タブで異なるデモユーザーを選択し、購入者と出品者の画面を並行して確認できる。別ブラウザ・別端末間の共有、Express API、MySQL 永続化はまだ未実装である。

```bash
npm test
```

backend の開発サーバーを単独で起動する場合は、先に `backend/` で依存関係をインストールしてから `npm run dev:backend` を実行する。

### 18.1 ブランチ運用

| ブランチ | 用途 |
|---|---|
| `main` | 本番反映用 |
| `develop` | 開発統合用 |
| `feature/auth` | 認証機能 |
| `feature/books` | 教科書出品・検索機能 |
| `feature/transactions` | 購入リクエスト・承諾機能 |
| `fix/〇〇` | 修正用 |

### 18.2 コミットメッセージ例

```text
feat: 教科書出品APIを追加
feat: 購入リクエストAPIを追加
feat: 双方承諾時のみ取引成立にする処理を追加
fix: 売却済み教科書に購入リクエストできる問題を修正
docs: 設計書にPrismaスキーマを追記
refactor: transactionServiceの責務を整理
```

### 18.3 命名規則

| 対象 | 例 | 方針 |
|---|---|---|
| APIパス | `/api/books` | 複数形の名詞 |
| Prisma Model | `User`, `Book`, `Transaction` | PascalCase |
| DBテーブル | `users`, `books`, `transactions` | snake_case複数形 |
| TypeScript型 | `Book`, `TransactionStatus` | PascalCase |
| コンポーネント | `BookCard`, `SearchForm` | PascalCase |
| 関数 | `approveTransaction` | camelCase |

---

## 19. 未決定事項

| ID | 内容 | 担当 | 期限 | 状態 |
|---|---|---|---|---|
| TBD-001 | デモユーザーの種類と初期ポイントをどうするか | 〇〇 | YYYY-MM-DD | 未決定 |
| TBD-002 | 画像ファイルをサンプル画像だけにするか、デモ用アップロードも許可するか | 〇〇 | YYYY-MM-DD | 未決定 |
| TBD-003 | コメント機能をMVPに含めるか、Phase2に回すか | 〇〇 | YYYY-MM-DD | 未決定 |
| TBD-004 | 授業マスタを作るか、Bookの文字列項目で始めるか | 〇〇 | YYYY-MM-DD | 未決定 |
| TBD-005 | MySQLをRender上で運用する際のデモデータリセット・バックアップ方法 | 〇〇 | YYYY-MM-DD | 未決定 |
| TBD-006 | 管理者機能をMVPに含めるか | 〇〇 | YYYY-MM-DD | 未決定 |
| TBD-007 | 画面内デモ通知の保存期間をどうするか | 〇〇 | YYYY-MM-DD | 未決定 |

---

## 20. 参考資料

- Next.js Documentation: https://nextjs.org/docs
- Next.js Deployment Documentation: https://nextjs.org/docs/pages/getting-started/deploying
- Express Documentation: https://expressjs.com/
- Express Routing Guide: https://expressjs.com/en/guide/routing.html
- Prisma Documentation: https://www.prisma.io/docs
- Prisma MySQL Quickstart: https://www.prisma.io/docs/prisma-orm/quickstart/mysql
- Prisma MySQL Connector: https://www.prisma.io/docs/orm/core-concepts/supported-databases/mysql
- Render: Deploy a Next.js App: https://render.com/docs/deploy-nextjs-app
- Render: Deploy a Node Express App: https://render.com/docs/deploy-node-express-app
- Render: Deploy MySQL: https://render.com/docs/deploy-mysql
- Render: Persistent Disks: https://render.com/docs/disks
- MySQL Documentation: https://dev.mysql.com/doc/
