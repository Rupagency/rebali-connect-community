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
  images?: string[]; // Specific Unsplash photo IDs for this template
}

const LISTINGS: Record<string, ListingTemplate[]> = {
  emploi: [
    { title: "Chef cuisinier - Restaurant français Seminyak", desc: "Recherche chef expérimenté en cuisine française pour notre restaurant en bord de mer. CDI, salaire attractif + logement.", priceRange: [15000000, 25000000], subcategory: "offres_emploi", extra_fields: { contract_type: "cdi", job_sector: "restauration", work_time: "full_time" }, images: ["photo-1556910103-1c02745aae4d", "photo-1414235077428-338989a2e8c0"] },
    { title: "Professeur de yoga certifié", desc: "Studio de yoga à Ubud recherche professeur certifié (Hatha/Vinyasa). Temps partiel, horaires flexibles.", priceRange: [8000000, 15000000], subcategory: "offres_emploi", extra_fields: { contract_type: "freelance", job_sector: "tourisme", work_time: "part_time" }, images: ["photo-1545205597-3d9d02c29597", "photo-1506126613408-eca07ce68773"] },
    { title: "Développeur web full-stack remote", desc: "Startup tech basée à Canggu recrute un dev full-stack (React/Node). Full remote possible.", priceRange: [20000000, 45000000], subcategory: "offres_emploi", extra_fields: { contract_type: "cdi", job_sector: "informatique", work_time: "full_time" }, images: ["photo-1498050108023-c5249f4df085", "photo-1517694712202-14dd9538aa97"] },
    { title: "Barista expérimenté - Café spécialité", desc: "Coffee shop specialty à Canggu recherche barista passionné. Connaissance des méthodes douces.", priceRange: [5000000, 8000000], subcategory: "offres_emploi", extra_fields: { contract_type: "cdd", job_sector: "restauration", work_time: "full_time" }, images: ["photo-1495474472287-4d71bcdd2085", "photo-1442512595331-e89e73853f31"] },
    { title: "Community manager bilingue FR/EN", desc: "Agence de communication recrute CM bilingue pour gérer les réseaux sociaux de clients internationaux.", priceRange: [10000000, 18000000], subcategory: "offres_emploi", extra_fields: { contract_type: "freelance", job_sector: "communication", work_time: "full_time" }, images: ["photo-1611162617213-7d7a39e9b1d7", "photo-1432888622747-4eb9a8f2c3e8"] },
    { title: "Gérant de villa - Ubud", desc: "Société de gestion de villas recherche gérant bilingue pour superviser un portefeuille de 5 villas.", priceRange: [12000000, 20000000], subcategory: "offres_emploi", extra_fields: { contract_type: "cdi", job_sector: "immobilier", work_time: "full_time" }, images: ["photo-1600596542815-ffad4c1539a9", "photo-1582268611958-ebfd161ef9cf"] },
    { title: "Moniteur de surf - Plage de Kuta", desc: "École de surf reconnue cherche moniteur certifié ISA/BSA. Anglais courant requis.", priceRange: [7000000, 12000000], subcategory: "offres_emploi", extra_fields: { contract_type: "cdd", job_sector: "tourisme", work_time: "full_time" }, images: ["photo-1502680390548-bdbac40a5e46", "photo-1455729552865-3658a5d39692"] },
    { title: "Photographe/Vidéaste freelance", desc: "Recherche photographe-vidéaste pour shooting immobilier et lifestyle. Drone + post-prod.", priceRange: [15000000, 30000000], subcategory: "offres_emploi", extra_fields: { contract_type: "freelance", job_sector: "communication", work_time: "part_time" }, images: ["photo-1542038784456-1ea8df1e9bc1", "photo-1516035069371-29a1b244cc32"] },
    { title: "Formation marketing digital - 3 mois", desc: "Formation complète en marketing digital : SEO, Google Ads, Meta Ads, Analytics.", priceRange: [5000000, 10000000], subcategory: "formations_pro", images: ["photo-1460925895917-afdab827c52f", "photo-1533750349088-cd871a92f312"] },
    { title: "Cours de cuisine balinaise - Pro", desc: "Formation professionnelle cuisine balinaise authentique. 40h de cours pratiques.", priceRange: [3000000, 7000000], subcategory: "formations_pro", images: ["photo-1556909114-f6e7ad7d3136", "photo-1507048331197-7d4ac70811cf"] },
  ],
  vehicules: [
    { title: "Honda PCX 160 - 2023 - Comme neuf", desc: "Honda PCX 160cc, année 2023, 4.200 km. Entretien Honda officiel. Pneus neufs.", priceRange: [22000000, 28000000], condition: "like_new", subcategory: "motos", extra_fields: { brand: "Honda", model: "PCX 160", year: 2023, mileage: 4200 }, images: ["photo-1558981806-ec527fa84c39", "photo-1622185135505-2d795003994a"] },
    { title: "Yamaha NMAX 155 Connected - 2024", desc: "NMAX 155 ABS Connected dernière génération. GPS intégré, Bluetooth. 1.800 km.", priceRange: [28000000, 35000000], condition: "like_new", subcategory: "motos", extra_fields: { brand: "Yamaha", model: "NMAX 155", year: 2024, mileage: 1800 }, images: ["photo-1558980394-4c7c9299fe96", "photo-1609630875171-b1321377ee65"] },
    { title: "Toyota Avanza 2021 - 7 places", desc: "Toyota Avanza 1.5 G, 7 places, boîte auto. Climatisation double zone.", priceRange: [180000000, 220000000], condition: "good", subcategory: "voitures", extra_fields: { brand: "Toyota", model: "Avanza 1.5 G", year: 2021, mileage: 35000, fuel_type: "essence" }, images: ["photo-1549317661-bd32c8ce0afe", "photo-1533473359331-0135ef1b58bf"] },
    { title: "Suzuki Jimny 2022 - 4x4", desc: "Suzuki Jimny 4WD, couleur jungle green. 15.000 km. Idéal pour explorer Bali.", priceRange: [320000000, 380000000], condition: "like_new", subcategory: "voitures", extra_fields: { brand: "Suzuki", model: "Jimny", year: 2022, mileage: 15000, fuel_type: "essence" }, images: ["photo-1568772585407-9361f9bf3a87", "photo-1519641471654-76ce0107ad1b"] },
    { title: "Vespa Primavera 150 - Édition spéciale", desc: "Vespa Primavera 150cc édition 75e anniversaire. Couleur exclusive. 3.500 km.", priceRange: [35000000, 45000000], condition: "like_new", subcategory: "motos", extra_fields: { brand: "Vespa", model: "Primavera 150", year: 2023, mileage: 3500 }, images: ["photo-1571607388263-1044f9ea01dd", "photo-1525160354320-d8e92641c563"] },
    { title: "Honda Vario 125 - Idéal quotidien", desc: "Honda Vario 125cc, fiable et économique. 18.000 km, entretien suivi.", priceRange: [12000000, 16000000], condition: "good", subcategory: "motos", extra_fields: { brand: "Honda", model: "Vario 125", year: 2021, mileage: 18000 }, images: ["photo-1558618666-fcd25c85f82e", "photo-1449824913935-59a10b8d2000"] },
    { title: "Kawasaki Ninja 250 - Sportive", desc: "Kawasaki Ninja 250 ABS. Échappement Akrapovic. 8.000 km. Vert Kawasaki racing.", priceRange: [45000000, 55000000], condition: "good", subcategory: "motos", extra_fields: { brand: "Kawasaki", model: "Ninja 250", year: 2022, mileage: 8000 }, images: ["photo-1547549082-6bc09f2049ae", "photo-1611241443322-b5734bb44f2b"] },
    { title: "Daihatsu Terios 2020 - SUV compact", desc: "Terios R Deluxe, boîte auto. Caméra de recul. 40.000 km. Idéal famille.", priceRange: [170000000, 200000000], condition: "good", subcategory: "voitures", extra_fields: { brand: "Daihatsu", model: "Terios R Deluxe", year: 2020, mileage: 40000, fuel_type: "essence" }, images: ["photo-1533473359331-0135ef1b58bf", "photo-1549317661-bd32c8ce0afe"] },
    { title: "Casque Shoei X-Spirit III - Taille M", desc: "Casque racing Shoei X-Spirit III, taille M. Visière fumée incluse.", priceRange: [4000000, 6000000], condition: "good", subcategory: "equip_moto", images: ["photo-1591637333184-19aa84b3e01f"] },
    { title: "Porte-vélos pour voiture - 3 vélos", desc: "Porte-vélos attelage pour 3 vélos. Pliable, verrouillable.", priceRange: [2500000, 4000000], condition: "good", subcategory: "equip_auto", images: ["photo-1532298229144-0ec0c57515c7"] },
    { title: "Honda Scoopy 2023 - Rose pastel", desc: "Scoopy Prestige 2023, couleur rose pastel. 2.100 km. Premier propriétaire.", priceRange: [18000000, 22000000], condition: "like_new", subcategory: "motos", extra_fields: { brand: "Honda", model: "Scoopy Prestige", year: 2023, mileage: 2100 }, images: ["photo-1558981806-ec527fa84c39"] },
    { title: "Mitsubishi Pajero Sport 2019 - Diesel", desc: "Pajero Sport Dakar 4x4, diesel, boîte auto. 55.000 km. Cuir, toit ouvrant.", priceRange: [350000000, 420000000], condition: "good", subcategory: "voitures", extra_fields: { brand: "Mitsubishi", model: "Pajero Sport Dakar", year: 2019, mileage: 55000, fuel_type: "diesel" }, images: ["photo-1519641471654-76ce0107ad1b", "photo-1568772585407-9361f9bf3a87"] },
  ],
  immobilier: [
    { title: "Villa 3 chambres avec piscine - Canggu", desc: "Magnifique villa tropicale, 3 chambres, piscine privée, jardin. Quartier calme proche Echo Beach.", priceRange: [35000000, 55000000], subcategory: "locations", listing_type: "rent", extra_fields: { property_type: "villa", surface: 250, rooms: 3, furnished: "yes" }, images: ["photo-1600596542815-ffad4c1539a9", "photo-1600585154340-be6161a56a0c", "photo-1613490493576-7fde63acd811"] },
    { title: "Appartement moderne 2ch - Seminyak", desc: "Apt rénové, 2 chambres, salon, cuisine ouverte. Rooftop partagé avec vue.", priceRange: [18000000, 28000000], subcategory: "locations", listing_type: "rent", extra_fields: { property_type: "apartment", surface: 85, rooms: 2, furnished: "yes" }, images: ["photo-1560448204-e02f11c3d0e2", "photo-1502672260266-1c1ef2d93688"] },
    { title: "Terrain 500m² - Ubud avec vue rizière", desc: "Parcelle de 500m² avec vue imprenable sur les rizières. Certificat freehold.", priceRange: [800000000, 1200000000], subcategory: "ventes_immobilieres", listing_type: "sale", extra_fields: { property_type: "land", surface: 500 }, images: ["photo-1505691723518-36a5ac3be353", "photo-1508739773434-c26b3d09e071"] },
    { title: "Colocation villa 4ch - Berawa", desc: "1 chambre dispo dans villa partagée. Piscine, coworking, wifi rapide.", priceRange: [8000000, 12000000], subcategory: "colocations", listing_type: "rent", extra_fields: { property_type: "room", surface: 25, rooms: 1, furnished: "yes" }, images: ["photo-1600566753190-17f0baa2a6c3", "photo-1564013799919-ab600027ffc6"] },
    { title: "Villa luxe 4ch - Vue océan Uluwatu", desc: "Villa exceptionnelle, 4 chambres, infinity pool, vue 180° océan.", priceRange: [75000000, 120000000], subcategory: "locations", listing_type: "rent", extra_fields: { property_type: "villa", surface: 400, rooms: 4, furnished: "yes" }, images: ["photo-1580587771525-78b9dba3b914", "photo-1512917774080-9991f1c4c750", "photo-1600047509807-ba8f99d2cdde"] },
    { title: "Studio meublé - Sanur centre", desc: "Studio 35m², entièrement meublé. Résidence sécurisée avec piscine.", priceRange: [6000000, 9000000], subcategory: "locations", listing_type: "rent", extra_fields: { property_type: "apartment", surface: 35, rooms: 1, furnished: "yes" }, images: ["photo-1560448204-e02f11c3d0e2", "photo-1522708323590-d24dbb6b0267"] },
    { title: "Local commercial 80m² - Kuta", desc: "Local commercial bien situé, 80m², grande vitrine. Idéal restaurant ou boutique.", priceRange: [25000000, 40000000], subcategory: "bureaux_commerces", listing_type: "rent", extra_fields: { property_type: "commercial", surface: 80 }, images: ["photo-1497366216548-37526070297c", "photo-1604014237800-1c9102c219da"] },
    { title: "Maison traditionnelle rénovée - Ubud", desc: "Joglo balinais authentique, entièrement rénové. 3 chambres, jardin tropical.", priceRange: [2500000000, 3500000000], subcategory: "ventes_immobilieres", listing_type: "sale", extra_fields: { property_type: "house", surface: 180, rooms: 3, furnished: "yes" }, images: ["photo-1570129477492-45c003edd2be", "photo-1600585154340-be6161a56a0c"] },
    { title: "Villa neuve 2ch - Tabanan rice field", desc: "Villa neuve, design minimaliste. 2 chambres, piscine, vue rizière.", priceRange: [1800000000, 2500000000], subcategory: "ventes_immobilieres", listing_type: "sale", extra_fields: { property_type: "villa", surface: 150, rooms: 2, furnished: "yes" }, images: ["photo-1613490493576-7fde63acd811", "photo-1582268611958-ebfd161ef9cf"] },
    { title: "Chambre privée chez l'habitant - Sidemen", desc: "Chambre spacieuse avec SDB privée dans maison familiale. Vue montagne.", priceRange: [3000000, 5000000], subcategory: "locations", listing_type: "rent", extra_fields: { property_type: "room", surface: 20, rooms: 1, furnished: "yes" }, images: ["photo-1564013799919-ab600027ffc6"] },
    { title: "Penthouse 3ch - Seminyak walk to beach", desc: "Penthouse exceptionnel, 3 chambres, terrasse 60m², vue mer.", priceRange: [55000000, 85000000], subcategory: "locations", listing_type: "rent", extra_fields: { property_type: "apartment", surface: 180, rooms: 3, furnished: "yes" }, images: ["photo-1512917774080-9991f1c4c750", "photo-1600047509807-ba8f99d2cdde"] },
  ],
  mode: [
    { title: "Robe Zara été - Taille M", desc: "Robe longue fleurie Zara, portée 2 fois. Taille M (38). Tissu léger.", priceRange: [250000, 400000], condition: "like_new", subcategory: "vetements", extra_fields: { brand: "Zara", size: "M" }, images: ["photo-1515886657613-9f3515b0c78f", "photo-1469334031218-e382a71b716b"] },
    { title: "Sneakers Nike Air Max 90 - 42", desc: "Nike Air Max 90, pointure 42. Coloris blanc/noir. Très bon état.", priceRange: [800000, 1200000], condition: "good", subcategory: "chaussures", extra_fields: { brand: "Nike", size: "42" }, images: ["photo-1542291026-7eec264c27ff", "photo-1460353581641-37baddab0fa2"] },
    { title: "Sac à main Louis Vuitton Neverfull MM", desc: "Authentique LV Neverfull MM, toile monogram. Facture disponible.", priceRange: [12000000, 18000000], condition: "good", subcategory: "accessoires_bagagerie", extra_fields: { brand: "Louis Vuitton" }, images: ["photo-1548036328-c9fa89d128fa", "photo-1584917865442-de89df76afd3"] },
    { title: "Montre Casio G-Shock GA-2100", desc: "G-Shock CasiOak noire, modèle GA-2100. Boîte et papiers. Portée 3 mois.", priceRange: [1200000, 1800000], condition: "like_new", subcategory: "montres_bijoux", images: ["photo-1523170335258-f5ed11844a49", "photo-1524592094714-0f0654e20314"] },
    { title: "Lot vêtements homme taille L", desc: "Lot de 15 pièces : t-shirts, chemises, shorts, pantalons. Marques variées.", priceRange: [500000, 800000], condition: "good", subcategory: "vetements", extra_fields: { brand: "H&M", size: "L" }, images: ["photo-1441984904996-e0b6ba687e04", "photo-1558171813-01ed3d751272"] },
    { title: "Lunettes Ray-Ban Aviator originales", desc: "Ray-Ban Aviator Classic, verres polarisés, monture dorée. Étui inclus.", priceRange: [1500000, 2200000], condition: "like_new", subcategory: "accessoires_bagagerie", extra_fields: { brand: "Ray-Ban" }, images: ["photo-1511499767150-a48a237f0083", "photo-1572635196237-14b3f281503f"] },
    { title: "Bikini Seafolly - Neuf avec étiquette", desc: "Bikini triangle Seafolly, taille S. Motif tropical. Jamais porté.", priceRange: [400000, 600000], condition: "new", subcategory: "vetements", extra_fields: { size: "S" }, images: ["photo-1570976447640-ac859083963b"] },
    { title: "Chemise batik traditionnelle - Fait main", desc: "Chemise batik fait main à Ubud. Coton premium, motif traditionnel balinais.", priceRange: [350000, 550000], condition: "new", subcategory: "vetements", extra_fields: { size: "XL" }, images: ["photo-1445205170230-053b83016050", "photo-1490481651871-ab68de25d43d"] },
  ],
  vacances: [
    { title: "Villa Nusa Penida - Vue falaise 180°", desc: "Villa de rêve à Nusa Penida, 2 chambres, infinity pool surplombant l'océan.", priceRange: [2500000, 4500000], subcategory: "locations_saisonnieres", listing_type: "rent", extra_fields: { property_type: "villa", rooms: 2 }, images: ["photo-1507525428034-b723cf961d3e", "photo-1506929562872-bb421503ef21"] },
    { title: "Bungalow plage - Amed snorkeling", desc: "Bungalow pieds dans l'eau à Amed. 1 chambre, terrasse avec vue mer.", priceRange: [800000, 1500000], subcategory: "locations_saisonnieres", listing_type: "rent", images: ["photo-1540541338287-41700207dee6", "photo-1501785888041-af3ef285b470"] },
    { title: "Villa familiale Sanur - 4 chambres", desc: "Grande villa familiale à Sanur, 4 chambres, piscine sécurisée enfants.", priceRange: [3500000, 5500000], subcategory: "locations_saisonnieres", listing_type: "rent", images: ["photo-1600596542815-ffad4c1539a9", "photo-1600585154340-be6161a56a0c"] },
    { title: "Cabane dans les rizières - Tegallalang", desc: "Cabane en bambou au milieu des rizières. Confort moderne, déco bohème.", priceRange: [1200000, 2000000], subcategory: "locations_saisonnieres", listing_type: "rent", images: ["photo-1476514525535-07fb3b4ae5f1", "photo-1508739773434-c26b3d09e071"] },
    { title: "Glamping luxe - Sidemen valley", desc: "Tente safari luxe avec SDB privée, vue Agung. Petit-déjeuner bio inclus.", priceRange: [1500000, 2500000], subcategory: "locations_saisonnieres", listing_type: "rent", images: ["photo-1530841377377-3ff06c0ca713", "photo-1504280390367-361c6d9f38f4"] },
    { title: "Maison de plage Gili Air - Front de mer", desc: "Maison traditionnelle face à la mer sur Gili Air. 2 chambres, hamacs.", priceRange: [1800000, 3000000], subcategory: "locations_saisonnieres", listing_type: "rent", images: ["photo-1501785888041-af3ef285b470", "photo-1507525428034-b723cf961d3e"] },
  ],
  loisirs: [
    { title: "Planche de surf 6'2 - Shortboard", desc: "Shortboard 6'2, shaper local. Mousse EPS, résine époxy. 3 dérives FCS II.", priceRange: [2500000, 4000000], condition: "good", subcategory: "sport_plein_air", images: ["photo-1502680390548-bdbac40a5e46", "photo-1455729552865-3658a5d39692"] },
    { title: "Guitare acoustique Yamaha F310", desc: "Yamaha F310, excellente guitare d'étude. Table épicéa. Housse incluse.", priceRange: [1200000, 1800000], condition: "good", subcategory: "instruments_musique", images: ["photo-1510915361894-db8b60106cb1", "photo-1525201548942-d8732f6617a0"] },
    { title: "Collection manga One Piece 1-50", desc: "50 premiers tomes de One Piece en français. Excellent état.", priceRange: [1500000, 2500000], condition: "good", subcategory: "livres", images: ["photo-1513542789411-b6a5d4f31634", "photo-1512820790803-83ca734da794"] },
    { title: "Kit plongée complet - Cressi", desc: "Kit complet : masque, tuba, palmes, gilet stab, détendeur Cressi.", priceRange: [5000000, 8000000], condition: "good", subcategory: "sport_plein_air", images: ["photo-1544551763-46a013bb70d5", "photo-1682687220742-aba13b6e50ba"] },
    { title: "Vélo Polygon Strattos S3 - Route", desc: "Vélo route Polygon Strattos S3, Shimano Sora. 2.000 km. Parfait état.", priceRange: [6000000, 9000000], condition: "like_new", subcategory: "velos", images: ["photo-1485965120184-e220f721d03e", "photo-1532298229144-0ec0c57515c7"] },
    { title: "Ukulélé concert Kala en acajou", desc: "Ukulélé concert Kala KA-C, corps acajou massif. Housse rembourrée incluse.", priceRange: [800000, 1200000], condition: "like_new", subcategory: "instruments_musique", images: ["photo-1511379938547-c1f69419868d"] },
    { title: "Jeu de société Catan + extensions", desc: "Catan édition 2022 + 2 extensions. Complet, excellent état.", priceRange: [500000, 800000], condition: "good", subcategory: "jeux_jouets", images: ["photo-1611371805429-8b5c1b2c34ba", "photo-1606503153255-59d8b8e30891"] },
    { title: "Longboard cruiser Loaded Dervish", desc: "Loaded Dervish Sama, trucks Paris V3, roues Orangatang.", priceRange: [3000000, 4500000], condition: "good", subcategory: "sport_plein_air", images: ["photo-1547447134-cd3f5c716030", "photo-1517649763962-0c623066013b"] },
    { title: "Paddle gonflable Red Paddle Co 10'6", desc: "SUP gonflable Red Paddle Co Ride 10'6. Pompe, pagaie, leash inclus.", priceRange: [7000000, 10000000], condition: "like_new", subcategory: "sport_plein_air", images: ["photo-1459411552884-841db9b3cc2a", "photo-1526188717906-ab4a2f949f26"] },
  ],
  animaux: [
    { title: "Chaton Bengal - 3 mois", desc: "Magnifique chaton Bengal, mâle, 3 mois. Vacciné, vermifugé.", priceRange: [5000000, 8000000], subcategory: "animaux", extra_fields: { animal_type: "chat", breed: "Bengal", age: "3 mois" }, images: ["photo-1574158622682-e40e69881006", "photo-1592194996308-7b43878e84a6"] },
    { title: "Golden Retriever - 2 ans", desc: "Golden Retriever mâle, 2 ans, très sociable. Dressé, propre.", priceRange: [3000000, 5000000], subcategory: "animaux", extra_fields: { animal_type: "chien", breed: "Golden Retriever", age: "2 ans" }, images: ["photo-1587300003388-59208cc962cb", "photo-1537151625747-768eb6cf92b2"] },
    { title: "Aquarium 200L complet + poissons", desc: "Aquarium 200L avec meuble, filtre externe, éclairage LED. 15 poissons tropicaux.", priceRange: [3000000, 5000000], subcategory: "animaux", extra_fields: { animal_type: "poisson", age: "1 an" }, images: ["photo-1520301255226-bf5f144451c1", "photo-1535591273668-578e31182c4f"] },
    { title: "Cage perroquet grande taille", desc: "Grande cage perroquet, 120x80x60cm, acier inoxydable. Perchoirs, gamelles.", priceRange: [1500000, 2500000], condition: "good", subcategory: "accessoires_animaux", images: ["photo-1452570053594-1b985d6ea890"] },
    { title: "Chiot Labrador chocolat - Vacciné", desc: "Chiots Labrador chocolat. Vaccinés, pucés. 2 mâles disponibles.", priceRange: [4000000, 7000000], subcategory: "animaux", extra_fields: { animal_type: "chien", breed: "Labrador", age: "2 mois" }, images: ["photo-1543466835-00a7907e9de1", "photo-1548199973-03cce0bbc87b"] },
    { title: "Chat perdu - Tabanan centre", desc: "Chat tigré gris, collier rouge. Perdu dans le quartier de Tabanan centre.", priceRange: [0, 0], subcategory: "animaux_perdus", images: ["photo-1561037404-61cd46aa615b"] },
    { title: "Perroquet Gris du Gabon - Parleur", desc: "Gris du Gabon, 4 ans, très bavard. Vocabulaire de 50+ mots.", priceRange: [8000000, 12000000], subcategory: "animaux", extra_fields: { animal_type: "oiseau", breed: "Gris du Gabon", age: "4 ans" }, images: ["photo-1425082661705-1834bfd09dca", "photo-1452570053594-1b985d6ea890"] },
  ],
  electronique: [
    { title: "MacBook Pro M2 14\" - 16Go/512Go", desc: "MacBook Pro 14 pouces, puce M2 Pro, 16Go RAM, 512Go SSD. AppleCare+.", priceRange: [18000000, 24000000], condition: "like_new", subcategory: "ordinateurs", extra_fields: { brand: "Apple", model: "MacBook Pro 14 M2 Pro" }, images: ["photo-1517694712202-14dd9538aa97", "photo-1496181133206-80ce9b88a853"] },
    { title: "iPhone 15 Pro Max 256Go - Titane naturel", desc: "iPhone 15 Pro Max, 256Go, titane naturel. 4 mois d'utilisation.", priceRange: [16000000, 20000000], condition: "like_new", subcategory: "telephones_connectes", extra_fields: { brand: "Apple", model: "iPhone 15 Pro Max 256Go" }, images: ["photo-1511707171634-5f897ff02aa9", "photo-1592750475338-74b7b21085ab"] },
    { title: "Sony A7III + objectif 24-70mm f/2.8", desc: "Sony Alpha 7 III, 25k déclenchements. Objectif Tamron 28-75 f/2.8.", priceRange: [14000000, 18000000], condition: "good", subcategory: "photo_audio_video", extra_fields: { brand: "Sony", model: "Alpha 7 III" }, images: ["photo-1516035069371-29a1b244cc32", "photo-1542038784456-1ea8df1e9bc1"] },
    { title: "iPad Air M1 - 256Go + Apple Pencil", desc: "iPad Air 5e gen, puce M1, 256Go. Apple Pencil 2e gen + Magic Keyboard.", priceRange: [9000000, 12000000], condition: "like_new", subcategory: "tablettes_liseuses", extra_fields: { brand: "Apple", model: "iPad Air M1 256Go" }, images: ["photo-1544244015-0df4b3ffc6b0", "photo-1585060544812-6b45742d762f"] },
    { title: "DJI Mini 3 Pro + Fly More Combo", desc: "Drone DJI Mini 3 Pro, combo Fly More. 3 batteries. Vidéo 4K.", priceRange: [8000000, 11000000], condition: "like_new", subcategory: "photo_audio_video", extra_fields: { brand: "DJI", model: "Mini 3 Pro" }, images: ["photo-1473968512647-3e447244af8f", "photo-1508444845599-5c89863b1c44"] },
    { title: "Samsung Galaxy S24 Ultra 512Go", desc: "Galaxy S24 Ultra, 512Go, gris titanium. S Pen, Galaxy AI.", priceRange: [14000000, 17000000], condition: "like_new", subcategory: "telephones_connectes", extra_fields: { brand: "Samsung", model: "Galaxy S24 Ultra 512Go" }, images: ["photo-1511707171634-5f897ff02aa9", "photo-1593642632559-0c6d3fc62b89"] },
    { title: "PS5 Digital + 2 manettes + 5 jeux", desc: "PlayStation 5 édition digitale, 2 manettes DualSense. 5 jeux dématérialisés.", priceRange: [5000000, 7000000], condition: "good", subcategory: "consoles", extra_fields: { brand: "Sony", model: "PlayStation 5 Digital" }, images: ["photo-1606144042614-b2417e99c4e3", "photo-1486401899868-0e435ed85128"] },
    { title: "Écran Dell 27\" 4K USB-C", desc: "Moniteur Dell U2723QE, 27 pouces, 4K UHD, USB-C 90W.", priceRange: [5000000, 7000000], condition: "good", subcategory: "accessoires_info", extra_fields: { brand: "Dell", model: "U2723QE" }, images: ["photo-1527443224154-c4a3942d3acf", "photo-1593642632559-0c6d3fc62b89"] },
    { title: "AirPods Pro 2e gen - USB-C", desc: "Apple AirPods Pro 2, boîtier USB-C. ANC, son spatial.", priceRange: [2500000, 3500000], condition: "good", subcategory: "accessoires_telephone", extra_fields: { brand: "Apple", model: "AirPods Pro 2" }, images: ["photo-1505740420928-5e560c06d30e", "photo-1590658268037-6bf12f032f55"] },
    { title: "Nintendo Switch OLED + 3 jeux", desc: "Switch OLED blanche, 3 jeux (Zelda, Mario Kart, Animal Crossing).", priceRange: [4000000, 5500000], condition: "good", subcategory: "consoles", extra_fields: { brand: "Nintendo", model: "Switch OLED" }, images: ["photo-1578303512597-81e6cc155b3e", "photo-1486401899868-0e435ed85128"] },
    { title: "GoPro Hero 12 Black + accessoires", desc: "GoPro Hero 12, vidéo 5.3K. Lot d'accessoires complet.", priceRange: [4500000, 6000000], condition: "like_new", subcategory: "photo_audio_video", extra_fields: { brand: "GoPro", model: "Hero 12 Black" }, images: ["photo-1526170375885-4d8ecf77b99f", "photo-1517649763962-0c623066013b"] },
  ],
  services: [
    { title: "Cours de surf - Tous niveaux - Canggu", desc: "Cours de surf personnalisé à Canggu. Moniteur certifié ISA. Planche fournie.", priceRange: [350000, 600000], subcategory: "cours_particuliers", images: ["photo-1502680390548-bdbac40a5e46", "photo-1455729552865-3658a5d39692"] },
    { title: "Babysitter bilingue FR/EN disponible", desc: "Babysitter expérimentée, bilingue français-anglais. Références sur demande.", priceRange: [100000, 150000], subcategory: "baby_sitting", images: ["photo-1503454537195-1dcabb73ffb9", "photo-1596461404969-9ae70f2830c1"] },
    { title: "Déménagement & transport Bali", desc: "Service de déménagement professionnel sur toute l'île de Bali. Camion 2.5T.", priceRange: [500000, 1500000], subcategory: "services_demenagement", images: ["photo-1600518464441-9154a4dea21b"] },
    { title: "Réparation iPhone & Samsung - Express", desc: "Réparation smartphone toutes marques : écran, batterie, port charge.", priceRange: [200000, 800000], subcategory: "services_reparations_electroniques", images: ["photo-1581578731548-c64695cc6952", "photo-1597872200969-2b65d56bd16b"] },
    { title: "Photographe mariage & événement Bali", desc: "Photographe professionnel pour mariage, anniversaire, corporate.", priceRange: [5000000, 15000000], subcategory: "evenements", images: ["photo-1542038784456-1ea8df1e9bc1", "photo-1519741497674-611481863552"] },
    { title: "Cours de bahasa Indonesia - Privé", desc: "Cours particuliers de bahasa Indonesia, tous niveaux. Méthode conversationnelle.", priceRange: [200000, 350000], subcategory: "cours_particuliers", images: ["photo-1503676260728-1c00da094a0b", "photo-1434030216411-0b793f4b4173"] },
    { title: "Mécanicien moto à domicile", desc: "Entretien et réparation moto à domicile. Toutes marques japonaises.", priceRange: [100000, 500000], subcategory: "services_reparations_mecaniques", images: ["photo-1558618666-fcd25c85f82e", "photo-1591637333184-19aa84b3e01f"] },
    { title: "Jardinier paysagiste - Entretien villa", desc: "Entretien jardin de villa : tonte, taille, arrosage. Création jardins tropicaux.", priceRange: [500000, 1500000], subcategory: "services_jardinerie_bricolage", images: ["photo-1416879595882-3373a0480b5b", "photo-1585320806297-9794b3e4eeae"] },
    { title: "DJ professionnel - Événements privés", desc: "DJ pro pour pool parties, mariages. Matériel complet fourni.", priceRange: [3000000, 8000000], subcategory: "artistes_musiciens", images: ["photo-1571266028243-e4733b0f0bb0", "photo-1493225457124-a3eb161ffa5f"] },
    { title: "Covoiturage Canggu → Ubud quotidien", desc: "Covoiturage quotidien Canggu-Ubud, départ 8h retour 17h.", priceRange: [50000, 100000], subcategory: "covoiturage", images: ["photo-1449824913935-59a10b8d2000"] },
  ],
  famille: [
    { title: "Poussette Yoyo Babyzen - Noire", desc: "Poussette Babyzen Yoyo+, noire, pliage compact. Nacelle 0+ et hamac 6+.", priceRange: [3000000, 5000000], condition: "good", subcategory: "equip_bebe", images: ["photo-1596461404969-9ae70f2830c1", "photo-1555252333-9f8e92e65df9"] },
    { title: "Lit bébé en rotin naturel", desc: "Magnifique lit bébé en rotin tressé à la main. Matelas coton bio inclus.", priceRange: [2000000, 3500000], condition: "like_new", subcategory: "mobilier_enfant", images: ["photo-1515488042361-ee00e0ddd4e4"] },
    { title: "Lot vêtements bébé 0-12 mois", desc: "Grand lot vêtements bébé garçon. 40+ pièces. Petit Bateau, Carter's, H&M.", priceRange: [500000, 800000], condition: "good", subcategory: "vetements_bebe", images: ["photo-1606092195730-5d7b9af1efc5", "photo-1503454537195-1dcabb73ffb9"] },
    { title: "Siège auto Maxi-Cosi - Groupe 0/1", desc: "Siège auto Maxi-Cosi Pebble Pro, groupe 0/1. Isofix. Certifié i-Size.", priceRange: [1500000, 2500000], condition: "good", subcategory: "equip_bebe", images: ["photo-1555252333-9f8e92e65df9"] },
    { title: "Bureau enfant Montessori en teck", desc: "Bureau enfant style Montessori, bois de teck massif. 2-6 ans.", priceRange: [1800000, 2800000], condition: "new", subcategory: "mobilier_enfant", images: ["photo-1544567567-0f2fcb009e0b"] },
    { title: "Porte-bébé ergonomique Ergobaby", desc: "Porte-bébé Ergobaby Omni 360, portage 4 positions. Naissance à 20 kg.", priceRange: [1200000, 1800000], condition: "like_new", subcategory: "equip_bebe", images: ["photo-1596461404969-9ae70f2830c1"] },
  ],
  maison_jardin: [
    { title: "Canapé 3 places rotin naturel", desc: "Canapé 3 places en rotin naturel, coussins en lin beige. Artisanal balinais.", priceRange: [4500000, 7000000], condition: "like_new", subcategory: "ameublement", images: ["photo-1555041469-a586c61ea9bc", "photo-1583847268964-b28dc8f51f92"] },
    { title: "Machine à café Breville Barista Express", desc: "Machine espresso Breville Barista Express. Moulin intégré, buse vapeur.", priceRange: [5000000, 7000000], condition: "good", subcategory: "electromenager", images: ["photo-1495474472287-4d71bcdd2085", "photo-1442512595331-e89e73853f31"] },
    { title: "Plantes tropicales - Lot de 10", desc: "Lot de 10 plantes tropicales en pot : monstera, ficus, calathea, pothos.", priceRange: [500000, 1000000], condition: "new", subcategory: "jardin_plantes", images: ["photo-1416879595882-3373a0480b5b", "photo-1459411552884-841db9b3cc2a"] },
    { title: "Table à manger teck massif - 8 places", desc: "Table en teck massif recyclé, 200x100cm. Style industriel pieds métal.", priceRange: [6000000, 10000000], condition: "good", subcategory: "ameublement", images: ["photo-1538688525198-9b88f6f53126", "photo-1616486338812-3dadae4b4ace"] },
    { title: "Ventilateur plafond design - Bois bambou", desc: "Ventilateur plafond pales bambou, télécommande, LED intégrée. 132cm.", priceRange: [2500000, 4000000], condition: "new", subcategory: "decoration", images: ["photo-1524758631624-e2822e304c36", "photo-1505691938895-1758d7feb511"] },
    { title: "Lave-linge Samsung 8kg - Inverter", desc: "Lave-linge Samsung 8kg, Digital Inverter. Silencieux. 1 an d'utilisation.", priceRange: [3000000, 4500000], condition: "good", subcategory: "electromenager", images: ["photo-1556228453-efd6c1ff04f6"] },
    { title: "Ensemble vaisselle artisanale Bali", desc: "Service 12 pièces en céramique artisanale balinaise. Couleur bleu océan.", priceRange: [800000, 1500000], condition: "new", subcategory: "arts_table", images: ["photo-1493809842364-78817add7ffb"] },
    { title: "Tondeuse à gazon Honda GCV170", desc: "Tondeuse Honda GCV170, coupe 46cm, auto-tractée. Bac 50L.", priceRange: [3000000, 4500000], condition: "good", subcategory: "bricolage", images: ["photo-1585320806297-9794b3e4eeae", "photo-1416879595882-3373a0480b5b"] },
  ],
  materiel_pro: [
    { title: "Machine à café pro La Marzocco Linea", desc: "La Marzocco Linea Mini, 1 groupe. Parfaite pour café ou petit restaurant.", priceRange: [35000000, 50000000], condition: "good", subcategory: "equip_restaurants_hotels", images: ["photo-1442512595331-e89e73853f31", "photo-1495474472287-4d71bcdd2085"] },
    { title: "Imprimante 3D Creality Ender 3 V3", desc: "Imprimante 3D FDM, auto-leveling, écran tactile. Idéal prototypage.", priceRange: [4000000, 6000000], condition: "like_new", subcategory: "equip_industriels", images: ["photo-1581093458791-9f3c3900df4b", "photo-1581094794329-c8112a89af12"] },
    { title: "Vitrine réfrigérée boulangerie", desc: "Vitrine réfrigérée 1.2m, éclairage LED, 3 étagères.", priceRange: [8000000, 12000000], condition: "good", subcategory: "equip_restaurants_hotels", images: ["photo-1604014237800-1c9102c219da"] },
    { title: "Mobilier de bureau complet - 4 postes", desc: "4 bureaux d'angle, 4 chaises ergonomiques, 2 armoires. Blanc et bois.", priceRange: [8000000, 15000000], condition: "good", subcategory: "equip_fournitures_bureau", images: ["photo-1497366216548-37526070297c", "photo-1486312338219-ce68d2c6f44d"] },
    { title: "Chariot élévateur Toyota 2.5T", desc: "Chariot élévateur Toyota 8FD25, diesel, capacité 2.5T. 3.500 heures.", priceRange: [120000000, 180000000], condition: "good", subcategory: "manutention_levage", images: ["photo-1504307651254-35680f356dfd"] },
    { title: "Présentoir vitrine magasin - 6 étagères", desc: "Présentoir métallique 6 étagères, finition chrome. Lot de 4 unités.", priceRange: [2000000, 4000000], condition: "good", subcategory: "equip_commerces_marches", images: ["photo-1604014237800-1c9102c219da", "photo-1497366216548-37526070297c"] },
  ],
  divers: [
    { title: "Déco murale macramé fait main", desc: "Grande décoration murale en macramé, fait main à Bali. 120x80cm.", priceRange: [350000, 600000], condition: "new", subcategory: "autres", images: ["photo-1524758631624-e2822e304c36", "photo-1505691938895-1758d7feb511"] },
    { title: "Lot d'huiles essentielles Bali", desc: "Coffret 12 huiles essentielles de Bali. 100% naturelles.", priceRange: [250000, 450000], condition: "new", subcategory: "autres", images: ["photo-1556228453-efd6c1ff04f6"] },
    { title: "Cartons de déménagement - Lot de 20", desc: "20 cartons solides double cannelure + rouleau de scotch.", priceRange: [100000, 200000], condition: "good", subcategory: "autres", images: ["photo-1553729459-afe8f2e2ed65"] },
    { title: "Tapis de yoga Manduka PRO", desc: "Tapis Manduka PRO 6mm. Surface grip, amortissement optimal. Vert forêt.", priceRange: [800000, 1200000], condition: "like_new", subcategory: "autres", images: ["photo-1544567567-0f2fcb009e0b", "photo-1545205597-3d9d02c29597"] },
    { title: "Hamac artisanal balinais - 2 places", desc: "Hamac double en coton tissé, frange macramé. Crochets et cordes inclus.", priceRange: [400000, 700000], condition: "new", subcategory: "autres", images: ["photo-1476514525535-07fb3b4ae5f1", "photo-1530841377377-3ff06c0ca713"] },
    { title: "Collection de coquillages Bali", desc: "Collection de 50+ coquillages et coraux. Boîte vitrine.", priceRange: [200000, 400000], condition: "good", subcategory: "autres", images: ["photo-1507525428034-b723cf961d3e"] },
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

    // ── PURGE ACTION ──
    if (body.action === "purge") {
      // Find all seed users by email pattern (paginate through auth)
      const seedUserIds: string[] = [];
      let page = 1;
      while (true) {
        const { data: { users: batch } } = await adminClient.auth.admin.listUsers({ page, perPage: 100 });
        if (!batch || batch.length === 0) break;
        for (const u of batch) {
          if (u.email?.endsWith("@seed.rebali.test")) seedUserIds.push(u.id);
        }
        if (batch.length < 100) break;
        page++;
      }

      console.log(`[purge] Found ${seedUserIds.length} seed users`);
      let deletedListings = 0;

      if (seedUserIds.length > 0) {
        const chunkSize = 30;

        // 1. Collect ALL listing IDs (bypass 1000-row default limit)
        const allListingIds: string[] = [];
        for (let i = 0; i < seedUserIds.length; i += chunkSize) {
          const userChunk = seedUserIds.slice(i, i + chunkSize);
          let from = 0;
          while (true) {
            const { data } = await adminClient
              .from("listings")
              .select("id")
              .in("seller_id", userChunk)
              .range(from, from + 999);
            if (!data || data.length === 0) break;
            allListingIds.push(...data.map((l: any) => l.id));
            if (data.length < 1000) break;
            from += 1000;
          }
        }
        console.log(`[purge] Found ${allListingIds.length} seed listings`);

        // 2. Delete all FK dependencies on listings (in chunks)
        for (let i = 0; i < allListingIds.length; i += chunkSize) {
          const ids = allListingIds.slice(i, i + chunkSize);
          await Promise.all([
            adminClient.from("listing_images").delete().in("listing_id", ids),
            adminClient.from("listing_translations").delete().in("listing_id", ids),
            adminClient.from("favorites").delete().in("listing_id", ids),
            adminClient.from("reports").delete().in("listing_id", ids),
            adminClient.from("whatsapp_click_logs").delete().in("listing_id", ids),
            adminClient.from("user_addons").delete().in("listing_id", ids),
            adminClient.from("search_notifications").delete().in("listing_id", ids),
          ]);
        }

        // 3. Delete conversations + messages for seed users
        for (let i = 0; i < seedUserIds.length; i += chunkSize) {
          const userChunk = seedUserIds.slice(i, i + chunkSize);
          const { data: convs1 } = await adminClient.from("conversations").select("id").in("buyer_id", userChunk);
          const { data: convs2 } = await adminClient.from("conversations").select("id").in("seller_id", userChunk);
          const convIds = [...(convs1 || []), ...(convs2 || [])].map((c: any) => c.id);
          const uniqueConvIds = [...new Set(convIds)];
          for (let j = 0; j < uniqueConvIds.length; j += chunkSize) {
            const convChunk = uniqueConvIds.slice(j, j + chunkSize);
            await adminClient.from("messages").delete().in("conversation_id", convChunk);
            await adminClient.from("wa_relay_tokens").delete().in("conversation_id", convChunk);
            await adminClient.from("reviews").delete().in("conversation_id", convChunk);
          }
          await adminClient.from("conversations").delete().in("buyer_id", userChunk);
          await adminClient.from("conversations").delete().in("seller_id", userChunk);
        }

        // 4. Delete listings
        for (let i = 0; i < seedUserIds.length; i += chunkSize) {
          const userChunk = seedUserIds.slice(i, i + chunkSize);
          const { count } = await adminClient.from("listings").delete({ count: "exact" }).in("seller_id", userChunk);
          deletedListings += count || 0;
        }

        // 5. Delete remaining user-linked data, then profiles, then auth
        for (let i = 0; i < seedUserIds.length; i += chunkSize) {
          const userChunk = seedUserIds.slice(i, i + chunkSize);
          await Promise.all([
            adminClient.from("user_blocks").delete().in("blocker_id", userChunk),
            adminClient.from("user_blocks").delete().in("blocked_id", userChunk),
            adminClient.from("referrals").delete().in("referrer_id", userChunk),
            adminClient.from("referrals").delete().in("referred_id", userChunk),
            adminClient.from("reviews").delete().in("reviewer_id", userChunk),
            adminClient.from("reviews").delete().in("seller_id", userChunk),
            adminClient.from("saved_searches").delete().in("user_id", userChunk),
            adminClient.from("favorites").delete().in("user_id", userChunk),
          ]);
          await adminClient.from("profiles").delete().in("id", userChunk);
        }

        // 6. Delete auth users (parallel batches of 5)
        for (let i = 0; i < seedUserIds.length; i += 5) {
          await Promise.all(
            seedUserIds.slice(i, i + 5).map(uid => adminClient.auth.admin.deleteUser(uid))
          );
        }
      }

      console.log(`[purge] Done: ${deletedListings} listings, ${seedUserIds.length} users`);
      return new Response(JSON.stringify({ deleted_listings: deletedListings, deleted_users: seedUserIds.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

      // Insert images for each listing using template-specific images
      if (insertedListings) {
        const imageRows: any[] = [];
        for (let idx = 0; idx < insertedListings.length; idx++) {
          const listing = insertedListings[idx];
          const meta = batchMeta[idx];
          // Use template-specific images if available, otherwise fall back to category pool
          const templateImages = meta?.template?.images;
          if (templateImages && templateImages.length > 0) {
            for (let j = 0; j < templateImages.length; j++) {
              imageRows.push({
                listing_id: listing.id,
                storage_path: unsplashUrl(templateImages[j]),
                sort_order: j,
              });
            }
          } else {
            const catImages = IMAGES[listing.category] || IMAGES.divers;
            const numImages = randInt(1, Math.min(3, catImages.length));
            const shuffled = [...catImages].sort(() => Math.random() - 0.5);
            for (let j = 0; j < numImages; j++) {
              imageRows.push({
                listing_id: listing.id,
                storage_path: unsplashUrl(shuffled[j]),
                sort_order: j,
              });
            }
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
