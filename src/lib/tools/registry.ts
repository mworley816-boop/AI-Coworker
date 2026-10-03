export type ToolAccess="read"|"write";
export type ToolDefinition={id:string;name:string;description:string;access:ToolAccess;requiresApproval:boolean;enabled:boolean};
export const toolRegistry:ToolDefinition[]=[
{id:"web.research",name:"Web Research",description:"Research public web information and return sources.",access:"read",requiresApproval:false,enabled:false},
{id:"files.read",name:"Files Read",description:"Read explicitly connected workspace files.",access:"read",requiresApproval:false,enabled:false},
{id:"database.read",name:"Database Read",description:"Read permitted project database records.",access:"read",requiresApproval:false,enabled:false},
{id:"database.write",name:"Database Write",description:"Create or modify permitted database records.",access:"write",requiresApproval:true,enabled:false},
{id:"github.read",name:"GitHub Read",description:"Inspect permitted repositories, commits, issues, and pull requests.",access:"read",requiresApproval:false,enabled:false},
{id:"github.write",name:"GitHub Write",description:"Modify permitted repositories or pull requests.",access:"write",requiresApproval:true,enabled:false},
{id:"email.send",name:"Email Send",description:"Send email through an explicitly connected account.",access:"write",requiresApproval:true,enabled:false},
{id:"calendar.write",name:"Calendar Write",description:"Create or modify calendar events.",access:"write",requiresApproval:true,enabled:false}
];
export function getTool(id:string){return toolRegistry.find(t=>t.id===id);}
export function canExecuteTool(id:string,approved=false){const tool=getTool(id);if(!tool||!tool.enabled)return {allowed:false,reason:"Tool is not enabled"};if(tool.requiresApproval&&!approved)return {allowed:false,reason:"Approval is required"};return {allowed:true,tool};}