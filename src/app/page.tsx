import GoalComposer from "@/components/GoalComposer";
import AuthPanel from "@/components/AuthPanel";
import WorkspaceSummary from "@/components/WorkspaceSummary";
import AttentionHub from "@/components/AttentionHub";

export default async function Home({searchParams}:{searchParams:Promise<{auth?:string;message?:string}>}){
 const q=await searchParams;
 return <main className="atlas-home">
  <aside className="atlas-sidebar">
   <h2>Atlas</h2>
   <p className="sidebar-caption">Your AI workspace</p>
   <nav aria-label="Atlas navigation" className="atlas-nav">
    <a href="/" aria-current="page">Overview</a>
    <a href="/tasks">Tasks</a>
    <a href="/approvals">Needs review</a>
    <a href="/coworkers">Coworkers</a>
    <a href="/scentmarked-content">Scentmarked</a>
    <details><summary>More tools</summary>
     <a href="/activity">Activity</a>
     <a href="/connections">Connections</a>
     <a href="/scentmarked-content/graphics">Graphics queue</a>
     <a href="/scentmarked-content/research">Perfume research</a>
     <a href="/memory">Memory</a>
     <a href="/tools">Permissions</a>
    </details>
   </nav>
  </aside>
  <section className="atlas-main">
   <AuthPanel status={q.auth} message={q.message}/>
   <header className="calm-header"><div><p className="eyebrow">YOUR WORKSPACE</p><h1>Welcome to Atlas</h1><p>See what needs attention, then choose your next step.</p></div></header>
   <AttentionHub/>
   <section className="calm-section" aria-labelledby="overview-title"><h2 id="overview-title">Workspace overview</h2><WorkspaceSummary/></section>
   <details className="calm-expand"><summary>Start a new goal</summary><GoalComposer/></details>
  </section>
 </main>;
}
