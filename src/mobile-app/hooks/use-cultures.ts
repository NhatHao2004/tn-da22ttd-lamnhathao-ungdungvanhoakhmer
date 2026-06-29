import { useState, useEffect } from 'react';
import { db } from '@/utils/firebaseConfig';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

export const useCultures = () => {
  const [cultures, setCultures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Truy vấn collection destinations để lọc ra những địa điểm thuộc loại "Văn hóa"
    const q = query(
      collection(db, 'destinations'),
      where('category', 'in', ['Văn hóa', 'culture'])
    );

    // Lắng nghe dữ liệu thay đổi realtime từ Firebase
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetchedCultures: any[] = [];
        snapshot.forEach((doc) => {
          fetchedCultures.push({
            id: doc.id,
            ...doc.data()
          });
        });
        
        // Sắp xếp theo ngày tạo (mới nhất lên đầu)
        fetchedCultures.sort((a, b) => {
          const dateA = a.createdAt?.seconds || (a.createdAt instanceof Date ? a.createdAt.getTime() / 1000 : 0);
          const dateB = b.createdAt?.seconds || (b.createdAt instanceof Date ? b.createdAt.getTime() / 1000 : 0);
          if (dateA !== dateB) return dateB - dateA;
          return b.id.localeCompare(a.id);
        });
        
        setCultures(fetchedCultures);
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching cultures from Firebase: ", err);
        setError("Không thể tải dữ liệu văn hóa. Vui lòng kiểm tra kết nối mạng.");
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

  return { cultures, loading, error, refresh };
};
