"use client";
import {useState} from "react";
import {executeRun} from "@/lib/execution/run-executor";
export default function RunControls({runId}:{runId:string}){const [state,setState]=useState("");async function start(){setState("Atlas is working…");try{const result=await executeRun(runId);setState(result.ok?(result.status==="waiting_approval"?"Paused for approval":"Run completed"):result.reason||"Unable to start");}catch{setState("Run failed. Check the activity log.");}}return <div className="run-controls"><button onClick={start}>Start run</button>{state&&<small>{state}</small>}</div>}