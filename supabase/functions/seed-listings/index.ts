import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ── Realistic data pools ──────────────────────────────────────────────

const FAKE_USERS = [
  { name: "Sophie Martin", avatar: "https://randomuser.me/api/portraits/women/12.jpg" },
  { name: "Lucas Dubois", avatar: "https://randomuser.me/api/portraits/men/15.jpg" },
  { name: "Emma Laurent", avatar: "https://randomuser.me/api/portraits/women/22.jpg" },
  { name: "Hugo Bernard", avatar: "https://randomuser.me/api/portraits/men/32.jpg" },
  { name: "Chloé Moreau", avatar: "https://randomuser.me/api/portraits/women/35.jpg" },
  { name: "Nathan Petit", avatar: "https://randomuser.me/api/portraits/men/44.jpg" },
  { name: "Léa Roux", avatar: "https://randomuser.me/api/portraits/women/45.jpg" },
  { name: "Théo Garcia", avatar: "https://randomuser.me/api/portraits/men/52.jpg" },
  { name: "Manon Leroy", avatar: "https://randomuser.me/api/portraits/women/55.jpg" },
  { name: "Jules Fournier", avatar: "https://randomuser.me/api/portraits/men/62.jpg" },
  { name: "Inès Girard", avatar: "https://randomuser.me/api/portraits/women/65.jpg" },
  { name: "Raphaël Bonnet", avatar: "https://randomuser.me/api/portraits/men/72.jpg" },
  { name: "Camille Dupont", avatar: "https://randomuser.me/api/portraits/women/75.jpg" },
  { name: "Arthur Mercier", avatar: "https://randomuser.me/api/portraits/men/82.jpg" },
  { name: "Jade Lambert", avatar: "https://randomuser.me/api/portraits/women/85.jpg" },
];

const LOCATIONS = [
  "canggu","ubud","seminyak","uluwatu","denpasar","sanur","nusa_dua",
  "kuta","jimbaran","tabanan","singaraja","amed","munduk","sidemen",
  "nusa_penida","nusa_lembongan","mataram","senggigi","kuta_lombok",
  "gili_trawangan","gili_air",
];

const CURRENCIES = ["IDR","USD","EUR"] as const;

// Unsplash image pools per category
const IMAGES: Record<string, string[]> = {
  emploi: [
    "photo-1521737711867-e3b97375f902","photo-1507679799987-c73779587ccf","photo-1454165804606-c3d57bc86b40",
    "photo-1573497019940-1c28c88b4f3e","photo-1551836022-d5d88e9218df","photo-1521791136064-7986c2920216",
    "photo-1560472355-536de3962603","photo-1542744173-8e7e53415bb0","photo-1600880292203-757bb62b4baf",
  ],
  vehicules: [
    "photo-1558618666-fcd25c85f82e","photo-1449824913935-59a10b8d2000","photo-1558981806-ec527fa84c39",
    "photo-1568772585407-9361f9bf3a87","photo-1571607388263-1044f9ea01dd","photo-1609630875171-b1321377ee65",
    "photo-1558980394-4c7c9299fe96","photo-1622185135505-2d795003994a","photo-1591637333184-19aa84b3e01f",
    "photo-1525160354320-d8e92641c563","photo-1547549082-6bc09f2049ae","photo-1611241443322-b5734bb44f2b",
  ],
  immobilier: [
    "photo-1570129477492-45c003edd2be","photo-1600596542815-ffad4c1539a9","photo-1600585154340-be6161a56a0c",
    "photo-1613490493576-7fde63acd811","photo-1580587771525-78b9dba3b914","photo-1512917774080-9991f1c4c750",
    "photo-1582268611958-ebfd161ef9cf","photo-1560448204-e02f11c3d0e2","photo-1600047509807-ba8f99d2cdde",
    "photo-1564013799919-ab600027ffc6","photo-1505691723518-36a5ac3be353","photo-1600566753190-17f0baa2a6c3",
  ],
  mode: [
    "photo-1445205170230-053b83016050","photo-1558618666-fcd25c85f82e","photo-1523381210434-271e8be1f52b",
    "photo-1441984904996-e0b6ba687e04","photo-1515886657613-9f3515b0c78f","photo-1469334031218-e382a71b716b",
    "photo-1558171813-01ed3d751272","photo-1490481651871-ab68de25d43d","photo-1551488831-00ddcb6c6bd3",
  ],
  vacances: [
    "photo-1507525428034-b723cf961d3e","photo-1540541338287-41700207dee6","photo-1506929562872-bb421503ef21",
    "photo-1501785888041-af3ef285b470","photo-1476514525535-07fb3b4ae5f1","photo-1530841377377-3ff06c0ca713",
  ],
  loisirs: [
    "photo-1511882150382-421056c89033","photo-1493711662062-fa541adb3fc8","photo-1550745165-9bc0b252726f",
    "photo-1546519638-68e109498ffc","photo-1498050108023-c5249f4df085","photo-1485546246426-74dc88dec4d9",
    "photo-1459411552884-841db9b3cc2a","photo-1517649763962-0c623066013b","photo-1544367567-0f2fcb009e0b",
  ],
  animaux: [
    "photo-1587300003388-59208cc962cb","photo-1543466835-00a7907e9de1","photo-1574158622682-e40e69881006",
    "photo-1548199973-03cce0bbc87b","photo-1583511655857-d19b40a7a54e","photo-1425082661705-1834bfd09dca",
    "photo-1537151625747-768eb6cf92b2","photo-1592194996308-7b43878e84a6","photo-1561037404-61cd46aa615b",
  ],
  electronique: [
    "photo-1468495244123-6c6c332eeece","photo-1517694712202-14dd9538aa97","photo-1496181133206-80ce9b88a853",
    "photo-1505740420928-5e560c06d30e","photo-1511707171634-5f897ff02aa9","photo-1593642632559-0c6d3fc62b89",
    "photo-1546868871-af0de0ae72be","photo-1585060544812-6b45742d762f","photo-1588872657578-7efd1f1555ed",
  ],
  services: [
    "photo-1600518464441-9154a4dea21b","photo-1581578731548-c64695cc6952","photo-1558618666-fcd25c85f82e",
    "photo-1573497019940-1c28c88b4f3e","photo-1560472355-536de3962603","photo-1544027993-83a4c7e7647a",
  ],
  famille: [
    "photo-1515488042361-ee00e0ddd4e4","photo-1596461404969-9ae70f2830c1","photo-1544367567-0f2fcb009e0b",
    "photo-1555252333-9f8e92e65df9","photo-1606092195730-5d7b9af1efc5","photo-1503454537195-1dcabb73ffb9",
  ],
  maison_jardin: [
    "photo-1555041469-a586c61ea9bc","photo-1538688525198-9b88f6f53126","photo-1583847268964-b28dc8f51f92",
    "photo-1616486338812-3dadae4b4ace","photo-1524758631624-e2822e304c36","photo-1505691938895-1758d7feb511",
    "photo-1556228453-efd6c1ff04f6","photo-1493809842364-78817add7ffb","photo-1507652313519-d4e9174996dd",
  ],
  materiel_pro: [
    "photo-1497366216548-37526070297c","photo-1504307651254-35680f356dfd","photo-1581094794329-c8112a89af12",
    "photo-1558618666-fcd25c85f82e","photo-1486312338219-ce68d2c6f44d","photo-1581093458791-9f3c3900df4b",
  ],
  divers: [
    "photo-1472851294608-062f824d29cc","photo-1553729459-afe8f2e2ed65","photo-1505740420928-5e560c06d30e",
    "photo-1526170375885-4d8ecf77b99f","photo-1513542789411-b6a5d4f31634","photo-1558618666-fcd25c85f82e",
  ],
};

