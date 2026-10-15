"use client";
import {useEffect,useState} from "react";
type House={house:string;total:number;statuses:Record<string,number>};
type PerfumeRecord={id:string;name:string;concentration:string|null;house:string;status:string};
const normalize=(value:string)=>value.normalize("NFKC").trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu," ");
function potentialDuplicates(records:PerfumeRecord[]){
 const groups=new Map<string,PerfumeRecord[]>();
 for(const r of records){const key=[r.house,r.name,r.concentration??""].map(normalize).join("|");const existing=groups.get(key)??[];existing.push(r);groups.set(key,existing);}
 return [...groups.values()].filter(group=>group.length>1);
}
type Inventory={ok:boolean;complete?:boolean;total?:number;houses?:House[];arabiyatRecords?:Array<{id:string;name:string;concentration:string|null;house:string;status:string}>;error?:string;warning?:string};
export default function CatalogInventory(){
 const [data,setData]=useState<Inventory|null>(null);
 const [loading,setLoading]=useState(false);
 const [recordSearch,setRecordSearch]=useState("");
 const [comparisonInput,setComparisonInput]=useState("");
 const [comparisonHouse,setComparisonHouse]=useState("all");
 const [importError,setImportError]=useState("");
 const [seedLoading,setSeedLoading]=useState(false);
 const [filter,setFilter]=useState<"all"|"arabiyat">("arabiyat");
 const visibleHouses=(data?.houses??[]).filter(h=>filter==="all"||/arabiyat/i.test(h.house));
 const visibleTotal=visibleHouses.reduce((sum,h)=>sum+h.total,0);
 const duplicateGroups=potentialDuplicates(data?.arabiyatRecords??[]);
 const missingConcentration=(data?.arabiyatRecords??[]).filter(r=>!r.concentration?.trim());
 const unnamedRecords=(data?.arabiyatRecords??[]).filter(r=>!r.name?.trim());
 function exportArabiyatCsv(){
  if(!data?.ok||!data.complete||!data.arabiyatRecords)return;
  const escapeCell=(value:string)=>'"'+value.replace(/"/g,'""')+'"';
  const rows=[["Record ID","Perfume","Concentration","House","Status"],...data.arabiyatRecords.map(r=>[r.id,r.name,r.concentration??"",r.house,r.status])];
  const csv="\uFEFF"+rows.map(row=>row.map(escapeCell).join(",")).join("\r\n");
  const url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));
  const anchor=document.createElement("a");anchor.href=url;anchor.download="scentmarked-arabiyat-catalog-audit.csv";document.body.appendChild(anchor);anchor.click();anchor.remove();URL.revokeObjectURL(url);
 }
 const proposedNames=[...new Set(comparisonInput.split(/\r?\n/).map(s=>s.trim()).filter(Boolean))];
 const catalogRecords=(data?.arabiyatRecords??[]).filter(r=>comparisonHouse==="all"||normalize(r.house)===normalize(comparisonHouse));
 const comparison=proposedNames.map(name=>{
  const normalized=normalize(name);
  const exact=catalogRecords.filter(r=>normalize(r.name)===normalized);
  const related=exact.length?[]:catalogRecords.filter(r=>normalized.length>=5&&(normalize(r.name).includes(normalized)||normalized.includes(normalize(r.name)))&&normalize(r.name).length>=5).slice(0,5);
  return {name,exact,related};
 });
 async function importReleaseCsv(file:File|undefined){
  if(!file)return;
  setImportError("");
  if(file.size>1024*1024){setImportError("CSV must be 1 MB or smaller.");return;}
  try{
   const content=(await file.text()).replace(/^\uFEFF/,"");
   const records:string[][]=[];let row:string[]=[];let cell="";let quoted=false;
   for(let i=0;i<content.length;i++){
    const ch=content[i];
    if(ch==='"'){if(quoted&&content[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}
    else if(ch===","&&!quoted){row.push(cell);cell="";}
    else if((ch==="\n"||ch==="\r")&&!quoted){if(ch==="\r"&&content[i+1]==="\n")i++;row.push(cell);records.push(row);row=[];cell="";}
    else cell+=ch;
   }
   if(quoted)throw Error("Unclosed CSV quote");
   if(cell||row.length){row.push(cell);records.push(row);}
   if(records.length>5001)throw Error("Maximum 5,000 rows");
   const header=(records[0]??[]).map(x=>normalize(x));
   const nameIndex=header.findIndex(x=>["name","perfume","fragrance","release name","proposed release"].includes(x));
   if(nameIndex<0)throw Error("Include a name, perfume, fragrance, or release name column");
   const houseIndex=header.findIndex(x=>["house","brand","collection"].includes(x));
   const houses=houseIndex>=0?[...new Set(records.slice(1).map(r=>r[houseIndex]?.trim()).filter((x):x is string=>Boolean(x)))]:[];
   if(houses.length===1)setComparisonHouse(houses[0]);else setComparisonHouse("all");
   const names=records.slice(1).map(r=>r[nameIndex]?.trim()??"").filter(Boolean);
   if(!names.length)throw Error("No fragrance names found");
   setComparisonInput(names.join("\n"));
  }catch(error){setImportError(error instanceof Error?error.message:"Unable to import CSV");}
 }
 async function loadReferenceSeed(path="/arabiyat-prestige-reference-seed.csv"){
  setSeedLoading(true);setImportError("");
  try{
   const response=await fetch(path,{cache:"no-store"});
   if(!response.ok)throw Error("Reference checklist unavailable");
   const blob=await response.blob();
   await importReleaseCsv(new File([blob],"arabiyat-reference.csv",{type:"text/csv"}));
  }catch(error){setImportError(error instanceof Error?error.message:"Unable to load reference checklist");}
  finally{setSeedLoading(false);}
 }
 function exportComparisonCsv(){
  if(!data?.ok||!data.complete||comparison.length===0)return;
  const escapeCell=(value:string)=>'"'+value.replace(/"/g,'""')+'"';
  const rows=[["Proposed release","Match status","Existing concentrations","Possible related names"],...comparison.map(r=>[r.name,r.exact.length?"Found":r.related.length?"Possible related name — review":"Not found — review",r.exact.map(x=>x.concentration??"unspecified").join("; "),r.related.map(x=>x.name).join("; ")])];
  const csv="\uFEFF"+rows.map(row=>row.map(escapeCell).join(",")).join("\r\n");
  const url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));
  const anchor=document.createElement("a");anchor.href=url;anchor.download="scentmarked-arabiyat-release-comparison.csv";document.body.appendChild(anchor);anchor.click();anchor.remove();URL.revokeObjectURL(url);
 }
 const matchingRecords=(data?.arabiyatRecords??[]).filter(r=>[r.id,r.name,r.concentration??"",r.house,r.status].some(value=>value.toLowerCase().includes(recordSearch.trim().toLowerCase())));
 async function refresh(){
  setLoading(true);
  try{const response=await fetch("/api/scentmarked-content/catalog-inventory",{cache:"no-store"});setData(await response.json() as Inventory);}
  catch{setData({ok:false,error:"INVENTORY_UNAVAILABLE"});}
  finally{setLoading(false);}
 }
 useEffect(()=>{void refresh();},[]);
 return <section aria-label="Perfume catalog inventory">
  <h2>Perfume catalog inventory</h2>
  <p>Read-only counts from Scentmarked. Refresh to inspect the current catalog.</p>
  <button type="button" onClick={()=>void refresh()} disabled={loading}>{loading?"Loading inventory…":"Refresh inventory"}</button>
  {data&&!data.ok?<p role="status">Inventory unavailable: {data.error}. Check Atlas catalog access and configuration.</p>:null}
  {data?.ok?<><p role="status"><strong>{data.total?.toLocaleString()??0}</strong> catalog records across <strong>{data.houses?.length??0}</strong> houses. {data.complete?"Full inventory retrieved.":"Partial inventory only."}</p>
  {data.warning?<p>{data.warning}</p>:null}
  <div style={{display:"flex",gap:12,alignItems:"center",flexWrap:"wrap"}}><label htmlFor="inventory-house-filter">Catalog focus</label><select id="inventory-house-filter" value={filter} onChange={e=>setFilter(e.target.value as "all"|"arabiyat")}><option value="arabiyat">Arabiyat houses</option><option value="all">All houses</option></select><span>{visibleTotal.toLocaleString()} records in {visibleHouses.length} matching houses</span></div>
  {filter==="arabiyat"&&data.complete?<button type="button" onClick={exportArabiyatCsv}>Export Arabiyat audit CSV</button>:null}
  {filter==="arabiyat"?<p>Arabiyat is prioritized for the next catalog audit. These counts do not establish whether releases or discontinued fragrances are missing.</p>:null}
  <div style={{overflowX:"auto"}}><table><thead><tr><th scope="col">Perfume house</th><th scope="col">Records</th><th scope="col">Recorded statuses</th></tr></thead><tbody>
  {visibleHouses.map(h=><tr key={h.house}><th scope="row">{h.house}</th><td>{h.total}</td><td>{Object.entries(h.statuses).map(([status,count])=>`${status}: ${count}`).join(", ")}</td></tr>)}
  </tbody></table></div>
  {filter==="arabiyat"&&data.complete?<details><summary>Compare Arabiyat release names against Scentmarked</summary><p>Enter one verified release name per line. Matching is by normalized name only; missing results require manual review for alternate spellings, concentrations, and brand variants. No database changes are made.</p><button type="button" disabled={seedLoading} onClick={()=>void loadReferenceSeed("/arabiyat-main-manufacturer-reference.csv")}>{seedLoading?"Loading…":"Load main Arabiyat manufacturer checklist (23 listings)"}</button><button type="button" disabled={seedLoading} onClick={()=>void loadReferenceSeed("/arabiyat-sugar-manufacturer-reference.csv")}>{seedLoading?"Loading…":"Load Arabiyat Sugar manufacturer checklist (11 listings)"}</button><button type="button" disabled={seedLoading} onClick={()=>void loadReferenceSeed("/arabiyat-prestige-manufacturer-reference.csv")}>{seedLoading?"Loading…":"Load My Perfumes manufacturer catalog (36 listings)"}</button><button type="button" disabled={seedLoading} onClick={()=>void loadReferenceSeed()}>{seedLoading?"Loading reference checklist…":"Load Arabiyat Prestige reference checklist (12 listings)"}</button><p>This starter list comes from a retail storefront, not a verified manufacturer master catalog. Discontinued status remains unverified.</p><label htmlFor="arabiyat-release-csv">Import verified release checklist (CSV)</label><input id="arabiyat-release-csv" type="file" accept=".csv,text/csv" onChange={e=>void importReleaseCsv(e.target.files?.[0])} />{importError?<p role="alert">{importError}</p>:null}<label htmlFor="arabiyat-compare-house">Compare within house</label><select id="arabiyat-compare-house" value={comparisonHouse} onChange={e=>setComparisonHouse(e.target.value)}><option value="all">All Arabiyat houses</option>{[...new Set((data.arabiyatRecords??[]).map(r=>r.house))].sort().map(h=><option key={h} value={h}>{h}</option>)}{comparisonHouse!=="all"&&!(data.arabiyatRecords??[]).some(r=>r.house===comparisonHouse)?<option value={comparisonHouse}>{comparisonHouse} (no catalog records)</option>:null}</select><p>Imported single-house checklists automatically select that house. Select all houses only when reviewing cross-house names.</p><label htmlFor="arabiyat-compare-names">Release names to check</label><textarea id="arabiyat-compare-names" rows={6} style={{display:"block",width:"100%",maxWidth:620}} value={comparisonInput} onChange={e=>setComparisonInput(e.target.value)} placeholder={"One fragrance name per line"} />{comparison.length>0?<><p>{comparison.filter(r=>r.exact.length>0).length} matching names; {comparison.filter(r=>r.exact.length===0&&r.related.length>0).length} possible related names; {comparison.filter(r=>r.exact.length===0&&r.related.length===0).length} not found.</p><button type="button" onClick={exportComparisonCsv}>Export comparison CSV</button><ul>{comparison.map(r=><li key={r.name}>{r.exact.length?"Found":r.related.length?"Possible related name — review":"Not found — review"}: {r.name}{r.exact.length?` (${[...new Set(r.exact.map(x=>x.concentration??"unspecified concentration"))].join(", ")})`:r.related.length?` (possible: ${r.related.map(x=>x.name).join("; ")})`:""}</li>)}</ul></>:null}</details>:null}
  {filter==="arabiyat"&&data.arabiyatRecords?.length?<><details><summary>Data quality checks — {missingConcentration.length} missing concentrations, {unnamedRecords.length} blank names</summary><p>Blank concentration may be legitimate when the manufacturer does not specify one; review before editing.</p>{missingConcentration.length>0?<div style={{maxHeight:260,overflow:"auto"}}><ul>{missingConcentration.map(r=><li key={r.id}>{r.house} — {r.name} ({r.id})</li>)}</ul></div>:<p>No missing concentrations found.</p>}{unnamedRecords.length>0?<p>{unnamedRecords.length} records have blank names and need investigation.</p>:null}</details><details><summary>Potential duplicate records ({duplicateGroups.length} groups)</summary><p>Only matching house, normalized name, and concentration are flagged. Review manually before making changes.</p>{duplicateGroups.length===0?<p>No exact-key duplicate groups found.</p>:<ul>{duplicateGroups.map((group,i)=><li key={i}>{group[0].house} — {group[0].name} ({group[0].concentration??"unspecified"}): {group.length} records ({group.map(r=>r.id).join(", ")})</li>)}</ul>}</details><details><summary>Inspect {data.arabiyatRecords.length} Arabiyat catalog record IDs</summary><p>Names and concentrations are read from the catalog. Similar names are not automatically treated as duplicates.</p><label htmlFor="arabiyat-record-search">Search perfume name, concentration, ID, house, or status</label><input id="arabiyat-record-search" type="search" value={recordSearch} onChange={e=>setRecordSearch(e.target.value)} placeholder="Filter Arabiyat records" /><p>{matchingRecords.length} matching records</p><div style={{maxHeight:320,overflow:"auto"}}><table><thead><tr><th>Perfume</th><th>Concentration</th><th>House</th><th>Status</th><th>Record ID</th></tr></thead><tbody>{matchingRecords.map(r=><tr key={r.id}><td>{r.name}</td><td>{r.concentration??"—"}</td><td>{r.house}</td><td>{r.status}</td><td>{r.id}</td></tr>)}</tbody></table></div></details></>:null}
  <p>These are database counts, not verified manufacturer catalog totals or completeness scores.</p></>:null}
 </section>;
}
