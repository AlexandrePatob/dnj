"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { authApi } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import { env } from "@/lib/env";
import { groupsApi } from "@/lib/api/groups";
import { mapApiUser, mapIdentityUser } from "@/lib/api/mappers";
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
    name: session.user.name,
    cpf: session.user.document,
    email: session.user.email,
    mobilePhone: session.user.mobilePhone,
    group: session.user.group?.groupName ?? "",
    points: session.user.points,
    rankPosition: session.user.rankPosition,
  };
}

// ─── Screen transition logic ──────────────────────────────────────────────────

function getAnimDir(from: Screen, to: Screen): AnimDir {
  const fi = AUTH_ORDER.indexOf(from);
  const ti = AUTH_ORDER.indexOf(to);
  if (fi !== -1 && ti !== -1) return ti > fi ? "right" : "left";
  return "up";
}

import { AccountScreen } from "@/features/account/account-screen";
import { GroupScreen, LoginScreen, RegisterScreen, VerifyScreen } from "@/features/auth/auth-screens";
import { GameScreen } from "@/features/game/game-screen";
import { GalleryScreen } from "@/features/gallery/gallery-screen";
import { HomeScreen } from "@/features/home/home-screen";
import { EventScheduleScreen } from "@/features/schedule/schedule-screen";
import { EventMapScreen } from "@/features/map/map-screen";
import { QueueScreen } from "@/features/queue/queue-screen";
import { AppShell, BottomNav, TopBar } from "@/components/layout/dnj-layout";
import { DnjOnboarding } from "@/components/onboarding/dnJ-onboarding";
import { LiveStatusStack, type LiveMomentChallenge, type LiveSpecialEvent } from "@/components/live/live-status-stack";
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
  const [registration, setRegistration] = useState<RegistrationData | null>(null);
  const [user, setUser] = useState<UserData>({
    name: "João Paulo", cpf: "", email: "", mobilePhone: "", group: "",
    points: 150, rankPosition: 9,
  });
  const [offlineSnapshotCapturedAt, setOfflineSnapshotCapturedAt] = useState<string | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [specialEvent] = useState<LiveSpecialEvent | null>(null);
  const [momentChallenge] = useState<LiveMomentChallenge | null>(null);
  const restoredSession = useRef(false);
  const restoredSnapshot = useRef(false);

  const navigate = useCallback((next: Screen) => {
    setPrevScreen(screen);
    setScreen(next);
  }, [screen]);

  const handleLogin = useCallback(async (email: string) => {
    setEmailVal(email);
    setUser((u) => ({ ...u, email }));
    await authApi.requestCode(email);
    navigate("verify");
  }, [navigate]);

  const handleGoogleLogin = useCallback(async (idToken: string) => {
    const identity = await authApi.loginWithGoogle(idToken);
    const apiUser = mapIdentityUser(identity.user);
    const session = { user: apiUser, identityToken: identity.accessToken };
    storage.setSession(session);
    setUser(sessionUserData(session));
    navigate(identity.onboardingRequired || !identity.user.onboardingComplete ? "group" : "home");
  }, [navigate]);

  const handleResendVerification = useCallback(async () => {
    await authApi.requestCode(emailVal);
  }, [emailVal]);

  const handleVerification = useCallback(async (code: string) => {
    const response = await authApi.verifyCode(emailVal, code);
    const apiUser = mapIdentityUser(response.user);
    const session = { user: apiUser, identityToken: response.accessToken };
    storage.setSession(session);
    setUser({
      name: apiUser.name,
      cpf: apiUser.document,
      email: apiUser.email,
      mobilePhone: apiUser.mobilePhone,
      group: apiUser.group?.groupName ?? "",
      points: apiUser.points,
      rankPosition: apiUser.rankPosition,
    });
    navigate(response.onboardingRequired || !response.user.onboardingComplete ? "group" : "home");
  }, [emailVal, navigate]);

  const handleRegistrationVerification = useCallback(async () => {
    if (!registration) throw new ApiError("Dados do cadastro não encontrados. Tente novamente.", 400);
    const response = await authApi.register(registration);
    const apiUser = mapApiUser(response);
    const session = { user: apiUser, identityToken: response.identityToken };
    storage.setSession(session);
    setUser({ name: apiUser.name, cpf: apiUser.document, email: apiUser.email, mobilePhone: apiUser.mobilePhone, group: apiUser.group?.groupName ?? "", points: apiUser.points, rankPosition: apiUser.rankPosition });
    navigate("home");
  }, [navigate, registration]);

  const handleGroupConfirm = useCallback(async (group: string, groupId?: string) => {
    let confirmedGroup = group;
    const session = storage.getSession();
    if (!session) throw new ApiError("Sessão não encontrada. Entre novamente.", 401);
    const updatedUser = await groupsApi.updateUserGroup({ groupId: group === "Sem grupo de jovens" ? null : groupId ?? null }, session.identityToken);
    confirmedGroup = updatedUser.group?.groupName ?? "";
    storage.setSession({ identityToken: session.identityToken, user: { ...session.user, group: updatedUser.group, points: updatedUser.points, rankPosition: updatedUser.rankPosition } });
    setUser((current) => ({ ...current, group: confirmedGroup }));
    navigate("home");
  }, [navigate, user]);

  const animDir = getAnimDir(prevScreen, screen);
  const isMain  = ["home", "schedule", "map", "game", "queue", "gallery", "account"].includes(screen);
  const activeNavScreen = screen === "schedule" || screen === "map" ? "home" : screen;

  useEffect(() => {
    if (restoredSession.current) return;
    restoredSession.current = true;
    if (env.localHomologation) {
      setUser({ name: "Participante local", cpf: "", email: "participante.local@dnj.test", mobilePhone: "+5511999990000", group: "", points: 0, rankPosition: 0 });
      setPrevScreen("login");
      setScreen("home");
      setSessionReady(true);
      return;
    }
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
            {screen === "register"        && <RegisterScreen onBack={() => navigate("login")} onDone={(data) => { setRegistration(data); navigate("register-verify"); }} animDir={animDir} />}
            {screen === "register-verify" && <VerifyScreen  email={registration?.email ?? ""} onNext={handleRegistrationVerification} onBack={() => navigate("register")} animDir={animDir} />}
            {screen === "verify"          && <VerifyScreen  email={emailVal} onNext={handleVerification} onResend={handleResendVerification} onBack={() => navigate("login")}  animDir={animDir} />}
            {screen === "group"   && <GroupScreen   onNext={handleGroupConfirm} onBack={() => navigate("verify")} animDir={animDir} initialGroup={user.group} />}
            {screen === "home"    && <HomeScreen    user={user}                    animDir={animDir} onOpenSchedule={() => navigate("schedule")} onOpenMap={() => navigate("map")} />}
            {screen === "schedule" && <EventScheduleScreen animDir={animDir} onBack={() => navigate("home")} />}
            {screen === "map" && <EventMapScreen animDir={animDir} onBack={() => navigate("home")} />}
            {screen === "game"    && <GameScreen    user={user} theme={theme} animDir={animDir} onPointsChange={(points) => setUser((current) => ({ ...current, points }))} />}
            {screen === "queue"   && <QueueScreen user={{ id: user.mobilePhone || user.email, name: user.name }} animDir={animDir} />}
            {screen === "gallery" && <GalleryScreen group={user.group}             animDir={animDir} />}
            {screen === "account" && <AccountScreen user={user} onLogout={() => { void authApi.logout().catch(() => undefined); storage.clearSession(); clearOfflineSnapshot(); navigate("login"); }} theme={theme} onToggleTheme={toggleTheme} animDir={animDir} />}
          </motion.div>
        </AnimatePresence>

        {isMain && <TopBar />}
        {isMain && <LiveStatusStack special={specialEvent} momentChallenge={momentChallenge} queueSummary={specialEvent ? "Fila Radicalidade: acompanhamento no app" : undefined} />}
        {!network.isOnline && offlineSnapshotCapturedAt && (
          <p
            className="absolute left-3 right-3 z-40 rounded-xl border px-3 py-2 text-center text-xs font-medium"
            style={{ top: "calc(48px + var(--safe-area-top) + 8px)", background: "var(--card)", borderColor: "var(--border)", color: "var(--muted-foreground)" }}
          >
            Conteúdo salvo em {new Date(offlineSnapshotCapturedAt).toLocaleString("pt-BR")} · somente leitura
          </p>
        )}
        {isMain && <BottomNav active={activeNavScreen} onNavigate={navigate} />}
        {isMain && onboardingOpen && <DnjOnboarding onClose={() => { try { localStorage.setItem("dnj.onboarding.2k26", "1"); } catch {} setOnboardingOpen(false); }} />}
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
