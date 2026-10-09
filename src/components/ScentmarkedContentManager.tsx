"use client";
import {useState} from "react";

type Workflow="verify"|"add"|"graphics";
const workflows:{id:Workflow;title:string;description:string;placeholder:string}[]=[
 {id:"verify",title:"Verify perfume",description:"Research manufacturer evidence, notes, release information, and existing records. Flag conflicts for review.",placeholder:"Brand and perfume name"},
 {id:"add",title:"Prepare perfume entry",description:"Check duplicates and source evidence before proposing a new catalog record. No automatic publishing.",placeholder:"Brand and perfume name or collection"},
 {id:"graphics",title:"Plan graphics upload",description:"Prepare an image placement and rights checklist. Upload and publishing integrations are not connected yet.",placeholder:"Graphic filename or campaign description"}
];
export default function ScentmarkedContentManager(){
 const [workflow,setWorkflow]=useState<Workflow>("verify");
 const [subject,setSubject]=useState("");
 const [notes,setNotes]=useState("");
 const [message,setMessage]=useState("");
 const selected=workflows.find(item=>item.id===workflow)!;
 function prepare(){
  const value=subject.trim();
  if(!value){setMessage("Enter a perfume or graphic description first.");return;}
  const goal=workflow==="verify"
   ?`Research and verify Scentmarked perfume "${value}" using attributable manufacturer sources where possible. Check existing catalog records for duplicates and conflicting notes, release details, and concentration. Produce a cited diagnostic report only; do not write to the database or publish.`
   :workflow==="add"
   ?`Prepare a review-only Scentmarked catalog entry for "${value}". Check existing records for duplicates, collect attributable sources for fragrance notes and release information, identify missing fields, and propose a record. Do not create, update, or publish any perfume.`
   :`Prepare a review-only Scentmarked graphics placement plan for "${value}". Check image rights, accessibility alt text, size and format, target placement, and approval requirements. Do not upload, replace, or publish graphics.`;
  const extra=notes.trim()?` Additional context: ${notes.trim()}`:"";
  navigator.clipboard.writeText(goal+extra).then(()=>setMessage("Task instructions copied. Paste them into Atlas's goal composer on the Overview page. This is planning only, not a completed task.")).catch(()=>setMessage("Clipboard unavailable. Select and copy the task instructions below."));
  setPrepared(goal+extra);
 }
 const [prepared,setPrepared]=useState("");
 return <section><p className="eyebrow">SCENTMARKED CONTENT WORKFLOWS</p><h1>Content Manager</h1><p>Prepare perfume verification, catalog entry, and graphics tasks. These are review-only task templates; Atlas cannot yet write perfume records or upload media automatically.</p><div className="card"><label htmlFor="content-workflow">Workflow</label><select id="content-workflow" value={workflow} onChange={event=>{setWorkflow(event.target.value as Workflow);setPrepared("");setMessage("");}}>{workflows.map(item=><option key={item.id} value={item.id}>{item.title}</option>)}</select><p>{selected.description}</p><label htmlFor="content-subject">{selected.placeholder}</label><input id="content-subject" value={subject} onChange={event=>setSubject(event.target.value)} maxLength={160}/><label htmlFor="content-notes">Additional context (optional)</label><textarea id="content-notes" value={notes} onChange={event=>setNotes(event.target.value)} maxLength={1000} placeholder="Known sources, existing profile URL, image placement, or review instructions"/><p><button type="button" onClick={prepare}>Prepare review-only task</button></p>{message?<p role="status">{message}</p>:null}{prepared?<><label htmlFor="prepared-task">Prepared task instructions</label><textarea id="prepared-task" readOnly value={prepared} rows={7}/><p><a href="/">Open Atlas goal composer →</a></p></>:null}</div></section>;
}
