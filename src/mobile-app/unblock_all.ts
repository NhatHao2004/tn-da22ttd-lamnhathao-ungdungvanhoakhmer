
import { db } from './utils/firebaseConfig';
import { collection, getDocs, query, where, updateDoc, doc } from 'firebase/firestore';

async function unblockAllUsers() {
  console.log('--- EMERGENCY UNBLOCK ---');
  try {
    const q = query(collection(db, 'users'), where('isBlocked', '==', true));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      console.log('No blocked users found.');
      return;
    }

    let count = 0;
    for (const userDoc of querySnapshot.docs) {
      const email = userDoc.data().email;
      console.log(`Unblocking: ${email}...`);
      await updateDoc(doc(db, 'users', userDoc.id), {
        isBlocked: false
      });
      count++;
    }
    
    console.log(`Successfully unblocked ${count} user(s).`);
    console.log('-------------------------');
  } catch (error) {
    console.error('Error during unblock:', error);
  }
}

unblockAllUsers();
