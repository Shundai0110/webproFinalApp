# Database

MySQL / Prisma 用のデータベース関連ファイル置き場です。
現時点では具体的なテーブル、マイグレーション、seed データは作成していません。

## 方針

- Prisma schema は `backend/prisma/schema.prisma` に置く。
- Prisma migration は機能実装時に生成する。
- `database/migrations/` は SQL メモや手動検証用の置き場として使う。
- `database/seeds/` はデモ seed の置き場として使う。
- 実決済、カード、銀行口座、実在個人情報のデータは作らない。
- メール、電話番号、住所、学生証番号、本人確認書類が必要な場合は、架空デモデータだけを扱う。
- 架空デモデータも実データ同等に、暗号化、マスキング、認可、監査ログ、保存期間、削除手段の対象にする。

## 現在の状態

- DB モデル: 未定義
- migration: 未作成
- seed: 未作成
