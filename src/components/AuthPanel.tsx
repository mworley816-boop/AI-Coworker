export default function AuthPanel(){
  return (
    <div className="auth-panel">
      <div>
        <strong>Workspace access</strong>
        <small>Sign in to save and run tasks</small>
      </div>
      <form method="post" action="/api/auth/magic-link">
        <input name="email" type="email" required placeholder="you@example.com" />
        <button type="submit">Email sign-in link</button>
      </form>
    </div>
  );
}
