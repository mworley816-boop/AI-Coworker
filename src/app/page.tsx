import GoalComposer from "@/components/GoalComposer";
import AuthPanel from "@/components/AuthPanel";
import WorkspaceSummary from "@/components/WorkspaceSummary";

export default async function Home({searchParams}:{searchParams:Promise<{auth?:string;message?:string}>}){
 const q=await searchParams;
 return <main>
  <aside>
   <h2>AI Coworker</h2>
   <nav aria-label="Atlas navigation">
    <a href="/">Overview</a><br/>
    <a href="/coworkers">Coworkers</a><br/>
    <a href="/tasks">Tasks</a><br/>
    <a href="/activity">Activity</a><br/>
    <a href="/approvals">Approvals</a><br/>
    <a href="/connections">Connections</a><br/>
    <a href="/settings">Settings</a>
   </nav>
  </aside>
  <section>
   <AuthPanel status={q.auth} message={q.message}/>
   <header><div><p className="eyebrow">WORKSPACE</p><h1>Your AI coworkers</h1><p>Create workers, assign goals, and review everything they do.</p></div><button>+ New coworker</button></header>
   <p><a href="/scentmarked-content">Scentmarked content manager: perfume verification, catalog drafts, and graphics planning →</a></p>
   <WorkspaceSummary/>
   <p><a href="/tasks">Browse all tasks →</a> · <a href="/activity">View activity →</a> · <a href="/memory">Atlas memory →</a> · <a href="/tools">Tools & permissions →</a></p>
   <GoalComposer/>
  </section>
 </main>;
}
