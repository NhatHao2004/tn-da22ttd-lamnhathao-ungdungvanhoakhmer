import { useState, useEffect } from 'react';
import { db } from '@/utils/firebaseConfig';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

export const useCultures = () => {
  const [cultures, setCultures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { loading: authLoading } = require('@/contexts/AuthContext').useAuth();

  useEffect(() => {
    if (authLoading) return;

    // Truy vấn collection destinations để lọc ra những địa điểm thuộc loại "Văn hóa"
    const q = query(
      collection(db, 'destinations'),
      where('category', '==', 'Văn hóa')
    );

    // Lắng nghe dữ liệu thay đổi realtime từ Firebase
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetched: any[] = [];
        snapshot.forEach((doc) => {
          fetched.push({
            id: doc.id,
            ...doc.data()
          });
        });
        
        // Sắp xếp theo ID
        fetched.sort((a, b) => (a.id > b.id ? 1 : -1));
        
        setCultures(fetched);
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching cultures from Firebase: ", err);
        setError("Không thể tải dữ liệu văn hóa.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return { cultures, loading, error };
};
