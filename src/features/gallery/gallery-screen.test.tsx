import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiRequest } from "@/lib/api/client";
import { GalleryScreen } from "./gallery-screen";

vi.mock("@/lib/api/moments", () => ({
  momentsApi: {
    list: async (scope: string) => {
      const response = await fetch(`/api/v2/moments?scope=${scope}`);
      if (!response.ok) throw new Error("network");
      return response.json();
    },
    like: async () => ({ momentId: "moment", liked: true, likesCount: 1 }),
  },
}));

vi.mock("@/lib/api/client", () => ({
  apiRequest: vi.fn(async () => null),
}));

vi.mock("@/features/moments/moment-composer", () => ({
  MomentComposer: () => (
    <section aria-label="Compartilhar momento">Câmera aberta</section>
  ),
}));

const emptyPage = { items: [], nextCursor: null };

describe("GalleryScreen", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("shows a retryable error when Moments cannot be loaded", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockRejectedValueOnce(new Error("network"));
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => emptyPage,
    } as Response);

    render(<GalleryScreen animDir="up" />);

    expect(
      await screen.findByRole("heading", {
        name: "Não foi possível carregar Momentos",
      }),
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/v2/moments?scope=feed");
    await user.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(
      await screen.findByRole("heading", { name: "Ainda não há momentos" }),
    ).toBeInTheDocument();
  });

  it("uses compact passport-like grids for personal and group moments", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => emptyPage,
    } as Response);
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [
          {
            id: "mine-1",
            placeName: "Capela",
            imageUrl: "/mock/moments/dnj-feed-01.png",
          },
        ],
        nextCursor: null,
      }),
    } as Response);
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => emptyPage,
    } as Response);

    render(<GalleryScreen animDir="up" group="Grupo Esperança" />);

    expect(
      await screen.findByRole("button", { name: "Grupo" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Meus Momentos" }));
    expect(await screen.findByAltText("Momento em Capela")).toHaveClass(
      "aspect-[3/4]",
    );
    expect(document.querySelector(".passport-grid")).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Abrir momento em Capela" }),
    );
    expect(await screen.findByRole("button", { name: "Compartilhar momento" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Grupo" }));
    expect(
      await screen.findByRole("heading", {
        name: "Seu grupo ainda não publicou momentos",
      }),
    ).toBeInTheDocument();
  });

  it("allows only likes for moments from the public feed", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [
          {
            id: "moment-share",
            placeName: "Palco",
            imageUrl: "/mock/moments/dnj-feed-01.png",
            publicationStatus: "public",
            moderationStatus: "approved",
            likesCount: 2,
            likedByCurrentUser: false,
          },
        ],
        nextCursor: null,
      }),
    } as Response);
    render(<GalleryScreen animDir="up" />);

    expect(await screen.findByRole("button", { name: "Curtir momento" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Compartilhar momento" })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /coment/i }),
    ).not.toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Abrir momento em Palco" }),
    );
    expect(await screen.findByRole("dialog", { name: "Detalhe do momento" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Curtir momento" })).toHaveLength(2);
    expect(screen.queryByRole("button", { name: "Compartilhar momento" })).not.toBeInTheDocument();
    const detailLike = screen.getAllByRole("button", {
      name: "Curtir momento",
    })[1];
    await user.click(detailLike);
    expect(detailLike).not.toBeDisabled();
  });

  it("shows feed sharing only for personal and group moments", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [
          { id: "mine", authorName: "Alex", groupId: "other", placeName: "Capela", imageUrl: "/mock/moments/dnj-feed-01.png" },
          { id: "group", authorName: "Outra pessoa", groupId: "group-1", placeName: "Palco", imageUrl: "/mock/moments/dnj-feed-01.png" },
          { id: "other", authorName: "Outra pessoa", groupId: "group-2", placeName: "Quadra", imageUrl: "/mock/moments/dnj-feed-01.png" },
        ],
        nextCursor: null,
      }),
    } as Response);

    render(
      <GalleryScreen
        animDir="up"
        currentUserName="Alex"
        currentGroupId="group-1"
      />,
    );

    expect(
      await screen.findAllByRole("button", { name: "Compartilhar momento" }),
    ).toHaveLength(2);
    expect(screen.getAllByText("DNJ")).toHaveLength(3);
  });

  it("shows the author's profile photo when the feed provides one", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [{
          id: "moment-avatar",
          authorName: "Alex",
          authorAvatarUrl: "https://images.example/avatar.jpg",
          placeName: "Capela",
          imageUrl: "/mock/moments/dnj-feed-01.png",
        }],
        nextCursor: null,
      }),
    } as Response);

    render(<GalleryScreen animDir="up" />);

    expect(await screen.findByRole("img", { name: "Foto de perfil de Alex" }))
      .toHaveAttribute("src", "https://images.example/avatar.jpg");
  });

  it("marks photos that scored a Moment challenge without showing a caption", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [{
          id: "moment-challenge",
          authorName: "Alex",
          placeName: "Palco",
          imageUrl: "/mock/moments/dnj-feed-01.png",
          origin: "challenge",
          pointsAwarded: 50,
          publicationStatus: "public",
          moderationStatus: "approved",
          likesCount: 0,
          likedByCurrentUser: false,
        }],
        nextCursor: null,
      }),
    } as Response);

    render(<GalleryScreen animDir="up" />);

    expect(await screen.findByText("Desafio pontuado")).toBeInTheDocument();
    expect(screen.queryByText(/registrou este momento/i)).not.toBeInTheDocument();
  });

  it("opens the camera for a free Moment when there is no current participation", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => emptyPage,
    } as Response);

    render(<GalleryScreen animDir="up" />);
    await screen.findByRole("heading", { name: "Ainda não há momentos" });
    await user.click(screen.getByRole("button", { name: "Adicionar momento" }));

    expect(
      await screen.findByLabelText("Compartilhar momento"),
    ).toHaveTextContent("Câmera aberta");
    expect(apiRequest).not.toHaveBeenCalledWith(
      "/participations/current",
      expect.anything(),
    );
  });
});
