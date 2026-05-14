import os
import firebase_admin
from firebase_admin import credentials, firestore
from django.conf import settings

def initialize_firebase():
    """
    Initializes the Firebase Admin SDK using a service account key or default credentials.
    Returns a Firestore client instance.
    
    Expected Environment Variables:
    - FIREBASE_SERVICE_ACCOUNT_PATH: Path to the service account JSON key file.
    """
    if not firebase_admin._apps:
        # Get service account path from environment variables
        cred_path = os.environ.get('FIREBASE_SERVICE_ACCOUNT_PATH')
        
        if cred_path and os.path.exists(cred_path):
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)
            print(f"[Firebase] Initialized with service account: {cred_path}")
        else:
            # Fallback to Application Default Credentials
            firebase_admin.initialize_app()
            print("[Firebase] Initialized with Application Default Credentials")
            
    return firestore.client()

def get_firebase_uid(user):
    """
    Helper function to convert a Django User instance to a Firebase UID string.
    Consistent mapping is crucial for NoSQL replication.
    """
    if not user or not hasattr(user, 'id'):
        return None
    return f"stitch_user_{user.id}"

def sync_conversation_to_firestore(conversation):
    """
    Example utility to replicate a Django Conversation model to Firestore.
    """
    db = initialize_firebase()
    
    conv_ref = db.collection('conversations').document(str(conversation.id))
    conv_ref.set({
        'participants': [get_firebase_uid(p) for p in conversation.participants.all()],
        'created_at': conversation.created_at,
        'is_group': conversation.participants.count() > 2
    })
    return conv_ref

def add_message_to_firestore(message):
    """
    Example utility to replicate a Django Message model to a Firestore sub-collection.
    """
    db = initialize_firebase()
    
    msg_data = {
        'sender_id': get_firebase_uid(message.sender),
        'text': message.text,
        'image_url': message.image_url,
        'timestamp': firestore.SERVER_TIMESTAMP,
        'is_read': message.is_read
    }
    
    # Nested under the conversations collection as a sub-collection
    db.collection('conversations') \
      .document(str(message.conversation.id)) \
      .collection('messages') \
      .add(msg_data)
