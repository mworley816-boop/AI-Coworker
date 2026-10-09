export type PlannedStep={position:number;kind:"reason"|"research"|"analyze"|"draft"|"approval";title:string;requiresApproval:boolean;toolId?:string;actionToolId?:string};
const scentmarked=/scentmarked|perfume|fragrance/i;
function researchTool(goal:string){if(/\b(email|gmail|inbox|mail)\b/i.test(goal)&&!/^\s*send\b/i.test(goal))return "email.read";if(/\b(calendar|meeting|appointment|event|schedule)\b/i.test(goal)&&!(/\b(create|add|update|change|delete|remove|schedule)\b/i.test(goal)))return "calendar.read";if(/\b(find|search|locate|look for)\b/i.test(goal)&&/\b(file|document|drive|pdf|sheet|spreadsheet)\b/i.test(goal))return "files.search";if(/\b(file|document|attachment|pdf)\b/i.test(goal))return "files.read";if(/\b(github|repository|repo|pull request|commit|issue)\b/i.test(goal))return "github.read";if(/\b(database|record|records|memory|memories|task|run)\b/i.test(goal))return "database.read";return "web.research";}
function actionTool(goal:string){if(/\b(send|email|mail)\b/i.test(goal))return "email.send";if(/\b(calendar|schedule|meeting|event)\b/i.test(goal)&&/\b(create|add|update|change|delete|remove|schedule)\b/i.test(goal))return "calendar.write";if(/\b(github|repository|repo|pull request|commit|issue)\b/i.test(goal)&&/\b(create|update|change|write|comment|branch)\b/i.test(goal))return "github.write";if(/\b(memory|memories)\b/i.test(goal)&&/\b(save|add|update|change|write|remember)\b/i.test(goal))return "database.write";return undefined;}
function scentmarkedContentPlan(goal:string):PlannedStep[]|null{
 const isContent=/\bScentmarked\b/i.test(goal)&&/\breview-only\b/i.test(goal);
 if(!isContent)return null;
 const verification=/\bresearch and verify\b/i.test(goal);
 const entry=/\bcatalog entry\b/i.test(goal);
 const graphics=/\bgraphics placement plan\b/i.test(goal);
 if(!verification&&!entry&&!graphics)return null;
 const subject=verification?"perfume verification":entry?"catalog entry":"graphics placement";
 const research=graphics?"Check image usage rights, accessibility, format, and target placement": "Collect attributable manufacturer sources and inspect existing perfume records for duplicates";
 const analysis=graphics?"Identify missing assets, rights restrictions, and placement requirements":"Compare source evidence, fragrance notes, release details, and conflicting records";
 return [
  {position:1,kind:"reason",title:`Define ${subject} review criteria and identify the target`,requiresApproval:false},
  {position:2,kind:"research",title:research,requiresApproval:false,toolId:"web.research"},
  {position:3,kind:"analyze",title:analysis,requiresApproval:false},
  {position:4,kind:"draft",title:`Prepare a source-aware ${subject} proposal with unresolved questions`,requiresApproval:false},
  {position:5,kind:"approval",title:"Hold for human review; do not publish, upload, or modify the catalog",requiresApproval:false}
 ];
}
export function planGoal(goal:string):PlannedStep[]{const contentPlan=scentmarkedContentPlan(goal);if(contentPlan)return contentPlan;const toolId=researchTool(goal);const actionToolId=actionTool(goal);const titles:Record<string,string>={"email.read":"Search the connected inbox for relevant messages","calendar.read":"Check the connected calendar for relevant events","files.search":"Search connected Drive files","files.read":"Read the explicitly connected file required for the task","github.read":"Inspect the relevant permitted GitHub resource","database.read":"Inspect permitted workspace records required for the task"};const sourceTitle=titles[toolId]??(scentmarked.test(goal)?"Research relevant public information without modifying Scentmarked":"Gather the public information required for the task");return [{position:1,kind:"reason",title:"Understand the goal and success criteria",requiresApproval:false},{position:2,kind:"research",title:sourceTitle,requiresApproval:false,toolId},{position:3,kind:"analyze",title:"Analyze findings and decide the safest next actions",requiresApproval:false},{position:4,kind:"draft",title:"Prepare proposed changes or deliverables",requiresApproval:false},{position:5,kind:"approval",title:actionToolId?"Request approval for the proposed external action":"Confirm no external action is required",requiresApproval:Boolean(actionToolId),actionToolId}]}
