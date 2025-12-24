/**
 * Seed script for Reviews with realistic data
 * - Pending reviews have 0 likes
 * - Approved reviews have random likes
 * Run with: npx ts-node src/scripts/seed-reviews.ts
 */

const mongoose = require("mongoose");
require("dotenv").config();

const MONGODB_URI = process.env.MONGODB_URI;

// Saudi Arabic names
const saudiFirstNames = [
  "أحمد",
  "محمد",
  "عبدالله",
  "خالد",
  "فهد",
  "سعود",
  "ناصر",
  "سلطان",
  "عمر",
  "يوسف",
  "سارة",
  "نورة",
  "فاطمة",
  "مريم",
  "هند",
  "لمى",
  "ريم",
  "دانة",
  "لينا",
  "أمل",
];

const saudiLastNames = [
  "العتيبي",
  "القحطاني",
  "الغامدي",
  "الزهراني",
  "الشمري",
  "الدوسري",
  "الحربي",
  "المطيري",
  "العنزي",
  "السبيعي",
  "الرشيدي",
  "البلوي",
  "الجهني",
  "الشهري",
  "السلمي",
];

// Sample review texts with matching ratings
const reviewTexts = [
  {
    text: "خدمة ممتازة جداً! التوصيل كان سريع والموظفين متعاونين جداً. أنصح بشدة بهم.",
    rating: 5,
  },
  {
    text: "تجربة رائعة مع هذا المكتب. سرعة في الإنجاز ودقة في العمل. شكراً لكم.",
    rating: 5,
  },
  {
    text: "خدمات لوجستية احترافية تغطي جميع احتياجات الشركات. الفريق محترف وذو خبرة عالية.",
    rating: 4,
  },
  {
    text: "استخدمت خدماتهم مرتين وكل مرة كانت النتيجة مرضية. التسعير معقول وجودة تنافسية.",
    rating: 4,
  },
  {
    text: "الخدمة كانت جيدة بشكل عام ولكن هناك بعض التأخير في سرعة التواصل والرد.",
    rating: 3,
  },
  {
    text: "خدمة ممتازة وخبرة في مجال الاستيراد والتصدير. أوصي بهم بشدة للشركات الناشئة.",
    rating: 5,
  },
  {
    text: "تعاملت معهم في شحنة دولية وكانت التجربة ممتازة من البداية للنهاية. محترفين جداً!",
    rating: 5,
  },
  {
    text: "المتابعة كانت ممتازة والتواصل مستمر طوال العملية. شكراً لهم على الاحترافية.",
    rating: 4,
  },
  {
    text: "خدمة التخليص الجمركي كانت سريعة ومحترفة. أسعارهم تنافسية مقارنة بالسوق.",
    rating: 4,
  },
  {
    text: "تجربة جيدة لكن كنت أتمنى سرعة أكثر في الرد على الاستفسارات والمتابعة.",
    rating: 3,
  },
  {
    text: "فريق عمل محترف ومتعاون. ساعدوني في كل خطوة من العملية بصبر واهتمام.",
    rating: 5,
  },
  {
    text: "أسعار معقولة وخدمة متميزة. سأتعامل معهم مرة أخرى بكل تأكيد إن شاء الله.",
    rating: 4,
  },
  {
    text: "التعامل كان احترافي والموظفين كانوا متعاونين جداً في حل جميع المشاكل.",
    rating: 4,
  },
  {
    text: "خدمة ممتازة في التخليص الجمركي. أنصح الجميع بالتعامل معهم بدون تردد.",
    rating: 5,
  },
  {
    text: "تجربة مميزة! سرعة في الإنجاز ومتابعة دورية للشحنات. الأفضل في المنطقة.",
    rating: 5,
  },
  {
    text: "خدمة متوسطة، كان هناك بعض التأخير لكن في النهاية تم إنجاز المطلوب.",
    rating: 3,
  },
  {
    text: "ممتازين في التعامل مع الشحنات الكبيرة. لديهم خبرة واضحة في المجال.",
    rating: 5,
  },
  {
    text: "سعيد جداً بالخدمة المقدمة. فريق محترف ومتابعة ممتازة للشحنة.",
    rating: 5,
  },
];

const serviceTags = [
  "نقل سريع",
  "استيراد",
  "تصدير",
  "تخليص جمركي",
  "نقل دولي",
  "خدمات متكاملة",
  "شحن بحري",
  "شحن جوي",
  "تخليص سيارات",
];

// Generate Saudi phone number
const generateSaudiPhone = () => {
  const prefixes = ["050", "053", "054", "055", "056", "057", "058", "059"];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const number = Math.floor(1000000 + Math.random() * 9000000);
  return `+966${prefix.slice(1)}${number}`;
};

