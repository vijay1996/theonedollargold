import { useEffect, useState } from "react";
import { getUserSubscriptionInfo, isPremium } from "./lib/razorpay";

export default function Header() {
  const [subInfo, setSubInfo] = useState<any>(null);

  useEffect(() => {
    getUserSubscriptionInfo().then((info) => {
      setSubInfo(info);
    });
  }, []);

  useEffect(() => {
    if (subInfo === null) return; // still loading
    if (isPremium(subInfo?.tier, subInfo?.status)) return; // premium, no ads

    const script = document.createElement("script");
    script.src =
      "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6748935947885860";
    script.async = true;
    script.crossOrigin = "anonymous";
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, [subInfo]);

  return null; // this component has no visible UI
}