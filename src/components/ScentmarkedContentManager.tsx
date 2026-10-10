"use client";
import {useEffect,useState} from "react";

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
 const [saving,setSaving]=useState(false);
 const [catalogBrand,setCatalogBrand]=useState("");
 const [catalogAliases,setCatalogAliases]=useState("");
 const [catalogChecking,setCatalogChecking]=useState(false);
 const [catalogResult,setCatalogResult]=useState("");
 const [catalogSnapshot,setCatalogSnapshot]=useState<{name:string;brand:string;aliases:string;scope:string;matchCount:number;truncated:boolean;reviewRequiredReasons:string[]}|null>(null);
 const [draftDescription,setDraftDescription]=useState("");
 const [draftNotes,setDraftNotes]=useState("");
 const [draftSources,setDraftSources]=useState("");
 const [proposalResult,setProposalResult]=useState("");
 const [proposalLoading,setProposalLoading]=useState(false);
 const [savedProposals,setSavedProposals]=useState<{id:string;brand:string;perfume_name:string;review_status:string;duplicate_check_status:string;created_at:string}[]>([]);
 const [proposalsMessage,setProposalsMessage]=useState("");
 const [proposalsLoading,setProposalsLoading]=useState(false);
 const [selectedProposal,setSelectedProposal]=useState<{id:string;brand:string;perfume_name:string;description:string;notes:string;source_leads:string[];duplicate_check_status:string;review_status:string}|null>(null);
 const [proposalDetailMessage,setProposalDetailMessage]=useState("");
 const [reviewHistory,setReviewHistory]=useState<{id:string;decision:string;rationale:string;created_at:string}[]>([]);
 const [reviewHistoryMessage,setReviewHistoryMessage]=useState("");
 const [reviewDecision,setReviewDecision]=useState<"NEEDS_CHANGES"|"REJECTED">("NEEDS_CHANGES");
 const [reviewRationale,setReviewRationale]=useState("");
 const [reviewSubmitting,setReviewSubmitting]=useState(false);
 const [reviewSubmitMessage,setReviewSubmitMessage]=useState("");
 async function submitReviewDecision(){
  if(!selectedProposal)return;
  if(reviewRationale.trim().length<10){setReviewSubmitMessage("Explain the decision in at least 10 characters.");return;}
  setReviewSubmitting(true);setReviewSubmitMessage("Recording decision…");
  try{
   const response=await fetch("/api/scentmarked-content/proposals/"+encodeURIComponent(selectedProposal.id)+"/decision",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({decision:reviewDecision,rationale:reviewRationale.trim()})});
   const data=await response.json() as {ok?:boolean;message?:string};
   setReviewSubmitMessage(data.message??(response.ok?"Decision recorded.":"Review could not be recorded."));
   if(response.ok&&data.ok){setReviewRationale("");void loadSavedProposals();void openProposal(selectedProposal.id);}
  }catch{setReviewSubmitMessage("Review service unavailable.");}
  finally{setReviewSubmitting(false);}
 }

 async function loadReviewHistory(id:string){
  setReviewHistory([]);setReviewHistoryMessage("Loading review history…");
  try{
   const response=await fetch("/api/scentmarked-content/proposals/"+encodeURIComponent(id)+"/reviews",{cache:"no-store"});
   const data=await response.json() as {ok?:boolean;message?:string;reviews?:typeof reviewHistory};
   if(!response.ok||!data.ok){setReviewHistoryMessage(data.message??"Unable to load review history.");return;}
   setReviewHistory(data.reviews??[]);
   setReviewHistoryMessage((data.reviews?.length??0)===0?"No review decisions recorded yet.":"Review history is read-only.");
  }catch{setReviewHistoryMessage("Unable to load review history.");}
 }

 async function openProposal(id:string){
  setProposalDetailMessage("Loading proposal…");setSelectedProposal(null);
  try{
   const response=await fetch("/api/scentmarked-content/proposals/"+encodeURIComponent(id),{cache:"no-store"});
   const data=await response.json() as {ok?:boolean;message?:string;proposal?:NonNullable<typeof selectedProposal>};
   if(!response.ok||!data.ok||!data.proposal){setProposalDetailMessage(data.message??"Unable to open proposal.");return;}
   setSelectedProposal(data.proposal);setProposalDetailMessage("");void loadReviewHistory(id);
  }catch{setProposalDetailMessage("Unable to open proposal.");}
 }

 async function loadSavedProposals(){
  setProposalsLoading(true);
  try{
   const response=await fetch("/api/scentmarked-content/proposals",{cache:"no-store"});
   const data=await response.json() as {ok?:boolean;message?:string;proposals?:typeof savedProposals};
   if(!response.ok||!data.ok){setProposalsMessage(data.message??"Unable to load proposals.");return;}
   setSavedProposals(data.proposals??[]);
   setProposalsMessage((data.proposals?.length??0)===0?"No saved proposals yet.":"Showing your latest saved review proposals.");
  }catch{setProposalsMessage("Unable to connect to saved proposals.");}
  finally{setProposalsLoading(false);}
 }
 useEffect(()=>{void loadSavedProposals();},[]);

 async function previewProposal(){
  if(!catalogSnapshot||catalogSnapshot.name!==subject.trim()||catalogSnapshot.brand!==catalogBrand.trim()||catalogSnapshot.aliases!==catalogAliases.trim()){setProposalResult("Run a current catalog lookup first.");return;}
  if(catalogSnapshot.truncated||catalogSnapshot.reviewRequiredReasons.includes("EXACT_DUPLICATE_CANDIDATE")){setProposalResult("Review duplicate candidates before preparing a new entry.");return;}
  setProposalLoading(true);setProposalResult("Validating proposal…");
  try{const response=await fetch("/api/scentmarked-content/proposal",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({brand:catalogBrand.trim(),name:subject.trim(),description:draftDescription,notes:draftNotes,sources:draftSources.trim()?draftSources.trim().split(/[\\s,]+/).filter(Boolean):[]})});const data=await response.json() as {ok?:boolean;message?:string;duplicateCheckStatus?:string;proposal?:{brand:string;name:string;claimStatus:string;duplicateCheckStatus:string;approvalStatus:string;approvalRequirements?:string[];canCreateDraft:boolean}};if(response.ok&&data.ok&&data.proposal)void loadSavedProposals();setProposalResult(response.ok&&data.ok&&data.proposal?`Validated review-only proposal: ${data.proposal.brand} — ${data.proposal.name}. Claims: ${data.proposal.claimStatus}; server duplicate check: ${data.proposal.duplicateCheckStatus}; approval: ${data.proposal.approvalStatus}; draft creation: ${data.proposal.canCreateDraft?"enabled":"disabled"}. Remaining requirements: ${(data.proposal.approvalRequirements??[]).map(item=>item.replace(/_/g," ").toLowerCase()).join("; ")||"not provided"}. No catalog changes made.`:`${data.message??"Proposal validation failed."}${data.duplicateCheckStatus?` (duplicate check: ${data.duplicateCheckStatus})`:""}`); }catch{setProposalResult("Proposal API unavailable.");}finally{setProposalLoading(false);}
 }
 const [evidenceChecklist,setEvidenceChecklist]=useState({manufacturer:false,notes:false,duplicates:false,rights:false});
 async function checkCatalog(){const name=subject.trim();if(name.length<2){setCatalogResult("Enter a perfume name first.");return;}setCatalogChecking(true);setCatalogSnapshot(null);setCatalogResult("Checking visible Scentmarked catalog records…");try{const response=await fetch("/api/scentmarked-content/catalog-lookup?name="+encodeURIComponent(name)+"&brand="+encodeURIComponent(catalogBrand.trim())+"&aliases="+encodeURIComponent(catalogAliases.trim()),{cache:"no-store"});const data=await response.json() as {ok?:boolean;message?:string;scope?:string;truncated?:boolean;reviewRequiredReasons?:string[];matches?:{name:string;slug:string;brandName?:string|null;brandMatch?:boolean|null;matchClass?:"EXACT_BRAND_AND_NAME"|"DIFFERENT_BRAND"|"REVIEW_CANDIDATE"}[]};if(response.ok&&data.ok)setCatalogSnapshot({name,brand:catalogBrand.trim(),aliases:catalogAliases.trim(),scope:data.scope??"unknown",matchCount:data.matches?.length??0,truncated:Boolean(data.truncated),reviewRequiredReasons:data.reviewRequiredReasons??[]});setCatalogResult((!data.ok?"Catalog lookup unavailable: "+(data.message??"Unknown error"):data.matches?.length?"Potential matches: "+data.matches.map(m=>(m.brandName?m.brandName+" — ":"")+m.name+" ("+m.slug+")"+(catalogBrand.trim()?(m.matchClass==="EXACT_BRAND_AND_NAME"?" [exact brand and name]":m.matchClass==="DIFFERENT_BRAND"?" [different brand]":" [review candidate]"):"")).join("; ")+". "+(data.scope==="service_role_read"?"Draft-inclusive query; brand and alternate names still need review.":"Public-only query; private drafts may be missing."):"No name matches found. "+(data.scope==="service_role_read"?"Drafts included; alternate spellings and brand identity still need review." :"Private drafts and alternate spellings are not ruled out."))+(data.truncated?" WARNING: More than 15 candidates found; results are truncated. Duplicate check is incomplete.":"")+(data.reviewRequiredReasons?.length?" Creation on hold: "+data.reviewRequiredReasons.map(reason=>reason.replace(/_/g," ").toLowerCase()).join("; ")+".":""));}catch{setCatalogResult("Catalog lookup could not connect.");}finally{setCatalogChecking(false);}}
 const [testing,setTesting]=useState(false);
 const [testResult,setTestResult]=useState("");
 const [readiness,setReadiness]=useState("Checking research configuration…");
 const [catalogReadiness,setCatalogReadiness]=useState("Checking catalog configuration…");
 useEffect(()=>{let active=true;fetch("/api/scentmarked-content/status",{cache:"no-store"}).then(async response=>{const data=await response.json() as {catalogConfigured?:boolean;catalogPrivilegedConfigured?:boolean;researchConfigured?:boolean;researchPermission?:"enabled"|"disabled"|"not_initialized";reason?:string};if(active)setCatalogReadiness(response.ok?(data.catalogPrivilegedConfigured?"Draft-inclusive catalog credentials configured (connection not yet tested)":data.catalogConfigured?"Public-only catalog configured (connection not yet tested)":"Catalog connection not configured"):"Catalog status unavailable");if(active)setReadiness(response.ok?(!data.researchConfigured?"Research provider not configured":data.researchPermission!=="enabled"?"Research configured, but Atlas web research permission is not enabled":"Research configured and permitted (connection not yet tested)"):(data.reason||"Research status unavailable"));}).catch(()=>{if(active)setReadiness("Research status unavailable");});return ()=>{active=false;};},[]);
 const [runId,setRunId]=useState<string|null>(null);
 const selected=workflows.find(item=>item.id===workflow)!;
 function prepare(){
  const value=subject.trim();
  if(!value){setMessage("Enter a perfume or graphic description first.");return;}
  if(workflow==="add"&&!catalogBrand.trim()){setMessage("Enter the perfume brand before preparing a catalog proposal; brand identity is required for duplicate review.");return;}
  if(workflow==="add"&&draftSources.trim()&&!draftSources.trim().split(/[\s,]+/).filter(Boolean).every(source=>{try{const url=new URL(source);return url.protocol==="https:"||url.protocol==="http:";}catch{return false;}})){setMessage("Evidence leads must be full http:// or https:// URLs separated by spaces, commas, or new lines.");return;}
  if(workflow==="add"&&(!catalogSnapshot||catalogSnapshot.name!==value||catalogSnapshot.brand!==catalogBrand.trim()||catalogSnapshot.aliases!==catalogAliases.trim())){setMessage("Run the Scentmarked catalog duplicate check for this exact perfume, brand, and aliases before preparing a proposal.");return;}
  if(workflow==="add"&&catalogSnapshot&&(catalogSnapshot.truncated||catalogSnapshot.reviewRequiredReasons.includes("EXACT_DUPLICATE_CANDIDATE"))){setMessage(catalogSnapshot.truncated?"Catalog results were truncated. Refine the search and review all candidates before preparing a new-entry proposal.":"An exact brand-and-name duplicate candidate was found. Review the existing record instead of preparing a new-entry proposal.");return;}
  const goal=workflow==="verify"
   ?`Research and verify Scentmarked perfume "${value}" using attributable manufacturer sources where possible. Check existing catalog records for duplicates and conflicting notes, release details, and concentration. Produce a cited diagnostic report only; do not write to the database or publish.`
   :workflow==="add"
   ?`Prepare a review-only Scentmarked catalog entry for brand "${catalogBrand.trim()}", perfume "${value}". Check existing records for duplicates, collect attributable sources for fragrance notes and release information, identify missing fields, and propose a record. Do not create, update, or publish any perfume.`
   :`Prepare a review-only Scentmarked graphics placement plan for "${value}". Check image rights, accessibility alt text, size and format, target placement, and approval requirements. Do not upload, replace, or publish graphics.`;
  const lookupCurrent=Boolean(catalogSnapshot&&catalogSnapshot.name===value&&catalogSnapshot.brand===catalogBrand.trim()&&catalogSnapshot.aliases===catalogAliases.trim());
  const lookupSummary=workflow==="add"?` Catalog lookup snapshot: ${lookupCurrent?`scope=${catalogSnapshot!.scope}; candidates=${catalogSnapshot!.matchCount}; truncated=${catalogSnapshot!.truncated}; review reasons=${catalogSnapshot!.reviewRequiredReasons.join(",")||"none reported"}`:"NOT RUN OR STALE for the current name, brand and aliases"}. This snapshot is a candidate search, not proof of absence or permission to create. Recheck server-side before any write.`:"";
  const approvalBoundary=workflow==="add"?" APPROVAL STATUS: PENDING_ADMIN_REVIEW. This task is not an approved catalog record, does not grant write credentials, and cannot publish. Require fresh server-side duplicate validation, authenticated Scentmarked administrator approval, and an auditable create-draft action before any write.":"";
  const evidenceReview=workflow==="add"?` EVIDENCE REVIEW FLAGS (user attestation, not independently validated): manufacturer source checked=${evidenceChecklist.manufacturer}; note claims cross-checked=${evidenceChecklist.notes}; duplicate candidates manually reviewed=${evidenceChecklist.duplicates}; image rights checked=${evidenceChecklist.rights}. These flags never authorize writes and must not be represented as Atlas verification.`:"";
  const draftContext=workflow==="add"?` USER-SUPPLIED UNVERIFIED CLAIMS — do not treat these as verified facts: description: ${draftDescription.trim()||"not provided"}; fragrance notes: ${draftNotes.trim()||"not provided"}. SOURCE LEADS ONLY (not validated citations): ${draftSources.trim()||"not provided"}. Independently verify every proposed fact against its attributable source. Include source URL and verified/contradicted/unverified status per claim. Duplicate lookup must be reviewed independently before any creation. Output a review-only proposal with no write or publishing permission.`:"";
  const extra=(notes.trim()?` Additional context: ${notes.trim()}`:"")+draftContext+evidenceReview+lookupSummary+approvalBoundary;
  navigator.clipboard.writeText(goal+extra).then(()=>setMessage("Task instructions copied. Paste them into Atlas's goal composer on the Overview page. This is planning only, not a completed task.")).catch(()=>setMessage("Clipboard unavailable. Select and copy the task instructions below."));
  setPrepared(goal+extra);
 }
 async function testResearch(){if(testing)return;setTesting(true);setTestResult("Testing research connection…");try{const response=await fetch("/api/scentmarked-content/test-research",{method:"POST"});const result=await response.json() as {ok?:boolean;message?:string;sourceCount?:number;sourceHosts?:string[]};setTestResult(result.ok?`Research connection succeeded: ${result.sourceCount??0} source leads returned (not yet verified). Hosts: ${(result.sourceHosts??[]).join(", ")||"none"}.`:`Research test failed: ${result.message||"Unknown error"}`);}catch{setTestResult("Research test could not connect to Atlas.");}finally{setTesting(false);}}
 const [prepared,setPrepared]=useState("");
 async function saveTask(){if(!prepared||saving)return;setSaving(true);setMessage("Saving task…");try{const response=await fetch("/api/runs/create",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({goal:prepared})});const result=await response.json() as {persisted?:boolean;reason?:string;runId?:string};if(response.ok&&result.persisted&&result.runId){setRunId(result.runId);setMessage("Task saved to Atlas. This does not publish or upload content.");}else{setMessage(result.reason||"Unable to save task.");}}catch{setMessage("Could not connect to Atlas. Try again.");}finally{setSaving(false);}}

 return <section><p className="eyebrow">SCENTMARKED CONTENT WORKFLOWS</p><h1>Content Manager</h1><p role="status">{readiness}</p><p role="status">{catalogReadiness}</p><p><label htmlFor="catalog-brand">Brand for duplicate check (optional)</label><input id="catalog-brand" value={catalogBrand} onChange={event=>setCatalogBrand(event.target.value)} maxLength={120}/></p><p><label htmlFor="catalog-aliases">Alternate names (comma-separated, up to five)</label><input id="catalog-aliases" value={catalogAliases} onChange={event=>setCatalogAliases(event.target.value)} maxLength={600}/></p><p><button type="button" onClick={checkCatalog} disabled={catalogChecking}>{catalogChecking?"Checking catalog…":"Check Scentmarked catalog"}</button></p>{catalogResult?<p role="status">{catalogResult}</p>:null}<p><button type="button" onClick={testResearch} disabled={testing}>{testing?"Testing…":"Test research connection"}</button></p>{testResult?<p role="status">{testResult}</p>:null}<p>Prepare perfume verification, catalog entry, and graphics tasks. These are review-only task templates; Atlas cannot yet write perfume records or upload media automatically.</p><div className="card"><label htmlFor="content-workflow">Workflow</label><select id="content-workflow" value={workflow} onChange={event=>{setWorkflow(event.target.value as Workflow);setPrepared("");setMessage("");setRunId(null);}}>{workflows.map(item=><option key={item.id} value={item.id}>{item.title}</option>)}</select><p>{selected.description}</p><label htmlFor="content-subject">{selected.placeholder}</label><input id="content-subject" value={subject} onChange={event=>setSubject(event.target.value)} maxLength={160}/>{workflow==="add"?<><p><button type="button" onClick={previewProposal} disabled={proposalLoading}>{proposalLoading?"Validating…":"Validate structured proposal"}</button></p>{proposalResult?<p role="status">{proposalResult}</p>:null}<label htmlFor="draft-description">Proposed description (unverified)</label><textarea id="draft-description" value={draftDescription} onChange={event=>setDraftDescription(event.target.value)} maxLength={1200}/><label htmlFor="draft-notes">Proposed fragrance notes (unverified)</label><textarea id="draft-notes" value={draftNotes} onChange={event=>setDraftNotes(event.target.value)} maxLength={800}/><fieldset><legend>Manual evidence review (not independently verified by Atlas)</legend>{([["manufacturer","Manufacturer source checked"],["notes","Fragrance notes cross-checked"],["duplicates","Duplicate candidates reviewed"],["rights","Image rights reviewed"]] as const).map(([key,label])=><label key={key} style={{display:"block"}}><input type="checkbox" checked={evidenceChecklist[key]} onChange={event=>setEvidenceChecklist(current=>({...current,[key]:event.target.checked}))}/>{label}</label>)}</fieldset><label htmlFor="draft-sources">Evidence URLs to review</label><textarea id="draft-sources" value={draftSources} onChange={event=>setDraftSources(event.target.value)} maxLength={1500}/></>:null}<label htmlFor="content-notes">Additional context (optional)</label><textarea id="content-notes" value={notes} onChange={event=>setNotes(event.target.value)} maxLength={1000} placeholder="Known sources, existing profile URL, image placement, or review instructions"/><p><button type="button" onClick={prepare}>Prepare review-only task</button></p>{message?<p role="status">{message}</p>:null}{prepared?<><label htmlFor="prepared-task">Prepared task instructions</label><textarea id="prepared-task" readOnly value={prepared} rows={7}/><p><button type="button" onClick={saveTask} disabled={saving||!!runId}>{saving?"Saving…":runId?"Task saved":"Save task to Atlas"}</button></p>{runId?<p><a href={`/runs/${runId}`}>Open saved run →</a></p>:null}</>:null}</div><section className="card" aria-label="Saved perfume proposals"><h2>Saved perfume proposals</h2><p>Review-only records in Atlas; no Scentmarked catalog drafts have been created.</p><button type="button" onClick={loadSavedProposals} disabled={proposalsLoading}>{proposalsLoading?"Refreshing…":"Refresh saved proposals"}</button><p role="status">{proposalsMessage}</p><ul>{savedProposals.map(proposal=><li key={proposal.id}><strong>{proposal.brand} — {proposal.perfume_name}</strong> · {proposal.review_status.replace(/_/g," ")} · {proposal.duplicate_check_status.replace(/_/g," ")} · {new Date(proposal.created_at).toLocaleDateString()} <button type="button" onClick={()=>openProposal(proposal.id)}>Review details</button></li>)}</ul><p role="status">{proposalDetailMessage}</p>{selectedProposal?<article><h3>{selectedProposal.brand} — {selectedProposal.perfume_name}</h3><p>Status: {selectedProposal.review_status.replace(/_/g," ")}. Duplicate check: {selectedProposal.duplicate_check_status.replace(/_/g," ")}.</p><h4>Proposed description (unverified)</h4><p>{selectedProposal.description||"Not provided"}</p><h4>Proposed notes (unverified)</h4><p>{selectedProposal.notes||"Not provided"}</p><h4>Source leads (not independently verified)</h4><ul>{selectedProposal.source_leads.map(url=><li key={url}><a href={url} target="_blank" rel="noopener noreferrer">{url}</a></li>)}</ul><h4>Review history</h4><p role="status">{reviewHistoryMessage}</p><ul>{reviewHistory.map(review=><li key={review.id}>{review.decision.replace(/_/g," ")} · {new Date(review.created_at).toLocaleString()} — {review.rationale}</li>)}</ul><fieldset><legend>Reviewer decision (authorized reviewers only)</legend><p>Decisions are recorded with an audit trail. Rejections and changes requests do not publish or create perfumes.</p><label htmlFor="review-decision">Decision</label><select id="review-decision" value={reviewDecision} onChange={event=>setReviewDecision(event.target.value as "NEEDS_CHANGES"|"REJECTED")}><option value="NEEDS_CHANGES">Request changes</option><option value="REJECTED">Reject proposal</option></select><label htmlFor="review-rationale">Explanation (required)</label><textarea id="review-rationale" value={reviewRationale} onChange={event=>setReviewRationale(event.target.value)} minLength={10} maxLength={2000}/><button type="button" disabled={reviewSubmitting||selectedProposal.review_status!=="PENDING_ADMIN_REVIEW"||reviewRationale.trim().length<10} onClick={submitReviewDecision}>{reviewSubmitting?"Recording…":"Record review decision"}</button><p role="status">{reviewSubmitMessage}</p></fieldset><p>Approval and Scentmarked draft creation are not enabled.</p></article>:null}</section></section>;
}
