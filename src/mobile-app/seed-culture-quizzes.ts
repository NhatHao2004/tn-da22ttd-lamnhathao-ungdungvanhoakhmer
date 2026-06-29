import { doc, setDoc } from 'firebase/firestore';
import { db } from './utils/firebaseConfig';

const cultureQuizzes = [
  {
    pagodaId: 'culture_1',
    pagodaName: 'Văn hóa chùa chiền',
    pagodaNameKm: 'វប្បធម៌វត្តអារាម',
    location: 'Nam Bộ',
    color: '#6366F1',
    accentColor: '#EEF2FF',
    questions: [
      {
        id: 'c1_q1',
        question: 'Chùa Khmer thường có kiến trúc mái như thế nào?',
        options: ['Mái bằng', 'Mái nhọn nhiều tầng', 'Mái vòm', 'Mái ngói âm dương'],
        correctIndex: 1,
        explanation: 'Mái chùa Khmer thường có kiến trúc nhọn, nhiều tầng chồng lên nhau, tượng trưng cho núi Meru trong thần thoại.',
      },
      {
        id: 'c1_q2',
        question: 'Chùa đối với cộng đồng người Khmer đóng vai trò gì?',
        options: ['Nơi ở của dân làng', 'Trung tâm văn hóa, giáo dục và tín ngưỡng', 'Chợ mua bán', 'Nơi hội họp chính trị'],
        correctIndex: 1,
        explanation: 'Ngôi chùa là trung tâm của mọi sinh hoạt cộng đồng, từ tôn giáo đến giáo dục và bảo tồn văn hóa của người Khmer.',
      },
      {
        id: 'c1_q3',
        question: 'Phật giáo của người Khmer Nam Bộ thuộc tông phái nào?',
        options: ['Phật giáo Đại thừa', 'Phật giáo Nam tông (Nguyên thủy)', 'Thiền tông', 'Mật tông'],
        correctIndex: 1,
        explanation: 'Phật giáo Nam tông (Theravada) là tôn giáo chủ đạo, ảnh hưởng sâu sắc đến nếp sống của người Khmer.',
      },
      {
        id: 'c1_q4',
        question: 'Ai là người có vị trí cao nhất, trụ trì một ngôi chùa Khmer?',
        options: ['Sư cả (Mekon)', 'Sư phó', 'Sa di', 'Cư sĩ'],
        correctIndex: 0,
        explanation: 'Sư cả là người đứng đầu ngôi chùa, có uy tín và vai trò lớn trong việc dẫn dắt đời sống tâm linh cộng đồng.',
      },
      {
        id: 'c1_q5',
        question: 'Các kinh sách cổ của người Khmer thường được lưu giữ trên chất liệu gì?',
        options: ['Giấy da', 'Lá buông (Lá thốt nốt)', 'Vải lụa', 'Gỗ quý'],
        correctIndex: 1,
        explanation: 'Kinh Lá Buông là di sản quý giá, được khắc chữ trên lá cây buông sấy khô, có độ bền hàng trăm năm.',
      },
    ],
  },
  {
    pagodaId: 'culture_2',
    pagodaName: 'Lễ hội truyền thống',
    pagodaNameKm: 'ពិធីបុណ្យប្រពៃណី',
    location: 'Nam Bộ',
    color: '#EC4899',
    accentColor: '#FDF2F8',
    questions: [
      {
        id: 'c2_q1',
        question: 'Hoạt động đặc trưng nhất của lễ hội Oóc Om Bóc là gì?',
        options: ['Múa lân', 'Đua ghe Ngo', 'Kéo co', 'Đấu vật'],
        correctIndex: 1,
        explanation: 'Đua ghe Ngo là môn thể thao dân gian sôi động và quan trọng nhất trong lễ hội Oóc Om Bóc.',
      },
      {
        id: 'c2_q2',
        question: 'Tết cổ truyền của người Khmer được gọi là gì?',
        options: ['Sen Đôn-ta', 'Chol Chnam Thmay', 'Oóc Om Bóc', 'Kathina'],
        correctIndex: 1,
        explanation: 'Chol Chnam Thmay là lễ mừng năm mới của người Khmer, diễn ra vào khoảng giữa tháng 4 hàng năm.',
      },
      {
        id: 'c2_q3',
        question: 'Lễ hội nào nhằm tưởng nhớ và báo hiếu tổ tiên?',
        options: ['Sen Đôn-ta', 'Lễ Kathina', 'Lễ hội Đua bò', 'Lễ cúng Trăng'],
        correctIndex: 0,
        explanation: 'Sen Đôn-ta (Lễ cúng ông bà) là dịp để con cháu bày tỏ lòng biết ơn và cầu siêu cho tổ tiên.',
      },
      {
        id: 'c2_q4',
        question: 'Lễ hội Oóc Om Bóc còn được gọi là lễ cúng vị thần nào?',
        options: ['Thần Nước', 'Thần Mặt Trăng', 'Thần Đất', 'Thần Gió'],
        correctIndex: 1,
        explanation: 'Oóc Om Bóc là lễ cúng Trăng, cảm ơn thần Mặt Trăng đã ban cho mùa màng tốt tươi.',
      },
      {
        id: 'c2_q5',
        question: 'Lễ dâng y Kathina thường diễn ra sau kỳ hạn nào của các vị sư?',
        options: ['Kỳ thi kinh', 'Ba tháng an cư kiết hạ', 'Tết Nguyên đán', 'Lễ hội đua ghe'],
        correctIndex: 1,
        explanation: 'Lễ dâng y Kathina được tổ chức sau khi các vị sư hoàn tất 3 tháng an cư kiết hạ tại chùa.',
      },
    ],
  },
  {
    pagodaId: 'culture_3',
    pagodaName: 'Nghệ thuật và Âm nhạc',
    pagodaNameKm: 'សិល្បៈ និងតន្ត្រី',
    location: 'Nam Bộ',
    color: '#F59E0B',
    accentColor: '#FFFBEB',
    questions: [
      {
        id: 'c3_q1',
        question: 'Điệu múa dân gian phổ biến nhất của người Khmer là gì?',
        options: ['Múa sạp', 'Múa Răm-vông', 'Múa quạt', 'Múa nón'],
        correctIndex: 1,
        explanation: 'Múa Răm-vông là điệu múa vòng tròn, đơn giản nhưng vô cùng duyên dáng và có tính cộng đồng cao.',
      },
      {
        id: 'c3_q2',
        question: 'Dàn nhạc truyền thống đặc sắc nhất của người Khmer có tên là gì?',
        options: ['Dàn nhạc Giao hưởng', 'Dàn nhạc Ngũ âm (Pin Peat)', 'Dàn nhạc Cống chiêng', 'Dàn nhạc Đờn ca tài tử'],
        correctIndex: 1,
        explanation: 'Dàn nhạc Ngũ âm gồm các nhạc cụ làm từ kim loại, mộc, dây, da và hơi, tạo nên âm hưởng đặc trưng.',
      },
      {
        id: 'c3_q1',
        question: 'Loại hình sân khấu kịch hát truyền thống của người Khmer là?',
        options: ['Cải lương', 'Dù-kê', 'Hát bội', 'Quan họ'],
        correctIndex: 1,
        explanation: 'Dù-kê là loại hình nghệ thuật sân khấu tổng hợp độc đáo, kết hợp giữa ca, múa, kịch và âm nhạc.',
      },
      {
        id: 'c3_q4',
        question: 'Nhạc cụ Rô-niết-ek trong dàn nhạc Ngũ âm là loại nhạc cụ gì?',
        options: ['Trống da', 'Đàn thuyền bằng gỗ (Xylophone)', 'Kèn', 'Trống đồng'],
        correctIndex: 1,
        explanation: 'Rô-niết-ek là chiếc đàn hình thuyền với các thanh gỗ hoặc tre, phát ra âm thanh thanh thoát.',
      },
      {
        id: 'c3_q5',
        question: 'Múa Robam thường diễn ra trong bối cảnh nào?',
        options: ['Múa cung đình truyền thống', 'Nhảy hiện đại', 'Hát karaoke', 'Lao động sản xuất'],
        correctIndex: 0,
        explanation: 'Robam là nghệ thuật múa cổ điển Khmer, thường diễn các tích truyện về các vị thần và anh hùng.',
      },
    ],
  },
  {
    pagodaId: 'culture_4',
    pagodaName: 'Ngôn ngữ và Chữ viết',
    pagodaNameKm: 'ភាសា និងអក្សរសាស្ត្រ',
    location: 'Nam Bộ',
    color: '#10B981',
    accentColor: '#ECFDF5',
    questions: [
      {
        id: 'c4_q1',
        question: 'Chữ viết Khmer có nguồn gốc từ hệ chữ nào?',
        options: ['Chữ Hán', 'Chữ Latinh', 'Chữ Brahmi (Ấn Độ cổ)', 'Chữ Nôm'],
        correctIndex: 2,
        explanation: 'Hệ chữ Khmer được hình thành dựa trên nền tảng chữ Brahmi của Ấn Độ cổ đại.',
      },
      {
        id: 'c4_q2',
        question: 'Phụ âm trong tiếng Khmer có bao nhiêu ký tự chính?',
        options: ['24', '33', '29', '36'],
        correctIndex: 1,
        explanation: 'Hệ thống chữ viết Khmer có 33 phụ âm cơ bản, chia làm hai nhóm giọng (giọng O và giọng Ô).',
      },
      {
        id: 'c4_q3',
        question: 'Tiếng Khmer thuộc ngữ hệ nào sau đây?',
        options: ['Ngữ hệ Hán-Tạng', 'Ngữ hệ Nam Á (Môn-Khmer)', 'Ngữ hệ Nam Đảo', 'Ngữ hệ Ấn-Âu'],
        correctIndex: 1,
        explanation: 'Tiếng Khmer là ngôn ngữ lớn thứ hai trong ngữ hệ Nam Á, sau tiếng Việt.',
      },
      {
        id: 'c4_q4',
        question: 'Nơi nào thường xuyên tổ chức dạy chữ viết Khmer cho trẻ em?',
        options: ['Nhà văn hóa', 'Các ngôi chùa Khmer', 'Trường tiểu học công lập', 'Trung tâm giáo dục thường xuyên'],
        correctIndex: 1,
        explanation: 'Truyền thống dạy chữ Khmer trong chùa vào mỗi dịp hè là cách bảo tồn ngôn ngữ quan trọng của đồng bào.',
      },
      {
        id: 'c4_q5',
        question: 'Tiếng Khmer là ngôn ngữ chính của cộng đồng dân tộc nào tại ĐBSCL?',
        options: ['Người Hoa', 'Người Chăm', 'Người Khmer', 'Người Kinh'],
        correctIndex: 2,
        explanation: 'Tiếng Khmer là ngôn ngữ mẹ đẻ và là phương tiện giao tiếp chính của đồng bào dân tộc Khmer.',
      },
    ],
  },
  {
    pagodaId: 'culture_5',
    pagodaName: 'Trang phục truyền thống',
    pagodaNameKm: 'សម្លៀកបំពាក់ប្រពៃណី',
    location: 'Nam Bộ',
    color: '#8B5CF6',
    accentColor: '#F5F3FF',
    questions: [
      {
        id: 'c5_q1',
        question: 'Trang phục quấn quanh thân dưới của người Khmer gọi là gì?',
        options: ['Quần đùi', 'Xà-rông (Sampot)', 'Váy đầm', 'Áo dài'],
        correctIndex: 1,
        explanation: 'Xà-rông là trang phục truyền thống phổ biến nhất, được quấn khéo léo quanh hông.',
      },
      {
        id: 'c5_q2',
        question: 'Màu sắc chủ đạo trong trang phục cưới của người Khmer là màu gì?',
        options: ['Màu đen', 'Màu vàng rực rỡ', 'Màu trắng', 'Màu xanh lá'],
        correctIndex: 1,
        explanation: 'Màu vàng tượng trưng cho sự may mắn, quý phái và là màu sắc hoàng gia, tôn giáo trọng tâm.',
      },
      {
        id: 'c5_q3',
        question: 'Khăn rằn đặc trưng của người Khmer có tên gọi là gì?',
        options: ['Khăn K-ra-ma', 'Khăn Piêu', 'Khăn đóng', 'Khăn len'],
        correctIndex: 0,
        explanation: 'Khăn K-ra-ma (Krama) là vật dụng không thể thiếu, dùng để quấn đầu, quàng cổ hoặc làm thắt lưng.',
      },
      {
        id: 'c5_q4',
        question: 'Phụ nữ Khmer thường mặc loại áo nào khi đi lễ chùa?',
        options: ['Áo phông', 'Áo Tầm-vông', 'Áo yếm', 'Áo khoác'],
        correctIndex: 1,
        explanation: 'Áo Tầm-vông kết hợp với Xà-rông tạo nên vẻ đẹp kín đáo và trang nghiêm khi đi lễ Phật.',
      },
      {
        id: 'c5_q5',
        question: 'Trang phục Sampot Chang Kben thường được mặc trong dịp nào?',
        options: ['Đi làm ruộng', 'Các nghi lễ trang trọng, lễ cưới', 'Đi ngủ', 'Đi đá bóng'],
        correctIndex: 1,
        explanation: 'Sampot Chang Kben là cách quấn xà-rông cầu kỳ qua háng, thường dành cho các nghi lễ quan trọng.',
      },
    ],
  },
];

async function seedCultureQuizzes() {
  console.log('--- ĐANG NẠP DỮ LIỆU QUIZ VĂN HÓA ---');
  try {
    for (const quiz of cultureQuizzes) {
      const docRef = doc(db, 'quizzes', quiz.pagodaId);
      await setDoc(docRef, quiz, { merge: true });
      console.log(`✅ Đã nạp Quiz: ${quiz.pagodaName}`);
    }
    console.log('--- HOÀN THÀNH ---');
  } catch (error) {
    console.error('❌ Lỗi khi nạp dữ liệu:', error);
  }
}

seedCultureQuizzes();
