/** Scentmarked production storage contract. This module performs no uploads. */
export const MEDIA_BUCKETS={perfume:"perfume-images",site:"site-media"} as const;
export const MAX_MEDIA_BYTES=5*1024*1024;
export const ALLOWED_MEDIA_TYPES=["image/jpeg","image/png","image/webp","image/avif"] as const;
export type MediaUploadRequest={bucket:string;path:string;contentType:string;byteLength:number;rightsCleared:boolean;identityVerified:boolean};
export function validateMediaUpload(request:MediaUploadRequest):{ok:boolean;reasons:string[]}{
 const reasons:string[]=[];
 if(!Object.values(MEDIA_BUCKETS).includes(request.bucket as typeof MEDIA_BUCKETS[keyof typeof MEDIA_BUCKETS]))reasons.push("UNSUPPORTED_BUCKET");
 if(!request.path||request.path.startsWith("/")||request.path.includes("..")||request.path.includes("\\")||!/^[a-zA-Z0-9/_-]+\.(jpg|jpeg|png|webp|avif)$/.test(request.path))reasons.push("INVALID_STORAGE_PATH");
 if(!ALLOWED_MEDIA_TYPES.includes(request.contentType as typeof ALLOWED_MEDIA_TYPES[number]))reasons.push("UNSUPPORTED_MEDIA_TYPE");
 if(!Number.isSafeInteger(request.byteLength)||request.byteLength<1||request.byteLength>MAX_MEDIA_BYTES)reasons.push("INVALID_MEDIA_SIZE");
 if(!request.rightsCleared)reasons.push("IMAGE_RIGHTS_UNVERIFIED");
 if(!request.identityVerified)reasons.push("IMAGE_IDENTITY_UNVERIFIED");
 return {ok:reasons.length===0,reasons};
}
