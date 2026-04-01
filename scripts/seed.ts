/**
 * Database seed script for LagunApp.
 *
 * Usage:
 *   npx ts-node --project tsconfig.base.json scripts/seed.ts
 *
 * Requires: PostgreSQL running with the credentials from .env.debug
 */

import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from backend root
config({ path: resolve(__dirname, '..', '.env') });

// ── Inline entity definitions (avoids path-alias issues when running standalone) ──

const UserRole = {
  USER: 'user',
  RESTAURANT: 'restaurant',
  ORGANIZER: 'organizer',
  SCANNER_STAFF: 'scanner_staff',
  THEATER_MANAGER: 'theater_manager',
  THEATER_SUBMANAGER: 'theater_submanager',
  ADMIN: 'admin',
} as const;

const AuthProvider = {
  LOCAL: 'local',
} as const;

const EventStatus = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

// ── DataSource ─────────────────────────────────────────────────────────────────

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.POSTGRES_HOST || 'localhost',
  port: Number(process.env.POSTGRES_PORT) || 5432,
  username: process.env.POSTGRES_USER || 'lagunapp',
  password: process.env.POSTGRES_PASSWORD || 'lagunapp_dev_2026',
  database: process.env.POSTGRES_DB || 'lagunapp_db',
  synchronize: false,
});

// ── Helpers ────────────────────────────────────────────────────────────────────

function daysFromNow(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(12, 0, 0, 0); // Noon local time — stays "today" in any timezone
  return d;
}

// ── Seed Data ──────────────────────────────────────────────────────────────────

const SEED_PASSWORD = 'LagunApp2026!';

const seedUsers = [
  // Admin
  {
    email: 'admin@lagunapp.com',
    name: 'Admin LagunApp',
    phone: '+52 871 000 0001',
    city: 'Torreón',
    role: UserRole.ADMIN,
    provider: AuthProvider.LOCAL,
    isVerified: true,
    isActive: true,
    interests: [],
  },
  // Regular users
  {
    email: 'carlos.mendoza@correo.mx',
    name: 'Carlos Mendoza',
    phone: '+52 871 123 4567',
    city: 'Torreón',
    role: UserRole.USER,
    provider: AuthProvider.LOCAL,
    isVerified: true,
    isActive: true,
    interests: ['Conciertos', 'Gastronomía', 'Vida nocturna', 'Deportes', 'Cultura'],
  },
  {
    email: 'ana.reyes@correo.mx',
    name: 'Ana Lucia Reyes',
    phone: '+52 871 234 5678',
    city: 'Torreón',
    role: UserRole.USER,
    provider: AuthProvider.LOCAL,
    isVerified: true,
    isActive: true,
    interests: ['Festivales', 'Cultural', 'Gastronomía'],
  },
  {
    email: 'fernando.g@correo.mx',
    name: 'Fernando Gutierrez',
    phone: '+52 871 345 6789',
    city: 'Gómez Palacio',
    role: UserRole.USER,
    provider: AuthProvider.LOCAL,
    isVerified: true,
    isActive: true,
    interests: ['Deportes', 'Conferencias', 'Vida nocturna'],
  },
  {
    email: 'valentina.cruz@correo.mx',
    name: 'Valentina Cruz',
    phone: '+52 871 456 7890',
    city: 'Lerdo',
    role: UserRole.USER,
    provider: AuthProvider.LOCAL,
    isVerified: true,
    isActive: true,
    interests: ['Cultural', 'Conciertos', 'Familiar'],
  },
  // Organizers
  {
    email: 'roberto.sanchez@correo.mx',
    name: 'Roberto Sanchez',
    phone: '+52 871 567 8901',
    city: 'Torreón',
    role: UserRole.ORGANIZER,
    provider: AuthProvider.LOCAL,
    isVerified: true,
    isActive: true,
    interests: [],
  },
  {
    email: 'diego.ramirez@correo.mx',
    name: 'Diego Ramirez',
    phone: '+52 871 678 9012',
    city: 'Torreón',
    role: UserRole.ORGANIZER,
    provider: AuthProvider.LOCAL,
    isVerified: true,
    isActive: true,
    interests: [],
  },
  // Restaurant owners
  {
    email: 'maria.torres@correo.mx',
    name: 'Maria Torres',
    phone: '+52 871 789 0123',
    city: 'Torreón',
    role: UserRole.RESTAURANT,
    provider: AuthProvider.LOCAL,
    isVerified: true,
    isActive: true,
    interests: [],
  },
  {
    email: 'patricia.nav@correo.mx',
    name: 'Patricia Navarro',
    phone: '+52 871 890 1234',
    city: 'Gómez Palacio',
    role: UserRole.RESTAURANT,
    provider: AuthProvider.LOCAL,
    isVerified: true,
    isActive: true,
    interests: [],
  },
  // Theater managers
  {
    email: 'jorge.luna@correo.mx',
    name: 'Jorge Luna',
    phone: '+52 871 111 2233',
    city: 'Torreón',
    role: UserRole.THEATER_MANAGER,
    provider: AuthProvider.LOCAL,
    isVerified: true,
    isActive: true,
    interests: [],
  },
  {
    email: 'laura.rios@correo.mx',
    name: 'Laura Rios',
    phone: '+52 871 222 3344',
    city: 'Gómez Palacio',
    role: UserRole.THEATER_MANAGER,
    provider: AuthProvider.LOCAL,
    isVerified: true,
    isActive: true,
    interests: [],
  },
  // Scanner staff
  {
    email: 'luis.martinez@correo.mx',
    name: 'Luis Martinez',
    phone: '+52 871 901 2345',
    city: 'Torreón',
    role: UserRole.SCANNER_STAFF,
    provider: AuthProvider.LOCAL,
    isVerified: true,
    isActive: true,
    interests: [],
  },
  {
    email: 'sofia.hernandez@correo.mx',
    name: 'Sofia Hernandez',
    phone: '+52 871 012 3456',
    city: 'Torreón',
    role: UserRole.SCANNER_STAFF,
    provider: AuthProvider.LOCAL,
    isVerified: true,
    isActive: true,
    interests: [],
  },
];

interface SeedEvent {
  title: string;
  description: string;
  category: string;
  daysFromNow: number;
  time: string;
  location: string;
  city: string;
  price: number;
  imageUrl: string;
  isPlusEighteen: boolean;
  isFeatured: boolean;
  organizerEmail: string;
  capacity: number;
  ticketsSold: number;
  status: (typeof EventStatus)[keyof typeof EventStatus];
  ticketTypes: { name: string; price: number; available: boolean; maxQuantity: number }[];
}

