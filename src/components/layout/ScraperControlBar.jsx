import { useEffect } from "react";
import { useScraper } from "../../context/ScraperContext";

const SOURCES = [
  { id: "draftkings", name: "DraftKings" },
  { id: "fanduel", name: "FanDuel" },
  { id: "covers", name: "Covers" },
  { id: "vegasinsider", name: "VegasInsider" },
  { id: "oddsportal", name: "OddsPortal" },
  { id: "the-odds-api", name: "OddsAPI", hasApiKey: true },
  { id: "odds-api-io", name: "OddsIO", hasApiKey: true },
  { id: "api-sports", name: "ApiSports", hasApiKey: true },
];

export default function ScraperControlBar() {
  const {
    isRunning,
    setIsRunning,
    statuses,
    setStatuses,
    addLog,
    clearLogs,
    apiKeyStatuses,
    validateKeys,
  } = useScraper();

  useEffect(() => {
    validateKeys();
  }, [validateKeys]);

  const fireScrapers = async () => {
    if (isRunning) return;
    setIsRunning(true);
    clearLogs();
    addLog("INIT_PIPELINE: STARTING SCRAPER SEQUENCE...", "info");

    const initStatuses = {};
    SOURCES.forEach((s) => (initStatuses[s.id] = "idle"));
    setStatuses(initStatuses);

    const resp = await fetch("/api/run-pipeline", { method: "POST" }).catch(() => null);
    if (!resp?.ok) {
      addLog("ERROR: FAILED_TO_REACH_API_SERVER. Is it running?", "error");
      setIsRunning(false);
      return;
    }

    const data = await resp.json();
    if (!data.ok) {
      addLog(`WARN: ${(data.message || "Pipeline already running").toUpperCase()}`, "warn");
      setIsRunning(false);
      return;
    }

    addLog("PIPELINE: DISPATCHING SOURCE RUNNERS...", "info");

    let prevSources = {};
    const pollInterval = setInterval(async () => {
      const statusResp = await fetch("/api/pipeline/status").catch(() => null);
      if (!statusResp?.ok) return;
      const state = await statusResp.json();

      // Log status transitions
      for (const [sourceId, status] of Object.entries(state.sources || {})) {
        if (status !== prevSources[sourceId]) {
          const name = (SOURCES.find((s) => s.id === sourceId)?.name || sourceId).toUpperCase();
          if (status === "running") addLog(`RUNNING: ${name}...`, "info");
          else if (status === "success") addLog(`SUCCESS: ${name} DATA_FETCHED`, "success");
          else if (status === "error") addLog(`ERROR: ${name} FETCH_FAILED`, "error");
          else if (status === "timeout") addLog(`TIMEOUT: ${name} TIMED_OUT`, "warn");
        }
      }
      prevSources = { ...state.sources };
      setStatuses((prev) => ({ ...prev, ...state.sources }));

      if (!state.running) {
        clearInterval(pollInterval);
        setIsRunning(false);
        addLog("PIPELINE_COMPLETE: ALL_SOURCES_PROCESSED.", "info");
      }
    }, 1000);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "success":
        return "bg-retro-lime border-black shadow-[inset_2px_2px_0_rgba(255,255,255,0.3)]";
      case "error":
        return "bg-retro-red border-black shadow-[inset_2px_2px_0_rgba(255,255,255,0.3)]";
      case "timeout":
        return "bg-retro-gold border-black text-black shadow-[inset_2px_2px_0_rgba(255,255,255,0.3)]";
      case "running":
        return "bg-retro-cyan border-black animate-pulse shadow-[inset_2px_2px_0_rgba(255,255,255,0.3)]";
      default:
        return "bg-retro-panel border-black opacity-50 shadow-[inset_2px_2px_0_rgba(255,255,255,0.1)]";
    }
  };

  return (
    <div className="bg-[#0f0f1b] flex items-stretch h-14 overflow-hidden border-b-2 border-white/10">
      {/* Fire Button */}
      <button
        onClick={fireScrapers}
        disabled={isRunning}
        className={`px-8 flex items-center justify-center font-retro text-[9px] tracking-wider transition-all border-r-2 border-black ${
          isRunning
            ? "bg-retro-panel text-white opacity-60"
            : "bg-gradient-to-br from-retro-purple to-retro-magenta hover:from-retro-magenta hover:to-retro-purple text-white active:translate-y-0.5"
        }`}
        style={{
          boxShadow:
            "inset -2px -2px 0 0 rgba(0,0,0,0.5), inset 2px 2px 0 0 rgba(255,255,255,0.1)",
        }}
      >
        {isRunning ? "CMD_BUSY..." : "INIT_SCRAPE"}
      </button>

      {/* Status Boxes */}
      <div className="flex flex-1 items-stretch overflow-x-auto no-scrollbar gap-1.5 p-1.5 bg-[#0a0a14]">
        {SOURCES.map((source) => (
          <div
            key={source.id}
            className={`flex-1 min-w-[100px] border-2 flex flex-col justify-center px-3 transition-colors relative ${getStatusColor(statuses[source.id])}`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[8px] font-retro text-white drop-shadow-[1px_1px_0_#000] leading-none truncate pr-3">
                {source.name.toUpperCase()}
              </span>

              {/* API LED Light */}
              {source.hasApiKey && (
                <div
                  className={`w-2.5 h-2.5 border border-black absolute right-1.5 top-1/2 -translate-y-1/2 ${
                    apiKeyStatuses[source.id] === "valid"
                      ? "led-green"
                      : "led-red"
                  }`}
                  style={{
                    boxShadow:
                      "inset -1px -1px 0 rgba(0,0,0,0.4), inset 1px 1px 0 rgba(255,255,255,0.3)",
                  }}
                  title={
                    apiKeyStatuses[source.id] === "valid"
                      ? "API_KEY_VALID"
                      : "API_KEY_ERROR"
                  }
                />
              )}
            </div>

            <div className="h-1 bg-black/30 mt-1.5 border border-white/5">
              <div
                className={`h-full ${statuses[source.id] === "running" ? "bg-white animate-pulse" : "bg-transparent"}`}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Right tail filler */}
      <div className="bg-[#0f0f1b] w-16 border-l-2 border-white/5 flex items-center justify-center">
        <div
          className={`w-4 h-4 border-2 border-black ${isRunning ? "bg-retro-red animate-pulse" : "bg-[#1a1a1a]"}`}
        />
      </div>
    </div>
  );
}
