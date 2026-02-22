interface AnalogClockProps {
  time: Date;
}

const AnalogClock = ({ time }: AnalogClockProps) => {
  const seconds = time.getSeconds();
  const minutes = time.getMinutes();
  const hours = time.getHours() % 12;

  const secondDeg = seconds * 6;
  const minuteDeg = minutes * 6 + seconds * 0.1;
  const hourDeg = hours * 30 + minutes * 0.5;

  return (
    <div className="relative w-72 h-72 sm:w-80 sm:h-80 md:w-96 md:h-96 rounded-full border-2 border-muted-foreground/20 bg-card/50 backdrop-blur-sm shadow-2xl">
      {/* Hour markers */}
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className="absolute left-1/2 top-0 -translate-x-1/2 origin-[50%_calc(var(--size)/2)]"
          style={{
            transform: `translateX(-50%) rotate(${i * 30}deg)`,
            transformOrigin: "50% 144px",
            height: "288px",
          }}
        >
          <div
            className={`mx-auto rounded-full bg-foreground ${
              i % 3 === 0 ? "w-1 h-4" : "w-0.5 h-2"
            }`}
          />
        </div>
      ))}

      {/* Center dot */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-primary z-20" />

      {/* Hour hand */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 origin-bottom w-1.5 h-20 rounded-full bg-foreground z-10 transition-transform"
        style={{ transform: `translateX(-50%) rotate(${hourDeg}deg)`, transformOrigin: "50% 100%", top: "calc(50% - 80px)" }}
      />

      {/* Minute hand */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 origin-bottom w-1 h-28 rounded-full bg-foreground z-10 transition-transform"
        style={{ transform: `translateX(-50%) rotate(${minuteDeg}deg)`, transformOrigin: "50% 100%", top: "calc(50% - 112px)" }}
      />

      {/* Second hand */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 origin-bottom w-0.5 h-32 rounded-full bg-primary z-10"
        style={{ transform: `translateX(-50%) rotate(${secondDeg}deg)`, transformOrigin: "50% 100%", top: "calc(50% - 128px)" }}
      />
    </div>
  );
};

export default AnalogClock;
