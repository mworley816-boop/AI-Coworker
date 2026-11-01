"""Exercise staged reviewer RPC privilege SQL against disposable PostgreSQL."""
import os
from pathlib import Path
import psycopg

dsn = os.environ["ATLAS_TEST_DATABASE_URL"]
sql = Path(__file__).with_name("reviewer-rpc-permission-hardening.sql").read_text()
functions = [
    ("is_scentmarked_reviewer", ""),
    ("list_pending_scentmarked_proposals", "integer"),
    ("review_scentmarked_proposal", "uuid,text,text"),
]
with psycopg.connect(dsn, autocommit=True) as conn:
    conn.execute("create schema if not exists public")
    for name, args in functions:
        # No user data or production functions: stubs exist solely to test grants.
        argdecl = {"": "", "integer": "p_limit integer", "uuid,text,text": "p_id uuid, p_decision text, p_rationale text"}[args]
        conn.execute(f"create function public.{name}({argdecl}) returns boolean language sql as $$ select true $$")
    for name, args in functions:
        signature = f"public.{name}({args})"
        assert conn.execute("select has_function_privilege('anon', %s, 'EXECUTE')", (signature,)).fetchone()[0]
        assert conn.execute("select has_function_privilege('authenticated', %s, 'EXECUTE')", (signature,)).fetchone()[0]
    print("PASS: default PostgreSQL PUBLIC grants expose reviewer RPC stubs to anon")
    conn.execute(sql)
    for name, args in functions:
        signature = f"public.{name}({args})"
        assert not conn.execute("select has_function_privilege('anon', %s, 'EXECUTE')", (signature,)).fetchone()[0], signature
        assert conn.execute("select has_function_privilege('authenticated', %s, 'EXECUTE')", (signature,)).fetchone()[0], signature
    print("PASS: anon EXECUTE denied on all three reviewer RPCs")
    print("PASS: authenticated EXECUTE retained on all three reviewer RPCs")
