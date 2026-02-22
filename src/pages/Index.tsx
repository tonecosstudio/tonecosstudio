import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import AnalogClock from "@/components/AnalogClock";
import DigitalClock from "@/components/DigitalClock";
import { useTime } from "@/hooks/useTime";
import { Button } from "@/components/ui/button";

const Index = () => {
  const time = useTime();
  const [dark, setDark] = useState(true);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background transition-colors duration-500">
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-6 right-6 text-muted-foreground hover:text-foreground"
        onClick={() => setDark(!dark)}
        aria-label="Alternar tema"
      >
        {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      </Button>

      <div className="flex flex-col items-center gap-2 animate-fade-in">
        <AnalogClock time={time} />
        <DigitalClock time={time} />
      </div>
    </main>
  );
};

export default Index;
