import { useState } from "react";
import { useAuth } from "../lib/auth";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("admin123456");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "登录失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <form className="login-box form-grid" onSubmit={onSubmit}>
        <div>
          <div className="brand">LP Admin</div>
          <p className="muted">多域名落地页管理平台</p>
        </div>
        {error ? <div className="error">{error}</div> : null}
        <label>
          邮箱
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
        </label>
        <label>
          密码
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />
        </label>
        <button className="btn btn-primary" disabled={loading}>{loading ? "登录中..." : "登录"}</button>
      </form>
    </div>
  );
}
