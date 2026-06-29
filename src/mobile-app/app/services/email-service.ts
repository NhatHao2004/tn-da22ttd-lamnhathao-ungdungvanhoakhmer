import { db } from '@/utils/firebaseConfig';
import { doc, getDoc, Timestamp, setDoc, collection, query, where, getDocs } from 'firebase/firestore';

/**
 * Service xử lý gửi OTP và đổi mật khẩu qua Google Apps Script (Backend Free)
 */

export const EmailService = {
  // 1. Kiểm tra Email đã tồn tại chưa
  checkEmailExists: async (email: string) => {
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', email.toLowerCase().trim()));
      const querySnapshot = await getDocs(q);
      return !querySnapshot.empty;
    } catch (error) {
      console.error('Lỗi kiểm tra email:', error);
      return false;
    }
  },

  // 2. Tạo mã OTP ngẫu nhiên
  generateOTP: () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  },

  // 3. Lưu OTP vào Firestore (tạm thời)
  saveOTP: async (email: string, otp: string) => {
    try {
      const otpRef = doc(db, 'temp_otps', email.toLowerCase().trim());
      await setDoc(otpRef, {
        otp,
        createdAt: Timestamp.now(),
        expiresAt: new Timestamp(Timestamp.now().seconds + 300, 0),
      });
    } catch (err) {
      console.error('Lỗi lưu OTP vào Firestore:', err);
      throw err;
    }
  },

  // 4. Gửi Email qua Google Apps Script (Inbox 100%)
  sendOTPEmail: async (email: string, otp: string) => {
    try {
      const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzooMp7tE7xVwV3XjsLroYdZryp-b9T7Nwh3Y5CiQd7wwVuvkmTXiiwvWc17LrwF5yT/exec';

      const response = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({
          action: 'sendOTP',
          email: email.toLowerCase().trim(),
          otp: otp
        }),
      });

      const res = await response.json();
      return { success: res.success, msg: res.error };
    } catch (error: any) {
      console.error('Lỗi gửi mail qua Apps Script:', error);
      return { success: false, msg: 'Lỗi kết nối máy chủ gửi mail' };
    }
  },

  // 5. Kiểm tra mã OTP
  verifyOTP: async (email: string, inputOtp: string) => {
    const otpRef = doc(db, 'temp_otps', email.toLowerCase().trim());
    const snap = await getDoc(otpRef);
    if (!snap.exists()) return { success: false, msg: 'Mã không tồn tại' };
    const data = snap.data();
    if (Timestamp.now().seconds > data.expiresAt.seconds) return { success: false, msg: 'Mã đã hết hạn' };
    if (data.otp !== inputOtp) return { success: false, msg: 'Mã không chính xác' };
    return { success: true };
  },

  // 6. Gọi Apps Script đổi mật khẩu thật
  resetPasswordWithOTP: async (email: string, otp: string, newPassword: string) => {
    try {
      const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzooMp7tE7xVwV3XjsLroYdZryp-b9T7Nwh3Y5CiQd7wwVuvkmTXiiwvWc17LrwF5yT/exec';

      const response = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({
          action: 'resetPassword',
          email: email.toLowerCase().trim(),
          otp: otp,
          newPassword: newPassword
        }),
      });

      const res = await response.json();
      return { success: res.success, msg: res.error };
    } catch (error: any) {
      console.error('Lỗi gọi Backend Apps Script:', error);
      return { success: false, msg: 'Lỗi kết nối máy chủ đổi mật khẩu' };
    }
  }
};

export default EmailService;