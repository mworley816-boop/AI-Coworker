"""Exercise the hosted Atlas reviewer RPC bodies in disposable PostgreSQL only.

Function definitions below were inspected read-only from Atlas on 2026-10-31.
No hosted database writes occur. This fixture must be kept in sync with migrations.
"""
import os
import uuid
from pathlib import Path
import psycopg

dsn = os.environ["ATLAS_TEST_DATABASE_URL"]
hardening = Path(__file__).with_name("reviewer-rpc-permission-hardening.sql").read_text()
reviewer = str(uuid.uuid4())
outsider = str(uuid.uuid4())
proposal = str(uuid.uuid4())
with psycopg.connect(dsn, autocommit=True) as db:
    db.execute("create schema if not exists auth")
    db.execute("""create or replace function auth.uid() returns uuid language sql stable
        as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$""")
    db.execute("create table public.scentmarked_reviewers(user_id uuid primary key)")
    db.execute("""create table public.scentmarked_proposals(
        id uuid primary key,brand text,perfume_name text,
        created_at timestamptz default now(),review_status text)""")
    db.execute("""create table public.scentmarked_proposal_reviews(
        id uuid primary key default gen_random_uuid(),proposal_id uuid,
        reviewer_id uuid,decision text,rationale text)""")
    db.execute("insert into public.scentmarked_reviewers values (%s)",(reviewer,))
    db.execute("""insert into public.scentmarked_proposals(id,brand,perfume_name,review_status)
        values (%s,'Test Brand','Test Scent','PENDING_ADMIN_REVIEW')""",(proposal,))
    db.execute("""create or replace function public.is_scentmarked_reviewer()
        returns boolean language sql stable security definer set search_path to ''
        as $$ select auth.uid() is not null and exists(
          select 1 from public.scentmarked_reviewers where user_id=auth.uid()) $$""")
    db.execute("""create or replace function public.list_pending_scentmarked_proposals(p_limit integer default 30)
        returns table(id uuid,brand text,perfume_name text,created_at timestamptz)
        language plpgsql stable security definer set search_path to ''
        as $fn$ begin
          if auth.uid() is null or not exists(
            select 1 from public.scentmarked_reviewers r where r.user_id=auth.uid())
          then raise exception 'Reviewer authorization required' using errcode='42501'; end if;
          return query select p.id,p.brand,p.perfume_name,p.created_at
            from public.scentmarked_proposals p
            where p.review_status='PENDING_ADMIN_REVIEW'
            order by p.created_at asc,p.id asc
            limit least(greatest(coalesce(p_limit,30),1),50);
        end $fn$""")
    db.execute("""create or replace function public.review_scentmarked_proposal(
        p_proposal_id uuid,p_decision text,p_rationale text)
        returns uuid language plpgsql security definer set search_path to ''
        as $fn$ declare v_id uuid; begin
          if auth.uid() is null or not exists(
            select 1 from public.scentmarked_reviewers where user_id=auth.uid())
          then raise exception 'Not authorized to review proposals' using errcode='42501'; end if;
          if p_decision not in ('NEEDS_CHANGES','REJECTED')
            or length(trim(coalesce(p_rationale,''))) not between 10 and 2000
          then raise exception 'Invalid review decision or rationale' using errcode='22023'; end if;
          perform 1 from public.scentmarked_proposals
            where id=p_proposal_id and review_status='PENDING_ADMIN_REVIEW' for update;
          if not found then raise exception 'Proposal is not pending review' using errcode='22023'; end if;
          insert into public.scentmarked_proposal_reviews(proposal_id,reviewer_id,decision,rationale)
            values(p_proposal_id,auth.uid(),p_decision,trim(p_rationale)) returning id into v_id;
          update public.scentmarked_proposals set review_status=p_decision where id=p_proposal_id;
          return v_id;
        end $fn$""")
    db.execute(hardening)
    def call(role,identity,sql,args=(),error=None):
        try:
            with db.transaction():
                db.execute(f"set local role {role}")
                db.execute("select set_config('request.jwt.claim.sub',%s,true)",(identity,))
                result=db.execute(sql,args).fetchall()
                if error:
                    raise AssertionError(f"Expected SQLSTATE {error}: {sql}")
                return result
        except psycopg.Error as exc:
            if not error or exc.sqlstate != error:
                raise
    for identity in ("",outsider,reviewer):
        call("anon",identity,"select public.is_scentmarked_reviewer()",error="42501")
    assert call("authenticated",outsider,"select public.is_scentmarked_reviewer()")==[(False,)]
    assert call("authenticated",reviewer,"select public.is_scentmarked_reviewer()")==[(True,)]
    call("authenticated",outsider,"select * from public.list_pending_scentmarked_proposals(30)",error="42501")
    assert len(call("authenticated",reviewer,"select * from public.list_pending_scentmarked_proposals(30)"))==1
    call("authenticated",outsider,"select public.review_scentmarked_proposal(%s,'REJECTED','Valid rationale')",(proposal,),error="42501")
    call("authenticated",reviewer,"select public.review_scentmarked_proposal(%s,'APPROVED','Valid rationale')",(proposal,),error="22023")
    result=call("authenticated",reviewer,"select public.review_scentmarked_proposal(%s,'REJECTED','Valid rationale')",(proposal,))
    assert len(result)==1 and result[0][0]
    assert db.execute("select review_status from public.scentmarked_proposals where id=%s",(proposal,)).fetchone()[0]=="REJECTED"
    assert db.execute("select count(*) from public.scentmarked_proposal_reviews").fetchone()[0]==1
    call("authenticated",reviewer,"select public.review_scentmarked_proposal(%s,'REJECTED','Valid rationale')",(proposal,),error="22023")
    print("PASS: hosted reviewer function bodies enforce membership, decision validation and one-time review")
    print("PASS: anonymous calls blocked after staged hardening; authenticated reviewer workflow succeeds")
