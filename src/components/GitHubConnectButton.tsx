"use client";
import {useState} from "react";

export default function GitHubConnectButton(){
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 async function connect(){
  setBusy(true);setError("");
  const controller=new AbortController();
  const timer=window.setTimeout(()=>controller.abort(),12000);
  try{
   const response=await fetch("/api/connections/github/start",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({label:"Personal GitHub"}),signal:controller.signal});
   const text=await response.text();
   let data:{authorizeUrl?:string;error?:string}={};
   try{data=JSON.parse(text);}catch{throw new Error("Atlas received an invalid response while starting GitHub.");}
   if(!response.ok||!data.authorizeUrl)throw new Error(data.error??"Could not start GitHub connection");
   window.location.href=data.authorizeUrl;
  }catch(error){
   if(error instanceof DOMException&&error.name==="AbortError")setError("GitHub connection timed out before authorization started.");
   else setError(error instanceof Error?error.message:"Could not start GitHub connection");
   setBusy(false);
  }finally{window.clearTimeout(timer);}
 }
 return <div><button type="button" onClick={connect} disabled={busy}>{busy?"Connecting…":"Connect GitHub"}</button>{error?<p role="alert">{error}</p>:null}</div>;
}
