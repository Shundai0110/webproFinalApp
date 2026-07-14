# Database Notes

## 無料公開モード

- `DEMO_STORAGE_MODE=ephemeral` のSQLite `:memory:`を使用し、永続バックアップは作成しない。
- 復旧元は `backend/src/lib/ephemeralStore.ts` のschemaと架空seedであり、障害データを復元せず初期状態へ戻す。
- 最後のブラウザ終了、90秒heartbeatなし、サービス停止・再起動で自動的に初期状態へ戻る。
- 手動復旧は、他のブラウザが利用していない状態で画面の「デモ初期化」または認証付き `POST /api/demo/reset` を使用する。
- `/api/health` は実際に `SELECT 1` を実行する。SQLiteでは件数とgeneration、任意のMySQLモードでは接続結果を返す。
- 実在個人情報や実金銭データを保存しないため、一時データの消失を仕様とし、外部バックアップサービスは使用しない。

## 任意のMySQLモード

- MySQLはローカルのmigration・seed・互換性検証だけに残し、Render無料公開では使用しない。
- MySQLのバックアップ・復元を公開デモの運用要件にしない。
- 接続試験を行う場合は、接続先、変更内容、seed影響を提示し、ユーザーの明示承諾後だけ実行する。

## 実装時の注意

- モデル変更時は `backend/prisma/schema.prisma` とmigrationを同時に更新する。
- 手動 SQL が必要な場合だけ `database/migrations/` に補足資料として置く。
- seed には実在人物、実在メール、実電話番号、実住所、実学生証番号、実本人確認書類を含めない。
- migration・seed・API起動などMySQLへ接続する操作は、接続先と変更内容を提示してユーザーの明示承諾を得てから実行する。
