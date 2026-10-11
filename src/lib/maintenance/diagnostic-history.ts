import type {DiagnosticFinding} from "./diagnostic-classification";

export type DiagnosticSnapshot = {at:string;categories:string[];highestSeverity:"info"|"warning"|"critical"};
const severityRank={info:0,warning:1,critical:2};
/** Retain only a bounded, non-sensitive history of classified health observations. */
export function appendDiagnosticSnapshot(history:DiagnosticSnapshot[]|unknown,at:string,findings:DiagnosticFinding[]):DiagnosticSnapshot[]{
 const previous=Array.isArray(history)?history.filter((item):item is DiagnosticSnapshot=>
  item!==null&&typeof item==="object"&&typeof item.at==="string"&&Array.isArray(item.categories)&&
  item.categories.every((category:unknown)=>typeof category==="string")&&
  ["info","warning","critical"].includes(item.highestSeverity)):[];
 const highestSeverity=findings.reduce<DiagnosticSnapshot["highestSeverity"]>((severity,finding)=>
  severityRank[finding.severity]>severityRank[severity]?finding.severity:severity,"info");
 return [...previous.slice(-95),{at,categories:[...new Set(findings.map(f=>f.category))],highestSeverity}];
}
