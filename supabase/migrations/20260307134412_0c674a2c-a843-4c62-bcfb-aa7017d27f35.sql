UPDATE profiles SET phone_verified = false, whatsapp = NULL WHERE id = 'e9766ca2-e534-4249-957b-93764f00dc68';
DELETE FROM phone_verifications WHERE user_id = 'e9766ca2-e534-4249-957b-93764f00dc68';