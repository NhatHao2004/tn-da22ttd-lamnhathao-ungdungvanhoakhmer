import { useState, useEffect } from 'react';
import { db } from '@/utils/firebaseConfig';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

export const useTemples = () => {
  const [temples, setTemples] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { loading: authLoading } = require('@/contexts/AuthContext').useAuth();

  useEffect(() => {
    if (authLoading) return;

    // Truy vấn collection destinations để lọc ra những địa điểm thuộc loại "Chùa"
    const q = query(
      collection(db, 'destinations'),
      where('category', 'in', ['Chùa', 'pagoda'])
    );

    // Lắng nghe dữ liệu thay đổi realtime từ Firebase
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetchedTemples: any[] = [];
        snapshot.forEach((doc) => {
          fetchedTemples.push({
            id: doc.id,
            ...doc.data()
          });
        });
        
        // Sắp xếp theo ngày tạo (mới nhất lên đầu)
        fetchedTemples.sort((a, b) => {
          const dateA = a.createdAt?.seconds || (a.createdAt instanceof Date ? a.createdAt.getTime() / 1000 : 0);
          const dateB = b.createdAt?.seconds || (b.createdAt instanceof Date ? b.createdAt.getTime() / 1000 : 0);
          if (dateA !== dateB) return dateB - dateA;
          return b.id.localeCompare(a.id);
        });

        setTemples(fetchedTemples);
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching temples from Firebase: ", err);
        setError("Không thể tải hệ thống chùa. Vui lòng kiểm tra kết nối mạng.");
        setLoading(false);
      }
    );

    // Cleanup listener on unmount
    return () => unsubscribe();
  }, []);

  const refresh = () => {
    // onSnapshot đã tự động refresh realtime nên hàm này chỉ để giữ interface tương thích
    setLoading(true);
    setTimeout(() => setLoading(false), 500); // Fake delay
  };

  return { temples, loading, error, refresh };
};
