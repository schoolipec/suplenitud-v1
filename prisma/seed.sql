-- Run manually only against the isolated suplenitud_web database after Prisma migrations.
-- This file is idempotent and contains no credentials.
INSERT INTO "blessing_messages" ("id", "active", "priority", "published_at", "created_at", "updated_at")
VALUES ('11111111-1111-4111-8111-111111111111', true, 100, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO UPDATE SET "active" = EXCLUDED."active", "priority" = EXCLUDED."priority", "published_at" = EXCLUDED."published_at", "updated_at" = CURRENT_TIMESTAMP;

INSERT INTO "blessing_message_translations" ("id", "message_id", "locale", "title", "body", "scripture_reference", "created_at", "updated_at") VALUES
('21111111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111111', 'en', 'A word for you', 'The Lord is close to all who call on Him in truth.', 'Psalm 145:18', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('31111111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111111', 'es', 'Una palabra para ti', 'El Señor está cerca de todos los que lo invocan de verdad.', 'Salmo 145:18', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('41111111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111111', 'pt', 'Uma palavra para você', 'O Senhor está perto de todos os que o invocam em verdade.', 'Salmo 145:18', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('51111111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111111', 'ko', '당신을 위한 말씀', '여호와께서는 진실하게 부르는 모든 자에게 가까이 계십니다.', '시편 145:18', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('61111111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111111', 'de', 'Ein Wort für dich', 'Der Herr ist allen nahe, die ihn in Wahrheit anrufen.', 'Psalm 145,18', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("message_id", "locale") DO UPDATE SET "title" = EXCLUDED."title", "body" = EXCLUDED."body", "scripture_reference" = EXCLUDED."scripture_reference", "updated_at" = CURRENT_TIMESTAMP;
