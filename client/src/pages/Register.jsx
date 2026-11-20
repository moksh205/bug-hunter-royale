import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../api/client';
import { AuthCard, ErrorBox, Field, SubmitButton, SwitchLink } from '../components/AuthLayout';

export default function Register() {
  const { user, register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ username: '', email: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Quick checks in the browser for instant feedback.
    // (The server checks again - never trust the browser alone.)
    if (form.password !== form.confirm) return setError('Passwords do not match');
    if (form.password.length < 6) return setError('Password must be at least 6 characters');

    setSubmitting(true);
    try {
      await register(form.username, form.email, form.password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthCard title="Create account" subtitle="You start with 1200 Elo. Good luck, slayer.">
      <form onSubmit={onSubmit}>
        <ErrorBox message={error} />
        <Field
          label="Username"
          icon="user"
          name="username"
          autoComplete="username"
          required
          minLength={3}
          maxLength={20}
          pattern="[a-zA-Z0-9_]+"
          title="Letters, numbers and _ only"
          value={form.username}
          onChange={onChange}
        />
        <Field label="Email" icon="mail" name="email" type="email" autoComplete="email" required value={form.email} onChange={onChange} />
        <Field
          label="Password"
          icon="lock"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          value={form.password}
          onChange={onChange}
        />
        <Field
          label="Confirm password"
          icon="lock"
          name="confirm"
          type="password"
          autoComplete="new-password"
          required
          value={form.confirm}
          onChange={onChange}
        />
        <SubmitButton busy={submitting} busyText="Creating account…">
          Join the Corps
        </SubmitButton>
      </form>
      <SwitchLink text="Already have an account?">
        <Link to="/login" className="font-semibold text-gold hover:underline">
          Log in
        </Link>
      </SwitchLink>
    </AuthCard>
  );
}
