"use client";
import {useEffect,useState} from "react";
type House={house:string;total:number;statuses:Record<string,number>};
type Inventory={ok:boolean;complete?:boolean;total?:number;houses?:House[];error?:string;warning?:string};
export default function CatalogInventory(){
 const [data,setData]=useState<Inventory|null>(null);
 const [loading,setLoading]=useState(false);
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
  <div style={{overflowX:"auto"}}><table><thead><tr><th scope="col">Perfume house</th><th scope="col">Records</th><th scope="col">Recorded statuses</th></tr></thead><tbody>
  {(data.houses??[]).map(h=><tr key={h.house}><th scope="row">{h.house}</th><td>{h.total}</td><td>{Object.entries(h.statuses).map(([status,count])=>`${status}: ${count}`).join(", ")}</td></tr>)}
  </tbody></table></div>
  <p>These are database counts, not verified manufacturer catalog totals or completeness scores.</p></>:null}
 </section>;
}
