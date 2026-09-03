"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { authApi } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import { mapIdentityUser } from "@/lib/api/mappers";
import { profileApi } from "@/lib/api/profile";
import { momentChallengesApi, type MomentChallenge } from "@/lib/api/moment-challenges";
import type { AuthSession } from "@/types/domain";
import { storage } from "@/lib/storage";
import { ConnectivityStatus } from "@/components/pwa/connectivity-status";
import { InstallPromotion } from "@/components/pwa/install-promotion";
import { usePwa } from "@/components/pwa/pwa-registrar";
import { useNetworkStatus } from "@/hooks/use-network-status";
import { AUTH_ORDER } from "@/features/app/constants";
import type {
  AnimDir,
  RegistrationData,
  Screen,
  UserData,
} from "@/features/app/types";
import {
  clearOfflineSnapshot,
  migrateThemeStorage,
  readOfflineSnapshot,
  writeOfflineSnapshot,
} from "@/lib/pwa/offline-snapshot";

function sessionUserData(session: AuthSession): UserData {
  return {
    id: session.user.id,
    name: session.user.name,
    cpf: session.user.document,
    email: session.user.email,
    mobilePhone: session.user.mobilePhone,
    group: session.user.group?.groupName ?? "",
    points: session.user.points,
    rankPosition: session.user.rankPosition,
    avatarUrl: session.user.avatarUrl ?? storage.getAvatar(session.user.id) ?? undefined,
  };
}

function googleProfilePicture(idToken: string): string | undefined {
  try {
    const payload = idToken.split(".")[1];
    if (!payload) return undefined;
    const picture = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")))?.picture;
    return typeof picture === "string" && picture.startsWith("https://") ? picture : undefined;
  } catch { return undefined; }
}

// ─── Screen transition logic ──────────────────────────────────────────────────

function getAnimDir(from: Screen, to: Screen): AnimDir {
  const fi = AUTH_ORDER.indexOf(from);
  const ti = AUTH_ORDER.indexOf(to);
  if (fi !== -1 && ti !== -1) return ti > fi ? "right" : "left";
  return "up";
}

import { AccountScreen } from "@/features/account/account-screen";
import { CreateAccountScreen, GroupScreen, LoginScreen, VerifyScreen } from "@/features/auth/auth-screens";
import { GameScreen } from "@/features/game/game-screen";
import { GalleryScreen } from "@/features/gallery/gallery-screen";
import { HomeScreen } from "@/features/home/home-screen";
import { EventScheduleScreen } from "@/features/schedule/schedule-screen";
import { EventMapScreen } from "@/features/map/map-screen";
import { QueueScreen } from "@/features/queue/queue-screen";
import { AppShell, BottomNav, TopBar } from "@/components/layout/dnj-layout";
import { DnjOnboarding } from "@/components/onboarding/dnJ-onboarding";
import { LiveStatusStack, type LiveAdminNotification, type LiveQueueNotification, type LiveSpecialEvent } from "@/components/live/live-status-stack";
import { apiRequest } from "@/lib/api/client";
import { notificationsApi } from "@/lib/api/notifications";
import { PushNotificationSettings } from "@/components/pwa/push-notification-settings";
const SPECIAL_EVENT_POLL_MS = 15_000;
const pushScreens = new Set<Screen>(["home", "game", "queue", "gallery"]);
const showEmailDebugCode = process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_SHOW_EMAIL_DEBUG_CODE === "true";
function completedMomentChallengesKey(userId?: string) {
  return userId ? `dnj.completed-moment-challenges.${userId}` : null;
}

