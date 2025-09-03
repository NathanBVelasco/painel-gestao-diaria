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
  AlertTriangle,
  Target 
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from "recharts";

type Period = "HOJE" | "ONTEM" | "SEMANAL" | "MENSAL" | "TRIMESTRAL";
type Product = "TRIMBLE" | "CHAOS" | "TODOS";

interface DashboardData {
  vendasTotais: number;
  forecast: number;
  licencasRenovar: number;
  renovado: { percent: number; quantity: number };
  churn: number;
  onboarding: number;
  crossSelling: number;
  packsVendidos: number;
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
  const [selectedSeller, setSelectedSeller] = useState<string>("TODOS");
  const [sellers, setSellers] = useState<Array<{id: string, name: string}>>([]);
  const [data, setData] = useState<DashboardData>({
    vendasTotais: 0,
    forecast: 0,
    licencasRenovar: 0,
    renovado: { percent: 0, quantity: 0 },
    churn: 0,
    onboarding: 0,
    crossSelling: 0,
    packsVendidos: 0,
  });
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [showDaylinAlert, setShowDaylinAlert] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Monthly target states (only for individual sellers)
  const [monthlyTarget, setMonthlyTarget] = useState<{ target: number; progress: number; currentSales: number } | null>(null);

  useEffect(() => {
    checkDaylinStatus();
    loadDashboardData();
    if (isGestor) {
      loadSellers();
    } else {
      loadMonthlyTarget();
    }
  }, [period, product, selectedSeller, profile]);

  const loadMonthlyTarget = async () => {
    if (!profile || isGestor) return;

    try {
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();
      const firstDayOfMonth = new Date(currentYear, currentMonth - 1, 1).toISOString().split('T')[0];
      const lastDayOfMonth = new Date(currentYear, currentMonth, 0).toISOString().split('T')[0];

      // Get current month target
      const { data: target } = await supabase
        .from("monthly_targets")
        .select("target_amount")
        .eq("user_id", profile.user_id)
        .eq("month", currentMonth)
        .eq("year", currentYear)
        .maybeSingle();

      // Get current month sales
      const { data: monthSales } = await supabase
        .from("daily_reports")
        .select("sales_amount")
        .eq("user_id", profile.user_id)
        .gte("date", firstDayOfMonth)
        .lte("date", lastDayOfMonth);

      const currentSales = monthSales?.reduce((acc, sale) => acc + (sale.sales_amount || 0), 0) || 0;
      const progress = target?.target_amount ? (currentSales / target.target_amount) * 100 : 0;

      if (target?.target_amount) {
        setMonthlyTarget({
          target: target.target_amount,
          currentSales,
          progress: Math.min(progress, 100)
        });
      }

    } catch (error) {
      console.error("Error loading monthly target:", error);
    }
  };

  const loadSellers = async () => {
    try {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("user_id, name")
        .eq("role", "vendedor");

      if (error) {
        console.error("Error loading sellers:", error);
        return;
      }

      setSellers(profiles?.map(p => ({ id: p.user_id, name: p.name })) || []);
    } catch (error) {
      console.error("Error loading sellers:", error);
    }
  };

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

