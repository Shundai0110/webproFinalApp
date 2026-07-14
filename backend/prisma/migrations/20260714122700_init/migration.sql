CREATE TABLE `users` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `demo_user_key` VARCHAR(100) NOT NULL,
  `nickname` VARCHAR(40) NOT NULL,
  `year` INTEGER NOT NULL,
  `faculty` VARCHAR(100) NOT NULL,
  `department` VARCHAR(100) NOT NULL DEFAULT '',
  `icon_url` VARCHAR(1000) NULL,
  `point_balance` INTEGER NOT NULL DEFAULT 5000,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  UNIQUE INDEX `users_demo_user_key_key`(`demo_user_key`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `books` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `title` VARCHAR(255) NOT NULL,
  `price` INTEGER NOT NULL,
  `description` TEXT NULL,
  `image_url` VARCHAR(1000) NULL,
  `seller_id` INTEGER NOT NULL,
  `status` ENUM('AVAILABLE', 'NEGOTIATING', 'SOLD', 'CANCELLED') NOT NULL DEFAULT 'AVAILABLE',
  `used_year` INTEGER NOT NULL,
  `used_lesson` VARCHAR(255) NOT NULL,
  `used_faculty` VARCHAR(100) NULL,
  `used_department` VARCHAR(100) NULL,
  `target_year` INTEGER NULL,
  `material_type` ENUM('REQUIRED', 'REFERENCE') NOT NULL DEFAULT 'REQUIRED',
  `category` VARCHAR(100) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  INDEX `books_seller_id_idx`(`seller_id`),
  INDEX `books_status_idx`(`status`),
  INDEX `books_used_year_idx`(`used_year`),
  INDEX `books_used_lesson_idx`(`used_lesson`),
  INDEX `books_used_faculty_idx`(`used_faculty`),
  INDEX `books_used_department_idx`(`used_department`),
  INDEX `books_target_year_idx`(`target_year`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `transactions` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `book_id` INTEGER NOT NULL,
  `buyer_id` INTEGER NOT NULL,
  `seller_id` INTEGER NOT NULL,
  `offered_price` INTEGER NOT NULL,
  `seller_approved` BOOLEAN NOT NULL DEFAULT false,
  `buyer_approved` BOOLEAN NOT NULL DEFAULT false,
  `status` ENUM('PENDING', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
  `message` TEXT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  `completed_at` DATETIME(3) NULL,
  INDEX `transactions_book_id_idx`(`book_id`),
  INDEX `transactions_buyer_id_idx`(`buyer_id`),
  INDEX `transactions_seller_id_idx`(`seller_id`),
  INDEX `transactions_status_idx`(`status`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `notifications` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `user_id` INTEGER NOT NULL,
  `transaction_id` INTEGER NOT NULL,
  `type` ENUM('TRANSACTION_COMPLETED') NOT NULL DEFAULT 'TRANSACTION_COMPLETED',
  `message` VARCHAR(500) NOT NULL,
  `read` BOOLEAN NOT NULL DEFAULT false,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `notifications_user_id_created_at_idx`(`user_id`, `created_at`),
  INDEX `notifications_transaction_id_idx`(`transaction_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `books` ADD CONSTRAINT `books_seller_id_fkey`
  FOREIGN KEY (`seller_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_book_id_fkey`
  FOREIGN KEY (`book_id`) REFERENCES `books`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_buyer_id_fkey`
  FOREIGN KEY (`buyer_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_seller_id_fkey`
  FOREIGN KEY (`seller_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_user_id_fkey`
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_transaction_id_fkey`
  FOREIGN KEY (`transaction_id`) REFERENCES `transactions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
