import { OperationalLogin } from "@/components/auth/operational-login";

export default function AdminLoginPage() {
  return <OperationalLogin area="Central DNJ" role="ADMIN" sessionPath="/api/v2/admin/session" destination="/admin" />;
}