// Generate random name
const generateName = () => {
  const firstName =
    saudiFirstNames[Math.floor(Math.random() * saudiFirstNames.length)];
  const lastName =
    saudiLastNames[Math.floor(Math.random() * saudiLastNames.length)];
  return `${firstName} ${lastName}`;
};

async function seedReviews() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    const Business = mongoose.connection.collection("businesses");
    const User = mongoose.connection.collection("users");
    const Review = mongoose.connection.collection("reviews");

    // Get businesses
    const businesses = await Business.find({}).toArray();
    console.log(`Found ${businesses.length} businesses`);

    if (businesses.length === 0) {
      console.log("❌ No businesses found. Please create businesses first.");
      process.exit(1);
    }

    // Get or create individual users with proper names
    let users = await User.find({ role: "individual" }).toArray();

    if (users.length < 10) {
      console.log("📝 Creating individual users with Saudi names...");
      const newUsers = [];

      for (let i = 0; i < 15; i++) {
        const fullName = generateName();
        const phone = generateSaudiPhone();

        newUsers.push({
          phone,
          role: "individual",
          isActive: true,
          isPhoneVerified: true,
          individualProfile: {
            fullName,
          },
          createdAt: new Date(
            Date.now() - Math.floor(Math.random() * 90) * 24 * 60 * 60 * 1000
          ),
          updatedAt: new Date(),
        });
      }

      await User.insertMany(newUsers);
      users = await User.find({ role: "individual" }).toArray();
      console.log(`✅ Created ${newUsers.length} individual users`);
    } else {
      // Update existing users without names
      console.log("📝 Updating users with Saudi names...");
      for (const user of users) {
        if (!user.individualProfile?.fullName) {
          await User.updateOne(
            { _id: user._id },
            {
              $set: {
                "individualProfile.fullName": generateName(),
                updatedAt: new Date(),
              },
            }
          );
        }
      }
      users = await User.find({ role: "individual" }).toArray();
    }

    console.log(`Using ${users.length} users for reviews`);

    // Clear existing reviews
    await Review.deleteMany({});
    console.log("🗑️ Cleared existing reviews");

    // Create reviews with REALISTIC data
    const reviews = [];
    const totalReviews = Math.min(30, businesses.length * 5);

    for (let i = 0; i < totalReviews; i++) {
      const reviewData = reviewTexts[i % reviewTexts.length];
      const business = businesses[i % businesses.length];
      const user = users[Math.floor(Math.random() * users.length)];
      const isApproved = Math.random() > 0.25; // 75% approved
      const daysAgo = Math.floor(Math.random() * 60);

      // REALISTIC: Only approved reviews can have likes!
      const likesCount = isApproved ? Math.floor(Math.random() * 50) : 0;

      reviews.push({
        businessId: business._id,
        userId: user._id,
        rating: reviewData.rating,
        text: reviewData.text,
        serviceTag: serviceTags[Math.floor(Math.random() * serviceTags.length)],
        likes: [],
        likesCount, // 0 for pending, random for approved
        isApproved,
        moderatedBy: isApproved ? users[0]._id : null,
        moderatedAt: isApproved
          ? new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000 + 3600000)
          : null,
        createdAt: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
        updatedAt: new Date(),
      });
    }

    await Review.insertMany(reviews);

    const approvedCount = reviews.filter((r) => r.isApproved).length;
    const pendingCount = reviews.filter((r) => !r.isApproved).length;

    console.log(`✅ Created ${reviews.length} reviews`);
    console.log(`   ✓ ${approvedCount} approved (with likes)`);
    console.log(`   ⏳ ${pendingCount} pending (0 likes)`);

    // Update business ratings
    console.log("\n📊 Updating business ratings...");
    for (const business of businesses) {
      const businessReviews = await Review.find({
        businessId: business._id,
        isApproved: true,
      }).toArray();

      const ratingCount = businessReviews.length;
      const avgRating =
        ratingCount > 0
          ? businessReviews.reduce((sum, r) => sum + r.rating, 0) / ratingCount
          : 0;

      await Business.updateOne(
        { _id: business._id },
        { $set: { rating: Math.round(avgRating * 10) / 10, ratingCount } }
      );

      if (ratingCount > 0) {
        console.log(
          `  → ${
            business.name
          }: ${ratingCount} reviews, avg ${avgRating.toFixed(1)}⭐`
        );
      }
    }

    console.log("\n🎉 Reviews seeding complete!");
    console.log(`   - ${reviews.length} reviews created`);
    console.log(`   - ${users.length} users with names`);
    console.log(`   - ${businesses.length} businesses updated`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding error:", error);
    process.exit(1);
  }
}

seedReviews();
