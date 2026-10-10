import type { ReactNode } from "react";
import "./globals.css";

export const metadata={title:"AI Coworker",description:"Persistent autonomous AI coworkers"};
export default function RootLayout({children}:{children:ReactNode}){return <html lang="en"><body>{children}</body></html>}