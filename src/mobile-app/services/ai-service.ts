import { ARTIFACTS_DB } from "@/constants/ArtifactsDB";
import * as SecureStore from 'expo-secure-store';
import { fetchAndActivate, getString, isSupported } from "firebase/remote-config";
import { remoteConfig } from "../utils/firebaseConfig";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_API_KEY_STORAGE_KEY = 'groq_api_key';

// Giá trị mặc định (Fallback)
let CHAT_MODEL = "llama-3.1-8b-instant";
let VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";

const syncRemoteConfig = async () => {
  try {
    // Kiểm tra xem Remote Config có được hỗ trợ không
    let supported = false;
    try {
      supported = await isSupported();
    } catch (e) {
      supported = false;
    }

    if (!supported) {
      console.log("Remote Config is not supported in this environment, using defaults.");
      return;
    }
    
    await fetchAndActivate(remoteConfig);
    const remoteChatModel = getString(remoteConfig, "chat_model");
    const remoteVisionModel = getString(remoteConfig, "vision_model");
    
    if (remoteChatModel) CHAT_MODEL = remoteChatModel;
    if (remoteVisionModel) VISION_MODEL = remoteVisionModel;
    
    console.log("Remote Config Updated:", { CHAT_MODEL, VISION_MODEL });
  } catch (error) {
    console.warn("Failed to fetch Remote Config:", error);
  }
};

const getGroqApiKey = async () => {
  try {
    // 1. Thử lấy từ Remote Config
    try {
      let supported = false;
      try { supported = await isSupported(); } catch (e) { supported = false; }
      
      if (supported) {
        await fetchAndActivate(remoteConfig);
        const remoteKey = getString(remoteConfig, "groq_api_key");
        if (remoteKey) return remoteKey;
      }
    } catch (e) {
      console.warn("Remote Config key fetch failed, trying local fallback...");
    }

    // 2. Ưu tiên lấy từ biến môi trường của Expo (.env)
    const envKey = process.env.EXPO_PUBLIC_GROQ_API_KEY;
    if (envKey) return envKey;

    // Fallback sang SecureStore 
    const key = await SecureStore.getItemAsync(GROQ_API_KEY_STORAGE_KEY);
    if (!key) {
      throw new Error("GROQ API Key not found in Environment or SecureStore");
    }
    return key;
  } catch (error) {
    console.error("Error retrieving Groq API Key:", error);
    throw error;
  }
};

