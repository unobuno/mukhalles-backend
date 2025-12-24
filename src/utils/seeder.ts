import { Business, User, Category, City } from "../models";
import logger from "./logger";
import {
  OfficeCategory,
  VerificationStatus,
  UploadStatus,
  UserRole,
  DocumentType,
} from "../types";

const initialCategories = [
  { id: "import", title: "استيراد", isActive: true },
  { id: "export", title: "تصدير", isActive: true },
  { id: "vehicles", title: "مركبات", isActive: true },
  { id: "fast", title: "سريع", isActive: true },
];

const initialCities = [
  { id: "riyadh", name: { ar: "الرياض", en: "Riyadh" }, isActive: true },
  { id: "jeddah", name: { ar: "جدة", en: "Jeddah" }, isActive: true },
  { id: "dammam", name: { ar: "الدمام", en: "Dammam" }, isActive: true },
  { id: "mecca", name: { ar: "مكة", en: "Mecca" }, isActive: true },
  { id: "medina", name: { ar: "المدينة", en: "Medina" }, isActive: true },
  { id: "khobar", name: { ar: "الخبر", en: "Khobar" }, isActive: true },
  { id: "tabuk", name: { ar: "تبوك", en: "Tabuk" }, isActive: true },
  { id: "abha", name: { ar: "أبها", en: "Abha" }, isActive: true },
];

