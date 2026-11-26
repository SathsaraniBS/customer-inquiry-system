"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import StatusBadge from "@/components/StatusBadge";
import Toast from "@/components/Toast";
import { timeAgo } from "@/lib/time";

const STEPS = ["New", "In Progress", "Resolved"];

// Mirrors the backend rules (the API still enforces them)
const NEXT_STATUSES = {
  "New": ["In Progress"],
  "In Progress": ["Resolved"],
  "Resolved": ["In Progress"],
};

function actionLabel(from, to) {
  if (from === "Resolved") return "Reopen";
  return `Mark as ${to}`;
}

function contactHref(contact) {
  if (/^\S+@\S+\.\S+$/.test(contact)) return `mailto:${contact}`;
  if (/^[+\d][\d\s()-]{5,}$/.test(contact)) return `tel:${contact.replace(/[^\d+]/g, "")}`;
  return null;
}

function Stepper({ current }) {
  const idx = STEPS.indexOf(current);
  return (
    <ol className="flex items-center" aria-label="Inquiry progress">
      {STEPS.map((s, n) => {
        const done = n < idx;
        const active = n === idx;
        return (
          <li key={s} className="flex items-center flex-1 last:flex-none" aria-current={active ? "step" : undefined}>
            <span
              className={`grid place-items-center h-7 w-7 rounded-full text-xs font-medium border ${
                done
                  ? "bg-teal-700 border-teal-700 text-white"
                  : active
                  ? "bg-white border-teal-700 text-teal-800 ring-4 ring-teal-100"
                  : "bg-white border-gray-300 text-gray-400"
              }`}
            >
              {done ? "✓" : n + 1}
            </span>
            <span className={`ml-2 text-sm ${active ? "font-medium text-gray-900" : "text-gray-500"}`}>{s}</span>
            {n < STEPS.length - 1 && <span className={`flex-1 h-px mx-3 ${done ? "bg-teal-700" : "bg-gray-200"}`} aria-hidden="true" />}
          </li>
        );
      })}
    </ol>
  );
}

