/* ============================================================
   Wellpoint seed directory (prototype)
   Facility names + locations below come from public sources
   (facility websites, search listings). Fields listed in each
   facility's `verified` array were seen in a public source;
   everything else is DEMO data and is labelled as such in the UI.
   Doctors are fictional placeholders, never real clinicians.
   Before production, replace with the Ministry of Health
   licensed-establishment directory (moh.gov.om).
   ============================================================ */
const GOVERNORATES = ["muscat", "n_batinah", "s_batinah", "buraimi", "dakhiliyah", "dhahirah", "n_sharqiyah", "s_sharqiyah", "dhofar", "musandam", "wusta"];

const SPECIALTIES = ["general", "family", "internal", "cardiology", "endocrinology", "dermatology", "dentistry", "pediatrics", "orthopedics", "ent", "ophthalmology", "gynecology", "urology", "neurology", "psychiatry", "physiotherapy", "gastro"];

const CLINICS = [
  { id: "starcare", name: "Starcare Hospital", nameAr: "مستشفى ستاركير", gov: "muscat", area: "Bausher", type: "hospital",
    phone: "+968 2455 7200", website: "", verified: ["name", "gov", "area", "phone"],
    specialties: ["general", "internal", "cardiology", "pediatrics", "orthopedics", "gynecology", "dermatology"],
    source: "Public listing (Destination Oman / search results)", hue: 214 },
  { id: "mph", name: "Muscat Private Hospital", nameAr: "مستشفى مسقط الخاص", gov: "muscat", area: "Bausher", type: "hospital",
    phone: "", website: "", verified: ["name", "gov", "area", "about"], aboutKey: "about_mph",
    specialties: ["general", "internal", "cardiology", "ent", "ophthalmology", "urology", "gastro"],
    source: "Public listing (Yellow Pages Oman / Destination Oman)", hue: 200 },
  { id: "burjeel", name: "Burjeel Hospital Muscat", nameAr: "مستشفى برجيل مسقط", gov: "muscat", area: "Al Khuwair", type: "hospital",
    phone: "", website: "https://www.burjeelhospitaloman.com/", verified: ["name", "gov", "area", "website"],
    specialties: ["general", "family", "orthopedics", "neurology", "endocrinology", "physiotherapy"],
    source: "Facility website", hue: 226 },
  { id: "kims", name: "KIMSHEALTH Oman Hospital", nameAr: "مستشفى كيمز هيلث عُمان", gov: "muscat", area: "Darsait", type: "hospital",
    phone: "+968 2476 0100", website: "", verified: ["name", "gov", "area", "phone", "about"], aboutKey: "about_kims",
    specialties: ["general", "internal", "endocrinology", "cardiology", "pediatrics", "gynecology"],
    source: "Public listing (search results)", hue: 190 },
  { id: "aster", name: "Aster Al Raffah Hospital", nameAr: "مستشفى أستر الرفاه", gov: "muscat", area: "Al Ghubrah", type: "hospital",
    phone: "", website: "", verified: ["name", "gov", "area"],
    specialties: ["general", "family", "dentistry", "dermatology", "pediatrics"],
    source: "Public listing (search results)", hue: 236 },
  { id: "apollo", name: "Apollo Hospitals Muscat", nameAr: "مستشفى أبولو مسقط", gov: "muscat", area: "Al Hamriya", type: "hospital",
    phone: "", website: "", verified: ["name", "gov", "area"],
    specialties: ["general", "cardiology", "orthopedics", "gastro", "urology"],
    source: "Public listing (search results)", hue: 206 },
  { id: "alhayat", name: "Al Hayat International Hospital", nameAr: "مستشفى الحياة الدولي", gov: "muscat", area: "Al Ghubrah", type: "hospital",
    phone: "+968 2200 4000", website: "", verified: ["name", "gov", "area", "phone", "specialties"],
    specialties: ["cardiology", "orthopedics", "endocrinology", "gynecology", "general"],
    source: "Public listing (search results)", hue: 220 },
  { id: "hatat", name: "Hatat Polyclinic", nameAr: "عيادة حاتات", gov: "muscat", area: "Ruwi · Wadi Adai Street", type: "polyclinic",
    phone: "", website: "", verified: ["name", "gov", "area"],
    specialties: ["family", "general", "pediatrics", "dermatology", "psychiatry"],
    source: "Public listing (search results)", hue: 180 },
  { id: "badr_sohar", name: "Badr Al Samaa Hospital, Sohar", nameAr: "مستشفى بدر السماء - صحار", gov: "n_batinah", area: "Sohar", type: "hospital",
    phone: "", website: "https://sohar.badralsamaahospitals.com/", verified: ["name", "gov", "area", "website"],
    specialties: ["general", "internal", "pediatrics", "orthopedics", "dentistry"],
    source: "Facility website", hue: 210 },
  { id: "badr_barka", name: "Badr Al Samaa Hospital, Barka", nameAr: "مستشفى بدر السماء - بركاء", gov: "s_batinah", area: "Barka", type: "hospital",
    phone: "", website: "https://barka.badralsamaahospitals.com/", verified: ["name", "gov", "area", "website"],
    specialties: ["general", "family", "gynecology", "ent"],
    source: "Facility website", hue: 198 },
  { id: "badr_salalah", name: "Badr Al Samaa Hospital, Salalah", nameAr: "مستشفى بدر السماء - صلالة", gov: "dhofar", area: "Salalah", type: "hospital",
    phone: "", website: "", verified: ["name", "gov", "area"],
    specialties: ["general", "internal", "pediatrics", "ophthalmology"],
    source: "Public listing (Bupa Global facility directory)", hue: 188 },
  { id: "badr_nizwa", name: "Badr Al Samaa Hospital, Nizwa", nameAr: "مستشفى بدر السماء - نزوى", gov: "dakhiliyah", area: "Nizwa", type: "hospital",
    phone: "", website: "https://nizwa.badralsamaahospitals.com/", verified: ["name", "gov", "area", "website"],
    specialties: ["general", "family", "dermatology", "orthopedics"],
    source: "Facility website", hue: 222 },
  { id: "badr_sur", name: "Badr Al Samaa Medical Centre, Sur", nameAr: "مركز بدر السماء الطبي - صور", gov: "s_sharqiyah", area: "Sur", type: "medical_centre",
    phone: "", website: "", verified: ["name", "gov", "area"],
    specialties: ["general", "family", "dentistry"],
    source: "Group website (locations)", hue: 204 },
  { id: "badr_duqm", name: "Badr Al Samaa Medical Centre, Duqm", nameAr: "مركز بدر السماء الطبي - الدقم", gov: "wusta", area: "Duqm", type: "medical_centre",
    phone: "", website: "", verified: ["name", "gov", "area"],
    specialties: ["general", "family"],
    source: "Group website (locations)", hue: 194 },
  { id: "yas", name: "YAS Hospital", nameAr: "مستشفى ياس", gov: "buraimi", area: "Al Buraimi", type: "hospital",
    phone: "", website: "", verified: ["name", "gov", "area"],
    specialties: ["general", "internal", "gynecology", "pediatrics"],
    source: "Public listing (View Oman)", hue: 216 },
  { id: "almisk", name: "Al-Misk Medical Center", nameAr: "مركز المسك الطبي", gov: "dhahirah", area: "Ibri", type: "medical_centre",
    phone: "", website: "", verified: ["name", "gov", "area"],
    specialties: ["general", "family", "dentistry"],
    source: "Public listing (search results)", hue: 172 }
];

