import { useEffect, useState } from "react";
import { getUserSubscriptionInfo, isPremium } from "./lib/razorpay";

export default function Adsense() {
  const [subInfo, setSubInfo] = useState<any>(null);

  useEffect(() => {
    getUserSubscriptionInfo().then((info) => {
      setSubInfo(info);
    });
    console.log('Header mounted, checking subscription info');
  }, []);

  useEffect(() => {
    if (!isPremium(subInfo?.tier, subInfo?.status)) {
      document.head.insertAdjacentHTML('beforeend', '<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6748935947885860" crossOrigin="anonymous"></script>');
      console.log('User is not premium, loaded AdSense script');
    } else {
      console.log('User is premium, not loading AdSense script');
    }
  }, [subInfo]);
  return null; // Don't render anything, just check subscription status and log it
}