// Sample businesses with full info
const sampleBusinesses = [
  {
    name: "مكتب الخليج للتخليص الجمركي",
    nameEn: "Gulf Customs Clearance Office",
    description:
      "مكتب متخصص في خدمات التخليص الجمركي للاستيراد والتصدير مع خبرة تزيد عن 15 عام في المملكة العربية السعودية. نقدم حلولاً متكاملة لجميع أنواع البضائع.",
    category: "import" as OfficeCategory,
    city: "جدة",
    crNumber: "4030123456",
    licenseNumber: "LIC-2024-001",
    rating: 4.8,
    ratingCount: 156,
    isFeatured: true,
    featuredPriority: 1,
    avatarUrl:
      "https://images.unsplash.com/photo-1566576912902-1dcd19eeb2bd?auto=format&fit=crop&w=300&q=80",
    coverUrl:
      "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80",
    verificationStatus: VerificationStatus.APPROVED,
    isActive: true,
    website: "https://gulf-customs.sa",
    delegate: {
      fullName: "محمد أحمد العتيبي",
      nationalId: "1098765432",
      position: "المدير العام",
      phone: "+966501234567",
      whatsapp: "+966501234567",
      email: "mohammed@gulf-customs.sa",
    },
    contact: {
      phone: "+966126789012",
      whatsapp: "+966501234567",
    },
    socials: {
      facebook: "https://facebook.com/gulfcustoms",
      x: "https://x.com/gulfcustoms",
      linkedin: "https://linkedin.com/company/gulfcustoms",
    },
    location: {
      type: "Point",
      coordinates: [39.1727, 21.4858] as [number, number],
    },
    address: "حي الروضة، شارع الملك فهد، جدة",
    services: [
      {
        title: "تخليص جمركي للواردات",
        description: "خدمة تخليص جمركي شاملة لجميع أنواع البضائع المستوردة",
        basePrice: 500,
        isActive: true,
        subServices: [
          { title: "تخليص بضائع عامة", price: 500, isActive: true },
          { title: "تخليص مركبات", price: 1500, isActive: true },
          { title: "تخليص مواد غذائية", price: 800, isActive: true },
          { title: "تخليص أدوية ومستلزمات طبية", price: 1200, isActive: true },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        title: "تخليص جمركي للصادرات",
        description: "خدمة تخليص جمركي للبضائع المصدرة من المملكة",
        basePrice: 400,
        isActive: true,
        subServices: [
          { title: "تصدير منتجات زراعية", price: 400, isActive: true },
          { title: "تصدير منتجات صناعية", price: 600, isActive: true },
          { title: "تصدير بتروكيماويات", price: 1000, isActive: true },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        title: "خدمات لوجستية",
        description: "خدمات النقل والتخزين والتوزيع",
        basePrice: 800,
        isActive: true,
        subServices: [
          { title: "نقل بري", price: 800, isActive: true },
          { title: "تخزين في مستودعات معتمدة", price: 300, isActive: true },
          { title: "توزيع داخلي", price: 500, isActive: true },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    documents: [
      {
        documentType: DocumentType.CR,
        fileUrl: "/uploads/docs/cr_gulf.pdf",
        fileName: "cr_gulf.pdf",
        fileSize: 245000,
        mimeType: "application/pdf",
        uploadStatus: UploadStatus.APPROVED,
        uploadedAt: new Date(),
      },
      {
        documentType: DocumentType.CHAMBER_CERTIFICATE,
        fileUrl: "/uploads/docs/license_gulf.pdf",
        fileName: "license_gulf.pdf",
        fileSize: 180000,
        mimeType: "application/pdf",
        uploadStatus: UploadStatus.APPROVED,
        uploadedAt: new Date(),
      },
    ],
    stats: {
      profileViews: 2450,
      contactClicks: 890,
      bookmarks: 156,
    },
  },
  {
    name: "شركة النجم الذهبي للشحن",
    nameEn: "Golden Star Shipping Company",
    description:
      "شركة متخصصة في الشحن البحري والجوي مع شبكة واسعة من الوكلاء حول العالم. نضمن وصول شحناتكم بأمان وفي الوقت المحدد.",
    category: "export" as OfficeCategory,
    city: "الدمام",
    crNumber: "2030987654",
    licenseNumber: "LIC-2024-002",
    rating: 4.5,
    ratingCount: 89,
    isFeatured: true,
    featuredPriority: 2,
    avatarUrl:
      "https://images.unsplash.com/photo-1494412574643-35d324698b93?auto=format&fit=crop&w=300&q=80",
    coverUrl:
      "https://images.unsplash.com/photo-1494412651409-ae1c212169b2?auto=format&fit=crop&w=1200&q=80",
    verificationStatus: VerificationStatus.APPROVED,
    isActive: true,
    website: "https://goldenstar-shipping.sa",
    delegate: {
      fullName: "سلطان خالد الدوسري",
      nationalId: "1087654321",
      position: "مدير العمليات",
      phone: "+966559876543",
      whatsapp: "+966559876543",
      email: "sultan@goldenstar.sa",
    },
    contact: {
      phone: "+966138765432",
      whatsapp: "+966559876543",
    },
    socials: {
      linkedin: "https://linkedin.com/company/goldenstar",
      x: "https://x.com/goldenstarship",
    },
    location: {
      type: "Point",
      coordinates: [50.1036, 26.4207] as [number, number],
    },
    address: "ميناء الملك عبدالعزيز، الدمام",
    services: [
      {
        title: "شحن بحري",
        description: "خدمات الشحن البحري الكامل والجزئي",
        basePrice: 2000,
        isActive: true,
        subServices: [
          { title: "حاوية 20 قدم FCL", price: 3000, isActive: true },
          { title: "حاوية 40 قدم FCL", price: 5000, isActive: true },
          { title: "شحن جزئي LCL", price: 150, isActive: true },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        title: "شحن جوي",
        description: "خدمات الشحن الجوي السريع",
        basePrice: 50,
        isActive: true,
        subServices: [
          { title: "شحن عادي (5-7 أيام)", price: 50, isActive: true },
          { title: "شحن سريع (2-3 أيام)", price: 100, isActive: true },
          { title: "شحن فوري (24 ساعة)", price: 200, isActive: true },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    documents: [
      {
        documentType: DocumentType.CR,
        fileUrl: "/uploads/docs/cr_golden.pdf",
        fileName: "cr_golden.pdf",
        fileSize: 220000,
        mimeType: "application/pdf",
        uploadStatus: UploadStatus.APPROVED,
        uploadedAt: new Date(),
      },
    ],
    stats: {
      profileViews: 1820,
      contactClicks: 560,
      bookmarks: 89,
    },
  },
  {
    name: "مؤسسة الوفاء للتخليص",
    nameEn: "Al Wafa Clearance Est.",
    description:
      "مؤسسة وطنية متخصصة في تخليص المركبات والمعدات الثقيلة مع خبرة واسعة في التعامل مع جميع الموانئ السعودية.",
    category: "vehicles" as OfficeCategory,
    city: "الرياض",
    crNumber: "1010567890",
    licenseNumber: "LIC-2024-003",
    rating: 4.2,
    ratingCount: 45,
    isFeatured: false,
    featuredPriority: 0,
    avatarUrl:
      "https://images.unsplash.com/photo-1626229795175-9c8942b87265?auto=format&fit=crop&w=300&q=80",
    coverUrl:
      "https://images.unsplash.com/photo-1513828742140-556573a027d0?auto=format&fit=crop&w=1200&q=80",
    verificationStatus: VerificationStatus.APPROVED,
    isActive: true,
    delegate: {
      fullName: "فهد عبدالله الشمري",
      nationalId: "1076543210",
      position: "صاحب المؤسسة",
      phone: "+966541234567",
      email: "fahad@alwafa.sa",
    },
    contact: {
      phone: "+966112345678",
      whatsapp: "+966541234567",
    },
    location: {
      type: "Point",
      coordinates: [46.7219, 24.6748] as [number, number],
    },
    address: "حي العليا، الرياض",
    services: [
      {
        title: "تخليص مركبات",
        description: "تخليص جميع أنواع المركبات",
        basePrice: 1500,
        isActive: true,
        subServices: [
          { title: "سيارات صغيرة", price: 1500, isActive: true },
          { title: "سيارات دفع رباعي", price: 2000, isActive: true },
          { title: "شاحنات ومعدات ثقيلة", price: 4000, isActive: true },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    documents: [
      {
        documentType: DocumentType.CR,
        fileUrl: "/uploads/docs/cr_wafa.pdf",
        fileName: "cr_wafa.pdf",
        fileSize: 195000,
        mimeType: "application/pdf",
        uploadStatus: UploadStatus.APPROVED,
        uploadedAt: new Date(),
      },
    ],
    stats: {
      profileViews: 980,
      contactClicks: 234,
      bookmarks: 45,
    },
  },
  {
    name: "مكتب السرعة للتخليص الفوري",
    nameEn: "Speed Express Clearance",
    description:
      "متخصصون في التخليص الجمركي السريع والفوري. نضمن إنهاء معاملاتكم في أقل وقت ممكن.",
    category: "fast" as OfficeCategory,
    city: "جدة",
    crNumber: "4030246810",
    licenseNumber: "LIC-2024-004",
    rating: 4.9,
    ratingCount: 210,
    isFeatured: true,
    featuredPriority: 3,
    avatarUrl:
      "https://images.unsplash.com/photo-1506306091425-649dcd75a24f?auto=format&fit=crop&w=300&q=80",
    coverUrl:
      "https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=1200&q=80",
    verificationStatus: VerificationStatus.PENDING,
    isActive: true,
    delegate: {
      fullName: "عبدالرحمن سعد القحطاني",
      nationalId: "1065432109",
      position: "المدير التنفيذي",
      phone: "+966507654321",
      whatsapp: "+966507654321",
      email: "abdulrahman@speedexpress.sa",
    },
    contact: {
      phone: "+966126543210",
      whatsapp: "+966507654321",
    },
    location: {
      type: "Point",
      coordinates: [39.1568, 21.5433] as [number, number],
    },
    address: "ميناء جدة الإسلامي، جدة",
    services: [
      {
        title: "تخليص فوري",
        description: "إنهاء المعاملات خلال 24-48 ساعة",
        basePrice: 1000,
        isActive: true,
        subServices: [
          { title: "تخليص خلال 24 ساعة", price: 2000, isActive: true },
          { title: "تخليص خلال 48 ساعة", price: 1500, isActive: true },
          { title: "متابعة عاجلة", price: 500, isActive: true },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    documents: [
      {
        documentType: DocumentType.CR,
        fileUrl: "/uploads/docs/cr_speed.pdf",
        fileName: "cr_speed.pdf",
        fileSize: 210000,
        mimeType: "application/pdf",
        uploadStatus: UploadStatus.PENDING,
        uploadedAt: new Date(),
      },
    ],
    stats: {
      profileViews: 3200,
      contactClicks: 1100,
      bookmarks: 210,
    },
  },
  {
    name: "شركة البحر الأحمر للوجستيات",
    nameEn: "Red Sea Logistics Co.",
    description:
      "شركة لوجستية متكاملة تقدم خدمات الشحن والتخليص والتخزين والتوزيع في جميع أنحاء المملكة.",
    category: "other" as OfficeCategory,
    city: "الخبر",
    crNumber: "2050135790",
    licenseNumber: "LIC-2024-005",
    rating: 3.8,
    ratingCount: 32,
    isFeatured: false,
    featuredPriority: 0,
    avatarUrl:
      "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=300&q=80",
    coverUrl:
      "https://images.unsplash.com/photo-1542831371-29b0f74f9713?auto=format&fit=crop&w=1200&q=80",
    verificationStatus: VerificationStatus.REJECTED,
    isActive: true,
    delegate: {
      fullName: "يوسف محمد العمري",
      nationalId: "1054321098",
      position: "مدير الفرع",
      phone: "+966531234567",
      email: "youssef@redsealogistics.sa",
    },
    contact: {
      phone: "+966138901234",
    },
    address: "المنطقة الصناعية، الخبر",
    services: [
      {
        title: "خدمات لوجستية شاملة",
        description: "حلول لوجستية متكاملة",
        basePrice: 1000,
        isActive: true,
        subServices: [
          { title: "تخزين", price: 200, isActive: true },
          { title: "توزيع", price: 500, isActive: true },
          { title: "إدارة المخزون", price: 800, isActive: true },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    documents: [],
    stats: {
      profileViews: 450,
      contactClicks: 120,
      bookmarks: 32,
    },
    reviewIssues: [
      {
        fieldName: "documents",
        fieldLabel: "المستندات",
        issueType: "missing",
        description: "يرجى رفع السجل التجاري",
        isResolved: false,
      },
    ],
  },
];

export const seedCategories = async (): Promise<void> => {
  try {
    const existingCategories = await Category.countDocuments();

    if (existingCategories === 0) {
      await Category.insertMany(initialCategories);
      logger.info("Initial categories seeded successfully");
    } else {
      logger.info("Categories already exist, skipping seeding");
    }
  } catch (error) {
    logger.error("Error seeding categories:", error);
    throw error;
  }
};

export const seedCities = async (): Promise<void> => {
  try {
    const existingCities = await City.countDocuments();

    if (existingCities === 0) {
      await City.insertMany(initialCities);
      logger.info("Initial cities seeded successfully");
    } else {
      logger.info("Cities already exist, skipping seeding");
    }
  } catch (error) {
    logger.error("Error seeding cities:", error);
    throw error;
  }
};

export const seedBusinesses = async (): Promise<void> => {
  try {
    const existingBusinesses = await Business.countDocuments();

    if (existingBusinesses > 0) {
      logger.info("Businesses already exist, skipping seeding");
      return;
    }

    // Drop the problematic index if it exists (allows null values to coexist)
    try {
      await User.collection.dropIndex("companyProfile.crNumber_1");
      logger.info("Dropped companyProfile.crNumber index");
    } catch {
      // Index might not exist, that's fine
    }

    // Create owner users for each business
    for (const businessData of sampleBusinesses) {
      // Check if user with this email exists
      let owner = await User.findOne({ email: businessData.delegate.email });

      if (!owner) {
        owner = new User({
          phone: businessData.delegate.phone,
          email: businessData.delegate.email,
          fullName: businessData.delegate.fullName,
          role: UserRole.COMPANY,
          isActive: true,
          isVerified: true,
          companyProfile: {
            crNumber: businessData.crNumber, // Needed for unique index
            companyName: businessData.name,
          },
        });
        await owner.save();
        logger.info(`Created owner user: ${owner.email}`);
      }

      // Create business
      const business = new Business({
        ...businessData,
        ownerId: owner._id,
        createdAt: new Date(
          Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000
        ), // Random date within last 30 days
      });

      await business.save();
      logger.info(`Created business: ${business.name}`);
    }

    logger.info(`Successfully seeded ${sampleBusinesses.length} businesses`);
  } catch (error) {
    logger.error("Error seeding businesses:", error);
    throw error;
  }
};

export const seedAll = async (): Promise<void> => {
  try {
    await seedCategories();
    await seedCities();
    await seedBusinesses();
    logger.info("Database seeding completed successfully");
    return;
  } catch (error) {
    logger.error("Error during database seeding:", error);
    throw error;
  }
};