const seedEvents: SeedEvent[] = [
  {
    title: 'Noche de Karaoke Lagunero',
    description: 'La mejor noche de karaoke en Torreon. Canta tus canciones favoritas con sonido profesional, bebidas especiales y premios para los mejores cantantes.',
    category: 'vida_nocturna',
    daysFromNow: 0,
    time: '21:00',
    location: 'Bar La Cueva',
    city: 'Torreón',
    price: 150.0,
    imageUrl: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&h=340&fit=crop',
    isPlusEighteen: true,
    isFeatured: false,
    organizerEmail: 'roberto.sanchez@correo.mx',
    capacity: 200,
    ticketsSold: 145,
    status: EventStatus.ACTIVE,
    ticketTypes: [
      { name: 'General', price: 150, available: true, maxQuantity: 200 },
    ],
  },
  {
    title: 'Mercado Artesanal del Desierto',
    description: 'Mercado de artesanias, productos locales y comida regional. Mas de 50 expositores de toda la Comarca Lagunera. Musica en vivo y talleres para ninos.',
    category: 'familiar',
    daysFromNow: 0,
    time: '10:00',
    location: 'Plaza de Armas',
    city: 'Torreón',
    price: 0.0,
    imageUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&h=340&fit=crop',
    isPlusEighteen: false,
    isFeatured: true,
    organizerEmail: 'diego.ramirez@correo.mx',
    capacity: 2000,
    ticketsSold: 0,
    status: EventStatus.ACTIVE,
    ticketTypes: [
      { name: 'Entrada Libre', price: 0, available: true, maxQuantity: 2000 },
    ],
  },
  {
    title: 'Banda MS en Concierto',
    description:
      'La Banda MS de Sergio Lizárraga llega a Torreón con su gira "El Mejor Viernes de Tu Vida". Una noche inolvidable con todos sus éxitos que han marcado a la música regional mexicana.',
    category: 'conciertos',
    daysFromNow: 12,
    time: '21:00',
    location: 'Coliseo Centenario',
    city: 'Torreón',
    price: 850.0,
    imageUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600&h=340&fit=crop',
    isPlusEighteen: false,
    isFeatured: true,
    organizerEmail: 'roberto.sanchez@correo.mx',
    capacity: 8000,
    ticketsSold: 6240,
    status: EventStatus.ACTIVE,
    ticketTypes: [
      { name: 'General', price: 850, available: true, maxQuantity: 6000 },
      { name: 'VIP', price: 1700, available: true, maxQuantity: 1500 },
      { name: 'Early Bird', price: 595, available: false, maxQuantity: 500 },
    ],
  },
  {
    title: 'Festival del Mezcal Lagunero',
    description:
      'Tercer festival anual dedicado al mezcal artesanal. Más de 40 marcas de mezcal de Durango, Oaxaca y San Luis Potosí. Incluye maridaje, catas guiadas y música en vivo.',
    category: 'festivales',
    daysFromNow: 20,
    time: '16:00',
    location: 'Parque Fundadores',
    city: 'Torreón',
    price: 450.0,
    imageUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&h=340&fit=crop',
    isPlusEighteen: true,
    isFeatured: true,
    organizerEmail: 'diego.ramirez@correo.mx',
    capacity: 3000,
    ticketsSold: 1870,
    status: EventStatus.ACTIVE,
    ticketTypes: [
      { name: 'General', price: 450, available: true, maxQuantity: 2500 },
      { name: 'VIP + Cata', price: 950, available: true, maxQuantity: 500 },
    ],
  },
  {
    title: 'Noche de DJ: Electro Desierto',
    description:
      'La mejor fiesta electrónica de La Laguna. Line-up: DJ Nopal, Sahra Bass y Duna Beats. Open bar de 11pm a 1am incluido en el boleto VIP.',
    category: 'vida_nocturna',
    daysFromNow: 5,
    time: '23:00',
    location: 'Club Mirage',
    city: 'Torreón',
    price: 350.0,
    imageUrl: 'https://images.unsplash.com/photo-1571266028243-d220c6a3483f?w=600&h=340&fit=crop',
    isPlusEighteen: true,
    isFeatured: false,
    organizerEmail: 'roberto.sanchez@correo.mx',
    capacity: 1200,
    ticketsSold: 780,
    status: EventStatus.ACTIVE,
    ticketTypes: [
      { name: 'General', price: 350, available: true, maxQuantity: 900 },
      { name: 'VIP + Open Bar', price: 700, available: true, maxQuantity: 300 },
    ],
  },
  {
    title: 'Santos vs Cruz Azul - Liga MX',
    description:
      'Jornada 14 de la Liga MX. Los Guerreros del Santos Laguna reciben al Cruz Azul en el Territorio Santos Modelo. ¡Vamos Guerreros!',
    category: 'deportes',
    daysFromNow: 8,
    time: '19:00',
    location: 'Territorio Santos Modelo',
    city: 'Torreón',
    price: 280.0,
    imageUrl: 'https://images.unsplash.com/photo-1552072092-7f9b8d63efcb?w=600&h=340&fit=crop',
    isPlusEighteen: false,
    isFeatured: true,
    organizerEmail: 'roberto.sanchez@correo.mx',
    capacity: 30000,
    ticketsSold: 24500,
    status: EventStatus.ACTIVE,
    ticketTypes: [
      { name: 'General', price: 280, available: true, maxQuantity: 20000 },
      { name: 'Preferente', price: 550, available: true, maxQuantity: 8000 },
      { name: 'Palco', price: 1200, available: true, maxQuantity: 2000 },
    ],
  },
  {
    title: 'Exposición: Arte del Desierto',
    description:
      'Muestra colectiva de 12 artistas laguneros que exploran la identidad del norte de México a través de pintura, escultura e instalación. Curada por la Mtra. Gabriela Flores.',
    category: 'cultural',
    daysFromNow: 3,
    time: '10:00',
    location: 'Museo Arocena',
    city: 'Torreón',
    price: 60.0,
    imageUrl: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=600&h=340&fit=crop',
    isPlusEighteen: false,
    isFeatured: false,
    organizerEmail: 'diego.ramirez@correo.mx',
    capacity: 500,
    ticketsSold: 210,
    status: EventStatus.ACTIVE,
    ticketTypes: [
      { name: 'Adulto', price: 60, available: true, maxQuantity: 400 },
      { name: 'Estudiante', price: 30, available: true, maxQuantity: 100 },
    ],
  },
  {
    title: 'Tech Laguna Conference 2026',
    description:
      'Conferencia de tecnología e innovación con speakers nacionales e internacionales. Temas: IA, emprendimiento, fintech y desarrollo de software. Incluye talleres prácticos.',
    category: 'conferencias',
    daysFromNow: 30,
    time: '09:00',
    location: 'Centro de Convenciones',
    city: 'Torreón',
    price: 1200.0,
    imageUrl: 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=600&h=340&fit=crop',
    isPlusEighteen: false,
    isFeatured: true,
    organizerEmail: 'diego.ramirez@correo.mx',
    capacity: 2000,
    ticketsSold: 1100,
    status: EventStatus.ACTIVE,
    ticketTypes: [
      { name: 'General', price: 1200, available: true, maxQuantity: 1500 },
      { name: 'VIP + Talleres', price: 2400, available: true, maxQuantity: 500 },
    ],
  },
  {
    title: 'Feria de la Gordita y el Taco',
    description:
      'Celebración gastronómica con más de 30 puestos de gorditas y tacos de toda la Comarca Lagunera. Concursos, música norteña y actividades para toda la familia.',
    category: 'festivales',
    daysFromNow: 15,
    time: '12:00',
    location: 'Plaza Mayor',
    city: 'Gómez Palacio',
    price: 0.0,
    imageUrl: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=600&h=340&fit=crop',
    isPlusEighteen: false,
    isFeatured: false,
    organizerEmail: 'roberto.sanchez@correo.mx',
    capacity: 5000,
    ticketsSold: 0,
    status: EventStatus.ACTIVE,
    ticketTypes: [
      { name: 'Entrada Libre', price: 0, available: true, maxQuantity: 5000 },
    ],
  },
  {
    title: 'Noche de Comedia Stand-Up',
    description:
      'Los mejores comediantes del norte se reúnen para una noche de risas. Presentan: Paco Ramírez, Ana "La Norteña" López y Miguel Ángel Torres. Contenido para adultos.',
    category: 'vida_nocturna',
    daysFromNow: 10,
    time: '20:30',
    location: 'Teatro Isauro Martínez',
    city: 'Torreón',
    price: 400.0,
    imageUrl: 'https://images.unsplash.com/photo-1585699324551-f6c309eedeca?w=600&h=340&fit=crop',
    isPlusEighteen: true,
    isFeatured: false,
    organizerEmail: 'diego.ramirez@correo.mx',
    capacity: 1500,
    ticketsSold: 920,
    status: EventStatus.ACTIVE,
    ticketTypes: [
      { name: 'General', price: 400, available: true, maxQuantity: 1000 },
      { name: 'VIP', price: 750, available: true, maxQuantity: 500 },
    ],
  },
];

