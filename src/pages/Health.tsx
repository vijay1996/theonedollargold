import { useEffect, useState } from "react";
import { serverUrl } from "../lib/firebase";

export default function Health() {
    const [healthStatus, setHealthStatus] = useState<string>('Checking health...');
    useEffect(() => {
        const res = fetch(`${serverUrl}/application/health`).then(res => res.json()).then(data => {
            setHealthStatus(JSON.stringify(data, null, 2));
        }).catch(err => {
            setHealthStatus(err.message);
        });
    }, []);
    return <pre>{healthStatus}</pre>
}