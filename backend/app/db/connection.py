import os
import sqlite3
import uuid
import json
from typing import Dict, Any, List, Optional
import re

# Optional Postgres support
try:
    import psycopg2
    from psycopg2.extras import RealDictCursor
    HAS_PSYCOPG2 = True
except ImportError:
    psycopg2 = None
    RealDictCursor = None
    HAS_PSYCOPG2 = False

DATABASE_URL = os.getenv("DATABASE_URL")
DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "assetflow.db"))
SCHEMA_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "schema.sql"))

class DBConnection:
    """
    Unified Database abstraction layer for multi-tenant queries.
    Integrates with SQLite locally for zero-setup running, and
    connects to PostgreSQL (Supabase) in production.
    """
    def __init__(self):
        self.is_postgres = bool(HAS_PSYCOPG2 and DATABASE_URL and (DATABASE_URL.startswith("postgres://") or DATABASE_URL.startswith("postgresql://")))
        if DATABASE_URL and not HAS_PSYCOPG2:
            print("[AssetFlow DB] Warning: DATABASE_URL provided but psycopg2 is not installed. Falling back to local SQLite.")
        self._initialize_db()

    def _get_conn(self):
        if self.is_postgres:
            return psycopg2.connect(DATABASE_URL)
        else:
            conn = sqlite3.connect(DB_PATH)
            conn.row_factory = sqlite3.Row
            conn.execute("PRAGMA foreign_keys = ON;")
            return conn

    def _get_cursor(self, conn):
        if self.is_postgres:
            return conn.cursor(cursor_factory=RealDictCursor)
        else:
            return conn.cursor()

    def _execute_sql(self, cursor, sql: str, params: Dict[str, Any] = None):
        if self.is_postgres:
            # Convert SQLite ":param_name" placeholders to PostgreSQL "%(param_name)s"
            converted_sql = re.sub(r':([a-zA-Z0-9_]+)', r'%(\1)s', sql)
            # Replace query_one's 'id = ?' with 'id = %s'
            if "?" in converted_sql:
                converted_sql = converted_sql.replace("?", "%s")
            
            if params:
                cursor.execute(converted_sql, params)
            else:
                cursor.execute(converted_sql)
        else:
            if params:
                cursor.execute(sql, params)
            else:
                cursor.execute(sql)

    def _initialize_db(self):
        """
        Runs the schema script on startup if the database tables do not exist,
        handling PostgreSQL or SQLite syntax accordingly.
        """
        if self.is_postgres:
            # Check if organizations table exists in Postgres
            conn = self._get_conn()
            try:
                cursor = self._get_cursor(conn)
                cursor.execute("SELECT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'organizations');")
                row = cursor.fetchone()
                if row and (row.get("exists") or list(row.values())[0]):
                    conn.close()
                    return
            except Exception as e:
                print(f"[AssetFlow DB] Postgres check exception: {e}")
            finally:
                conn.close()
        else:
            # If SQLite DB file already exists and has tables, skip initialization
            if os.path.exists(DB_PATH) and os.path.getsize(DB_PATH) > 0:
                conn = self._get_conn()
                try:
                    cursor = conn.cursor()
                    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='organizations';")
                    if cursor.fetchone():
                        conn.close()
                        return
                except Exception:
                    pass
                finally:
                    conn.close()

        print(f"[AssetFlow DB] Initializing database schema...")
        if not os.path.exists(SCHEMA_PATH):
            print(f"[AssetFlow DB] Warning: Schema file not found at {SCHEMA_PATH}")
            return

        with open(SCHEMA_PATH, "r", encoding="utf-8") as f:
            sql_content = f.read()

        if not self.is_postgres:
            # Translate PostgreSQL elements to SQLite
            sql_content = sql_content.replace("gen_random_uuid()", "NULL")
            sql_content = sql_content.replace("DEFAULT gen_random_uuid()", "")
            sql_content = sql_content.replace("::jsonb", "")
            sql_content = sql_content.replace("UUID", "TEXT")
            sql_content = sql_content.replace("JSONB", "TEXT")
            sql_content = sql_content.replace("TIMESTAMP WITH TIME ZONE", "TEXT")
            sql_content = sql_content.replace("NUMERIC(12, 2)", "REAL")
            sql_content = sql_content.replace("NUMERIC", "REAL")
            sql_content = sql_content.replace("BOOLEAN DEFAULT FALSE", "INTEGER DEFAULT 0")
            sql_content = sql_content.replace("BOOLEAN DEFAULT TRUE", "INTEGER DEFAULT 1")
            sql_content = sql_content.replace("BOOLEAN", "INTEGER")
            sql_content = sql_content.replace("DATE", "TEXT")

        # Split and filter statements
        statements = sql_content.split(";")
        conn = self._get_conn()
        cursor = self._get_cursor(conn)
        try:
            for statement in statements:
                stmt_clean = statement.strip()
                if not stmt_clean or stmt_clean == "BEGIN" or stmt_clean == "COMMIT":
                    continue
                if not self.is_postgres:
                    # SQLite ALTER TABLE does not support ADD CONSTRAINT for foreign keys
                    if "ALTER TABLE" in stmt_clean.upper() and "ADD CONSTRAINT" in stmt_clean.upper():
                        continue
                cursor.execute(stmt_clean)
            conn.commit()
            print("[AssetFlow DB] Database schema successfully initialized.")
        except Exception as e:
            conn.rollback()
            print(f"[AssetFlow DB] Error during schema execution: {e}")
            raise e
        finally:
            conn.close()

    def generate_uuid(self) -> str:
        return str(uuid.uuid4())

    def _serialize_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Converts dicts/lists to JSON strings for SQLite storage."""
        serialized = {}
        for k, v in data.items():
            if isinstance(v, (dict, list)):
                serialized[k] = json.dumps(v)
            elif isinstance(v, bool):
                serialized[k] = 1 if v else 0
            else:
                serialized[k] = v
        return serialized

    def _deserialize_row(self, row: sqlite3.Row) -> Dict[str, Any]:
        """Converts SQLite row to dict and parses JSON fields."""
        if not row:
            return {}
        result = dict(row)
        for k, v in result.items():
            if isinstance(v, str):
                v_strip = v.strip()
                if (v_strip.startswith("{") and v_strip.endswith("}")) or (v_strip.startswith("[") and v_strip.endswith("]")):
                    try:
                        result[k] = json.loads(v_strip)
                    except Exception:
                        pass
        return result

    def insert(self, table: str, data: Dict[str, Any]) -> Dict[str, Any]:
        serialized = self._serialize_data(data)
        columns = list(serialized.keys())
        placeholders = [":" + col for col in columns]
        
        sql = f"INSERT INTO {table} ({', '.join(columns)}) VALUES ({', '.join(placeholders)})"
        
        conn = self._get_conn()
        try:
            cursor = self._get_cursor(conn)
            self._execute_sql(cursor, sql, serialized)
            conn.commit()
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            conn.close()
        return data

    def update(self, table: str, entry_id: Any, data: Dict[str, Any]) -> Dict[str, Any]:
        if not data:
            return data
        serialized = self._serialize_data(data)
        set_clause = ", ".join([f"{col} = :{col}" for col in serialized.keys()])
        sql = f"UPDATE {table} SET {set_clause} WHERE id = :_id_val"
        
        params = {**serialized, "_id_val": entry_id}
        conn = self._get_conn()
        try:
            cursor = self._get_cursor(conn)
            self._execute_sql(cursor, sql, params)
            conn.commit()
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            conn.close()
        return data

    def query_one(self, table: str, entry_id: Any) -> Optional[Dict[str, Any]]:
        sql = f"SELECT * FROM {table} WHERE id = ?"
        conn = self._get_conn()
        try:
            cursor = self._get_cursor(conn)
            self._execute_sql(cursor, sql, (entry_id,))
            row = cursor.fetchone()
            return self._deserialize_row(row) if row else None
        finally:
            conn.close()

    def _build_where_clause(self, query: Dict[str, Any]) -> tuple:
        clauses = []
        params = {}
        for k, v in query.items():
            if k.endswith("_not_in"):
                col_name = k.replace("_not_in", "")
                if v:
                    placeholders = []
                    for idx, val in enumerate(v):
                        param_name = f"{col_name}_notin_{idx}"
                        placeholders.append(f":{param_name}")
                        params[param_name] = val
                    clauses.append(f"{col_name} NOT IN ({', '.join(placeholders)})")
                else:
                    # If empty list, do nothing or force true clause
                    clauses.append("1=1")
            else:
                clauses.append(f"{k} = :{k}")
                params[k] = v
        where_str = " AND ".join(clauses) if clauses else "1=1"
        return where_str, params

    def query_first(self, table: str, query: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        where_clause, params = self._build_where_clause(query)
        sql = f"SELECT * FROM {table} WHERE {where_clause} LIMIT 1"
        conn = self._get_conn()
        try:
            cursor = self._get_cursor(conn)
            self._execute_sql(cursor, sql, params)
            row = cursor.fetchone()
            return self._deserialize_row(row) if row else None
        finally:
            conn.close()

    def query_all(self, table: str, query: Dict[str, Any]) -> List[Dict[str, Any]]:
        where_clause, params = self._build_where_clause(query)
        sql = f"SELECT * FROM {table} WHERE {where_clause}"
        conn = self._get_conn()
        try:
            cursor = self._get_cursor(conn)
            self._execute_sql(cursor, sql, params)
            rows = cursor.fetchall()
            return [self._deserialize_row(row) for row in rows]
        finally:
            conn.close()

def get_db():
    db = DBConnection()
    try:
        yield db
    finally:
        pass
