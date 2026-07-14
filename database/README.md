# Database

MySQL / Prisma 用の補足資料置き場です。実行対象のschemaとmigrationは `backend/prisma/` にあります。

## 方針

- Prisma schema は `backend/prisma/schema.prisma` に置く。
- Prisma migration は `backend/prisma/migrations/` で管理する。
- `database/migrations/` は SQL メモや手動検証用の置き場として使う。
- 実行するseedの正本は `backend/prisma/seed.ts` とし、`database/seed.sql` は手動確認用とする。
- 実決済、カード、銀行口座、実在個人情報のデータは作らない。
- メール、電話番号、住所、学生証番号、本人確認書類が必要な場合は、架空デモデータだけを扱う。
- 架空デモデータも実データ同等に、暗号化、マスキング、認可、監査ログ、保存期間、削除手段の対象にする。

## 現在の状態

- DB モデル: `User`, `Book`, `Transaction`, `Notification`
- migration: `backend/prisma/migrations/20260714122700_init/`
- seed: 5架空ユーザー、4架空Book、2Transaction、2成立通知

## MySQL接続前の承諾

MySQLへ接続するコマンドは、接続先ホスト・DB名、適用migration、投入または更新するseed内容をユーザーへ提示し、明示承諾を得てから実行する。承諾前は `prisma generate`、build、DB非接続テストだけを実行する。
