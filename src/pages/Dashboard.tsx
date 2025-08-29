import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  DollarSign, 
  TrendingUp, 
  Calendar, 
  CheckCircle, 
  XCircle, 
  Rocket, 
  RefreshCw,
  AlertTriangle 
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

type Period = "HOJE" | "ONTEM" | "MENSAL" | "TRIMESTRAL";
type Product = "TRIMBLE" | "CHAOS" | "TODOS";

interface DashboardData {
  vendasTotais: number;
  forecast: number;
  licencasRenovar: number;
  renovado: { percent: number; quantity: number };
  churn: number;
  onboarding: number;
  crossSelling: number;
}

interface ChartData {
  day: string;
  forecast: number;
  vendas: number;
}

const Dashboard = () => {
  const { profile, isGestor } = useAuth();
  const [period, setPeriod] = useState<Period>("HOJE");
  const [product, setProduct] = useState<Product>("TODOS");
  const [data, setData] = useState<DashboardData>({
    vendasTotais: 0,
    forecast: 0,
    licencasRenovar: 0,
    renovado: { percent: 0, quantity: 0 },
    churn: 0,
    onboarding: 0,
    crossSelling: 0,
  });
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [showDaylinAlert, setShowDaylinAlert] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkDaylinStatus();
    loadDashboardData();
  }, [period, product, profile]);

  const checkDaylinStatus = async () => {
    if (!profile) return;

    const today = new Date().toISOString().split('T')[0];
    const currentHour = new Date().getHours();

    // Check if user started daylin today and if it's before 9 AM
    const { data: report } = await supabase
      .from("daily_reports")
      .select("started_at")
      .eq("user_id", profile.user_id)
      .eq("date", today)
      .single();

    if (!report?.started_at && currentHour >= 9) {
      setShowDaylinAlert(true);
    }
  };

  const loadDashboardData = async () => {
    if (!profile) return;

    setLoading(true);
    try {
      let query = supabase.from("daily_reports").select("*");

      // Filter by user if not gestor
      if (!isGestor) {
        query = query.eq("user_id", profile.user_id);
      }

      // Apply period filter
      const today = new Date();
      let startDate = new Date();

      switch (period) {
        case "HOJE":
          startDate = new Date(today.toISOString().split('T')[0]);
          break;
        case "ONTEM":
          startDate = new Date(today);
          startDate.setDate(today.getDate() - 1);
          break;
        case "MENSAL":
          startDate = new Date(today.getFullYear(), today.getMonth(), 1);
          break;
        case "TRIMESTRAL":
          startDate = new Date(today.getFullYear(), today.getMonth() - 3, 1);
          break;
      }

      query = query.gte("date", startDate.toISOString().split('T')[0]);

      const { data: reports, error } = await query;

      if (error) {
        toast({
          title: "Erro",
          description: "Não foi possível carregar os dados",
          variant: "destructive",
        });
        return;
      }

      // Calculate dashboard metrics
      const totals = reports?.reduce(
        (acc, report) => {
          acc.vendasTotais += report.sales_amount || 0;
          acc.forecast += report.forecast_amount || 0;
          acc.onboarding += report.onboarding || 0;
          acc.crossSelling += report.cross_selling || 0;

          // Filter by product if needed
          if (product === "TRIMBLE" || product === "TODOS") {
            acc.licencasRenovar += report.sketchup_to_renew || 0;
            acc.renovadoQty += report.sketchup_renewed || 0;
          }
          if (product === "CHAOS" || product === "TODOS") {
            acc.licencasRenovar += report.chaos_to_renew || 0;
            acc.renovadoQty += report.chaos_renewed || 0;
          }

          return acc;
        },
        {
          vendasTotais: 0,
          forecast: 0,
          licencasRenovar: 0,
          renovadoQty: 0,
          onboarding: 0,
          crossSelling: 0,
        }
      ) || {
        vendasTotais: 0,
        forecast: 0,
        licencasRenovar: 0,
        renovadoQty: 0,
        onboarding: 0,
        crossSelling: 0,
      };

      const renovadoPercent = totals.licencasRenovar > 0 
        ? (totals.renovadoQty / totals.licencasRenovar) * 100 
        : 0;

      setData({
        ...totals,
        renovado: {
          percent: renovadoPercent,
          quantity: totals.renovadoQty,
        },
        churn: 100 - renovadoPercent,
      });

      // Generate chart data for last 5 business days
      generateChartData(reports || []);

    } catch (error) {
      console.error("Error loading dashboard data:", error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateChartData = (reports: any[]) => {
    const last5BusinessDays = [];
    const today = new Date();
    let currentDate = new Date(today);
    let daysAdded = 0;

    while (daysAdded < 5) {
      // Skip weekends (0 = Sunday, 6 = Saturday)
      if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
        const dateStr = currentDate.toISOString().split('T')[0];
        const dayReports = reports.filter(r => r.date === dateStr);
        
        const dayForecast = dayReports.reduce((sum, r) => sum + (r.forecast_amount || 0), 0);
        const dayVendas = dayReports.reduce((sum, r) => sum + (r.sales_amount || 0), 0);

        last5BusinessDays.unshift({
          day: currentDate.toLocaleDateString('pt-BR', { weekday: 'short' }),
          forecast: dayForecast,
          vendas: dayVendas,
        });
        
        daysAdded++;
      }
      currentDate.setDate(currentDate.getDate() - 1);
    }

    setChartData(last5BusinessDays);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-muted rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded w-3/4"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            🧭 Dashboard
          </h1>
          <p className="text-muted-foreground">
            Acompanhe seus indicadores de vendas em tempo real
          </p>
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          <Select value={period} onValueChange={(value: Period) => setPeriod(value)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="HOJE">Hoje</SelectItem>
              <SelectItem value="ONTEM">Ontem</SelectItem>
              <SelectItem value="MENSAL">Mensal</SelectItem>
              <SelectItem value="TRIMESTRAL">Trimestral</SelectItem>
            </SelectContent>
          </Select>

          <Select value={product} onValueChange={(value: Product) => setProduct(value)}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS">Todos</SelectItem>
              <SelectItem value="TRIMBLE">Trimble</SelectItem>
              <SelectItem value="CHAOS">Chaos</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Daylin Alert */}
      {showDaylinAlert && (
        <Alert className="border-warning/50 bg-warning/10">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <AlertDescription className="text-warning-foreground">
            🚀 Bora começar o dia? Preencha o "Iniciar o Dia" para ativar seus indicadores.
          </AlertDescription>
        </Alert>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="card-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">💰 Vendas Totais</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {formatCurrency(data.vendasTotais)}
            </div>
          </CardContent>
        </Card>

        <Card className="card-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">📊 Forecast</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">
              {formatCurrency(data.forecast)}
            </div>
          </CardContent>
        </Card>

        <Card className="card-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">🗓️ Nº Licenças a Renovar</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.licencasRenovar}</div>
          </CardContent>
        </Card>

        <Card className="card-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">✅ Renovado</CardTitle>
            <CheckCircle className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {data.renovado.percent.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {data.renovado.quantity} licenças
            </p>
          </CardContent>
        </Card>

        <Card className="card-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">❌ Churn</CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {data.churn.toFixed(1)}%
            </div>
          </CardContent>
        </Card>

        <Card className="card-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">🚀 Onboarding</CardTitle>
            <Rocket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.onboarding}</div>
          </CardContent>
        </Card>

        <Card className="card-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">🔁 Cross Selling</CardTitle>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.crossSelling}</div>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card className="card-shadow">
        <CardHeader>
          <CardTitle>Forecast vs Vendas - Últimos 5 Dias Úteis</CardTitle>
          <CardDescription>
            Comparativo entre o forecast planejado e as vendas realizadas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis tickFormatter={(value) => formatCurrency(value)} />
              <Tooltip 
                formatter={(value: number) => formatCurrency(value)}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
              />
              <Bar dataKey="forecast" fill="hsl(var(--accent))" name="Forecast" />
              <Bar dataKey="vendas" fill="hsl(var(--primary))" name="Vendas" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;