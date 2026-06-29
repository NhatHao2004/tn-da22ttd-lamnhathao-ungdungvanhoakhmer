const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyDInHeTU4IWo4kVVsho62WcK6Vg9f83vfg",
  authDomain: "khmergo-ba0b0.firebaseapp.com",
  projectId: "khmergo-ba0b0",
  storageBucket: "khmergo-ba0b0.firebasestorage.app",
  messagingSenderId: "563133852511",
  appId: "1:563133852511:web:f5b7f2aebeab097a3064ea",
  measurementId: "G-LTBGS11WXY"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const foodQuizzes = [
  {
    foodId: 'food_1',
    foodName: 'Bún Nước Lèo',
    foodNamekh: 'នំបញ្ចុក',
    location: 'Sóc Trăng, Trà Vinh',
    color: '#EAB308',
    accentColor: '#FEF9C3',
    questions: [
      {
        id: 'f1_q1',
        question: 'Nguyên liệu linh hồn làm nên hương vị đặc trưng của Bún Nước Lèo Khmer là gì?',
        options: ['Tuyệt mật', 'Mắm Bò Hóc (Prohoc)', 'Mắm tôm', 'Nước cốt dừa'],
        correctIndex: 1,
        explanation: 'Mắm bò hóc (Prohoc) là nguyên liệu quan trọng nhất, mang lại hương vị đậm đà không thể thiếu của món ăn này.',
      },
      {
        id: 'f1_q2',
        question: 'Loại cá nào thường được dùng để nấu nước lèo chuẩn vị Khmer?',
        options: ['Cá lóc đồng', 'Cá hồi', 'Cá chép', 'Cá tra'],
        correctIndex: 0,
        explanation: 'Cá lóc đồng sau khi luộc sẽ được gỡ thịt, giã tơi để hòa quyện vào nước dùng ngọt thanh.',
      },
      {
        id: 'f1_q3',
        question: 'Đâu là loại cây gia vị bắt buộc phải có trong nồi nước lèo?',
        options: ['Ngò rí', 'Hành lá', 'Ngải bún', 'Sả băm'],
        correctIndex: 2,
        explanation: 'Ngải bún là loại củ gia vị đặc hiệu, có tác dụng khử mùi tanh của cá và mắm, tạo mùi thơm dễ chịu đặc trưng.',
      },
      {
        id: 'f1_q4',
        question: 'Thịt heo quay thường được dùng ăn kèm mang ý nghĩa gì?',
        options: ['Tăng vị béo ngậy', 'Trang trí cho đẹp', 'Sự giao thoa văn hóa ẩm thực', 'Do nhà Phật quy định'],
        correctIndex: 2,
        explanation: 'Thịt heo quay (người Hoa) kết hợp với mắm Prohoc (Khmer) và bún (Việt) tạo nên sự giao thoa văn hóa đa dân tộc ở miền Tây.',
      },
      {
        id: 'f1_q5',
        question: 'Loại rau sống nào thường ăn kèm với Bún Nước Lèo Khmer?',
        options: ['Rau muống bào, bắp chuối', 'Rau diếp cá', 'Xà lách', 'Tía tô'],
        correctIndex: 0,
        explanation: 'Rau muống bào, cọng bông súng, bắp chuối, giá đỗ là các loại rau giúp cân bằng hoàn hảo độ mặn ngọt của món bún.',
      },
    ],
  },
  {
    foodId: 'food_2',
    foodName: 'Cốm Dẹp',
    foodNamekh: 'អំបុក (Om Bóc)',
    location: 'Toàn vùng Tây Nam Bộ',
    color: '#84CC16',
    accentColor: '#ECFCCB',
    questions: [
      {
        id: 'f2_q1',
        question: 'Cốm dẹp (Om bóc) là lễ vật không thể thiếu trong lễ hội nào?',
        options: ['Chol Chnam Thmay', 'Sen Dolta', 'Oóc Om Bóc', 'Kathina'],
        correctIndex: 2,
        explanation: 'Oóc Om Bóc còn có nghĩa là Lễ cúng Trăng, và Om Bóc (Cốm dẹp) là lễ vật trung tâm dâng Thần Mặt Trăng.',
      },
      {
        id: 'f2_q2',
        question: 'Gạo dùng để làm cốm dẹp phải đạt tiêu chuẩn gì?',
        options: ['Gạo trắng siêu mẩy', 'Lúa nếp non vừa gặt', 'Gạo lứt', 'Gạo nếp nương già'],
        correctIndex: 1,
        explanation: 'Lúa nếp non, hạt còn sữa khi rang và giã sẽ tạo ra mẻ cốm dẹp dẻo, thơm và xanh dịu.',
      },
      {
        id: 'f2_q3',
        question: 'Trước khi ăn cốm dẹp, người Khmer thường trộn cốm với nguyên liệu gì?',
        options: ['Dầu chuối, đậu xanh', 'Dừa nạo, đường', 'Đậu phộng rang', 'Mật ong'],
        correctIndex: 1,
        explanation: 'Cốm dẹp thường được trộn với dừa nạo nạo sợi và đường sữa, để khoảng 15 phút cho ngấm mềm.',
      },
      {
        id: 'f2_q4',
        question: 'Công đoạn nào cần sự thao tác nhanh nhất trong quy trình làm Cốm Dẹp?',
        options: ['Rang nếp', 'Trộn đường', 'Giã nếp (Quết cốm)', 'Sàng sảy'],
        correctIndex: 2,
        explanation: 'Giã nếp (quết cốm) đòi hỏi sự phối hợp nhịp nhàng giữa hai người khi lúa nếp rang còn đang nóng hổi.',
      },
      {
        id: 'f2_q5',
        question: 'Nghi thức đút cốm dẹp trong đêm cúng Trăng mang ý nghĩa gì?',
        options: ['Đoạt giải thưởng', 'Cầu ước tài lộc và ăn no', 'Nuôi trẻ ăn sâu', 'Ban phước lành tương lai'],
        correctIndex: 3,
        explanation: 'Người lớn đút nắm cốm cho trẻ con và hỏi ước nguyện với mong muốn mang lại sự sung túc và điềm lành cho năm mới.',
      },
    ],
  },
  {
    foodId: 'food_3',
    foodName: 'Mắm bò hóc',
    foodNamekh: 'ប្រហុក (Prahok)',
    location: 'Nam Bộ',
    color: '#10B981',
    accentColor: '#D1FAE5',
    questions: [
      {
        id: 'f3_q1',
        question: 'Mắm bò hóc (Prahok) được ví như hương vị gì trong ẩm thực Khmer?',
        options: ['Gia vị vô danh', 'Thứ bỏ đi', 'Linh hồn của ẩm thực Khmer', 'Đồ ăn xa xỉ'],
        correctIndex: 2,
        explanation: 'Prahok được xem là linh hồn cốt lõi của ẩm thực Khmer, hòa quyện trong hầu hết các món ăn đặc trưng.'
      },
      {
        id: 'f3_q2',
        question: 'Nguyên liệu chính làm nên mắm bò hóc là gì?',
        options: ['Cá biển', 'Tép mòng', 'Cá nước ngọt nhỏ (như cá lóc, cá trê, cá sặc)', 'Mực'],
        correctIndex: 2,
        explanation: 'Mắm bò hóc chủ yếu làm từ cá đồng vụn, cá nước ngọt như sặc, lóc, được ướp muối kỹ càng.'
      },
      {
        id: 'f3_q3',
        question: 'Thời gian ủ mắm bò hóc thường kéo dài bao lâu?',
        options: ['Vài ngày', '2 đến 3 tuần', 'Từ vài tháng đến cả năm', 'Vài tiếng'],
        correctIndex: 2,
        explanation: 'Thời gian ủ từ sáu tháng đến một năm mới đảm bảo thịt cá nát và thấm ngấm hoàn toàn vị đậm đà mặn mòi.'
      },
      {
        id: 'f3_q4',
        question: 'Món ăn nào bắt buộc dùng Prahok làm nền nước dùng?',
        options: ['Bún nước lèo và Canh xiêm lo', 'Hủ tiếu Nam Vang', 'Cơm tấm', 'Bánh hỏi'],
        correctIndex: 0,
        explanation: 'Bún nước lèo và hầu hết loại canh Somlo (như Xiêm lo) không có rpra-hok thì coi như mất gốc vị Khmer.'
      },
      {
        id: 'f3_q5',
        question: 'Vì sao người Khmer xưa sáng tạo ra mắm bò hóc?',
        options: ['Thích ăn mặn', 'Nguồn tôm cá mùa nổi dồi dào, cần dự trữ', 'Bán kiếm tiền', 'Tôn giáo cấm ăn thịt'],
        correctIndex: 1,
        explanation: 'Nhờ vựa cá hồ Tonle Sap và Mekong mùa nước nổi dồi dào, kĩ thuật làm mắm là cách dự trữ và bảo quản nguồn protien hoàn hảo nhất.'
      }
    ]
  },
  {
    foodId: 'food_4',
    foodName: 'Canh xiêm lo',
    foodNamekh: 'សម្លរ',
    location: 'Nam Bộ',
    color: '#06B6D4',
    accentColor: '#CFFAFE',
    questions: [
      {
        id: 'f4_q1',
        question: 'Từ "Somlo / Xiêm lo" trong tiếng Khmer thường dùng để chỉ?',
        options: ['Thịt nướng', 'Các loại canh (súp)', 'Món xào', 'Gỏi'],
        correctIndex: 1,
        explanation: 'Somlo/Xiêm lo là từ khái quát dùng để mô tả tất thảy các món có dạng súp lỏng nấu với rau cá.'
      },
      {
        id: 'f4_q2',
        question: 'Canh xiêm lo hòa quyện bởi?',
        options: ['Thịt bò nấm', 'Cá đồng, các loại rau và mắm Prohoc', 'Thịt viên', 'Hải sản đỏ'],
        correctIndex: 1,
        explanation: 'Nổi bật bởi nước cốt cá đồng, rau vườn và không thể thiếu độ nồng nhẹ mặn mà của Prohoc.'
      },
      {
        id: 'f4_q3',
        question: 'Gia vị nào đem giã chung tạo độ the trong bát canh?',
        options: ['Tiêu hạt', 'Ngải bún, sả, nghệ, ớt', 'Ớt chuông đỏ', 'Gừng tươi'],
        correctIndex: 1,
        explanation: 'Hỗn hợp nền sả, nghệ sắc vàng ươm và củ ngải bún sẽ lấn át sự nặng mùi của tinh mắm.'
      },
      {
        id: 'f4_q4',
        question: 'Canh Xiêm lo có nét giao thoa nhan sắc với loại canh nào của người Kinh?',
        options: ['Canh chua', 'Canh khổ qua', 'Canh Kiểm (Tuy canh xiêm lo mặn cá hơn)', 'Nước lèo'],
        correctIndex: 2,
        explanation: 'Nét thập cẩm rau củ và cấu trúc hơi sánh giống với Canh Kiểm cốt dừa của người Kinh miền Tây.'
      },
      {
        id: 'f4_q5',
        question: 'Cách ăn hoàn hảo nhất của Canh Xiêm lo là ăn với?',
        options: ['Bành mì nướng', 'Cơm trắng', 'Khoai lang luộc', 'Bánh đa'],
        correctIndex: 1,
        explanation: 'Mọi món canh mặn đồng quê Nam Bộ đều phát huy tinh túy tuyệt trần khi lùa nóng cùng bát cơm trắng dẻo.'
      }
    ]
  },
  {
    foodId: 'food_5',
    foodName: 'Bánh tét Khmer',
    foodNamekh: 'នំអន្សម (Num Ansorm)',
    location: 'Trà Vinh',
    color: '#8B5CF6',
    accentColor: '#EDE9FE',
    questions: [
      {
        id: 'f5_q1',
        question: 'Tên Khmer của món Bánh Tét hay gọi là gì?',
        options: ['Num Ankrong', 'Num Ansorm', 'Num Bok', 'Num Krok'],
        correctIndex: 1,
        explanation: 'Num Ansorm (bánh lá) chính là tên gọi phổ biến cho Bánh tét - biểu tượng của nông nghiệp và sinh sôi.'
      },
      {
        id: 'f5_q2',
        question: 'Bánh tét truyền thống Trà Cuôn (Trà Vinh) có điểm độc lạ gì về màu sắc?',
        options: ['Chỉ màu đỏ', 'Gạo nếp được tạo màu ngũ sắc từ bồ ngót tươi, lá cẩm và gấc', 'Gạo lứt đen', 'Trắng xóa'],
        correctIndex: 1,
        explanation: 'Đòn bánh không chỉ thơm ngon mà gạo nếp được tẩm màu tự nhiên tạo thành nhiều khoang rực rỡ khi cắt lát.'
      },
      {
        id: 'f5_q3',
        question: 'Nhân bánh tét Khmer mặn khác với bánh chưng miền Bắc vì thường có?',
        options: ['Nhân nấm rơm', 'Sơn hào hải vị', 'Bổ sung trứng muối mằn mặn và tôm khô', 'Chỉ cắm lá hành'],
        correctIndex: 2,
        explanation: 'Nhân bánh với hạt đậu xanh béo, mỡ lợn hòa với nước cốt dừa dẻo hầm và đặc biệt có thêm hàng lòng đỏ trứng muối.'
      },
      {
        id: 'f5_q4',
        question: 'Bánh Ansorm thường luôn xuất hiện trọng đại nhất dịp nào?',
        options: ['Chỉ vào Rằm', 'Lễ Tết Chol Chnam Thmay / Sen Dolta / Lễ cưới', 'Đi câu', 'Ngày thường ở chợ'],
        correctIndex: 1,
        explanation: 'Bánh Ansorm là sính lễ và món thết tiên tổ nhất định phải gói dâng lên vào những ngày lớn của dân tộc.'
      },
      {
        id: 'f5_q5',
        question: 'Bánh Tét được quấn bọc bên ngoài bởi loại lá nào?',
        options: ['Lá tre', 'Lá dong', 'Lá chuối già hơ lửa mềm', 'Lá buông'],
        correctIndex: 2,
        explanation: 'Khác với lá dong phía Bắc, phương Nam chủ đạo quấn bánh tét cực chặt bằng nhiều tầng lá chuối héo dảo cho thơm.'
      }
    ]
  }
];

async function seed() {
  console.log('--- ĐANG ĐỒNG BỘ DỮ LIỆU CHUẨN CÚ PHÁP CHO FOOD QUIZZES ---');
  try {
    for (const quiz of foodQuizzes) {
      const docRef = doc(db, 'quizzes', quiz.foodId);
      await setDoc(docRef, quiz, { merge: true });
      console.log(`✅ Đã đồng bộ: ${quiz.foodName}`);
    }
    console.log('--- HOÀN THÀNH ---');
    process.exit(0);
  } catch (error) {
    console.error('❌ Lỗi:', error);
    process.exit(1);
  }
}

seed();
