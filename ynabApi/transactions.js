import { db } from "../firebase/firebaseConfig.js";
import { collection, doc, getDocs, setDoc, writeBatch, query, where } from "firebase/firestore";

export const handleDuplicate = async (expenses, isAdiCard) => {
  const transactionLogRef = collection(db, "transactionLog");

  // Step 1: Generate all keys
  const keys = expenses.map((tx) => `${tx.payee_name}-${tx.date}-${tx.amount}-${isAdiCard}`);

  // Step 2: Fetch existing keys in batches of 10
  const chunkSize = 10;
  const existingKeys = new Set();

  for (let i = 0; i < keys.length; i += chunkSize) {
    const chunk = keys.slice(i, i + chunkSize);
    const q = query(transactionLogRef, where("__name__", "in", chunk));
    const querySnapshot = await getDocs(q);

    querySnapshot.forEach((doc) => existingKeys.add(doc.id));
  }

  // Step 3: Filter unique transactions
  const uniqueTransactions = expenses.filter((tx) => {
    const key = `${tx.payee_name}-${tx.date}-${tx.amount}-${isAdiCard}`;
    return !existingKeys.has(key);
  });

  // Step 4: Batch write new transactions
  const batch = writeBatch(db);
  uniqueTransactions.forEach((tx) => {
    const key = `${tx.payee_name}-${tx.date}-${tx.amount}-${isAdiCard}`;
    batch.set(doc(transactionLogRef, key), { exists: true });
  });

  if (uniqueTransactions.length > 0) {
    await batch.commit(); // Execute batch write only if there are new transactions
  }

  return uniqueTransactions;
};
