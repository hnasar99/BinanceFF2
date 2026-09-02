import type { Metadata } from "next";
import "./globals.css";
export const metadata:Metadata={title:"BinanceFF2 — Agent Economy",description:"Deploy agents, form teams, complete bounties and settle verified work on BNB Chain.",icons:{icon:"/favicon.svg",shortcut:"/favicon.svg"}};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="en"><body>{children}</body></html>}
