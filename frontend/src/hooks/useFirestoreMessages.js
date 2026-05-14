import { useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import useStore from '../store/useStore';

/**
 * Real-time Firestore listener hook for messages within a specific conversation.
 * Syncs Firestore documents to the Zustand store.
 * 
 * Hierarchy: conversations/{conversationId}/messages/{messageId}
 */
const useFirestoreMessages = (conversationId) => {
  const { addMessage } = useStore();

  useEffect(() => {
    if (!conversationId) return;

    // Reference to the sub-collection
    const messagesRef = collection(db, 'conversations', conversationId.toString(), 'messages');
    
    // Query ordered by server timestamp
    const q = query(messagesRef, orderBy('timestamp', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          
          // Map Firestore data back to our UI state format
          addMessage(conversationId, {
            id: change.doc.id,
            sender_id: data.sender_id,
            text: data.text,
            image_url: data.image_url,
            is_read: data.is_read,
            // Convert Firestore Timestamp to ISO string for consistency
            timestamp: data.timestamp?.toDate()?.toISOString() || new Date().toISOString(),
          });
        }
      });
    }, (error) => {
      console.error("[Firestore Listener Error]:", error);
    });

    // Cleanup listener on unmount or conversation change
    return () => unsubscribe();
  }, [conversationId, addMessage]);
};

export default useFirestoreMessages;
