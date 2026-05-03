import { useEffect, useState } from "react";
import { recommendationsApi } from "@/api/recommendationsApi";
import type { Recommendation } from "@/types";

export default function RecommendationsPage() {
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [filter, setFilter] = useState<"all" | "unread">("unread");
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    const fetchRecs = async () => {
      const res = await recommendationsApi.getAll();
      setRecs(res.data.data);
      setIsLoading(false);
    };
    fetchRecs();
  }, []);

  const handleMarkRead = async (id: number) => {
    await recommendationsApi.markRead(id);
    setRecs((prev) =>
      prev.map((r) => (r.id === id ? { ...r, isRead: true } : r)),
    );
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      await recommendationsApi.generate();
      const res = await recommendationsApi.getAll();
      setRecs(res.data.data);
    } finally {
      setIsGenerating(false);
    }
  };

  const filtered = filter === "unread" ? recs.filter((r) => !r.isRead) : recs;
  const unreadCount = recs.filter((r) => !r.isRead).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            Recommendations
          </h1>
          {unreadCount > 0 && (
            <p className="text-sm text-green-600 mt-0.5">{unreadCount} new</p>
          )}
        </div>

        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {isGenerating ? "Generating…" : "↻ Generate now"}
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-5 border-b border-gray-100">
        {(["unread", "all"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              filter === f
                ? "border-green-600 text-green-700"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {f === "unread" ? `Unread (${unreadCount})` : "All"}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-3xl mb-3">✦</div>
          <p className="font-medium text-gray-500">
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
              className={`bg-white rounded-xl border p-5 transition-colors ${
                rec.isRead
                  ? "border-gray-100"
                  : "border-green-200 bg-green-50/30"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <p className="text-sm text-gray-700 leading-relaxed flex-1">
                  {rec.content}
                </p>
                {!rec.isRead && (
                  <button
                    onClick={() => handleMarkRead(rec.id)}
                    className="shrink-0 text-xs text-gray-400 hover:text-gray-600 underline"
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
          ))}
        </div>
      )}
    </div>
  );
}