// ── Listings data per category ────────────────────────────────────────

interface ListingTemplate {
  title: string;
  desc: string;
  priceRange: [number, number];
  currency?: string;
  condition?: string;
  subcategory?: string;
  listing_type?: string;
  extra_fields?: Record<string, string | number>;
}

const LISTINGS: Record<string, ListingTemplate[]> = {
  emploi: [
    { title: "Chef cuisinier - Restaurant français Seminyak", desc: "Recherche chef expérimenté en cuisine française pour notre restaurant en bord de mer. CDI, salaire attractif + logement.", priceRange: [15000000, 25000000], subcategory: "offres_emploi", extra_fields: { contract_type: "cdi", job_sector: "restauration", work_time: "full_time" } },
    { title: "Professeur de yoga certifié", desc: "Studio de yoga à Ubud recherche professeur certifié (Hatha/Vinyasa). Temps partiel, horaires flexibles. Expérience requise 2 ans minimum.", priceRange: [8000000, 15000000], subcategory: "offres_emploi", extra_fields: { contract_type: "freelance", job_sector: "tourisme", work_time: "part_time" } },
    { title: "Développeur web full-stack remote", desc: "Startup tech basée à Canggu recrute un dev full-stack (React/Node). Full remote possible. Stack moderne, équipe internationale.", priceRange: [20000000, 45000000], subcategory: "offres_emploi", extra_fields: { contract_type: "cdi", job_sector: "informatique", work_time: "full_time" } },
    { title: "Barista expérimenté - Café spécialité", desc: "Coffee shop specialty à Canggu recherche barista passionné. Connaissance des méthodes douces (V60, Chemex). Formation assurée.", priceRange: [5000000, 8000000], subcategory: "offres_emploi", extra_fields: { contract_type: "cdd", job_sector: "restauration", work_time: "full_time" } },
    { title: "Community manager bilingue FR/EN", desc: "Agence de communication recrute CM bilingue pour gérer les réseaux sociaux de clients internationaux. Maîtrise Canva et Meta Ads.", priceRange: [10000000, 18000000], subcategory: "offres_emploi", extra_fields: { contract_type: "freelance", job_sector: "communication", work_time: "full_time" } },
    { title: "Gérant de villa - Ubud", desc: "Société de gestion de villas recherche gérant bilingue pour superviser un portefeuille de 5 villas de luxe à Ubud.", priceRange: [12000000, 20000000], subcategory: "offres_emploi", extra_fields: { contract_type: "cdi", job_sector: "immobilier", work_time: "full_time" } },
    { title: "Moniteur de surf - Plage de Kuta", desc: "École de surf reconnue cherche moniteur certifié ISA/BSA. Anglais courant requis. Logement fourni.", priceRange: [7000000, 12000000], subcategory: "offres_emploi", extra_fields: { contract_type: "cdd", job_sector: "tourisme", work_time: "full_time" } },
    { title: "Photographe/Vidéaste freelance", desc: "Recherche photographe-vidéaste pour shooting immobilier et lifestyle. Drone + post-prod. Portfolio requis.", priceRange: [15000000, 30000000], subcategory: "offres_emploi", extra_fields: { contract_type: "freelance", job_sector: "communication", work_time: "part_time" } },
    { title: "Formation marketing digital - 3 mois", desc: "Formation complète en marketing digital : SEO, Google Ads, Meta Ads, Analytics. Certification à la clé. 3 sessions/semaine.", priceRange: [5000000, 10000000], subcategory: "formations_pro" },
    { title: "Cours de cuisine balinaise - Pro", desc: "Formation professionnelle cuisine balinaise authentique. 40h de cours pratiques. Idéal pour chefs souhaitant enrichir leur carte.", priceRange: [3000000, 7000000], subcategory: "formations_pro" },
  ],
  vehicules: [
    { title: "Honda PCX 160 - 2023 - Comme neuf", desc: "Honda PCX 160cc, année 2023, 4.200 km. Entretien Honda officiel. Pneus neufs, batterie neuve. Papiers en règle.", priceRange: [22000000, 28000000], condition: "like_new", subcategory: "motos", extra_fields: { brand: "Honda", model: "PCX 160", year: 2023, mileage: 4200 } },
    { title: "Yamaha NMAX 155 Connected - 2024", desc: "NMAX 155 ABS Connected dernière génération. GPS intégré, Bluetooth. 1.800 km seulement. Garantie constructeur.", priceRange: [28000000, 35000000], condition: "like_new", subcategory: "motos", extra_fields: { brand: "Yamaha", model: "NMAX 155", year: 2024, mileage: 1800 } },
    { title: "Toyota Avanza 2021 - 7 places", desc: "Toyota Avanza 1.5 G, 7 places, boîte auto. Climatisation double zone. Parfait état, entretien régulier.", priceRange: [180000000, 220000000], condition: "good", subcategory: "voitures", extra_fields: { brand: "Toyota", model: "Avanza 1.5 G", year: 2021, mileage: 35000, fuel_type: "essence" } },
    { title: "Suzuki Jimny 2022 - 4x4", desc: "Suzuki Jimny 4WD, couleur jungle green. 15.000 km. Idéal pour explorer Bali hors des sentiers battus.", priceRange: [320000000, 380000000], condition: "like_new", subcategory: "voitures", extra_fields: { brand: "Suzuki", model: "Jimny", year: 2022, mileage: 15000, fuel_type: "essence" } },
    { title: "Vespa Primavera 150 - Édition spéciale", desc: "Vespa Primavera 150cc édition 75e anniversaire. Couleur exclusive. 3.500 km. État impeccable.", priceRange: [35000000, 45000000], condition: "like_new", subcategory: "motos", extra_fields: { brand: "Vespa", model: "Primavera 150", year: 2023, mileage: 3500 } },
    { title: "Honda Vario 125 - Idéal quotidien", desc: "Honda Vario 125cc, fiable et économique. 18.000 km, entretien suivi. Parfait pour les trajets quotidiens.", priceRange: [12000000, 16000000], condition: "good", subcategory: "motos", extra_fields: { brand: "Honda", model: "Vario 125", year: 2021, mileage: 18000 } },
    { title: "Kawasaki Ninja 250 - Sportive", desc: "Kawasaki Ninja 250 ABS. Échappement Akrapovic. 8.000 km. Couleur vert Kawasaki racing.", priceRange: [45000000, 55000000], condition: "good", subcategory: "motos", extra_fields: { brand: "Kawasaki", model: "Ninja 250", year: 2022, mileage: 8000 } },
    { title: "Daihatsu Terios 2020 - SUV compact", desc: "Terios R Deluxe, boîte auto. Caméra de recul, écran tactile. 40.000 km. Idéal famille.", priceRange: [170000000, 200000000], condition: "good", subcategory: "voitures", extra_fields: { brand: "Daihatsu", model: "Terios R Deluxe", year: 2020, mileage: 40000, fuel_type: "essence" } },
    { title: "Casque Shoei X-Spirit III - Taille M", desc: "Casque racing Shoei X-Spirit III, taille M. Visière fumée incluse. Très bon état.", priceRange: [4000000, 6000000], condition: "good", subcategory: "equip_moto" },
    { title: "Porte-vélos pour voiture - 3 vélos", desc: "Porte-vélos attelage pour 3 vélos. Pliable, verrouillable. Compatible tous véhicules avec attelage.", priceRange: [2500000, 4000000], condition: "good", subcategory: "equip_auto" },
    { title: "Honda Scoopy 2023 - Rose pastel", desc: "Scoopy Prestige 2023, couleur rose pastel. 2.100 km. Parfait pour les filles. Premier propriétaire.", priceRange: [18000000, 22000000], condition: "like_new", subcategory: "motos", extra_fields: { brand: "Honda", model: "Scoopy Prestige", year: 2023, mileage: 2100 } },
    { title: "Mitsubishi Pajero Sport 2019 - Diesel", desc: "Pajero Sport Dakar 4x4, diesel, boîte auto. 55.000 km. Cuir, toit ouvrant. Véhicule familial puissant.", priceRange: [350000000, 420000000], condition: "good", subcategory: "voitures", extra_fields: { brand: "Mitsubishi", model: "Pajero Sport Dakar", year: 2019, mileage: 55000, fuel_type: "diesel" } },
  ],
  immobilier: [
    { title: "Villa 3 chambres avec piscine - Canggu", desc: "Magnifique villa tropicale, 3 chambres, 3 SDB, piscine privée, jardin. Cuisine équipée, wifi fibre. Quartier calme proche Echo Beach.", priceRange: [35000000, 55000000], subcategory: "locations", listing_type: "rent", extra_fields: { property_type: "villa", surface: 250, rooms: 3, furnished: "yes" } },
    { title: "Appartement moderne 2ch - Seminyak", desc: "Apt rénové, 2 chambres, salon, cuisine ouverte. Rooftop partagé avec vue. À 5 min à pied de la plage.", priceRange: [18000000, 28000000], subcategory: "locations", listing_type: "rent", extra_fields: { property_type: "apartment", surface: 85, rooms: 2, furnished: "yes" } },
    { title: "Terrain 500m² - Ubud avec vue rizière", desc: "Parcelle de 500m² avec vue imprenable sur les rizières. Certificat freehold. Accès route bitumée. Eau et électricité.", priceRange: [800000000, 1200000000], subcategory: "ventes_immobilieres", listing_type: "sale", extra_fields: { property_type: "land", surface: 500 } },
    { title: "Colocation villa 4ch - Berawa", desc: "1 chambre dispo dans villa partagée. Piscine, coworking, wifi rapide. Communauté internationale. Tout inclus.", priceRange: [8000000, 12000000], subcategory: "colocations", listing_type: "rent", extra_fields: { property_type: "room", surface: 25, rooms: 1, furnished: "yes" } },
    { title: "Villa luxe 4ch - Vue océan Uluwatu", desc: "Villa exceptionnelle, 4 chambres, infinity pool, vue 180° océan. Matériaux nobles, architecture contemporaine balinaise.", priceRange: [75000000, 120000000], subcategory: "locations", listing_type: "rent", extra_fields: { property_type: "villa", surface: 400, rooms: 4, furnished: "yes" } },
    { title: "Studio meublé - Sanur centre", desc: "Studio 35m², entièrement meublé et équipé. Résidence sécurisée avec piscine. Proche marché et restaurants.", priceRange: [6000000, 9000000], subcategory: "locations", listing_type: "rent", extra_fields: { property_type: "apartment", surface: 35, rooms: 1, furnished: "yes" } },
    { title: "Local commercial 80m² - Kuta", desc: "Local commercial bien situé, 80m², grande vitrine. Idéal restaurant, boutique ou café. Bail longue durée possible.", priceRange: [25000000, 40000000], subcategory: "bureaux_commerces", listing_type: "rent", extra_fields: { property_type: "commercial", surface: 80 } },
    { title: "Maison traditionnelle rénovée - Ubud", desc: "Joglo balinais authentique, entièrement rénové. 3 chambres, jardin tropical 800m². Calme absolu.", priceRange: [2500000000, 3500000000], subcategory: "ventes_immobilieres", listing_type: "sale", extra_fields: { property_type: "house", surface: 180, rooms: 3, furnished: "yes" } },
    { title: "Villa neuve 2ch - Tabanan rice field", desc: "Villa neuve, design minimaliste. 2 chambres, piscine, vue rizière. Leasehold 25 ans renouvelable.", priceRange: [1800000000, 2500000000], subcategory: "ventes_immobilieres", listing_type: "sale", extra_fields: { property_type: "villa", surface: 150, rooms: 2, furnished: "yes" } },
    { title: "Chambre privée chez l'habitant - Sidemen", desc: "Chambre spacieuse avec SDB privée dans maison familiale. Petit-déjeuner inclus. Vue montagne. Idéal séjour authentique.", priceRange: [3000000, 5000000], subcategory: "locations", listing_type: "rent", extra_fields: { property_type: "room", surface: 20, rooms: 1, furnished: "yes" } },
    { title: "Penthouse 3ch - Seminyak walk to beach", desc: "Penthouse exceptionnel, 3 chambres, terrasse 60m², vue mer. Résidence premium avec gym et rooftop bar.", priceRange: [55000000, 85000000], subcategory: "locations", listing_type: "rent", extra_fields: { property_type: "apartment", surface: 180, rooms: 3, furnished: "yes" } },
  ],
  mode: [
    { title: "Robe Zara été - Taille M", desc: "Robe longue fleurie Zara, portée 2 fois. Taille M (38). Tissu léger, parfait pour le climat tropical.", priceRange: [250000, 400000], condition: "like_new", subcategory: "vetements", extra_fields: { brand: "Zara", size: "M" } },
    { title: "Sneakers Nike Air Max 90 - 42", desc: "Nike Air Max 90, pointure 42. Coloris blanc/noir. Très bon état, semelle quasi intacte.", priceRange: [800000, 1200000], condition: "good", subcategory: "chaussures", extra_fields: { brand: "Nike", size: "42" } },
    { title: "Sac à main Louis Vuitton Neverfull MM", desc: "Authentique LV Neverfull MM, toile monogram. Acheté à Paris, facture disponible. Très bon état.", priceRange: [12000000, 18000000], condition: "good", subcategory: "accessoires_bagagerie", extra_fields: { brand: "Louis Vuitton" } },
    { title: "Montre Casio G-Shock GA-2100", desc: "G-Shock CasiOak noire, modèle GA-2100. Boîte et papiers. Portée 3 mois.", priceRange: [1200000, 1800000], condition: "like_new", subcategory: "montres_bijoux" },
    { title: "Lot vêtements homme taille L", desc: "Lot de 15 pièces : 5 t-shirts, 3 chemises, 4 shorts, 3 pantalons. Marques variées (H&M, Uniqlo, Zara).", priceRange: [500000, 800000], condition: "good", subcategory: "vetements", extra_fields: { brand: "H&M", size: "L" } },
    { title: "Lunettes Ray-Ban Aviator originales", desc: "Ray-Ban Aviator Classic, verres polarisés, monture dorée. Étui et chiffon inclus. Comme neuves.", priceRange: [1500000, 2200000], condition: "like_new", subcategory: "accessoires_bagagerie", extra_fields: { brand: "Ray-Ban" } },
    { title: "Bikini Seafolly - Neuf avec étiquette", desc: "Bikini triangle Seafolly, taille S. Motif tropical. Jamais porté, étiquettes encore attachées.", priceRange: [400000, 600000], condition: "new", subcategory: "vetements", extra_fields: { size: "S" } },
    { title: "Chemise batik traditionnelle - Fait main", desc: "Chemise batik fait main à Ubud. Coton premium, motif traditionnel balinais. Taille XL. Neuve.", priceRange: [350000, 550000], condition: "new", subcategory: "vetements", extra_fields: { size: "XL" } },
  ],
  vacances: [
    { title: "Villa Nusa Penida - Vue falaise 180°", desc: "Villa de rêve à Nusa Penida, 2 chambres, infinity pool surplombant l'océan. Staff complet. Min 3 nuits.", priceRange: [2500000, 4500000], subcategory: "locations_saisonnieres", listing_type: "rent", extra_fields: { property_type: "villa", rooms: 2 } },
    { title: "Bungalow plage - Amed snorkeling", desc: "Bungalow pieds dans l'eau à Amed. 1 chambre, terrasse avec vue mer. Spot snorkeling à 20m. Petit-déj inclus.", priceRange: [800000, 1500000], subcategory: "locations_saisonnieres", listing_type: "rent" },
    { title: "Villa familiale Sanur - 4 chambres", desc: "Grande villa familiale à Sanur, 4 chambres, piscine sécurisée enfants, jardin. Proche école française.", priceRange: [3500000, 5500000], subcategory: "locations_saisonnieres", listing_type: "rent" },
    { title: "Cabane dans les rizières - Tegallalang", desc: "Expérience unique : cabane en bambou au milieu des rizières. Confort moderne, déco bohème. Couple uniquement.", priceRange: [1200000, 2000000], subcategory: "locations_saisonnieres", listing_type: "rent" },
    { title: "Glamping luxe - Sidemen valley", desc: "Tente safari luxe avec SDB privée, vue Agung. Petit-déjeuner bio inclus. Trek et activités organisées.", priceRange: [1500000, 2500000], subcategory: "locations_saisonnieres", listing_type: "rent" },
    { title: "Maison de plage Gili Air - Front de mer", desc: "Maison traditionnelle face à la mer sur Gili Air. 2 chambres, hamacs, kayak inclus. Paradis tropical.", priceRange: [1800000, 3000000], subcategory: "locations_saisonnieres", listing_type: "rent" },
  ],
  loisirs: [
    { title: "Planche de surf 6'2 - Shortboard", desc: "Shortboard 6'2, shaper local. Mousse EPS, résine époxy. 3 dérives FCS II incluses. Utilisée 6 mois.", priceRange: [2500000, 4000000], condition: "good", subcategory: "sport_plein_air" },
    { title: "Guitare acoustique Yamaha F310", desc: "Yamaha F310, excellente guitare d'étude. Table épicéa, fond palissandre. Son chaud et équilibré. Housse incluse.", priceRange: [1200000, 1800000], condition: "good", subcategory: "instruments_musique" },
    { title: "Collection manga One Piece 1-50", desc: "50 premiers tomes de One Piece en français. Excellent état, quelques traces de lecture. Prix lot uniquement.", priceRange: [1500000, 2500000], condition: "good", subcategory: "livres" },
    { title: "Kit plongée complet - Cressi", desc: "Kit complet : masque, tuba, palmes, gilet stab, détendeur Cressi. Taille M/L. Entretenu après chaque plongée.", priceRange: [5000000, 8000000], condition: "good", subcategory: "sport_plein_air" },
    { title: "Vélo Polygon Strattos S3 - Route", desc: "Vélo route Polygon Strattos S3, cadre alu, groupset Shimano Sora. Taille 54. 2.000 km. Parfait état.", priceRange: [6000000, 9000000], condition: "like_new", subcategory: "velos" },
    { title: "Ukulélé concert Kala en acajou", desc: "Ukulélé concert Kala KA-C, corps acajou massif. Son riche et profond. Housse rembourrée incluse.", priceRange: [800000, 1200000], condition: "like_new", subcategory: "instruments_musique" },
    { title: "Jeu de société Catan + extensions", desc: "Catan édition 2022 + extensions Pirates & Découvreurs et Villes & Chevaliers. Complet, excellent état.", priceRange: [500000, 800000], condition: "good", subcategory: "jeux_jouets" },
    { title: "Longboard cruiser Loaded Dervish", desc: "Loaded Dervish Sama, trucks Paris V3, roues Orangatang. Parfait pour le cruising côtier.", priceRange: [3000000, 4500000], condition: "good", subcategory: "sport_plein_air" },
    { title: "Paddle gonflable Red Paddle Co 10'6", desc: "SUP gonflable Red Paddle Co Ride 10'6. Pompe, pagaie alu, leash inclus. Sac transport. Utilisé 10 fois.", priceRange: [7000000, 10000000], condition: "like_new", subcategory: "sport_plein_air" },
  ],
  animaux: [
    { title: "Chaton Bengal - 3 mois", desc: "Magnifique chaton Bengal, mâle, 3 mois. Vacciné, vermifugé. Parents visibles. Carnet de santé à jour.", priceRange: [5000000, 8000000], subcategory: "animaux", extra_fields: { animal_type: "chat", breed: "Bengal", age: "3 mois" } },
    { title: "Golden Retriever - 2 ans", desc: "Golden Retriever mâle, 2 ans, très sociable. Dressé, propre. Carnet vaccinations complet. Cause départ.", priceRange: [3000000, 5000000], subcategory: "animaux", extra_fields: { animal_type: "chien", breed: "Golden Retriever", age: "2 ans" } },
    { title: "Aquarium 200L complet + poissons", desc: "Aquarium 200L avec meuble, filtre externe, éclairage LED, chauffage. 15 poissons tropicaux inclus.", priceRange: [3000000, 5000000], subcategory: "animaux", extra_fields: { animal_type: "poisson", age: "1 an" } },
    { title: "Cage perroquet grande taille", desc: "Grande cage perroquet, 120x80x60cm, acier inoxydable. Perchoirs, gamelles, jouets. Très bon état.", priceRange: [1500000, 2500000], condition: "good", subcategory: "accessoires_animaux" },
    { title: "Chiot Labrador chocolat - Vacciné", desc: "Chiots Labrador chocolat, nés le 15/01. Vaccinés, pucés. Parents LOF visibles. 2 mâles disponibles.", priceRange: [4000000, 7000000], subcategory: "animaux", extra_fields: { animal_type: "chien", breed: "Labrador", age: "2 mois" } },
    { title: "Chat perdu - Tabanan centre", desc: "Chat tigré gris, collier rouge. Perdu dans le quartier de Tabanan centre. Très affectueux. Récompense.", priceRange: [0, 0], subcategory: "animaux_perdus" },
    { title: "Perroquet Gris du Gabon - Parleur", desc: "Gris du Gabon, 4 ans, très bavard. Vocabulaire de 50+ mots. Cage et accessoires inclus. Cause mutation.", priceRange: [8000000, 12000000], subcategory: "animaux", extra_fields: { animal_type: "oiseau", breed: "Gris du Gabon", age: "4 ans" } },
  ],
  electronique: [
    { title: "MacBook Pro M2 14\" - 16Go/512Go", desc: "MacBook Pro 14 pouces, puce M2 Pro, 16Go RAM, 512Go SSD. Acheté en 2023. AppleCare+ jusqu'en 2025. État impeccable.", priceRange: [18000000, 24000000], condition: "like_new", subcategory: "ordinateurs", extra_fields: { brand: "Apple", model: "MacBook Pro 14 M2 Pro" } },
    { title: "iPhone 15 Pro Max 256Go - Titane naturel", desc: "iPhone 15 Pro Max, 256Go, coloris titane naturel. 4 mois d'utilisation. Coque et verre trempé inclus.", priceRange: [16000000, 20000000], condition: "like_new", subcategory: "telephones_connectes", extra_fields: { brand: "Apple", model: "iPhone 15 Pro Max 256Go" } },
    { title: "Sony A7III + objectif 24-70mm f/2.8", desc: "Sony Alpha 7 III, 25k déclenchements. Objectif Tamron 28-75 f/2.8. 2 batteries, chargeur, sac photo.", priceRange: [14000000, 18000000], condition: "good", subcategory: "photo_audio_video", extra_fields: { brand: "Sony", model: "Alpha 7 III" } },
    { title: "iPad Air M1 - 256Go + Apple Pencil", desc: "iPad Air 5e gen, puce M1, 256Go, bleu ciel. Apple Pencil 2e gen + clavier Magic Keyboard. Parfait pour créatifs.", priceRange: [9000000, 12000000], condition: "like_new", subcategory: "tablettes_liseuses", extra_fields: { brand: "Apple", model: "iPad Air M1 256Go" } },
    { title: "DJI Mini 3 Pro + Fly More Combo", desc: "Drone DJI Mini 3 Pro, combo Fly More. 3 batteries, chargeur hub. Moins de 249g. Cardan 3 axes, vidéo 4K.", priceRange: [8000000, 11000000], condition: "like_new", subcategory: "photo_audio_video", extra_fields: { brand: "DJI", model: "Mini 3 Pro" } },
    { title: "Samsung Galaxy S24 Ultra 512Go", desc: "Galaxy S24 Ultra, 512Go, gris titanium. S Pen, Galaxy AI. Protection d'écran installée. Boîte complète.", priceRange: [14000000, 17000000], condition: "like_new", subcategory: "telephones_connectes", extra_fields: { brand: "Samsung", model: "Galaxy S24 Ultra 512Go" } },
    { title: "PS5 Digital + 2 manettes + 5 jeux", desc: "PlayStation 5 édition digitale, 2 manettes DualSense (blanche + noire). 5 jeux dématérialisés transférables.", priceRange: [5000000, 7000000], condition: "good", subcategory: "consoles", extra_fields: { brand: "Sony", model: "PlayStation 5 Digital" } },
    { title: "Écran Dell 27\" 4K USB-C", desc: "Moniteur Dell U2723QE, 27 pouces, 4K UHD, USB-C 90W. Parfait pour le télétravail. Pied réglable.", priceRange: [5000000, 7000000], condition: "good", subcategory: "accessoires_info", extra_fields: { brand: "Dell", model: "U2723QE" } },
    { title: "AirPods Pro 2e gen - USB-C", desc: "Apple AirPods Pro 2, boîtier USB-C. ANC, son spatial. Embouts S/M/L. 6 mois d'utilisation.", priceRange: [2500000, 3500000], condition: "good", subcategory: "accessoires_telephone", extra_fields: { brand: "Apple", model: "AirPods Pro 2" } },
    { title: "Nintendo Switch OLED + 3 jeux", desc: "Switch OLED blanche, 3 jeux physiques (Zelda TOTK, Mario Kart, Animal Crossing). Manettes Joy-Con neuves.", priceRange: [4000000, 5500000], condition: "good", subcategory: "consoles", extra_fields: { brand: "Nintendo", model: "Switch OLED" } },
    { title: "GoPro Hero 12 Black + accessoires", desc: "GoPro Hero 12, vidéo 5.3K. Lot d'accessoires : boîtier étanche, fixation casque, trépied, 2 batteries.", priceRange: [4500000, 6000000], condition: "like_new", subcategory: "photo_audio_video", extra_fields: { brand: "GoPro", model: "Hero 12 Black" } },
  ],
  services: [
    { title: "Cours de surf - Tous niveaux - Canggu", desc: "Cours de surf personnalisé à Canggu (Echo Beach / Batu Bolong). Moniteur certifié ISA. Planche et lycra fournis. 2h par session.", priceRange: [350000, 600000], subcategory: "cours_particuliers" },
    { title: "Babysitter bilingue FR/EN disponible", desc: "Babysitter expérimentée, bilingue français-anglais. Disponible jour et soir. Références sur demande. Déplacement possible.", priceRange: [100000, 150000], subcategory: "baby_sitting" },
    { title: "Déménagement & transport Bali", desc: "Service de déménagement professionnel sur toute l'île de Bali. Camion 2.5T, 2 déménageurs. Emballage soigné.", priceRange: [500000, 1500000], subcategory: "services_demenagement" },
    { title: "Réparation iPhone & Samsung - Express", desc: "Réparation smartphone toutes marques : écran, batterie, port charge. Pièces d'origine. Intervention en 30 min.", priceRange: [200000, 800000], subcategory: "services_reparations_electroniques" },
    { title: "Photographe mariage & événement Bali", desc: "Photographe professionnel pour mariage, anniversaire, corporate. 5 ans d'expérience à Bali. Portfolio disponible.", priceRange: [5000000, 15000000], subcategory: "evenements" },
    { title: "Cours de bahasa Indonesia - Privé", desc: "Cours particuliers de bahasa Indonesia, tous niveaux. Méthode conversationnelle. Professeur native avec 10 ans d'expérience.", priceRange: [200000, 350000], subcategory: "cours_particuliers" },
    { title: "Mécanicien moto à domicile", desc: "Entretien et réparation moto à domicile. Vidange, freins, pneus, diagnostic. Toutes marques japonaises.", priceRange: [100000, 500000], subcategory: "services_reparations_mecaniques" },
    { title: "Jardinier paysagiste - Entretien villa", desc: "Entretien jardin de villa : tonte, taille, arrosage, traitement. Création de jardins tropicaux sur mesure.", priceRange: [500000, 1500000], subcategory: "services_jardinerie_bricolage" },
    { title: "DJ professionnel - Événements privés", desc: "DJ professionnel disponible pour événements privés, pool parties, mariages. Matériel complet fourni. Deep house, techno, tropical.", priceRange: [3000000, 8000000], subcategory: "artistes_musiciens" },
    { title: "Covoiturage Canggu → Ubud quotidien", desc: "Covoiturage quotidien Canggu-Ubud, départ 8h retour 17h. Voiture climatisée. Partage des frais essence.", priceRange: [50000, 100000], subcategory: "covoiturage" },
  ],
  famille: [
    { title: "Poussette Yoyo Babyzen - Noire", desc: "Poussette Babyzen Yoyo+, couleur noire, pliage compact. Nacelle 0+ et hamac 6+ inclus. Parfait état.", priceRange: [3000000, 5000000], condition: "good", subcategory: "equip_bebe" },
    { title: "Lit bébé en rotin naturel", desc: "Magnifique lit bébé en rotin tressé à la main. Matelas coton bio inclus. Fabrication artisanale balinaise.", priceRange: [2000000, 3500000], condition: "like_new", subcategory: "mobilier_enfant" },
    { title: "Lot vêtements bébé 0-12 mois", desc: "Grand lot de vêtements bébé garçon, 0 à 12 mois. 40+ pièces. Marques : Petit Bateau, Carter's, H&M.", priceRange: [500000, 800000], condition: "good", subcategory: "vetements_bebe" },
    { title: "Siège auto Maxi-Cosi - Groupe 0/1", desc: "Siège auto Maxi-Cosi Pebble Pro, groupe 0/1 (0-18 kg). Isofix. Housse lavable. Certifié i-Size.", priceRange: [1500000, 2500000], condition: "good", subcategory: "equip_bebe" },
    { title: "Bureau enfant Montessori en teck", desc: "Bureau enfant style Montessori, bois de teck massif. 2-6 ans. Chaise assortie. Fabrication locale artisanale.", priceRange: [1800000, 2800000], condition: "new", subcategory: "mobilier_enfant" },
    { title: "Porte-bébé ergonomique Ergobaby", desc: "Porte-bébé Ergobaby Omni 360, portage 4 positions. De la naissance à 20 kg. Couleur grise.", priceRange: [1200000, 1800000], condition: "like_new", subcategory: "equip_bebe" },
  ],
  maison_jardin: [
    { title: "Canapé 3 places rotin naturel", desc: "Canapé 3 places en rotin naturel, coussins en lin beige. Fabrication artisanale balinaise. Très confortable.", priceRange: [4500000, 7000000], condition: "like_new", subcategory: "ameublement" },
    { title: "Machine à café Breville Barista Express", desc: "Machine espresso Breville Barista Express. Moulin intégré, buse vapeur. Parfaite pour les amateurs de café.", priceRange: [5000000, 7000000], condition: "good", subcategory: "electromenager" },
    { title: "Plantes tropicales - Lot de 10", desc: "Lot de 10 plantes tropicales en pot : monstera, ficus, calathea, pothos. Pots céramique inclus.", priceRange: [500000, 1000000], condition: "new", subcategory: "jardin_plantes" },
    { title: "Table à manger teck massif - 8 places", desc: "Table rectangulaire en teck massif recyclé, 200x100cm. Style industriel avec pieds métal noir. 8 places.", priceRange: [6000000, 10000000], condition: "good", subcategory: "ameublement" },
    { title: "Ventilateur plafond design - Bois bambou", desc: "Ventilateur de plafond avec pales en bambou, télécommande, 3 vitesses, lumière LED intégrée. Diamètre 132cm.", priceRange: [2500000, 4000000], condition: "new", subcategory: "decoration" },
    { title: "Lave-linge Samsung 8kg - Inverter", desc: "Lave-linge Samsung 8kg, technologie Digital Inverter. Silencieux, économe en eau. 1 an d'utilisation.", priceRange: [3000000, 4500000], condition: "good", subcategory: "electromenager" },
    { title: "Ensemble vaisselle artisanale Bali", desc: "Service 12 pièces en céramique artisanale balinaise. Assiettes, bols, tasses. Couleur bleu océan.", priceRange: [800000, 1500000], condition: "new", subcategory: "arts_table" },
    { title: "Tondeuse à gazon Honda GCV170", desc: "Tondeuse Honda GCV170, coupe 46cm, auto-tractée. Bac 50L. Parfaite pour jardins de villa. Bien entretenue.", priceRange: [3000000, 4500000], condition: "good", subcategory: "bricolage" },
  ],
  materiel_pro: [
    { title: "Machine à café pro La Marzocco Linea", desc: "La Marzocco Linea Mini, 1 groupe. Parfaite pour café ou petit restaurant. Révisée par technicien agréé.", priceRange: [35000000, 50000000], condition: "good", subcategory: "equip_restaurants_hotels" },
    { title: "Imprimante 3D Creality Ender 3 V3", desc: "Imprimante 3D FDM, volume 220x220x250mm. Auto-leveling, écran tactile. Idéal prototypage et small business.", priceRange: [4000000, 6000000], condition: "like_new", subcategory: "equip_industriels" },
    { title: "Vitrine réfrigérée boulangerie", desc: "Vitrine réfrigérée 1.2m, éclairage LED, 3 étagères. Parfait pour boulangerie, pâtisserie ou café.", priceRange: [8000000, 12000000], condition: "good", subcategory: "equip_restaurants_hotels" },
    { title: "Mobilier de bureau complet - 4 postes", desc: "4 bureaux d'angle, 4 chaises ergonomiques, 2 armoires. Blanc et bois. Idéal pour startup ou coworking.", priceRange: [8000000, 15000000], condition: "good", subcategory: "equip_fournitures_bureau" },
    { title: "Chariot élévateur Toyota 2.5T", desc: "Chariot élévateur Toyota 8FD25, diesel, capacité 2.5T. 3.500 heures. Entretien régulier. Bon état.", priceRange: [120000000, 180000000], condition: "good", subcategory: "manutention_levage" },
    { title: "Présentoir vitrine magasin - 6 étagères", desc: "Présentoir métallique 6 étagères, 200x100x40cm. Finition chrome. Lot de 4 unités. Idéal boutique.", priceRange: [2000000, 4000000], condition: "good", subcategory: "equip_commerces_marches" },
  ],
  divers: [
    { title: "Déco murale macramé fait main", desc: "Grande décoration murale en macramé, fait main à Bali. 120x80cm. Coton naturel non blanchi. Pièce unique.", priceRange: [350000, 600000], condition: "new", subcategory: "autres" },
    { title: "Lot d'huiles essentielles Bali", desc: "Coffret 12 huiles essentielles de Bali : citronnelle, ylang-ylang, patchouli, encens, etc. 100% naturelles.", priceRange: [250000, 450000], condition: "new", subcategory: "autres" },
    { title: "Cartons de déménagement - Lot de 20", desc: "20 cartons solides double cannelure, tailles variées + rouleau de scotch. Utilisés une fois.", priceRange: [100000, 200000], condition: "good", subcategory: "autres" },
    { title: "Tapis de yoga Manduka PRO", desc: "Tapis Manduka PRO 6mm, 180cm. Surface grip, amortissement optimal. Couleur vert forêt. Peu utilisé.", priceRange: [800000, 1200000], condition: "like_new", subcategory: "autres" },
    { title: "Hamac artisanal balinais - 2 places", desc: "Hamac double en coton tissé, frange macramé. Crochets et cordes inclus. Parfait pour terrasse ou jardin.", priceRange: [400000, 700000], condition: "new", subcategory: "autres" },
    { title: "Collection de coquillages Bali", desc: "Collection de 50+ coquillages et coraux (ramassés sur les plages, pas de prélèvement vivant). Boîte vitrine.", priceRange: [200000, 400000], condition: "good", subcategory: "autres" },
  ],
};

