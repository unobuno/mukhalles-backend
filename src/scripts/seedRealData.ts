import mongoose from "mongoose";
import { Business, User, Category, Review } from "../models";
import logger from "../utils/logger";
import {
  OfficeCategory,
  VerificationStatus,
  UploadStatus,
  UserRole,
  DocumentType,
} from "../types";
import dotenv from "dotenv";

dotenv.config();

// Real categories for customs clearance offices
const realCategories = [
  {
    id: "import",
    title: "استيراد",
    imageUrl: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=400&q=80",
    isActive: true,
    isFeatured: true,
    order: 1,
  },
  {
    id: "export",
    title: "تصدير",
    imageUrl: "https://images.unsplash.com/photo-1494412574643-35d324698b93?auto=format&fit=crop&w=400&q=80",
    isActive: true,
    isFeatured: true,
    order: 2,
  },
  {
    id: "vehicles",
    title: "مركبات",
    imageUrl: "https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&w=400&q=80",
    isActive: true,
    isFeatured: true,
    order: 3,
  },
  {
    id: "fast",
    title: "تخليص سريع",
    imageUrl: "https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?auto=format&fit=crop&w=400&q=80",
    isActive: true,
    isFeatured: true,
    order: 4,
  },
  {
    id: "other",
    title: "خدمات أخرى",
    imageUrl: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=400&q=80",
    isActive: true,
    isFeatured: false,
    order: 5,
  },
];

