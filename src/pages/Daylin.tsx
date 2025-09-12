import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Sun, 
  Moon, 
  Target, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Edit,
  Save,
  X,
  CalendarIcon,
  RotateCcw
} from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { subDays } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { useFormPersist } from "@/hooks/useFormPersist";

interface DailyReport {
  id?: string;
  date: string;
  started_at?: string;
  mood?: string;
  sketchup_to_renew: number;
  chaos_to_renew: number;
  forecast_amount: number;
  daily_strategy?: string;
  ended_at?: string;
  difficulties?: string;
  sketchup_renewed: number;
  chaos_renewed: number;
  sales_amount: number;
  cross_selling: number;
  onboarding: number;
  onboarding_details?: string;
  packs_vendidos: number;
}

interface SellerDaylinStatus {
  id: string;
  name: string;
  user_id: string;
  report_id?: string;
  started_at?: string;
  ended_at?: string;
  mood?: string;
  forecast_amount?: number;
  sketchup_to_renew?: number;
  chaos_to_renew?: number;
  daily_strategy?: string;
  difficulties?: string;
  sketchup_renewed?: number;
  chaos_renewed?: number;
  sales_amount?: number;
  cross_selling?: number;
  onboarding?: number;
  onboarding_details?: string;
  packs_vendidos?: number;
}

interface MonthlyTarget {
  id?: string;
  user_id: string;
  month: number;
  year: number;
  target_amount: number;
  created_by: string;
}

interface SellerWithTarget {
  id: string;
  name: string;
  user_id: string;
  target?: MonthlyTarget;
  currentSales: number;
  progress: number;
}

