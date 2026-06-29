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
    foodName: 'Bánh Ống',
    foodNamekh: 'នំបំពង់',
    location: 'Trà Vinh, Sóc Trăng',
    color: '#10B981',
    accentColor: '#D1FAE5',
    questions: [
      {
        id: 'f3_q1',
        question: 'Bánh ống truyền thống của Khmer thường có màu gì?',
        options: ['Trắng', 'Màu xanh lá (lá dứa)', 'Đỏ tươi', 'Vàng sậm'],
        correctIndex: 1,
        explanation: 'Bánh ống thường có màu xanh của lá dứa, tạo nên hương vị thơm mát nhẹ nhàng đặc trưng.',
      },
      {
        id: 'f3_q2',
        question: 'Bánh ống được làm từ loại bột nào?',
        options: ['Bột mì', 'Bột gạo xay xát dập', 'Bột khoai mì', 'Bột năng'],
        correctIndex: 1,
        explanation: 'Bánh được làm từ bột gạo (hoặc bột nếp) xay, nhưng không quá mịn mà vẫn giữ được độ xốp.',
      },
      {
        id: 'f3_q3',
        question: 'Chiếc ống dùng để chưng cất và hấp bánh thường làm từ chất liệu gì?',
        options: ['Sắt', 'Nhôm', 'Tre nứa', 'Ống nhựa'],
        correctIndex: 2,
        explanation: 'Theo phương pháp truyền thống, bánh ống được hấp cách thủy trong các ống tre nhỏ dăng trên nồi đất.',
      },
      {
        id: 'f3_q4',
        question: 'Nguyên liệu đi kèm khi ăn bánh ống là gì?',
        options: ['Mè nướng và muối', 'Dừa nạo cắt sợi', 'Sữa đặc', 'Chà bông'],
        correctIndex: 1,
        explanation: 'Khi bánh chín lấy ra khỏi ống tre, người ta rắc dừa nạo và một ít đường lên trên thưởng thức thì rất ngon.',
      },
      {
        id: 'f3_q5',
        question: 'Cách làm chín bánh bánh lấy nguyên lý nào?',
        options: ['Nướng than củi', 'Chiên ngập dầu', 'Hấp (hơi nước sôi lên qua ống tre)', 'Luộc sùng sục'],
        correctIndex: 2,
        explanation: 'Bánh được làm chín bằng sức nóng của hơi nước bốc lên xuyên trong lòng ống tre, giúp bánh xốp chứ không bị nhão.',
      },
    ],
  },
  {
    foodId: 'food_4',
    foodName: 'Gỏi Đu Đủ (Bok L\'hong)',
    foodNamekh: 'បុកល្ហុង',
    location: 'Khu vực người Khmer sinh sống',
    color: '#06B6D4',
    accentColor: '#CFFAFE',
    questions: [
      {
        id: 'f4_q1',
        question: 'Chữ "Bok" trong ngôn ngữ Khmer mang ý nghĩa gì miêu tả cách làm món này?',
        options: ['Cắt chỉ', 'Trộn đều bằng tay', 'Giã, đâm trong cối', 'Chiên xào'],
        correctIndex: 2,
        explanation: 'Bok L\'hong có nghĩa là đu đủ đâm (giã). Khác với gỏi thông thường, loại gỏi này được "giã" trong cối chày gỗ để gia vị thấm quyện.',
      },
      {
        id: 'f4_q2',
        question: 'Thành phần nước cốt nào luôn có trong Bok L\'hong?',
        options: ['Nước dùng xương', 'Mắm ba khía', 'Nấm rơm', 'Dấm táo'],
        correctIndex: 1,
        explanation: 'Ba khía muối hoặc mắm ba khía chua chua cay cay mặn mặn là thành phần "phong ấn" linh hồn của món gỏi giã đu đủ này.',
      },
      {
        id: 'f4_q3',
        question: 'Ngoài đu đủ, người bán thường thêm loại hạt nào vào gỏi?',
        options: ['Đậu bắp', 'Đậu que sống', 'Hạt mác ca', 'Đậu ván'],
        correctIndex: 1,
        explanation: 'Đậu dưa/đậu que cắt nhỏ được giã chung góp phần tạo độ giòn ngọt mọng nước cùng quả đu đủ xanh.',
      },
      {
        id: 'f4_q4',
        question: 'Bok L\'hong là tiền thân/có họ hàng với món ăn nào nổi tiếng của Thái?',
        options: ['Tom Yum', 'Pad Thái', 'Som Tum', 'Cà ri xanh'],
        correctIndex: 2,
        explanation: 'Bok l\'hong có nguồn gốc từ nền văn hóa Khmer và rất tương đồng với món Som Tum (gỏi đu đủ giã) vang danh của Thái Lan.',
      },
      {
        id: 'f4_q5',
        question: 'Yếu tố vị giác nào sau đây nổi trội nhất của thức ăn này?',
        options: ['Béo ngậy', 'Cay nồng và chua dịu', 'Ngọt như chè', 'Nhạt thanh tao'],
        correctIndex: 1,
        explanation: 'Món gỏi đu đủ giã đặc trưng bởi vị ớt hiểm cay xé lưỡi kết hợp với vị chua chua của chanh, cà chua và mặn của mắm.',
      },
    ],
  },
  {
    foodId: 'food_5',
    foodName: 'Canh Somlo (Simlo)',
    foodNamekh: 'សម្លរ',
    location: 'Mekong Delta',
    color: '#8B5CF6',
    accentColor: '#EDE9FE',
    questions: [
      {
        id: 'f5_q1',
        question: 'Từ "Somlo" trong tiếng Khmer có hàm ý chỉ món gì?',
        options: ['Cơm chiên', 'Cháo', 'Các loại canh (Súp)', 'Bánh nướng'],
        correctIndex: 2,
        explanation: '"Somlo" (hay Simlo) là danh từ chung để chỉ các món nấu có nước (canh/súp/cà ri lỏng) rất thông dụng của người Khmer.',
      },
      {
        id: 'f5_q2',
        question: 'Canh "Somlo Korko" nổi tiếng của Khmer nấu từ gia vị gì?',
        options: ['Mắm Prohoc (Bò hóc)', 'Ngũ vị hương', 'Sa tế', 'Sốt mayonnaise'],
        correctIndex: 0,
        explanation: 'Tương tự bún nước lèo, rất nhiều loại bát canh (somlo) không thể thiếu mắm bò hóc làm chất nền tăng hương hậu.',
      },
      {
        id: 'f5_q3',
        question: 'Bát canh Somlo truyền thống thường có nguyên liệu độn chính là?',
        options: ['Giá đỗ', 'Hỗn hợp trái sake, đu đủ, chuối xanh', 'Thịt bò xắt khoanh', 'Mì vắt trứng'],
        correctIndex: 1,
        explanation: 'Somlo Korko (Canh thập cẩm thập loại) dùng thân dứa, sake, chuối xanh nấu mềm kèm nước cốt mắm tạo ra độ đặc sánh tự nhiên.',
      },
      {
        id: 'f5_q4',
        question: 'Lá "Mrum" thường thả cùng nồi canh somlo là loại lá gì ở VN?',
        options: ['Lá chùm ngây', 'Lá giang', 'Lá sâm', 'Lá é'],
        correctIndex: 0,
        explanation: 'Mrum chính là lá chùm ngây - rất giàu dinh dưỡng và phổ cập trong mâm cơm dân tộc vùng Đồng bằng.',
      },
      {
        id: 'f5_q5',
        question: 'Canh chua Khmer với trái me non được gọi là gì?',
        options: ['Somlo Machu', 'Somlo Ktis', 'Pad Kra Pao', 'Lort Cha'],
        correctIndex: 0,
        explanation: '"Somlo Machu" là món canh mắm chua thanh rất tốn cơm, hương vị chua được lấy từ me đun nhuyễn xen kẽ rau muống và chả heo.',
      },
    ],
  }
];

async function seed() {
  console.log('--- ĐANG TẠO TOÀN BỘ CSDL QUIZZES CHO FOOD (5 MÓN) ---');
  try {
    for (const quiz of foodQuizzes) {
      const docRef = doc(db, 'quizzes', quiz.foodId);
      await setDoc(docRef, quiz, { merge: true });
      console.log(`✅ Đã thêm Food Quiz: ${quiz.foodName}`);
    }
    console.log('--- HOÀN THÀNH ---');
    process.exit(0);
  } catch (error) {
    console.error('❌ Lỗi:', error);
    process.exit(1);
  }
}

seed();
