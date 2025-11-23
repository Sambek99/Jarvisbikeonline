import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin } from "lucide-react";

interface PartCardProps {
  sku: string;
  name: string;
  model: string;
  stock: number;
  location?: string;
  isOutOfStock?: boolean;
}

export const PartCard = ({ sku, name, model, stock, location, isOutOfStock = false }: PartCardProps) => {
  return (
    <Card className={`${isOutOfStock ? 'border-destructive border-2' : 'border-border'}`}>
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="font-semibold text-lg text-foreground">{name}</h3>
              <p className="text-sm text-muted-foreground mt-1">SKU: {sku}</p>
              <p className="text-sm text-muted-foreground">Modelo: {model}</p>
            </div>
            <Badge 
              variant={isOutOfStock ? "destructive" : "default"}
              className={isOutOfStock ? "" : "bg-success text-success-foreground hover:bg-success/90"}
            >
              {isOutOfStock ? "AGOTADO" : "EN STOCK"}
            </Badge>
          </div>
          
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <div>
              <p className="text-sm text-muted-foreground">Stock Disponible</p>
              <p className={`text-xl font-bold ${isOutOfStock ? 'text-destructive' : 'text-success'}`}>
                {stock}
              </p>
            </div>
            
            {location && !isOutOfStock && (
              <Button size="sm" variant="outline" className="gap-2">
                <MapPin className="h-4 w-4" />
                Ver Ubicación
              </Button>
            )}
          </div>
          
          {location && !isOutOfStock && (
            <p className="text-sm text-muted-foreground">
              Ubicación: <span className="font-medium text-foreground">{location}</span>
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
