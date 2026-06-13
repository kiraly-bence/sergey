CREATE TABLE `auto_reactions` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `keyword` varchar(255) NOT NULL,
  `emote` varchar(255) NOT NULL,
  `match_mode` enum('any','word','message') NOT NULL DEFAULT 'any',
  `is_enabled` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  KEY `is_enabled` (`is_enabled`)
);

CREATE TABLE `auto_replies` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `keyword` varchar(255) NOT NULL,
  `message` text,
  `embed` varchar(255) DEFAULT NULL,
  `match_mode` enum('any','word','message') NOT NULL DEFAULT 'any',
  `is_enabled` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  KEY `is_enabled` (`is_enabled`)
);

CREATE TABLE `command_logs` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `command` varchar(255) NOT NULL,
  `options` text,
  `user_id` varchar(255) NOT NULL,
  `channel_id` varchar(255) NOT NULL,
  `guild_id` varchar(255) NOT NULL,
  `used_at` timestamp NOT NULL,
  PRIMARY KEY (`id`)
);

CREATE TABLE `emotes` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `tag` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `key` (`name`) USING BTREE
);

CREATE TABLE `fetchable_channels` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `channel_id` varchar(255) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `is_enabled` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `channel_id` (`channel_id`),
  KEY `is_enabled` (`is_enabled`)
);

CREATE TABLE `fetched_words` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `word` varchar(255) NOT NULL,
  `prev_id` bigint(20) unsigned DEFAULT NULL,
  `author_id` varchar(255) NOT NULL,
  `message_id` varchar(255) NOT NULL,
  `channel_id` varchar(255) NOT NULL,
  `guild_id` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL,
  PRIMARY KEY (`id`),
  KEY `author_id` (`author_id`),
  KEY `word` (`word`),
  KEY `message_id` (`message_id`),
  KEY `channel_id` (`channel_id`),
  KEY `guild_id` (`guild_id`),
  KEY `created_at` (`created_at`)
);

CREATE TABLE `insults` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `message` text NOT NULL,
  `is_enabled` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  KEY `is_enabled` (`is_enabled`)
);

CREATE TABLE `roll_riggings` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` varchar(255) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `type` enum('W','L','D') NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_id` (`user_id`)
);

CREATE TABLE `scheduled_messages` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `message` text,
  `embed` varchar(255) DEFAULT NULL,
  `cron` varchar(255) DEFAULT NULL,
  `channel_id` varchar(255) NOT NULL,
  `is_enabled` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  KEY `is_enabled` (`is_enabled`)
);

CREATE TABLE `tracked_lol_matches` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `match_id` varchar(255) NOT NULL,
  `user_id` bigint(20) unsigned NOT NULL,
  `tracked_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `match_id_user_id` (`match_id`,`user_id`) USING BTREE,
  KEY `tracked_lol_matches_user_id_foreign` (`user_id`) USING BTREE
);

CREATE TABLE `tracked_lol_users` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `tag` varchar(255) NOT NULL,
  `puuid` varchar(255) DEFAULT NULL,
  `region` enum('europe','americas','asia','sea') NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `is_enabled` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `name_tag` (`name`,`tag`),
  UNIQUE KEY `puuid` (`puuid`),
  KEY `is_enabled` (`is_enabled`)
);

CREATE TABLE `x_words` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `word` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `word` (`word`) USING BTREE
);

CREATE TABLE `prisoned_users` (
	`id` BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
	`user_id` VARCHAR(255) NOT NULL COLLATE 'utf8mb4_unicode_ci',
	`guild_id` VARCHAR(255) NOT NULL COLLATE 'utf8mb4_unicode_ci',
	`voice_channel_id` VARCHAR(255) NOT NULL COLLATE 'utf8mb4_unicode_ci',
	`expires_at` TIMESTAMP NULL DEFAULT NULL,
	`freed_at` TIMESTAMP NULL DEFAULT NULL,
	PRIMARY KEY (`id`) USING BTREE,
	INDEX `user_id` (`user_id`) USING BTREE,
	INDEX `guild_id` (`guild_id`) USING BTREE,
	INDEX `voice_channel_id` (`voice_channel_id`) USING BTREE
);

CREATE TABLE `user_permissions` (
	`user_id` VARCHAR(255) NOT NULL COLLATE 'utf8mb4_unicode_ci',
	`permission` VARCHAR(255) NOT NULL COLLATE 'utf8mb4_unicode_ci',
	UNIQUE INDEX `user_id_permission_id` (`user_id`, `permission`) USING BTREE
);

ALTER TABLE `fetched_words`
ADD CONSTRAINT `FK_fetched_words_fetched_words`
FOREIGN KEY (`prev_id`) REFERENCES `fetched_words`(`id`);

ALTER TABLE `tracked_lol_matches`
ADD CONSTRAINT `tracked_lol_matches_user_id_foreign`
FOREIGN KEY (`user_id`) REFERENCES `tracked_lol_users`(`id`);