/* Fictional placeholder clinicians. `days` = weekdays with sessions (0=Sun). */
const DOCTORS = [
  ["d1", "starcare", "general", "f", "Dr. Salma Al Harthy", "د. سلمى الحارثي", 9, ["ar", "en"], [0, 1, 2, 3, 4], [8, 13], 15],
  ["d2", "starcare", "cardiology", "m", "Dr. Omar Nasser", "د. عمر ناصر", 14, ["ar", "en"], [0, 2, 4], [9, 14], 30],
  ["d3", "starcare", "pediatrics", "f", "Dr. Priya Menon", "د. بريا مينون", 11, ["en", "hi", "ml"], [1, 3, 6], [15, 20], 20],
  ["d4", "mph", "internal", "m", "Dr. Khalfan Al Rawahi", "د. خلفان الرواحي", 17, ["ar", "en"], [0, 1, 3], [8, 12], 25],
  ["d5", "mph", "ent", "f", "Dr. Hana Yousuf", "د. هناء يوسف", 8, ["ar", "en"], [2, 4], [16, 20], 22],
  ["d6", "burjeel", "orthopedics", "m", "Dr. Faisal Al Balushi", "د. فيصل البلوشي", 12, ["ar", "en", "ur"], [0, 1, 2, 3], [9, 13], 28],
  ["d7", "burjeel", "endocrinology", "f", "Dr. Li Wen", "د. لي وين", 10, ["en", "zh"], [1, 3, 4], [14, 19], 30],
  ["d8", "burjeel", "family", "m", "Dr. Yahya Al Amri", "د. يحيى العامري", 6, ["ar", "en"], [0, 1, 2, 3, 4, 6], [8, 14], 12],
  ["d9", "kims", "endocrinology", "m", "Dr. Suresh Nair", "د. سوريش ناير", 16, ["en", "ml", "hi"], [0, 2, 4], [8, 13], 25],
  ["d10", "kims", "internal", "f", "Dr. Muna Al Kindi", "د. منى الكندي", 13, ["ar", "en"], [0, 1, 2, 3, 4], [9, 15], 20],
  ["d11", "kims", "cardiology", "m", "Dr. Hamad Al Siyabi", "د. حمد السيابي", 19, ["ar", "en"], [1, 3], [16, 20], 32],
  ["d12", "aster", "dentistry", "f", "Dr. Noor Al Lawati", "د. نور اللواتي", 7, ["ar", "en"], [0, 1, 2, 3, 4, 6], [10, 18], 18],
  ["d13", "aster", "dermatology", "f", "Dr. Chen Jing", "د. تشن جينغ", 9, ["en", "zh"], [0, 2, 4], [12, 18], 26],
  ["d14", "apollo", "gastro", "m", "Dr. Rakesh Iyer", "د. راكيش آير", 15, ["en", "hi"], [1, 2, 3], [9, 13], 28],
  ["d15", "apollo", "urology", "m", "Dr. Sultan Al Mahrouqi", "د. سلطان المحروقي", 11, ["ar", "en"], [0, 4], [15, 19], 26],
  ["d16", "alhayat", "gynecology", "f", "Dr. Amal Al Busaidi", "د. آمال البوسعيدي", 14, ["ar", "en"], [0, 1, 2, 3, 4], [9, 14], 25],
  ["d17", "alhayat", "cardiology", "m", "Dr. Tariq Al Zadjali", "د. طارق الزدجالي", 18, ["ar", "en"], [0, 2, 3], [16, 20], 30],
  ["d18", "hatat", "psychiatry", "f", "Dr. Reem Al Shukaili", "د. ريم الشكيلي", 10, ["ar", "en"], [0, 1, 3], [10, 16], 35],
  ["d19", "hatat", "family", "m", "Dr. Adil Hassan", "د. عادل حسن", 8, ["ar", "en", "ur"], [0, 1, 2, 3, 4, 6], [8, 13], 14],
  ["d20", "badr_sohar", "general", "m", "Dr. Said Al Maqbali", "د. سعيد المقبالي", 9, ["ar", "en"], [0, 1, 2, 3, 4, 6], [8, 14], 10],
  ["d21", "badr_sohar", "pediatrics", "f", "Dr. Anjali Rao", "د. أنجالي راو", 12, ["en", "hi", "ml"], [0, 2, 4], [15, 20], 15],
  ["d22", "badr_barka", "gynecology", "f", "Dr. Zainab Al Hosni", "د. زينب الحوسني", 10, ["ar", "en"], [0, 1, 3], [9, 13], 18],
  ["d23", "badr_salalah", "internal", "m", "Dr. Musallam Al Mashani", "د. مسلم المعشني", 15, ["ar", "en"], [0, 1, 2, 3], [8, 13], 18],
  ["d24", "badr_nizwa", "family", "f", "Dr. Asma Al Abri", "د. أسماء العبري", 7, ["ar", "en"], [0, 1, 2, 3, 4], [8, 14], 10],
  ["d25", "badr_sur", "general", "m", "Dr. Nasser Al Alawi", "د. ناصر العلوي", 6, ["ar", "en"], [0, 1, 2, 3, 4, 6], [16, 21], 8],
  ["d26", "yas", "internal", "m", "Dr. Hilal Al Kaabi", "د. هلال الكعبي", 13, ["ar", "en"], [0, 2, 4], [9, 14], 15],
  ["d27", "almisk", "dentistry", "f", "Dr. Fatma Al Yaqoubi", "د. فاطمة اليعقوبي", 8, ["ar", "en"], [0, 1, 2, 3, 6], [16, 21], 12],
  ["d28", "badr_duqm", "general", "m", "Dr. Joseph Mathew", "د. جوزيف ماثيو", 10, ["en", "ml"], [0, 1, 2, 3, 4], [8, 16], 10]
].map(([id, clinicId, specialty, gender, name, nameAr, years, langs, days, hours, fee]) => ({ id, clinicId, specialty, gender, name, nameAr, years, langs, days, hours, fee, demo: true }));

const LANG_NAMES = { ar: "العربية", en: "English", zh: "中文", hi: "हिन्दी", ml: "മലയാളം", ur: "اردو" };
