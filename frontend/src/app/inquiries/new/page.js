"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

const EMPTY = { customer_name: "", contact: "", subject: "", description: "" };

export default function NewInquiryPage() {
  const router = useRouter();
  const [form, setForm] = useState(EMPTY);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [duplicateId, setDuplicateId] = useState(null);
  const [saving, setSaving] = useState(false);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    setFieldErrors((e) => ({ ...e, [field]: undefined }));
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

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError("");
    setDuplicateId(null);

    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setSaving(true);
    try {
      const data = await api("/inquiries", { method: "POST", body: form });
      router.push(`/inquiries/${data.inquiry.id}`);
    } catch (err) {
      if (err.status === 401) {
        router.push("/login");
        return;
      }
      if (err.status === 400 && err.body?.fields) {
        setFieldErrors(err.body.fields);
      } else if (err.status === 409 && err.body?.existingId) {
        setDuplicateId(err.body.existingId);
        setFormError(err.message);
      } else {
        setFormError(err.message);
      }
    } finally {
      setSaving(false);
    }
  }

  function Field({ name, label, multiline }) {
    const Tag = multiline ? "textarea" : "input";
    const errs = fieldErrors[name];
    return (
      <label className="block text-sm text-gray-700">
        {label}
        <Tag
          value={form[name]}
          onChange={(e) => update(name, e.target.value)}
          rows={multiline ? 4 : undefined}
          aria-invalid={errs ? "true" : "false"}
          className={`mt-1 w-full border rounded px-3 py-2 text-gray-900 ${errs ? "border-red-500" : ""}`}
        />
        {errs && <span className="text-red-600 text-xs">{errs[0]}</span>}
      </label>
    );
  }

  return (
    <main className="max-w-xl mx-auto p-6">
      <Link href="/inquiries" className="text-sm underline text-gray-600">
        Back to inquiries
      </Link>
      <h1 className="text-2xl font-semibold text-gray-900 my-4">New inquiry</h1>

      {formError && (
        <div role="alert" className="bg-red-50 text-red-700 p-3 rounded mb-4 text-sm">
          {formError}
          {duplicateId && (
            <>
              {" "}
              <Link href={`/inquiries/${duplicateId}`} className="underline">
                View the existing inquiry
              </Link>
            </>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded-lg shadow" noValidate>
        {Field({ name: "customer_name", label: "Customer name" })}
        {Field({ name: "contact", label: "Contact (email or phone)" })}
        {Field({ name: "subject", label: "Subject" })}
        {Field({ name: "description", label: "Description", multiline: true })}
        <button
          type="submit"
          disabled={saving}
          className="w-full bg-black text-white py-2 rounded disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save inquiry"}
        </button>
      </form>
    </main>
  );
}