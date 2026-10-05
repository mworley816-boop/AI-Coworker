export function validateActionInput(toolId:string|undefined,input:Record<string,unknown>|undefined){
  if(!toolId)return {ok:true as const};
  if(!input)return {ok:false as const,reason:"Action details are required"};
  const text=(key:string)=>typeof input[key]==="string"&&(input[key] as string).trim().length>0;
  if(toolId==="email.send"){
    if(!text("to")||!text("subject")||!text("body"))return {ok:false as const,reason:"Email actions require to, subject, and body"};
    if(!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(String(input.to)))return {ok:false as const,reason:"Email recipient is invalid"};
    if(String(input.subject).trim().length>200)return {ok:false as const,reason:"Email subject is too long"};
    if(String(input.body).trim().length>20_000)return {ok:false as const,reason:"Email body is too long"};
  }
  if(toolId==="calendar.write"){
    const action=typeof input.action==="string"?input.action:"";
    if(!["create","update","delete"].includes(action))return {ok:false as const,reason:"Calendar action must be create, update, or delete"};
    if((action==="update"||action==="delete")&&!text("eventId"))return {ok:false as const,reason:"Calendar update/delete requires an event id"};
    if(action!=="delete"&&(!text("title")||!text("start")||!text("end")))return {ok:false as const,reason:"Calendar create/update requires title, start, and end"};
    if(action!=="delete"&&(Number.isNaN(Date.parse(String(input.start)))||Number.isNaN(Date.parse(String(input.end)))||Date.parse(String(input.end))<=Date.parse(String(input.start))))return {ok:false as const,reason:"Calendar end must be after a valid start time"};
  }
  if(toolId==="github.write"){
    const allowed=new Set(["create_branch","create_file","update_file","create_issue","comment_issue"]);
    if(!text("repository")||!/^[A-Za-z0-9_.-]+\\/[A-Za-z0-9_.-]+$/.test(String(input.repository)))return {ok:false as const,reason:"GitHub actions require a valid owner/repository"};
    if(!text("action")||!allowed.has(String(input.action)))return {ok:false as const,reason:"GitHub action is not permitted"};
  }
  if(toolId==="database.write"){
    if(input.table!=="memories")return {ok:false as const,reason:"Database actions currently support memories only"};
    if(input.operation!=="insert"&&input.operation!=="update")return {ok:false as const,reason:"Database operation must be insert or update"};
    if(input.operation==="update"&&!text("id"))return {ok:false as const,reason:"Database update requires a record id"};
    if(!input.values||typeof input.values!=="object"||Array.isArray(input.values))return {ok:false as const,reason:"Database action requires values"};
    const values=input.values as Record<string,unknown>;
    if("kind" in values&&!["working","long_term","project"].includes(String(values.kind)))return {ok:false as const,reason:"Memory kind is not permitted"};
    if("status" in values&&!["candidate","active"].includes(String(values.status)))return {ok:false as const,reason:"Memory status is not permitted"};
    if(typeof values.content!=="string"||!values.content.trim()||values.content.length>8000)return {ok:false as const,reason:"Memory content must be 1 to 8000 characters"};
  }
  return {ok:true as const};
}