const seedRestaurants = [
  { name: 'La Majada', description: 'Cocina tradicional mexicana con recetas familiares de tres generaciones. Especialidad en cabrito al pastor, enchiladas laguneras y postres de nuez de la region.', cuisineType: 'Mexicana', priceRange: 3, rating: 4.7, reviewCount: 342, address: 'Blvd. Independencia 1245, Col. Centro', city: 'Torreón', imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=400&fit=crop', phone: '+52 871 712 3456', isOpenNow: true, hasPromos: true, deliveryPlatforms: ['Uber Eats', 'DiDi Food', 'Rappi'], subscriptionTier: 'premium', hasLiveChat: true },
  { name: 'Sakura Torreón', description: 'Autentica cocina japonesa en el corazon de La Laguna. Sushi de calidad premium, ramen artesanal y teppanyaki preparado frente a ti.', cuisineType: 'Japonesa', priceRange: 4, rating: 4.5, reviewCount: 198, address: 'Blvd. Revolucion 890, Col. Torreón Jardín', city: 'Torreón', imageUrl: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=400&h=400&fit=crop', phone: '+52 871 718 9012', isOpenNow: true, hasPromos: false, deliveryPlatforms: ['Uber Eats', 'Rappi'], subscriptionTier: 'basic', hasLiveChat: false },
  { name: 'Trattoria Don Vito', description: 'Restaurante italiano con horno de lena importado de Napoles. Pizzas artesanales, pastas frescas hechas en casa y una seleccion de vinos italianos y mexicanos.', cuisineType: 'Italiana', priceRange: 3, rating: 4.3, reviewCount: 267, address: 'Av. Morelos 456, Col. Primero de Cobián', city: 'Torreón', imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&h=400&fit=crop', phone: '+52 871 714 5678', isOpenNow: false, hasPromos: true, deliveryPlatforms: ['Uber Eats', 'DiDi Food'], subscriptionTier: 'premium', hasLiveChat: true },
  { name: 'Mariscos El Güero', description: 'Los mejores mariscos estilo Sinaloa en la Comarca Lagunera. Aguachile, ceviche, camarones a la diabla y torre de mariscos.', cuisineType: 'Mariscos', priceRange: 2, rating: 4.6, reviewCount: 512, address: 'Calle Falcon 210, Col. Centro', city: 'Gómez Palacio', imageUrl: 'https://images.unsplash.com/photo-1615141982883-c7ad0e69fd62?w=400&h=400&fit=crop', phone: '+52 871 715 3344', isOpenNow: true, hasPromos: false, deliveryPlatforms: ['DiDi Food'], subscriptionTier: 'free', hasLiveChat: false },
  { name: 'Tacos Don Chava', description: 'Taqueria legendaria desde 1985. Tacos de carne asada al carbon, tripitas, cabeza y lengua. La salsa roja es famosa en toda la comarca.', cuisineType: 'Tacos', priceRange: 1, rating: 4.8, reviewCount: 1024, address: 'Av. Juárez 780, Col. Centro', city: 'Lerdo', imageUrl: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400&h=400&fit=crop', phone: '+52 871 725 1122', isOpenNow: true, hasPromos: false, deliveryPlatforms: [], subscriptionTier: 'free', hasLiveChat: false },
  { name: 'Ánimo Restaurante', description: 'Fine dining contemporaneo con ingredientes del desierto chihuahuense. Menu degustacion de 7 tiempos con maridaje.', cuisineType: 'Alta Cocina', priceRange: 4, rating: 4.9, reviewCount: 156, address: 'Blvd. Independencia 3200, Col. San Isidro', city: 'Torreón', imageUrl: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400&h=400&fit=crop', phone: '+52 871 720 8899', isOpenNow: false, hasPromos: false, deliveryPlatforms: [], subscriptionTier: 'promax', hasLiveChat: true },
  { name: 'El Fogón de Matamoros', description: 'Restaurante familiar con el mejor asado de puerco de la comarca. Gorditas recien hechas, discada y carne seca.', cuisineType: 'Mexicana', priceRange: 1, rating: 4.4, reviewCount: 389, address: 'Calle Hidalgo 55, Col. Centro', city: 'Matamoros', imageUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&h=400&fit=crop', phone: '+52 871 826 4455', isOpenNow: true, hasPromos: true, deliveryPlatforms: ['DiDi Food'], subscriptionTier: 'basic', hasLiveChat: false },
];

const seedTours = [
  { title: 'Ruta Gastronómica Lagunera', description: 'Recorre los mejores spots de comida en Torreón y Gómez Palacio. Incluye 5 paradas con degustaciones: gorditas, tacos, mariscos, nieves y mezcal. Transporte incluido.', type: 'gastronomico', duration: '4 horas', price: 650, rating: 4.8, imageUrl: 'https://images.unsplash.com/photo-1504544750208-dc0358e63f7f?w=360&h=480&fit=crop', pointsOfInterest: ['Mercado Alianza', 'Tacos Don Chava', 'Mariscos El Güero', 'Nieves de Lerdo', 'Mezcalería La Duna'], isFirstParty: true, daysFromNow: 2 },
  { title: 'Torreón Cultural e Histórico', description: 'Descubre la rica historia de Torreón. Visita el Museo Arocena, el Teatro Isauro Martínez, la Casa del Cerro y el Canal de la Perla.', type: 'cultural', duration: '3 horas', price: 400, rating: 4.6, imageUrl: 'https://images.unsplash.com/photo-1518638150340-f706e86654de?w=360&h=480&fit=crop', pointsOfInterest: ['Museo Arocena', 'Teatro Isauro Martínez', 'Casa del Cerro', 'Canal de la Perla', 'Plaza de Armas'], isFirstParty: true, daysFromNow: 1 },
  { title: 'Noche Lagunera VIP', description: 'La mejor experiencia nocturna de la comarca. Cena en restaurante premium, acceso VIP a dos antros y barra libre en cada uno.', type: 'vida_nocturna', duration: '6 horas', price: 1800, rating: 4.4, imageUrl: 'https://images.unsplash.com/photo-1571266028243-d220c6a3483f?w=360&h=480&fit=crop', pointsOfInterest: ['Ánimo Restaurante', 'Club Mirage VIP', 'Terraza La Azotea', 'After party privado'], isFirstParty: false, daysFromNow: 6 },
  { title: 'Aventura en el Desierto', description: 'Explora las dunas de Bilbao y el Cañón de Fernández. Incluye senderismo, rappel basico, avistamiento de fauna y comida campestre.', type: 'aventura', duration: '8 horas', price: 1200, rating: 4.7, imageUrl: 'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=360&h=480&fit=crop', pointsOfInterest: ['Dunas de Bilbao', 'Cañón de Fernández', 'Zona de rappel', 'Mirador del desierto', 'Campamento'], isFirstParty: false, daysFromNow: 4 },
  { title: 'Ruta del Vino y Mezcal', description: 'Visita viñedos y mezcalerias artesanales de la region. Aprende sobre el proceso de destilacion, participa en catas guiadas y llevate una botella de recuerdo.', type: 'gastronomico', duration: '5 horas', price: 900, rating: 4.5, imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=360&h=480&fit=crop', pointsOfInterest: ['Viñedos Casa Grande', 'Mezcalería Don Aurelio', 'Destilería del Desierto', 'Tienda regional'], isFirstParty: true, daysFromNow: 9 },
];

// ── Main ───────────────────────────────────────────────────────────────────────

async function seed() {
  console.log('🌱 Connecting to database...');
  await AppDataSource.initialize();
  const q = AppDataSource.query.bind(AppDataSource);

  // Check if tables exist, create them if not (first run before api-gateway)
  await q(`CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR UNIQUE NOT NULL, password VARCHAR, name VARCHAR NOT NULL,
    phone VARCHAR, city VARCHAR,
    role VARCHAR DEFAULT 'user', provider VARCHAR DEFAULT 'local',
    "providerId" VARCHAR, "avatarUrl" VARCHAR, interests JSONB,
    "canCreateClans" BOOLEAN DEFAULT false,
    "isVerified" BOOLEAN DEFAULT false, "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP DEFAULT now(), "updatedAt" TIMESTAMP DEFAULT now()
  )`);
  await q(`CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR NOT NULL, description TEXT, category VARCHAR, date TIMESTAMP,
    time VARCHAR, location VARCHAR, city VARCHAR,
    price DECIMAL(10,2), "imageUrl" VARCHAR,
    "isPlusEighteen" BOOLEAN DEFAULT false, "isFeatured" BOOLEAN DEFAULT false,
    "organizerId" UUID, capacity INT, "ticketsSold" INT DEFAULT 0,
    status VARCHAR DEFAULT 'draft',
    "createdAt" TIMESTAMP DEFAULT now(), "updatedAt" TIMESTAMP DEFAULT now()
  )`);
  await q(`CREATE TABLE IF NOT EXISTS ticket_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "eventId" UUID REFERENCES events(id) ON DELETE CASCADE,
    name VARCHAR NOT NULL, price DECIMAL(10,2),
    available BOOLEAN DEFAULT true, "maxQuantity" INT
  )`);
  await q(`CREATE TABLE IF NOT EXISTS clan_creation_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR UNIQUE NOT NULL, value VARCHAR NOT NULL,
    description VARCHAR, "updatedAt" TIMESTAMP DEFAULT now()
  )`);

  // Clear existing data
  const [{ count: existingCount }] = await q(`SELECT COUNT(*) as count FROM users`);
  if (parseInt(existingCount) > 0) {
    console.log(`⚠️  Database has ${existingCount} users. Clearing and re-seeding...`);
    await q(`DELETE FROM ticket_types`);
    await q(`DELETE FROM events`);
    await q(`DELETE FROM users`);
  }

  // Hash password once
  const hashedPassword = await bcrypt.hash(SEED_PASSWORD, 10);

  // ── Seed Users ──────────────────────────────────────────────────────────────
  console.log('👤 Seeding users...');
  const createdUsers: Record<string, { id: string }> = {};

  for (const u of seedUsers) {
    const [saved] = await q(
      `INSERT INTO users (email, password, name, phone, city, role, provider, "isVerified", "isActive", interests, "canCreateClans")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
      [u.email, hashedPassword, u.name, u.phone, u.city, u.role, u.provider,
       u.isVerified, u.isActive, JSON.stringify(u.interests),
       u.role === UserRole.ORGANIZER]
    );
    createdUsers[u.email] = saved;
    console.log(`   ✓ ${u.name} (${u.role}) — ${u.email}`);
  }

  // ── Seed Events + Ticket Types ──────────────────────────────────────────────
  console.log('🎪 Seeding events...');

  for (const ev of seedEvents) {
    const organizer = createdUsers[ev.organizerEmail];
    if (!organizer) { console.log(`   ✗ Skipping "${ev.title}"`); continue; }

    const [saved] = await q(
      `INSERT INTO events (title, description, category, date, time, location, city,
        price, "imageUrl", "isPlusEighteen", "isFeatured", "organizerId",
        capacity, "ticketsSold", status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING id`,
      [ev.title, ev.description, ev.category, daysFromNow(ev.daysFromNow),
       ev.time, ev.location, ev.city, ev.price, ev.imageUrl,
       ev.isPlusEighteen, ev.isFeatured, organizer.id,
       ev.capacity, ev.ticketsSold, ev.status]
    );

    for (const tt of ev.ticketTypes) {
      await q(
        `INSERT INTO ticket_types ("eventId", name, price, available, "maxQuantity")
         VALUES ($1,$2,$3,$4,$5)`,
        [saved.id, tt.name, tt.price, tt.available, tt.maxQuantity]
      );
    }
    console.log(`   ✓ ${ev.title} (${ev.ticketTypes.length} ticket types)`);
  }

  // ── Seed Restaurants ─────────────────────────────────────────────────────────
  console.log('🍽️  Seeding restaurants...');
  await q(`CREATE TABLE IF NOT EXISTS restaurants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR NOT NULL, description TEXT, "cuisineType" VARCHAR, "priceRange" INT DEFAULT 2,
    rating DECIMAL(2,1) DEFAULT 0, "reviewCount" INT DEFAULT 0,
    address VARCHAR, city VARCHAR, "imageUrl" VARCHAR, phone VARCHAR,
    "isOpenNow" BOOLEAN DEFAULT false, "hasPromos" BOOLEAN DEFAULT false,
    "deliveryPlatforms" JSONB, "subscriptionTier" VARCHAR DEFAULT 'free',
    "hasLiveChat" BOOLEAN DEFAULT false, "ownerId" UUID,
    "createdAt" TIMESTAMP DEFAULT now(), "updatedAt" TIMESTAMP DEFAULT now()
  )`);
  await q(`DELETE FROM restaurants`);

  for (const r of seedRestaurants) {
    await q(
      `INSERT INTO restaurants (name, description, "cuisineType", "priceRange", rating, "reviewCount",
        address, city, "imageUrl", phone, "isOpenNow", "hasPromos", "deliveryPlatforms",
        "subscriptionTier", "hasLiveChat")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
      [r.name, r.description, r.cuisineType, r.priceRange, r.rating, r.reviewCount,
       r.address, r.city, r.imageUrl, r.phone, r.isOpenNow, r.hasPromos,
       JSON.stringify(r.deliveryPlatforms), r.subscriptionTier, r.hasLiveChat]
    );
    console.log(`   ✓ ${r.name} (${r.cuisineType})`);
  }

  // ── Seed Tours ──────────────────────────────────────────────────────────────
  console.log('🗺️  Seeding tours...');
  await q(`CREATE TABLE IF NOT EXISTS tours (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR NOT NULL, description TEXT, type VARCHAR, duration VARCHAR,
    price DECIMAL(10,2), rating DECIMAL(2,1) DEFAULT 0,
    "imageUrl" VARCHAR, "pointsOfInterest" JSONB,
    "isFirstParty" BOOLEAN DEFAULT false, "nextAvailableDate" TIMESTAMP,
    "createdAt" TIMESTAMP DEFAULT now(), "updatedAt" TIMESTAMP DEFAULT now()
  )`);
  await q(`DELETE FROM tours`);

  for (const t of seedTours) {
    await q(
      `INSERT INTO tours (title, description, type, duration, price, rating,
        "imageUrl", "pointsOfInterest", "isFirstParty", "nextAvailableDate")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [t.title, t.description, t.type, t.duration, t.price, t.rating,
       t.imageUrl, JSON.stringify(t.pointsOfInterest), t.isFirstParty,
       daysFromNow(t.daysFromNow)]
    );
    console.log(`   ✓ ${t.title} (${t.type})`);
  }

  // ── Seed Artists (Postgres core + MongoDB profiles) ──────────────────────────
  console.log('🎤 Seeding local artists...');
  await q(`DROP TABLE IF EXISTS artists`);
  await q(`CREATE TABLE artists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR NOT NULL, bio TEXT, city VARCHAR,
    genres JSONB, "imageUrl" VARCHAR,
    "spotifyArtistId" VARCHAR, "userId" UUID,
    "isVerified" BOOLEAN DEFAULT false, "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP DEFAULT now(), "updatedAt" TIMESTAMP DEFAULT now()
  )`);

  const seedArtists = [
    { name: 'Los Buitres de Culiacan Sinaloa', bio: 'Agrupacion norteña originaria de Sinaloa con fuerte presencia en La Laguna.', city: 'Torreón', genres: ['Regional Mexicano', 'Norteño', 'Corridos'], imageUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop', spotifyArtistId: '0EFisYRi20PTABuIRkKxdP', isVerified: true, social: { instagram: 'https://instagram.com/losbuitresoficial' } },
    { name: 'DJ Nopal', bio: 'DJ y productor de musica electronica de Torreon. Residente en Club Mirage.', city: 'Torreón', genres: ['Electronica', 'House', 'Techno'], imageUrl: 'https://images.unsplash.com/photo-1571266028243-d220c6a3483f?w=400&h=400&fit=crop', spotifyArtistId: '', isVerified: false, social: { instagram: 'https://instagram.com/djnopal', tiktok: 'https://tiktok.com/@djnopal' } },
    { name: 'Marcela y Los Duendes', bio: 'Banda de rock alternativo lagunero. Ganadores del Festival Revueltas 2025.', city: 'Gómez Palacio', genres: ['Rock Alternativo', 'Indie'], imageUrl: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=400&h=400&fit=crop', spotifyArtistId: '', isVerified: true, social: { instagram: 'https://instagram.com/marcelaylosduendes', youtube: 'https://youtube.com/@marcelaylosduendes' } },
    { name: 'Colectivo Mezcal Sound', bio: 'Proyecto musical que fusiona cumbia, hip-hop y sonidos prehispanicos.', city: 'Lerdo', genres: ['Cumbia', 'Hip-Hop', 'Fusion'], imageUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=400&fit=crop', spotifyArtistId: '', isVerified: false, social: { instagram: 'https://instagram.com/mezcalsound', facebook: 'https://facebook.com/mezcalsound' } },
    { name: 'Ana La Norteña', bio: 'Cantautora y comediante de Torreon. Viral en TikTok con mas de 500k seguidores.', city: 'Torreón', genres: ['Regional Mexicano', 'Pop', 'Comedia'], imageUrl: 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=400&h=400&fit=crop', spotifyArtistId: '', isVerified: true, social: { instagram: 'https://instagram.com/analanortena', tiktok: 'https://tiktok.com/@analanortena' } },
    { name: 'Duna Beats', bio: 'Productora y DJ de musica ambient y downtempo del desierto chihuahuense.', city: 'Torreón', genres: ['Ambient', 'Downtempo', 'Electronica'], imageUrl: 'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=400&h=400&fit=crop', spotifyArtistId: '', isVerified: false, social: { instagram: 'https://instagram.com/dunabeats' } },
  ];

  // Also seed MongoDB artist profiles (social links, extended bio)
  const mongoUri = process.env.MONGO_URI || 'mongodb://lagunapp:lagunapp_dev_2026@localhost:27018/lagunapp_db?authSource=admin';
  let mongoSeeded = false;
  try {
    const mongoose = await import('mongoose');
    const MongoClient = mongoose.default.mongo.MongoClient;
    const mongo = new MongoClient(mongoUri);
    await mongo.connect();
    const db = mongo.db();
    await db.collection('artist_profiles').deleteMany({});

    for (const a of seedArtists) {
      const [inserted] = await q(
        `INSERT INTO artists (name, bio, city, genres, "imageUrl", "spotifyArtistId", "isVerified")
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
        [a.name, a.bio, a.city, JSON.stringify(a.genres), a.imageUrl,
         a.spotifyArtistId || null, a.isVerified]
      );

      // Insert profile into MongoDB with social links
      await db.collection('artist_profiles').insertOne({
        artistId: inserted.id,
        bio: a.bio,
        socialLinks: a.social,
        photos: [],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      console.log(`   ✓ ${a.name} (PG + Mongo)`);
    }

    await mongo.close();
    mongoSeeded = true;
  } catch (err: any) {
    console.log(`   ⚠ MongoDB seed failed: ${err.message}`);
    // Still seed Postgres only
    for (const a of seedArtists) {
      await q(
        `INSERT INTO artists (name, bio, city, genres, "imageUrl", "spotifyArtistId", "isVerified")
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [a.name, a.bio, a.city, JSON.stringify(a.genres), a.imageUrl,
         a.spotifyArtistId || null, a.isVerified]
      );
      console.log(`   ✓ ${a.name} (PG only)`);
    }
  }

  // ── Seed Theaters ──────────────────────────────────────────────────────────
  console.log('🎭 Seeding theaters...');
  await q(`CREATE TABLE IF NOT EXISTS theaters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR NOT NULL, description TEXT, address VARCHAR, city VARCHAR,
    "imageUrl" VARCHAR, phone VARCHAR, "managerId" UUID,
    capacity INT DEFAULT 0, "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP DEFAULT now(), "updatedAt" TIMESTAMP DEFAULT now()
  )`);
  await q(`CREATE TABLE IF NOT EXISTS seating_layouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "theaterId" UUID REFERENCES theaters(id), name VARCHAR NOT NULL,
    description VARCHAR, "canvasWidth" INT DEFAULT 800, "canvasHeight" INT DEFAULT 600,
    "backgroundUrl" VARCHAR, "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP DEFAULT now(), "updatedAt" TIMESTAMP DEFAULT now()
  )`);
  await q(`CREATE TABLE IF NOT EXISTS seats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "layoutId" UUID REFERENCES seating_layouts(id), label VARCHAR NOT NULL,
    "sectionName" VARCHAR, "rowName" VARCHAR, "seatNumber" INT,
    "posX" FLOAT NOT NULL, "posY" FLOAT NOT NULL, angle FLOAT DEFAULT 0,
    color VARCHAR DEFAULT '#D4663F', "backgroundColor" VARCHAR,
    "seatType" VARCHAR DEFAULT 'standard', "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP DEFAULT now(), "updatedAt" TIMESTAMP DEFAULT now()
  )`);
  await q(`DELETE FROM seats`);
  await q(`DELETE FROM seating_layouts`);
  await q(`DELETE FROM theaters`);

  const theaterManager1 = createdUsers['jorge.luna@correo.mx'];
  const theaterManager2 = createdUsers['laura.rios@correo.mx'];

  const seedTheaters = [
    {
      name: 'Teatro Nazas',
      description: 'Teatro historico de Torreon con arquitectura art deco. Capacidad para 450 personas. Escenario principal para obras de teatro, conciertos acusticos y eventos culturales.',
      address: 'Av. Morelos #1217, Centro',
      city: 'Torreón',
      phone: '+52 871 712 3456',
      managerId: theaterManager1.id,
      imageUrl: 'https://images.unsplash.com/photo-1503095396549-807759245b35?w=600&h=340&fit=crop',
    },
    {
      name: 'Cinepolis Forum Torreon',
      description: 'Complejo de cines con 12 salas incluyendo IMAX y VIP. Tecnologia Dolby Atmos, asientos reclinables premium y servicio de alimentos en sala.',
      address: 'Blvd. Independencia #3000, Forum Torreon',
      city: 'Torreón',
      phone: '+52 871 750 0000',
      managerId: theaterManager1.id,
      imageUrl: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=600&h=340&fit=crop',
    },
    {
      name: 'Teatro Isauro Martinez',
      description: 'Emblemático teatro lagunero fundado en 1930. Patrimonio cultural con capacidad para 1,800 espectadores. Sede de la Orquesta Filarmonica de La Laguna.',
      address: 'Av. Acuña #580, Centro',
      city: 'Torreón',
      phone: '+52 871 716 7890',
      managerId: theaterManager1.id,
      imageUrl: 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=600&h=340&fit=crop',
    },
    {
      name: 'Cinemex Galerias Laguna',
      description: 'Cine moderno con 8 salas, platino y 4DX. Ubicado en el centro comercial Galerias Laguna con estacionamiento amplio.',
      address: 'Periferico Raul Lopez Sanchez #1000, Galerias Laguna',
      city: 'Torreón',
      phone: '+52 871 729 0000',
      managerId: theaterManager2.id,
      imageUrl: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=600&h=340&fit=crop',
    },
    {
      name: 'Teatro de la Ciudad Gomez Palacio',
      description: 'Teatro municipal con auditorio para 600 personas. Presenta obras de teatro, danza folclórica, conciertos y eventos institucionales.',
      address: 'Av. Madero #450, Centro',
      city: 'Gómez Palacio',
      phone: '+52 871 714 5678',
      managerId: theaterManager2.id,
      imageUrl: 'https://images.unsplash.com/photo-1460881680858-30d872d5b530?w=600&h=340&fit=crop',
    },
  ];

  const theaterIds: Record<string, string> = {};

  for (const t of seedTheaters) {
    const [saved] = await q(
      `INSERT INTO theaters (name, description, address, city, phone, "managerId", "imageUrl")
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
      [t.name, t.description, t.address, t.city, t.phone, t.managerId, t.imageUrl]
    );
    theaterIds[t.name] = saved.id;
    console.log(`   ✓ ${t.name} (${t.city})`);
  }

  // Seed layouts and seats for Teatro Nazas (small theater with numbered seating)
  console.log('💺 Seeding seating layouts...');
  const [nazasLayout] = await q(
    `INSERT INTO seating_layouts ("theaterId", name, description, "canvasWidth", "canvasHeight")
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [theaterIds['Teatro Nazas'], 'Sala Principal', 'Sala con vista directa al escenario', 800, 600]
  );

  // Generate rows A-H, 12 seats per row (96 seats) with prices
  const rows = 'ABCDEFGH'.split('');
  const seatsPerRow = 12;
  const startX = 130;
  const startY = 120;
  const spacingX = 45;
  const spacingY = 50;
  let seatCount = 0;

  for (let r = 0; r < rows.length; r++) {
    for (let s = 0; s < seatsPerRow; s++) {
      const seatType = r >= 6 ? 'vip' : 'standard';
      const color = seatType === 'vip' ? '#D4A843' : '#D4663F';
      const price = seatType === 'vip' ? 450 : 250;
      await q(
        `INSERT INTO seats ("layoutId", label, "sectionName", "rowName", "seatNumber", "posX", "posY", angle, color, "seatType", price)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [nazasLayout.id, `${rows[r]}${s + 1}`, r >= 6 ? 'VIP' : 'Platea', rows[r], s + 1,
         startX + s * spacingX, startY + r * spacingY, 0, color, seatType, price]
      );
      seatCount++;
    }
  }

  // Update capacity
  await q(`UPDATE theaters SET capacity = $1 WHERE id = $2`, [seatCount, theaterIds['Teatro Nazas']]);
  console.log(`   ✓ Teatro Nazas: ${seatCount} seats (${rows.length} rows x ${seatsPerRow})`);

  // Layout for Isauro Martinez (big theater)
  const [isauroLayout] = await q(
    `INSERT INTO seating_layouts ("theaterId", name, description, "canvasWidth", "canvasHeight")
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [theaterIds['Teatro Isauro Martinez'], 'Auditorio Principal', 'Auditorio completo con balcon', 1000, 800]
  );

  // Generate rows A-O, 20 seats per row (300 seats)
  const bigRows = 'ABCDEFGHIJKLMNO'.split('');
  const bigSeatsPerRow = 20;
  let bigSeatCount = 0;

  for (let r = 0; r < bigRows.length; r++) {
    for (let s = 0; s < bigSeatsPerRow; s++) {
      const seatType = r >= 12 ? 'vip' : r >= 10 ? 'premium' : 'standard';
      const color = seatType === 'vip' ? '#D4A843' : seatType === 'premium' ? '#2A9D8F' : '#D4663F';
      const section = r >= 12 ? 'VIP' : r >= 10 ? 'Premium' : r >= 5 ? 'Platea Alta' : 'Platea Baja';
      const price = seatType === 'vip' ? 800 : seatType === 'premium' ? 550 : 300;
      await q(
        `INSERT INTO seats ("layoutId", label, "sectionName", "rowName", "seatNumber", "posX", "posY", angle, color, "seatType", price)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [isauroLayout.id, `${bigRows[r]}${s + 1}`, section, bigRows[r], s + 1,
         80 + s * 42, 100 + r * 42, 0, color, seatType, price]
      );
      bigSeatCount++;
    }
  }

  await q(`UPDATE theaters SET capacity = $1 WHERE id = $2`, [bigSeatCount, theaterIds['Teatro Isauro Martinez']]);
  console.log(`   ✓ Teatro Isauro Martinez: ${bigSeatCount} seats (${bigRows.length} rows x ${bigSeatsPerRow})`);

  // ── Seed Theater Events ─────────────────────────────────────────────────────
  console.log('🎬 Seeding theater events...');
  await q(`CREATE TABLE IF NOT EXISTS theater_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "eventId" UUID UNIQUE NOT NULL, "theaterId" UUID NOT NULL,
    "layoutId" UUID, "seatingMode" VARCHAR DEFAULT 'general',
    "seatsSnapshot" JSONB, "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP DEFAULT now(), "updatedAt" TIMESTAMP DEFAULT now()
  )`);
  await q(`DELETE FROM theater_events`);

  // Create theater-specific events
  const organizer = createdUsers['roberto.sanchez@correo.mx'];
  const theaterEvents = [
    {
      title: 'Hamlet — Teatro Nazas',
      description: 'Adaptacion contemporanea de Hamlet por la compania Teatro del Desierto. Una noche de drama clasico con un toque lagunero. Incluye intermedio con vino y botanas.',
      category: 'cultural',
      daysFromNow: 5,
      time: '20:00',
      location: 'Teatro Nazas',
      city: 'Torreón',
      price: 250,
      imageUrl: 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=600&h=340&fit=crop',
      capacity: 96,
      theater: 'Teatro Nazas',
      layoutId: nazasLayout.id,
      seatingMode: 'numbered',
    },
    {
      title: 'Orquesta Filarmonica de La Laguna',
      description: 'Concierto de temporada con obras de Beethoven, Dvorak y Marquez. Dirigido por el maestro Carlos Miguel Prieto. No te pierdas la Danzon No. 2.',
      category: 'cultural',
      daysFromNow: 12,
      time: '19:30',
      location: 'Teatro Isauro Martinez',
      city: 'Torreón',
      price: 300,
      imageUrl: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=600&h=340&fit=crop',
      capacity: 300,
      theater: 'Teatro Isauro Martinez',
      layoutId: isauroLayout.id,
      seatingMode: 'numbered',
    },
    {
      title: 'Stand-Up Comedy: Laguneros al Mic',
      description: 'Los mejores comediantes de La Laguna en una noche de stand-up. Sin asiento asignado — llega temprano para el mejor lugar. Incluye 2 bebidas.',
      category: 'vida_nocturna',
      daysFromNow: 3,
      time: '21:00',
      location: 'Teatro Nazas',
      city: 'Torreón',
      price: 200,
      imageUrl: 'https://images.unsplash.com/photo-1585699324551-f6c309eedeca?w=600&h=340&fit=crop',
      capacity: 96,
      theater: 'Teatro Nazas',
      layoutId: null,
      seatingMode: 'general',
    },
    {
      title: 'Cascanueces — Ballet Folklorico',
      description: 'El clasico Cascanueces con fusion de ballet folklorico mexicano. Vestuario regional, musica en vivo. Ideal para toda la familia.',
      category: 'familiar',
      daysFromNow: 20,
      time: '18:00',
      location: 'Teatro Isauro Martinez',
      city: 'Torreón',
      price: 350,
      imageUrl: 'https://images.unsplash.com/photo-1518834107812-67b0b7c58434?w=600&h=340&fit=crop',
      capacity: 300,
      theater: 'Teatro Isauro Martinez',
      layoutId: isauroLayout.id,
      seatingMode: 'numbered',
    },
    {
      title: 'Cine al Aire Libre: Coco',
      description: 'Proyeccion especial de Coco en la explanada del Teatro de la Ciudad. Trae tu silla o cobija. Palomitas y aguas frescas incluidas.',
      category: 'familiar',
      daysFromNow: 7,
      time: '20:30',
      location: 'Teatro de la Ciudad Gomez Palacio',
      city: 'Gómez Palacio',
      price: 50,
      imageUrl: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=600&h=340&fit=crop',
      capacity: 200,
      theater: 'Teatro de la Ciudad Gomez Palacio',
      layoutId: null,
      seatingMode: 'general',
    },
  ];

  for (const te of theaterEvents) {
    // Create the event first
    const [savedEvent] = await q(
      `INSERT INTO events (title, description, category, date, time, location, city,
        price, "imageUrl", "isPlusEighteen", "isFeatured", "organizerId",
        capacity, "ticketsSold", status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING id`,
      [te.title, te.description, te.category, daysFromNow(te.daysFromNow),
       te.time, te.location, te.city, te.price, te.imageUrl,
       false, true, organizer.id,
       te.capacity, 0, EventStatus.ACTIVE]
    );

    // Snapshot seats if numbered
    let seatsSnapshot = null;
    if (te.seatingMode === 'numbered' && te.layoutId) {
      const seatRows = await q(
        `SELECT id, label, "sectionName", "rowName", "seatNumber", "posX", "posY", angle, color, "seatType", price, "isActive"
         FROM seats WHERE "layoutId" = $1 AND "isActive" = true`,
        [te.layoutId]
      );
      seatsSnapshot = JSON.stringify(seatRows);
    }

    // Link to theater
    await q(
      `INSERT INTO theater_events ("eventId", "theaterId", "layoutId", "seatingMode", "seatsSnapshot")
       VALUES ($1,$2,$3,$4,$5)`,
      [savedEvent.id, theaterIds[te.theater], te.layoutId, te.seatingMode, seatsSnapshot]
    );

    // Add ticket types
    if (te.seatingMode === 'numbered') {
      await q(
        `INSERT INTO ticket_types ("eventId", name, price, available, "maxQuantity")
         VALUES ($1,'Platea',$2,true,$3), ($1,'VIP',$4,true,$5)`,
        [savedEvent.id, te.price, Math.floor(te.capacity * 0.75), te.price * 1.8, Math.floor(te.capacity * 0.25)]
      );
    } else {
      await q(
        `INSERT INTO ticket_types ("eventId", name, price, available, "maxQuantity")
         VALUES ($1,'General',$2,true,$3)`,
        [savedEvent.id, te.price, te.capacity]
      );
    }

    console.log(`   ✓ ${te.title} (${te.seatingMode} @ ${te.theater})`);
  }

  // ── Seed ClanCity Config ────────────────────────────────────────────────────
  console.log('🏰 Seeding ClanCity config...');
  try {
    await q(`DELETE FROM clan_creation_config`);
    const configs = [
      ['enableEveryNUsers', '100', 'Cada N registros, habilitar un usuario random para crear clanes'],
      ['maxClansPerUser', '2', 'Maximo de clanes que un usuario puede crear'],
      ['maxMembersPerClan', '10', 'Maximo de miembros por clan'],
      ['organizersAlwaysCanCreate', 'true', 'Los organizadores siempre pueden crear clanes'],
    ];
    for (const [key, value, desc] of configs) {
      await q(`INSERT INTO clan_creation_config (key, value, description) VALUES ($1,$2,$3)`, [key, value, desc]);
      console.log(`   ✓ ${key} = ${value}`);
    }
  } catch (_) {
    console.log('   ⚠ ClanCity tables not yet created — skipping');
  }

  // ── Seed Platform Config (Feature Flags) ────────────────────────────────────
  console.log('⚙️  Seeding platform config...');
  await q(`CREATE TABLE IF NOT EXISTS platform_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR UNIQUE NOT NULL, value VARCHAR NOT NULL,
    description VARCHAR, "updatedAt" TIMESTAMP DEFAULT now()
  )`);
  await q(`DELETE FROM platform_config`);

  const moduleConfigs = [
    ['module.events',       'true',  'Eventos — descubre y compra boletos'],
    ['module.restaurants',  'false', 'Restaurantes — explora y reserva'],
    ['module.tours',        'false', 'Tours y experiencias'],
    ['module.clans',        'false', 'ClanCity — clanes de interes'],
    ['module.theaters',     'true',  'Teatros y cines con asientos numerados'],
    ['module.artists',      'false', 'Artistas locales con Spotify'],
    ['module.blog',         'false', 'Blog y articulos'],
    ['module.wallet',       'false', 'Wallet y pagos digitales'],
    ['module.chat',         'false', 'Chat en tiempo real'],
    ['module.notifications','false', 'Notificaciones push'],
    ['module.hotels',       'false', 'Hoteles y hospedaje'],
    ['module.tickets',      'true',  'Mis boletos y QR'],
    ['app.name',            'LagunApp', 'Nombre de la plataforma'],
    ['app.city',            'Torreón',  'Ciudad principal'],
    ['app.region',          'La Laguna','Region'],
  ];

  for (const [key, value, desc] of moduleConfigs) {
    await q(`INSERT INTO platform_config (key, value, description) VALUES ($1,$2,$3)`, [key, value, desc]);
    if (key.startsWith('module.')) {
      const mod = key.replace('module.', '');
      console.log(`   ${value === 'true' ? '✅' : '⬜'} ${mod}`);
    }
  }

  // ── Summary ─────────────────────────────────────────────────────────────────
  const [{ count: totalUsers }] = await q(`SELECT COUNT(*) as count FROM users`);
  const [{ count: totalEvents }] = await q(`SELECT COUNT(*) as count FROM events`);
  const [{ count: totalTT }] = await q(`SELECT COUNT(*) as count FROM ticket_types`);
  const [{ count: totalRestaurants }] = await q(`SELECT COUNT(*) as count FROM restaurants`);
  const [{ count: totalTours }] = await q(`SELECT COUNT(*) as count FROM tours`);
  const [{ count: totalArtists }] = await q(`SELECT COUNT(*) as count FROM artists`);
  const [{ count: totalTheaters }] = await q(`SELECT COUNT(*) as count FROM theaters`);
  const [{ count: totalSeats }] = await q(`SELECT COUNT(*) as count FROM seats`);
  const [{ count: totalTheaterEvents }] = await q(`SELECT COUNT(*) as count FROM theater_events`);

  console.log('\n✅ Seed complete!');
  console.log(`   Users:        ${totalUsers}`);
  console.log(`   Events:       ${totalEvents}`);
  console.log(`   Ticket Types: ${totalTT}`);
  console.log(`   Restaurants:  ${totalRestaurants}`);
  console.log(`   Tours:        ${totalTours}`);
  console.log(`   Artists:      ${totalArtists}`);
  console.log(`   Theaters:     ${totalTheaters}`);
  console.log(`   Seats:        ${totalSeats}`);
  console.log(`   Theater Evt:  ${totalTheaterEvents}`);
  console.log(`\n   Password for all users: ${SEED_PASSWORD}`);

  await AppDataSource.destroy();
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
