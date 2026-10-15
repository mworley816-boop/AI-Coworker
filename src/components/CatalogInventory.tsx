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
 const [filter,setFilter]=useState<"all"|"arabiyat">("arabiyat");
 const visibleHouses=(data?.houses??[]).filter(h=>filter==="all"||/arabiyat/i.test(h.house));
 const visibleTotal=visibleHouses.reduce((sum,h)=>sum+h.total,0);
 const duplicateGroups=potentialDuplicates(data?.arabiyatRecords??[]);
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
  {filter==="arabiyat"?<p>Arabiyat is prioritized for the next catalog audit. These counts do not establish whether releases or discontinued fragrances are missing.</p>:null}
  <div style={{overflowX:"auto"}}><table><thead><tr><th scope="col">Perfume house</th><th scope="col">Records</th><th scope="col">Recorded statuses</th></tr></thead><tbody>
  {visibleHouses.map(h=><tr key={h.house}><th scope="row">{h.house}</th><td>{h.total}</td><td>{Object.entries(h.statuses).map(([status,count])=>`${status}: ${count}`).join(", ")}</td></tr>)}
  </tbody></table></div>
  {filter==="arabiyat"&&data.arabiyatRecords?.length?<><details><summary>Potential duplicate records ({duplicateGroups.length} groups)</summary><p>Only matching house, normalized name, and concentration are flagged. Review manually before making changes.</p>{duplicateGroups.length===0?<p>No exact-key duplicate groups found.</p>:<ul>{duplicateGroups.map((group,i)=><li key={i}>{group[0].house} — {group[0].name} ({group[0].concentration??"unspecified"}): {group.length} records ({group.map(r=>r.id).join(", ")})</li>)}</ul>}</details><details><summary>Inspect {data.arabiyatRecords.length} Arabiyat catalog record IDs</summary><p>Names and concentrations are read from the catalog. Similar names are not automatically treated as duplicates.</p><label htmlFor="arabiyat-record-search">Search perfume name, concentration, ID, house, or status</label><input id="arabiyat-record-search" type="search" value={recordSearch} onChange={e=>setRecordSearch(e.target.value)} placeholder="Filter Arabiyat records" /><p>{matchingRecords.length} matching records</p><div style={{maxHeight:320,overflow:"auto"}}><table><thead><tr><th>Perfume</th><th>Concentration</th><th>House</th><th>Status</th><th>Record ID</th></tr></thead><tbody>{matchingRecords.map(r=><tr key={r.id}><td>{r.name}</td><td>{r.concentration??"—"}</td><td>{r.house}</td><td>{r.status}</td><td>{r.id}</td></tr>)}</tbody></table></div></details></>:null}
  <p>These are database counts, not verified manufacturer catalog totals or completeness scores.</p></>:null}
 </section>;
}