      // Filter by user if not gestor or if gestor selected specific seller
      if (!isGestor) {
        query = query.eq("user_id", profile.user_id);
      } else if (selectedSeller !== "TODOS") {
        query = query.eq("user_id", selectedSeller);
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
        case "SEMANAL":
          startDate = new Date(today);
          const dayOfWeek = today.getDay();
          const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Sunday = 0, Monday = 1
          startDate.setDate(today.getDate() - daysToMonday);
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

      // Calculate weekly metrics separately (always current week regardless of period filter)
      let weeklyQuery = supabase.from("daily_reports").select("*");
      
      if (!isGestor) {
        weeklyQuery = weeklyQuery.eq("user_id", profile.user_id);
      } else if (selectedSeller !== "TODOS") {
        weeklyQuery = weeklyQuery.eq("user_id", selectedSeller);
      }

      const weekStartDate = new Date(today);
      const dayOfWeek = today.getDay();
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      weekStartDate.setDate(today.getDate() - daysToMonday);

      weeklyQuery = weeklyQuery.gte("date", weekStartDate.toISOString().split('T')[0]);

      const { data: weeklyReports } = await weeklyQuery;

      // Calculate weekly totals for licenses metrics
      const weeklyTotals = weeklyReports?.reduce(
        (acc, report) => {
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
        { licencasRenovar: 0, renovadoQty: 0 }
      ) || { licencasRenovar: 0, renovadoQty: 0 };

      const weeklyRenovadoPercent = weeklyTotals.licencasRenovar > 0 
        ? (weeklyTotals.renovadoQty / weeklyTotals.licencasRenovar) * 100 
        : 0;

      // Calculate other metrics based on selected period
      const totals = reports?.reduce(
        (acc, report) => {
          acc.vendasTotais += report.sales_amount || 0;
          acc.forecast += report.forecast_amount || 0;
          acc.onboarding += report.onboarding || 0;
          acc.crossSelling += report.cross_selling || 0;
          acc.packsVendidos += report.packs_vendidos || 0;
          return acc;
        },
        {
          vendasTotais: 0,
          forecast: 0,
          onboarding: 0,
          crossSelling: 0,
          packsVendidos: 0,
        }
      ) || {
        vendasTotais: 0,
        forecast: 0,
        onboarding: 0,
        crossSelling: 0,
        packsVendidos: 0,
      };

      setData({
        ...totals,
        licencasRenovar: weeklyTotals.licencasRenovar,
        renovado: {
          percent: weeklyRenovadoPercent,
          quantity: weeklyTotals.renovadoQty,
        },
        churn: 100 - weeklyRenovadoPercent,
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
        <div className="flex gap-2 flex-wrap">
          <Select value={period} onValueChange={(value: Period) => setPeriod(value)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="HOJE">Hoje</SelectItem>
              <SelectItem value="ONTEM">Ontem</SelectItem>
              <SelectItem value="SEMANAL">Semanal</SelectItem>
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

          {isGestor && (
            <Select value={selectedSeller} onValueChange={setSelectedSeller}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Vendedor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos Vendedores</SelectItem>
                {sellers.map((seller) => (
                  <SelectItem key={seller.id} value={seller.id}>
                    {seller.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Daylin Alert - only for sellers, not gestors */}
      {showDaylinAlert && !isGestor && (
        <Alert className="border-warning/50 bg-warning/10">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <AlertDescription className="text-warning-foreground">
            🚀 Bora começar o dia? Preencha o "Iniciar o Dia" para ativar seus indicadores.
          </AlertDescription>
        </Alert>
      )}

      {/* Monthly Target Card (only for sellers) */}
      {!isGestor && monthlyTarget && (
        <Card className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-accent/5 border-2 border-primary/20 shadow-lg hover:shadow-xl transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent opacity-50" />
          <CardHeader className="relative">
            <CardTitle className="flex items-center gap-3 text-lg">
              <div className="p-2 rounded-full bg-primary/10">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="font-bold text-primary">Meta Mensal</div>
                <div className="text-sm text-muted-foreground font-normal">
                  {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                </div>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="relative space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1 p-3 rounded-lg bg-background/50 border border-border/50">
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Meta</span>
                <div className="font-bold text-lg text-primary">
                  {formatCurrency(monthlyTarget.target)}
                </div>
              </div>
              <div className="space-y-1 p-3 rounded-lg bg-background/50 border border-border/50">
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Vendas atuais</span>
                <div className="font-bold text-lg">
                  {formatCurrency(monthlyTarget.currentSales)}
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-muted-foreground">Progresso da Meta</span>
                <div className="flex items-center gap-2">
                  <span className={`font-bold text-lg ${
                    monthlyTarget.progress >= 100 ? 'text-success' : 
                    monthlyTarget.progress >= 70 ? 'text-orange-500' : 'text-muted-foreground'
                  }`}>
                    {monthlyTarget.progress.toFixed(1)}%
                  </span>
                  {monthlyTarget.progress >= 100 && <span className="text-success">🎉</span>}
                </div>
              </div>
              <Progress 
                value={monthlyTarget.progress} 
                className="h-4 bg-muted/50"
              />
              <div className="text-xs text-muted-foreground text-center">
                Faltam {formatCurrency(Math.max(0, monthlyTarget.target - monthlyTarget.currentSales))} para atingir a meta
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="card-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">💰 Vendas Totais</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green">
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
            <div className="text-2xl font-bold text-blue">
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

        <Card className="card-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">📦 Packs Vendidos</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.packsVendidos}</div>
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
        <CardContent className="p-4">
          <ResponsiveContainer width="100%" height={400}>
            <BarChart 
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="day" 
                tick={{ fontSize: 12 }}
                height={60}
              />
              <YAxis 
                tickFormatter={(value) => formatCurrency(value)}
                tick={{ fontSize: 11 }}
                width={80}
              />
              <Tooltip 
                formatter={(value: number) => formatCurrency(value)}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
              />
              <Bar dataKey="forecast" fill="hsl(var(--accent))" name="Forecast">
                <LabelList 
                  dataKey="forecast" 
                  position="top" 
                  formatter={(value: number) => formatCurrency(value)}
                  style={{ fontSize: '12px', fill: 'hsl(var(--foreground))', fontWeight: '600' }}
                />
              </Bar>
              <Bar dataKey="vendas" fill="hsl(var(--primary))" name="Vendas">
                <LabelList 
                  dataKey="vendas" 
                  position="top" 
                  formatter={(value: number) => formatCurrency(value)}
                  style={{ fontSize: '12px', fill: 'hsl(var(--foreground))', fontWeight: '600' }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;