// Real Saudi customs clearance offices data
const realOffices = [
  {
    name: "مكتب الجزيرة للتخليص الجمركي",
    nameEn: "Al Jazeera Customs Clearance Office",
    description:
      "مكتب الجزيرة للتخليص الجمركي من أعرق مكاتب التخليص في ميناء جدة الإسلامي، تأسس عام 1985 ويقدم خدمات تخليص جمركي متكاملة للبضائع المستوردة والمصدرة مع فريق متخصص من المخلصين الجمركيين المعتمدين.",
    category: "import" as OfficeCategory,
    city: "جدة",
    crNumber: "4030112233",
    licenseNumber: "JED-CC-1985-001",
    rating: 4.7,
    ratingCount: 234,
    isFeatured: true,
    featuredPriority: 1,
    avatarUrl: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=300&q=80",
    coverUrl: "https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=1200&q=80",
    verificationStatus: VerificationStatus.APPROVED,
    isActive: true,
    website: "https://aljazeera-customs.com.sa",
    delegate: {
      fullName: "عبدالله محمد الغامدي",
      nationalId: "1012345678",
      position: "المدير العام",
      phone: "+966505001122",
      whatsapp: "+966505001122",
      email: "info@aljazeera-customs.com.sa",
    },
    contact: {
      phone: "+966126001122",
      whatsapp: "+966505001122",
    },
    socials: {
      x: "https://x.com/aljazeeracustoms",
    },
    location: {
      type: "Point",
      coordinates: [39.1854, 21.4975] as [number, number],
    },
    address: "ميناء جدة الإسلامي، البوابة الرئيسية، مبنى المخلصين رقم 5",
    services: [
      {
        title: "تخليص البضائع العامة",
        description: "تخليص جمركي شامل لجميع أنواع البضائع المستوردة",
        basePrice: 450,
        isActive: true,
        subServices: [
          { title: "بضائع استهلاكية", price: 450, isActive: true },
          { title: "مواد بناء وتشييد", price: 600, isActive: true },
          { title: "أجهزة كهربائية", price: 550, isActive: true },
          { title: "ملابس ومنسوجات", price: 400, isActive: true },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        title: "تخليص المواد الغذائية",
        description: "تخليص بضائع غذائية مع متابعة الجهات الرقابية",
        basePrice: 700,
        isActive: true,
        subServices: [
          { title: "مواد غذائية جافة", price: 700, isActive: true },
          { title: "مواد مبردة ومجمدة", price: 900, isActive: true },
          { title: "مشروبات", price: 650, isActive: true },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    documents: [
      {
        documentType: DocumentType.CR,
        fileUrl: "/uploads/docs/cr_aljazeera.pdf",
        fileName: "cr_aljazeera.pdf",
        fileSize: 250000,
        mimeType: "application/pdf",
        uploadStatus: UploadStatus.APPROVED,
        uploadedAt: new Date(),
      },
      {
        documentType: DocumentType.CHAMBER_CERTIFICATE,
        fileUrl: "/uploads/docs/chamber_aljazeera.pdf",
        fileName: "chamber_aljazeera.pdf",
        fileSize: 180000,
        mimeType: "application/pdf",
        uploadStatus: UploadStatus.APPROVED,
        uploadedAt: new Date(),
      },
    ],
    stats: {
      profileViews: 4500,
      contactClicks: 1200,
      bookmarks: 340,
    },
  },
  {
    name: "مؤسسة الصقر للتخليص الجمركي",
    nameEn: "Al Saqr Customs Clearance Est.",
    description:
      "مؤسسة الصقر متخصصة في تخليص المركبات والمعدات الثقيلة في ميناء الدمام. خبرة تفوق 20 عاماً في التعامل مع جميع أنواع المركبات من سيارات وشاحنات ومعدات صناعية.",
    category: "vehicles" as OfficeCategory,
    city: "الدمام",
    crNumber: "2050334455",
    licenseNumber: "DMM-CC-2003-015",
    rating: 4.5,
    ratingCount: 178,
    isFeatured: true,
    featuredPriority: 2,
    avatarUrl: "https://images.unsplash.com/photo-1560179707-f14e90ef3623?auto=format&fit=crop&w=300&q=80",
    coverUrl: "https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&w=1200&q=80",
    verificationStatus: VerificationStatus.APPROVED,
    isActive: true,
    delegate: {
      fullName: "سعود بن فهد الدوسري",
      nationalId: "1023456789",
      position: "صاحب المؤسسة",
      phone: "+966555002233",
      whatsapp: "+966555002233",
      email: "saud@alsaqr-customs.sa",
    },
    contact: {
      phone: "+966138002233",
      whatsapp: "+966555002233",
    },
    location: {
      type: "Point",
      coordinates: [50.1119, 26.4473] as [number, number],
    },
    address: "ميناء الملك عبدالعزيز، الدمام، منطقة المخلصين الجمركيين",
    services: [
      {
        title: "تخليص السيارات",
        description: "تخليص جمركي لجميع أنواع السيارات المستوردة",
        basePrice: 1200,
        isActive: true,
        subServices: [
          { title: "سيارات صالون", price: 1200, isActive: true },
          { title: "سيارات دفع رباعي SUV", price: 1500, isActive: true },
          { title: "سيارات رياضية", price: 2000, isActive: true },
          { title: "سيارات كلاسيكية", price: 2500, isActive: true },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        title: "تخليص الشاحنات والمعدات",
        description: "تخليص الشاحنات والمعدات الثقيلة والصناعية",
        basePrice: 3000,
        isActive: true,
        subServices: [
          { title: "شاحنات نقل", price: 3000, isActive: true },
          { title: "معدات بناء", price: 4500, isActive: true },
          { title: "رافعات وكرينات", price: 5000, isActive: true },
          { title: "حافلات", price: 3500, isActive: true },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    documents: [
      {
        documentType: DocumentType.CR,
        fileUrl: "/uploads/docs/cr_alsaqr.pdf",
        fileName: "cr_alsaqr.pdf",
        fileSize: 230000,
        mimeType: "application/pdf",
        uploadStatus: UploadStatus.APPROVED,
        uploadedAt: new Date(),
      },
    ],
    stats: {
      profileViews: 3200,
      contactClicks: 890,
      bookmarks: 256,
    },
  },
  {
    name: "شركة المملكة للتخليص والخدمات اللوجستية",
    nameEn: "Al Mamlaka Clearance & Logistics Co.",
    description:
      "شركة المملكة من كبرى شركات التخليص الجمركي في المنطقة الوسطى، مقرها الرئيسي في الرياض مع فروع في جميع المنافذ البرية. متخصصون في تخليص الصادرات والواردات البرية.",
    category: "export" as OfficeCategory,
    city: "الرياض",
    crNumber: "1010556677",
    licenseNumber: "RUH-CC-2010-023",
    rating: 4.8,
    ratingCount: 312,
    isFeatured: true,
    featuredPriority: 1,
    avatarUrl: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=300&q=80",
    coverUrl: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80",
    verificationStatus: VerificationStatus.APPROVED,
    isActive: true,
    website: "https://almamlaka-logistics.sa",
    delegate: {
      fullName: "خالد بن عبدالرحمن العتيبي",
      nationalId: "1034567890",
      position: "الرئيس التنفيذي",
      phone: "+966500112233",
      whatsapp: "+966500112233",
      email: "ceo@almamlaka-logistics.sa",
    },
    contact: {
      phone: "+966114003344",
      whatsapp: "+966500112233",
    },
    socials: {
      linkedin: "https://linkedin.com/company/almamlaka-logistics",
      x: "https://x.com/almamlakalog",
    },
    location: {
      type: "Point",
      coordinates: [46.6753, 24.7136] as [number, number],
    },
    address: "الرياض، حي السلي، طريق الخرج، مجمع الخدمات اللوجستية",
    services: [
      {
        title: "تخليص الصادرات",
        description: "خدمات تخليص جمركي للبضائع المصدرة من المملكة",
        basePrice: 350,
        isActive: true,
        subServices: [
          { title: "منتجات بتروكيماوية", price: 800, isActive: true },
          { title: "تمور ومنتجات زراعية", price: 350, isActive: true },
          { title: "منتجات صناعية", price: 500, isActive: true },
          { title: "إعادة تصدير", price: 450, isActive: true },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        title: "خدمات المنافذ البرية",
        description: "تخليص في جميع المنافذ البرية السعودية",
        basePrice: 400,
        isActive: true,
        subServices: [
          { title: "منفذ البطحاء", price: 400, isActive: true },
          { title: "منفذ الحديثة", price: 400, isActive: true },
          { title: "منفذ الوديعة", price: 450, isActive: true },
          { title: "منفذ جسر الملك فهد", price: 500, isActive: true },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    documents: [
      {
        documentType: DocumentType.CR,
        fileUrl: "/uploads/docs/cr_almamlaka.pdf",
        fileName: "cr_almamlaka.pdf",
        fileSize: 280000,
        mimeType: "application/pdf",
        uploadStatus: UploadStatus.APPROVED,
        uploadedAt: new Date(),
      },
      {
        documentType: DocumentType.CHAMBER_CERTIFICATE,
        fileUrl: "/uploads/docs/chamber_almamlaka.pdf",
        fileName: "chamber_almamlaka.pdf",
        fileSize: 200000,
        mimeType: "application/pdf",
        uploadStatus: UploadStatus.APPROVED,
        uploadedAt: new Date(),
      },
    ],
    stats: {
      profileViews: 5800,
      contactClicks: 1650,
      bookmarks: 445,
    },
  },
  {
    name: "مكتب البرق للتخليص الفوري",
    nameEn: "Al Barq Express Clearance",
    description:
      "مكتب البرق متخصص في خدمات التخليص الجمركي السريع والفوري في ميناء جدة. نضمن إنهاء معاملاتكم في أقصر وقت ممكن مع متابعة على مدار الساعة وخدمة عملاء مميزة.",
    category: "fast" as OfficeCategory,
    city: "جدة",
    crNumber: "4030778899",
    licenseNumber: "JED-CC-2015-045",
    rating: 4.9,
    ratingCount: 425,
    isFeatured: true,
    featuredPriority: 1,
    avatarUrl: "https://images.unsplash.com/photo-1554469384-e58fac16e23a?auto=format&fit=crop&w=300&q=80",
    coverUrl: "https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?auto=format&fit=crop&w=1200&q=80",
    verificationStatus: VerificationStatus.APPROVED,
    isActive: true,
    website: "https://albarq-express.sa",
    delegate: {
      fullName: "ماجد بن سالم الزهراني",
      nationalId: "1045678901",
      position: "المدير العام",
      phone: "+966509998877",
      whatsapp: "+966509998877",
      email: "majed@albarq-express.sa",
    },
    contact: {
      phone: "+966126998877",
      whatsapp: "+966509998877",
    },
    socials: {
      x: "https://x.com/albarqexpress",
      facebook: "https://facebook.com/albarqexpress",
    },
    location: {
      type: "Point",
      coordinates: [39.1923, 21.5001] as [number, number],
    },
    address: "ميناء جدة الإسلامي، مبنى التخليص السريع، الدور الثاني",
    services: [
      {
        title: "تخليص فوري VIP",
        description: "إنهاء المعاملات خلال ساعات",
        basePrice: 2000,
        isActive: true,
        subServices: [
          { title: "تخليص خلال 6 ساعات", price: 3000, isActive: true },
          { title: "تخليص خلال 12 ساعة", price: 2500, isActive: true },
          { title: "تخليص خلال 24 ساعة", price: 2000, isActive: true },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        title: "متابعة على مدار الساعة",
        description: "خدمة متابعة ودعم 24/7",
        basePrice: 500,
        isActive: true,
        subServices: [
          { title: "متابعة مستمرة", price: 500, isActive: true },
          { title: "تقارير فورية", price: 300, isActive: true },
          { title: "تنبيهات واتساب", price: 200, isActive: true },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    documents: [
      {
        documentType: DocumentType.CR,
        fileUrl: "/uploads/docs/cr_albarq.pdf",
        fileName: "cr_albarq.pdf",
        fileSize: 240000,
        mimeType: "application/pdf",
        uploadStatus: UploadStatus.APPROVED,
        uploadedAt: new Date(),
      },
    ],
    stats: {
      profileViews: 7200,
      contactClicks: 2100,
      bookmarks: 580,
    },
  },
  {
    name: "مؤسسة الخليج العربي للتخليص الجمركي",
    nameEn: "Arabian Gulf Customs Clearance Est.",
    description:
      "مؤسسة الخليج العربي تقدم خدمات تخليص جمركي متنوعة في ميناء الملك عبدالعزيز بالدمام. نتميز بأسعار منافسة وجودة خدمة عالية مع خبرة تزيد عن 25 عاماً في مجال التخليص الجمركي.",
    category: "import" as OfficeCategory,
    city: "الدمام",
    crNumber: "2050990011",
    licenseNumber: "DMM-CC-1998-008",
    rating: 4.4,
    ratingCount: 156,
    isFeatured: false,
    featuredPriority: 0,
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80",
    coverUrl: "https://images.unsplash.com/photo-1494412651409-8963ce7935a7?auto=format&fit=crop&w=1200&q=80",
    verificationStatus: VerificationStatus.APPROVED,
    isActive: true,
    delegate: {
      fullName: "فيصل بن محمد القحطاني",
      nationalId: "1056789012",
      position: "صاحب المؤسسة",
      phone: "+966504445566",
      whatsapp: "+966504445566",
      email: "faisal@arabiangulf-customs.sa",
    },
    contact: {
      phone: "+966138004455",
      whatsapp: "+966504445566",
    },
    location: {
      type: "Point",
      coordinates: [50.1234, 26.4512] as [number, number],
    },
    address: "ميناء الملك عبدالعزيز، الدمام، مكاتب المخلصين الجمركيين",
    services: [
      {
        title: "تخليص بضائع متنوعة",
        description: "خدمات تخليص لجميع أنواع البضائع",
        basePrice: 400,
        isActive: true,
        subServices: [
          { title: "بضائع استهلاكية", price: 400, isActive: true },
          { title: "قطع غيار", price: 500, isActive: true },
          { title: "أثاث ومفروشات", price: 450, isActive: true },
          { title: "إلكترونيات", price: 550, isActive: true },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        title: "خدمات إضافية",
        description: "خدمات مكملة للتخليص الجمركي",
        basePrice: 200,
        isActive: true,
        subServices: [
          { title: "نقل من الميناء", price: 800, isActive: true },
          { title: "تخزين مؤقت", price: 200, isActive: true },
          { title: "تغليف وإعادة تعبئة", price: 350, isActive: true },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    documents: [
      {
        documentType: DocumentType.CR,
        fileUrl: "/uploads/docs/cr_arabiangulf.pdf",
        fileName: "cr_arabiangulf.pdf",
        fileSize: 220000,
        mimeType: "application/pdf",
        uploadStatus: UploadStatus.APPROVED,
        uploadedAt: new Date(),
      },
    ],
    stats: {
      profileViews: 2100,
      contactClicks: 560,
      bookmarks: 145,
    },
  },
];

// Saudi Arabic names for reviewers
const saudiFirstNames = [
  "أحمد", "محمد", "عبدالله", "خالد", "فهد", "سعود", "ناصر", "سلطان", "عمر", "يوسف",
  "سارة", "نورة", "فاطمة", "مريم", "هند", "لمى", "ريم", "دانة", "لينا", "أمل",
];

const saudiLastNames = [
  "العتيبي", "القحطاني", "الغامدي", "الزهراني", "الشمري", "الدوسري", "الحربي",
  "المطيري", "العنزي", "السبيعي", "الرشيدي", "البلوي", "الجهني", "الشهري", "السلمي",
];

// Review texts with matching ratings
const reviewTexts = [
  { text: "خدمة ممتازة جداً! التخليص كان سريع والموظفين متعاونين جداً. أنصح بشدة بهم.", rating: 5 },
  { text: "تجربة رائعة مع هذا المكتب. سرعة في الإنجاز ودقة في العمل. شكراً لكم.", rating: 5 },
  { text: "خدمات تخليص احترافية تغطي جميع احتياجات الشركات. الفريق محترف وذو خبرة عالية.", rating: 4 },
  { text: "استخدمت خدماتهم مرتين وكل مرة كانت النتيجة مرضية. التسعير معقول وجودة تنافسية.", rating: 4 },
  { text: "الخدمة كانت جيدة بشكل عام ولكن هناك بعض التأخير في سرعة التواصل والرد.", rating: 3 },
  { text: "خدمة ممتازة وخبرة في مجال التخليص الجمركي. أوصي بهم بشدة للشركات الناشئة.", rating: 5 },
  { text: "تعاملت معهم في شحنة دولية وكانت التجربة ممتازة من البداية للنهاية. محترفين جداً!", rating: 5 },
  { text: "المتابعة كانت ممتازة والتواصل مستمر طوال العملية. شكراً لهم على الاحترافية.", rating: 4 },
  { text: "خدمة التخليص الجمركي كانت سريعة ومحترفة. أسعارهم تنافسية مقارنة بالسوق.", rating: 4 },
  { text: "تجربة جيدة لكن كنت أتمنى سرعة أكثر في الرد على الاستفسارات والمتابعة.", rating: 3 },
  { text: "فريق عمل محترف ومتعاون. ساعدوني في كل خطوة من العملية بصبر واهتمام.", rating: 5 },
  { text: "أسعار معقولة وخدمة متميزة. سأتعامل معهم مرة أخرى بكل تأكيد إن شاء الله.", rating: 4 },
  { text: "التعامل كان احترافي والموظفين كانوا متعاونين جداً في حل جميع المشاكل.", rating: 4 },
  { text: "خدمة ممتازة في التخليص الجمركي. أنصح الجميع بالتعامل معهم بدون تردد.", rating: 5 },
  { text: "تجربة مميزة! سرعة في الإنجاز ومتابعة دورية للشحنات. الأفضل في المنطقة.", rating: 5 },
  { text: "خدمة متوسطة، كان هناك بعض التأخير لكن في النهاية تم إنجاز المطلوب.", rating: 3 },
  { text: "ممتازين في التعامل مع الشحنات الكبيرة. لديهم خبرة واضحة في المجال.", rating: 5 },
  { text: "سعيد جداً بالخدمة المقدمة. فريق محترف ومتابعة ممتازة للشحنة.", rating: 5 },
];

const serviceTags = [
  "نقل سريع", "استيراد", "تصدير", "تخليص جمركي", "نقل دولي",
  "خدمات متكاملة", "شحن بحري", "شحن جوي", "تخليص سيارات",
];

// Generate Saudi phone number
const generateSaudiPhone = (): string => {
  const prefixes = ["050", "053", "054", "055", "056", "057", "058", "059"];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const number = Math.floor(1000000 + Math.random() * 9000000);
  return `+966${prefix.slice(1)}${number}`;
};

// Generate random name
const generateName = (): string => {
  const firstName = saudiFirstNames[Math.floor(Math.random() * saudiFirstNames.length)];
  const lastName = saudiLastNames[Math.floor(Math.random() * saudiLastNames.length)];
  return `${firstName} ${lastName}`;
};

// Seed categories with idempotent check (by unique id)
export const seedRealCategories = async (): Promise<void> => {
  try {
    logger.info("Starting real categories seeding...");

    for (const categoryData of realCategories) {
      const existing = await Category.findOne({ id: categoryData.id });

      if (!existing) {
        await Category.create(categoryData);
        logger.info(`Created category: ${categoryData.title}`);
      } else {
        // Update existing category with image if missing
        if (!existing.imageUrl && categoryData.imageUrl) {
          await Category.updateOne(
            { id: categoryData.id },
            { $set: { imageUrl: categoryData.imageUrl } }
          );
          logger.info(`Updated category image: ${categoryData.title}`);
        } else {
          logger.info(`Category already exists: ${categoryData.title}, skipping`);
        }
      }
    }

    logger.info("Real categories seeding completed");
  } catch (error) {
    logger.error("Error seeding real categories:", error);
    throw error;
  }
};

// Seed offices with idempotent check (by unique crNumber)
export const seedRealOffices = async (): Promise<void> => {
  try {
    logger.info("Starting real offices seeding...");

    // Drop the problematic index if it exists (allows null values to coexist)
    try {
      await User.collection.dropIndex("companyProfile.crNumber_1");
      logger.info("Dropped companyProfile.crNumber index");
    } catch {
      // Index might not exist, that's fine
    }

    for (const officeData of realOffices) {
      // Check if business with this crNumber already exists
      const existingBusiness = await Business.findOne({
        crNumber: officeData.crNumber,
      });

      if (existingBusiness) {
        // Update existing business with images if missing
        const updateFields: Record<string, string> = {};

        if (!existingBusiness.avatarUrl && officeData.avatarUrl) {
          updateFields.avatarUrl = officeData.avatarUrl;
        }
        if (!existingBusiness.coverUrl && officeData.coverUrl) {
          updateFields.coverUrl = officeData.coverUrl;
        }

        if (Object.keys(updateFields).length > 0) {
          await Business.updateOne(
            { crNumber: officeData.crNumber },
            { $set: updateFields }
          );
          logger.info(`Updated office images: ${officeData.name}`);
        } else {
          logger.info(
            `Office already exists: ${officeData.name} (CR: ${officeData.crNumber}), skipping`
          );
        }
        continue;
      }

      // Check if user with this email exists, or create new one
      let owner = await User.findOne({ email: officeData.delegate.email });

      if (!owner) {
        owner = new User({
          phone: officeData.delegate.phone,
          email: officeData.delegate.email,
          fullName: officeData.delegate.fullName,
          role: UserRole.COMPANY,
          isActive: true,
          isVerified: true,
          companyProfile: {
            crNumber: officeData.crNumber,
            companyName: officeData.name,
          },
        });
        await owner.save();
        logger.info(`Created owner user: ${owner.email}`);
      }

      // Create business
      const business = new Business({
        ...officeData,
        ownerId: owner._id,
        createdAt: new Date(
          Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000
        ), // Random date within last 60 days
      });

      await business.save();
      logger.info(`Created office: ${business.name}`);
    }

    logger.info(`Real offices seeding completed`);
  } catch (error) {
    logger.error("Error seeding real offices:", error);
    throw error;
  }
};

// Seed reviews for real offices with idempotent check
export const seedRealReviews = async (): Promise<void> => {
  try {
    logger.info("Starting real reviews seeding...");

    // Get all businesses (real offices)
    const businesses = await Business.find({
      crNumber: { $in: realOffices.map((o) => o.crNumber) },
    });

    if (businesses.length === 0) {
      logger.info("No real offices found, skipping reviews seeding");
      return;
    }

    logger.info(`Found ${businesses.length} real offices for reviews`);

    // Check if reviews already exist for these businesses
    const existingReviewsCount = await Review.countDocuments({
      businessId: { $in: businesses.map((b) => b._id) },
    });

    if (existingReviewsCount > 0) {
      logger.info(
        `Reviews already exist for real offices (${existingReviewsCount} found), skipping`
      );
      return;
    }

    // Get or create individual users for reviews
    let reviewers = await User.find({ role: UserRole.INDIVIDUAL }).limit(15);

    if (reviewers.length < 10) {
      logger.info("Creating individual users for reviews...");
      const newUsers = [];

      for (let i = 0; i < 15; i++) {
        const phone = generateSaudiPhone();
        // Check if phone already exists
        const existingUser = await User.findOne({ phone });
        if (existingUser) continue;

        newUsers.push({
          phone,
          role: UserRole.INDIVIDUAL,
          isActive: true,
          isVerified: true,
          individualProfile: {
            fullName: generateName(),
          },
          createdAt: new Date(
            Date.now() - Math.floor(Math.random() * 90) * 24 * 60 * 60 * 1000
          ),
        });
      }

      if (newUsers.length > 0) {
        await User.insertMany(newUsers);
        logger.info(`Created ${newUsers.length} individual users for reviews`);
      }

      reviewers = await User.find({ role: UserRole.INDIVIDUAL }).limit(15);
    }

    // Update reviewers without names
    for (const reviewer of reviewers) {
      if (!reviewer.individualProfile?.fullName) {
        reviewer.individualProfile = {
          ...reviewer.individualProfile,
          fullName: generateName(),
          termsAccepted: reviewer.individualProfile?.termsAccepted ?? true,
        };
        await reviewer.save();
      }
    }

    logger.info(`Using ${reviewers.length} reviewers for reviews`);

    // Create reviews for each business
    const reviews = [];
    let reviewIndex = 0;

    for (const business of businesses) {
      // 4-6 reviews per business
      const reviewCount = 4 + Math.floor(Math.random() * 3);

      for (let i = 0; i < reviewCount; i++) {
        const reviewData = reviewTexts[reviewIndex % reviewTexts.length];
        const reviewer = reviewers[Math.floor(Math.random() * reviewers.length)];
        const isApproved = Math.random() > 0.2; // 80% approved
        const daysAgo = Math.floor(Math.random() * 60);

        // Only approved reviews can have likes
        const likesCount = isApproved ? Math.floor(Math.random() * 30) : 0;

        reviews.push({
          businessId: business._id,
          userId: reviewer._id,
          rating: reviewData.rating,
          text: reviewData.text,
          serviceTag: serviceTags[Math.floor(Math.random() * serviceTags.length)],
          likes: [],
          likesCount,
          isApproved,
          moderatedAt: isApproved
            ? new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000 + 3600000)
            : undefined,
          createdAt: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
        });

        reviewIndex++;
      }
    }

    await Review.insertMany(reviews);

    const approvedCount = reviews.filter((r) => r.isApproved).length;
    const pendingCount = reviews.filter((r) => !r.isApproved).length;

    logger.info(`Created ${reviews.length} reviews`);
    logger.info(`  - ${approvedCount} approved (with likes)`);
    logger.info(`  - ${pendingCount} pending (0 likes)`);

    // Update business ratings based on approved reviews
    logger.info("Updating business ratings...");
    for (const business of businesses) {
      const businessReviews = await Review.find({
        businessId: business._id,
        isApproved: true,
      });

      const ratingCount = businessReviews.length;
      const avgRating =
        ratingCount > 0
          ? businessReviews.reduce((sum, r) => sum + r.rating, 0) / ratingCount
          : 0;

      await Business.updateOne(
        { _id: business._id },
        { $set: { rating: Math.round(avgRating * 10) / 10, ratingCount } }
      );

      logger.info(
        `  → ${business.name}: ${ratingCount} reviews, avg ${avgRating.toFixed(1)}⭐`
      );
    }

    logger.info("Real reviews seeding completed");
  } catch (error) {
    logger.error("Error seeding real reviews:", error);
    throw error;
  }
};

// Main function to seed all real data
export const seedAllRealData = async (): Promise<void> => {
  try {
    await seedRealCategories();
    await seedRealOffices();
    await seedRealReviews();
    logger.info("All real data seeding completed successfully");
  } catch (error) {
    logger.error("Error during real data seeding:", error);
    throw error;
  }
};

// Run directly if executed as script
const runSeed = async () => {
  try {
    const mongoURI =
      process.env.MONGODB_URI || "mongodb://localhost:27017/mukhalis";

    logger.info(`Connecting to MongoDB: ${mongoURI}`);
    await mongoose.connect(mongoURI);
    logger.info("Connected to MongoDB");

    await seedAllRealData();

    logger.info("Seeding completed, disconnecting...");
    await mongoose.disconnect();
    logger.info("Disconnected from MongoDB");

    process.exit(0);
  } catch (error) {
    logger.error("Seed script failed:", error);
    process.exit(1);
  }
};

runSeed();
