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

type Period = "HOJE" | "SEMANAL" | "MENSAL";
type Product = "TRIMBLE" | "CHAOS" | "TODOS";

interface DashboardData {
  vendasTotais: number;
  forecast: number;
  licencasRenovar: number;
  renovado: { percent: number; quantity: number; trend: number };
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
    renovado: { percent: 0, quantity: 0, trend: 0 },
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
      const { data: profiles, error } = await supabase.rpc('get_secure_team_basic_info');

      if (error) {
        console.error("Error loading sellers:", error);
        return;
      }

      setSellers(profiles && Array.isArray(profiles) ? profiles.map(p => ({ id: p.user_id, name: p.name })) : []);
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

  // Helper function to find the last report with valid renovado values
  const findLastValidRenovadoReport = (reports: any[]) => {
    if (!reports || reports.length === 0) return null;
    
    const sortedReports = reports.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    // Find the last report with non-zero renovado values
    const validReport = sortedReports.find(report => 
      (report.sketchup_renewed || 0) > 0 || (report.chaos_renewed || 0) > 0
    );
    
    // If no valid report found, return the latest report as fallback
    return validReport || sortedReports[0];
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
        case "SEMANAL":
          startDate = new Date(today);
          const dayOfWeek = today.getDay();
          const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Sunday = 0, Monday = 1
          startDate.setDate(today.getDate() - daysToMonday);
          break;
        case "MENSAL":
          startDate = new Date(today.getFullYear(), today.getMonth(), 1);
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

      // Calculate license metrics based on special logic:
      // These metrics need their own queries independent of the main period filter
      let licensePeriodTotals = { licencasRenovar: 0, renovadoQty: 0 };
      
      // For license metrics, we need to query the appropriate period regardless of main filter
      let licenseQuery = supabase.from("daily_reports").select("*");
      
      // Filter by user if not gestor or if gestor selected specific seller
      if (!isGestor) {
        licenseQuery = licenseQuery.eq("user_id", profile.user_id);
      } else if (selectedSeller !== "TODOS") {
        licenseQuery = licenseQuery.eq("user_id", selectedSeller);
      }

      let licenseStartDate = new Date();
      
      if (period === "HOJE" || period === "SEMANAL") {
        // For HOJE and SEMANAL: get current week data (Monday to today)
        const dayOfWeek = today.getDay();
        const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        licenseStartDate.setDate(today.getDate() - daysToMonday);
      } else if (period === "MENSAL") {
        // For MENSAL: get current month data
        licenseStartDate = new Date(today.getFullYear(), today.getMonth(), 1);
      }

      licenseQuery = licenseQuery.gte("date", licenseStartDate.toISOString().split('T')[0]);
      const { data: licenseReports } = await licenseQuery;

      if (period === "HOJE" || period === "SEMANAL") {
        if (isGestor && selectedSeller === "TODOS") {
          // For gestor viewing team data: get most recent report per user and sum
          const userLatestReports = new Map();
          licenseReports?.forEach(report => {
            const currentLatest = userLatestReports.get(report.user_id);
            if (!currentLatest || new Date(report.date) > new Date(currentLatest.date)) {
              userLatestReports.set(report.user_id, report);
            }
          });
          
          // Sum "licencas a renovar" from most recent report of each user
          userLatestReports.forEach(report => {
            if (product === "TRIMBLE" || product === "TODOS") {
              licensePeriodTotals.licencasRenovar += report.sketchup_to_renew || 0;
            }
            if (product === "CHAOS" || product === "TODOS") {
              licensePeriodTotals.licencasRenovar += report.chaos_to_renew || 0;
            }
          });
          
          // Sum ALL "renovado" from valid reports of all team members using findLastValidRenovadoReport
          if (licenseReports && licenseReports.length > 0) {
            // Group reports by user_id
            const userReportsMap = new Map();
            licenseReports.forEach(report => {
              if (!userReportsMap.has(report.user_id)) {
                userReportsMap.set(report.user_id, []);
              }
              userReportsMap.get(report.user_id).push(report);
            });
            
            // For each user, find their last valid renovado report and sum
            userReportsMap.forEach(userReports => {
              const latestValidReport = findLastValidRenovadoReport(userReports);
              if (latestValidReport) {
                if (product === "TRIMBLE" || product === "TODOS") {
                  licensePeriodTotals.renovadoQty += latestValidReport.sketchup_renewed || 0;
                }
                if (product === "CHAOS" || product === "TODOS") {
                  licensePeriodTotals.renovadoQty += latestValidReport.chaos_renewed || 0;
                }
              }
            });
          }
          
        } else {
          // For individual user or specific seller selected
          const mostRecentReport = licenseReports
            ?.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
          
          if (mostRecentReport) {
            if (product === "TRIMBLE" || product === "TODOS") {
              licensePeriodTotals.licencasRenovar += mostRecentReport.sketchup_to_renew || 0;
            }
            if (product === "CHAOS" || product === "TODOS") {
              licensePeriodTotals.licencasRenovar += mostRecentReport.chaos_to_renew || 0;
            }
          }

          // Use accumulated total from latest valid report
          if (licenseReports && licenseReports.length > 0) {
            const latestValidReport = findLastValidRenovadoReport(licenseReports);
            
            if (latestValidReport) {
              if (product === "TRIMBLE" || product === "TODOS") {
                licensePeriodTotals.renovadoQty += latestValidReport.sketchup_renewed || 0;
              }
              if (product === "CHAOS" || product === "TODOS") {
                licensePeriodTotals.renovadoQty += latestValidReport.chaos_renewed || 0;
              }
            }
          }
        }

      } else if (period === "MENSAL") {
        // For monthly: get last report of current month and previous month end
        const sortedReports = (licenseReports || []).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        if (sortedReports.length > 0) {
          // Get Monday report for "licencas a renovar" (use first Monday of the month or first available)
          const mondayReport = sortedReports.find(report => {
            const reportDate = new Date(report.date);
            return reportDate.getDay() === 1;
          }) || sortedReports[0];
          
          if (mondayReport) {
            if (product === "TRIMBLE" || product === "TODOS") {
              licensePeriodTotals.licencasRenovar += mondayReport.sketchup_to_renew || 0;
            }
            if (product === "CHAOS" || product === "TODOS") {
              licensePeriodTotals.licencasRenovar += mondayReport.chaos_to_renew || 0;
            }
          }
          
          // Use accumulated total from latest valid report  
          const latestValidReport = findLastValidRenovadoReport(sortedReports);
          
          if (latestValidReport) {
            if (product === "TRIMBLE" || product === "TODOS") {
              licensePeriodTotals.renovadoQty += latestValidReport.sketchup_renewed || 0;
            }
            if (product === "CHAOS" || product === "TODOS") {
              licensePeriodTotals.renovadoQty += latestValidReport.chaos_renewed || 0;
            }
          }
        }
      }

      const currentRenovadoPercent = licensePeriodTotals.licencasRenovar > 0 
        ? (licensePeriodTotals.renovadoQty / licensePeriodTotals.licencasRenovar) * 100 
        : 0;

      // Calculate previous period for trend comparison
      let previousStartDate = new Date();
      let previousEndDate = new Date();

      if (period === "HOJE" || period === "SEMANAL") {
        // Compare with previous week
        previousStartDate = new Date(today);
        const dayOfWeek = today.getDay();
        const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        previousStartDate.setDate(today.getDate() - daysToMonday - 7);
        previousEndDate = new Date(previousStartDate);
        previousEndDate.setDate(previousStartDate.getDate() + 6);
      } else if (period === "MENSAL") {
        // Compare with previous month
        previousStartDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        previousEndDate = new Date(today.getFullYear(), today.getMonth(), 0);
      }

      // Query for previous period data
      let previousQuery = supabase.from("daily_reports").select("*");
      if (!isGestor) {
        previousQuery = previousQuery.eq("user_id", profile.user_id);
      } else if (selectedSeller !== "TODOS") {
        previousQuery = previousQuery.eq("user_id", selectedSeller);
      }
      
      previousQuery = previousQuery
        .gte("date", previousStartDate.toISOString().split('T')[0])
        .lte("date", previousEndDate.toISOString().split('T')[0]);

      const { data: previousReports } = await previousQuery;

      // Calculate previous period for trend comparison
      let previousTotals = { licencasRenovar: 0, renovadoQty: 0 };
      
      if (period === "HOJE" || period === "SEMANAL") {
        // For current week filters, compare with previous week
        const previousWeekReports = previousReports || [];

        // Get Monday report for "licencas a renovar"
        const mondayReport = previousWeekReports.find(report => {
          const reportDate = new Date(report.date);
          return reportDate.getDay() === 1;
        });
        
        // Get latest valid report for "renovado"
        const latestValidReport = findLastValidRenovadoReport(previousWeekReports);

        if (mondayReport) {
          if (product === "TRIMBLE" || product === "TODOS") {
            previousTotals.licencasRenovar += mondayReport.sketchup_to_renew || 0;
          }
          if (product === "CHAOS" || product === "TODOS") {
            previousTotals.licencasRenovar += mondayReport.chaos_to_renew || 0;
          }
        }

        if (latestValidReport) {
          // Use accumulated total from latest valid report of previous week
          if (product === "TRIMBLE" || product === "TODOS") {
            previousTotals.renovadoQty += latestValidReport.sketchup_renewed || 0;
          }
          if (product === "CHAOS" || product === "TODOS") {
            previousTotals.renovadoQty += latestValidReport.chaos_renewed || 0;
          }
        }

      } else if (period === "MENSAL") {
        // For monthly filter, calculate difference between first and last reports of previous month
        const sortedPreviousReports = (previousReports || []).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        if (sortedPreviousReports.length > 0) {
          const firstReport = sortedPreviousReports[0];
          const lastReport = sortedPreviousReports[sortedPreviousReports.length - 1];
          
          // Get Monday report for "licencas a renovar" (use first Monday or first available)
          const mondayReport = sortedPreviousReports.find(report => {
            const reportDate = new Date(report.date);
            return reportDate.getDay() === 1;
          }) || firstReport;
          
          if (mondayReport) {
            if (product === "TRIMBLE" || product === "TODOS") {
              previousTotals.licencasRenovar += mondayReport.sketchup_to_renew || 0;
            }
            if (product === "CHAOS" || product === "TODOS") {
              previousTotals.licencasRenovar += mondayReport.chaos_to_renew || 0;
            }
          }
          
          // Use accumulated total from latest valid report of previous month
          const latestValidReport = findLastValidRenovadoReport(sortedPreviousReports);
          
          if (latestValidReport) {
            if (product === "TRIMBLE" || product === "TODOS") {
              previousTotals.renovadoQty += latestValidReport.sketchup_renewed || 0;
            }
            if (product === "CHAOS" || product === "TODOS") {
              previousTotals.renovadoQty += latestValidReport.chaos_renewed || 0;
            }
          }
        }
      }

      const previousRenovadoPercent = previousTotals.licencasRenovar > 0 
        ? (previousTotals.renovadoQty / previousTotals.licencasRenovar) * 100 
        : 0;

      // Calculate trend (difference between current and previous period)
      const trendPercent = currentRenovadoPercent - previousRenovadoPercent;

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

      console.log("DEBUG - Calculated totals:", totals);

      setData({
        ...totals,
        licencasRenovar: licensePeriodTotals.licencasRenovar,
        renovado: {
          percent: currentRenovadoPercent,
          quantity: licensePeriodTotals.renovadoQty,
          trend: trendPercent,
        },
        churn: 100 - currentRenovadoPercent,
      });

      // Generate chart data for last 5 business days (independent of period filter)
      await generateChartData();

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

  const generateChartData = async () => {
    try {
      const last5BusinessDays = [];
      const today = new Date();
      let currentDate = new Date(today);
      let daysAdded = 0;

      const businessDates = [];
      while (daysAdded < 5) {
        // Skip weekends (0 = Sunday, 6 = Saturday)
        if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
          businessDates.push(currentDate.toISOString().split('T')[0]);
          daysAdded++;
        }
        currentDate.setDate(currentDate.getDate() - 1);
      }

      // Query for the last 5 business days
      let query = supabase
        .from("daily_reports")
        .select("date, forecast_amount, sales_amount")
        .in("date", businessDates);

      // Apply user filter based on role
      if (profile?.role === "gestor") {
        if (selectedSeller && selectedSeller !== "TODOS") {
          // Specific seller selected
          query = query.eq("user_id", selectedSeller);
        }
        // If no seller selected, show aggregated data for all team (no additional filter needed)
      } else if (profile?.role === "vendedor") {
        query = query.eq("user_id", profile?.user_id);
      }

      const { data: chartReports } = await query;

      // Process the data for chart
      businessDates.reverse().forEach(dateStr => {
        const dayReports = chartReports?.filter(r => r.date === dateStr) || [];
        
        const dayForecast = dayReports.reduce((sum, r) => sum + (r.forecast_amount || 0), 0);
        const dayVendas = dayReports.reduce((sum, r) => sum + (r.sales_amount || 0), 0);

        const date = new Date(dateStr);
        last5BusinessDays.push({
          day: date.toLocaleDateString('pt-BR', { weekday: 'short' }),
          forecast: dayForecast,
          vendas: dayVendas,
        });
      });

      setChartData(last5BusinessDays);
    } catch (error) {
      console.error("Error loading chart data:", error);
    }
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
              <SelectItem value="SEMANAL">Semanal</SelectItem>
              <SelectItem value="MENSAL">Mensal</SelectItem>
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
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold text-success">
                {data.renovado.percent.toFixed(1)}%
              </div>
              {data.renovado.trend !== 0 && (
                <div className={`flex items-center gap-1 text-xs font-medium ${
                  data.renovado.trend > 0 ? 'text-success' : 'text-destructive'
                }`}>
                  {data.renovado.trend > 0 ? '↗' : '↘'}
                  {Math.abs(data.renovado.trend).toFixed(1)}%
                </div>
              )}
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
              <Bar dataKey="forecast" fill="hsl(var(--blue))" name="Forecast">
                <LabelList 
                  dataKey="forecast" 
                  position="top" 
                  formatter={(value: number) => formatCurrency(value)}
                  style={{ fontSize: '12px', fill: 'hsl(var(--foreground))', fontWeight: '600' }}
                />
              </Bar>
              <Bar dataKey="vendas" fill="hsl(var(--green))" name="Vendas">
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