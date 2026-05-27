import { Wallet } from 'lucide-react';

type LoaderProps = {
  size?: number;
  label?: string;
};

export default function Loader({ size = 16, label = 'Loading...' }: LoaderProps) {
  const px = size;
  return (
    <div className="flex flex-col items-center gap-4" role="status" aria-live="polite">
      <div className="relative grid place-items-center" style={{ width: px, height: px }} aria-hidden>
        <div className="loader-aura absolute inset-0 rounded-full" />
        <div className="loader-orbit absolute inset-0 rounded-full" />
        <div className="loader-coin relative grid h-[68%] w-[68%] place-items-center rounded-full">
          <Wallet className="h-[54%] w-[54%] text-slate-50 drop-shadow-sm" strokeWidth={1.9} />
        </div>
      </div>
      <div className="flex flex-col items-center gap-1.5 text-center">
        <div className="flex items-center gap-2 text-white">
          <Wallet className="h-4 w-4 text-indigo-400" strokeWidth={2} aria-hidden />
          <span className="text-base font-semibold tracking-tight">TheOneDollarGold</span>
        </div>
        {label && <div className="text-sm font-medium text-white/80">{label}</div>}
      </div>
    </div>
  );
}
