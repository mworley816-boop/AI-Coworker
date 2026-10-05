export function validateActionInput(toolId:string|undefined,input:Record<string,unknown>|undefined){
  if(!toolId)return {ok:true as const};
  if(!input)return {ok:false as const,reason:"Action details are required"};
  const text=(key:string)=>typeof input[key]==="string"&&(input[key] as string).trim().length>0;
  if(toolId==="email.send"){
    if(!text("to")||!text("subject")||!text("body"))return {ok:false as const,reason:"Email actions require to, subject, and body"};
  }
  if(toolId==="calendar.write"){
    const action=typeof input.action==="string"?input.action:"";
    if(!["create","update","delete"].includes(action))return {ok:false as const,reason:"Calendar action must be create, update, or delete"};
    if((action==="update"||action==="delete")&&!text("eventId"))return {ok:false as const,reason:"Calendar update/delete requires an event ID"};
    if(action!=="delete"&&(!text("title")||!text("start")||!text("end")))return {ok:false as const,reason:"Calendar create/update requires title, start, and end"};
  }
  if(toolId==="github.write"){
    const action=typeof input.action==="string"?input.action:"";
    if(!["create_branch","create_file","update_file","create_issue","comment_issue"].includes(action))return {ok:false as const,reason:"GitHub action is not permitted"};
  }
  if(toolId==="database.write"){
    const operation=typeof input.operation==="string"?input.operation:"";
    if(operation!=="insert"&&operation!=="update")return {ok:false as const,reason:"Database operation must be insert or update"};
    if(operation==="update"&&!text("id"))return {ok:false as const,reason:"Database update requires a record ID"};
    if(input.table!=="memories")return {ok:false as const,reason:"Only coworker memories are writable"};
    if(!input.values||typeof input.values!=="object"||Array.isArray(input.values))return {ok:false as const,reason:"Database action requires values"};
  }
  return {ok:true as const};
}
