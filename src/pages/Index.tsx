import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building, ArrowRight, BarChart3, Trophy, Bot, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const Index = () => {
  const { user, loading } = useAuth();

  // If user is logged in, redirect to dashboard
  if (!loading && user) {
    return <Navigate to="/dashboard" replace />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Building className="h-8 w-8 text-primary animate-pulse" />
          <div>
            <div className="text-lg font-bold">TotalCAD</div>
            <div className="text-sm text-muted-foreground">Carregando...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      {/* Header */}
      <header className="border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/75">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building className="h-8 w-8 text-primary" />
            <div>
              <h1 className="font-bold text-lg">TotalCAD Softwares</h1>
              <p className="text-xs text-muted-foreground">SAAS FARMERS</p>
            </div>
          </div>
          
          <Button asChild className="brand-gradient">
            <a href="/auth">
              Acessar Sistema
              <ArrowRight className="ml-2 h-4 w-4" />
            </a>
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-3xl mx-auto space-y-8">
          <div className="space-y-4">
            <h1 className="text-4xl md:text-6xl font-bold">
              Sistema de Gestão 
              <span className="text-primary"> SAAS FARMERS</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Plataforma completa para acompanhar indicadores, metas e performance da equipe comercial da TotalCAD Softwares
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="brand-gradient brand-shadow">
              <a href="/auth">
                🚀 Começar Agora
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Funcionalidades Principais</h2>
          <p className="text-muted-foreground">
            Tudo que você precisa para gerenciar sua performance comercial
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="card-shadow hover:shadow-lg transition-shadow">
            <CardHeader>
              <BarChart3 className="h-10 w-10 text-primary mb-2" />
              <CardTitle className="text-lg">🧭 Dashboard</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Acompanhe KPIs em tempo real: vendas, forecast, renovações e muito mais
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="card-shadow hover:shadow-lg transition-shadow">
            <CardHeader>
              <Users className="h-10 w-10 text-primary mb-2" />
              <CardTitle className="text-lg">📝 Daylin</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Registre o início e fim do seu dia com metas e resultados alcançados
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="card-shadow hover:shadow-lg transition-shadow">
            <CardHeader>
              <Trophy className="h-10 w-10 text-primary mb-2" />
              <CardTitle className="text-lg">🏆 Ranking</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Veja sua posição no ranking e o gap para alcançar o primeiro lugar
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="card-shadow hover:shadow-lg transition-shadow">
            <CardHeader>
              <Bot className="h-10 w-10 text-primary mb-2" />
              <CardTitle className="text-lg">🤖 Assistente AI</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Coach de vendas com dicas, objeções e estratégias personalizadas
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-primary text-primary-foreground py-20">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-2xl mx-auto space-y-6">
            <h2 className="text-3xl font-bold">
              Pronto para elevar sua performance?
            </h2>
            <p className="text-primary-foreground/80 text-lg">
              Junte-se à equipe SAAS FARMERS e comece a acompanhar seus resultados hoje mesmo
            </p>
            <Button asChild size="lg" variant="secondary" className="bg-white text-primary hover:bg-white/90">
              <a href="/auth">
                Acessar Sistema
                <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-card py-8">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Building className="h-6 w-6 text-primary" />
            <span className="font-semibold">TotalCAD Softwares</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Sistema de gestão comercial SAAS FARMERS © 2024
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;