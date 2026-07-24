"use client";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, MapPin, Plus, Search } from "lucide-react";
import heroLogo from "@/assets/brand/DNJ_geral.png";
import { BackButton, FieldInput, GameIcon, PrimaryButton } from "@/components/ui/dnj-controls";
import { YOUTH_GROUPS } from "@/features/app/fixtures";
import type { AnimDir, RegistrationData } from "@/features/app/types";
import type { ApiGroup } from "@/lib/api/contracts";
import { groupsApi } from "@/lib/api/groups";
import { env } from "@/lib/env";
import { storage } from "@/lib/storage";
function animStyle(dir: AnimDir): React.CSSProperties { const map: Record<AnimDir,string>={right:"slideInRight 280ms cubic-bezier(0.22,1,0.36,1) both",left:"slideInLeft  280ms cubic-bezier(0.22,1,0.36,1) both",up:"fadeUp       220ms cubic-bezier(0.22,1,0.36,1) both"}; return { animation: map[dir] }; }
function requestErrorMessage(error: unknown) { return error instanceof Error ? error.message : "Não foi possível concluir a solicitação."; }
export function LoginScreen({
  onNext, onRegister, animDir,
}: {
  onNext: (email: string, cpf: string) => Promise<void>; onRegister: () => void; animDir: AnimDir;
}) {
  const [cpf, setCpf]     = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const reduceMotion = useReducedMotion();

  function formatCPF(raw: string) {
    const d = raw.replace(/\D/g, "").slice(0, 11);
    return d
      .replace(/(\d{3})(\d)/,                   "$1.$2")
      .replace(/(\d{3})\.(\d{3})(\d)/,           "$1.$2.$3")
      .replace(/(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4");
  }

  const valid = cpf.replace(/\D/g, "").length === 11 && email.includes("@");
  const cpfError = cpf && cpf.replace(/\D/g, "").length !== 11 ? "Informe os 11 dígitos do CPF." : "";
  const emailError = email && !email.includes("@") ? "Informe um e-mail válido." : "";

  async function submitLogin() {
    if (!valid || submitting) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      await onNext(email, cpf);
    } catch (error) {
      setSubmitError(requestErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      key="login"
      className="flex flex-col min-h-dvh"
      style={{ background: "var(--background)", ...animStyle(animDir) }}
    >
      {/* Orange hero with official logo */}
      <div
        className="relative flex flex-col items-center justify-center overflow-hidden"
        style={{ background: "var(--primary)", paddingTop: "calc(56px + var(--safe-area-top))", paddingBottom: "32px" }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(circle, rgba(0,0,0,0.08) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
        <motion.div
          className="relative z-10"
          style={{ width: "72%", maxWidth: "280px" }}
          initial={reduceMotion ? false : { opacity: 0, scale: 0.72, rotate: -5, y: 18 }}
          animate={{ opacity: 1, scale: 1, rotate: 0, y: 0 }}
          transition={{ type: "spring", stiffness: 240, damping: 18 }}
        >
          <motion.img
            src={heroLogo.src}
            alt="DNJ GAME 2026"
            style={{ width: "100%", height: "auto", transformOrigin: "50% 100%" }}
            animate={reduceMotion ? undefined : {
              y:      [0, -15, 0, -5, 0],
              scaleX: [1, 0.97, 1.04, 0.99, 1],
              scaleY: [1, 1.05, 0.96, 1.02, 1],
              rotate: [0, -1.2, 0, 0.7, 0],
            }}
            transition={{
              duration: 1.05,
              times: [0, 0.28, 0.55, 0.76, 1],
              ease: [0.22, 1, 0.36, 1],
              repeat: Infinity,
              repeatDelay: 2.1,
            }}
          />
        </motion.div>
        <p
          className="text-sm text-center relative z-10 mt-4 font-medium"
          style={{ color: "rgba(0,0,0,0.55)" }}
        >
          Curitiba · 2026
        </p>
      </div>

      {/* Form */}
      <div className="flex flex-col flex-1 px-6 pt-6 pb-10 gap-5">
        <div>
          <h2 className="text-xl font-bold mb-1" style={{ color: "var(--foreground)" }}>
            Bem-vindo(a)! 👋
          </h2>
          <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
            Entre com seus dados para participar
          </p>
        </div>

        <div
          className="rounded-2xl p-6 flex flex-col gap-4"
          style={{ background: "var(--card)", border: "1px solid var(--border)" }}
        >
          <FieldInput
            label="CPF"
            type="text"
            inputMode="numeric"
            placeholder="000.000.000-00"
            value={cpf}
            onChange={(e) => setCpf(formatCPF(e.target.value))}
            error={cpfError}
          />
          <FieldInput
            label="E-mail"
            type="email"
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={emailError}
          />
          {submitError ? <p className="text-sm" style={{ color: "var(--secondary)" }}>{submitError}</p> : null}
          <PrimaryButton onClick={submitLogin} disabled={!valid || submitting} className="mt-1">
            {submitting ? "Enviando código..." : "Entrar"}
          </PrimaryButton>
        </div>

        <p className="text-center text-xs" style={{ color: "var(--muted-foreground)" }}>
          Ao entrar, você concorda com os{" "}
          <span className="underline" style={{ color: "var(--primary)" }}>termos de uso</span>{" "}
          do evento.
        </p>

        <p className="text-center text-sm" style={{ color: "var(--muted-foreground)" }}>
          Não conseguiu acessar?{" "}
          <button
            onClick={onRegister}
            className="font-semibold underline underline-offset-2 transition-opacity hover:opacity-70"
            style={{ color: "var(--primary)", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: "inherit" }}
          >
            Crie uma conta
          </button>
        </p>
      </div>
    </div>
  );
}

// ─── REGISTER SCREEN ─────────────────────────────────────────────────────────

export function RegisterScreen({
  onBack, onDone, animDir,
}: {
  onBack: () => void; onDone: (registration: RegistrationData) => void; animDir: AnimDir;
}) {
  const [step, setStep]       = useState<1 | 2>(1);
  const [nome, setNome]       = useState("");
  const [email, setEmail]     = useState("");
  const [phone, setPhone]     = useState("");
  const [query, setQuery]     = useState("");
  const [group, setGroup]     = useState("");
  const [adding, setAdding]   = useState(false);
  const [newGroup, setNewGroup] = useState("");

  const filtered = YOUTH_GROUPS.filter((g) =>
    g.toLowerCase().includes(query.toLowerCase())
  );

  function formatPhone(raw: string) {
    const d = raw.replace(/\D/g, "").slice(0, 11);
    if (d.length <= 2)  return d.replace(/(\d{0,2})/, "($1");
    if (d.length <= 7)  return d.replace(/(\d{2})(\d{0,5})/, "($1) $2");
    return d.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3");
  }

  const personalValid = nome.trim().length >= 2 && email.includes("@") && phone.replace(/\D/g, "").length >= 10;
  const valid = personalValid && group !== "";
  const personalErrors = {
    nome: nome && nome.trim().length < 2 ? "Informe seu nome completo." : "",
    email: email && !email.includes("@") ? "Informe um e-mail válido." : "",
    phone: phone && phone.replace(/\D/g, "").length < 10 ? "Informe um WhatsApp válido." : "",
  };

  return (
    <div
      key="register"
      className="flex flex-col min-h-dvh px-6 pb-10 overflow-y-auto"
      style={{ background: "var(--background)", paddingTop: "calc(48px + var(--safe-area-top))", ...animStyle(animDir) }}
    >
      <BackButton onClick={() => step === 2 ? setStep(1) : onBack()} />

      <div className="mt-6 mb-6">
        <h2 className="text-2xl font-bold mb-1" style={{ color: "var(--foreground)" }}>
          Criar conta
        </h2>
        <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
          {step === 1 ? "Dados pessoais" : "Escolha seu grupo de jovens"}
        </p>
      </div>

      <p className="mb-4 text-xs font-semibold" aria-label={`Etapa ${step} de 2`} style={{ color: "var(--muted-foreground)" }}>Etapa {step} de 2</p>

      {step === 1 ? <>
      <div
        className="rounded-2xl p-5 flex flex-col gap-4 mb-5"
        style={{ background: "var(--card)", border: "1px solid var(--border)" }}
      >
        <FieldInput
          label="Nome completo"
          type="text"
          placeholder="Seu nome"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          error={personalErrors.nome}
        />
        <FieldInput
          label="E-mail"
          type="email"
          placeholder="seu@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={personalErrors.email}
        />
        <FieldInput
          label="Telefone WhatsApp"
          type="tel"
          inputMode="numeric"
          placeholder="(41) 99999-0000"
          value={phone}
          onChange={(e) => setPhone(formatPhone(e.target.value))}
          error={personalErrors.phone}
        />
      </div>
      <PrimaryButton onClick={() => setStep(2)} disabled={!personalValid}>Continuar</PrimaryButton>
      </> : <>

      {/* Group selection */}
      <div className="mb-5">
        <p className="text-sm font-semibold mb-3 px-1" style={{ color: "var(--foreground)" }}>
          Grupo de Jovens
        </p>

        <AnimatePresence>
        {group && !adding && (
          <motion.div
            className="rounded-xl p-3 mb-3 flex items-center gap-3"
            style={{ background: "var(--accent-alpha-10)", border: "1.5px solid var(--accent-alpha-30)" }}
            initial={{ opacity: 0, scale: 0.96, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97 }}
          >
            <GameIcon active><Check size={15} style={{ color: "var(--accent)", flexShrink: 0 }} /></GameIcon>
            <span className="text-sm font-semibold flex-1 truncate" style={{ color: "var(--foreground)" }}>
              {group}
            </span>
          </motion.div>
        )}
        </AnimatePresence>

        <div className="relative mb-2">
          <Search size={15} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "var(--muted-foreground)", pointerEvents: "none" }} />
          <motion.input
            type="text"
            placeholder="Buscar grupo..."
            value={query}
            onChange={(e) => { setQuery(e.target.value); setAdding(false); }}
            className="w-full rounded-xl py-3 pr-4 text-sm outline-none"
            style={{ paddingLeft: "38px", background: "var(--input-background)", color: "var(--foreground)", border: "1px solid var(--border)" }}
            whileFocus={{ scale: 1.015, y: -1, borderColor: "var(--primary)", boxShadow: "0 8px 22px var(--primary-alpha-15)" }}
            transition={{ type: "spring", stiffness: 420, damping: 28 }}
          />
        </div>

        <div
          className="rounded-2xl overflow-hidden mb-3"
          style={{ background: "var(--card)", border: "1px solid var(--border)", maxHeight: "200px", overflowY: "auto" }}
        >
          {filtered.map((g, i) => (
            <button
              key={g}
              onClick={() => { setGroup(g); setQuery(""); setAdding(false); }}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
              style={{
                borderBottom: i < filtered.length - 1 ? "1px solid var(--border)" : "none",
                background: group === g ? "var(--primary-alpha-10)" : "transparent",
              }}
            >
              <MapPin size={13} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />
              <span className="text-sm flex-1" style={{ color: "var(--foreground)" }}>{g}</span>
              {group === g && <Check size={13} style={{ color: "var(--primary)" }} />}
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="px-4 py-6 text-center">
              <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>Nenhum grupo encontrado</p>
            </div>
          )}
        </div>

        {adding ? (
          <div className="flex flex-col gap-2">
            <motion.input
              type="text"
              placeholder="Nome do seu grupo"
              value={newGroup}
              onChange={(e) => setNewGroup(e.target.value)}
              className="w-full rounded-xl px-4 py-3 text-sm outline-none"
              style={{ background: "var(--input-background)", color: "var(--foreground)", border: "1.5px solid var(--primary)" }}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              whileFocus={{ scale: 1.015, boxShadow: "0 8px 22px var(--primary-alpha-15)" }}
            />
            <div className="flex gap-2">
              <button onClick={() => setAdding(false)} className="flex-1 py-3 rounded-xl text-sm font-semibold" style={{ background: "var(--muted)", color: "var(--foreground)" }}>Cancelar</button>
              <button onClick={() => { if (newGroup) { setGroup(newGroup); setAdding(false); setNewGroup(""); } }} className="flex-1 py-3 rounded-xl text-sm font-semibold" style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}>Adicionar</button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <button
              onClick={() => setAdding(true)}
              className="w-full py-3 rounded-xl flex items-center justify-center gap-2 text-sm font-medium"
              style={{ background: "var(--card)", border: "1px dashed var(--border)", color: "var(--muted-foreground)" }}
            >
              <Plus size={15} />
              Meu grupo não está na lista
            </button>
            <button
              onClick={() => { setGroup("Sem grupo de jovens"); setQuery(""); }}
              className="w-full py-3 rounded-xl flex items-center justify-center gap-2 text-sm font-medium transition-opacity hover:opacity-70"
              style={{
                background: group === "Sem grupo de jovens" ? "var(--muted)" : "transparent",
                border: "1px solid var(--border)",
                color: group === "Sem grupo de jovens" ? "var(--foreground)" : "var(--muted-foreground)",
              }}
            >
              {group === "Sem grupo de jovens" && <Check size={14} style={{ color: "var(--primary)" }} />}
              Não tenho grupo de jovens
            </button>
          </div>
        )}
      </div>

      <PrimaryButton
        onClick={() => onDone({ name: nome.trim(), email, mobilePhone: phone, group })}
        disabled={!valid}
      >
        Criar conta
      </PrimaryButton>
      </>}
    </div>
  );
}

// ─── VERIFY SCREEN (email + OTP merged) ───────────────────────────────────────

export function VerifyScreen({
  email, onNext, onBack, animDir,
}: {
  email: string; onNext: (code: string) => Promise<void>; onBack: () => void; animDir: AnimDir;
}) {
  const masked = email.replace(/^(.)(.*)(@.*)$/, (_, a, _b, c) => a + "***" + c);
  const [digits, setDigits]       = useState(["", "", "", "", "", ""]);
  const [timer, setTimer]         = useState(60);
  const [allFilled, setAllFilled] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState("");
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (timer <= 0) return;
    const id = setInterval(() => setTimer((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [timer]);

  function handleChange(index: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next  = [...digits];
    next[index] = digit;
    setDigits(next);
    setAllFilled(next.every((d) => d !== ""));
    if (digit && index < 5) inputs.current[index + 1]?.focus();
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    e.preventDefault();
    const next = [...pasted, "", "", "", "", ""].slice(0, 6);
    setDigits(next);
    setAllFilled(pasted.length === 6);
    inputs.current[Math.min(pasted.length, 5)]?.focus();
  }

  async function submitCode() {
    if (!allFilled || verifying) return;
    setVerifying(true);
    setVerifyError("");
    try {
      await onNext(digits.join(""));
    } catch (error) {
      setVerifyError(requestErrorMessage(error));
    } finally {
      setVerifying(false);
    }
  }

  return (
    <div
      key="verify"
      className="flex flex-col min-h-dvh px-6 pb-10"
      style={{ background: "var(--background)", paddingTop: "calc(48px + var(--safe-area-top))", ...animStyle(animDir) }}
    >
      <BackButton onClick={onBack} />

      <div className="mt-8 mb-6">
        <h2 className="text-2xl font-bold mb-2" style={{ color: "var(--foreground)" }}>
          Verifique seu e-mail
        </h2>
        <p className="text-sm leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
          Enviamos um código de 6 dígitos para{" "}
          <span className="font-semibold" style={{ color: "var(--accent)" }}>{masked}</span>.
          Verifique também o spam.
        </p>
      </div>

      <div
        className="flex gap-2.5 justify-center mb-5"
        style={allFilled ? { animation: "otpPulse 400ms ease-out" } : undefined}
      >
        {digits.map((digit, i) => (
          <motion.input
            key={i}
            ref={(el) => { inputs.current[i] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={handlePaste}
            aria-label={`Dígito ${i + 1} do código de verificação`}
            className="w-12 h-14 rounded-xl text-center text-xl font-bold outline-none"
            style={{
              background: digit ? "var(--primary-alpha-15)" : "var(--input-background)",
              color:      digit ? "var(--primary)"          : "var(--foreground)",
              border:     `2px solid ${digit ? "var(--primary)" : "var(--border)"}`,
              transition: "background 150ms ease, border-color 150ms ease",
            }}
            animate={digit ? { scale: [1, 1.16, 1.04], y: [0, -3, 0] } : { scale: 1, y: 0 }}
            whileFocus={{ scale: 1.08, y: -2, boxShadow: "0 8px 20px var(--primary-alpha-20)" }}
            transition={{ duration: 0.28, times: [0, 0.55, 1], ease: [0.22, 1, 0.36, 1] }}
          />
        ))}
      </div>

      <div className="text-center mb-8">
        {timer > 0 ? (
          <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
            Reenviar em <span className="font-semibold" style={{ color: "var(--foreground)" }}>{timer}s</span>
          </p>
        ) : (
          <button
            className="text-sm font-semibold underline"
            style={{ color: "var(--primary)" }}
            onClick={() => setTimer(60)}
          >
            Reenviar código
          </button>
        )}
      </div>

      {verifyError ? <p className="text-sm text-center mb-3" style={{ color: "var(--secondary)" }}>{verifyError}</p> : null}
      <PrimaryButton onClick={submitCode} disabled={!allFilled || verifying}>
        Verificar código
      </PrimaryButton>
    </div>
  );
}

// ─── GROUP SCREEN ─────────────────────────────────────────────────────────────

export function GroupScreen({
  onNext, onBack, animDir, initialGroup = "",
}: {
  onNext: (group: string, groupId?: string) => Promise<void>;
  onBack: () => void;
  animDir: AnimDir;
  initialGroup?: string;
}) {
  const [query, setQuery]       = useState("");
  const [selected, setSelected] = useState(env.useMocks ? "Grupo Chama Viva – Bairro Alto" : initialGroup);
  const [adding, setAdding]     = useState(false);
  const [newGroup, setNewGroup] = useState("");
  const [apiGroups, setApiGroups] = useState<ApiGroup[]>([]);
  const [groupsError, setGroupsError] = useState("");
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (env.useMocks) return;
    const search = query.trim();
    if (!search) return;
    const session = storage.getSession();
    if (!session) return;

    let active = true;
    const timer = window.setTimeout(() => {
      groupsApi.search(search, session.identityToken)
        .then((groups) => {
          if (active) {
            setApiGroups(groups);
            setGroupsError("");
          }
        })
        .catch((error) => {
          if (active) setGroupsError(requestErrorMessage(error));
        });
    }, 400);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [query]);

  const filtered = env.useMocks
    ? YOUTH_GROUPS.filter((g) => g.toLowerCase().includes(query.toLowerCase()))
    : query.trim() ? apiGroups.map((group) => group.groupName) : [];

  async function confirmGroup() {
    if (!selected || confirming) return;
    setConfirming(true);
    setGroupsError("");
    try {
      const groupId = apiGroups.find((group) => group.groupName === selected)?.id;
      await onNext(selected, groupId);
    } catch (error) {
      setGroupsError(requestErrorMessage(error));
    } finally {
      setConfirming(false);
    }
  }

  return (
    <div
      key="group"
      className="flex flex-col min-h-dvh px-6 pb-10"
      style={{ background: "var(--background)", paddingTop: "calc(48px + var(--safe-area-top))", ...animStyle(animDir) }}
    >
      <BackButton onClick={onBack} />

      <div className="mt-6 mb-5">
        <h2 className="text-2xl font-bold mb-1" style={{ color: "var(--foreground)" }}>
          Seu grupo jovem
        </h2>
        <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
          Confirme ou selecione seu grupo de juventude
        </p>
      </div>

      <AnimatePresence>
      {selected && !adding && (
        <motion.div
          className="rounded-xl p-3 mb-4 flex items-center gap-3"
          style={{ background: "var(--accent-alpha-10)", border: "1.5px solid var(--accent-alpha-30)" }}
          initial={{ opacity: 0, scale: 0.96, y: -6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97 }}
        >
          <GameIcon active><Check size={15} style={{ color: "var(--accent)", flexShrink: 0 }} /></GameIcon>
          <span className="text-sm font-semibold flex-1 truncate" style={{ color: "var(--foreground)" }}>
            {selected}
          </span>
        </motion.div>
      )}
      </AnimatePresence>

      <div className="relative mb-2">
        <Search size={15} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "var(--muted-foreground)", pointerEvents: "none" }} />
        <motion.input
          type="text"
          placeholder="Buscar grupo..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setApiGroups([]);
            setGroupsError("");
            setAdding(false);
          }}
          className="w-full rounded-xl py-3 pr-4 text-sm outline-none"
          style={{ paddingLeft: "38px", background: "var(--input-background)", color: "var(--foreground)", border: "1px solid var(--border)" }}
          whileFocus={{ scale: 1.015, y: -1, borderColor: "var(--primary)", boxShadow: "0 8px 22px var(--primary-alpha-15)" }}
          transition={{ type: "spring", stiffness: 420, damping: 28 }}
        />
      </div>

      <div
        className="rounded-2xl overflow-hidden mb-4"
        style={{ background: "var(--card)", border: "1px solid var(--border)", maxHeight: "240px", overflowY: "auto" }}
      >
        {groupsError ? <p className="px-4 py-3 text-sm" style={{ color: "var(--secondary)" }}>{groupsError}</p> : null}
        {filtered.map((group, i) => (
          <button
            key={group}
            onClick={() => { setSelected(group); setQuery(""); setAdding(false); }}
            className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
            style={{
              borderBottom: i < filtered.length - 1 ? "1px solid var(--border)" : "none",
              background:   selected === group ? "var(--primary-alpha-10)" : "transparent",
            }}
          >
            <MapPin size={13} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />
            <span className="text-sm flex-1" style={{ color: "var(--foreground)" }}>{group}</span>
            {selected === group && <Check size={13} style={{ color: "var(--primary)" }} />}
          </button>
        ))}
        {filtered.length === 0 && (
          <div className="px-4 py-8 text-center">
            <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>Nenhum grupo encontrado</p>
          </div>
        )}
      </div>

      {adding ? (
        <div className="mb-4 flex flex-col gap-2">
          <motion.input
            type="text"
            placeholder="Nome do seu grupo"
            value={newGroup}
            onChange={(e) => setNewGroup(e.target.value)}
            className="w-full rounded-xl px-4 py-3 text-sm outline-none"
            style={{ background: "var(--input-background)", color: "var(--foreground)", border: "1.5px solid var(--primary)" }}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            whileFocus={{ scale: 1.015, boxShadow: "0 8px 22px var(--primary-alpha-15)" }}
          />
          <div className="flex gap-2">
            <button onClick={() => setAdding(false)} className="flex-1 py-3 rounded-xl text-sm font-semibold" style={{ background: "var(--muted)", color: "var(--foreground)" }}>Cancelar</button>
            <button onClick={() => { if (newGroup) { setSelected(newGroup); setAdding(false); } }} className="flex-1 py-3 rounded-xl text-sm font-semibold" style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}>Adicionar</button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2 mb-4">
          <button
            onClick={() => setAdding(true)}
            className="w-full py-3 rounded-xl flex items-center justify-center gap-2 text-sm font-medium"
            style={{ border: "1px dashed var(--border)", color: "var(--muted-foreground)", background: "transparent" }}
          >
            <Plus size={15} /> Não encontrei meu grupo
          </button>
          <button
            onClick={() => { setSelected("Sem grupo de jovens"); setQuery(""); }}
            className="w-full py-3 rounded-xl flex items-center justify-center gap-2 text-sm font-medium transition-opacity hover:opacity-70"
            style={{
              background: selected === "Sem grupo de jovens" ? "var(--muted)" : "transparent",
              border: "1px solid var(--border)",
              color: selected === "Sem grupo de jovens" ? "var(--foreground)" : "var(--muted-foreground)",
            }}
          >
            {selected === "Sem grupo de jovens" && <Check size={14} style={{ color: "var(--primary)" }} />}
            Não tenho grupo de jovens
          </button>
        </div>
      )}

      <PrimaryButton onClick={confirmGroup} disabled={!selected || confirming}>
        {confirming ? "Salvando..." : "Confirmar grupo"}
      </PrimaryButton>
    </div>
  );
}

// ─── HOME SCREEN ──────────────────────────────────────────────────────────────
