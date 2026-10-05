export type ActionKind="email"|"calendar"|"github"|"database"|null;
export function detectActionKind(goal:string):ActionKind{
  const value=goal.toLowerCase();
  if(/email|send (a )?message/.test(value))return "email";
  if(/calendar|meeting|schedule|event/.test(value))return "calendar";
  if(/github|issue|pull request|repository|commit/.test(value))return "github";
  if(/memory|database|record/.test(value))return "database";
  return null;
}
