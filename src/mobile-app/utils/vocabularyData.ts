export interface VocabularyWord {
  id: string;
  vie: string;
  khm: string;
  pronunciation: string;
}

export interface VocabularyCategory {
  id: string;
  title: string;
  iconName: string; // Ionicons name
  color: string;
  words: VocabularyWord[];
}

// Dữ liệu mock tĩnh cho giai đoạn đầu tiên, sau này rảnh gõ lên Firebase sau.
export const VOCABULARY_CATEGORIES: VocabularyCategory[] = [
  {
    id: "family",
    title: "cat_family",
    iconName: "people-outline",
    color: "#EC4899", // Pink
    words: [
      { id: "f1", vie: "Gia đình", khm: "គ្រួសារ", pronunciation: "Kruosa" },
      { id: "f2", vie: "Cha", khm: "ឪពុក", pronunciation: "Ovuk" },
      { id: "f3", vie: "Mẹ", khm: "ម្តាយ", pronunciation: "Mday" },
      { id: "f4", vie: "Anh trai", khm: "បងប្រុស", pronunciation: "Bong Bros" },
      { id: "f5", vie: "Chị gái", khm: "បងស្រី", pronunciation: "Bong Srei" },
      { id: "f6", vie: "Em trai", khm: "ប្អូនប្រុស", pronunciation: "Paon Bros" },
      { id: "f7", vie: "Em gái", khm: "ប្អូនស្រី", pronunciation: "Paon Srei" },
      { id: "f8", vie: "Ông", khm: "ជីតា", pronunciation: "Chita" },
      { id: "f9", vie: "Bà", khm: "ជីដូន", pronunciation: "Chidon" },
      { id: "f10", vie: "Con", khm: "កូន", pronunciation: "Kon" },
    ]
  },
  {
    id: "food",
    title: "cat_food",
    iconName: "restaurant-outline",
    color: "#10B981", // Emerald
    words: [
      { id: "fo1", vie: "Bún nước lèo", khm: "នំបញ្ចុក", pronunciation: "Nom Banh Chok" },
      { id: "fo2", vie: "Cốm dẹp", khm: "អំបុក", pronunciation: "Ambok" },
      { id: "fo3", vie: "Canh chua Khmer", khm: "សម្លម្ជូរគ្រឿង", pronunciation: "Samlor Machu Kroeung" },
      { id: "fo4", vie: "Cà ri Khmer", khm: "ការីខ្មែរ", pronunciation: "Kari Khmer" },
      { id: "fo5", vie: "Bánh tét Khmer", khm: "នំអន្សម", pronunciation: "Num Ansom" },
      { id: "fo6", vie: "Bánh gừng", khm: "នំព្រះខែ", pronunciation: "Num Preah Khe" },
      { id: "fo7", vie: "Cá nướng", khm: "អាំងត្រី", pronunciation: "Ang Trei" },
      { id: "fo8", vie: "Xôi", khm: "បាយដំណើប", pronunciation: "Bay Damneub" },
      { id: "fo9", vie: "Mắm bò hóc", khm: "ប្រហុក", pronunciation: "Prahok" },
      { id: "fo10", vie: "Bánh căn Khmer", khm: "នំគ្រក់", pronunciation: "Num Krok" },
    ]
  },
  {
    id: "greetings",
    title: "cat_greetings",
    iconName: "chatbubbles-outline",
    color: "#3B82F6", // Blue
    words: [
      { id: "g1", vie: "Xin chào", khm: "សួស្តី", pronunciation: "Suosdei" },
      { id: "g2", vie: "Cảm ơn", khm: "អរគុណ", pronunciation: "Orkun" },
      { id: "g3", vie: "Xin lỗi", khm: "សូមទោស", pronunciation: "Somtos" },
      { id: "g4", vie: "Vâng (nam)", khm: "បាទ", pronunciation: "Bat" },
      { id: "g5", vie: "Vâng (nữ)", khm: "ចាស", pronunciation: "Cha" },
      { id: "g6", vie: "Tạm biệt", khm: "លាហើយ", pronunciation: "Lea Haeuy" },
      { id: "g7", vie: "Bạn khỏe không?", khm: "សុkhសប្បាយទេ?", pronunciation: "Soksabay Te?" },
      { id: "g8", vie: "Tôi khỏe", khm: "ខ្ញុំសុkhសប្បាយ", pronunciation: "Khnhom Soksabay" },
      { id: "g9", vie: "Hẹn gặp lại", khm: "ជួបគ្នាម្តងទៀត", pronunciation: "Choub Knea Mdong Tiet" },
      { id: "g10", vie: "Không sao đâu", khm: "មិនអីទេ", pronunciation: "Min Ey Te" },
    ]
  },
  {
    id: "numbers",
    title: "cat_numbers",
    iconName: "calculator-outline",
    color: "#8B5CF6", // Purple
    words: [
      { id: "n1", vie: "Số 1", khm: "មួយ", pronunciation: "Muoy" },
      { id: "n2", vie: "Số 2", khm: "ពីរ", pronunciation: "Pir" },
      { id: "n3", vie: "Số 3", khm: "បី", pronunciation: "Bei" },
      { id: "n4", vie: "Số 4", khm: "បួន", pronunciation: "Buon" },
      { id: "n5", vie: "Số 5", khm: "ប្រាំ", pronunciation: "Pram" },
      { id: "n6", vie: "Số 6", khm: "ប្រាំមួយ", pronunciation: "Pram muoy" },
      { id: "n7", vie: "Số 7", khm: "ប្រាំពីរ", pronunciation: "Pram pir" },
      { id: "n8", vie: "Số 8", khm: "ប្រាំបី", pronunciation: "Pram bei" },
      { id: "n9", vie: "Số 9", khm: "ប្រាំបួន", pronunciation: "Pram buon" },
      { id: "n10", vie: "Số 10", khm: "ដប់", pronunciation: "Dop" },
    ]
  }
];
