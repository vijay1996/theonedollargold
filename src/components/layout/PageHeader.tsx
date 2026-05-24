interface PageHeaderProps {
    title: string;
    description: string;
  }
  

export default function PageHeader ({ title, description }: PageHeaderProps) {
    return (
        <div className="min-w-0">
        <div className="flex items-center gap-4">
          <h2 className="text-3xl font-bold tracking-tight">{title}</h2>
          <p className="text-muted-foreground">{description}</p>
        </div>
      </div>
    )
};