const Daylin = () => {
  const { profile, isGestor } = useAuth();
  const [todayReport, setTodayReport] = useState<DailyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showEndDayAlert, setShowEndDayAlert] = useState(false);
  
  // Gestor states
  const [sellersStatus, setSellersStatus] = useState<SellerDaylinStatus[]>([]);
  const [gestorLoading, setGestorLoading] = useState(false);
  
  // Date selection states for gestor
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  // Targets states for gestor
  const [sellersWithTargets, setSellersWithTargets] = useState<SellerWithTarget[]>([]);
  const [editingTarget, setEditingTarget] = useState<string | null>(null);
  const [targetForm, setTargetForm] = useState({ amount: "" });

  // Edit report states for gestor
  const [editingReport, setEditingReport] = useState<string | null>(null);
  const [editReportForm, setEditReportForm] = useState({
    mood: "",
    sketchup_to_renew: "",
    chaos_to_renew: "",
    forecast_amount: "",
    daily_strategy: "",
    difficulties: "",
    sketchup_renewed: "",
    chaos_renewed: "",
    sales_amount: "",
    cross_selling: "",
    onboarding: "",
    onboarding_details: "",
    packs_vendidos: "",
  });

  // Start day form state with persistence
  const {
    formData: startForm,
    updateField: updateStartField,
    clearPersistedData: clearStartForm,
    isLoading: startFormLoading
  } = useFormPersist({
    key: 'daylin-start-form',
    initialState: {
      mood: "",
      sketchup_to_renew: "",
      chaos_to_renew: "",
      forecast_amount: "",
      daily_strategy: "",
    }
  });

  // End day form state with persistence
  const {
    formData: endForm,
    updateField: updateEndField,
    setFormData: setEndForm,
    clearPersistedData: clearEndForm,
    isLoading: endFormLoading
  } = useFormPersist({
    key: 'daylin-end-form',
    initialState: {
      difficulties: "",
      sketchup_renewed: "",
      chaos_renewed: "",
      sales_amount: "",
      cross_selling: "",
      onboarding: "",
      onboarding_details: "",
      packs_vendidos: "",
    }
  });

  // Validation helpers
  const isStartFormValid = () => {
    return startForm.mood?.trim() && 
           startForm.forecast_amount?.trim() && 
           startForm.daily_strategy?.trim();
  };

  const isEndFormValid = () => {
    return endForm.sales_amount?.trim() && 
           endForm.difficulties?.trim();
  };

  const loadTodayReport = async () => {
    if (!profile) return;

    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from("daily_reports")
        .select("*")
        .eq("user_id", profile.user_id)
        .eq("date", today)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error("Error loading today's report:", error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar o relatório de hoje",
          variant: "destructive",
        });
        return;
      }

      setTodayReport(data);

      // If report exists and started, populate end form with current values
      if (data && data.started_at) {
        setEndForm({
          difficulties: data.difficulties || "",
          sketchup_renewed: data.sketchup_renewed?.toString() || "",
          chaos_renewed: data.chaos_renewed?.toString() || "",
          sales_amount: data.sales_amount?.toString() || "",
          cross_selling: data.cross_selling?.toString() || "",
          onboarding: data.onboarding?.toString() || "",
          onboarding_details: data.onboarding_details || "",
          packs_vendidos: data.packs_vendidos?.toString() || "",
        });
      }

    } catch (error) {
      console.error("Error loading report:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadSellersStatus = async (date?: Date) => {
    if (!profile || !isGestor) return;

    setGestorLoading(true);
    try {
      const queryDate = date ? date.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
      
      // Get all sellers (vendedor role) using secure function
      const { data: sellers, error: sellersError } = await supabase.rpc('get_secure_team_basic_info');

      if (sellersError) {
        console.error("Error loading sellers:", sellersError);
        toast({
          title: "Erro",
          description: "Não foi possível carregar a lista de vendedores",
          variant: "destructive",
        });
        return;
      }

      // Get reports for selected date
      const { data: reports, error: reportsError } = await supabase
        .from("daily_reports")
        .select("id, user_id, started_at, ended_at, mood, forecast_amount, sketchup_to_renew, chaos_to_renew, daily_strategy, difficulties, sketchup_renewed, chaos_renewed, sales_amount, cross_selling, onboarding, onboarding_details, packs_vendidos")
        .eq("date", queryDate);

      if (reportsError) {
        console.error("Error loading reports:", reportsError);
        toast({
          title: "Erro", 
          description: "Não foi possível carregar os relatórios diários",
          variant: "destructive",
        });
        return;
      }

      // Combine sellers with their reports (map seller data correctly)
      const sellersWithStatus: SellerDaylinStatus[] = sellers?.map(seller => {
        const report = reports?.find(r => r.user_id === seller.user_id);
        return {
          id: seller.user_id, // Use user_id as id for consistency
          name: seller.name,
          user_id: seller.user_id,
          report_id: report?.id,
          started_at: report?.started_at,
          ended_at: report?.ended_at,
          mood: report?.mood,
          forecast_amount: report?.forecast_amount,
          sketchup_to_renew: report?.sketchup_to_renew,
          chaos_to_renew: report?.chaos_to_renew,
          daily_strategy: report?.daily_strategy,
          difficulties: report?.difficulties,
          sketchup_renewed: report?.sketchup_renewed,
          chaos_renewed: report?.chaos_renewed,
          sales_amount: report?.sales_amount,
          cross_selling: report?.cross_selling,
          onboarding: report?.onboarding,
          onboarding_details: report?.onboarding_details,
          packs_vendidos: report?.packs_vendidos,
        };
      }) || [];

      setSellersStatus(sellersWithStatus);

    } catch (error) {
      console.error("Error loading sellers status:", error);
    } finally {
      setGestorLoading(false);
    }
  };

  const loadSellersWithTargets = async () => {
    if (!profile || !isGestor) return;

    try {
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();
      const firstDayOfMonth = new Date(currentYear, currentMonth - 1, 1).toISOString().split('T')[0];
      const lastDayOfMonth = new Date(currentYear, currentMonth, 0).toISOString().split('T')[0];
      
      // Get all sellers using secure function
      const { data: sellers, error: sellersError } = await supabase.rpc('get_secure_team_basic_info');

      if (sellersError) {
        console.error("Error loading sellers:", sellersError);
        return;
      }

      // Get current month targets
      const { data: targets, error: targetsError } = await supabase
        .from("monthly_targets")
        .select("*")
        .eq("month", currentMonth)
        .eq("year", currentYear);

      if (targetsError) {
        console.error("Error loading targets:", targetsError);
        return;
      }

      // Get sales for current month
      const { data: monthSales, error: salesError } = await supabase
        .from("daily_reports")
        .select("user_id, sales_amount")
        .gte("date", firstDayOfMonth)
        .lte("date", lastDayOfMonth)
        .not("sales_amount", "is", null);

      if (salesError) {
        console.error("Error loading month sales:", salesError);
        return;
      }

      // Combine data (map seller data correctly)
      const sellersWithTargets: SellerWithTarget[] = sellers?.map(seller => {
        const target = targets?.find(t => t.user_id === seller.user_id);
        const sellerSales = monthSales?.filter(s => s.user_id === seller.user_id) || [];
        const currentSales = sellerSales.reduce((acc, sale) => acc + (sale.sales_amount || 0), 0);
        const progress = target?.target_amount ? (currentSales / target.target_amount) * 100 : 0;

        return {
          id: seller.user_id, // Use user_id as id for consistency
          name: seller.name,
          user_id: seller.user_id,
          target,
          currentSales,
          progress: Math.min(progress, 100)
        };
      }) || [];

      setSellersWithTargets(sellersWithTargets);

    } catch (error) {
      console.error("Error loading sellers with targets:", error);
    }
  };

  const saveTarget = async (sellerId: string, amount: number) => {
    if (!profile || !isGestor) return;

    try {
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();

      const { error } = await supabase
        .from("monthly_targets")
        .upsert({
          user_id: sellerId,
          month: currentMonth,
          year: currentYear,
          target_amount: amount,
          created_by: profile.user_id
        }, {
          onConflict: "user_id,month,year"
        });

      if (error) {
        console.error("Error saving target:", error);
        toast({
          title: "Erro",
          description: "Não foi possível salvar a meta",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Meta salva!",
        description: "A meta foi definida com sucesso.",
      });

      loadSellersWithTargets();
      setEditingTarget(null);
      setTargetForm({ amount: "" });

    } catch (error) {
      console.error("Error saving target:", error);
    }
  };

  const saveEditedReport = async (reportId: string) => {
    if (!profile || !isGestor) return;

    console.log("Salvando relatório editado:", reportId);
    console.log("Dados do formulário:", editReportForm);

    try {
      const updateData = {
        mood: editReportForm.mood,
        sketchup_to_renew: parseInt(editReportForm.sketchup_to_renew) || 0,
        chaos_to_renew: parseInt(editReportForm.chaos_to_renew) || 0,
        forecast_amount: parseDecimalValue(editReportForm.forecast_amount),
        daily_strategy: editReportForm.daily_strategy,
        difficulties: editReportForm.difficulties,
        sketchup_renewed: parseInt(editReportForm.sketchup_renewed) || 0,
        chaos_renewed: parseInt(editReportForm.chaos_renewed) || 0,
        sales_amount: parseDecimalValue(editReportForm.sales_amount),
        cross_selling: parseInt(editReportForm.cross_selling) || 0,
        onboarding: parseInt(editReportForm.onboarding) || 0,
        onboarding_details: editReportForm.onboarding_details,
        packs_vendidos: parseInt(editReportForm.packs_vendidos) || 0,
      };

      console.log("Dados para atualizar:", updateData);

      const { error } = await supabase
        .from("daily_reports")
        .update(updateData)
        .eq("id", reportId);

      if (error) {
        console.error("Error updating report:", error);
        toast({
          title: "Erro",
          description: "Não foi possível salvar as alterações",
          variant: "destructive",
        });
        return;
      }

      console.log("Relatório atualizado com sucesso");

      toast({
        title: "Alterações salvas!",
        description: "Os dados do Daylin foram atualizados com sucesso.",
      });

      loadSellersStatus(selectedDate);
      setEditingReport(null);
      setEditReportForm({
        mood: "",
        sketchup_to_renew: "",
        chaos_to_renew: "",
        forecast_amount: "",
        daily_strategy: "",
        difficulties: "",
        sketchup_renewed: "",
        chaos_renewed: "",
        sales_amount: "",
        cross_selling: "",
        onboarding: "",
        onboarding_details: "",
        packs_vendidos: "",
      });

    } catch (error) {
      console.error("Error updating report:", error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado ao salvar",
        variant: "destructive",
      });
    }
  };

  // Helper function to check if today is Monday
  const isMonday = () => {
    return new Date().getDay() === 1;
  };

  // Helper function to get Monday of current week
  const getMondayOfWeek = (date = new Date()) => {
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    const monday = new Date(date.setDate(diff));
    return monday.toISOString().split('T')[0];
  };

  // Load renewal data from Monday of current week
  const loadWeeklyRenewalData = async () => {
    if (!profile || isMonday()) return; // Don't load if it's Monday (user will input fresh data)

    try {
      const mondayDate = getMondayOfWeek();
      
      const { data: mondayReport } = await supabase
        .from("daily_reports")
        .select("sketchup_to_renew, chaos_to_renew")
        .eq("user_id", profile.user_id)
        .eq("date", mondayDate)
        .maybeSingle();

      if (mondayReport) {
        // Update the start form with Monday's renewal data
        updateStartField('sketchup_to_renew', mondayReport.sketchup_to_renew?.toString() || "");
        updateStartField('chaos_to_renew', mondayReport.chaos_to_renew?.toString() || "");
      }
    } catch (error) {
      console.error("Error loading weekly renewal data:", error);
    }
  };

  const checkEndDayAlert = () => {
    const currentHour = new Date().getHours();
    if (todayReport?.started_at && !todayReport?.ended_at && currentHour >= 18) {
      setShowEndDayAlert(true);
    }
  };

  // Helper function to format decimal values for display in inputs
  const formatDecimalForInput = (value: number | undefined): string => {
    if (!value || value === 0) return "";
    // Simply return the number as string without formatting
    return value.toString();
  };

  // Helper function to parse decimal values - simplified version
  const parseDecimalValue = (value: string): number => {
    if (!value) return 0;
    
    // Remove any spaces
    let cleanValue = value.replace(/\s/g, '');
    
    // If has comma as decimal separator (e.g. "44525,50")
    if (cleanValue.includes(',')) {
      cleanValue = cleanValue.replace(',', '.');
    }
    
    // Parse as float
    const result = parseFloat(cleanValue);
    return isNaN(result) ? 0 : result;
  };

  const handleStartDay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setSubmitting(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const reportData = {
        user_id: profile.user_id,
        date: today,
        started_at: new Date().toISOString(),
        mood: startForm.mood,
        sketchup_to_renew: parseInt(startForm.sketchup_to_renew) || 0,
        chaos_to_renew: parseInt(startForm.chaos_to_renew) || 0,
        forecast_amount: parseDecimalValue(startForm.forecast_amount),
        daily_strategy: startForm.daily_strategy,
      };

      const { data, error } = await supabase
        .from("daily_reports")
        .upsert(reportData, {
          onConflict: "user_id,date"
        })
        .select()
        .single();

      if (error) {
        toast({
          title: "Erro",
          description: "Não foi possível iniciar o dia",
          variant: "destructive",
        });
        return;
      }

      setTodayReport(data);
      toast({
        title: "Dia iniciado com sucesso!",
        description: "Bom trabalho! Seus indicadores estão ativos.",
      });

      // Clear form data from localStorage
      clearStartForm();

    } catch (error) {
      console.error("Error starting day:", error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEndDay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !todayReport) return;

    setSubmitting(true);
    try {
      const updateData = {
        ended_at: new Date().toISOString(),
        difficulties: endForm.difficulties,
        sketchup_renewed: parseInt(endForm.sketchup_renewed) || 0,
        chaos_renewed: parseInt(endForm.chaos_renewed) || 0,
        sales_amount: parseDecimalValue(endForm.sales_amount),
        cross_selling: parseInt(endForm.cross_selling) || 0,
        onboarding: parseInt(endForm.onboarding) || 0,
        onboarding_details: endForm.onboarding_details,
        packs_vendidos: parseInt(endForm.packs_vendidos) || 0,
      };

      const { data, error } = await supabase
        .from("daily_reports")
        .update(updateData)
        .eq("id", todayReport.id)
        .select()
        .single();

      if (error) {
        toast({
          title: "Erro", 
          description: "Não foi possível encerrar o dia",
          variant: "destructive",
        });
        return;
      }

      setTodayReport(data);
      setShowEndDayAlert(false);
      toast({
        title: "Dia encerrado com sucesso!",
        description: "Parabéns! Seus resultados foram registrados.",
      });

      // Clear end form data from localStorage
      clearEndForm();

    } catch (error) {
      console.error("Error ending day:", error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || gestorLoading || (!isGestor && (startFormLoading || endFormLoading))) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-4 bg-muted rounded w-1/2"></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-96 bg-muted rounded"></div>
            <div className="h-96 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  // Gestor View
  if (isGestor) {
    const sellersNotStarted = sellersStatus.filter(s => !s.started_at);
    const sellersStarted = sellersStatus.filter(s => s.started_at && !s.ended_at);
    const sellersFinished = sellersStatus.filter(s => s.ended_at);
    const totalForecast = sellersStatus.reduce((acc, s) => acc + (s.forecast_amount || 0), 0);
    const currentMonth = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

    return (
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            📊 Daylin - Painel Gerencial
          </h1>
          <p className="text-muted-foreground">
            Acompanhe o status dos vendedores e suas metas
          </p>
        </div>

        <Tabs defaultValue="status" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="status">Status Diário</TabsTrigger>
            <TabsTrigger value="metas">Metas Mensais</TabsTrigger>
          </TabsList>

          {/* Compact Date Selector */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 bg-muted/20 rounded-lg border border-muted/30">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Selecionar Data</span>
            </div>
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
              <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full sm:w-auto justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-3 w-3" />
                    {selectedDate.toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit', 
                      year: 'numeric'
                    })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => {
                      if (date) {
                        setSelectedDate(date);
                        setShowDatePicker(false);
                      }
                    }}
                    disabled={(date) =>
                      date > new Date() || date < subDays(new Date(), 90)
                    }
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
              
              {selectedDate.toDateString() !== new Date().toDateString() && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedDate(new Date())}
                  className="flex items-center gap-1 text-xs"
                >
                  <RotateCcw className="h-3 w-3" />
                  Hoje
                </Button>
              )}
              
              <div className="text-xs text-muted-foreground">
                {selectedDate.toDateString() === new Date().toDateString() 
                  ? "Hoje" 
                  : selectedDate.toLocaleDateString('pt-BR')
                }
              </div>
            </div>
          </div>

          <TabsContent value="status" className="space-y-6">

            {/* Empty state for historical dates */}
            {selectedDate.toDateString() !== new Date().toDateString() && 
             sellersStatus.length === 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Não há dados registrados para {selectedDate.toLocaleDateString('pt-BR')}. 
                  Selecione uma data diferente ou volte para hoje.
                </AlertDescription>
              </Alert>
            )}

            {/* Resumo Principal */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="border-warning/50 bg-warning/5">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-5 w-5 text-warning" />
                    <span className="text-sm font-medium text-warning">⚠️ Ainda não iniciaram</span>
                  </div>
                  <p className="text-3xl font-bold text-warning">{sellersNotStarted.length}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {sellersNotStarted.length === 0 ? "Todos iniciaram! 🎉" : "vendedores precisam iniciar"}
                  </p>
                </CardContent>
              </Card>
              
              <Card className="border-orange-500/50 bg-orange-500/5">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-5 w-5 text-orange-500" />
                    <span className="text-sm font-medium text-orange-500">🔄 Não encerraram</span>
                  </div>
                  <p className="text-3xl font-bold text-orange-500">{sellersStarted.length}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {sellersStarted.length === 0 ? "Todos finalizaram!" : "ainda trabalhando"}
                  </p>
                </CardContent>
              </Card>

              <Card className="border-success/50 bg-success/5">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-5 w-5 text-success" />
                    <span className="text-sm font-medium text-success">✅ Finalizaram</span>
                  </div>
                  <p className="text-3xl font-bold text-success">{sellersFinished.length}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    dia completo
                  </p>
                </CardContent>
              </Card>

              <Card className="border-primary/50 bg-primary/5">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="h-5 w-5 text-primary" />
                    <span className="text-sm font-medium text-primary">🎯 Forecast Total</span>
                  </div>
                  <p className="text-xl font-bold text-primary">
                    R$ {totalForecast.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    previsão do dia
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Alertas Importantes */}
            <div className="space-y-4">
              {/* Vendedores que não iniciaram */}
              {sellersNotStarted.length > 0 && (
                <Alert className="border-warning/50 bg-warning/10">
                  <AlertTriangle className="h-4 w-4 text-warning" />
                  <AlertDescription className="text-warning-foreground">
                    <div className="flex items-center justify-between">
                      <span>
                        <strong>{sellersNotStarted.length} vendedor(es)</strong> ainda não iniciaram o Daylin hoje:
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {sellersNotStarted.map(seller => (
                        <Badge key={seller.id} variant="outline" className="border-warning text-warning">
                          {seller.name}
                        </Badge>
                      ))}
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* Vendedores que não encerraram (após 16h) */}
              {new Date().getHours() >= 16 && sellersStarted.length > 0 && (
                <Alert className="border-orange-500/50 bg-orange-500/10">
                  <Clock className="h-4 w-4 text-orange-500" />
                  <AlertDescription className="text-orange-900 dark:text-orange-100">
                    <div className="flex items-center justify-between">
                      <span>
                        <strong>{sellersStarted.length} vendedor(es)</strong> ainda não encerraram o dia:
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {sellersStarted.map(seller => (
                        <Badge key={seller.id} variant="outline" className="border-orange-500 text-orange-600">
                          {seller.name}
                        </Badge>
                      ))}
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* Resultados do Dia */}
            {sellersFinished.length > 0 && (
              <Card className="card-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    📊 Resultados do Dia
                  </CardTitle>
                  <CardDescription>
                    Índices consolidados dos vendedores que finalizaram
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    <div className="text-center p-4 rounded-lg bg-muted/30">
                      <p className="text-2xl font-bold text-primary">
                        R$ {sellersFinished.reduce((acc, s) => acc + (s.sales_amount || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-sm text-muted-foreground">Vendas Total</p>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-muted/30">
                      <p className="text-2xl font-bold text-blue-600">
                        {sellersFinished.reduce((acc, s) => acc + (s.sketchup_renewed || 0), 0)}
                      </p>
                      <p className="text-sm text-muted-foreground">SketchUp Renovado</p>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-muted/30">
                      <p className="text-2xl font-bold text-purple-600">
                        {sellersFinished.reduce((acc, s) => acc + (s.chaos_renewed || 0), 0)}
                      </p>
                      <p className="text-sm text-muted-foreground">Chaos Renovado</p>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-muted/30">
                      <p className="text-2xl font-bold text-green-600">
                        {sellersFinished.reduce((acc, s) => acc + (s.cross_selling || 0), 0)}
                      </p>
                      <p className="text-sm text-muted-foreground">Cross Selling</p>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-muted/30">
                      <p className="text-2xl font-bold text-indigo-600">
                        {sellersFinished.reduce((acc, s) => acc + (s.onboarding || 0), 0)}
                      </p>
                      <p className="text-sm text-muted-foreground">Onboarding</p>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-muted/30">
                      <p className="text-2xl font-bold text-amber-600">
                        {sellersFinished.reduce((acc, s) => acc + (s.packs_vendidos || 0), 0)}
                      </p>
                      <p className="text-sm text-muted-foreground">Packs Vendidos</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Detalhes dos Vendedores */}
            <Card className="card-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sun className="h-5 w-5 text-orange-500" />
                  👥 Detalhes dos Vendedores ({sellersStarted.length + sellersFinished.length})
                </CardTitle>
                <CardDescription>
                  Visualize e edite os dados dos vendedores que iniciaram o dia
                </CardDescription>
              </CardHeader>
              <CardContent className="max-h-96 overflow-y-auto">
                {[...sellersStarted, ...sellersFinished].length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">Nenhum vendedor iniciou o dia ainda.</p>
                ) : (
                   <div className="space-y-4">
                     {[...sellersStarted, ...sellersFinished].map(seller => (
                       <div key={seller.id} className="p-4 rounded-lg bg-muted/50 border">
                         {editingReport === seller.user_id ? (
                           <div className="space-y-4">
                             <div className="flex items-center justify-between mb-4">
                               <h4 className="font-medium">Editando: {seller.name}</h4>
                               <div className="flex items-center gap-2">
                                 <Button
                                   size="sm"
                                   onClick={() => {
                                     if (seller.report_id) {
                                       saveEditedReport(seller.report_id);
                                     }
                                   }}
                                 >
                                   <Save className="h-3 w-3 mr-1" />
                                   Salvar
                                 </Button>
                                 <Button
                                   size="sm"
                                   variant="outline"
                                   onClick={() => {
                                     setEditingReport(null);
                                      setEditReportForm({
                                        mood: "",
                                        sketchup_to_renew: "",
                                        chaos_to_renew: "",
                                        forecast_amount: "",
                                        daily_strategy: "",
                                        difficulties: "",
                                        sketchup_renewed: "",
                                        chaos_renewed: "",
                                        sales_amount: "",
                                        cross_selling: "",
                                        onboarding: "",
                                        onboarding_details: "",
                                        packs_vendidos: "",
                                      });
                                   }}
                                 >
                                   <X className="h-3 w-3" />
                                 </Button>
                               </div>
                             </div>
                             
                             <div className="grid grid-cols-1 gap-4">
                               <div className="space-y-2">
                                 <Label htmlFor="edit_mood">Humor</Label>
                                 <Textarea
                                   id="edit_mood"
                                   value={editReportForm.mood}
                                   onChange={(e) => setEditReportForm({ ...editReportForm, mood: e.target.value })}
                                   placeholder="Como o vendedor está se sentindo..."
                                   rows={2}
                                 />
                               </div>

                               <div className="grid grid-cols-2 gap-4">
                                 <div className="space-y-2">
                                   <Label htmlFor="edit_sketchup_to_renew">SketchUp (a renovar)</Label>
                                   <Input
                                     id="edit_sketchup_to_renew"
                                     type="number"
                                     min="0"
                                     value={editReportForm.sketchup_to_renew}
                                     onChange={(e) => setEditReportForm({ ...editReportForm, sketchup_to_renew: e.target.value })}
                                     placeholder="0"
                                   />
                                 </div>
                                 <div className="space-y-2">
                                   <Label htmlFor="edit_chaos_to_renew">Chaos (a renovar)</Label>
                                   <Input
                                     id="edit_chaos_to_renew"
                                     type="number"
                                     min="0"
                                     value={editReportForm.chaos_to_renew}
                                     onChange={(e) => setEditReportForm({ ...editReportForm, chaos_to_renew: e.target.value })}
                                     placeholder="0"
                                   />
                                 </div>
                               </div>

                               <div className="space-y-2">
                                 <Label htmlFor="edit_forecast_amount">Forecast (R$)</Label>
                                 <Input
                                   id="edit_forecast_amount"
                                   type="text"
                                   value={editReportForm.forecast_amount}
                                   onChange={(e) => setEditReportForm({ ...editReportForm, forecast_amount: e.target.value })}
                                   placeholder="0,00 ou 0.00"
                                 />
                               </div>

                               <div className="space-y-2">
                                 <Label htmlFor="edit_daily_strategy">Estratégia do dia</Label>
                                 <Textarea
                                   id="edit_daily_strategy"
                                   value={editReportForm.daily_strategy}
                                   onChange={(e) => setEditReportForm({ ...editReportForm, daily_strategy: e.target.value })}
                                   placeholder="Descreva a estratégia..."
                                   rows={2}
                                 />
                               </div>

                               {seller.ended_at && (
                                 <>
                                   <div className="space-y-2">
                                     <Label htmlFor="edit_difficulties">Dificuldades</Label>
                                     <Textarea
                                       id="edit_difficulties"
                                       value={editReportForm.difficulties}
                                       onChange={(e) => setEditReportForm({ ...editReportForm, difficulties: e.target.value })}
                                       placeholder="Principais dificuldades..."
                                       rows={2}
                                     />
                                   </div>

                                   <div className="grid grid-cols-2 gap-4">
                                     <div className="space-y-2">
                                       <Label htmlFor="edit_sketchup_renewed">SketchUp Renovado</Label>
                                       <Input
                                         id="edit_sketchup_renewed"
                                         type="number"
                                         min="0"
                                         value={editReportForm.sketchup_renewed}
                                         onChange={(e) => setEditReportForm({ ...editReportForm, sketchup_renewed: e.target.value })}
                                         placeholder="0"
                                       />
                                     </div>
                                     <div className="space-y-2">
                                       <Label htmlFor="edit_chaos_renewed">Chaos Renovado</Label>
                                       <Input
                                         id="edit_chaos_renewed"
                                         type="number"
                                         min="0"
                                         value={editReportForm.chaos_renewed}
                                         onChange={(e) => setEditReportForm({ ...editReportForm, chaos_renewed: e.target.value })}
                                         placeholder="0"
                                       />
                                     </div>
                                   </div>

                                   <div className="space-y-2">
                                     <Label htmlFor="edit_sales_amount">Vendas (R$)</Label>
                                     <Input
                                       id="edit_sales_amount"
                                       type="text"
                                       value={editReportForm.sales_amount}
                                       onChange={(e) => setEditReportForm({ ...editReportForm, sales_amount: e.target.value })}
                                       placeholder="0,00 ou 0.00"
                                     />
                                   </div>

                                   <div className="grid grid-cols-3 gap-4">
                                     <div className="space-y-2">
                                       <Label htmlFor="edit_cross_selling">Cross Selling</Label>
                                       <Input
                                         id="edit_cross_selling"
                                         type="number"
                                         min="0"
                                         value={editReportForm.cross_selling}
                                         onChange={(e) => setEditReportForm({ ...editReportForm, cross_selling: e.target.value })}
                                         placeholder="0"
                                       />
                                     </div>
                                     <div className="space-y-2">
                                       <Label htmlFor="edit_onboarding">Onboarding</Label>
                                       <Input
                                         id="edit_onboarding"
                                         type="number"
                                         min="0"
                                         value={editReportForm.onboarding}
                                         onChange={(e) => setEditReportForm({ ...editReportForm, onboarding: e.target.value })}
                                         placeholder="0"
                                       />
                                     </div>
                                     <div className="space-y-2">
                                       <Label htmlFor="edit_packs_vendidos">Packs Vendidos</Label>
                                       <Input
                                         id="edit_packs_vendidos"
                                         type="number"
                                         min="0"
                                         value={editReportForm.packs_vendidos}
                                         onChange={(e) => setEditReportForm({ ...editReportForm, packs_vendidos: e.target.value })}
                                         placeholder="0"
                                       />
                                     </div>
                                   </div>

                                   <div className="space-y-2">
                                     <Label htmlFor="edit_onboarding_details">Detalhes do Onboarding</Label>
                                     <Textarea
                                       id="edit_onboarding_details"
                                       value={editReportForm.onboarding_details}
                                       onChange={(e) => setEditReportForm({ ...editReportForm, onboarding_details: e.target.value })}
                                       placeholder="Descreva os detalhes dos onboardings..."
                                       rows={2}
                                     />
                                   </div>
                                 </>
                               )}
                             </div>
                           </div>
                         ) : (
                           <>
                             <div className="flex items-center justify-between mb-2">
                               <h4 className="font-medium">{seller.name}</h4>
                               <div className="flex items-center gap-2">
                                 {seller.report_id && (
                                   <Button
                                     size="sm"
                                     variant="outline"
                                     onClick={() => {
                                       setEditingReport(seller.user_id);
                                        setEditReportForm({
                                          mood: seller.mood || "",
                                          sketchup_to_renew: seller.sketchup_to_renew?.toString() || "",
                                          chaos_to_renew: seller.chaos_to_renew?.toString() || "",
                                          forecast_amount: formatDecimalForInput(seller.forecast_amount),
                                          daily_strategy: seller.daily_strategy || "",
                                          difficulties: seller.difficulties || "",
                                          sketchup_renewed: seller.sketchup_renewed?.toString() || "",
                                          chaos_renewed: seller.chaos_renewed?.toString() || "",
                                          sales_amount: formatDecimalForInput(seller.sales_amount),
                                          cross_selling: seller.cross_selling?.toString() || "",
                                          onboarding: seller.onboarding?.toString() || "",
                                          onboarding_details: seller.onboarding_details || "",
                                          packs_vendidos: seller.packs_vendidos?.toString() || "",
                                        });
                                     }}
                                   >
                                     <Edit className="h-3 w-3 mr-1" />
                                     Editar
                                   </Button>
                                 )}
                                 {seller.ended_at ? (
                                   <Badge variant="secondary" className="bg-success/10 text-success border-success/20">
                                     <CheckCircle className="w-3 h-3 mr-1" />
                                     Finalizado
                                   </Badge>
                                 ) : (
                                   <Badge variant="secondary" className="bg-orange-500/10 text-orange-500 border-orange-500/20">
                                     <Sun className="w-3 h-3 mr-1" />
                                     Ativo
                                   </Badge>
                                 )}
                               </div>
                             </div>
                             
                             <div className="grid grid-cols-2 gap-4 text-sm">
                               <div>
                                 <span className="text-muted-foreground">Iniciou:</span>
                                 <p>{seller.started_at ? new Date(seller.started_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '-'}</p>
                               </div>
                               <div>
                                 <span className="text-muted-foreground">Encerrou:</span>
                                 <p>{seller.ended_at ? new Date(seller.ended_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '-'}</p>
                               </div>
                               <div>
                                 <span className="text-muted-foreground">Forecast:</span>
                                 <p>R$ {seller.forecast_amount?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}</p>
                               </div>
                               <div>
                                 <span className="text-muted-foreground">Vendas:</span>
                                 <p>R$ {seller.sales_amount?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}</p>
                               </div>
                             </div>

                             {seller.mood && (
                               <div className="mt-3">
                                 <span className="text-muted-foreground text-sm">Humor:</span>
                                 <p className="text-sm mt-1 p-2 bg-background rounded border">{seller.mood}</p>
                               </div>
                             )}

                             {seller.daily_strategy && (
                               <div className="mt-3">
                                 <span className="text-muted-foreground text-sm">Estratégia:</span>
                                 <p className="text-sm mt-1 p-2 bg-background rounded border">{seller.daily_strategy}</p>
                               </div>
                             )}

                             {seller.ended_at && seller.difficulties && (
                               <div className="mt-3">
                                 <span className="text-muted-foreground text-sm">Dificuldades:</span>
                                 <p className="text-sm mt-1 p-2 bg-background rounded border">{seller.difficulties}</p>
                               </div>
                             )}

                             {seller.ended_at && seller.onboarding_details && (
                               <div className="mt-3">
                                 <span className="text-muted-foreground text-sm">Detalhes do Onboarding:</span>
                                 <p className="text-sm mt-1 p-2 bg-background rounded border">{seller.onboarding_details}</p>
                               </div>
                             )}
                           </>
                         )}
                       </div>
                     ))}
                   </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="metas" className="space-y-6">
            <Card className="card-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  Metas Mensais - {currentMonth}
                </CardTitle>
                <CardDescription>
                  Defina e acompanhe as metas individuais dos vendedores
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {sellersWithTargets.map(seller => (
                    <div key={seller.id} className="p-4 rounded-lg border bg-card">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium">{seller.name}</h4>
                        <div className="flex items-center gap-2">
                          {editingTarget === seller.user_id ? (
                            <div className="flex items-center gap-2">
                              <Input
                                type="text"
                                value={targetForm.amount}
                                onChange={(e) => setTargetForm({ amount: e.target.value })}
                                placeholder="Meta (ex: 15.000,00)"
                                className="w-32"
                              />
                              <Button
                                size="sm"
                                onClick={() => {
                                  const amount = parseDecimalValue(targetForm.amount);
                                  if (amount > 0) {
                                    saveTarget(seller.user_id, amount);
                                  }
                                }}
                                disabled={!targetForm.amount}
                              >
                                <Save className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setEditingTarget(null);
                                  setTargetForm({ amount: "" });
                                }}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingTarget(seller.user_id);
                                setTargetForm({ 
                                  amount: seller.target?.target_amount?.toString() || "" 
                                });
                              }}
                            >
                              <Edit className="h-3 w-3 mr-1" />
                              {seller.target ? "Editar" : "Definir"}
                            </Button>
                          )}
                        </div>
                      </div>

                      {seller.target ? (
                        <div className="space-y-3">
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground">Meta do mês:</span>
                            <span className="font-medium">
                              R$ {seller.target.target_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground">Vendas atuais:</span>
                            <span className="font-medium">
                              R$ {seller.currentSales.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-muted-foreground">Progresso:</span>
                              <span className={`font-medium ${seller.progress >= 100 ? 'text-success' : seller.progress >= 70 ? 'text-orange-500' : 'text-muted-foreground'}`}>
                                {seller.progress.toFixed(1)}%
                              </span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full transition-all ${
                                  seller.progress >= 100 ? 'bg-success' : 
                                  seller.progress >= 70 ? 'bg-orange-500' : 'bg-primary'
                                }`}
                                style={{ width: `${Math.min(seller.progress, 100)}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-sm">
                          Nenhuma meta definida para este mês
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  // Vendedor View
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          📝 Daylin
        </h1>
        <p className="text-muted-foreground">
          Registre o início e fim do seu dia de vendas
        </p>
      </div>

      {/* End Day Alert */}
      {showEndDayAlert && (
        <Alert className="border-warning/50 bg-warning/10">
          <Clock className="h-4 w-4 text-warning" />
          <AlertDescription className="text-warning-foreground">
            ⏰ Não esqueça de encerrar seu dia para registrar resultados.
          </AlertDescription>
        </Alert>
      )}

      {/* Status Badge */}
      {todayReport && (
        <div className="flex gap-2">
          {todayReport.started_at && (
            <Badge variant="secondary" className="bg-success/10 text-success border-success/20">
              <CheckCircle className="w-3 h-3 mr-1" />
              Dia iniciado às {new Date(todayReport.started_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </Badge>
          )}
          {todayReport.ended_at && (
            <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
              <Moon className="w-3 h-3 mr-1" />
              Dia encerrado às {new Date(todayReport.ended_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </Badge>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Start Day Card */}
        <Card className="card-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sun className="h-5 w-5 text-orange-500" />
              Iniciar o Dia
            </CardTitle>
            <CardDescription>
              Defina suas metas e estratégias para hoje
            </CardDescription>
          </CardHeader>
          <CardContent>
            {todayReport?.started_at ? (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-success/10 border border-success/20">
                  <div className="flex items-center gap-2 text-success">
                    <CheckCircle className="h-4 w-4" />
                    <span className="font-medium">Dia já iniciado!</span>
                  </div>
                  <p className="text-sm text-success/80 mt-1">
                    Você começou seu dia às {new Date(todayReport.started_at).toLocaleTimeString('pt-BR')}
                  </p>
                </div>

                {/* Show filled data */}
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Humor:</span>
                    <span className="text-sm max-w-[200px] truncate" title={todayReport.mood || ''}>
                      {todayReport.mood || 'Não informado'}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">SketchUp a renovar:</span>
                    <span>{todayReport.sketchup_to_renew}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Chaos a renovar:</span>
                    <span>{todayReport.chaos_to_renew}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Forecast:</span>
                    <span>R$ {todayReport.forecast_amount?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  {todayReport.daily_strategy && (
                    <>
                      <Separator />
                      <div>
                        <span className="text-muted-foreground">Estratégia:</span>
                        <p className="mt-1 text-sm">{todayReport.daily_strategy}</p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <form onSubmit={handleStartDay} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="mood">Sentimento do dia <span className="text-destructive">*</span></Label>
                  <Textarea
                    id="mood"
                    value={startForm.mood}
                    onChange={(e) => updateStartField('mood', e.target.value)}
                    placeholder="Como você está se sentindo hoje? Descreva seu humor..."
                    rows={2}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sketchup_to_renew" className="flex items-center gap-1">
                      Qtd SketchUp (a renovar)
                      {!isMonday() && <Badge variant="secondary" className="text-xs">Seg</Badge>}
                    </Label>
                    <Input
                      id="sketchup_to_renew"
                      type="number"
                      min="0"
                      value={startForm.sketchup_to_renew}
                      onChange={(e) => updateStartField('sketchup_to_renew', e.target.value)}
                      placeholder="0"
                      disabled={!isMonday()}
                      className={!isMonday() ? "bg-muted" : ""}
                    />
                    {!isMonday() && (
                      <p className="text-xs text-muted-foreground">
                        📅 Editável apenas às segundas-feiras
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="chaos_to_renew" className="flex items-center gap-1">
                      Qtd Chaos (a renovar)
                      {!isMonday() && <Badge variant="secondary" className="text-xs">Seg</Badge>}
                    </Label>
                    <Input
                      id="chaos_to_renew"
                      type="number"
                      min="0"
                      value={startForm.chaos_to_renew}
                      onChange={(e) => updateStartField('chaos_to_renew', e.target.value)}
                      placeholder="0"
                      disabled={!isMonday()}
                      className={!isMonday() ? "bg-muted" : ""}
                    />
                    {!isMonday() && (
                      <p className="text-xs text-muted-foreground">
                        📅 Editável apenas às segundas-feiras
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="forecast_amount">Forecast (R$) <span className="text-destructive">*</span></Label>
                  <Input
                    id="forecast_amount"
                    type="text"
                    value={startForm.forecast_amount}
                    onChange={(e) => updateStartField('forecast_amount', e.target.value)}
                    placeholder="0,00 ou 0.00"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="daily_strategy">Estratégia do dia <span className="text-destructive">*</span></Label>
                  <Textarea
                    id="daily_strategy"
                    value={startForm.daily_strategy}
                    onChange={(e) => updateStartField('daily_strategy', e.target.value)}
                    placeholder="Descreva sua estratégia para hoje..."
                    rows={3}
                    required
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full brand-gradient"
                  disabled={submitting || !isStartFormValid()}
                >
                  {submitting ? "Iniciando..." : "🚀 Iniciar o Dia"}
                </Button>
                {!isStartFormValid() && (
                  <p className="text-xs text-muted-foreground text-center">
                    * Preencha todos os campos obrigatórios para continuar
                  </p>
                )}
              </form>
            )}
          </CardContent>
        </Card>

        {/* End Day Card */}
        <Card className="card-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Moon className="h-5 w-5 text-blue-500" />
              Encerrar o Dia
            </CardTitle>
            <CardDescription>
              Registre os resultados do seu dia
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!todayReport?.started_at ? (
              <div className="p-4 rounded-lg bg-muted/50 border border-muted">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="font-medium">Inicie seu dia primeiro</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Você precisa iniciar o dia antes de poder encerrá-lo.
                </p>
              </div>
            ) : todayReport.ended_at ? (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                  <div className="flex items-center gap-2 text-primary">
                    <CheckCircle className="h-4 w-4" />
                    <span className="font-medium">Dia encerrado!</span>
                  </div>
                  <p className="text-sm text-primary/80 mt-1">
                    Você encerrou seu dia às {new Date(todayReport.ended_at).toLocaleTimeString('pt-BR')}
                  </p>
                </div>

                {/* Show results */}
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Vendas hoje:</span>
                    <span className="font-medium">R$ {todayReport.sales_amount?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">SketchUp renovado:</span>
                    <span>{todayReport.sketchup_renewed}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Chaos renovado:</span>
                    <span>{todayReport.chaos_renewed}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cross Selling:</span>
                    <span>{todayReport.cross_selling}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Onboarding:</span>
                    <span>{todayReport.onboarding}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Packs Vendidos:</span>
                    <span>{todayReport.packs_vendidos}</span>
                  </div>
                  {todayReport.difficulties && (
                    <>
                      <Separator />
                      <div>
                        <span className="text-muted-foreground">Dificuldades:</span>
                        <p className="mt-1 text-sm">{todayReport.difficulties}</p>
                      </div>
                    </>
                  )}
                  {todayReport.onboarding_details && (
                    <>
                      <Separator />
                      <div>
                        <span className="text-muted-foreground">Detalhes do Onboarding:</span>
                        <p className="mt-1 text-sm">{todayReport.onboarding_details}</p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <form onSubmit={handleEndDay} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="difficulties">Dificuldades do dia <span className="text-destructive">*</span></Label>
                  <Textarea
                    id="difficulties"
                    value={endForm.difficulties}
                    onChange={(e) => updateEndField('difficulties', e.target.value)}
                    placeholder="Descreva as principais dificuldades..."
                    rows={3}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sketchup_renewed">Qtd SketchUp Renovado</Label>
                    <Input
                      id="sketchup_renewed"
                      type="number"
                      min="0"
                      value={endForm.sketchup_renewed}
                      onChange={(e) => updateEndField('sketchup_renewed', e.target.value)}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="chaos_renewed">Qtd Chaos Renovado</Label>
                    <Input
                      id="chaos_renewed"
                      type="number"
                      min="0"
                      value={endForm.chaos_renewed}
                      onChange={(e) => updateEndField('chaos_renewed', e.target.value)}
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sales_amount">Vendas hoje (R$) <span className="text-destructive">*</span></Label>
                  <Input
                    id="sales_amount"
                    type="text"
                    value={endForm.sales_amount}
                    onChange={(e) => updateEndField('sales_amount', e.target.value)}
                    placeholder="0,00 ou 0.00"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cross_selling">Cross Selling</Label>
                    <Input
                      id="cross_selling"
                      type="number"
                      min="0"
                      value={endForm.cross_selling}
                      onChange={(e) => updateEndField('cross_selling', e.target.value)}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="onboarding">Onboarding</Label>
                    <Input
                      id="onboarding"
                      type="number"
                      min="0"
                      value={endForm.onboarding}
                      onChange={(e) => updateEndField('onboarding', e.target.value)}
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="packs_vendidos">Packs Vendidos</Label>
                  <Input
                    id="packs_vendidos"
                    type="number"
                    min="0"
                    value={endForm.packs_vendidos}
                    onChange={(e) => updateEndField('packs_vendidos', e.target.value)}
                    placeholder="0"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="onboarding_details">Detalhes do Onboarding</Label>
                  <Textarea
                    id="onboarding_details"
                    value={endForm.onboarding_details}
                    onChange={(e) => updateEndField('onboarding_details', e.target.value)}
                    placeholder="Descreva os detalhes dos onboardings realizados..."
                    rows={3}
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  disabled={submitting || !isEndFormValid()}
                >
                  {submitting ? "Encerrando..." : "🌙 Encerrar o Dia"}
                </Button>
                {!isEndFormValid() && (
                  <p className="text-xs text-muted-foreground text-center">
                    * Preencha todos os campos obrigatórios para continuar
                  </p>
                )}
                {!isEndFormValid() && (
                  <p className="text-xs text-muted-foreground text-center">
                    * Preencha todos os campos obrigatórios para continuar
                  </p>
                )}
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Daylin;