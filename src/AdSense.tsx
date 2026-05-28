import { useEffect, useState } from "react";
import { getUserSubscriptionInfo, isPremium } from "./lib/razorpay";

export default function Header() {
  const [subInfo, setSubInfo] = useState<any>(null);

  useEffect(() => {
    getUserSubscriptionInfo().then((info) => {
      setSubInfo(info);
    });
    console.log('Header mounted, checking subscription info');
  }, []);

  return !isPremium(subInfo?.tier, subInfo?.status) ? <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6748935947885860" crossOrigin="anonymous"></script> : null; 
}