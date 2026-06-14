"""Firebase Realtime Database admin client.

Credentials are read from the FIREBASE_CREDENTIALS_B64 env var (base64-encoded
service-account JSON) so nothing sensitive is ever hardcoded or committed.
"""
import os
import json
import base64

import firebase_admin
from firebase_admin import credentials, db as rtdb

_initialized = False


def init():
    global _initialized
    if _initialized or firebase_admin._apps:
        _initialized = True
        return
    b64 = os.environ["FIREBASE_CREDENTIALS_B64"]
    info = json.loads(base64.b64decode(b64).decode("utf-8"))
    cred = credentials.Certificate(info)
    firebase_admin.initialize_app(cred, {"databaseURL": os.environ["FIREBASE_DB_URL"]})
    _initialized = True


def ref(path: str):
    return rtdb.reference(path)
