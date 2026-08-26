import { OperationalLogin } from "@/components/auth/operational-login";

export default function ManagerLoginPage() {
  return <OperationalLogin area="Operação DNJ" role="EVENT_MANAGER" sessionPath="/api/manager/session" destination="/manager" />;
}
