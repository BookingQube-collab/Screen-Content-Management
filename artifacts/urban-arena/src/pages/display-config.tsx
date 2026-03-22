import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { FirstRunSetup } from "@/components/display/FirstRunSetup";

export default function DisplayConfigPage() {
  const [, setLoc] = useLocation();
  const [titlePart1, setTitlePart1] = useState("URBAN");
  const [titlePart2, setTitlePart2] = useState("ARENA");

  useEffect(() => {
    fetch("/api/settings")
      .then(r => r.json())
      .then((rows: { key: string; value: string }[]) => {
        if (!Array.isArray(rows)) return;
        const p1 = rows.find(r => r.key === "display_title_part1")?.value;
        const p2 = rows.find(r => r.key === "display_title_part2")?.value;
        if (p1) setTitlePart1(p1);
        if (p2) setTitlePart2(p2);
      })
      .catch(() => {});
  }, []);

  return (
    <FirstRunSetup
      titlePart1={titlePart1}
      titlePart2={titlePart2}
      onDone={() => setLoc("/display")}
      onBack={() => setLoc("/display")}
      showAddress
    />
  );
}
