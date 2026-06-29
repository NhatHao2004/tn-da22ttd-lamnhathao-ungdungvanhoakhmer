import { collection, getDocs, limit, orderBy, query, doc, updateDoc, increment, getDoc, arrayUnion, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "../utils/firebaseConfig";

export interface UserProfile {
  uid: string;
  name: string;
  points: number;
  avatar?: string | null;
  role?: string;
}

export interface Temple {

  id: string;
  name: string;
  latitude: number;
  longitude: number;
  imageUrl?: string;
  location?: string;
  rental?: string;
  description?: string;
  category?: string;
  isFavorite?: boolean;
  detailedDescription?: any;
  additionalImages?: string[];
}

export const toggleFavorite = async (userId: string, temple: any, isFavorite: boolean): Promise<void> => {
  if (!userId) throw new Error('User not logged in');
  try {
    const favoriteRef = doc(db, 'users', userId, 'favorites', temple.id);
    if (isFavorite) {
      // Chỉ lưu các trường cần thiết để hiển thị trong danh sách yêu thích
      const cleanTemple = {
        id: temple.id,
        name: temple.name || '',
        name_khmer: temple.name_khmer || '',
        location: temple.location || '',
        location_khmer: temple.location_khmer || '',
        imageUrl: temple.imageUrl || '',
        category: temple.category || '',
        rental: temple.rental || '',
        favoriteAt: new Date().getTime()
      };
      await setDoc(favoriteRef, cleanTemple);
    } else {
      await deleteDoc(favoriteRef);
    }
    // Log toggled favorite locally if needed
  } catch (error) {
    console.error('Error toggling favorite:', error);
    throw error;
  }
};

export const getNearbyTemples = async (lat: number, lng: number, radius: number): Promise<Temple[]> => {
  // Return some dummy data so the UI doesn't look empty
  return [
    {
      id: 'temple1',
      name: 'Chùa Âng',
      latitude: 9.9325,
      longitude: 106.3361,
      location: 'Phường 8, Trà Vinh',
      imageUrl: 'https://thamhiemmekong.com/wp-content/uploads/2020/03/chua-ang-1.jpg',
    },
    {
      id: 'temple2',
      name: 'Chùa Dơi',
      latitude: 9.5898,
      longitude: 105.9754,
      location: 'Phường 3, Sóc Trăng',
      imageUrl: 'https://mia.vn/media/uploads/blog-du-lich/doi-net-1706424557.jpg',
    }
  ];
};

export const getLeaderboardUsers = async (count: number = 20): Promise<UserProfile[]> => {
  try {
    const q = query(
      collection(db, 'users'),
      orderBy('points', 'desc'),
      limit(count)
    );
    
    const querySnapshot = await getDocs(q);
    const users: UserProfile[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      users.push({
        uid: doc.id,
        name: data.name || data['tên'] || 'Anonymous',
        points: data.points ?? 0,
        avatar: data.avatar || data['hình đại diện'] || null,
        role: data.role || data['quyền'] || 'User',
      });
    });
    
    return users;
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    return [];
  }
};

export const addUserPoints = async (userId: string, points: number): Promise<void> => {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      points: increment(points),
    });
  } catch (error) {
    console.error('Error adding points:', error);
    throw error;
  }
};
export const updateQuizScore = async (userId: string, pagodaId: string, newScore: number, isPerfect: boolean = false): Promise<number> => {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) return 0;
    
    const userData = userSnap.data();
    const masteredQuizzes = userData.masteredQuizzes || [];
    const bestScores = userData.quizBestScores || {};
    const previousBest = bestScores[pagodaId] || 0;

    // Chuẩn bị dữ liệu cập nhật
    const updateData: any = {};
    let pointsToAdd = 0;

    // 1. Kiểm tra cộng dồn lượt hoàn thành (chỉ tính 1 lần duy nhất cho mỗi bài đạt điểm tuyệt đối)
    if (isPerfect && !masteredQuizzes.includes(pagodaId)) {
      updateData.completedQuizzes = increment(1);
      updateData.masteredQuizzes = arrayUnion(pagodaId);
    }

    // 2. Kiểm tra cập nhật điểm kỷ lục
    if (newScore > previousBest) {
      pointsToAdd = newScore - previousBest;
      updateData.points = increment(pointsToAdd);
      updateData[`quizBestScores.${pagodaId}`] = newScore;
    }

    // thực hiện cập nhật nếu có bất kỳ thay đổi nào
    if (Object.keys(updateData).length > 0) {
      await updateDoc(userRef, updateData);
    }
    
    return pointsToAdd;
  } catch (error) {
    console.error('Error updating quiz score:', error);
    throw error;
  }
};

export const getQuizData = async (pagodaId: string): Promise<any | null> => {
  try {
    const quizRef = doc(db, 'quizzes', pagodaId);
    const quizSnap = await getDoc(quizRef);
    if (quizSnap.exists()) {
      return quizSnap.data();
    }
    return null;
  } catch (error) {
    console.error('Error fetching quiz data:', error);
    return null;
  }
};

export const seedQuizzes = async (quizzes: any[]): Promise<void> => {
  const { setDoc } = await import("firebase/firestore");
  try {
    for (const quiz of quizzes) {
      // Remove image require for Firestore (use imageUrl instead or handle separately)
      const { image, ...quizToUpload } = quiz;
      await setDoc(doc(db, 'quizzes', quiz.pagodaId), quizToUpload);
    }
    // Success
  } catch (error) {
    console.error('Error seeding quizzes:', error);
    throw error;
  }
};
export const seedVocabQuizzes = async (categories: any[]): Promise<void> => {
  const { setDoc } = await import("firebase/firestore");
  try {
    for (const cat of categories) {
      // Add sample image URLs for each word if they don't have one
      const wordsWithImages = cat.words.map((w: any) => ({
        ...w,
        imageUrl: w.imageUrl || 'https://raw.githubusercontent.com/NhatHao2004/khoaluan_totnghiep_khmergo/main/assets/images/hoctap.jpg'
      }));
      
      const catToUpload = {
        ...cat,
        words: wordsWithImages,
        updatedAt: new Date().toISOString()
      };
      
      await setDoc(doc(db, 'vocab_categories', cat.id), catToUpload);
    }
    // Success
  } catch (error) {
    console.error('Error seeding vocab quizzes:', error);
    throw error;
  }
};
