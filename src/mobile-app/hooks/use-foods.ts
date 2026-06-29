import { useState, useEffect } from 'react';
import { db } from '@/utils/firebaseConfig';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

export const useFoods = () => {
  const [foods, setFoods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { loading: authLoading } = require('@/contexts/AuthContext').useAuth();

  useEffect(() => {
    if (authLoading) return;

    // Truy vấn collection destinations để lọc ra những địa điểm thuộc loại "Ẩm thực"
    const q = query(
      collection(db, 'destinations'),
      where('category', 'in', ['Ẩm thực', 'food'])
    );

    // Lắng nghe dữ liệu thay đổi realtime từ Firebase
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetchedFoods: any[] = [];
        snapshot.forEach((doc) => {
          fetchedFoods.push({
            id: doc.id,
            ...doc.data()
          });
        });
        
        // Sắp xếp theo tên
        // Sắp xếp theo ngày tạo (mới nhất lên đầu)
        fetchedFoods.sort((a, b) => {
          const dateA = a.createdAt?.seconds || (a.createdAt instanceof Date ? a.createdAt.getTime() / 1000 : 0);
          const dateB = b.createdAt?.seconds || (b.createdAt instanceof Date ? b.createdAt.getTime() / 1000 : 0);
          if (dateA !== dateB) return dateB - dateA;
          return b.id.localeCompare(a.id);
        });
        
        setFoods(fetchedFoods);
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching foods from Firebase: ", err);
        setError("Không thể tải dữ liệu ẩm thực. Vui lòng kiểm tra kết nối mạng.");
        setLoading(false);
      }
    );

    // Cleanup listener on unmount
    return () => unsubscribe();
  }, []);

  const refresh = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 500);
  };

  return { foods, loading, error, refresh };
};
