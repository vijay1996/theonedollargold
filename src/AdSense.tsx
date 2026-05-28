import { useEffect, useState } from "react";
import { getUserSubscriptionInfo, isPremium } from "./lib/razorpay";

const ADSENSE_SRC =
  "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6748935947885860";

export default function Adsense() {
  const [subInfo, setSubInfo] = useState<any>(null);

  useEffect(() => {
    getUserSubscriptionInfo().then((info) => {
      setSubInfo(info);
    });
  }, []);

  useEffect(() => {
    if (subInfo === null) return; // Still loading

    if (isPremium(subInfo?.tier, subInfo?.status)) {
      // Remove AdSense script if it exists
      const script = document.head.querySelector<HTMLScriptElement>(
        `script[src="${ADSENSE_SRC}"]`
      );
      if (script) {
        document.head.removeChild(script);
        console.log("User is premium, removed AdSense script");
      }
    } else {
      // Inject AdSense script if not already present
      const existing = document.head.querySelector<HTMLScriptElement>(
        `script[src="${ADSENSE_SRC}"]`
      );
      if (!existing) {
        const script = document.createElement("script");
        script.src = ADSENSE_SRC;
        script.async = true;
        script.crossOrigin = "anonymous";
        document.head.appendChild(script);
        console.log("User is not premium, loaded AdSense script");
      }
    }
  }, [subInfo]);

  return null;
}