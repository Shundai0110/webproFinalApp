# Database Notes

## 未実装

- User / Book / Transaction モデル
- migration
- seed
- バックアップ設定
- デモデータリセット手順

## 実装時の注意

- 最初のモデル追加時に `backend/prisma/schema.prisma` を更新する。
- migration は `backend/prisma/migrations/` に生成される想定。
- 手動 SQL が必要な場合だけ `database/migrations/` に補足資料として置く。
- seed には実在人物、実在メール、実電話番号、実住所、実学生証番号、実本人確認書類を含めない。
