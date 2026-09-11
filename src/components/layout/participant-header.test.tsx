import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { ParticipantHeader } from "./participant-header";

it("uses the participant photo and falls back to initials when it fails, keeping navigation functional", async () => {
  const user = { name: "Ana Souza", cpf: "", email: "", group: "", points: 320, rankPosition: 4, avatarUrl: "https://example.test/ana.jpg" };
  const onAccount = vi.fn();
  const onGame = vi.fn();
  const { rerender } = render(<ParticipantHeader user={user} home onAccount={onAccount} onGame={onGame} />);
  const account = screen.getByRole("button", { name: "Abrir minha conta" });
  expect(account.querySelector("img")).toHaveAttribute("src", user.avatarUrl);
  fireEvent.error(account.querySelector("img")!);
  expect(account).toHaveTextContent("AS");
  await userEvent.click(account);
  await userEvent.click(screen.getByRole("button", { name: "320 pontos. Abrir DNJ Game" }));
  expect(onAccount).toHaveBeenCalledOnce();
  expect(onGame).toHaveBeenCalledOnce();
  rerender(<ParticipantHeader user={{ ...user, avatarUrl: "https://example.test/new.jpg", points: 800 }} home onAccount={onAccount} onGame={onGame} />);
  expect(account.querySelector("img")).toHaveAttribute("src", "https://example.test/new.jpg");
  expect(screen.getByRole("button", { name: "800 pontos. Abrir DNJ Game" })).toBeInTheDocument();
});

it("keeps the DNJ logo visible on internal participant screens", () => {
  render(<ParticipantHeader user={{ name: "Ana Souza", cpf: "", email: "", group: "", points: 0, rankPosition: 1 }} onHome={vi.fn()} onAccount={vi.fn()} onGame={vi.fn()} />);
  expect(screen.getByRole("button", { name: "Ir para Home" })).toBeInTheDocument();
});