export function DnjApp() {
  const reduceMotion = useReducedMotion();
  const network = useNetworkStatus();
  const pwa = usePwa();
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    return migrateThemeStorage() ?? "light";
  });

  function toggleTheme() {
    setTheme((t) => {
      const next = t === "light" ? "dark" : "light";
      try { storage.setTheme(next); } catch { /* noop */ }
      return next;
    });
  }

  const [screen, setScreen]         = useState<Screen>("login");
  const [prevScreen, setPrevScreen] = useState<Screen>("login");
  const [emailVal, setEmailVal]     = useState("");
  const [emailVerificationCode, setEmailVerificationCode] = useState<string | null>(null);
  const [registration, setRegistration] = useState<RegistrationData | null>(null);
  const [user, setUser] = useState<UserData>({
    name: "João Paulo", cpf: "", email: "", mobilePhone: "", group: "",
    points: 150, rankPosition: 9,
  });
  const [offlineSnapshotCapturedAt, setOfflineSnapshotCapturedAt] = useState<string | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [pushPromptOpen, setPushPromptOpen] = useState(false);
  const [specialEvent, setSpecialEvent] = useState<LiveSpecialEvent | null>(null);
  const [momentChallenge, setMomentChallenge] = useState<MomentChallenge | null>(null);
  const [completedMomentChallengeIds, setCompletedMomentChallengeIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [queueNotification, setQueueNotification] = useState<LiveQueueNotification | null>(null);
  const [adminNotification, setAdminNotification] = useState<LiveAdminNotification | null>(null);
  const specialEventsUnavailable = useRef(false);
  const restoredSession = useRef(false);
  const restoredSnapshot = useRef(false);

  const navigate = useCallback((next: Screen) => {
    setPrevScreen(screen);
    setScreen(next);
  }, [screen]);
  const handleQueueNotification = useCallback((notification: LiveQueueNotification | null) => {
    setQueueNotification(notification);
  }, []);
  const handleReadAdminNotification = useCallback((notificationId: string) => {
    void notificationsApi.markRead(notificationId).catch(() => undefined);
    setAdminNotification(null);
  }, []);
  const completeMomentChallenge = useCallback((challengeId: string) => {
    setCompletedMomentChallengeIds((current) => {
      const next = new Set(current);
      next.add(challengeId);
      const key = completedMomentChallengesKey(user.id);
      if (key) localStorage.setItem(key, JSON.stringify([...next]));
      return next;
    });
    setMomentChallenge((current) => current?.id === challengeId ? null : current);
  }, [user.id]);

  const handleLogin = useCallback(async (email: string) => {
    setEmailVal(email);
    setUser((u) => ({ ...u, email }));
    const response = await authApi.requestCode(email);
    setEmailVerificationCode(showEmailDebugCode ? response.debugCode ?? null : null);
    navigate("verify");
  }, [navigate]);

  const handleGoogleLogin = useCallback(async (idToken: string) => {
    const identity = await authApi.loginWithGoogle(idToken);
    const apiUser = mapIdentityUser(identity.user);
    const session = { user: apiUser, identityToken: identity.accessToken };
    storage.setSession(session);
    const avatarUrl = apiUser.avatarUrl ?? storage.getAvatar(apiUser.id) ?? googleProfilePicture(idToken);
    if (avatarUrl) storage.setAvatar(apiUser.id, avatarUrl);
    setUser({ ...sessionUserData(session), avatarUrl });
    navigate(identity.onboardingRequired || !identity.user.onboardingComplete ? "group" : "home");
  }, [navigate]);

  const handleResendVerification = useCallback(async () => {
    const response = await authApi.requestCode(emailVal);
    setEmailVerificationCode(showEmailDebugCode ? response.debugCode ?? null : null);
  }, [emailVal]);

  const handleVerification = useCallback(async (code: string) => {
    const response = await authApi.verifyCode(emailVal, code);
    const apiUser = mapIdentityUser(response.user);
    const session = { user: apiUser, identityToken: response.accessToken };
    storage.setSession(session);
    setUser({
      id: apiUser.id,
      name: apiUser.name,
      cpf: apiUser.document,
      email: apiUser.email,
      mobilePhone: apiUser.mobilePhone,
      group: apiUser.group?.groupName ?? "",
      points: apiUser.points,
      rankPosition: apiUser.rankPosition,
      avatarUrl: storage.getAvatar(apiUser.id) ?? undefined,
    });
    navigate(response.onboardingRequired || !response.user.onboardingComplete ? "group" : "home");
  }, [emailVal, navigate]);

  const handleRegistrationVerification = useCallback(async (code: string) => {
    if (!registration) throw new ApiError("Dados do cadastro não encontrados. Tente novamente.", 400);
    const response = await authApi.verifyCode(registration.email, code);
    const apiUser = mapIdentityUser(response.user);
    const session = { user: apiUser, identityToken: response.accessToken };
    storage.setSession(session);
    setUser(sessionUserData(session));
    navigate("group");
  }, [navigate, registration]);

  const handleGroupConfirm = useCallback(async (name: string, document: string, mobilePhone: string, group: string, groupId?: string) => {
    const session = storage.getSession();
    if (!session) throw new ApiError("Sessão não encontrada. Entre novamente.", 401);
    const identity = await authApi.completeOnboarding({ document, mobilePhone, groupId: group === "Sem grupo de jovens" ? null : groupId ?? null });
    let apiUser = mapIdentityUser(identity.user);
    if (name !== apiUser.name) apiUser = mapIdentityUser(await profileApi.update({ name }, session.identityToken));
    storage.setSession({ identityToken: session.identityToken, user: apiUser });
    setUser(sessionUserData({ identityToken: session.identityToken, user: apiUser }));
    navigate("home");
  }, [navigate]);

  const animDir = getAnimDir(prevScreen, screen);
  const isMain  = ["home", "schedule", "map", "game", "queue", "gallery", "account"].includes(screen);
  const activeNavScreen = screen === "schedule" || screen === "map" ? "home" : screen;

  useEffect(() => {
    if (restoredSession.current) return;
    restoredSession.current = true;
    let disposed = false;
    void authApi.getSession().then((identity) => {
      if (disposed) return;
      const apiUser = mapIdentityUser(identity.user);
      const session = { user: apiUser, identityToken: "" };
      storage.setSession(session);
      setUser(sessionUserData(session));
      setPrevScreen("login");
      setScreen(identity.onboardingRequired || !identity.user.onboardingComplete ? "group" : "home");
    }).catch(() => { if (!disposed) setScreen("login"); }).finally(() => { if (!disposed) setSessionReady(true); });

    return () => {
      disposed = true;
    };
  }, []);

  useEffect(() => {
    if (!sessionReady || screen === "login" || screen === "group") return;
    const target = new URLSearchParams(window.location.search).get("screen") as Screen | null;
    if (!target || !pushScreens.has(target)) return;
    setPrevScreen(screen);
    setScreen(target);
    window.history.replaceState(null, "", window.location.pathname);
  }, [screen, sessionReady]);

  useEffect(() => {
    const key = completedMomentChallengesKey(user.id);
    if (!key) return;
    try {
      const ids: unknown = JSON.parse(localStorage.getItem(key) ?? "[]");
      setCompletedMomentChallengeIds(new Set(Array.isArray(ids) ? ids.filter((id): id is string => typeof id === "string") : []));
    } catch {
      setCompletedMomentChallengeIds(new Set());
    }
  }, [user.id]);

  useEffect(() => {
    if (!sessionReady || !isMain) return;
    const timer = window.setTimeout(() => {
      try { if (!localStorage.getItem("dnj.onboarding.2k26")) setOnboardingOpen(true); } catch { setOnboardingOpen(true); }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [isMain, sessionReady]);

  useEffect(() => {
    if (network.isOnline || restoredSnapshot.current || screen !== "login") return;
    restoredSnapshot.current = true;
    const snapshot = readOfflineSnapshot();
    if (!snapshot) return;
    let disposed = false;
    queueMicrotask(() => {
      if (disposed) return;
      setUser({ ...snapshot.user, cpf: "", email: "" });
      setPrevScreen("login");
      setScreen(snapshot.lastMainScreen);
      setOfflineSnapshotCapturedAt(snapshot.capturedAt);
    });
    return () => {
      disposed = true;
    };
  }, [network.isOnline, screen]);

  useEffect(() => {
    if (!network.isOnline || !isMain) return;
    writeOfflineSnapshot({
      schemaVersion: 1,
      capturedAt: new Date().toISOString(),
      lastMainScreen: screen as "home" | "game" | "queue" | "gallery" | "account",
      user: {
        name: user.name,
        group: user.group,
        points: user.points,
        rankPosition: user.rankPosition,
      },
    });
  }, [isMain, network.isOnline, screen, user.group, user.name, user.points, user.rankPosition]);

  useEffect(() => {
    if (!sessionReady || !isMain) return;
    if (specialEventsUnavailable.current) return;
    let active = true;
    const load = async () => {
      try {
        const data = await apiRequest<{ event?: LiveSpecialEvent | null }>("/special-events/active?target=app");
        if (active) setSpecialEvent(data.event ?? null);
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
          specialEventsUnavailable.current = true;
          window.clearInterval(timer);
        }
        if (active) setSpecialEvent(null);
      }
    };
    void load();
    const timer = window.setInterval(() => void load(), SPECIAL_EVENT_POLL_MS);
    return () => { active = false; window.clearInterval(timer); };
  }, [isMain, sessionReady]);

  useEffect(() => {
    if (!sessionReady || !isMain || !network.isOnline) return;
    let active = true;
    const load = async () => {
      try {
        const data = await notificationsApi.list();
        const unread = data.data.find((item) => item.state.toLowerCase() === "unread");
        if (active) setAdminNotification(unread ?? null);
      } catch { /* Notifications are additive; the app remains usable if unavailable. */ }
    };
    void load();
    const timer = window.setInterval(() => void load(), SPECIAL_EVENT_POLL_MS);
    return () => { active = false; window.clearInterval(timer); };
  }, [isMain, network.isOnline, sessionReady]);

  useEffect(() => {
    if (!sessionReady || !isMain || !network.isOnline) return;
    let active = true;
    const load = async () => {
      try {
        const challenge = await momentChallengesApi.active();
        if (active) setMomentChallenge(challenge && !completedMomentChallengeIds.has(challenge.id) ? challenge : null);
      } catch { if (active) setMomentChallenge(null); }
    };
    void load();
    const timer = window.setInterval(() => void load(), SPECIAL_EVENT_POLL_MS);
    return () => { active = false; window.clearInterval(timer); };
  }, [completedMomentChallengeIds, isMain, network.isOnline, sessionReady]);

  if (!sessionReady) {
    return <div className="min-h-dvh" style={{ background: "var(--background)" }} aria-label="Carregando sessao" />;
  }

  return (
    <AppShell theme={theme}>
        <AnimatePresence mode="wait">
          <motion.div
            key={screen}
            className={isMain ? "absolute inset-0" : "relative min-h-dvh"}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: animDir === "left" ? -28 : animDir === "right" ? 28 : 0, y: animDir === "up" ? 18 : 0, scale: 0.985 }}
            animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -10, scale: 0.99 }}
            transition={{ duration: reduceMotion ? 0.01 : 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            {screen === "login"           && <LoginScreen    onNext={handleLogin} onGoogleLogin={handleGoogleLogin} onRegister={() => navigate("register")} animDir={animDir} />}
            {screen === "register"        && <CreateAccountScreen onBack={() => navigate("login")} onDone={async (data) => { setRegistration(data); setEmailVal(data.email); const response = await authApi.requestCode(data.email); setEmailVerificationCode(showEmailDebugCode ? response.debugCode ?? null : null); navigate("register-verify"); }} animDir={animDir} />}
            {screen === "register-verify" && <VerifyScreen  email={registration?.email ?? ""} onNext={handleRegistrationVerification} onBack={() => navigate("register")} animDir={animDir} homologationCode={emailVerificationCode} />}
            {screen === "verify"          && <VerifyScreen  email={emailVal} onNext={handleVerification} onResend={handleResendVerification} onBack={() => navigate("login")}  animDir={animDir} homologationCode={emailVerificationCode} />}
            {screen === "group"   && <GroupScreen   onNext={handleGroupConfirm} onBack={() => navigate("login")} animDir={animDir} initialName={registration?.name ?? ""} initialGroup={user.group} initialDocument={user.cpf} initialMobilePhone={user.mobilePhone || registration?.mobilePhone} />}
            {screen === "home"    && <HomeScreen    user={user}                    animDir={animDir} onOpenSchedule={() => navigate("schedule")} onOpenMap={() => navigate("map")} />}
            {screen === "schedule" && <EventScheduleScreen animDir={animDir} onBack={() => navigate("home")} />}
            {screen === "map" && <EventMapScreen animDir={animDir} onBack={() => navigate("home")} />}
            {screen === "game"    && <GameScreen user={user} theme={theme} animDir={animDir} momentChallenge={momentChallenge} onMomentCompleted={(challengeId) => completeMomentChallenge(challengeId)} onPointsChange={(points) => setUser((current) => ({ ...current, points }))} />}
            {screen === "queue"   && <QueueScreen user={{ id: user.mobilePhone || user.email, name: user.name }} animDir={animDir} onQueueNotification={handleQueueNotification} />}
            {screen === "gallery" && <GalleryScreen group={user.group} currentUserName={user.name} currentGroupId={storage.getSession()?.user.group?.id} animDir={animDir} />}
            {screen === "account" && <AccountScreen user={user} onAvatarChange={(avatarUrl) => {
              if (!user.id) return;
              storage.setAvatar(user.id, avatarUrl);
              setUser((current) => ({ ...current, avatarUrl }));
              const session = storage.getSession();
              if (!session) return;
              void profileApi.update({ avatarUrl }, session.identityToken).then((profile) => {
                const updatedUser = { ...session.user, avatarUrl: profile.avatarUrl ?? avatarUrl };
                storage.setSession({ ...session, user: updatedUser });
                setUser((current) => ({ ...current, avatarUrl: updatedUser.avatarUrl }));
              }).catch(() => undefined);
            }} onLogout={() => { void authApi.logout().catch(() => undefined); storage.clearSession(); clearOfflineSnapshot(); navigate("login"); }} theme={theme} onToggleTheme={toggleTheme} animDir={animDir} />}
          </motion.div>
        </AnimatePresence>

        {isMain && <TopBar points={user.points} />}
        {isMain && <LiveStatusStack special={specialEvent} momentChallenge={momentChallenge} queueNotification={queueNotification} adminNotification={adminNotification} onOpenGame={() => navigate("game")} onOpenQueue={() => navigate("queue")} onReadAdmin={handleReadAdminNotification} />}
        {!network.isOnline && offlineSnapshotCapturedAt && (
          <p
            className="absolute left-3 right-3 z-40 rounded-xl border px-3 py-2 text-center text-xs font-medium"
            style={{ top: "calc(48px + var(--safe-area-top) + 8px)", background: "var(--card)", borderColor: "var(--border)", color: "var(--muted-foreground)" }}
          >
            Conteúdo salvo em {new Date(offlineSnapshotCapturedAt).toLocaleString("pt-BR")} · somente leitura
          </p>
        )}
        {isMain && <BottomNav active={activeNavScreen} onNavigate={navigate} />}
        {isMain && onboardingOpen && <DnjOnboarding onClose={() => { try { localStorage.setItem("dnj.onboarding.2k26", "1"); } catch {} setOnboardingOpen(false); setPushPromptOpen(true); }} />}
        {isMain && !onboardingOpen && pushPromptOpen && <div className="absolute inset-0 z-[66] flex items-end bg-black/40 pb-6"><div className="w-full"><PushNotificationSettings prompt onDone={() => setPushPromptOpen(false)} /><button type="button" className="mx-5 mt-3 w-[calc(100%-2.5rem)] py-2 text-sm font-semibold" style={{ color: "white" }} onClick={() => setPushPromptOpen(false)}>Agora não</button></div></div>}
        <ConnectivityStatus
          idleContent={(
            <InstallPromotion
              hasBottomNavigation={isMain}
              isIosSafari={pwa.isIosSafari}
              isOnline={network.isOnline}
              onDismiss={pwa.dismissInstall}
              onInstall={pwa.requestInstall}
              pwaStatus={pwa.status}
              status={pwa.installStatus}
            />
          )}
          isOnline={network.isOnline}
          onApplyUpdate={pwa.applyUpdate}
          pwaStatus={pwa.status}
        />
    </AppShell>
  );
}
