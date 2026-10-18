-- Run manually only against the isolated suplenitud_web database after Prisma migrations.
-- This file is idempotent and contains no credentials.

-- 1. Salmo 145:18
INSERT INTO "blessing_messages" ("id", "active", "priority", "published_at", "created_at", "updated_at")
VALUES ('11111111-1111-4111-8111-111111111111', true, 50, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO UPDATE SET "active" = EXCLUDED."active", "priority" = EXCLUDED."priority", "published_at" = EXCLUDED."published_at", "updated_at" = CURRENT_TIMESTAMP;

INSERT INTO "blessing_message_translations" ("id", "message_id", "locale", "title", "body", "scripture_reference", "created_at", "updated_at") VALUES
('21111111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111111', 'en', 'A word for you', 'The Lord is close to all who call on Him in truth.', 'Psalm 145:18', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('31111111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111111', 'es', 'Una palabra para ti', 'El Señor está cerca de todos los que lo invocan de verdad.', 'Salmo 145:18', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('41111111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111111', 'pt', 'Uma palavra para você', 'O Senhor está perto de todos os que o invocam em verdade.', 'Salmo 145:18', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('51111111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111111', 'ko', '당신을 위한 말씀', '여호와께서는 진실하게 부르는 모든 자에게 가까이 계십니다.', '시편 145:18', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('61111111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111111', 'de', 'Ein Wort für dich', 'Der Herr ist allen nahe, die ihn in Wahrheit anrufen.', 'Psalm 145,18', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("message_id", "locale") DO UPDATE SET "title" = EXCLUDED."title", "body" = EXCLUDED."body", "scripture_reference" = EXCLUDED."scripture_reference", "updated_at" = CURRENT_TIMESTAMP;

-- 2. Jeremías 29:11
INSERT INTO "blessing_messages" ("id", "active", "priority", "published_at", "created_at", "updated_at")
VALUES ('11111111-1111-4111-8111-222222222222', true, 50, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO UPDATE SET "active" = EXCLUDED."active", "priority" = EXCLUDED."priority", "published_at" = EXCLUDED."published_at", "updated_at" = CURRENT_TIMESTAMP;

INSERT INTO "blessing_message_translations" ("id", "message_id", "locale", "title", "body", "scripture_reference", "created_at", "updated_at") VALUES
('22222222-2222-4222-8222-111111111111', '11111111-1111-4111-8111-222222222222', 'en', 'Hope and a Future', 'For I know the plans I have for you, declares the Lord, plans to prosper you and not to harm you, plans to give you hope and a future.', 'Jeremiah 29:11', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('32222222-2222-4222-8222-111111111111', '11111111-1111-4111-8111-222222222222', 'es', 'Esperanza y Futuro', 'Porque yo sé los pensamientos que tengo acerca de vosotros, dice Jehová, pensamientos de paz, y no de mal, para daros el fin que esperáis.', 'Jeremías 29:11', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('42222222-2222-4222-8222-111111111111', '11111111-1111-4111-8111-222222222222', 'pt', 'Esperança e Futuro', 'Porque sou eu que conheço os planos que tenho para vocês, diz o Senhor, planos de fazê-los prosperar e não de causar dano, planos de dar a vocês esperança e um futuro.', 'Jeremias 29:11', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('52222222-2222-4222-8222-111111111111', '11111111-1111-4111-8111-222222222222', 'ko', '평안과 미래의 희망', '여호와의 말씀이니라 너희를 향한 나의 생각을 내가 아나니 평안이요 재앙이 아니니라 너희에게 미래와 희망을 주는 것이니라.', '예레미야 29:11', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('62222222-2222-4222-8222-111111111111', '11111111-1111-4111-8111-222222222222', 'de', 'Hoffnung und Zukunft', 'Denn ich weiß wohl, was ich für Gedanken über euch habe, spricht der HERR: Gedanken des Friedens und nicht des Leides, dass ich euch gebe Zukunft und Hoffnung.', 'Jeremia 29,11', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("message_id", "locale") DO UPDATE SET "title" = EXCLUDED."title", "body" = EXCLUDED."body", "scripture_reference" = EXCLUDED."scripture_reference", "updated_at" = CURRENT_TIMESTAMP;

-- 3. Filipenses 4:6-7
INSERT INTO "blessing_messages" ("id", "active", "priority", "published_at", "created_at", "updated_at")
VALUES ('11111111-1111-4111-8111-333333333333', true, 50, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO UPDATE SET "active" = EXCLUDED."active", "priority" = EXCLUDED."priority", "published_at" = EXCLUDED."published_at", "updated_at" = CURRENT_TIMESTAMP;

INSERT INTO "blessing_message_translations" ("id", "message_id", "locale", "title", "body", "scripture_reference", "created_at", "updated_at") VALUES
('23333333-3333-4333-8333-111111111111', '11111111-1111-4111-8111-333333333333', 'en', 'Peace Beyond Understanding', 'Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God. And the peace of God will guard your hearts and minds in Christ Jesus.', 'Philippians 4:6-7', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('33333333-3333-4333-8333-111111111111', '11111111-1111-4111-8111-333333333333', 'es', 'La Paz de Dios', 'Por nada estéis afanosos, sino sean conocidas vuestras peticiones delante de Dios en toda oración y ruego, con acción de gracias. Y la paz de Dios guardará vuestros corazones y vuestros pensamientos en Cristo Jesús.', 'Filipenses 4:6-7', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('43333333-3333-4333-8333-111111111111', '11111111-1111-4111-8111-333333333333', 'pt', 'A Paz de Deus', 'Não andem ansiosos por coisa alguma, mas em tudo apresentem seus pedidos a Deus pela oração e súplicas, com ação de graças. E a paz de Deus guardará o coração e a mente de vocês em Cristo Jesus.', 'Filipenses 4:6-7', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('53333333-3333-4333-8333-111111111111', '11111111-1111-4111-8111-333333333333', 'ko', '지각을 뛰어넘는 평강', '아무 것도 염려하지 말고 다만 모든 일에 기도와 간구로, 너희 구할 것을 감사함으로 하나님께 아뢰라. 그리하면 모든 지각에 뛰어난 하나님의 평강이 그리스도 예수 안에서 너희 마음과 생각을 지키시리라.', '빌립보서 4:6-7', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('63333333-3333-4333-8333-111111111111', '11111111-1111-4111-8111-333333333333', 'de', 'Der Friede Gottes', 'Sorgt euch um nichts, sondern in allen Dingen lasst eure Bitten in Gebet und Flehen mit Danksagung vor Gott kundwerden! Und der Friede Gottes wird eure Herzen und eure Sinne bewahren in Christus Jesus.', 'Philipper 4,6-7', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("message_id", "locale") DO UPDATE SET "title" = EXCLUDED."title", "body" = EXCLUDED."body", "scripture_reference" = EXCLUDED."scripture_reference", "updated_at" = CURRENT_TIMESTAMP;

-- 4. Isaías 40:31
INSERT INTO "blessing_messages" ("id", "active", "priority", "published_at", "created_at", "updated_at")
VALUES ('11111111-1111-4111-8111-444444444444', true, 50, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO UPDATE SET "active" = EXCLUDED."active", "priority" = EXCLUDED."priority", "published_at" = EXCLUDED."published_at", "updated_at" = CURRENT_TIMESTAMP;

INSERT INTO "blessing_message_translations" ("id", "message_id", "locale", "title", "body", "scripture_reference", "created_at", "updated_at") VALUES
('24444444-4444-4444-8444-111111111111', '11111111-1111-4111-8111-444444444444', 'en', 'Renewed Strength', 'Those who hope in the Lord will renew their strength. They will soar on wings like eagles; they will run and not grow weary, they will walk and not be faint.', 'Isaiah 40:31', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('34444444-4444-4444-8444-111111111111', '11111111-1111-4111-8111-444444444444', 'es', 'Nuevas Fuerzas', 'Pero los que esperan a Jehová tendrán nuevas fuerzas; levantarán alas como las águilas; correrán, y no se cansarán; caminarán, y no se fatigarán.', 'Isaías 40:31', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('44444444-4444-4444-8444-111111111111', '11111111-1111-4111-8111-444444444444', 'pt', 'Força Renovada', 'Aqueles que esperam no Senhor renovam as suas forças. Voam alto como águias; correm e não ficam exaustos, andam e não se cansam.', 'Isaías 40:31', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('54444444-4444-4444-8444-111111111111', '11111111-1111-4111-8111-444444444444', 'ko', '새 힘을 얻으리라', '오직 여호와를 앙망하는 자는 새 힘을 얻으리니 독수리가 날개치며 올라감 같을 것이요 달음박질하여도 곤비하지 아니하겠고 걸어가도 피곤하지 아니하리로다.', '이사야 40:31', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('64444444-4444-4444-8444-111111111111', '11111111-1111-4111-8111-444444444444', 'de', 'Neue Kraft', 'Die aber auf den HERRN harren, kriegen neue Kraft, dass sie auffahren mit Flügeln wie Adler, dass sie laufen und nicht matt werden, dass sie wandeln und nicht müde werden.', 'Jesaja 40,31', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("message_id", "locale") DO UPDATE SET "title" = EXCLUDED."title", "body" = EXCLUDED."body", "scripture_reference" = EXCLUDED."scripture_reference", "updated_at" = CURRENT_TIMESTAMP;

-- 5. Salmo 23:1-2
INSERT INTO "blessing_messages" ("id", "active", "priority", "published_at", "created_at", "updated_at")
VALUES ('11111111-1111-4111-8111-555555555555', true, 50, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO UPDATE SET "active" = EXCLUDED."active", "priority" = EXCLUDED."priority", "published_at" = EXCLUDED."published_at", "updated_at" = CURRENT_TIMESTAMP;

INSERT INTO "blessing_message_translations" ("id", "message_id", "locale", "title", "body", "scripture_reference", "created_at", "updated_at") VALUES
('25555555-5555-4555-8555-111111111111', '11111111-1111-4111-8111-555555555555', 'en', 'The Lord is My Shepherd', 'The Lord is my shepherd, I lack nothing. He makes me lie down in green pastures, he leads me beside quiet waters.', 'Psalm 23:1-2', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('35555555-5555-4555-8555-111111111111', '11111111-1111-4111-8111-555555555555', 'es', 'El Buen Pastor', 'Jehová es mi pastor; nada me faltará. En lugares de delicados pastos me hará descansar; junto a aguas de reposo me pastoreará.', 'Salmo 23:1-2', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('45555555-5555-4555-8555-111111111111', '11111111-1111-4111-8111-555555555555', 'pt', 'O Senhor é Meu Pastor', 'O Senhor é o meu pastor; de nada terei falta. Em verdes pastagens faz-me repousar e conduz-me a águas tranquilas.', 'Salmo 23:1-2', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('55555555-5555-4555-8555-111111111111', '11111111-1111-4111-8111-555555555555', 'ko', '여호와는 나의 목자', '여호와는 나의 목자시니 내게 부족함이 없으리로다. 그가 나를 푸른 풀밭에 누이시며 쉴 만한 물 가로 인도하시는도다.', '시편 23:1-2', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('65555555-5555-4555-8555-111111111111', '11111111-1111-4111-8111-555555555555', 'de', 'Der Herr ist mein Hirte', 'Der HERR ist mein Hirte, mir wird nichts mangeln. Er weidet mich auf einer grünen Aue und führet mich zum frischen Wasser.', 'Psalm 23,1-2', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("message_id", "locale") DO UPDATE SET "title" = EXCLUDED."title", "body" = EXCLUDED."body", "scripture_reference" = EXCLUDED."scripture_reference", "updated_at" = CURRENT_TIMESTAMP;

-- 6. Josué 1:9
INSERT INTO "blessing_messages" ("id", "active", "priority", "published_at", "created_at", "updated_at")
VALUES ('11111111-1111-4111-8111-666666666666', true, 50, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO UPDATE SET "active" = EXCLUDED."active", "priority" = EXCLUDED."priority", "published_at" = EXCLUDED."published_at", "updated_at" = CURRENT_TIMESTAMP;

INSERT INTO "blessing_message_translations" ("id", "message_id", "locale", "title", "body", "scripture_reference", "created_at", "updated_at") VALUES
('26666666-6666-4666-8666-111111111111', '11111111-1111-4111-8111-666666666666', 'en', 'Courage and Faith', 'Have I not commanded you? Be strong and courageous. Do not be afraid; do not be discouraged, for the Lord your God will be with you wherever you go.', 'Joshua 1:9', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('36666666-6666-4666-8666-111111111111', '11111111-1111-4111-8111-666666666666', 'es', 'Fuerza y Valentía', 'Mira que te mando que te esfuerces y seas valiente; no temas ni desmayes, porque Jehová tu Dios estará contigo en dondequiera que vayas.', 'Josué 1:9', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('46666666-6666-4666-8666-111111111111', '11111111-1111-4111-8111-666666666666', 'pt', 'Coragem e Fé', 'Não fui eu que ordenei a você? Seja forte e corajoso! Não se apavore nem desanime, pois o Senhor, o seu Deus, estará com você por onde você andar.', 'Josué 1:9', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('56666666-6666-4666-8666-111111111111', '11111111-1111-4111-8111-666666666666', 'ko', '강하고 담대하라', '내가 네게 명령한 것이 아니냐 강하고 담대하라 두려워하지 말며 놀라지 말라 네가 어디로 가든지 네 하나님 여호와가 너와 함께 하느니라 하시니라.', '여호수아 1:9', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('66666666-6666-4666-8666-111111111111', '11111111-1111-4111-8111-666666666666', 'de', 'Sei getrost und unverzagt', 'Siehe, ich habe dir geboten, dass du getrost und unverzagt seist. Lass dir nicht grauen und entsetze dich nicht; denn der HERR, dein Gott, ist mit dir in allem, was du tun wirst.', 'Josua 1,9', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("message_id", "locale") DO UPDATE SET "title" = EXCLUDED."title", "body" = EXCLUDED."body", "scripture_reference" = EXCLUDED."scripture_reference", "updated_at" = CURRENT_TIMESTAMP;

-- 7. Romanos 8:28
INSERT INTO "blessing_messages" ("id", "active", "priority", "published_at", "created_at", "updated_at")
VALUES ('11111111-1111-4111-8111-777777777777', true, 50, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO UPDATE SET "active" = EXCLUDED."active", "priority" = EXCLUDED."priority", "published_at" = EXCLUDED."published_at", "updated_at" = CURRENT_TIMESTAMP;

INSERT INTO "blessing_message_translations" ("id", "message_id", "locale", "title", "body", "scripture_reference", "created_at", "updated_at") VALUES
('27777777-7777-4777-8777-111111111111', '11111111-1111-4111-8111-777777777777', 'en', 'Purpose and Calling', 'And we know that in all things God works for the good of those who love him, who have been called according to his purpose.', 'Romans 8:28', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('37777777-7777-4777-8777-111111111111', '11111111-1111-4111-8111-777777777777', 'es', 'Propósito Divino', 'Y sabemos que a los que aman a Dios, todas las cosas les ayudan a bien, esto es, a los que conforme a su propósito son llamados.', 'Romanos 8:28', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('47777777-7777-4777-8777-111111111111', '11111111-1111-4111-8111-777777777777', 'pt', 'Propósito Divino', 'Sabemos que Deus age em todas as coisas para o bem daqueles que o amam, dos que foram chamados de acordo com o seu propósito.', 'Romanos 8:28', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('57777777-7777-4777-8777-111111111111', '11111111-1111-4111-8111-777777777777', 'ko', '합력하여 선을 이루심', '우리가 알거니와 하나님을 사랑하는 자 곧 그의 뜻대로 부르심을 입은 자들에게는 모든 것이 합력하여 선을 이루느니라.', '로마서 8:28', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('67777777-7777-4777-8777-111111111111', '11111111-1111-4111-8111-777777777777', 'de', 'Gottes Heilsplan', 'Wir wissen aber, dass denen, die Gott lieben, alle Dinge zum Besten dienen, denen, die nach seinem Ratschluss berufen sind.', 'Römer 8,28', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("message_id", "locale") DO UPDATE SET "title" = EXCLUDED."title", "body" = EXCLUDED."body", "scripture_reference" = EXCLUDED."scripture_reference", "updated_at" = CURRENT_TIMESTAMP;
