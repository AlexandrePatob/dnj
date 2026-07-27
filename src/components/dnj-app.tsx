"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { authApi } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import { groupsApi } from "@/lib/api/groups";
import { mapApiUser } from "@/lib/api/mappers";
import type { AuthSession } from "@/types/domain";
import { env } from "@/lib/env";
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
    group: session.user.group?.groupName ?? "",
    points: session.user.points,
    rankPosition: session.user.rankPosition,
  };
}

function mockSession(user: UserData): AuthSession {
  return {
    identityToken: "mock-identity-token",
    user: {
      id: "mock-user",
      name: user.name,
      email: user.email,
      document: user.cpf.replace(/\D/g, ""),
      group: user.group ? { id: "mock-group", groupName: user.group } : null,
      points: user.points,
      rankPosition: user.rankPosition,
    },
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
    name: "João Paulo", cpf: "", email: "", group: "",
    points: 150, rankPosition: 9,
  });
  const [offlineSnapshotCapturedAt, setOfflineSnapshotCapturedAt] = useState<string | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const restoredSession = useRef(false);
  const restoredSnapshot = useRef(false);

  const navigate = useCallback((next: Screen) => {
    setPrevScreen(screen);
    setScreen(next);
  }, [screen]);

  const handleLogin = useCallback(async (email: string, cpf: string) => {
    setEmailVal(email);
    setUser((u) => ({ ...u, email, cpf }));
    if (!env.useMocks) {
      await authApi.requestCode(email, cpf.replace(/\D/g, ""));
    }
    navigate("verify");
  }, [navigate]);

  const handleVerification = useCallback(async (code: string) => {
    if (env.useMocks) {
      const session = mockSession(user);
      storage.setSession(session);
      recordTesterPresence(session);
      navigate("group");
      return;
    }

    const response = await authApi.verifyCode(emailVal, code);
    const apiUser = mapApiUser(response);
    const session = { user: apiUser, identityToken: response.identityToken };
    storage.setSession(session);
    recordTesterPresence(session);
    setUser({
      name: apiUser.name,
      cpf: apiUser.document,
      email: apiUser.email,
      group: apiUser.group?.groupName ?? "",
      points: apiUser.points,
      rankPosition: apiUser.rankPosition,
    });
    navigate("group");
  }, [emailVal, navigate, user]);

  const handleRegistrationVerification = useCallback(async () => {
    if (!registration) throw new ApiError("Dados do cadastro não encontrados. Tente novamente.", 400);
    if (!env.useMocks) {
      throw new ApiError("A criação de conta ainda não está integrada à API.", 501);
    }

    const registeredUser: UserData = {
      name: registration.name,
      cpf: "",
      email: registration.email,
      group: registration.group,
      points: 0,
      rankPosition: 0,
    };
    const session = mockSession(registeredUser);
    session.user.mobilePhone = registration.mobilePhone;
    storage.setSession(session);
    recordTesterPresence(session);
    setUser(registeredUser);
    navigate("home");
  }, [navigate, registration]);

  const handleGroupConfirm = useCallback(async (group: string, groupId?: string) => {
    let confirmedGroup = group;
    if (!env.useMocks) {
      const session = storage.getSession();
      if (!session) throw new ApiError("Sessão não encontrada. Entre novamente.", 401);
      const updatedUser = await groupsApi.updateUserGroup(
        session.user.id,
        groupId ? { groupId } : { groupName: group },
        session.identityToken,
      );
      confirmedGroup = updatedUser.group?.groupName ?? group;
      storage.setSession({
        identityToken: session.identityToken,
        user: { ...session.user, group: updatedUser.group },
      });
    } else {
      const session = storage.getSession() ?? mockSession(user);
      storage.setSession({
        identityToken: session.identityToken,
        user: {
          ...session.user,
          group: { id: groupId ?? "mock-group", groupName: confirmedGroup },
        },
      });
    }
    setUser((current) => ({ ...current, group: confirmedGroup }));
    navigate("home");
  }, [navigate, user]);

  const animDir = getAnimDir(prevScreen, screen);
  const isMain  = ["home", "schedule", "map", "game", "queue", "gallery", "account"].includes(screen);
  const activeNavScreen = screen === "schedule" || screen === "map" ? "home" : screen;

  useEffect(() => {
    if (restoredSession.current) return;
    restoredSession.current = true;
    const session = storage.getSession();
    let disposed = false;

    queueMicrotask(() => {
      if (disposed) return;
      if (session) {
        setUser(sessionUserData(session));
        setPrevScreen("login");
        setScreen(session.user.group ? "home" : "group");
      }
      setSessionReady(true);
    });

    return () => {
      disposed = true;
    };
  }, []);

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
            {screen === "login"           && <LoginScreen    onNext={handleLogin} onRegister={() => navigate("register")} animDir={animDir} />}
            {screen === "register"        && <RegisterScreen onBack={() => navigate("login")} onDone={(data) => { setRegistration(data); navigate("register-verify"); }} animDir={animDir} />}
            {screen === "register-verify" && <VerifyScreen  email={registration?.email ?? ""} onNext={handleRegistrationVerification} onBack={() => navigate("register")} animDir={animDir} />}
            {screen === "verify"          && <VerifyScreen  email={emailVal} onNext={handleVerification} onBack={() => navigate("login")}  animDir={animDir} />}
            {screen === "group"   && <GroupScreen   onNext={handleGroupConfirm} onBack={() => navigate("verify")} animDir={animDir} initialGroup={user.group} />}
            {screen === "home"    && <HomeScreen    user={user}                    animDir={animDir} onOpenSchedule={() => navigate("schedule")} onOpenMap={() => navigate("map")} />}
            {screen === "schedule" && <EventScheduleScreen animDir={animDir} onBack={() => navigate("home")} />}
            {screen === "map" && <EventMapScreen animDir={animDir} onBack={() => navigate("home")} />}
            {screen === "game"    && <GameScreen    user={user} theme={theme} animDir={animDir} onPointsChange={(points) => setUser((current) => ({ ...current, points }))} />}
            {screen === "queue"   && <QueueScreen                                  animDir={animDir} />}
            {screen === "gallery" && <GalleryScreen                                animDir={animDir} />}
            {screen === "account" && <AccountScreen user={user} onLogout={() => { storage.clearSession(); clearOfflineSnapshot(); navigate("login"); }} theme={theme} onToggleTheme={toggleTheme} animDir={animDir} />}
          </motion.div>
        </AnimatePresence>

        {isMain && <TopBar />}
        {!network.isOnline && offlineSnapshotCapturedAt && (
          <p
            className="absolute left-3 right-3 z-40 rounded-xl border px-3 py-2 text-center text-xs font-medium"
            style={{ top: "calc(48px + var(--safe-area-top) + 8px)", background: "var(--card)", borderColor: "var(--border)", color: "var(--muted-foreground)" }}
          >
            Conteúdo salvo em {new Date(offlineSnapshotCapturedAt).toLocaleString("pt-BR")} · somente leitura
          </p>
        )}
        {isMain && <BottomNav active={activeNavScreen} onNavigate={navigate} />}
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

function recordTesterPresence(session: AuthSession) {
  void fetch("/api/test-users/presence", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ externalKey: session.user.email || session.user.document || session.user.id, name: session.user.name, email: session.user.email, points: session.user.points }),
  });
}
