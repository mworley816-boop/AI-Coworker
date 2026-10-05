export const actionInputExamples={
  emailSend:{to:"person@example.com",subject:"Update",body:"Draft message"},
  calendarWrite:{action:"create",title:"Project review",start:"2026-10-06T14:00:00-04:00",end:"2026-10-06T14:30:00-04:00",description:"Review progress"},
  githubWrite:{action:"create_issue",params:{title:"Issue title",body:"Issue details"}},
  databaseWrite:{table:"memories",operation:"insert",values:{kind:"working",content:"Useful project fact",status:"candidate"}}
} as const;

export function actionInputHint(goal:string){
  const value=goal.toLowerCase();
  if(/email|message|send/.test(value))return JSON.stringify(actionInputExamples.emailSend,null,2);
  if(/calendar|meeting|schedule|event/.test(value))return JSON.stringify(actionInputExamples.calendarWrite,null,2);
  if(/github|issue|pull request|repository|commit/.test(value))return JSON.stringify(actionInputExamples.githubWrite,null,2);
  if(/memory|database|record/.test(value))return JSON.stringify(actionInputExamples.databaseWrite,null,2);
  return "";
}
