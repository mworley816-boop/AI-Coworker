import TaskList from "@/components/TaskList";
export default function TasksPage(){
 return <main className="run-page atlas-task-page">
  <section>
   <nav aria-label="Breadcrumb"><a href="/">← Back to Atlas</a></nav>
   <header className="calm-header"><div><p className="eyebrow">YOUR WORKSPACE</p><h1>Tasks</h1><p>Focus on what needs attention. Switch views whenever you need to.</p></div></header>
   <TaskList/>
  </section>
 </main>;
}
