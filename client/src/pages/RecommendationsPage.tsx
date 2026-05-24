import { useCallback, useEffect, useState } from "react";
import { recommendationsApi } from "@/api/recommendationsApi";
import type { Recommendation } from "@/types";
import Spinner from "@/components/Spinner";

export default function RecommendationsPage() {
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [filter, setFilter] = useState<"all" | "unread">("unread");
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  const fetchRecs = useCallback(async () => {
    try {
      const res = await recommendationsApi.getAll();
      setRecs(res.data.data);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecs();
  }, [fetchRecs]);

  useEffect(() => {
    const handler = () => fetchRecs();
    window.addEventListener("recommendations-updated", handler);
    return () => window.removeEventListener("recommendations-updated", handler);
  }, [fetchRecs]);

  const handleMarkRead = async (id: number) => {
    await recommendationsApi.markRead(id);
    setRecs((prev) =>
      prev.map((r) => (r.id === id ? { ...r, isRead: true } : r)),
    );
    window.dispatchEvent(new CustomEvent("recommendations-read-changed"));
  };

  const handleMarkAllRead = async () => {
    await recommendationsApi.markAllRead();
    setRecs((prev) => prev.map((r) => ({ ...r, isRead: true })));
    window.dispatchEvent(new CustomEvent("recommendations-read-changed"));
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const res = await recommendationsApi.generate();
      await fetchRecs();
      if (res.data.data.generated === 0) {
        alert("No habits found. Add and log some habits first.");
      } else {
        window.dispatchEvent(new CustomEvent("recommendations-updated"));
      }
    } catch {
      alert("Failed to generate advice. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const filtered = filter === "unread" ? recs.filter((r) => !r.isRead) : recs;
  const unreadCount = recs.filter((r) => !r.isRead).length;

  return (
    <div>
      <div className="flex items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-extrabold text-white">Advice</h1>
          {unreadCount > 0 && (
            <p className="text-sm text-accent-600 mt-0.5 font-medium">
              {unreadCount} new
            </p>
          )}
        </div>
        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="px-4 py-2 bg-gradient-to-r from-accent-500 to-accent-400 disabled:opacity-50 text-white text-sm font-bold rounded-xl"
        >
          {isGenerating ? "Generating…" : "↻ Generate now"}
        </button>
      </div>

      <div className="flex items-center justify-between border-b border-card-border mb-5">
        <div className="flex gap-0">
          {(["unread", "all"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 text-sm font-bold border-b-2 -mb-px transition-colors ${
                filter === f
                  ? "border-accent-500 text-accent-700"
                  : "border-transparent text-gray-400 hover:text-gray-600"
              }`}
            >
              {f === "unread" ? `Unread (${unreadCount})` : "All"}
            </button>
          ))}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="text-xs text-gray-400 hover:text-accent-600 font-medium underline pb-1"
          >
            Mark all as read
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-3xl mb-3">✦</div>
          <p className="font-bold text-gray-500">
            {filter === "unread"
              ? "No unread recommendations"
              : "No recommendations yet"}
          </p>
          <p className="text-sm mt-1">
            Click "Generate now" to get personalized advice
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((rec) => (
            <div
              key={rec.id}
              className={`bg-card rounded-xl overflow-hidden border-l-4 border-t border-r border-b transition-colors ${
                rec.isRead
                  ? "border-l-accent-200 border-card-border"
                  : "border-l-accent-500 border-card-border"
              }`}
            >
              <div className="px-4 py-4">
                <div className="flex items-start justify-between gap-4">
                  <p className="text-sm text-gray-200 leading-relaxed flex-1">
                    {rec.content}
                  </p>
                  {!rec.isRead && (
                    <button
                      onClick={() => handleMarkRead(rec.id)}
                      className="shrink-0 text-xs text-gray-400 hover:text-accent-600 underline font-medium"
                    >
                      Mark read
                    </button>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-3">
                  {new Date(rec.generatedAt).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
