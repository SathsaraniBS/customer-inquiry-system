import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import NewInquiryPage from "./page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/lib/api", () => ({
  api: vi.fn(),
}));

import { api } from "@/lib/api";

describe("New inquiry form", () => {
  it("shows field errors and does not call the API when the form is empty", async () => {
    render(<NewInquiryPage />);

    await userEvent.click(screen.getByRole("button", { name: /save inquiry/i }));

    expect(screen.getByText("Customer name is required")).toBeInTheDocument();
    expect(screen.getByText("Enter an email or phone number")).toBeInTheDocument();
    expect(screen.getByText("Subject is required")).toBeInTheDocument();
    expect(screen.getByText("Description is required")).toBeInTheDocument();
    expect(api).not.toHaveBeenCalled();
  });
});