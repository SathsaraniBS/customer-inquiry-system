"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import StatusBadge from "@/components/StatusBadge";
import { timeAgo, hoursSince } from "@/lib/time";

const TABS = ["All", "New", "In Progress", "Resolved"];

function InquiriesList() {
  const router = useRouter();
  const params = useSearchParams();

  // Filters live in the URL so refresh, back button and shared links all work.
  const status = TABS.includes(params.get("status")) ? params.get("status") : "All";
  const urlQ = params.get("q") || "";

  const [search, setSearch] = useState(urlQ);
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const searchRef = useRef(null);

  function updateUrl(next) {
    const p = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v && v !== "All") p.set(k, v);
      else p.delete(k);
    }
    const qs = p.toString();
    router.replace(qs ? `/inquiries?${qs}` : "/inquiries", { scroll: false });
  }

  // Debounce typing, then write it to the URL
  useEffect(() => {
    if (search.trim() === urlQ) return;
    const t = setTimeout(() => updateUrl({ q: search.trim() }), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  // Fetch by search text only. Status tabs filter locally so every tab can show a live count.
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const p = new URLSearchParams();
        if (urlQ) p.set("q", urlQ);
        const data = await api(`/inquiries?${p.toString()}`);
        if (!cancelled) setInquiries(data.inquiries);
      } catch (err) {
        if (err.status === 401) {
          router.push("/login");
          return;
        }
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [urlQ, reloadKey, router]);

  // "/" focuses search
  useEffect(() => {
    function onKey(e) {
      const tag = document.activeElement?.tagName;
      if (e.key === "/" && tag !== "INPUT" && tag !== "TEXTAREA" && tag !== "SELECT") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function handleLogout() {
    await api("/auth/logout", { method: "POST" });
    router.push("/login");
  }

  const counts = useMemo(() => {
    const c = { All: inquiries.length, New: 0, "In Progress": 0, Resolved: 0 };
    for (const i of inquiries) if (c[i.status] !== undefined) c[i.status] += 1;
    return c;
  }, [inquiries]);

  const visible = status === "All" ? inquiries : inquiries.filter((i) => i.status === status);
  const filtering = status !== "All" || urlQ;

  function clearFilters() {
    setSearch("");
    router.replace("/inquiries", { scroll: false });
  }

  return (
    <main className="max-w-4xl mx-auto p-4 sm:p-6">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Inquiries</h1>
          {!loading && !error && (
            <p className="text-sm text-gray-500 mt-0.5">
              {counts.New > 0 ? `${counts.New} waiting for a first response` : "Nothing waiting for a first response"}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Link href="/inquiries/new" className="bg-teal-700 hover:bg-teal-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            New inquiry
          </Link>
          <button onClick={handleLogout} className="border border-gray-300 hover:bg-gray-100 px-4 py-2 rounded-lg text-sm text-gray-700 transition-colors">
            Sign out
          </button>
        </div>
      </header>

      <div className="relative mb-4">
        <input
          ref={searchRef}
          type="search"
          placeholder="Search by name, subject or contact"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full border border-gray-300 rounded-lg pl-3 pr-10 py-2.5 text-gray-900 bg-white"
          aria-label="Search inquiries"
        />
        <kbd className="hidden sm:block absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 border border-gray-200 rounded px-1.5 py-0.5" aria-hidden="true">
          /
        </kbd>
      </div>

      <div role="tablist" aria-label="Filter by status" className="flex gap-1 border-b border-gray-200 mb-4 overflow-x-auto">
        {TABS.map((t) => {
          const active = t === status;
          return (
            <button
              key={t}
              role="tab"
              aria-selected={active}
              onClick={() => updateUrl({ status: t })}
              className={`px-3 py-2 text-sm whitespace-nowrap border-b-2 -mb-px transition-colors ${
                active ? "border-teal-700 text-teal-800 font-medium" : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
            >
              {t}{" "}
              <span className={`ml-1 text-xs rounded-full px-1.5 py-0.5 ${active ? "bg-teal-50 text-teal-800" : "bg-gray-100 text-gray-600"}`}>
                {loading ? "–" : counts[t]}
              </span>
            </button>
          );
        })}
      </div>

      {loading && (
        <ul className="border border-gray-200 rounded-xl bg-white divide-y divide-gray-100" aria-busy="true" aria-label="Loading inquiries">
          {[0, 1, 2, 3].map((n) => (
            <li key={n} className="p-4 flex items-center justify-between">
              <div className="space-y-2">
                <div className="skeleton h-4 w-48" />
                <div className="skeleton h-3 w-64" />
              </div>
              <div className="skeleton h-6 w-20 rounded-full" />
            </li>
          ))}
        </ul>
      )}

      {!loading && error && (
        <div role="alert" className="bg-red-50 border border-red-100 text-red-800 p-4 rounded-xl">
          <p className="font-medium">Could not load inquiries</p>
          <p className="text-sm mt-1">{error}</p>
          <button onClick={() => setReloadKey((k) => k + 1)} className="mt-3 border border-red-200 bg-white rounded-lg px-3 py-1.5 text-sm hover:bg-red-50">
            Try again
          </button>
        </div>
      )}

      {!loading && !error && visible.length === 0 && (
        <div className="text-center text-gray-600 py-14 border border-dashed border-gray-300 rounded-xl bg-white">
          {filtering ? (
            <>
              <p className="font-medium text-gray-900">No inquiries match</p>
              <p className="text-sm mt-1">Try a different word, or look at every status.</p>
              <button onClick={clearFilters} className="mt-4 border border-gray-300 rounded-lg px-3 py-1.5 text-sm hover:bg-gray-100">
                Clear filters
              </button>
            </>
          ) : (
            <>
              <p className="font-medium text-gray-900">No inquiries yet</p>
              <p className="text-sm mt-1">Record the first customer request to start tracking it.</p>
              <Link href="/inquiries/new" className="inline-block mt-4 bg-teal-700 hover:bg-teal-800 text-white rounded-lg px-4 py-2 text-sm font-medium">
                Record first inquiry
              </Link>
            </>
          )}
        </div>
      )}

      {!loading && !error && visible.length > 0 && (
        <ul className="border border-gray-200 rounded-xl bg-white divide-y divide-gray-100 overflow-hidden">
          {visible.map((i) => {
            const created = i.created_at;
            const open = i.status !== "Resolved";
            const overdue = open && hoursSince(created) > 24;
            return (
              <li key={i.id}>
                <Link href={`/inquiries/${i.id}`} className="flex items-center justify-between gap-4 p-4 hover:bg-gray-50 transition-colors">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">{i.subject}</p>
                    <p className="text-sm text-gray-500 truncate">
                      {i.customer_name} · {i.contact}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <StatusBadge status={i.status} />
                    {created && (
                      <span className={`text-xs ${overdue ? "text-amber-700 font-medium" : "text-gray-400"}`} title={new Date(created).toLocaleString()}>
                        {open ? `Waiting ${timeAgo(created).replace(" ago", "")}` : `Opened ${timeAgo(created)}`}
                      </span>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}

// useSearchParams requires a Suspense boundary in the App Router
export default function InquiriesPage() {
  return (
    <Suspense fallback={<main className="max-w-4xl mx-auto p-6 text-gray-500">Loading inquiries...</main>}>
      <InquiriesList />
    </Suspense>
  );
}