export const chatWithAI = async (message: string): Promise<string> => {
  try {
    await syncRemoteConfig(); // Đồng bộ model trước khi gọi
    const lowerMsg = message.toLowerCase().trim();

    // 1. Định nghĩa dữ liệu phản hồi nhanh (Fast Path Data)
    const pagodaData: Record<string, { desc: string; id: string; keywords: string[] }> = {
      "chùa âng": {
        desc: "Chùa Âng là một trong những ngôi chùa Khmer cổ và nổi tiếng nhất tại Trà Vinh, mang giá trị lịch sử và kiến trúc đặc sắc.",
        id: "pagoda_1",
        keywords: ["wat ang", "chùa âng", "chua ang"]
      },
      "chùa hang": {
        desc: "Chùa Hang (Wat Kompong Chray) nổi bật với cổng chùa hình chim thần đạo độc đáo và khuôn viên rợp bóng cây cổ thụ.",
        id: "pagoda_2",
        keywords: ["wat kompong chray", "chùa kompong chray", "chùa hang", "chua hang"]
      },
      "chùa kompong": {
        desc: "Chùa Kompong (Wat Kompong) là ngôi chùa có bề dày lịch sử lâu đời và là trung tâm giáo dục quan trọng của cộng đồng.",
        id: "pagoda_3",
        keywords: ["wat kompong", "chùa ông mẹt", "chua ong met"]
      },
      "chùa samrong ek": {
        desc: "Chùa Samrong Ek là nơi gìn giữ nhiều nét đẹp văn hóa tâm linh của người Khmer với kiến trúc mái chùa uy nghi.",
        id: "pagoda_5",
        keywords: ["wat samrong ek", "chùa samrong ek", "chua samrong ek"]
      },
      "chùa sleng chas": {
        desc: "Chùa Sleng Chas là ngôi chùa cổ kính với những hàng cột vững chãi và họa tiết trang trí tinh xảo.",
        id: "pagoda_4",
        keywords: ["wat sleng chas", "chùa sleng chas", "chua sleng chas"]
      }
    };

    const foodData: Record<string, { desc: string; id: string; keywords: string[] }> = {
      "bún nước lèo": {
        desc: "Bún nước lèo là món ăn đặc trưng của người Khmer Nam Bộ với hương vị đậm đà được nấu từ mắm bò hóc hảo hạng.",
        id: "food_1",
        keywords: ["nước lèo", "bún lèo", "bun nuoc leo", "bun leo"]
      },
      "mắm bò hóc": {
        desc: "Mắm bò hóc là loại gia vị truyền thống linh hồn trong hầu hết các món truyền thống của người Khmer Nam Bộ.",
        id: "food_3",
        keywords: ["prahok", "mắm khmer", "mam khmer"]
      },
      "bánh tét": {
        desc: "Bánh tét Khmer với nhân đậu mỡ béo ngậy được gói cẩn thận, là món ăn không thể thiếu trong các dịp lễ hội.",
        id: "food_5",
        keywords: ["bánh tét khmer", "bánh tét", "banh tet khmer", "banh tet"]
      },
      "cốm dẹp": {
        desc: "Cốm dẹp được làm từ loại nếp vừa chín tới, mang hương vị thơm ngon đặc biệt trong lễ hội Ok Om Bok.",
        id: "food_2",
        keywords: ["cốm dẹp", "com dep"]
      },
      "canh xiêm lo": {
        desc: "Canh xiêm lo là món canh truyền thống bổ dưỡng của người Khmer với sự kết hợp của nhiều loại rau quả.",
        id: "food_4",
        keywords: ["xiêm lo", "canh khmer", "xiem lo", "canh khmer"]
      }
    };

    const CULTURES = [
      "trang phục truyền thống",
      "ngôn ngữ và chữ viết",
      "nghệ thuật ca và múa",
      "lễ hội truyền thống",
      "tôn giáo và đời sống"
    ];

    const cultureData: Record<string, { desc: string; id: string; keywords: string[] }> = {
      "trang phục truyền thống": {
        desc: "Trang phục truyền thống Khmer nổi bật với sắc màu rực rỡ và các họa tiết hoa văn tinh xảo như xà-rông và áo tầm-vông.",
        id: "culture_5",
        keywords: ["trang phục", "xà rông", "trang phục truyền thống", "trang phục khmer", "trang phục dân tộc", "trang phục dân tộc khmer", "trang phục dân tộc khmer nam bộ", "trang phuc", "xa rong", "trang phuc truyen thong", "trang phuc khmer", "trang phuc dan toc", "trang phuc dan toc khmer", "trang phuc dan toc khmer nam bo"]
      },
      "ngôn ngữ và chữ viết": {
        desc: "Ngôn ngữ và chữ viết Khmer là di sản quý báu, đóng vai trò quan trọng trong việc gìn giữ bản sắc văn hóa dân tộc.",
        id: "culture_4",
        keywords: ["ngôn ngữ", "chữ viết", "ngôn ngữ khmer", "chữ viết khmer", "ngôn ngữ khmer nam bộ", "chữ viết khmer nam bộ", "ngon ngu", "chu viet", "ngon ngu khmer", "chu viet khmer", "ngon ngu khmer nam bo", "chu viet khmer nam bo"]
      },
      "nghệ thuật ca và múa": {
        desc: "Nghệ thuật Khmer vô cùng phong phú với các điệu múa Rô-băm, dù-kê và âm nhạc ngũ âm truyền thống độc đáo.",
        id: "culture_3",
        keywords: ["nghệ thuật", "ca múa", "nhạc ngũ âm", "nghe thuat", "ca mua", "nhac ngu am"]
      },
      "lễ hội truyền thống": {
        desc: "Các lễ hội Khmer như Chol Chnam Thmay, Sen Dolta, Ok Om Bok và đua ghe ngo là những nét đẹp văn hóa truyền thống vô cùng đặc sắc.",
        id: "culture_2",
        keywords: ["lễ hội", "chol chnam thmay", "sen dolta", "ok om bok", "le hoi", "chol chnam thmay", "sen dolta", "ok om bok", "đua ghe ngo", "dua ghe ngo", "đua ghe", "dua ghe"]
      },
      "tôn giáo và đời sống": {
        desc: "Tôn giáo và tín ngưỡng đóng vai trò cốt lõi trong đời sống người Khmer, với ngôi chùa là trung tâm sinh hoạt tâm linh.",
        id: "culture_1",
        keywords: ["tôn giáo", "đời sống", "tín ngưỡng", "ton giao", "doi song", "tin nguong"]
      }
    };

    // 2. Kiểm tra từ khóa hợp lệ (Dựa trên toàn bộ dữ liệu có sẵn)
    const ALL_SPECIFIC_KEYWORDS = [
      ...Object.keys(pagodaData),
      ...Object.keys(foodData),
      ...CULTURES,
      ...Object.values(pagodaData).flatMap(p => p.keywords),
      ...Object.values(foodData).flatMap(f => f.keywords),
      ...Object.values(cultureData).flatMap(c => c.keywords)
    ];

    const ALLOWED_KEYWORDS = [
      "khmer", "chùa", "văn hóa", "ẩm thực", "món ăn", "lễ hội", "trà vinh", "sóc trăng", "an giang",
      "thạch", "sơn", "hiện vật", "bảo tàng", "di tích", "điêu khắc", "kiến trúc", "trang phục",
      ...ARTIFACTS_DB.map(a => a.name.toLowerCase()),
      ...ALL_SPECIFIC_KEYWORDS
    ];

    // 3. Phản hồi nhanh (Fast Path Execution) - Ưu tiên từ cụ thể
    const greetings = ["chào", "hi", "hello", "xin chào", "bạn ơi"];
    const isGreeting = greetings.some(g => lowerMsg === g || lowerMsg.startsWith(g + " "));

    const isRelated = isGreeting || ALLOWED_KEYWORDS.some(keyword =>
      lowerMsg.includes(keyword)
    );

    if (!isRelated) {
      return "Xin lỗi, tôi chỉ hỗ trợ nội dung văn hóa Khmer Nam Bộ trong ứng dụng KhmerGo.";
    }

    if (isGreeting) {
      return "Chào bạn! Mình là KhmerGo AI. Mình có thể giúp bạn tìm hiểu về văn hóa Khmer Nam Bộ.";
    }

    // Kiểm tra Chùa
    const matchedPagodaKey = Object.keys(pagodaData).find(key =>
      lowerMsg.includes(key) || pagodaData[key].keywords.some(kw => lowerMsg.includes(kw))
    );
    if (matchedPagodaKey) {
      const { desc, id } = pagodaData[matchedPagodaKey];
      return `${desc} [LINK:${id}]`;
    }

    // Kiểm tra Món ăn
    const matchedFoodKey = Object.keys(foodData).find(key =>
      lowerMsg.includes(key) || foodData[key].keywords.some(kw => lowerMsg.includes(kw))
    );
    if (matchedFoodKey) {
      const { desc, id } = foodData[matchedFoodKey];
      return `${desc} [LINK:${id}]`;
    }

    // Kiểm tra Văn hóa
    const matchedCultureKey = CULTURES.find(key =>
      lowerMsg.includes(key) || cultureData[key].keywords.some(kw => lowerMsg.includes(kw))
    );
    if (matchedCultureKey) {
      const { desc, id } = cultureData[matchedCultureKey];
      return `${desc} [LINK:${id}]`;
    }

    // DANH MỤC TỔNG QUÁT (Chỉ bắt nếu không khớp từ khóa cụ thể ở trên)
    if (lowerMsg.includes("ẩm thực") || lowerMsg.includes("món ăn")) {
      return "Ẩm thực Khmer nổi bật với hương vị đậm đà, sự kết hợp hài hòa giữa gia vị truyền thống và các nguyên liệu địa phương. [LINK:food_all]";
    }
    if (lowerMsg.includes("văn hóa")) {
      return "Văn hóa Khmer là sự kết tinh của tín ngưỡng, nghệ thuật và phong tục tập quán độc đáo được gìn giữ qua hàng thế kỷ. [LINK:culture_all]";
    }
    if (lowerMsg.includes("chùa")) {
      return "Các ngôi chùa Khmer là trung tâm sinh hoạt văn hóa và giáo dục cộng đồng với kiến trúc mái cong nhiều tầng độc đáo. [LINK:pagoda_all]";
    }

    // 4. Gọi Groq AI nếu không có Fast Path
    const artifactsBrief = ARTIFACTS_DB.map(a =>
      `${a.name} (ID: ${a.id}): ${a.description}`
    ).join("\n");

    const prompt = `Bạn là KhmerGo AI.

DỮ LIỆU KHMERGO:
${artifactsBrief}

GIỚI HẠN CÂU TRẢ LỜI:
- Tối đa 2 câu.
- Từ 25 đến 30 từ. Không quá 35 từ.
- Không xuống dòng.
- Không liệt kê danh sách.
- Chỉ trả lời bằng tiếng Việt.

QUY TẮC TUYỆT ĐỐI:
- Chỉ được trả lời bằng dữ liệu KhmerGo. Không sử dụng kiến thức ngoài.
- Nếu không thuộc dữ liệu KhmerGo: "Xin lỗi, tôi chỉ hỗ trợ nội dung văn hóa Khmer Nam Bộ trong ứng dụng KhmerGo."
- Mọi câu trả lời (trừ lời chào) LUÔN kết thúc bằng 1 mã [LINK:...].

VÍ DỤ ĐỂ HỌC THEO:
1. Chùa Âng là một trong những ngôi chùa Khmer cổ và nổi tiếng nhất tại Trà Vinh, mang giá trị lịch sử và kiến trúc đặc sắc. [LINK:pagoda_1]
2. Ẩm thực Khmer Nam Bộ nổi bật với nhiều món ăn truyền thống mang hương vị đặc trưng, phản ánh đời sống và văn hóa cộng đồng Khmer. [LINK:food_all]
3. Văn hóa Khmer Nam Bộ chứa đựng nhiều giá trị về tín ngưỡng, nghệ thuật và lễ hội truyền thống được gìn giữ qua nhiều thế hệ. [LINK:culture_all]

QUY TẮC PHỤ:
- LINK luôn nằm cuối.
- Trả lời ngắn gọn, trang trọng.
`;

    const apiKey = await getGroqApiKey();
    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: CHAT_MODEL,
        messages: [
          { role: "system", content: prompt },
          { role: "user", content: message },
        ],
        temperature: 0,
        max_tokens: 60,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || `API Error: ${response.status}`);
    }

    const data = await response.json();
    let content = data.choices[0].message.content
      .replace(/[\r\n]+/g, " ")
      .trim();

    const linkMatch = content.match(/\[[^\]]*?LINK[\s\S]*?\]/i);
    const linkTag = linkMatch ? linkMatch[0] : "";
    if (linkTag) {
      content = content.replace(linkTag, "").trim();
    }

    const words = content.split(/\s+/);
    if (words.length > 35) {
      content = words.slice(0, 35).join(" ");
    }

    if (linkTag) {
      content = content.trim() + " " + linkTag;
    }

    return content.trim();
  } catch (error) {
    console.error("AI Chat Error:", error);
    throw error;
  }
};

