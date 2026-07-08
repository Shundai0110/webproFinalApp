# Backend

Express / TypeScript / Prisma 用のベース構造です。
現時点では具体的なドメイン機能を実装していません。

## 含めているもの

- Express アプリの生成処理
- `/api/health` の疎通確認用ルート
- 共通エラーハンドラ
- Prisma Client の配置先
- 空の Prisma schema
- 構造確認用の Node.js 標準テスト

## 含めていないもの

- 認証 API
- 教科書 API
- 取引 API
- DB モデル
- マイグレーション
- seed データ

## コマンド

依存関係をインストールした後に使用します。

```bash
npm install
npm run dev
npm test
```

依存関係なしで実行できる確認:

```bash
npm test
```
