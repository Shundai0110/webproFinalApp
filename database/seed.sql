-- Manual MySQL equivalent of backend/prisma/seed.ts.
-- All identities and messages are fictional demo data. No real PII or payment data is included.
START TRANSACTION;

INSERT INTO `users`
  (`demo_user_key`, `nickname`, `year`, `faculty`, `department`, `point_balance`, `created_at`, `updated_at`)
VALUES
  ('demo-user-suzuki', 'A. Suzuki', 1, '経済学部', '経済学科', 5000, NOW(3), NOW(3)),
  ('demo-user-tanaka', 'S. Tanaka', 2, '経済学部', '経済学科', 3200, NOW(3), NOW(3)),
  ('demo-user-sato', 'M. Sato', 2, '法学部', '法律学科', 4100, NOW(3), NOW(3)),
  ('demo-user-kato', 'R. Kato', 1, '理工学部', '学門 A', 2800, NOW(3), NOW(3)),
  ('demo-user-ito', 'A. Ito', 2, '商学部', '商学科', 3600, NOW(3), NOW(3))
ON DUPLICATE KEY UPDATE
  `nickname` = VALUES(`nickname`),
  `year` = VALUES(`year`),
  `faculty` = VALUES(`faculty`),
  `department` = VALUES(`department`),
  `updated_at` = NOW(3);

SET @suzuki_id = (SELECT `id` FROM `users` WHERE `demo_user_key` = 'demo-user-suzuki');
SET @tanaka_id = (SELECT `id` FROM `users` WHERE `demo_user_key` = 'demo-user-tanaka');
SET @sato_id = (SELECT `id` FROM `users` WHERE `demo_user_key` = 'demo-user-sato');
SET @kato_id = (SELECT `id` FROM `users` WHERE `demo_user_key` = 'demo-user-kato');
SET @ito_id = (SELECT `id` FROM `users` WHERE `demo_user_key` = 'demo-user-ito');

INSERT INTO `books`
  (`title`, `price`, `description`, `seller_id`, `status`, `used_year`, `used_lesson`, `used_faculty`, `used_department`, `target_year`, `material_type`, `category`, `created_at`, `updated_at`)
SELECT '経済学入門', 1200, 'デモ用の架空出品。表紙に軽い擦れがある設定です。', @tanaka_id, 'AVAILABLE', 2025, '経済学 I', '経済学部', '経済学科', 1, 'REQUIRED', '専門科目', NOW(3), NOW(3)
WHERE NOT EXISTS (SELECT 1 FROM `books` WHERE `title` = '経済学入門' AND `seller_id` = @tanaka_id);

INSERT INTO `books`
  (`title`, `price`, `description`, `seller_id`, `status`, `used_year`, `used_lesson`, `used_faculty`, `used_department`, `target_year`, `material_type`, `category`, `created_at`, `updated_at`)
SELECT '民法総則ケースブック', 1800, 'デモ用の架空出品。重要箇所にマーカーがある設定です。', @sato_id, 'AVAILABLE', 2024, '民法総則', '法学部', '法律学科', 2, 'REQUIRED', '専門科目', NOW(3), NOW(3)
WHERE NOT EXISTS (SELECT 1 FROM `books` WHERE `title` = '民法総則ケースブック' AND `seller_id` = @sato_id);

INSERT INTO `books`
  (`title`, `price`, `description`, `seller_id`, `status`, `used_year`, `used_lesson`, `used_faculty`, `used_department`, `target_year`, `material_type`, `category`, `created_at`, `updated_at`)
SELECT '線形代数スタンダード', 900, 'デモ用の架空出品。購入相談中の状態確認に使用します。', @kato_id, 'NEGOTIATING', 2025, '線形代数', '理工学部', '学門 A', 1, 'REFERENCE', '専門科目', NOW(3), NOW(3)
WHERE NOT EXISTS (SELECT 1 FROM `books` WHERE `title` = '線形代数スタンダード' AND `seller_id` = @kato_id);

INSERT INTO `books`
  (`title`, `price`, `description`, `seller_id`, `status`, `used_year`, `used_lesson`, `used_faculty`, `used_department`, `target_year`, `material_type`, `category`, `created_at`, `updated_at`)
SELECT 'マーケティング基礎', 700, 'デモ用の架空出品。取引成立済みの状態確認に使用します。', @ito_id, 'SOLD', 2023, 'マーケティング論', '商学部', '商学科', 2, 'REQUIRED', '専門科目', NOW(3), NOW(3)
WHERE NOT EXISTS (SELECT 1 FROM `books` WHERE `title` = 'マーケティング基礎' AND `seller_id` = @ito_id);

SET @linear_book_id = (SELECT `id` FROM `books` WHERE `title` = '線形代数スタンダード' AND `seller_id` = @kato_id LIMIT 1);
SET @marketing_book_id = (SELECT `id` FROM `books` WHERE `title` = 'マーケティング基礎' AND `seller_id` = @ito_id LIMIT 1);

INSERT INTO `transactions`
  (`book_id`, `buyer_id`, `seller_id`, `offered_price`, `seller_approved`, `buyer_approved`, `status`, `message`, `created_at`, `updated_at`)
SELECT @linear_book_id, @suzuki_id, @kato_id, 900, false, true, 'PENDING', 'デモ用の購入相談です。実在する連絡先は含みません。', NOW(3), NOW(3)
WHERE NOT EXISTS (
  SELECT 1 FROM `transactions`
  WHERE `book_id` = @linear_book_id AND `buyer_id` = @suzuki_id AND `seller_id` = @kato_id
);

INSERT INTO `transactions`
  (`book_id`, `buyer_id`, `seller_id`, `offered_price`, `seller_approved`, `buyer_approved`, `status`, `message`, `created_at`, `updated_at`, `completed_at`)
SELECT @marketing_book_id, @suzuki_id, @ito_id, 700, true, true, 'COMPLETED', 'デモ用の成立済み取引です。', NOW(3), NOW(3), '2026-07-01 12:00:00.000'
WHERE NOT EXISTS (
  SELECT 1 FROM `transactions`
  WHERE `book_id` = @marketing_book_id AND `buyer_id` = @suzuki_id AND `seller_id` = @ito_id
);

SET @completed_transaction_id = (
  SELECT `id` FROM `transactions`
  WHERE `book_id` = @marketing_book_id AND `buyer_id` = @suzuki_id AND `seller_id` = @ito_id
  LIMIT 1
);

INSERT INTO `notifications`
  (`user_id`, `transaction_id`, `type`, `message`, `read`, `created_at`)
SELECT @suzuki_id, @completed_transaction_id, 'TRANSACTION_COMPLETED', 'マーケティング基礎 のデモ取引が完了しました', false, NOW(3)
WHERE NOT EXISTS (
  SELECT 1 FROM `notifications`
  WHERE `user_id` = @suzuki_id AND `transaction_id` = @completed_transaction_id AND `type` = 'TRANSACTION_COMPLETED'
);

INSERT INTO `notifications`
  (`user_id`, `transaction_id`, `type`, `message`, `read`, `created_at`)
SELECT @ito_id, @completed_transaction_id, 'TRANSACTION_COMPLETED', 'マーケティング基礎 のデモ取引が完了しました', false, NOW(3)
WHERE NOT EXISTS (
  SELECT 1 FROM `notifications`
  WHERE `user_id` = @ito_id AND `transaction_id` = @completed_transaction_id AND `type` = 'TRANSACTION_COMPLETED'
);

COMMIT;
