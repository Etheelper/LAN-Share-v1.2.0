import sqlite3
conn = sqlite3.connect('../data/lanshare.db')
cursor = conn.cursor()
cursor.execute('SELECT id, name, file_type, mime_type, storage_mode, local_path FROM file_records WHERE id=5')
result = cursor.fetchone()
print(f"File info: {result}")

import os
if result and result[4] == 'index' and result[5]:
    exists = os.path.exists(result[5])
    print(f"Path exists: {exists}")
    print(f"Path: {result[5]}")
conn.close()
