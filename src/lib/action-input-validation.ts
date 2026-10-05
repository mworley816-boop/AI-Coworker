export function validateActionInput(toolId:string|undefined,input:Record<string,unknown>|undefined){
  if(!toolId||!input)return {ok:true as const};
  const text=(key:string)=>typeof input[key]==="string"&&(input[key] as string).trim().length>0;
  if(toolId==="email.send"){
    if(!text("to")||!text("subject")||!text("body"))return {ok:false as const,reason:"Email actions require to, subject, and body"};
  }
  if(toolId==="calendar.write"){
    if(!text("action")||!text("title")||!text("start"))return {ok:false as const,reason:"Calendar actions require action, title, and start"};
  }
  if(toolId==="github.write"){
    if(!text("action"))return {ok:false as const,reason:"GitHub actions require an action"};
  }
  if(toolId==="database.write"){
    if(!text("operation"))return {ok:false as const,reason:"Database actions require an operation"};
  }
  return {ok:true as const};
}
