"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

const EMPTY = { customer_name: "", contact: "", subject: "", description: "" };
const DRAFT_KEY = "inquiry-draft";

function contactKind(value) {
  const v = value.trim();
  if (!v) return "";
  if (/^\S+@\S+\.\S+$/.test(v)) return "Email address";
  if (/^[+\d][\d\s()-]{5,}$/.test(v)) return "Phone number";
  return "";
}

function Field({ name, label, value, onChange, errors, multiline, hint, autoFocus }) {
  const Tag = multiline ? "textarea" : "input";
  const errs = errors[name];
  return (
    <div>
      <label htmlFor={`f-${name}`} className="block text-sm font-medium text-gray-700">
        {label}
      </label>
      <Tag
        id={`f-${name}`}
        value={value}
        onChange={(e) => onChange(name, e.target.value)}
        rows={multiline ? 5 : undefined}
        autoFocus={autoFocus}
        aria-invalid={errs ? "true" : "false"}
        aria-describedby={errs ? `e-${name}` : undefined}
        className={`mt-1 w-full border rounded-lg px-3 py-2 text-gray-900 ${errs ? "border-red-500 bg-red-50/40" : "border-gray-300"}`}
      />
      {errs ? (
        <p id={`e-${name}`} className="text-red-700 text-xs mt-1">
          {errs[0]}
        </p>
      ) : (
        hint && <p className="text-gray-500 text-xs mt-1">{hint}</p>
      )}
    </div>
  );
}

export default function NewInquiryPage() {
  const router = useRouter();
  const [form, setForm] = useState(EMPTY);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [duplicateId, setDuplicateId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [restored, setRestored] = useState(false);

  // Restore an unsent draft (survives refresh and failed saves)
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (raw) {
        const draft = JSON.parse(raw);
        if (Object.values(draft).some((v) => v)) {
          setForm({ ...EMPTY, ...draft });
          setRestored(true);
        }
      }
    } catch {
      /* storage unavailable: start with an empty form */
    }
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(form));
    } catch {
      /* ignore */
    }
  }, [form]);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    setFieldErrors((e) => ({ ...e, [field]: undefined }));
  }

  function discardDraft() {
    setForm(EMPTY);
    setFieldErrors({});
    setRestored(false);
    try {
      sessionStorage.removeItem(DRAFT_KEY);
    } catch {
      /* ignore */
    }
  }

  // Quick client-side check so the user gets instant guidance.
  // The API validates again independently.
  function validate() {
    const errors = {};
    if (!form.customer_name.trim()) errors.customer_name = ["Customer name is required"];
    if (form.contact.trim().length < 3) errors.contact = ["Enter an email or phone number"];
    if (!form.subject.trim()) errors.subject = ["Subject is required"];
    if (!form.description.trim()) errors.description = ["Description is required"];
    return errors;
  }

  function focusFirst(errors) {
    const first = ["customer_name", "contact", "subject", "description"].find((k) => errors[k]);
    if (first) document.getElementById(`f-${first}`)?.focus();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError("");
    setDuplicateId(null);

    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setTimeout(() => focusFirst(errors), 0);
      return;
    }

    setSaving(true);
    try {
      const data = await api("/inquiries", { method: "POST", body: form });
      try {
        sessionStorage.removeItem(DRAFT_KEY);
      } catch {
        /* ignore */
      }
      router.push(`/inquiries/${data.inquiry.id}`);
    } catch (err) {
      if (err.status === 401) {
        router.push("/login");
        return;
      }
      if (err.status === 400 && err.body?.fields) {
        setFieldErrors(err.body.fields);
        setTimeout(() => focusFirst(err.body.fields), 0);
      } else if (err.status === 409 && err.body?.existingId) {
        setDuplicateId(err.body.existingId);
        setFormError(err.message);
      } else {
        setFormError(`${err.message} Your details are still here, so you can try again.`);
      }
    } finally {
      setSaving(false);
    }
  }

  const kind = contactKind(form.contact);

  return (
    <main className="max-w-xl mx-auto p-4 sm:p-6">
      <Link href="/inquiries" className="text-sm text-teal-800 hover:underline">
        ← Back to inquiries
      </Link>
      <h1 className="text-2xl font-semibold text-gray-900 my-4">New inquiry</h1>

      {restored && (
        <div role="status" className="bg-sky-50 border border-sky-100 text-sky-900 p-3 rounded-lg mb-4 text-sm flex items-center justify-between gap-3">
          <span>We restored your unsent draft.</span>
          <button type="button" onClick={discardDraft} className="underline font-medium">
            Discard draft
          </button>
        </div>
      )}

      {formError && (
        <div role="alert" className="bg-red-50 border border-red-100 text-red-800 p-3 rounded-lg mb-4 text-sm">
          {formError}
          {duplicateId && (
            <>
              {" "}
              <Link href={`/inquiries/${duplicateId}`} className="underline font-medium">
                View the existing inquiry
              </Link>
            </>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 bg-white p-5 sm:p-6 rounded-xl border border-gray-200" noValidate>
        <Field name="customer_name" label="Customer name" value={form.customer_name} onChange={update} errors={fieldErrors} autoFocus />
        <Field
          name="contact"
          label="Contact (email or phone)"
          value={form.contact}
          onChange={update}
          errors={fieldErrors}
          hint={kind ? `${kind} detected` : "How staff can reach the customer"}
        />
        <Field name="subject" label="Subject" value={form.subject} onChange={update} errors={fieldErrors} hint="A few words, e.g. Order delay" />
        <Field
          name="description"
          label="Description"
          value={form.description}
          onChange={update}
          errors={fieldErrors}
          multiline
          hint={`${form.description.length} characters`}
        />
        <button
          type="submit"
          disabled={saving}
          className="w-full bg-teal-700 hover:bg-teal-800 text-white font-medium py-2.5 rounded-lg disabled:opacity-60 transition-colors"
        >
          {saving ? "Saving..." : "Save inquiry"}
        </button>
      </form>
    </main>
  );
}