import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../api/client';
import { AuthCard, ErrorBox, Field, SubmitButton, SwitchLink } from '../components/AuthLayout';

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // "Controlled inputs": React state holds what's typed in each box.
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Already logged in? Skip this page.
  if (user) return <Navigate to="/" replace />;

  // One handler for all inputs: uses the input's `name` to know which field changed.
  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault(); // stop the browser from reloading the page
    setError('');
    setSubmitting(true);
    try {
      await login(form.email, form.password);
      // Go back to the page they originally wanted (or the lobby).
      navigate(location.state?.from || '/', { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthCard title="Welcome back" subtitle="Log in to continue your hunt.">
      <form onSubmit={onSubmit}>
        <ErrorBox message={error} />
        <Field label="Email" icon="mail" name="email" type="email" autoComplete="email" required value={form.email} onChange={onChange} />
        <Field
          label="Password"
          icon="lock"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={form.password}
          onChange={onChange}
        />
        <SubmitButton busy={submitting} busyText="Logging in…">
          Enter the arena
        </SubmitButton>
      </form>
      <SwitchLink text="New here?">
        <Link to="/register" className="font-semibold text-gold hover:underline">
          Create an account
        </Link>
      </SwitchLink>
    </AuthCard>
  );
}
