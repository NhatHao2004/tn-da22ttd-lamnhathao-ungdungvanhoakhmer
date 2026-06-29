import { doc, setDoc } from 'firebase/firestore';
import { db } from './utils/firebaseConfig';

const sampleDestinations = [
  // --- NGÔI CHÙA KHMER ---
  {
    id: 'pagoda_1',
    category: 'Chùa',
    name: 'Chùa Âng',
    location: 'Phường 8, TP. Trà Vinh',
    imageKey: 'chua-ang',
    imageUrl: 'https://thamhiemmekong.com/wp-content/uploads/2020/03/chua-ang-1.jpg',
    description: 'Ngôi chùa cổ nhất của người Khmer tại Trà Vinh với kiến trúc tuyệt đẹp.',
    contentBlocks: [
      { type: 'text', value: 'Chùa Âng (tên đầy đủ là Angkorajaborey) là ngôi chùa cổ kính nhất trong hệ thống chùa Khmer ở Trà Vinh.' },
      { type: 'image', value: 'chua-ang' }
    ]
  },
  {
    id: 'pagoda_2',
    category: 'Chùa',
    name: 'Chùa Hang',
    location: 'TT. Châu Thành, Trà Vinh',
    imageKey: 'chua-hang',
    imageUrl: 'https://mia.vn/media/uploads/blog-du-lich/doi-net-1706424557.jpg',
    description: 'Nổi tiếng với cổng chùa giống như một cái hang độc đáo.',
    contentBlocks: [
      { type: 'text', value: 'Chùa Hang (Kompong Chray) nổi tiếng với những tác phẩm điêu khắc gỗ tinh xảo do các sư thầy thực hiện.' }
    ]
  },
  {
    id: 'pagoda_3',
    category: 'Chùa',
    name: 'Chùa Kampong',
    location: 'Phường 1, TP. Trà Vinh',
    imageKey: 'chua-kampong',
    imageUrl: 'https://vovworld.vn/Uploaded/vovworld/2022_10_26/chua_ong_met_2.jpg',
    description: 'Ngôi chùa tọa lạc ngay trung tâm thành phố với kiến trúc đặc trưng.',
    contentBlocks: [{ type: 'text', value: 'Chùa Kampong là điểm đến tâm linh quan trọng của người dân địa phương.' }]
  },
  {
    id: 'pagoda_4',
    category: 'Chùa',
    name: 'Chùa Sleng cũ',
    location: 'Trà Vinh',
    imageKey: 'chua-sleng-cu',
    imageUrl: 'https://image.vietnam.vn/wp-content/uploads/2023/12/3-13.jpg',
    description: 'Ngôi chùa mang vẻ đẹp cổ kính theo thời gian.',
    contentBlocks: [{ type: 'text', value: 'Chùa Sleng cũ lưu giữ nhiều giá trị văn hóa và tôn giáo lâu đời.' }]
  },
  {
    id: 'pagoda_5',
    category: 'Chùa',
    name: 'Chùa Veluvana',
    location: 'Trà Vinh',
    imageKey: 'chua-veluvana',
    imageUrl: 'https://static.vinwonders.com/production/chua-som-rong-1.jpg',
    description: 'Ngôi chùa với không gian thanh tịnh và kiến trúc rực rỡ.',
    contentBlocks: [{ type: 'text', value: 'Chùa Veluvana là nơi tổ chức nhiều hoạt động lễ hội quan trọng.' }]
  },

  // --- VĂN HÓA KHMER ---
  {
    id: 'culture_1',
    category: 'Văn hóa',
    name: 'Văn hóa chùa chiền (Phật giáo Nam tông)',
    location: 'Nam Bộ',
    imageKey: 'default',
    imageUrl: 'https://vovworld.vn/Uploaded/vovworld/2022_05_11/279841804_5250499691655078_774697920701830172_n.jpg',
    description: 'Chùa là trung tâm sinh hoạt văn hóa, giáo dục của cộng đồng người Khmer.',
    contentBlocks: [{ type: 'text', value: 'Phật giáo Nam tông đóng vai trò cốt lõi trong đời sống tinh thần của người Khmer.' }]
  },
  {
    id: 'culture_2',
    category: 'Văn hóa',
    name: 'Lễ hội truyền thống',
    location: 'Nam Bộ',
    imageKey: 'oc-om-boc',
    imageUrl: 'https://baochinhphu.vn/Uploaded/dangthanhmet/2023_11_25/le-hoi-oc-om-boc-dua-ghe-ngo-soc-trang-lan-thu-vi-nam-2023.jpg',
    description: 'Các lễ hội như Chôl Chnăm Thmây, Sen Đôn-ta và Oóc Om Bóc.',
    contentBlocks: [{ type: 'text', value: 'Lễ hội là dịp để cộng đồng tụ họp, vui chơi và thực hiện các nghi thức tín ngưỡng.' }]
  },
  {
    id: 'culture_3',
    category: 'Văn hóa',
    name: 'Nghệ thuật múa và âm nhạc dân gian',
    location: 'Nam Bộ',
    imageKey: 'default',
    imageUrl: 'https://vovworld.vn/Uploaded/haxuandiet/2018_12_27/2_XGJS.JPG',
    description: 'Múa Răm-vông, nghệ thuật Dù-kê, Rô-băm và dàn nhạc Ngũ âm.',
    contentBlocks: [{ type: 'text', value: 'Nghệ thuật trình diễn dân gian Khmer mang tính cộng đồng cao và rực rỡ sắc màu.' }]
  },
  {
    id: 'culture_4',
    category: 'Văn hóa',
    name: 'Ngôn ngữ và chữ viết Khmer',
    location: 'Nam Bộ',
    imageKey: 'default',
    imageUrl: 'https://baotravinh.vn/image/f_0/2023/06/18/31201_0618-van-hoa-day-chu-khmer.jpg',
    description: 'Hệ thống chữ viết cổ truyền được giảng dạy trong các ngôi chìa.',
    contentBlocks: [{ type: 'text', value: 'Chữ viết Khmer là di sản quý báu, biểu tượng cho sức sống bền bỉ của dân tộc.' }]
  },
  {
    id: 'culture_5',
    category: 'Văn hóa',
    name: 'Trang phục truyền thống',
    location: 'Nam Bộ',
    imageKey: 'default',
    imageUrl: 'https://vcdn-dulich.vnecdn.net/2022/04/14/tet-khmer-vne-14-1649925203.jpg',
    description: 'Xà-rông và các trang phục cầu kỳ trong lễ cưới, lễ hội.',
    contentBlocks: [{ type: 'text', value: 'Trang phục truyền thống Khmer thể hiện sự tinh tế trong cách kết hợp màu sắc và hoa văn.' }]
  },

  // --- ẨM THỰC KHMER ---
  {
    id: 'food_1',
    category: 'Ẩm thực',
    name: 'Bún nước lèo',
    location: 'Trà Vinh, Sóc Trăng',
    imageKey: 'bun-nuoc-leo',
    imageUrl: 'https://monngonbamien.org/wp-content/uploads/2019/12/bun-nuoc-leo-tra-vinh.jpg',
    description: 'Đặc sản nổi tiếng với hương vị mắm bò hóc đậm đà.',
    contentBlocks: [{ type: 'text', value: 'Bún nước lèo là sự kết hợp tuyệt vời của tôm, thịt heo quay và nước dùng thơm mùi ngải bún.' }]
  },
  {
    id: 'food_2',
    category: 'Ẩm thực',
    name: 'Cốm dẹp',
    location: 'Sóc Trăng',
    imageKey: 'default',
    imageUrl: 'https://vcdn1-dulich.vnecdn.net/2022/11/14/com-dep-1-1668412678.jpg',
    description: 'Lúa nếp giã dẹt, món ăn gắn liền với lễ cúng Trăng Oóc Om Bóc.',
    contentBlocks: [{ type: 'text', value: 'Cốm dẹp trộn với dừa nạo và đường cát là món ngon khó cưỡng.' }]
  },
  {
    id: 'food_3',
    category: 'Ẩm thực',
    name: 'Mắm bò hóc (Prahok)',
    location: 'Nam Bộ',
    imageKey: 'default',
    imageUrl: 'https://images2.thanhnien.vn/528068263637045248/2023/4/11/trang-mam-bo-hoc-tra-vinh-1-16812239462221376856009.jpg',
    description: 'Gia vị linh hồn trong hầu hết các món ăn của người Khmer.',
    contentBlocks: [{ type: 'text', value: 'Mắm bò hóc được làm từ các loại cá đồng, qua quá trình ủ công phu để tạo mùi vị đặc thù.' }]
  },
  {
    id: 'food_4',
    category: 'Ẩm thực',
    name: 'Canh xiêm lo',
    location: 'Nam Bộ',
    imageKey: 'default',
    imageUrl: 'https://image.vietnam.vn/wp-content/uploads/2024/09/Xiêm-lo-Xà-mày.jpg',
    description: 'Món canh giải nhiệt với nguyên liệu từ các loại rau củ vườn nhà.',
    contentBlocks: [{ type: 'text', value: 'Canh xiêm lo thường được nấu với cá và các loại rau như bắp chuối, rau lang.' }]
  },
  {
    id: 'food_5',
    category: 'Ẩm thực',
    name: 'Bánh tét Khmer',
    location: 'Trà Vinh',
    imageKey: 'default',
    imageUrl: 'https://baotravinh.vn/image/f_0/2022/04/01/22421_image004.jpg',
    description: 'Bánh tét với nhân nếp dẻo thơm, nhân đậu và mỡ heo.',
    contentBlocks: [{ type: 'text', value: 'Bánh tét là món bánh không thể thiếu trong các dịp lễ Tết của đồng bào Khmer.' }]
  }
];

async function seedData() {
  console.log('--- ĐANG NẠP TOÀN BỘ DỮ LIỆU MẪU MỚI ---');
  try {
    for (const item of sampleDestinations) {
      const docRef = doc(db, 'destinations', item.id);
      await setDoc(docRef, item, { merge: true });
      console.log(`✅ Đã nạp: [${item.category}] ${item.name}`);
    }
    console.log('--- HOÀN THÀNH ---');
  } catch (error) {
    console.error('❌ Lỗi khi nạp dữ liệu:', error);
  }
}

seedData();
