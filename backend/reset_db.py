"""
AssetFlow Database Cleaner Script
Wipes all sample data, test users, organizations, assets, and logs from Supabase / SQLite.
Run:
    python backend/reset_db.py
"""

import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

TABLES = [
    "activity_logs",
    "notifications",
    "audit_logs",
    "audit_items",
    "audits",
    "maintenance_requests",
    "bookings",
    "returns",
    "transfers",
    "allocations",
    "assets",
    "asset_categories",
    "resources",
    "departments",
    "users",
    "organizations"
]

def clean_database():
    database_url = os.getenv("DATABASE_URL")
    
    if database_url and ("postgres://" in database_url or "postgresql://" in database_url):
        try:
            import psycopg2
            print("[Clean DB] Connecting to Supabase PostgreSQL...")
            conn = psycopg2.connect(database_url)
            cursor = conn.cursor()
            
            # Truncate all tables in cascade mode
            tables_sql = ", ".join(TABLES)
            truncate_sql = f"TRUNCATE TABLE {tables_sql} RESTART IDENTITY CASCADE;"
            cursor.execute(truncate_sql)
            conn.commit()
            cursor.close()
            conn.close()
            print("[Clean DB] Successfully wiped all tables from Supabase PostgreSQL!")
            return
        except Exception as e:
            print(f"[Clean DB] Postgres error: {e}")
            print("[Clean DB] You can run the SQL query directly in Supabase SQL Editor.")
            return

    # Fallback to local SQLite if no Postgres URL is active
    import sqlite3
    db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "assetflow.db"))
    if os.path.exists(db_path):
        print(f"[Clean DB] Cleaning local SQLite database at {db_path}...")
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute("PRAGMA foreign_keys = OFF;")
        for t in TABLES:
            try:
                cursor.execute(f"DELETE FROM {t};")
            except Exception:
                pass
        conn.commit()
        cursor.execute("VACUUM;")
        conn.close()
        print("[Clean DB] Local SQLite database cleaned successfully!")
    else:
        print("[Clean DB] No local SQLite database file found.")

if __name__ == "__main__":
    confirm = input("Are you sure you want to delete ALL data and accounts from database? (yes/no): ")
    if confirm.strip().lower() in ["y", "yes"]:
        clean_database()
    else:
        print("Operation cancelled.")
