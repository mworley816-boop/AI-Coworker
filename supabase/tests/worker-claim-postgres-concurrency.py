"""Disposable PostgreSQL concurrency smoke tests for Atlas claim functions.

Uses only synthetic tables and runs. No production database connection.
"""
import concurrent.futures
import os
import pathlib
import threading
import uuid

import psycopg

DSN = os.environ["ATLAS_TEST_DATABASE_URL"]
MIGRATIONS = pathlib.Path(__file__).resolve().parents[1] / "migrations"
TASK = str(uuid.uuid4())
RUN = str(uuid.uuid4())
TASK2 = str(uuid.uuid4())
RUN2 = str(uuid.uuid4())


def connect():
    return psycopg.connect(DSN, autocommit=True)


def prepare():
    with connect() as conn:
        conn.execute("CREATE SCHEMA IF NOT EXISTS public")
        conn.execute("CREATE TABLE public.tasks (id uuid primary key, status text not null, created_at timestamptz default now())")
        conn.execute("CREATE TABLE public.runs (id uuid primary key, task_id uuid references public.tasks(id), status text not null, created_at timestamptz default now(), lease_owner text, lease_expires_at timestamptz)")
        # SQL functions are loaded from the actual migrations under test.
        for filename in (
            "20261027010001_worker_parent_task_claim_lock.sql",
            "20261027010002_manual_claim_parent_task_lock.sql",
        ):
            conn.execute((MIGRATIONS / filename).read_text())
        for task, run in ((TASK, RUN), (TASK2, RUN2)):
            conn.execute("INSERT INTO public.tasks(id,status) VALUES (%s,'queued')", (task,))
            conn.execute("INSERT INTO public.runs(id,task_id,status) VALUES (%s,%s,'queued')", (run, task))


def claim(owner, barrier):
    with connect() as conn:
        barrier.wait(timeout=10)
        return conn.execute("SELECT id FROM public.claim_next_queued_run(%s,60)", (owner,)).fetchall()


def main():
    prepare()
    barrier = threading.Barrier(2)
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        futures = [pool.submit(claim, owner, barrier) for owner in ("worker-a", "worker-b")]
        results = [f.result(timeout=20) for f in futures]
    ids = [str(row[0]) for rows in results for row in rows]
    assert len(ids) == 2 and set(ids) == {RUN, RUN2}, f"Unexpected claim allocation: {len(ids)} claims"
    print("PASS: two concurrent workers claimed different tasks")

    with connect() as conn:
        # A different owner must not steal an active lease.
        stolen = conn.execute("SELECT id FROM public.claim_run_lease(%s,%s,60)", (RUN, "intruder")).fetchall()
        assert not stolen, "Active lease was stolen"
        print("PASS: manual claim cannot steal an unexpired lease")

        # The same owner is permitted to renew its own lease.
        owner = conn.execute("SELECT lease_owner FROM public.runs WHERE id=%s", (RUN,)).fetchone()[0]
        renewed = conn.execute("SELECT id FROM public.claim_run_lease(%s,%s,60)", (RUN, owner)).fetchall()
        assert len(renewed) == 1, "Same-owner renewal failed"
        print("PASS: same-owner manual lease renewal")

        # Expired leases become eligible for a different owner.
        conn.execute("UPDATE public.runs SET lease_expires_at=now()-interval '1 second' WHERE id=%s", (RUN,))
        recovered = conn.execute("SELECT id FROM public.claim_run_lease(%s,%s,60)", (RUN, "recovery-worker")).fetchall()
        assert len(recovered) == 1, "Expired lease recovery failed"
        print("PASS: expired manual lease recovery")


if __name__ == "__main__":
    main()
