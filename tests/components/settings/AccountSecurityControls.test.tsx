import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  EmailChangeControl,
  PasswordChangeControl,
} from "@/components/settings/AccountSecurityControls";

const { updateUser, signInWithPassword } = vi.hoisted(() => ({
  updateUser: vi.fn(),
  signInWithPassword: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ auth: { updateUser, signInWithPassword } }),
}));

describe("EmailChangeControl", () => {
  beforeEach(() => vi.clearAllMocks());

  it("submits a valid changed email and requires positive pending-email evidence", async () => {
    updateUser.mockResolvedValue({
      data: {
        user: {
          id: "user-1",
          email: "old@example.com",
          new_email: "new@example.com",
        },
      },
      error: null,
    });
    render(<EmailChangeControl currentEmail="old@example.com" />);

    fireEvent.change(screen.getByLabelText("New email address"), {
      target: { value: "new@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Change email" }));

    await waitFor(() =>
      expect(updateUser).toHaveBeenCalledWith(
        { email: "new@example.com" },
        { emailRedirectTo: "http://localhost:3000/auth/confirm" },
      ),
    );
    expect(
      screen.getByText(/if old@example.com also receives one, open both/i),
    ).toBeInTheDocument();
  });

  it("does not report success when updateUser returns no matching user", async () => {
    updateUser.mockResolvedValue({ data: { user: null }, error: null });
    render(<EmailChangeControl currentEmail="old@example.com" />);

    fireEvent.change(screen.getByLabelText("New email address"), {
      target: { value: "new@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Change email" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/could not be verified/i);
  });
});

describe("PasswordChangeControl", () => {
  beforeEach(() => vi.clearAllMocks());

  function fillPasswordForm() {
    render(
      <PasswordChangeControl
        currentEmail="old@example.com"
        currentUserId="user-1"
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Change password" }));
    fireEvent.change(screen.getByLabelText("Current password"), {
      target: { value: "current-password" },
    });
    fireEvent.change(screen.getByLabelText("New password"), {
      target: { value: "New-password-123!" },
    });
    fireEvent.change(screen.getByLabelText("Confirm new password"), {
      target: { value: "New-password-123!" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Update password" }));
  }

  it("verifies the current password for the same user before updating", async () => {
    signInWithPassword.mockResolvedValue({
      data: { user: { id: "user-1", email: "old@example.com" } },
      error: null,
    });
    updateUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });

    fillPasswordForm();

    await waitFor(() =>
      expect(signInWithPassword).toHaveBeenCalledWith({
        email: "old@example.com",
        password: "current-password",
      }),
    );
    expect(updateUser).toHaveBeenCalledWith({ password: "New-password-123!" });
    expect(screen.getByText("Password updated.")).toBeInTheDocument();
  });

  it("does not update when current-password verification lacks positive evidence", async () => {
    signInWithPassword.mockResolvedValue({ data: { user: null }, error: null });

    fillPasswordForm();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "current password could not be verified",
    );
    expect(updateUser).not.toHaveBeenCalled();
  });

  it("reuses the shared password policy and strength bar", () => {
    render(
      <PasswordChangeControl
        currentEmail="old@example.com"
        currentUserId="user-1"
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Change password" }));
    fireEvent.change(screen.getByLabelText("New password"), {
      target: { value: "short" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Update password" }));

    expect(screen.getByText("Use at least 12 characters.")).toBeInTheDocument();
    expect(screen.getByText("Password strength")).toBeInTheDocument();
    expect(signInWithPassword).not.toHaveBeenCalled();
  });
});
