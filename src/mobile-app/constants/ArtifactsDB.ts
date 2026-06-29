export interface Artifact {
  id: string;
  name: string;
  description: string;
  features: string;
  imageUrl?: string;
}

export const ARTIFACTS_DB: Artifact[] = [
  {
    id: "1",
    name: "Kinh lá buông",
    description:
      "Bộ kinh cổ khắc chữ Khmer trên lá buông, lưu giữ giáo lý Phật giáo Nam tông Khmer.",
    features:
      "Kinh lá buông được chế tác từ lá cây buông có hình dài, bản rộng và màu vàng nâu hoặc nâu sẫm theo thời gian. Bề mặt lá được xử lý bằng cách phơi nắng, phơi sương và nhúng nước sôi để tăng độ bền. Chữ trên kinh không viết bằng mực mà được khắc trực tiếp bằng bút kim loại nhọn gọi là Đek-cha, sau đó phủ hỗn hợp than và dầu để hiện rõ nét chữ màu đen. Nội dung thường viết bằng chữ Khmer cổ hoặc tiếng Pali, bao gồm kinh Phật, giáo lý, truyện dân gian, lịch pháp và tri thức dân gian Khmer. Mỗi lá kinh có dạng hình chữ nhật dài, được đục lỗ ở giữa hoặc hai đầu để xâu dây thành từng bộ và kẹp giữa hai tấm gỗ bảo vệ. Nét chữ nhỏ, đều, thẳng hàng thể hiện sự tỉ mỉ, kiên nhẫn và trình độ thủ công tinh xảo của người viết. Kinh lá buông thường được lưu giữ trong các chùa Khmer Nam Bộ và được xem là báu vật tâm linh của cộng đồng Khmer.",

  },

  {
    id: "2",
    name: "Bình gốm Óc Eo",
    description:
      "Hiện vật gốm cổ thuộc văn hóa Óc Eo, dùng trong sinh hoạt và nghi lễ tôn giáo.",
    features:
      "Bình gốm Óc Eo có niên đại khoảng thế kỷ I-VII, được làm từ đất nung mịn với xương gốm chắc và màu sắc đặc trưng như đỏ nâu, nâu hồng hoặc xám đen. Bình thường có thân phình tròn, cổ cao thon nhỏ, miệng loe rộng và đôi khi có vòi kiểu Kendi dùng trong nghi lễ tôn giáo cổ. Bề mặt gốm được làm nhẵn bằng kỹ thuật xoa thủ công và thường trang trí hoa văn khắc vạch, sóng nước, tam giác hoặc đường tròn đồng tâm. Gốm thường không phủ men nhưng mang màu tự nhiên đậm chất cổ xưa. Một số hiện vật còn có dấu vết tô màu đỏ hoặc đen. Các bình gốm thường được tìm thấy tại khu di tích đền tháp, nơi cư trú và khu vực tín ngưỡng cổ ở Nam Bộ, phản ánh đời sống sinh hoạt, tín ngưỡng và sự giao thoa văn hóa của cư dân Óc Eo.",

  },

  {
    id: "3",
    name: "Tượng Apsara",
    description:
      "Tượng vũ nữ thiên giới trong nghệ thuật Khmer cổ và văn minh Angkor.",
    features:
      "Tượng Apsara thể hiện hình ảnh tiên nữ thiên giới trong văn hóa Khmer và Ấn Độ giáo với vẻ đẹp thanh thoát, dáng múa uyển chuyển và gương mặt hiền hòa. Nhân vật thường mặc trang phục sampot ôm sát cơ thể, đeo nhiều trang sức tinh xảo như vòng cổ, vòng tay và thắt lưng vàng. Điểm nhận biết nổi bật nhất là phần mũ đội đầu cao nhiều chóp mang phong cách Angkor cổ. Tượng thường được chạm khắc trên đá sa thạch hoặc phù điêu tại các đền đài Khmer cổ như Angkor Wat. Các động tác tay mềm mại, ngón tay cong uyển chuyển cùng nụ cười nhẹ tạo cảm giác linh thiêng và thanh cao. Trong nghệ thuật Khmer, Apsara không chỉ tượng trưng cho vẻ đẹp nữ tính mà còn đại diện cho nghệ thuật múa cổ truyền, đời sống tâm linh và nền văn minh Angkor huy hoàng.",

  },

  {
    id: "4",
    name: "Mặt nạ múa Rô-băm",
    description:
      "Mặt nạ truyền thống dùng trong sân khấu múa Rô-băm và nghệ thuật Khmer Nam Bộ.",
    features:
      "Mặt nạ múa Rô-băm có màu sắc rực rỡ, hoa văn cầu kỳ và hình dáng mang đậm phong cách nghệ thuật Khmer cổ. Mặt nạ thường được tạo hình thành các nhân vật như chằn, thần linh, khỉ thần hoặc anh hùng sử thi với biểu cảm dữ tợn hoặc hiền hòa tùy vai diễn. Các chi tiết như mắt lớn, răng nanh, mũi cao và họa tiết xoắn được vẽ nổi bật nhằm thể hiện tính cách nhân vật. Nhiều mặt nạ còn được gắn kim sa, hạt cườm và trang trí màu vàng óng tượng trưng cho quyền lực và sự linh thiêng. Sản phẩm được làm thủ công qua nhiều công đoạn như tạo khuôn, dán giấy, phơi khô, mài nhẵn, sơn màu và vẽ hoa văn tinh xảo. Đây không chỉ là đạo cụ sân khấu rô băm, dù kê mà còn là biểu tượng văn hóa phản ánh tín ngưỡng, nghệ thuật và bản sắc của đồng bào Khmer Nam Bộ.",
  },

  {
    id: "5",
    name: "Bộ nhạc Ngũ Âm",
    description:
      "Dàn nhạc truyền thống đặc trưng của đồng bào Khmer Nam Bộ, sử dụng trong các lễ hội, nghi thức tôn giáo và hoạt động văn hóa cộng đồng.",
    features:
      "Hình dáng: Gồm nhiều nhạc cụ khác nhau như đàn Rô-neat, trống Skor Thom, trống Samphor, kèn Sralai, chập chõa Chhing và các loại cồng chiêng, được sắp xếp thành một dàn nhạc hoàn chỉnh. Màu sắc: Chủ yếu là màu nâu của gỗ, vàng đồng của cồng chiêng, màu đen hoặc nâu sẫm của da trống và màu sắc tự nhiên của các vật liệu thủ công truyền thống. Hoa văn: Nhiều nhạc cụ được chạm khắc hoa văn Khmer truyền thống như họa tiết lá cách điệu, hoa sen, hình thần thoại và các đường nét trang trí tinh xảo mang đậm bản sắc văn hóa Khmer. Chất liệu: Gỗ, đồng, tre, da động vật và các hợp kim kim loại. Bộ nhạc Ngũ Âm tạo nên âm thanh hài hòa, vừa mạnh mẽ vừa uyển chuyển, là biểu tượng tiêu biểu của nghệ thuật âm nhạc truyền thống Khmer Nam Bộ và thường xuất hiện trong các lễ hội, nghi lễ Phật giáo Nam tông Khmer cũng như các sự kiện văn hóa quan trọng của cộng đồng."
  },

  {
    id: "6",
    name: "Ghe Ngo truyền thống",
    description:
      "Loại thuyền đua truyền thống của đồng bào Khmer Nam Bộ, gắn liền với Lễ hội Oóc Om Bóc và văn hóa sông nước.",
    features:
      "Hình dáng: Thân thuyền dài và hẹp, hai đầu cong vút, chiều dài thường từ 20 đến 30 mét, có thể chở hàng chục tay chèo cùng lúc. Màu sắc: Sơn nhiều màu sắc rực rỡ như đỏ, vàng, xanh và trắng, tạo nên vẻ nổi bật trên sông nước. Hoa văn: Trang trí hình rồng, rắn thần Naga, hoa sen, họa tiết Khmer truyền thống và các biểu tượng tâm linh mang ý nghĩa may mắn, sức mạnh và sự bảo hộ. Chất liệu: Gỗ nguyên khối hoặc gỗ ghép chắc chắn, được gia công thủ công và sơn phủ bảo vệ. Ghe Ngo không chỉ là phương tiện thi đấu trong các cuộc đua ghe truyền thống mà còn là biểu tượng văn hóa đặc sắc của người Khmer Nam Bộ, thể hiện tinh thần đoàn kết, sức mạnh tập thể và đời sống gắn bó với sông nước của cộng đồng."
  },

  {
    id: "7",
    name: "Khung cửi dệt khăn Krama",
    description:
      "Dụng cụ dệt thủ công truyền thống dùng để tạo ra những chiếc khăn Krama đặc trưng của người Khmer, thể hiện sự khéo léo và nét đẹp văn hóa dân tộc.",
    features:
      "Hình dáng: Khung cửi có dạng hình chữ nhật, gồm hệ thống thanh ngang, trục cuốn sợi, bàn đạp và bộ phận dệt được lắp ráp thành một kết cấu chắc chắn. Màu sắc: Chủ yếu mang màu nâu vàng tự nhiên của gỗ, kết hợp với các sợi chỉ nhiều màu sắc như đỏ, trắng, xanh, đen hoặc vàng. Hoa văn: Tạo nên các họa tiết ô vuông, caro, đường kẻ sọc hoặc hoa văn truyền thống Khmer đặc trưng trên khăn Krama. Chất liệu: Gỗ, tre, dây buộc, sợi bông hoặc sợi tổng hợp dùng trong quá trình dệt. Khung cửi dệt khăn Krama là công cụ lao động truyền thống quan trọng của người Khmer, góp phần lưu giữ nghề dệt thủ công lâu đời và tạo ra những sản phẩm mang giá trị văn hóa, thẩm mỹ và ứng dụng cao trong đời sống hằng ngày."
  },

  {
    id: "8",
    name: "Trang phục truyền thống Sampot và Av Pak",
    description:
      "Trang phục truyền thống của người Khmer, thường được sử dụng trong các lễ hội, nghi lễ tôn giáo, đám cưới và các sự kiện văn hóa quan trọng.",
    features:
      "Hình dáng: Sampot là loại váy hoặc khố quấn quanh thân với nhiều kiểu xếp nếp khác nhau, trong khi Av Pak là áo dài tay ôm sát cơ thể, cổ tròn hoặc cổ đứng, tạo nên vẻ thanh lịch và trang nhã. Màu sắc: Thường sử dụng các gam màu nổi bật như vàng, đỏ, tím, xanh ngọc, trắng hoặc hồng, kết hợp cùng các chi tiết ánh kim sang trọng. Hoa văn: Trang trí họa tiết Khmer truyền thống, hoa văn hình học, hoa lá cách điệu hoặc các đường thêu tinh xảo mang ý nghĩa văn hóa và tâm linh. Chất liệu: Lụa, vải dệt thủ công, cotton hoặc các loại vải cao cấp có độ mềm mại và độ bóng tự nhiên. Trang phục Sampot và Av Pak không chỉ thể hiện vẻ đẹp duyên dáng, thanh lịch của người mặc mà còn là biểu tượng văn hóa đặc sắc, phản ánh bản sắc dân tộc, nghệ thuật may mặc truyền thống và đời sống tinh thần của cộng đồng Khmer."
  },
];
