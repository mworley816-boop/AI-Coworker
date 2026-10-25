/**
 * Validate untrusted reference URLs before recording a graphics job.
 * This is syntactic URL triage, not a safe remote fetch implementation:
 * DNS, redirects, content type and bytes still require server-side checks.
 */
export type ReferenceUrlCheck={valid:boolean;reason:string;normalizedUrl?:string;requiresFetchValidation:true};
const privateV4=(host:string)=>{
 const parts=host.split(".");if(parts.length!==4||parts.some(x=>!/^\d{1,3}$/.test(x)||Number(x)>255))return false;
 const [a,b]=parts.map(Number);
 return a===0||a===10||a===127||a>=224||(a===169&&b===254)||(a===172&&b>=16&&b<=31)||(a===192&&b===168)||(a===100&&b>=64&&b<=127)||(a===192&&b===0)||(a===198&&(b===18||b===19));
};
export function validateReferenceUrl(input:string):ReferenceUrlCheck{
 const invalid=(reason:string):ReferenceUrlCheck=>({valid:false,reason,requiresFetchValidation:true});
 if(!input||input.length>1500)return invalid("Reference URL is empty or too long.");
 let url:URL;try{url=new URL(input);}catch{return invalid("Reference URL is malformed.");}
 if(url.protocol!=="https:")return invalid("Reference must use HTTPS.");
 if(url.username||url.password)return invalid("Embedded credentials are not allowed.");
 if(url.port&&url.port!=="443")return invalid("Custom ports are not allowed.");
 if(url.hash)return invalid("URL fragments are not allowed.");
 const host=url.hostname.toLowerCase().replace(/\.$/,"");
 if(!host||host==="localhost"||host.endsWith(".localhost")||host.endsWith(".local")||host.endsWith(".internal")||host.endsWith(".test")||host.endsWith(".invalid")||host.endsWith(".example")||host.endsWith(".onion")||host.includes("%")||host.includes("\\")||host.includes(".."))return invalid("Local or non-public hosts are not allowed.");
 if(host.startsWith("[")||host.includes(":"))return invalid("IP-literal hosts are not accepted.");
 if(/^\d+(?:\.\d+){3}$/.test(host)){if(privateV4(host))return invalid("Private or reserved IP addresses are not allowed.");return invalid("IP-literal hosts are not accepted.");}
 if(!host.includes(".")||!/[a-z]/.test(host))return invalid("A public DNS hostname is required.");
 return {valid:true,reason:"URL format passes initial checks. Server-side DNS, redirects, content and licensing must still be verified.",normalizedUrl:url.toString(),requiresFetchValidation:true};
}
