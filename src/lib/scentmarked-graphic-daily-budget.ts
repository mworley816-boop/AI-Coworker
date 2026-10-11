/** Pure daily quota decision; a database-backed atomic reservation is required before enforcement. */
export type DailyGraphicBudgetDecision={allowed:boolean;remaining:number;reason:string};
export function assessDailyGraphicBudget(input:{completedToday:number;reservedToday:number;requested:number;dailyLimit:number}):DailyGraphicBudgetDecision{
 const {completedToday,reservedToday,requested,dailyLimit}=input;
 if(![completedToday,reservedToday,requested,dailyLimit].every(Number.isSafeInteger)||completedToday<0||reservedToday<0||requested<1||requested>5||dailyLimit<1||dailyLimit>100)
  return {allowed:false,remaining:0,reason:"INVALID_BUDGET_INPUT"};
 const remaining=Math.max(0,dailyLimit-completedToday-reservedToday);
 return {allowed:requested<=remaining,remaining,reason:requested<=remaining?"WITHIN_DAILY_LIMIT":"DAILY_LIMIT_EXCEEDED"};
}