// ── Helpers ───────────────────────────────────────────────────────────

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function roundPrice(price: number, currency: string): number {
  if (currency === "IDR") return Math.round(price / 10000) * 10000;
  if (currency === "USD") return Math.round(price);
  return Math.round(price);
}

function unsplashUrl(id: string, w = 600, h = 450): string {
  return `https://images.unsplash.com/${id}?w=${w}&h=${h}&fit=crop&auto=format`;
}

// ── Main handler ──────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Admin-only: verify caller is admin
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader || "" } },
    });
    const { data: { user } } = await anonClient.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: roleCheck } = await adminClient.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });
    if (!roleCheck) throw new Error("Admin only");

    const body = await req.json().catch(() => ({}));
    const count = Math.min(Math.max(body.count || 350, 10), 500);

    // 1. Create or find fake users
    // First, try to find all existing seed users in one query
    const { data: existingProfiles } = await adminClient
      .from("profiles")
      .select("id, display_name")
      .filter("listing_limit_override", "eq", 100)
      .limit(50);
    
    const existingByName = new Map<string, string>();
    for (const p of existingProfiles || []) {
      if (p.display_name) existingByName.set(p.display_name, p.id);
    }

    const userIds: string[] = [];
    for (const fakeUser of FAKE_USERS) {
      // Check if already exists
      const existingId = existingByName.get(fakeUser.name);
      if (existingId) {
        userIds.push(existingId);
        continue;
      }

      const email = `fake_${fakeUser.name.toLowerCase().replace(/\s/g, ".")}@seed.rebali.test`;
      const { data: newUser, error: userErr } = await adminClient.auth.admin.createUser({
        email,
        password: `SeedPass!${randInt(1000, 9999)}`,
        email_confirm: true,
        user_metadata: { display_name: fakeUser.name },
      });

      if (newUser?.user) {
        userIds.push(newUser.user.id);
        await adminClient.from("profiles").update({
          avatar_url: fakeUser.avatar,
          display_name: fakeUser.name,
          listing_limit_override: 100,
          phone_verified: true,
          trust_score: randInt(60, 95),
        }).eq("id", newUser.user.id);
      } else {
        console.log(`Skipping user ${email}: ${userErr?.message}`);
      }
    }

    if (userIds.length === 0) throw new Error("No seed users found or created");

    // 2. Build listing pool from all categories
    const allCategories = Object.keys(LISTINGS);
    const allTemplates: { category: string; template: ListingTemplate }[] = [];
    for (const cat of allCategories) {
      for (const tpl of LISTINGS[cat]) {
        allTemplates.push({ category: cat, template: tpl });
      }
    }

    // 3. Create listings in batches
    let created = 0;
    const batchSize = 20;

    while (created < count) {
      const batchListings: any[] = [];
      const batchMeta: { category: string; template: ListingTemplate }[] = [];

      for (let i = 0; i < batchSize && created + i < count; i++) {
        const { category, template } = allTemplates[(created + i) % allTemplates.length];
        const sellerId = pick(userIds);
        const location = pick(LOCATIONS);
        
        // Determine currency
        let currency: string;
        if (template.currency) {
          currency = template.currency;
        } else if (category === "emploi" || category === "immobilier") {
          currency = "IDR";
        } else {
          currency = pick(["IDR", "IDR", "IDR", "USD", "EUR"]); // IDR weighted
        }

        // Convert price based on currency
        let price: number;
        const basePrice = randInt(template.priceRange[0], template.priceRange[1]);
        if (currency === "USD") {
          price = roundPrice(basePrice / 15800, "USD");
        } else if (currency === "EUR") {
          price = roundPrice(basePrice / 17200, "EUR");
        } else {
          price = roundPrice(basePrice, "IDR");
        }

        const condition = template.condition || "good";
        const subcategory = template.subcategory || null;
        const listing_type = template.listing_type || "sale";

        // Vary creation dates over last 60 days
        const daysAgo = randInt(0, 60);
        const createdAt = new Date(Date.now() - daysAgo * 86400000).toISOString();

        batchListings.push({
          seller_id: sellerId,
          title_original: template.title,
          description_original: template.desc,
          category,
          subcategory,
          price,
          currency,
          condition,
          location_area: location,
          listing_type,
          lang_original: "fr",
          status: "active",
          views_count: randInt(5, 500),
          extra_fields: template.extra_fields || {},
          created_at: createdAt,
        });

        batchMeta.push({ category, template });
      }

      const { data: insertedListings, error: insertErr } = await adminClient
        .from("listings")
        .insert(batchListings)
        .select("id, category");

      if (insertErr) {
        console.error("Insert error:", insertErr.message);
        // Continue anyway
      }

      // Insert images for each listing
      if (insertedListings) {
        const imageRows: any[] = [];
        for (const listing of insertedListings) {
          const catImages = IMAGES[listing.category] || IMAGES.divers;
          const numImages = randInt(1, Math.min(4, catImages.length));
          const shuffled = [...catImages].sort(() => Math.random() - 0.5);
          for (let j = 0; j < numImages; j++) {
            imageRows.push({
              listing_id: listing.id,
              storage_path: unsplashUrl(shuffled[j]),
              sort_order: j,
            });
          }
        }

        if (imageRows.length > 0) {
          const { error: imgErr } = await adminClient
            .from("listing_images")
            .insert(imageRows);
          if (imgErr) console.error("Image insert error:", imgErr.message);
        }

        created += insertedListings.length;
      } else {
        created += batchListings.length;
      }
    }

    return new Response(
      JSON.stringify({ success: true, created, users: userIds.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Seed error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
