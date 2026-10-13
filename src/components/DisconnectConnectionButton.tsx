"use client";
import {useState} from "react";
export default function DisconnectConnectionButton({id}:{id:string}){const [busy,setBusy]=useState(false);async function disconnect(){setBusy(true);const response=await fetch("/api/connections/disconnect",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({id})});if(response.ok)window.location.reload();else setBusy(false);}return <button type="button" onClick={disconnect} disabled={busy}>{busy?"Disconnecting…":"Disconnect"}</button>;}
