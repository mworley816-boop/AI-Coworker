export const personalConnectionProviders=["github","email","calendar","files"] as const;
export type PersonalConnectionProvider=typeof personalConnectionProviders[number];
export type ConnectionStatus="disconnected"|"connecting"|"connected"|"error"|"revoked";
export function isPersonalConnectionProvider(value:string):value is PersonalConnectionProvider{return personalConnectionProviders.includes(value as PersonalConnectionProvider);}
