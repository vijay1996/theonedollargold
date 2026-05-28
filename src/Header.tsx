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
    document.getElementsByTagName('head')[0].appendChild(script);

    return () => {
      document.getElementsByTagName('head')[0].removeChild(script);
    };
  }, [subInfo]);

  return null; // this component has no visible UI
}