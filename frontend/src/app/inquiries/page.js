"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import StatusBadge from "@/components/StatusBadge";

const STATUSES = ["", "New", "In Progress", "Resolved"];

export default function InquiriesPage() {
  const router = useRouter();
  const [inquiries, setInquiries] = useState([]);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [q, setQ] = useState(""); // debounced search value
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Debounce typing so we don't call the API on every keystroke
  useEffect(() => {
    const t = setTimeout(() => setQ(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams();
        if (status) params.set("status", status);
        if (q.trim()) params.set("q", q.trim());
        const data = await api(`/inquiries?${params.toString()}`);
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
  }, [status, q, router]);

  async function handleLogout() {
    await api("/auth/logout", { method: "POST" });
    router.push("/login");
  }

  const filtering = status || q.trim();

  return (
    <main className="max-w-4xl mx-auto p-6">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Inquiries</h1>
        <div className="flex gap-2">
          <Link href="/inquiries/new" className="bg-black text-white px-4 py-2 rounded text-sm">
            New inquiry
          </Link>
          <button onClick={handleLogout} className="border px-4 py-2 rounded text-sm text-gray-700">
            Sign out
          </button>
        </div>
      </header>

      <div className="flex gap-3 mb-4">
        <input
          type="search"
          placeholder="Search name, subject or contact"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 border rounded px-3 py-2 text-gray-900"
          aria-label="Search inquiries"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="border rounded px-3 py-2 text-gray-900"
          aria-label="Filter by status"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s || "All statuses"}
            </option>
          ))}
        </select>
      </div>

      {loading && <p className="text-gray-500">Loading inquiries...</p>}

      {!loading && error && (
        <div role="alert" className="bg-red-50 text-red-700 p-4 rounded">
          <p>{error}</p>
          <button onClick={() => setQ((v) => v + "")} className="mt-2 underline text-sm">
            Try again
          </button>
        </div>
      )}

      {!loading && !error && inquiries.length === 0 && (
        <div className="text-center text-gray-500 py-12 border rounded">
          {filtering ? (
            <p>No inquiries match your search or filter.</p>
          ) : (
            <>
              <p>No inquiries yet.</p>
              <Link href="/inquiries/new" className="underline">
                Record your first one
              </Link>
            </>
          )}
        </div>
      )}

      {!loading && !error && inquiries.length > 0 && (
        <ul className="divide-y border rounded bg-white">
          {inquiries.map((i) => (
            <li key={i.id}>
              <Link href={`/inquiries/${i.id}`} className="flex items-center justify-between p-4 hover:bg-gray-50">
                <div>
                  <p className="font-medium text-gray-900">{i.subject}</p>
                  <p className="text-sm text-gray-500">
                    {i.customer_name} · {i.contact}
                  </p>
                </div>
                <StatusBadge status={i.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}