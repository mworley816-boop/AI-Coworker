import {validateReferenceUrl} from "./reference-url-safety";
const denied=["http://example.com/image.png","https://localhost/a","https://127.0.0.1/a","https://192.168.1.1/a","https://169.254.169.254/latest/meta-data","https://user:pass@example.com/a","https://[::1]/a","https://example.com:8443/a","https://example.com/a#frag","https://example.internal/a"];
for(const url of denied){if(validateReferenceUrl(url).valid)throw new Error("Expected blocked reference URL: "+url);}
const allowed=validateReferenceUrl("https://images.example.org/bottle.jpg");
if(!allowed.valid||!allowed.requiresFetchValidation)throw new Error("Public HTTPS URL should pass syntax triage only");
