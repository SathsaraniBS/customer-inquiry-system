"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import StatusBadge from "@/components/StatusBadge";

// Mirrors the backend rules (the API still enforces them)
const NEXT_STATUSES = {
  "New": ["In Progress"],
  "In Progress": ["Resolved"],
  "Resolved": ["In Progress"],
};

export default function InquiryDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [inquiry, setInquiry] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState("");
  const [stale, setStale] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await api(`/inquiries/${id}`);
      setInquiry(data.inquiry);
      setEvents(data.events);
    } catch (err) {
      if (err.status === 401) {
        router.push("/login");
        return;
      }
      setLoadError(err);
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    load();
  }, [load]);

  async function changeStatus(status) {
    setSaving(true);
    setActionError("");
    setStale(false);
    try {
      await api(`/inquiries/${id}/status`, {
        method: "PATCH",
        body: { status, expectedVersion: inquiry.version },
      });
      await load();
    } catch (err) {
      if (err.status === 401) {
        router.push("/login");
        return;
      }
      if (err.body?.code === "STALE_VERSION") {
        setStale(true);
      } else {
        setActionError(err.message);
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading && !inquiry) {
    return <main className="max-w-2xl mx-auto p-6 text-gray-500">Loading inquiry...</main>;
  }

  if (loadError) {
    const notFound = loadError.status === 404 || loadError.status === 400;
    return (
      <main className="max-w-2xl mx-auto p-6">
        <Link href="/inquiries" className="text-sm underline text-gray-600">
          Back to inquiries
        </Link>
        <div role="alert" className="mt-4 bg-red-50 text-red-700 p-4 rounded">
          {notFound ? (
            <p>This inquiry does not exist, or you do not have access to it.</p>
          ) : (
            <>
              <p>{loadError.message}</p>
              <button onClick={load} className="mt-2 underline text-sm">
                Try again
              </button>
            </>
          )}
        </div>
      </main>
    );
  }

  const options = NEXT_STATUSES[inquiry.status] || [];

  return (
    <main className="max-w-2xl mx-auto p-6">
      <Link href="/inquiries" className="text-sm underline text-gray-600">
        Back to inquiries
      </Link>

      <div className="flex items-start justify-between my-4">
        <h1 className="text-2xl font-semibold text-gray-900">{inquiry.subject}</h1>
        <StatusBadge status={inquiry.status} />
      </div>

      {stale && (
        <div role="alert" className="bg-amber-50 text-amber-900 p-3 rounded mb-4 text-sm">
          This inquiry was changed elsewhere, so your update was not applied.{" "}
          <button
            onClick={() => {
              setStale(false);
              load();
            }}
            className="underline font-medium"
          >
            Reload latest version
          </button>
        </div>
      )}

      {actionError && (
        <div role="alert" className="bg-red-50 text-red-700 p-3 rounded mb-4 text-sm">
          {actionError}
        </div>
      )}

      <section className="bg-white rounded-lg shadow p-6 space-y-3">
        <p className="text-sm text-gray-500">
          {inquiry.customer_name} · {inquiry.contact}
        </p>
        <p className="text-gray-900 whitespace-pre-wrap">{inquiry.description}</p>
      </section>

      <section className="mt-4 flex gap-2 items-center">
        <span className="text-sm text-gray-600">Move to:</span>
        {options.map((s) => (
          <button
            key={s}
            onClick={() => changeStatus(s)}
            disabled={saving}
            className="bg-black text-white px-4 py-2 rounded text-sm disabled:opacity-50"
          >
            {saving ? "Saving..." : s === "In Progress" && inquiry.status === "Resolved" ? "Reopen" : s}
          </button>
        ))}
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-medium text-gray-900 mb-2">History</h2>
        <ul className="border rounded bg-white divide-y">
          {events.map((e) => (
            <li key={e.id} className="p-3 text-sm text-gray-700">
              <span className="font-medium">{e.actor_name}</span>{" "}
              {e.from_status ? `changed status from ${e.from_status} to ${e.to_status}` : "created this inquiry"}
              <span className="block text-xs text-gray-400">{new Date(e.created_at).toLocaleString()}</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}