import Loader from './loader';

type LoadingOverlayProps = {
  show: boolean;
  label?: string;
};

export default function LoadingOverlay({ show, label = 'Working...' }: LoadingOverlayProps) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 backdrop-blur-sm">
      <Loader size={56} label={label} />
    </div>
  );
}
