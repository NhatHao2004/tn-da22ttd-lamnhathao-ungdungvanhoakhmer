
import { db } from './utils/firebaseConfig';
import { collection, getDocs, limit } from 'firebase/firestore';

async function listUsers() {
  try {
    const querySnapshot = await getDocs(collection(db, 'users'));
    console.log('--- USER EMAILS IN FIRESTORE ---');
    querySnapshot.forEach((doc) => {
      console.log(doc.data().email);
    });
    console.log('-------------------------------');
  } catch (error) {
    console.error('Error listing users:', error);
  }
}

listUsers();
