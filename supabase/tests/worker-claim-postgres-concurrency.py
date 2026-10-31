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
USER = str(uuid.uuid4())
OTHER_USER = str(uuid.uuid4())
COWORKER_A = str(uuid.uuid4())
COWORKER_B = str(uuid.uuid4())


def connect():
    return psycopg.connect(DSN, autocommit=True)


def prepare():
    with connect() as conn:
        conn.execute("CREATE SCHEMA IF NOT EXISTS public")
        conn.execute("CREATE TABLE public.tasks (id uuid primary key, status text not null, created_at timestamptz default now())")
        conn.execute("CREATE TABLE public.runs (id uuid primary key, task_id uuid references public.tasks(id), status text not null, created_at timestamptz default now(), lease_owner text, lease_expires_at timestamptz)")
        conn.execute("CREATE SCHEMA auth")
        conn.execute("CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $")
        conn.execute("ALTER TABLE public.tasks ADD COLUMN user_id uuid")
        conn.execute("ALTER TABLE public.tasks ADD COLUMN coworker_id uuid")
        conn.execute("CREATE TABLE public.coworkers(id uuid primary key,user_id uuid not null)")
        conn.execute("CREATE TABLE public.run_steps(id uuid primary key,run_id uuid,status text)")
        conn.execute("CREATE TABLE public.approvals(id uuid primary key,run_id uuid)")
        conn.execute("INSERT INTO public.coworkers(id,user_id) VALUES (%s,%s),(%s,%s)", (COWORKER_A,USER,COWORKER_B,USER))
        # SQL functions are loaded from the actual migrations under test.
        for filename in (
            "20261027010001_worker_parent_task_claim_lock.sql",
            "20261027010002_manual_claim_parent_task_lock.sql",
            "20261027010003_worker_reassignment_lease_guard.sql",
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

    # With only one fresh queued run, competing workers must not both claim it.
    # Existing runs are actively leased and therefore ineligible for new owners.
    solo_task, solo_run = str(uuid.uuid4()), str(uuid.uuid4())
    with connect() as conn:
        conn.execute("INSERT INTO public.tasks(id,status) VALUES (%s,'queued')", (solo_task,))
        conn.execute("INSERT INTO public.runs(id,task_id,status) VALUES (%s,%s,'queued')", (solo_run, solo_task))
    for attempt in range(5):
        with connect() as conn:
            conn.execute("UPDATE public.runs SET lease_owner=NULL, lease_expires_at=NULL WHERE id=%s", (solo_run,))
        barrier = threading.Barrier(2)
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
            futures = [pool.submit(claim, owner, barrier) for owner in ("solo-a", "solo-b")]
            results = [f.result(timeout=20) for f in futures]
        claimed = [str(row[0]) for rows in results for row in rows]
        assert claimed == [solo_run], f"Single-run claim collision in attempt {attempt + 1}: {len(claimed)}"
    print("PASS: five simultaneous single-run claim races yielded one winner each")
    # Verify that a task row locked for reassignment is skipped by the worker.
    blocked_task, blocked_run = str(uuid.uuid4()), str(uuid.uuid4())
    with connect() as conn:
        conn.execute("INSERT INTO public.tasks(id,status) VALUES (%s,'queued')", (blocked_task,))
        conn.execute("INSERT INTO public.runs(id,task_id,status) VALUES (%s,%s,'queued')", (blocked_run,blocked_task))
    with psycopg.connect(DSN, autocommit=False) as locker:
        locker.execute("SELECT id FROM public.tasks WHERE id=%s FOR UPDATE", (blocked_task,))
        with connect() as contender:
            contender.execute("SET statement_timeout='3000ms'")
            claimed = contender.execute("SELECT id FROM public.claim_next_queued_run(%s,60)", ("claim-during-reassignment",)).fetchall()
            assert not claimed, "Worker claimed a task held by reassignment lock"
        locker.commit()
    with connect() as conn:
        claimed = conn.execute("SELECT id FROM public.claim_next_queued_run(%s,60)", ("claim-after-reassignment",)).fetchall()
        assert [str(row[0]) for row in claimed] == [blocked_run], "Worker did not recover after lock released"
    print("PASS: task reassignment lock excludes worker claim until released")
    # Execute the actual atomic reassignment function against synthetic rows.
    eligible_task, eligible_run = str(uuid.uuid4()), str(uuid.uuid4())
    with connect() as conn:
        conn.execute("INSERT INTO public.tasks(id,status,user_id,coworker_id) VALUES (%s,'queued',%s,%s)", (eligible_task,USER,COWORKER_A))
        conn.execute("INSERT INTO public.runs(id,task_id,status) VALUES (%s,%s,'queued')", (eligible_run,eligible_task))
        conn.execute("SELECT set_config('request.jwt.claim.sub',%s,false)", (USER,))
        ok = conn.execute("SELECT public.reassign_queued_task_atomic(%s,%s)", (eligible_task,COWORKER_B)).fetchone()[0]
        assert ok is True, "Owner could not reassign an eligible task"
        assigned = conn.execute("SELECT coworker_id FROM public.tasks WHERE id=%s", (eligible_task,)).fetchone()[0]
        assert str(assigned) == COWORKER_B, "Reassignment did not persist"
        print("PASS: authorized owner reassigns eligible queued task")

        conn.execute("SELECT set_config('request.jwt.claim.sub',%s,false)", (OTHER_USER,))
        denied = conn.execute("SELECT public.reassign_queued_task_atomic(%s,%s)", (eligible_task,COWORKER_A)).fetchone()[0]
        assert denied is False, "Other user reassigned a task they do not own"
        print("PASS: other user cannot reassign task")

        conn.execute("SELECT set_config('request.jwt.claim.sub',%s,false)", (USER,))
        conn.execute("UPDATE public.runs SET lease_owner='active-worker',lease_expires_at=now()+interval '60 seconds' WHERE id=%s", (eligible_run,))
        denied = conn.execute("SELECT public.reassign_queued_task_atomic(%s,%s)", (eligible_task,COWORKER_A)).fetchone()[0]
        assert denied is False, "Reassignment bypassed active lease guard"
        print("PASS: atomic reassignment rejects active worker lease")





if __name__ == "__main__":
    main()