export const analyzeImage = async (base64Image: string): Promise<{
  artifact?: { name: string; features: string };
  isRecognized?: boolean;
  rawResponse?: string;
}> => {
  try {
    await syncRemoteConfig(); // Đồng bộ model trước khi gọi
    const apiKey = await getGroqApiKey();
    const artifactsList = ARTIFACTS_DB.map(a => `- ${a.name}: ${a.description}`).join('\n');

    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: VISION_MODEL,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Bạn là chuyên gia về văn hóa Khmer Nam Bộ. Hãy phân tích hình ảnh này.
DỮ LIỆU HIỆN VẬT CÓ SẴN:
${artifactsList}

YÊU CẦU:
1. Nếu hình ảnh trùng khớp với một trong các hiện vật trong danh sách trên, hãy trả về CHỈ mã JSON sau: {"artifactName": "Tên chính xác trong danh sách"}
2. Nếu không trùng khớp với bất kỳ hiện vật nào trong danh sách trên, hãy trả về: {"artifactName": null}`
              },
              {
                type: "image_url",
                image_url: { url: `data:image/jpeg;base64,${base64Image}` }
              }
            ]
          }
        ],
        temperature: 0,
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Groq Vision API Full Error:", JSON.stringify(errorData, null, 2));
      throw new Error(`Vision API Error: ${errorData.error?.message || response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content.trim();

    // Tìm kiếm JSON trong phản hồi
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]);

      if (result.artifactName) {
        const artifact = ARTIFACTS_DB.find(a => a.name === result.artifactName);
        if (artifact) {
          return { 
            artifact: { name: artifact.name, features: artifact.features },
            isRecognized: true 
          };
        }
      }
    }

    return { isRecognized: false };
  } catch (error) {
    console.error("Analyze Image Error:", error);
    return { isRecognized: false };
  }
};
