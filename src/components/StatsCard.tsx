import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  alert?: boolean;
}

export const StatsCard = ({ title, value, icon: Icon, alert = false }: StatsCardProps) => {
  return (
    <Card className="border-border">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className={`text-3xl font-bold mt-2 ${alert ? 'text-destructive' : 'text-foreground'}`}>
              {value}
            </p>
          </div>
          <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${alert ? 'bg-destructive/10' : 'bg-muted'}`}>
            <Icon className={`h-6 w-6 ${alert ? 'text-destructive' : 'text-muted-foreground'}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
