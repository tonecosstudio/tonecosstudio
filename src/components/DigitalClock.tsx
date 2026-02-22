interface DigitalClockProps {
  time: Date;
}

const DigitalClock = ({ time }: DigitalClockProps) => {
  const hours = time.getHours().toString().padStart(2, "0");
  const minutes = time.getMinutes().toString().padStart(2, "0");
  const seconds = time.getSeconds().toString().padStart(2, "0");

  const dateStr = time.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="text-center mt-8 animate-fade-in">
      <div className="font-mono text-5xl sm:text-6xl md:text-7xl font-light tracking-widest text-foreground">
        {hours}
        <span className="text-primary animate-pulse">:</span>
        {minutes}
        <span className="text-primary animate-pulse">:</span>
        {seconds}
      </div>
      <p className="mt-4 text-muted-foreground text-sm sm:text-base capitalize tracking-wide">
        {dateStr}
      </p>
    </div>
  );
};

export default DigitalClock;
