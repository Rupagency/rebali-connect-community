
-- Disable only the listing limit triggers
ALTER TABLE public.listings DISABLE TRIGGER check_listing_limit_trigger;
ALTER TABLE public.listings DISABLE TRIGGER enforce_listing_limit;

-- Insert diverse listings across all missing categories
INSERT INTO public.listings (id, seller_id, category, subcategory, title_original, description_original, lang_original, price, currency, location_area, condition, views_count, status, created_at)
VALUES
  ('b0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'emploi', 'offres_emploi', 'Villa Manager - Canggu Area', 'Seeking experienced villa manager for luxury 5-bedroom property. Must speak English fluently. Housing provided.', 'en', 15000000, 'IDR', 'canggu', 'new', 34, 'active', now() - interval '1 day'),
  ('b0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'emploi', 'offres_emploi', 'Barista / Coffee Specialist', 'Passionate barista needed for artisan coffee shop in Ubud. Latte art skills required.', 'en', 6000000, 'IDR', 'ubud', 'new', 22, 'active', now() - interval '2 days'),
  ('b0000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', 'emploi', 'offres_emploi', 'Digital Marketing Manager - Remote Bali', 'Growing e-commerce brand seeks marketing manager. SEO, social media, paid ads experience required.', 'en', 25000000, 'IDR', 'seminyak', 'new', 56, 'active', now() - interval '3 days'),
  ('b0000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000002', 'emploi', 'formations_pro', 'Surf Instructor - Certified ISA', 'ISA certified surf instructor wanted for busy surf school. Board and wetsuit provided.', 'en', 8000000, 'IDR', 'uluwatu', 'new', 45, 'active', now() - interval '1 day'),
  ('b0000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000003', 'mode', 'vetements', 'Vintage Levis 501 Jeans - W32', 'Authentic vintage Levis 501 jeans, great fade. Waist 32, length 34.', 'en', 850000, 'IDR', 'seminyak', 'good', 18, 'active', now() - interval '2 days'),
  ('b0000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000003', 'mode', 'accessoires_bagagerie', 'Fjallraven Kanken Backpack - Navy', 'Original Fjallraven Kanken backpack, barely used.', 'en', 650000, 'IDR', 'ubud', 'like_new', 12, 'active', now() - interval '3 days'),
  ('b0000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000003', 'electronique', 'ordinateurs', 'MacBook Pro M2 14 inch - 16GB/512GB', 'MacBook Pro M2, Space Gray. 16GB RAM, 512GB SSD. Battery cycle count: 45.', 'en', 18500000, 'IDR', 'canggu', 'like_new', 78, 'active', now() - interval '1 day'),
  ('b0000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000004', 'electronique', 'telephones_connectes', 'iPhone 15 Pro 256GB - Natural Titanium', 'iPhone 15 Pro, 256GB. Purchased in Singapore. AppleCare+ until 2027.', 'en', 14000000, 'IDR', 'denpasar', 'like_new', 63, 'active', now() - interval '2 days'),
  ('b0000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000004', 'loisirs', 'sport_plein_air', 'Surfboard 6ft2 Shortboard - Channel Islands', 'Channel Islands Flyer. Futures fins included. Great for intermediate surfers.', 'en', 4500000, 'IDR', 'canggu', 'good', 35, 'active', now() - interval '4 days'),
  ('b0000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000004', 'loisirs', 'velos', 'Mountain Bike Giant Talon 29er', 'Giant Talon 2, 29 inch wheels, size M. Shimano Deore. Perfect for Bali trails.', 'en', 7500000, 'IDR', 'ubud', 'good', 28, 'active', now() - interval '3 days'),
  ('b0000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', 'animaux', 'accessoires_animaux', 'Premium Dog Crate + Bed - Large', 'Heavy duty dog crate, large size. Includes memory foam bed insert.', 'en', 1200000, 'IDR', 'sanur', 'like_new', 15, 'active', now() - interval '5 days'),
  ('b0000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000002', 'famille', 'equip_bebe', 'Stokke Tripp Trapp High Chair - White', 'Stokke Tripp Trapp with baby set and cushion. Grows with your child.', 'en', 2800000, 'IDR', 'sanur', 'good', 19, 'active', now() - interval '4 days'),
  ('b0000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000001', 'famille', 'vetements_bebe', 'Baby Clothes Bundle 0-12 months (50+ pieces)', 'Huge bundle of quality baby clothes. Mix of brands. Most worn only once.', 'en', 500000, 'IDR', 'denpasar', 'good', 24, 'active', now() - interval '6 days'),
  ('b0000000-0000-0000-0000-000000000014', '00000000-0000-0000-0000-000000000004', 'vacances', 'locations_saisonnieres', 'Beachfront Bungalow - Nusa Penida Weekly', 'Charming beachfront bungalow with stunning ocean views. 1 bedroom, private terrace.', 'en', 3500000, 'IDR', 'nusa_penida', 'good', 52, 'active', now() - interval '2 days');

-- Re-enable triggers
ALTER TABLE public.listings ENABLE TRIGGER check_listing_limit_trigger;
ALTER TABLE public.listings ENABLE TRIGGER enforce_listing_limit;

-- Insert translations (FR + EN)
INSERT INTO public.listing_translations (listing_id, lang, title, description, is_machine) VALUES
  ('b0000000-0000-0000-0000-000000000001', 'en', 'Villa Manager - Canggu Area', 'Seeking experienced villa manager for luxury 5-bedroom property.', true),
  ('b0000000-0000-0000-0000-000000000001', 'fr', 'Gérant de Villa - Secteur Canggu', 'Recherche gérant expérimenté pour villa de luxe 5 chambres.', true),
  ('b0000000-0000-0000-0000-000000000002', 'en', 'Barista / Coffee Specialist', 'Passionate barista needed for artisan coffee shop in Ubud.', true),
  ('b0000000-0000-0000-0000-000000000002', 'fr', 'Barista / Spécialiste Café', 'Barista passionné recherché pour café artisanal à Ubud.', true),
  ('b0000000-0000-0000-0000-000000000003', 'en', 'Digital Marketing Manager - Remote Bali', 'Growing e-commerce brand seeks marketing manager.', true),
  ('b0000000-0000-0000-0000-000000000003', 'fr', 'Responsable Marketing Digital - Télétravail Bali', 'Marque e-commerce en croissance recherche responsable marketing.', true),
  ('b0000000-0000-0000-0000-000000000004', 'en', 'Surf Instructor - Certified ISA', 'ISA certified surf instructor wanted for busy surf school.', true),
  ('b0000000-0000-0000-0000-000000000004', 'fr', 'Moniteur de Surf - Certifié ISA', 'Moniteur de surf certifié ISA recherché pour école de surf.', true),
  ('b0000000-0000-0000-0000-000000000005', 'en', 'Vintage Levis 501 Jeans - W32', 'Authentic vintage Levis 501 jeans, great fade.', true),
  ('b0000000-0000-0000-0000-000000000005', 'fr', 'Jean Levis 501 Vintage - T32', 'Jean Levis 501 vintage authentique, beau délavé.', true),
  ('b0000000-0000-0000-0000-000000000006', 'en', 'Fjallraven Kanken Backpack - Navy', 'Original Fjallraven Kanken backpack, barely used.', true),
  ('b0000000-0000-0000-0000-000000000006', 'fr', 'Sac à dos Fjallraven Kanken - Marine', 'Sac à dos Fjallraven Kanken original, très peu utilisé.', true),
  ('b0000000-0000-0000-0000-000000000007', 'en', 'MacBook Pro M2 14 inch - 16GB/512GB', 'MacBook Pro M2, 14 inch, Space Gray.', true),
  ('b0000000-0000-0000-0000-000000000007', 'fr', 'MacBook Pro M2 14 pouces - 16Go/512Go', 'MacBook Pro M2, 14 pouces, Gris Sidéral.', true),
  ('b0000000-0000-0000-0000-000000000008', 'en', 'iPhone 15 Pro 256GB - Natural Titanium', 'iPhone 15 Pro, 256GB, Natural Titanium.', true),
  ('b0000000-0000-0000-0000-000000000008', 'fr', 'iPhone 15 Pro 256Go - Titane Naturel', 'iPhone 15 Pro, 256Go, Titane Naturel.', true),
  ('b0000000-0000-0000-0000-000000000009', 'en', 'Surfboard 6ft2 Shortboard - Channel Islands', 'Channel Islands Flyer. Futures fins included.', true),
  ('b0000000-0000-0000-0000-000000000009', 'fr', 'Planche de Surf 6ft2 - Channel Islands', 'Channel Islands Flyer. Ailerons Futures inclus.', true),
  ('b0000000-0000-0000-0000-000000000010', 'en', 'Mountain Bike Giant Talon 29er', 'Giant Talon 2, 29 inch wheels, size M.', true),
  ('b0000000-0000-0000-0000-000000000010', 'fr', 'VTT Giant Talon 29 pouces', 'Giant Talon 2, roues 29 pouces, taille M.', true),
  ('b0000000-0000-0000-0000-000000000011', 'en', 'Premium Dog Crate + Bed - Large', 'Heavy duty dog crate, large size.', true),
  ('b0000000-0000-0000-0000-000000000011', 'fr', 'Cage pour Chien Premium + Coussin - Grande', 'Cage robuste pour chien, grande taille.', true),
  ('b0000000-0000-0000-0000-000000000012', 'en', 'Stokke Tripp Trapp High Chair - White', 'Stokke Tripp Trapp with baby set and cushion.', true),
  ('b0000000-0000-0000-0000-000000000012', 'fr', 'Chaise Haute Stokke Tripp Trapp - Blanche', 'Stokke Tripp Trapp avec kit bébé et coussin.', true),
  ('b0000000-0000-0000-0000-000000000013', 'en', 'Baby Clothes Bundle 0-12 months (50+ pieces)', 'Huge bundle of quality baby clothes.', true),
  ('b0000000-0000-0000-0000-000000000013', 'fr', 'Lot Vêtements Bébé 0-12 mois (50+ pièces)', 'Énorme lot de vêtements bébé de qualité.', true),
  ('b0000000-0000-0000-0000-000000000014', 'en', 'Beachfront Bungalow - Nusa Penida Weekly', 'Charming beachfront bungalow with stunning ocean views.', true),
  ('b0000000-0000-0000-0000-000000000014', 'fr', 'Bungalow Front de Mer - Nusa Penida à la Semaine', 'Charmant bungalow en bord de mer avec vue océan.', true);
