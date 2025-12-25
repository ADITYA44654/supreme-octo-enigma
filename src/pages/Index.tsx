import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Logo from "@/components/Logo";
import heroBg from "@/assets/hero-bg.png";
import { 
  Shield, 
  Zap,
  ArrowRight,
  Sparkles,
  Lock,
  Globe
} from "lucide-react";

const Index = () => {
  const features = [
    {
      icon: Zap,
      title: "Blazing Fast",
      description: "Real-time messaging with instant delivery."
    },
    {
      icon: Shield,
      title: "Military-Grade Security",
      description: "End-to-end encryption for all your chats."
    },
    {
      icon: Globe,
      title: "Connect Anywhere",
      description: "Works seamlessly across all devices."
    },
    {
      icon: Lock,
      title: "Privacy First",
      description: "Your data stays yours. Always."
    }
  ];

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/60 backdrop-blur-2xl border-b border-border/50">
        <div className="container mx-auto px-6 h-18 flex items-center justify-between py-4">
          <Logo size="sm" />
          <div className="flex items-center gap-4">
            <Link to="/login">
              <Button variant="ghost" size="sm">Login</Button>
            </Link>
            <Link to="/register">
              <Button size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center pt-20">
        {/* Background */}
        <div className="absolute inset-0">
          <div 
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: `url(${heroBg})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: 'blur(2px)',
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background via-background/95 to-background" />
          
          {/* Gradient orbs */}
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/30 rounded-full blur-[150px] animate-float" />
          <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-accent/20 rounded-full blur-[120px] animate-float" style={{ animationDelay: '2s' }} />
        </div>
        
        <div className="container mx-auto px-6 relative z-10">
          <div className="max-w-5xl mx-auto text-center">
            <div className="animate-slide-up" style={{ animationDelay: '0.1s', opacity: 0 }}>
              <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary/10 border border-primary/30 mb-10 backdrop-blur-sm">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-primary">Next-gen messaging is here</span>
              </div>
            </div>
            
            <h1 
              className="text-6xl md:text-8xl font-bold mb-8 leading-[0.95] tracking-tight animate-slide-up"
              style={{ animationDelay: '0.2s', opacity: 0 }}
            >
              Where conversations{" "}
              <span className="text-gradient">come alive</span>
            </h1>
            
            <p 
              className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed animate-slide-up"
              style={{ animationDelay: '0.3s', opacity: 0 }}
            >
              Espada brings you lightning-fast, secure messaging 
              with a beautiful interface you'll love.
            </p>
            
            <div 
              className="flex flex-col sm:flex-row items-center justify-center gap-5 animate-slide-up"
              style={{ animationDelay: '0.4s', opacity: 0 }}
            >
              <Link to="/register">
                <Button variant="hero" size="xl" className="min-w-[220px]">
                  Start Chatting
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link to="/chat">
                <Button variant="outline" size="xl" className="min-w-[220px]">
                  Try Demo
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2">
          <div className="w-7 h-12 rounded-full border-2 border-muted-foreground/30 flex justify-center pt-3">
            <div className="w-1.5 h-3 bg-primary rounded-full animate-bounce" />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-32 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent" />
        
        <div className="container mx-auto px-6 relative">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-6xl font-bold mb-6">
              Built for the{" "}
              <span className="text-gradient">future</span>
            </h2>
            <p className="text-muted-foreground text-xl max-w-xl mx-auto">
              Experience messaging reimagined with cutting-edge features.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className="group p-8 rounded-3xl card-glass hover:border-primary/40 transition-all duration-500 hover:-translate-y-2 hover:shadow-lg hover:shadow-primary/10"
              >
                <div className="h-16 w-16 rounded-2xl gradient-primary flex items-center justify-center mb-6 shadow-lg shadow-primary/30 group-hover:scale-110 transition-transform duration-500">
                  <feature.icon className="h-8 w-8 text-primary-foreground" />
                </div>
                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center card-glass rounded-[2.5rem] p-16 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-primary/20 rounded-full blur-[100px]" />
            <div className="absolute bottom-0 left-0 w-60 h-60 bg-accent/15 rounded-full blur-[80px]" />
            
            <div className="relative z-10">
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                Ready to elevate your chats?
              </h2>
              <p className="text-muted-foreground text-xl mb-10 max-w-lg mx-auto">
                Join thousands who've already made the switch to Espada.
              </p>
              <Link to="/register">
                <Button variant="hero" size="xl">
                  Create Free Account
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 border-t border-border/50">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <Logo size="sm" />
            <p className="text-sm text-muted-foreground">
              © 2024 Espada by Aditya Chauhan. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