export default function InquiryDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [inquiry, setInquiry] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [saving, setSaving] = useState("");
  const [actionError, setActionError] = useState("");
  const [stale, setStale] = useState(false);
  const [toast, setToast] = useState("");
  const [copied, setCopied] = useState(false);

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
    const from = inquiry.status;
    setSaving(status);
    setActionError("");
    setStale(false);
    try {
      await api(`/inquiries/${id}/status`, {
        method: "PATCH",
        body: { status, expectedVersion: inquiry.version },
      });
      await load();
      setToast(from === "Resolved" ? "Reopened" : `Marked as ${status}`);
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
      setSaving("");
    }
  }

  async function copyContact() {
    try {
      await navigator.clipboard.writeText(inquiry.contact);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard can be blocked; the contact is still visible on screen */
    }
  }

  if (loading && !inquiry) {
    return (
      <main className="max-w-2xl mx-auto p-6" aria-busy="true">
        <div className="skeleton h-4 w-32 mb-6" />
        <div className="skeleton h-8 w-64 mb-6" />
        <div className="skeleton h-32 w-full" />
      </main>
    );
  }

  if (loadError) {
    const notFound = loadError.status === 404 || loadError.status === 400;
    const forbidden = loadError.status === 403;
    return (
      <main className="max-w-2xl mx-auto p-4 sm:p-6">
        <Link href="/inquiries" className="text-sm text-teal-800 hover:underline">
          ← Back to inquiries
        </Link>
        <div role="alert" className="mt-4 bg-white border border-gray-200 p-6 rounded-xl text-center">
          {notFound || forbidden ? (
            <>
              <p className="font-medium text-gray-900">{forbidden ? "You do not have access to this inquiry" : "Inquiry not found"}</p>
              <p className="text-sm text-gray-600 mt-1">It may have been removed, or the link may be wrong.</p>
              <Link href="/inquiries" className="inline-block mt-4 bg-teal-700 text-white rounded-lg px-4 py-2 text-sm font-medium">
                Go to inquiries
              </Link>
            </>
          ) : (
            <>
              <p className="font-medium text-gray-900">Could not load this inquiry</p>
              <p className="text-sm text-gray-600 mt-1">{loadError.message}</p>
              <button onClick={load} className="mt-4 border border-gray-300 rounded-lg px-3 py-1.5 text-sm hover:bg-gray-100">
                Try again
              </button>
            </>
          )}
        </div>
      </main>
    );
  }

  const options = NEXT_STATUSES[inquiry.status] || [];
  const href = contactHref(inquiry.contact);
  const last = events[events.length - 1];

  return (
    <main className="max-w-2xl mx-auto p-4 sm:p-6">
      <Link href="/inquiries" className="text-sm text-teal-800 hover:underline">
        ← Back to inquiries
      </Link>

      <div className="flex items-start justify-between gap-4 mt-4 mb-1">
        <h1 className="text-2xl font-semibold text-gray-900">{inquiry.subject}</h1>
        <StatusBadge status={inquiry.status} />
      </div>
      {last && (
        <p className="text-sm text-gray-500 mb-5">
          Last update by {last.actor_name}, <span title={new Date(last.created_at).toLocaleString()}>{timeAgo(last.created_at)}</span>
        </p>
      )}

      {stale && (
        <div role="alert" className="bg-amber-50 border border-amber-200 text-amber-900 p-3 rounded-lg mb-4 text-sm">
          Someone else changed this inquiry, so your update was not applied.{" "}
          <button
            onClick={() => {
              setStale(false);
              load();
            }}
            className="underline font-medium"
          >
            Show latest
          </button>
        </div>
      )}

      {actionError && (
        <div role="alert" className="bg-red-50 border border-red-100 text-red-800 p-3 rounded-lg mb-4 text-sm">
          {actionError}
        </div>
      )}

      <section className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
        <Stepper current={inquiry.status} />
      </section>

      <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <span className="font-medium text-gray-900">{inquiry.customer_name}</span>
          {href ? (
            <a href={href} className="text-teal-800 hover:underline">
              {inquiry.contact}
            </a>
          ) : (
            <span className="text-gray-600">{inquiry.contact}</span>
          )}
          <button onClick={copyContact} className="text-xs text-gray-500 hover:text-gray-900 border border-gray-200 rounded px-2 py-0.5">
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <p className="text-gray-900 whitespace-pre-wrap leading-relaxed">{inquiry.description}</p>
      </section>

      <section className="mt-4 flex flex-wrap gap-2 items-center">
        {options.map((s) => {
          const reopen = inquiry.status === "Resolved";
          return (
            <button
              key={s}
              onClick={() => changeStatus(s)}
              disabled={Boolean(saving)}
              className={`px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-60 transition-colors ${
                reopen ? "border border-gray-300 text-gray-800 hover:bg-gray-100" : "bg-teal-700 hover:bg-teal-800 text-white"
              }`}
            >
              {saving === s ? "Saving..." : actionLabel(inquiry.status, s)}
            </button>
          );
        })}
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-medium text-gray-900 mb-3">History</h2>
        <ol className="relative border-l border-gray-200 ml-2 space-y-5">
          {[...events].reverse().map((e) => (
            <li key={e.id} className="ml-5">
              <span className="absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full bg-teal-700 ring-4 ring-[#f8f9f8]" aria-hidden="true" />
              <p className="text-sm text-gray-800">
                <span className="font-medium">{e.actor_name}</span>{" "}
                {e.from_status ? (
                  <>
                    moved this from <StatusBadge status={e.from_status} /> to <StatusBadge status={e.to_status} />
                  </>
                ) : (
                  "created this inquiry"
                )}
              </p>
              <p className="text-xs text-gray-400 mt-1" title={new Date(e.created_at).toLocaleString()}>
                {timeAgo(e.created_at)} · {new Date(e.created_at).toLocaleString()}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <Toast message={toast} onDone={() => setToast("")} />
    </main>
  );
}